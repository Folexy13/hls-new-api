import { inject, injectable } from 'inversify';
import { Response, RequestHandler } from 'express';
import { PaystackService } from '../services/paystack.service';
import { CartService } from '../services/cart.service';
import { PaystackRepository } from '../repositories/paystack.repository';
import { AuthenticatedRequest } from '../types/auth.types';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import { PaystackInitializeSchema, PaystackInitializeDTO } from '../DTOs/paystack.dto';

@injectable()
export class PaystackController extends BaseController {
  constructor(
    container: Container,
    @inject(CartService) private cartService: CartService,
    @inject(PaystackRepository) private paystackRepository: PaystackRepository
  ) {
    super(container);
  }

  /**
   * @swagger
   * /paystack/initialize:
   *   post:
   *     summary: Initialize Paystack transaction
   *     tags: [Cart, Paystack]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PaystackInitializeRequest'
   *     responses:
   *       200:
   *         description: Paystack transaction initialized
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     authorization_url:
   *                       type: string
   *                     access_code:
   *                       type: string
   *                     reference:
   *                       type: string
   */
  async initializeCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      const data: PaystackInitializeDTO = PaystackInitializeSchema.parse(req.body);
      const result = await PaystackService.initializeTransaction(data);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Invalid payload.' });
    }
  };

  /**
   * @swagger
   * /paystack/checkout:
   *   post:
   *     summary: Checkout from cart and initialize Paystack
   *     tags: [Cart, Paystack]
   */
  async checkoutFromCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      if (!userId || !email) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const cart = await this.cartService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty.' });
      }
      const total = await this.cartService.getCartTotal(cart);
      const metadata = { cartId: cart.id, userId };
      const result = await PaystackService.initializeTransaction({ email, amount: Math.round(total * 100), metadata });
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack checkout failed.' });
    }
  };

  /**
   * @swagger
   * /paystack/verify/{reference}:
   *   get:
   *     summary: Verify Paystack transaction
   *     tags: [Cart, Paystack]
   */
  async verifyCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ message: 'Reference is required.' });
      }
      const result = await PaystackService.verifyTransaction(reference);
      if (result.data.status === 'success') {
        const userId = req.user.id;
        const cart = await this.cartService.getCart(userId);
        await this.paystackRepository.savePayment({
          userId,
          orderId: 0, // Replace with real orderId after order creation
          amount: result.data.amount / 100,
          method: 'paystack',
          status: result.data.status,
          transaction: reference
        });
        await this.cartService.clearCart(userId);
      }
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack verification failed.' });
    }
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PaystackInitializeRequest:
 *       type: object
 *       required:
 *         - email
 *         - amount
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         amount:
 *           type: number
 *           description: Amount in kobo (100 NGN = 10000)
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           description: Optional metadata for Paystack
 */
