import { inject, injectable } from 'inversify';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { NotificationWorkflowService } from './notification-workflow.service';
import { invoiceLink, validInvoiceToken } from '../utilities/invoice-link.utility';
import { AppError } from '../utilities/errors';

const Source = z.union([
  z.object({ orderId: z.number().int().positive() }).strict(),
  z.object({ packId: z.string().trim().min(1).max(191) }).strict(),
]);

@injectable()
export class InvoiceService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationWorkflowService) private workflows: NotificationWorkflowService) {}

  async request(userId: number, input: unknown) {
    const source = Source.parse(input);
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'benfek') throw new AppError('Benfek access required', 403);
      if (!(user.phone || user.whatsappNumber)?.trim()) throw new AppError('Add your WhatsApp phone number in My Profile first', 400);
      let title: string;
      let type: string;
      let sourceId: string;
      let items: { name: string; quantity: number; unitPrice: number }[];
      if ('orderId' in source) {
        const order = await tx.order.findUnique({ where: { id: source.orderId }, include: { items: true, payment: true } });
        if (!order || order.userId !== userId) throw new AppError('Order not found', 404);
        title = `Order ${order.orderNumber}`;
        type = order.payment?.status === 'success' ? 'Invoice' : 'Proforma invoice';
        sourceId = `order:${order.id}:${type}`;
        items = order.items.map(item => ({ name: item.productName || 'Product', quantity: item.quantity, unitPrice: item.price }));
      } else {
        const codes = await tx.quizCode.findMany({ where: { usedBy: userId, isUsed: true }, select: { code: true } });
        const pack = await tx.researcherPack.findFirst({
          where: { packId: source.packId, status: 'dispatched', quizCode: { in: codes.map(code => code.code) } },
          include: { items: { include: { supplement: true } } }, orderBy: { updatedAt: 'desc' },
        });
        if (!pack) throw new AppError('Dispatched pack not found', 404);
        title = pack.packName;
        type = 'Proforma invoice';
        sourceId = `pack:${pack.id}`;
        // Match the server checkout price, never client-submitted prices or wholesaler costs.
        items = pack.items.map(item => ({ name: item.supplement.name, quantity: item.quantity, unitPrice: item.supplement.price }));
      }
      if (!items.length || items.some(item => item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0))
        throw new AppError('Invoice has no valid payable items', 400);
      const snapshot = { title, type, currency: 'NGN', customer: `${user.firstName} ${user.lastName}`.trim(), items,
        total: items.reduce((total, item) => total + Math.round(item.unitPrice * 100) * item.quantity, 0) / 100 };
      // Repeated clicks for the same snapshot on the same UTC day reuse one queued send.
      const sourceKey = createHash('sha256').update(JSON.stringify([userId, sourceId, snapshot, new Date().toISOString().slice(0, 10)])).digest('hex');
      const invoice = await tx.invoice.upsert({ where: { sourceKey }, update: {}, create: {
        id: randomUUID(), sourceKey, userId, snapshot: snapshot as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 7 * 86400000),
      } });
      invoiceLink(invoice); // Validate signing configuration before committing any work.
      const job = await this.workflows.enqueue(`invoice:${invoice.id}`, 'invoice', { invoiceId: invoice.id }, userId, undefined, tx);
      return { invoiceId: invoice.id, expiresAt: invoice.expiresAt, notification: { status: job.status } };
    });
  }

  async read(userId: number, id: string, token: unknown) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.userId !== userId) throw new AppError('Invoice not found', 404);
    if (!validInvoiceToken(invoice, token)) throw new AppError('Invoice link is invalid or has expired', 410);
    return { id: invoice.id, createdAt: invoice.createdAt, expiresAt: invoice.expiresAt, ...invoice.snapshot as object };
  }
}
