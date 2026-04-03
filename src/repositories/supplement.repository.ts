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
  imageUrl: string | null;
  category: string | null;
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
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}
  
  async findAll(skip?: number, take?: number, userId?: number): Promise<{ items: Supplement[]; total: number }> {
    const where = userId ? { userId } : {};
    
    const [supplements, total] = await Promise.all([
      this.prisma.supplement.findMany({
        where,
        skip: skip || 0,
        take: take || 50,
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
      this.prisma.supplement.count({ where })
    ]);

    return {
      items: supplements as any[],
      total
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

  async findByNameAndBrand(name: string, brand: string): Promise<Supplement[]> {
    return this.prisma.supplement.findMany({
      where: {
        AND: [
          { name: { contains: name } },
          { category: { contains: brand } }
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
  async search(query: string, brand?: string): Promise<Supplement[]> {
    const where: any = {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } }
      ]
    };
    if (brand) {
      where.AND = [{ category: { contains: brand } }];
    }
    return this.prisma.supplement.findMany({
      where,
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

  // Alias for updateStock - decrements stock by quantity
  async decrementStock(id: number, quantity: number): Promise<Supplement> {
    return this.updateStock(id, quantity);
  }

  // Increment stock (for returns/restocking)
  async incrementStock(id: number, quantity: number): Promise<Supplement> {
    return this.prisma.supplement.update({
      where: { id },
      data: {
        stock: {
          increment: quantity
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

  // Check if sufficient stock is available
  async hasStock(id: number, quantity: number): Promise<boolean> {
    const supplement = await this.prisma.supplement.findUnique({
      where: { id },
      select: { stock: true }
    });
    return supplement ? supplement.stock >= quantity : false;
  }

  async isInCart(id: number): Promise<boolean> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { supplementId: id }
    });
    return cartItems.length > 0;
  }
}
