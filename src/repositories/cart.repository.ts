import { PrismaClient, Cart, CartItem } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

@injectable()
export class CartRepository implements IRepository<Cart> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async findAll(): Promise<Cart[]> {
    return this.prisma.cart.findMany({
      include: {
        items: {
          include: {
            supplement: true
          }
        }
      }
    });
  }

  async findById(id: number): Promise<Cart | null> {
    return this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            supplement: true
          }
        }
      }
    });
  }

  async findByUserId(userId: number): Promise<Cart | null> {
    return this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            supplement: true
          }
        }
      }
    });
  }

  async create(data: Omit<Cart, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cart> {
    return this.prisma.cart.create({
      data,
      include: {
        items: true
      }
    });
  }

  async update(id: number, data: Partial<Cart>): Promise<Cart> {
    return this.prisma.cart.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            supplement: true
          }
        }
      }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.cart.delete({
      where: { id }
    });
  }

  async addItem(cartId: number, supplementId: number, quantity: number): Promise<CartItem> {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        supplementId,
        quantity
      },
      include: {
        supplement: true
      }
    });
  }

  async updateItem(id: number, quantity: number): Promise<CartItem> {
    return this.prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        supplement: true
      }
    });
  }

  async removeItem(id: number): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id }
    });
  }

  async clearCart(cartId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId }
    });
  }

  async findCartItem(cartId: number, supplementId: number): Promise<CartItem | null> {
    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        supplementId
      },
      include: {
        supplement: true
      }
    });
  }
}
