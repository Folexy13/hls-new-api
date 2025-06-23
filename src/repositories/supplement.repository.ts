import { PrismaClient, Supplement } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

@injectable()
export class SupplementRepository implements IRepository<Supplement> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async findAll(skip?: number, take?: number): Promise<{ supplements: Supplement[]; total: number }> {
    const [supplements, total] = await Promise.all([
      this.prisma.supplement.findMany({
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.supplement.count()
    ]);

    return { supplements, total };
  }

  async findById(id: number): Promise<Supplement | null> {
    return this.prisma.supplement.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async findByUserId(userId: number): Promise<Supplement[]> {
    return this.prisma.supplement.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async create(data: Omit<Supplement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplement> {
    return this.prisma.supplement.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async update(id: number, data: Partial<Supplement>): Promise<Supplement> {
    return this.prisma.supplement.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.supplement.delete({
      where: { id }
    });
  }

  async search(query: string): Promise<Supplement[]> {
    return this.prisma.supplement.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateStock(id: number, quantity: number): Promise<Supplement> {
    return this.prisma.supplement.update({
      where: { id },
      data: {
        stock: {
          decrement: quantity
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async isInCart(id: number): Promise<boolean> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { supplementId: id }
    });
    return cartItems.length > 0;
  }
}
