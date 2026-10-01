import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service';

export interface EmailDeliveryResult {
  status: 'sent' | 'pending' | 'failed';
  sent: boolean;
  message: string;
}

interface QueueEmailOptions {
  idempotencyKey: string;
  type: string;
  recipient: string;
  subject: string;
  htmlBody: string;
}

@injectable()
export class EmailDeliveryService {
  private readonly maxAttempts = 5;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(EmailService) private emailService: EmailService
  ) {}

  async sendBenfekWelcome(user: { id: number; email: string; firstName?: string | null; lastName?: string | null }) {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = this.emailService.buildBenfekWelcomeEmail(name);
    return this.queueAndAttempt({
      idempotencyKey: `benfek-welcome:${user.id}`,
      type: 'benfek_welcome',
      recipient: user.email,
      ...email,
    });
  }

  async sendBenfekCode(quizCode: { id: number; code: string; benfekEmail?: string | null; benfekName?: string | null }) {
    if (!quizCode.benfekEmail) {
      return { status: 'failed', sent: false, message: 'No Benfek email address was provided.' } as EmailDeliveryResult;
    }

    const email = this.emailService.buildBenfekCodeEmail(quizCode.code, quizCode.benfekName || undefined);
    return this.queueAndAttempt({
      idempotencyKey: `benfek-code:${quizCode.id}`,
      type: 'benfek_code',
      recipient: quizCode.benfekEmail,
      ...email,
    });
  }

  async resendBenfekCode(quizCode: { id: number; code: string; benfekEmail?: string | null; benfekName?: string | null }) {
    if (!quizCode.benfekEmail) {
      return { status: 'failed', sent: false, message: 'No Benfek email address was provided.' } as EmailDeliveryResult;
    }

    const fiveMinuteWindow = Math.floor(Date.now() / (5 * 60_000));
    const email = this.emailService.buildBenfekCodeEmail(quizCode.code, quizCode.benfekName || undefined);
    return this.queueAndAttempt({
      idempotencyKey: `benfek-code:${quizCode.id}:resend:${fiveMinuteWindow}`,
      type: 'benfek_code_resend',
      recipient: quizCode.benfekEmail,
      ...email,
    });
  }

  async retryPending(limit = 25): Promise<void> {
    const now = new Date();
    const abandonedBefore = new Date(Date.now() - 10 * 60_000);
    const deliveries = await this.prisma.emailDelivery.findMany({
      where: {
        attemptCount: { lt: this.maxAttempts },
        OR: [
          {
            status: { in: ['pending', 'failed'] },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          { status: 'processing', updatedAt: { lte: abandonedBefore } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    for (const delivery of deliveries) {
      await this.attemptDelivery(delivery.id);
    }
  }

  private async queueAndAttempt(options: QueueEmailOptions): Promise<EmailDeliveryResult> {
    const existing = await this.prisma.emailDelivery.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
    });

    if (existing?.status === 'sent') {
      return { status: 'sent', sent: true, message: 'Email was already sent.' };
    }

    if (existing && existing.attemptCount >= this.maxAttempts) {
      return { status: 'failed', sent: false, message: 'Email delivery failed after repeated attempts.' };
    }

    const delivery = existing || await this.prisma.emailDelivery.upsert({
      where: { idempotencyKey: options.idempotencyKey },
      update: {},
      create: options,
    });
    return this.attemptDelivery(delivery.id);
  }

  private async attemptDelivery(id: number): Promise<EmailDeliveryResult> {
    const abandonedBefore = new Date(Date.now() - 10 * 60_000);
    const claimed = await this.prisma.emailDelivery.updateMany({
      where: {
        id,
        status: { not: 'sent' },
        attemptCount: { lt: this.maxAttempts },
        OR: [
          { status: { in: ['pending', 'failed'] } },
          { status: 'processing', updatedAt: { lte: abandonedBefore } },
        ],
      },
      data: { status: 'processing' },
    });

    const delivery = await this.prisma.emailDelivery.findUnique({ where: { id } });
    if (!delivery) {
      return { status: 'failed', sent: false, message: 'Email delivery record was not found.' };
    }
    if (delivery.status === 'sent') {
      return { status: 'sent', sent: true, message: 'Email was already sent.' };
    }
    if (claimed.count === 0) {
      return { status: 'pending', sent: false, message: 'Email delivery is already being processed.' };
    }

    const attemptCount = delivery.attemptCount + 1;
    try {
      const sent = await this.emailService.sendEmail(delivery.recipient, delivery.subject, delivery.htmlBody);
      if (sent) {
        await this.prisma.emailDelivery.update({
          where: { id },
          data: { status: 'sent', attemptCount, sentAt: new Date(), nextAttemptAt: null, lastError: null },
        });
        return { status: 'sent', sent: true, message: 'Email sent successfully.' };
      }

      return this.recordFailure(id, attemptCount, 'All configured email providers rejected the message.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected email delivery error.';
      return this.recordFailure(id, attemptCount, message);
    }
  }

  private async recordFailure(id: number, attemptCount: number, error: string): Promise<EmailDeliveryResult> {
    const canRetry = attemptCount < this.maxAttempts;
    const retryDelayMinutes = Math.min(60, Math.pow(2, attemptCount));
    const nextAttemptAt = canRetry ? new Date(Date.now() + retryDelayMinutes * 60_000) : null;

    await this.prisma.emailDelivery.update({
      where: { id },
      data: {
        status: canRetry ? 'pending' : 'failed',
        attemptCount,
        lastError: error.slice(0, 2000),
        nextAttemptAt,
      },
    });

    return {
      status: canRetry ? 'pending' : 'failed',
      sent: false,
      message: canRetry
        ? 'Email delivery is pending and will be retried.'
        : 'Email delivery failed after repeated attempts.',
    };
  }
}
