import { inject, injectable } from 'inversify';
import { RequestHandler, Response } from 'express';
import { BaseController } from './base.controller';
import { CartService } from '../services/cart.service';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import { AuthenticatedRequest } from '../types/auth.types';
import { AddToCartSchema, UpdateCartItemSchema } from '../DTOs/cart.dto';
import { AuthService } from '../services/auth.service';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - userId
 *         - items
 *         - createdAt
 *         - updatedAt
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         quantity:
 *           type: integer
 *         cartId:
 *           type: integer
 *         supplementId:
 *           type: integer
 *         supplement:
 *           $ref: '#/components/schemas/Supplement'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - quantity
 *         - cartId
 *         - supplementId
 *         - createdAt
 *         - updatedAt
 *     AddToCartRequest:
 *       type: object
 *       properties:
 *         supplementId:
 *           type: integer
 *           minimum: 1
 *         quantity:
 *           type: integer
 *           minimum: 1
 *       required:
 *         - supplementId
 *         - quantity
 *     UpdateCartItemRequest:
 *       type: object
 *       properties:
 *         quantity:
 *           type: integer
 *           minimum: 1
 *       required:
 *         - quantity
 */

@injectable()
export class CartController extends BaseController {
  constructor(
    container: Container,
    @inject(CartService) private cartService: CartService
  ) {
    super(container);
  }

  /**
   * @swagger
   * /api/v2/cart:
   *   get:
   *     tags: [Cart]
   *     summary: Get user's cart
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Cart details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cart:
   *                   $ref: '#/components/schemas/Cart'
   *       404:
   *         description: Cart not found
   */
  async getCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const cart = await this.cartService.getCart(userId);
      if (!cart) {
        return ResponseUtil.error(res, 'Cart not found', 404);
      }
      return ResponseUtil.success(res, { cart });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/cart/items:
   *   post:
   *     tags: [Cart]
   *     summary: Add item to cart
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddToCartRequest'
   *     responses:
   *       200:
   *         description: Item added to cart successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cart:
   *                   $ref: '#/components/schemas/Cart'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Supplement not found
   */
  async addToCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const data = AddToCartSchema.parse(req.body);
      const cart = await this.cartService.addToCart(userId, data);
      return ResponseUtil.success(res, { cart });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/cart/items/{id}:
   *   put:
   *     tags: [Cart]
   *     summary: Update cart item quantity
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateCartItemRequest'
   *     responses:
   *       200:
   *         description: Cart item updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cart:
   *                   $ref: '#/components/schemas/Cart'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Cart item not found
   */
  async updateCartItem(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const itemId = parseInt(req.params.id);
      const data = UpdateCartItemSchema.parse(req.body);
      const cart = await this.cartService.updateCartItem(userId, itemId, data);
      if (!cart) {
        return ResponseUtil.error(res, 'Cart item not found', 404);
      }
      return ResponseUtil.success(res, { cart });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/cart/items/{id}:
   *   delete:
   *     tags: [Cart]
   *     summary: Remove item from cart
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Item removed from cart successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cart:
   *                   $ref: '#/components/schemas/Cart'
   *       404:
   *         description: Cart item not found
   */
  async removeCartItem(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const itemId = parseInt(req.params.id);
      const cart = await this.cartService.removeCartItem(userId, itemId);
      if (!cart) {
        return ResponseUtil.error(res, 'Cart item not found', 404);
      }
      return ResponseUtil.success(res, { cart });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/cart:
   *   delete:
   *     tags: [Cart]
   *     summary: Clear cart
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Cart cleared successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cart:
   *                   $ref: '#/components/schemas/Cart'
   *       404:
   *         description: Cart not found
   */
  async clearCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const cart = await this.cartService.clearCart(userId);
      if (!cart) {
        return ResponseUtil.error(res, 'Cart not found', 404);
      }
      return ResponseUtil.success(res, { cart });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }
}