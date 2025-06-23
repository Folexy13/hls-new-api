import { injectable, inject } from 'inversify';
import { CartRepository } from '../repositories/cart.repository';
import { PrismaClient } from '@prisma/client';
import { AddToCartDTO, UpdateCartItemDTO } from '../DTOs/cart.dto';
import { AppError } from '../utilities/errors';

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
export class CartService {
  constructor(
    @inject(CartRepository) private cartRepository: CartRepository,
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async getCart(userId: number): Promise<CartWithItems | null> {
    return this.cartRepository.findByUserId(userId) as Promise<CartWithItems | null>;
  }  async addToCart(userId: number, data: AddToCartDTO): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);
    
    // Check if supplement exists in cart
    const existingItem = cart.items.find(item => item.supplementId === data.supplementId);
    
    if (existingItem) {
      // Update quantity if item exists
      await this.cartRepository.updateItem(existingItem.id, existingItem.quantity + data.quantity);
    } else {
      // Add new item if it doesn't exist
      await this.cartRepository.addItem(cart.id, data.supplementId, data.quantity);
    }

    return this.cartRepository.findById(cart.id) as Promise<CartWithItems>;
  }  async updateCartItem(userId: number, itemId: number, data: UpdateCartItemDTO): Promise<CartWithItems> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    const cartItem = cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new AppError('Cart item not found', 404);
    }

    await this.cartRepository.updateItem(itemId, data.quantity);

    return this.cartRepository.findById(cart.id) as Promise<CartWithItems>;
  }  async removeCartItem(userId: number, itemId: number): Promise<CartWithItems> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    const cartItem = cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new AppError('Cart item not found', 404);
    }

    await this.cartRepository.removeItem(itemId);

    return this.cartRepository.findById(cart.id) as Promise<CartWithItems>;
  }  async clearCart(userId: number): Promise<CartWithItems> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    await this.cartRepository.clearCart(cart.id);

    return this.cartRepository.findById(cart.id) as Promise<CartWithItems>;
  }
  private async getOrCreateCart(userId: number): Promise<CartWithItems> {
    let cart = await this.cartRepository.findByUserId(userId);
    
    if (!cart) {
      cart = await this.cartRepository.create({
        userId,
        items: []
      });
    }

    return cart;
  }

  async getCartTotal(cart: CartWithItems): Promise<number> {
    let total = 0;
    for (const item of cart.items) {
      total += item.quantity * item.supplement.price;
    }
    return total;
  }
}
