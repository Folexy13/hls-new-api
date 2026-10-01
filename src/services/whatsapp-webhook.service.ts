import crypto from 'crypto';
import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';

@injectable()
export class WhatsAppWebhookService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  verifySubscription(mode: unknown, token: unknown): boolean {
    return mode === 'subscribe' &&
      typeof token === 'string' &&
      Boolean(config.whatsapp.verifyToken) &&
      this.safeStringEqual(token, config.whatsapp.verifyToken);
  }

  verifySignature(rawBody: Buffer | undefined, signatureHeader: unknown): boolean {
    if (!rawBody || !config.whatsapp.appSecret || typeof signatureHeader !== 'string') {
      return false;
    }

    const [algorithm, suppliedSignature] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !/^[a-f0-9]{64}$/i.test(suppliedSignature || '')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.whatsapp.appSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(suppliedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  async process(payload: any): Promise<number> {
    if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload?.entry)) {
      return 0;
    }

    let processed = 0;
    for (const entry of payload.entry) {
      for (const change of entry?.changes || []) {
        if (change?.field !== 'messages') continue;

        for (const statusEvent of change?.value?.statuses || []) {
          if (!statusEvent?.id || !statusEvent?.status) continue;
          await this.upsertStatus(statusEvent);
          processed += 1;
        }
      }
    }

    return processed;
  }

  private async upsertStatus(event: any): Promise<void> {
    const status = String(event.status).toLowerCase();
    const eventTimestamp = this.parseTimestamp(event.timestamp);
    const error = Array.isArray(event.errors) ? event.errors[0] : undefined;
    const statusTimestamp: Record<string, Date | null | undefined> = {
      sentAt: status === 'sent' ? eventTimestamp : undefined,
      deliveredAt: status === 'delivered' ? eventTimestamp : undefined,
      readAt: status === 'read' ? eventTimestamp : undefined,
      failedAt: status === 'failed' ? eventTimestamp : undefined,
    };

    const data = {
      recipient: event.recipient_id ? String(event.recipient_id) : null,
      status,
      conversationId: event.conversation?.id ? String(event.conversation.id) : null,
      pricingCategory: event.pricing?.category ? String(event.pricing.category) : null,
      errorCode: error?.code != null ? String(error.code) : null,
      errorMessage: error?.message || error?.error_data?.details || null,
      eventTimestamp,
      ...statusTimestamp,
    };

    await this.prisma.whatsAppDelivery.upsert({
      where: { providerMessageId: String(event.id) },
      create: { providerMessageId: String(event.id), ...data },
      update: data,
    });
  }

  private parseTimestamp(value: unknown): Date | null {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(seconds * 1000);
  }

  private safeStringEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }
}
