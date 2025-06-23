import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

// Define cart item type with supplement
type CartItemWithSupplement = {
  id: number;
  quantity: number;
  cartId: number;
  supplementId: number;
  supplement: {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};

// Define cart type with items
type CartWithItems = {
  id: number;
  userId: number;
  items: CartItemWithSupplement[];
  createdAt: Date;
  updatedAt: Date;
};

@injectable()
export class CartRepository implements IRepository<CartWithItems> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}
  async findAll(skip?: number, take?: number): Promise<{ items: CartWithItems[]; total: number }> {
    // Using raw queries to avoid Prisma model type issues
    const carts = await this.prisma.$queryRaw`
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      LIMIT ${take || 50} OFFSET ${skip || 0}
    ` as CartWithItems[];

    const totalResult = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Cart
    ` as Array<{ count: number }>;

    // Get items for each cart
    for (const cart of carts) {
      const items = await this.prisma.$queryRaw`
        SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
               s.id as 'supplement.id', s.name as 'supplement.name', 
               s.description as 'supplement.description', s.price as 'supplement.price',
               s.stock as 'supplement.stock', s.userId as 'supplement.userId',
               s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
        FROM CartItem ci
        JOIN Supplement s ON ci.supplementId = s.id
        WHERE ci.cartId = ${cart.id}
      ` as any[];
      
      // Transform the flat results into nested objects
      cart.items = items.map(item => ({
        id: item.id,
        cartId: item.cartId,
        supplementId: item.supplementId,
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        supplement: {
          id: item['supplement.id'],
          name: item['supplement.name'],
          description: item['supplement.description'],
          price: item['supplement.price'],
          stock: item['supplement.stock'],
          userId: item['supplement.userId'],
          createdAt: item['supplement.createdAt'],
          updatedAt: item['supplement.updatedAt']
        }
      }));
    }

    return { items: carts, total: totalResult[0].count };
  }
  async findById(id: number): Promise<CartWithItems | null> {
    const carts = await this.prisma.$queryRaw`
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      WHERE id = ${id}
    ` as CartWithItems[];
    
    if (!carts.length) return null;
    
    const cart = carts[0];
    
    const items = await this.prisma.$queryRaw`
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${id}
    ` as any[];
    
    // Transform the flat results into nested objects
    cart.items = items.map(item => ({
      id: item.id,
      cartId: item.cartId,
      supplementId: item.supplementId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      supplement: {
        id: item['supplement.id'],
        name: item['supplement.name'],
        description: item['supplement.description'],
        price: item['supplement.price'],
        stock: item['supplement.stock'],
        userId: item['supplement.userId'],
        createdAt: item['supplement.createdAt'],
        updatedAt: item['supplement.updatedAt']
      }
    }));
    
    return cart;
  }
  async findByUserId(userId: number): Promise<CartWithItems | null> {
    const carts = await this.prisma.$queryRaw`
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      WHERE userId = ${userId}
    ` as CartWithItems[];
    
    if (!carts.length) return null;
    
    const cart = carts[0];
    
    const items = await this.prisma.$queryRaw`
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${cart.id}
    ` as any[];
    
    // Transform the flat results into nested objects
    cart.items = items.map(item => ({
      id: item.id,
      cartId: item.cartId,
      supplementId: item.supplementId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      supplement: {
        id: item['supplement.id'],
        name: item['supplement.name'],
        description: item['supplement.description'],
        price: item['supplement.price'],
        stock: item['supplement.stock'],
        userId: item['supplement.userId'],
        createdAt: item['supplement.createdAt'],
        updatedAt: item['supplement.updatedAt']
      }
    }));
    
    return cart;
  }
  async create(data: Omit<CartWithItems, 'id' | 'createdAt' | 'updatedAt'>): Promise<CartWithItems> {
    await this.prisma.$executeRaw`
      INSERT INTO Cart (userId, createdAt, updatedAt)
      VALUES (${data.userId}, NOW(), NOW())
    `;
    
    const carts = await this.prisma.$queryRaw`
      SELECT id FROM Cart WHERE userId = ${data.userId} ORDER BY id DESC LIMIT 1
    ` as { id: number }[];
    
    return this.findById(carts[0].id) as Promise<CartWithItems>;
  }

  async update(id: number, data: Partial<CartWithItems>): Promise<CartWithItems> {
    if (data.userId) {
      await this.prisma.$executeRaw`
        UPDATE Cart SET userId = ${data.userId}, updatedAt = NOW()
        WHERE id = ${id}
      `;
    }
    
    return this.findById(id) as Promise<CartWithItems>;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM CartItem WHERE cartId = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM Cart WHERE id = ${id}`;
  }
  async addItem(cartId: number, supplementId: number, quantity: number): Promise<CartItemWithSupplement> {
    await this.prisma.$executeRaw`
      INSERT INTO CartItem (cartId, supplementId, quantity, createdAt, updatedAt)
      VALUES (${cartId}, ${supplementId}, ${quantity}, NOW(), NOW())
    `;
    
    const items = await this.prisma.$queryRaw`
      SELECT ci.id FROM CartItem ci 
      WHERE ci.cartId = ${cartId} AND ci.supplementId = ${supplementId}
      ORDER BY ci.id DESC LIMIT 1
    ` as { id: number }[];
    
    if (!items.length) {
      throw new Error('Failed to create cart item');
    }
    
    const result = await this.prisma.$queryRaw`
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.id = ${items[0].id}
    ` as any[];
    
    if (!result.length) {
      throw new Error('Failed to fetch created cart item');
    }
    
    // Transform to the expected format
    return {
      id: result[0].id,
      cartId: result[0].cartId,
      supplementId: result[0].supplementId,
      quantity: result[0].quantity,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
      supplement: {
        id: result[0]['supplement.id'],
        name: result[0]['supplement.name'],
        description: result[0]['supplement.description'],
        price: result[0]['supplement.price'],
        stock: result[0]['supplement.stock'],
        userId: result[0]['supplement.userId'],
        createdAt: result[0]['supplement.createdAt'],
        updatedAt: result[0]['supplement.updatedAt']
      }
    };
  }

  async updateItem(id: number, quantity: number): Promise<CartItemWithSupplement> {
    await this.prisma.$executeRaw`
      UPDATE CartItem SET quantity = ${quantity}, updatedAt = NOW()
      WHERE id = ${id}
    `;
    
    const result = await this.prisma.$queryRaw`
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.id = ${id}
    ` as any[];
    
    if (!result.length) {
      throw new Error('Cart item not found');
    }
    
    // Transform to the expected format
    return {
      id: result[0].id,
      cartId: result[0].cartId,
      supplementId: result[0].supplementId,
      quantity: result[0].quantity,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
      supplement: {
        id: result[0]['supplement.id'],
        name: result[0]['supplement.name'],
        description: result[0]['supplement.description'],
        price: result[0]['supplement.price'],
        stock: result[0]['supplement.stock'],
        userId: result[0]['supplement.userId'],
        createdAt: result[0]['supplement.createdAt'],
        updatedAt: result[0]['supplement.updatedAt']
      }
    };
  }

  async removeItem(id: number): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM CartItem WHERE id = ${id}`;
  }

  async clearCart(cartId: number): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM CartItem WHERE cartId = ${cartId}`;
  }

  async findCartItem(cartId: number, supplementId: number): Promise<CartItemWithSupplement | null> {
    const result = await this.prisma.$queryRaw`
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${cartId} AND ci.supplementId = ${supplementId}
    ` as any[];
    
    if (!result.length) {
      return null;
    }
    
    // Transform to the expected format
    return {
      id: result[0].id,
      cartId: result[0].cartId,
      supplementId: result[0].supplementId,
      quantity: result[0].quantity,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
      supplement: {
        id: result[0]['supplement.id'],
        name: result[0]['supplement.name'],
        description: result[0]['supplement.description'],
        price: result[0]['supplement.price'],
        stock: result[0]['supplement.stock'],
        userId: result[0]['supplement.userId'],
        createdAt: result[0]['supplement.createdAt'],
        updatedAt: result[0]['supplement.updatedAt']
      }
    };
  }
}
