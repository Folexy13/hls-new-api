import { inject, injectable } from 'inversify';
import { NotificationJob, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationService } from './notification.service';
import { invoiceLink } from '../utilities/invoice-link.utility';

export type NotificationKind = 'order_processing' | 'order_dispatched' | 'order_delivered'
  | 'cart_reminder' | 'profile_incomplete' | 'assessment_reminder'
  | 'support_received' | 'support_reply' | 'pharmacy_referral' | 'pharmacy_accepted' | 'pack_available'
  | 'payment_successful' | 'payment_failed' | 'assessment_completed' | 'invoice';

type Payload = Record<string, any>;
type Db = PrismaClient | Prisma.TransactionClient;
const DAY = 86400000;

@injectable()
export class NotificationWorkflowService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationService) private notifications: NotificationService,
  ) {}

  async enqueue(key: string, kind: NotificationKind, payload: Payload,
    userId?: number, quizCodeId?: number, db: Db = this.prisma) {
    return db.notificationJob.upsert({
      where: { idempotencyKey: key }, update: {},
      create: { idempotencyKey: key, kind, payload: payload as Prisma.InputJsonValue, userId, quizCodeId },
    });
  }

  async enqueueAssessmentCompleted(quizCodeId: number, db: Db = this.prisma) {
    const code = await db.quizCode.findUnique({ where: { id: quizCodeId } });
    if (!code?.usedBy || code.preferenceBudget == null) return;
    return this.enqueue(`assessment-completed:${code.id}`, 'assessment_completed', {}, code.usedBy, code.id, db);
  }

  private async hasActiveCartCheckout(userId: number, cart: { id: number; items: { supplementId: number; quantity: number }[] }, now = new Date()) {
    // A live checkout delays reminders for one hour, not forever. Never infer financial failure from age.
    const payments = await this.prisma.payment.findMany({ where: {
      userId, status: 'pending', createdAt: { gte: new Date(now.getTime() - 60 * 60000) },
      order: { items: { some: {} } },
    }, include: { order: { include: { items: true } } } });
    const fingerprint = (items: { supplementId: number; quantity: number }[]) => JSON.stringify(
      items.map(item => [item.supplementId, item.quantity]).sort((a, b) => a[0] - b[0]));
    return payments.some(payment => {
      let metadata: any;
      try { metadata = JSON.parse(payment.metadata || '{}'); } catch { return false; }
      return metadata.checkoutType === 'cart' && Number(metadata.cartId) === cart.id
        && Boolean(payment.order?.items && fingerprint(payment.order.items) === fingerprint(cart.items));
    });
  }

  missingProfileFields(user: { firstName?: string | null; lastName?: string | null; phone?: string | null; deliveryAddress?: string | null; dropOffAddress?: string | null }) {
    return [!user.firstName?.trim() && 'first name', !user.lastName?.trim() && 'last name',
      !user.phone?.trim() && 'phone number', !(user.deliveryAddress?.trim() || user.dropOffAddress?.trim()) && 'delivery address']
      .filter(Boolean).join(', ');
  }

  async syncPharmacySelection(userId: number) {
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'benfek' || !user.preferredPharmacyName?.trim()) return;
      const name = user.preferredPharmacyName.trim();
      const phone = user.preferredPharmacyPhone?.replace(/\s/g, '') || null;
      const existing = await tx.pharmacyRequest.findUnique({ where: { userId } });
      if (existing && existing.pharmacyName === name && existing.pharmacyPhone === phone) return existing;
      const request = await tx.pharmacyRequest.upsert({
        where: { userId },
        create: { userId, pharmacyName: name, pharmacyPhone: phone },
        update: { pharmacyName: name, pharmacyPhone: phone, status: 'pending', version: { increment: 1 }, approvedById: null, acceptedAt: null },
      });
      return request;
    });
  }

  async scheduleReminders(now = new Date()) {
    const before = new Date(now.getTime() - DAY);
    const since = new Date(now.getTime() - 7 * DAY);
    // Candidates are bounded and each batch advances via an ID cursor.
    let cursor = 0;
    while (true) {
      const users = await this.prisma.user.findMany({
        where: { id: { gt: cursor }, role: 'benfek', notificationRemindersEnabled: true, createdAt: { lte: before } },
        orderBy: { id: 'asc' }, take: 100,
      });
      if (!users.length) break;
      for (const user of users) {
        const missingFields = this.missingProfileFields(user);
        const recentProfileReminder = missingFields && await this.prisma.notificationJob.findFirst({
          where: { userId: user.id, kind: 'profile_incomplete', createdAt: { gte: since } },
        });
        if (missingFields && !recentProfileReminder) await this.enqueue(`profile:${user.id}:${Math.floor(now.getTime() / (7 * DAY))}`,
          'profile_incomplete', { missingFields }, user.id);
        const cart = await this.prisma.cart.findFirst({ where: { userId: user.id, items: { some: {} } }, include: { items: true } });
        if (cart) {
          const activity = Math.max(cart.updatedAt.getTime(), ...cart.items.map(item => item.updatedAt.getTime()));
          const pendingPayment = await this.hasActiveCartCheckout(user.id, cart, now);
          if (!pendingPayment && activity <= before.getTime() && activity >= since.getTime()) {
            await this.enqueue(`cart:${cart.id}:${activity}`, 'cart_reminder', { cartId: cart.id, activity }, user.id);
          }
        }
      }
      cursor = users[users.length - 1].id;
    }
    cursor = 0;
    while (true) {
      const codes = await this.prisma.quizCode.findMany({
        where: { id: { gt: cursor }, preferenceBudget: null, createdAt: { gte: since, lte: before },
          OR: [{ usedBy: null, notificationRemindersEnabled: true }, { usedBy: { not: null } }] },
        orderBy: { id: 'asc' }, take: 100,
      });
      if (!codes.length) break;
      for (const code of codes) {
        const user = code.usedBy ? await this.prisma.user.findUnique({ where: { id: code.usedBy } }) : null;
        if (code.usedBy && !user?.notificationRemindersEnabled) continue;
        if (code.expiresAt && code.expiresAt <= now) continue;
        await this.enqueue(`assessment:${code.id}`, 'assessment_reminder', {
          phone: code.benfekPhone, benfekName: code.benfekName, code: code.code,
        }, user?.id, code.id);
      }
      cursor = codes[codes.length - 1].id;
    }
  }

  private async prepare(job: NotificationJob): Promise<Payload | null> {
    const data = { ...(job.payload as Payload) };
    const user = job.userId ? await this.prisma.user.findUnique({ where: { id: job.userId } }) : null;
    if (job.userId && !user) return null;
    const reminder = ['cart_reminder', 'profile_incomplete', 'assessment_reminder'].includes(job.kind);
    if (reminder && user && (user.role !== 'benfek' || !user.notificationRemindersEnabled)) return null;
    if (user && job.kind !== 'pharmacy_referral') data.phone = user.phone || user.whatsappNumber;
    if (job.kind === 'assessment_completed') {
      const code = job.quizCodeId ? await this.prisma.quizCode.findUnique({ where: { id: job.quizCodeId } }) : null;
      if (!code || code.usedBy !== job.userId || code.preferenceBudget == null || user?.role !== 'benfek') return null;
      data.benfekName = user.firstName || code.benfekName;
    }
    if (job.kind === 'invoice') {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice || invoice.userId !== job.userId || invoice.expiresAt <= new Date() || user?.role !== 'benfek') return null;
      data.imageUrl = invoiceLink(invoice);
    }
    if (job.kind === 'support_received' || job.kind === 'support_reply') {
      if (!user || !['benfek', 'principal', 'wholesaler'].includes(user.role)) return null;
      data.role = user.role;
    }
    if (job.kind === 'payment_successful' || job.kind === 'payment_failed') {
      const payment = await this.prisma.payment.findUnique({ where: { id: data.paymentId } });
      const expected = job.kind === 'payment_successful' ? 'success' : 'failed';
      if (!payment || payment.userId !== job.userId || payment.paystackReference !== data.reference || payment.status !== expected) return null;
      data.amount = payment.amount;
    }
    if (job.kind === 'pack_available') {
      const pack = await this.prisma.researcherPack.findUnique({ where: { id: data.packId } });
      const code = job.quizCodeId ? await this.prisma.quizCode.findUnique({ where: { id: job.quizCodeId } }) : null;
      if (!pack || pack.status !== 'dispatched' || !code || pack.quizCode !== code.code) return null;
      if (code.usedBy) {
        const owner = await this.prisma.user.findUnique({ where: { id: code.usedBy } });
        if (!owner || owner.role !== 'benfek') return null;
        data.phone = owner.phone || owner.whatsappNumber;
      } else {
        data.phone = code.benfekPhone;
      }
      data.packName = pack.packName;
      data.code = code.code;
    }
    if (job.kind === 'profile_incomplete') {
      data.missingFields = user && this.missingProfileFields(user);
      if (!data.missingFields) return null;
    }
    if (job.kind === 'cart_reminder') {
      const cart = await this.prisma.cart.findUnique({ where: { id: data.cartId }, include: { items: true } });
      if (!cart?.items.length || cart.userId !== job.userId) return null;
      const activity = Math.max(cart.updatedAt.getTime(), ...cart.items.map(item => item.updatedAt.getTime()));
      if (activity !== data.activity) return null;
      if (activity < Date.now() - 7 * DAY) return null;
      if (await this.hasActiveCartCheckout(job.userId!, cart)) data.deferUntil = new Date(Date.now() + 15 * 60000);
      data.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    if (job.kind === 'assessment_reminder') {
      const code = job.quizCodeId ? await this.prisma.quizCode.findUnique({ where: { id: job.quizCodeId } }) : null;
      if (!code || code.preferenceBudget != null || (code.expiresAt && code.expiresAt <= new Date())) return null;
      data.registered = Boolean(code.usedBy);
      if (code.usedBy) {
        const owner = await this.prisma.user.findUnique({ where: { id: code.usedBy } });
        if (!owner?.notificationRemindersEnabled || owner.role !== 'benfek') return null;
        data.phone = owner.phone || owner.whatsappNumber;
      } else if (!code.notificationRemindersEnabled) return null;
    }
    if (job.kind.startsWith('pharmacy_')) {
      const request = await this.prisma.pharmacyRequest.findUnique({ where: { id: data.requestId } });
      if (!request || request.version !== data.version || !user || user.role !== 'benfek'
        || request.pharmacyName !== user.preferredPharmacyName?.trim()
        || request.pharmacyPhone !== (user.preferredPharmacyPhone?.replace(/\s/g, '') || null)) return null;
      if (job.kind === 'pharmacy_accepted' && request.status !== 'accepted') return null;
      if (job.kind === 'pharmacy_referral') {
        if (request.status !== 'accepted') return null;
        data.benfekName = `${user.firstName} ${user.lastName}`.trim();
        data.benfekPhone = user.phone || undefined;
      }
    }
    if (job.kind.startsWith('order_')) {
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
      const expected = { order_processing: 'processing', order_dispatched: 'shipped', order_delivered: 'delivered' }[job.kind];
      if (!order || order.userId !== job.userId || order.status !== expected) return null;
    }
    return data.phone ? data : null;
  }

  private send(kind: string, p: Payload) {
    // These jobs send WhatsApp only; retrying must not duplicate transactional email.
    const contact = { phone: String(p.phone) };
    switch (kind) {
      case 'assessment_completed': return this.notifications.sendAssessmentCompletedMessage({ ...contact, benfekName: p.benfekName });
      case 'invoice': return this.notifications.sendInvoiceLink({ ...contact, invoiceUrl: p.imageUrl });
      case 'payment_successful': return this.notifications.sendPaymentSuccessfulMessage({ ...contact, orderNumber: p.orderNumber, amount: p.amount });
      case 'payment_failed': return this.notifications.sendPaymentFailedMessage({ ...contact, orderNumber: p.orderNumber });
      case 'pack_available': return this.notifications.sendPackAvailableMessage({ ...contact, packName: p.packName, code: p.code });
      case 'order_processing': return this.notifications.sendOrderProcessingMessage({ ...contact, orderNumber: p.orderNumber });
      case 'order_dispatched': return this.notifications.sendOrderDispatchedMessage({ ...contact, orderNumber: p.orderNumber, deliveryAddress: p.deliveryAddress });
      case 'order_delivered': return this.notifications.sendOrderDeliveredMessage({ ...contact, orderNumber: p.orderNumber });
      case 'cart_reminder': return this.notifications.sendCartReminderMessage({ ...contact, itemCount: p.itemCount });
      case 'profile_incomplete': return this.notifications.sendProfileIncompleteMessage({ ...contact, missingFields: p.missingFields });
      case 'assessment_reminder': return this.notifications.sendAssessmentReminderMessage({ ...contact, benfekName: p.benfekName, code: p.code, registered: p.registered });
      case 'support_received': return this.notifications.sendSupportTicketReceivedMessage({ ...contact, subject: p.subject, role: p.role });
      case 'support_reply': return this.notifications.sendSupportReplyMessage({ ...contact, subject: p.subject, role: p.role });
      case 'pharmacy_referral': return this.notifications.notifyPharmacyReferral({ pharmacyPhone: contact.phone, benfekName: p.benfekName, benfekPhone: p.benfekPhone });
      case 'pharmacy_accepted': return this.notifications.notifyPreferredVendorAcceptance({ ...contact, role: 'benfek', pharmacyAccepted: true, preferredPharmacyName: p.pharmacyName });
      default: throw new Error('Unknown notification kind');
    }
  }

  async processPending(limit = 25) {
    const now = new Date();
    const abandonedBefore = new Date(now.getTime() - 10 * 60000);
    const due = { OR: [{ status: 'pending', nextAttemptAt: { lte: now } }, { status: 'processing', lockedAt: { lt: abandonedBefore } }] };
    const jobs = await this.prisma.notificationJob.findMany({ where: { ...due, attemptCount: { lt: 3 } }, orderBy: { id: 'asc' }, take: limit });
    for (const job of jobs) {
      const claimToken = randomUUID();
      const claim = await this.prisma.notificationJob.updateMany({ where: { id: job.id, ...due, attemptCount: { lt: 3 } },
        data: { status: 'processing', claimToken, lockedAt: now, attemptCount: { increment: 1 } } });
      if (!claim.count) continue;
      const owned = { id: job.id, claimToken, status: 'processing' };
      try {
        const payload = await this.prepare(job);
        if (!payload) {
          await this.prisma.notificationJob.updateMany({ where: owned, data: { status: 'cancelled', claimToken: null, lockedAt: null } });
          continue;
        }
        if (payload.deferUntil) {
          await this.prisma.notificationJob.updateMany({ where: owned, data: { status: 'pending', nextAttemptAt: payload.deferUntil,
            attemptCount: job.attemptCount, claimToken: null, lockedAt: null } });
          continue;
        }
        const result = await this.send(job.kind, payload);
        if (!result.success || result.stubbed) throw new Error(result.reason || 'Notification provider did not accept the message');
        const whatsapp = Array.isArray(result.payload) ? result.payload.find(item => item.channel === 'whatsapp') : result;
        const providerMessageId = whatsapp?.payload?.messages?.[0]?.id || whatsapp?.payload?.sid || null;
        await this.prisma.notificationJob.updateMany({ where: owned, data: { status: 'accepted', providerMessageId,
          lastError: null, claimToken: null, lockedAt: null } });
      } catch (error) {
        await this.prisma.notificationJob.updateMany({ where: owned, data: {
          status: job.attemptCount + 1 >= 3 ? 'failed' : 'pending', claimToken: null, lockedAt: null,
          nextAttemptAt: new Date(Date.now() + 5 * 60000 * Math.pow(2, job.attemptCount)),
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Notification failed',
        } });
      }
    }
    // A crashed worker on its last attempt must not leave a permanently processing job.
    await this.prisma.notificationJob.updateMany({ where: { status: 'processing', attemptCount: { gte: 3 }, lockedAt: { lt: abandonedBefore } },
      data: { status: 'failed', claimToken: null, lockedAt: null, lastError: 'Worker lease expired after final attempt' } });
  }
}
