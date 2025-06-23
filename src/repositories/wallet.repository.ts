import { PrismaClient, Wallet } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

@injectable()
export class WalletRepository implements IRepository<Wallet> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}
  async findAll(skip?: number, take?: number): Promise<{ items: Wallet[]; total: number }> {
    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take,
        include: { withdrawals: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.wallet.count()
    ]);
    
    return { items: wallets, total };
  }

  async findById(id: number): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id },
      include: { withdrawals: true }
    });
  }

  async findByUserId(userId: number): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
      include: { withdrawals: true }
    });
  }

  async create(data: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    return this.prisma.wallet.create({
      data,
      include: { withdrawals: true }
    });
  }

  async update(id: number, data: Partial<Wallet>): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { id },
      data,
      include: { withdrawals: true }
    });
  }

  async updateBalance(id: number, amount: number, isCredit: boolean): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { id },
      data: {
        balance: {
          [isCredit ? 'increment' : 'decrement']: amount
        }
      },
      include: { withdrawals: true }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.wallet.delete({
      where: { id }
    });
  }
}
