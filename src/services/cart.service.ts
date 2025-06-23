import { injectable, inject } from 'inversify';
import { CartRepository } from '../repositories/cart.repository';
import { Cart, CartItem } from '@prisma/client';
import { AddToCartDTO, UpdateCartItemDTO } from '../DTOs/cart.dto';
import { PrismaClient } from '@prisma/client';

@injectable()
export class CartService {
  constructor(
    @inject(CartRepository) private cartRepository: CartRepository,
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async getCart(userId: number): Promise<Cart | null> {
    return this.cartRepository.findByUserId(userId);
  }

  async addToCart(userId: number, data: AddToCartDTO): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    
    // Check if supplement exists in cart
    const existingItem = cart.items.find(item => item.supplementId === data.supplementId);
    
    if (existingItem) {
      // Update quantity if item exists
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + data.quantity }
      });
    } else {
      // Add new item if it doesn't exist
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          supplementId: data.supplementId,
          quantity: data.quantity
        }
      });
    }

    return this.cartRepository.findById(cart.id) as Promise<Cart>;
  }

  async updateCartItem(userId: number, itemId: number, data: UpdateCartItemDTO): Promise<Cart> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItem = cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: data.quantity }
    });

    return this.cartRepository.findById(cart.id) as Promise<Cart>;
  }

  async removeCartItem(userId: number, itemId: number): Promise<Cart> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItem = cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId }
    });

    return this.cartRepository.findById(cart.id) as Promise<Cart>;
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    return this.cartRepository.findById(cart.id) as Promise<Cart>;
  }

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findByUserId(userId);
    
    if (!cart) {
      cart = await this.cartRepository.create({
        userId,
        items: []
      });
    }

    return cart;
  }

  async getCartTotal(cart: Cart): Promise<number> {
    let total = 0;
    for (const item of cart.items) {
      total += item.quantity * item.supplement.price;
    }
    return total;
  }
}
