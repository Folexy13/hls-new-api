import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import { NotificationWorkflowService } from '../services/notification-workflow.service';

@injectable()
export class OperationsController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationWorkflowService) private workflows: NotificationWorkflowService) {}

  private async authorize(req: AuthenticatedRequest, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true, researcherType: true } });
    if (user?.role !== 'researcher' || user.researcherType !== 'checker') {
      ResponseUtil.error(res, 'Researcher checker access required', 403);
      return false;
    }
    return true;
  }

  access = async (req: AuthenticatedRequest, res: Response) => {
    if (await this.authorize(req, res)) return ResponseUtil.success(res, { allowed: true });
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    if (!await this.authorize(req, res)) return;
    const kind = z.enum(['orders', 'support', 'pharmacies', 'notifications']).parse(req.params.kind);
    const after = z.coerce.number().int().nonnegative().default(0).parse(req.query.after);
    const paging = { where: { id: { gt: after } }, orderBy: { id: 'asc' as const }, take: 50 };
    let items: unknown[];
    if (kind === 'orders') items = await this.prisma.order.findMany({ ...paging,
      where: { ...paging.where, status: { in: ['paid', 'processing', 'shipped'] } },
      include: { user: { select: { firstName: true, lastName: true } } } });
    else if (kind === 'support') items = await this.prisma.inbox.findMany({ ...paging,
      where: { ...paging.where, subject: { startsWith: '[Support]' }, isRead: false },
      include: { replies: true, user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } } });
    else if (kind === 'pharmacies') items = await this.prisma.pharmacyRequest.findMany({ ...paging,
      where: { ...paging.where, status: 'pending' }, include: { user: { select: { firstName: true, lastName: true } } } });
    else {
      const jobs = await this.prisma.notificationJob.findMany({ ...paging,
        select: { id: true, kind: true, status: true, attemptCount: true, lastError: true, createdAt: true, providerMessageId: true } });
      const deliveries = await this.prisma.whatsAppDelivery.findMany({
        where: { providerMessageId: { in: jobs.flatMap(job => job.providerMessageId ? [job.providerMessageId] : []) } },
        select: { providerMessageId: true, status: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true, errorCode: true, errorMessage: true },
      });
      const byId = new Map(deliveries.map(delivery => [delivery.providerMessageId, delivery]));
      items = jobs.map(job => ({ ...job, delivery: job.providerMessageId ? byId.get(job.providerMessageId) || null : null }));
    }
    return ResponseUtil.success(res, { items, nextCursor: items.length === 50 ? (items[items.length - 1] as { id: number }).id : null });
  };

  updateOrder = async (req: AuthenticatedRequest, res: Response) => {
    if (!await this.authorize(req, res)) return;
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { status } = z.object({ status: z.enum(['processing', 'shipped', 'delivered']) }).parse(req.body);
    const result = await this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) return { error: 'Order not found', code: 404 };
      if (order.status === status) return { order };
      const next: Record<string, string> = { paid: 'processing', processing: 'shipped', shipped: 'delivered' };
      if (next[order.status] !== status) return { error: 'Invalid order status transition', code: 409 };
      const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status } });
      if (!updated.count) return { error: 'Order changed; refresh and retry', code: 409 };
      if (order.userId) {
        const kind = status === 'processing' ? 'order_processing' : status === 'shipped' ? 'order_dispatched' : 'order_delivered';
        await this.workflows.enqueue(`order:${id}:${status}`, kind, {
          orderId: id, orderNumber: order.orderNumber, deliveryAddress: order.shippingAddress || 'Your saved delivery address',
        }, order.userId, undefined, tx);
      }
      return { order: { ...order, status } };
    });
    if (result.error) return ResponseUtil.error(res, result.error, result.code);
    return ResponseUtil.success(res, result, 'Order updated');
  };

  reply = async (req: AuthenticatedRequest, res: Response) => {
    if (!await this.authorize(req, res)) return;
    const ticketId = z.coerce.number().int().positive().parse(req.params.id);
    const data = z.object({ message: z.string().trim().min(1).max(5000), requestId: z.string().uuid(), resolve: z.boolean().default(false) }).parse(req.body);
    const result = await this.prisma.$transaction(async tx => {
      const ticket = await tx.inbox.findUnique({ where: { id: ticketId } });
      if (!ticket || !ticket.subject.startsWith('[Support]')) return { error: 'Support ticket not found', code: 404 };
      const existing = await tx.supportReply.findUnique({ where: { requestId: data.requestId } });
      if (existing) return existing.ticketId === ticketId && existing.authorId === req.user.id && existing.message === data.message
        ? { reply: existing } : { error: 'Request identifier already used', code: 409 };
      const reply = await tx.supportReply.create({ data: { ticketId, authorId: req.user.id, requestId: data.requestId, message: data.message } });
      if (data.resolve) await tx.inbox.update({ where: { id: ticketId }, data: { isRead: true } });
      await this.workflows.enqueue(`support-reply:${reply.id}`, 'support_reply', { subject: ticket.subject.replace(/^\[Support\]\s*/, '') }, ticket.userId, undefined, tx);
      return { reply };
    });
    if (result.error) return ResponseUtil.error(res, result.error, result.code);
    return ResponseUtil.success(res, result, 'Support reply saved', 201);
  };

  acceptPharmacy = async (req: AuthenticatedRequest, res: Response) => {
    if (!await this.authorize(req, res)) return;
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const version = z.object({ version: z.number().int().positive() }).parse(req.body).version;
    const result = await this.prisma.$transaction(async tx => {
      const request = await tx.pharmacyRequest.findUnique({ where: { id }, include: { user: true } });
      if (!request) return { error: 'Pharmacy request not found', code: 404 };
      if (request.version !== version || request.pharmacyName !== request.user.preferredPharmacyName?.trim()
        || request.pharmacyPhone !== (request.user.preferredPharmacyPhone?.replace(/\s/g, '') || null)) {
        return { error: 'Pharmacy selection changed; refresh before approving', code: 409 };
      }
      if (request.status === 'accepted') return { accepted: true };
      const changed = await tx.pharmacyRequest.updateMany({ where: { id, version, status: 'pending' },
        data: { status: 'accepted', acceptedAt: new Date(), approvedById: req.user.id } });
      if (!changed.count) return { error: 'Request changed; refresh and retry', code: 409 };
      if (request.pharmacyPhone) await this.workflows.enqueue(`pharmacy-referral:${id}:${version}`, 'pharmacy_referral', {
        requestId: id, version, phone: request.pharmacyPhone,
        benfekName: `${request.user.firstName} ${request.user.lastName}`.trim(), benfekPhone: request.user.phone || undefined,
      }, request.userId, undefined, tx);
      await this.workflows.enqueue(`pharmacy-accepted:${id}:${version}`, 'pharmacy_accepted', {
        requestId: id, version, pharmacyName: request.pharmacyName,
      }, request.userId, undefined, tx);
      return { accepted: true };
    });
    if (result.error) return ResponseUtil.error(res, result.error, result.code);
    return ResponseUtil.success(res, result, 'Pharmacy accepted');
  };
}
