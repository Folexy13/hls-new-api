import { PrismaClient, Payment } from '@prisma/client';
import { injectable, inject } from 'inversify';

export interface CreatePaymentDTO {
  userId: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  paystackReference?: string;
  paystackTransactionId?: string;
  paystackChannel?: string;
  currency?: string;
  paidAt?: Date;
  metadata?: string;
}

@injectable()
export class PaystackRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async savePayment(data: CreatePaymentDTO): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        status: data.status,
        paystackReference: data.paystackReference,
        paystackTransactionId: data.paystackTransactionId,
        paystackChannel: data.paystackChannel,
        currency: data.currency || 'NGN',
        paidAt: data.paidAt,
        metadata: data.metadata,
      },
    });
  }

  async getPaymentByTransaction(transaction: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ 
      where: { paystackReference: transaction } 
    });
  }

  async getPaymentByOrderId(orderId: number): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { orderId },
    });
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: { status },
    });
  }

  async getPaymentsByUserId(userId: number, skip?: number, take?: number): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 10,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return { payments, total };
  }
}
