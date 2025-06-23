import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

// Define supplement type
interface Supplement {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  userId: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class SupplementRepository implements IRepository<Supplement> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}  async findAll(skip?: number, take?: number): Promise<{ items: Supplement[]; total: number }> {
    // Using raw queries to avoid Prisma model type issues
    const supplements = await this.prisma.$queryRaw`
      SELECT s.id, s.name, s.description, s.price, s.stock, s.userId, 
             s.createdAt, s.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Supplement s
      JOIN User u ON s.userId = u.id
      ORDER BY s.createdAt DESC
      LIMIT ${take || 50} OFFSET ${skip || 0}
    ` as any[];

    const totalResult = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Supplement
    ` as Array<{ count: number }>;

    // Transform the flat results into nested objects
    const transformedSupplements = supplements.map(supplement => ({
      id: supplement.id,
      name: supplement.name,
      description: supplement.description,
      price: supplement.price,
      stock: supplement.stock,
      userId: supplement.userId,
      createdAt: supplement.createdAt,
      updatedAt: supplement.updatedAt,
      user: {
        id: supplement['user.id'],
        firstName: supplement['user.firstName'],
        lastName: supplement['user.lastName'],
        email: supplement['user.email']
      }
    }));

    return { 
      items: transformedSupplements, 
      total: totalResult[0].count 
    };
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

  async create(data: Omit<Supplement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplement> {    // Remove user property if it exists
    const { user, ...supplementData } = data as any;
    
    return this.prisma.supplement.create({
      data: supplementData,
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

  async update(id: number, data: Partial<Supplement>): Promise<Supplement> {    // Remove id and user properties if they exist
    const { id: dataId, user, ...updateData } = data as any;
    
    return this.prisma.supplement.update({
      where: { id },
      data: updateData,
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
          { name: { contains: query } },
          { description: { contains: query } }
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
