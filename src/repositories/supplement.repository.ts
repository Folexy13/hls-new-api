import { PrismaClient, Prisma } from '@prisma/client';
import { injectable, inject } from 'inversify';

type SupplementWithUser = Prisma.SupplementGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

@injectable()
export class SupplementRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}
  
  async findAll(
    skip?: number,
    take?: number,
    userId?: number,
  ): Promise<{ items: SupplementWithUser[]; total: number }> {
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
      items: supplements,
      total
    };
  }

  async findById(id: number): Promise<SupplementWithUser | null> {
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

  async findByUserId(userId: number): Promise<SupplementWithUser[]> {
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

  async findByNameAndBrand(name: string, brand: string): Promise<SupplementWithUser[]> {
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

  async create(data: Prisma.SupplementUncheckedCreateInput): Promise<SupplementWithUser> {
    
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

  async update(id: number, data: Prisma.SupplementUncheckedUpdateInput): Promise<SupplementWithUser> {
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
  async search(query: string, brand?: string): Promise<SupplementWithUser[]> {
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

  async updateStock(id: number, quantity: number): Promise<SupplementWithUser> {
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
  async decrementStock(id: number, quantity: number): Promise<SupplementWithUser> {
    return this.updateStock(id, quantity);
  }

  // Increment stock (for returns/restocking)
  async incrementStock(id: number, quantity: number): Promise<SupplementWithUser> {
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
