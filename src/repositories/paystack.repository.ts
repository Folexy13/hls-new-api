import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';

@injectable()
export class PaystackRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async savePayment({ userId, orderId, amount, method, status, transaction }: { userId: number; orderId: number; amount: number; method: string; status: string; transaction?: string }) {
    return this.prisma.payment.create({
      data: {
        userId,
        orderId,
        amount,
        method,
        status,
        transaction,
      },
    });
  }

  async getPaymentByTransaction(transaction: string) {
    return this.prisma.payment.findFirst({ where: { transaction } });
  }
}
