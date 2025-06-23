import { PrismaClient, Withdrawal } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

@injectable()
export class WithdrawalRepository implements IRepository<Withdrawal> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}
  async findAll(skip?: number, take?: number): Promise<{ items: Withdrawal[]; total: number }> {
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        skip,
        take,
        include: {
          user: true,
          wallet: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.withdrawal.count()
    ]);
    
    return { items: withdrawals, total };
  }

  async findById(id: number): Promise<Withdrawal | null> {
    return this.prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: true,
        wallet: true
      }
    });
  }

  async findByUserId(userId: number): Promise<Withdrawal[]> {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      include: {
        user: true,
        wallet: true
      }
    });
  }

  async findUserWithdrawalsForMonth(userId: number, month: number, year: number): Promise<Withdrawal[]> {
    return this.prisma.withdrawal.findMany({
      where: {
        userId,
        month,
        year,
        status: 'completed'
      }
    });
  }

  async create(data: Omit<Withdrawal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Withdrawal> {
    return this.prisma.withdrawal.create({
      data,
      include: {
        user: true,
        wallet: true
      }
    });
  }

  async update(id: number, data: Partial<Withdrawal>): Promise<Withdrawal> {
    return this.prisma.withdrawal.update({
      where: { id },
      data,
      include: {
        user: true,
        wallet: true
      }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.withdrawal.delete({
      where: { id }
    });
  }
}
