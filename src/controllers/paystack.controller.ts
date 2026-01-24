import { inject, injectable } from 'inversify';
import { Response } from 'express';
import { PaystackService } from '../services/paystack.service';
import { CartService } from '../services/cart.service';
import { PaystackRepository } from '../repositories/paystack.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SupplementRepository } from '../repositories/supplement.repository';
import { AuthenticatedRequest } from '../types/auth.types';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import { PaystackInitializeSchema, PaystackInitializeDTO } from '../DTOs/paystack.dto';

@injectable()
export class PaystackController extends BaseController {
  constructor(
    container: Container,
    @inject(CartService) private cartService: CartService,
    @inject(PaystackRepository) private paystackRepository: PaystackRepository,
    @inject(OrderRepository) private orderRepository: OrderRepository,
    @inject(SupplementRepository) private supplementRepository: SupplementRepository
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
  }

  /**
   * @swagger
   * /paystack/checkout:
   *   post:
   *     summary: Checkout from cart and initialize Paystack
   *     tags: [Cart, Paystack]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               shippingAddress:
   *                 type: string
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Paystack checkout initialized
   */
  async checkoutFromCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      const { shippingAddress, notes } = req.body;

      if (!userId || !email) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const cart = await this.cartService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty.' });
      }

      const total = await this.cartService.getCartTotal(cart);
      
      // Create order first (in pending state)
      const order = await this.orderRepository.createOrderFromCart(
        userId,
        cart.items,
        total,
        shippingAddress
      );

      const metadata = { 
        orderId: order.id,
        orderNumber: (order as any).orderNumber,
        cartId: cart.id, 
        userId,
        notes 
      };

      const result = await PaystackService.initializeTransaction({ 
        email, 
        amount: Math.round(total * 100), // Convert to kobo
        metadata 
      });

      return res.status(200).json({
        ...result,
        orderId: order.id,
        orderNumber: (order as any).orderNumber
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack checkout failed.' });
    }
  }

  /**
   * @swagger
   * /paystack/verify/{reference}:
   *   get:
   *     summary: Verify Paystack transaction and complete order
   *     tags: [Cart, Paystack]
   *     parameters:
   *       - name: reference
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Payment verified and order completed
   */
  async verifyCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ message: 'Reference is required.' });
      }

      // Check if payment already processed
      const existingPayment = await this.paystackRepository.getPaymentByTransaction(reference);
      if (existingPayment) {
        return res.status(200).json({ 
          message: 'Payment already processed.',
          data: { status: existingPayment.status }
        });
      }

      const result = await PaystackService.verifyTransaction(reference);
      const userId = req.user.id;

      if (result.data.status === 'success') {
        const metadata = result.data.metadata || {};
        const orderId = metadata.orderId;

        if (!orderId) {
          return res.status(400).json({ message: 'Order ID not found in payment metadata.' });
        }

        // Update order status to paid
        await this.orderRepository.updateStatus(orderId, 'paid');

        // Create payment record
        await this.paystackRepository.savePayment({
          userId,
          orderId,
          amount: result.data.amount / 100, // Convert from kobo to naira
          method: 'paystack',
          status: 'success',
          paystackReference: reference,
          paystackChannel: result.data.channel,
          currency: result.data.currency,
          paidAt: new Date(result.data.paid_at),
          metadata: JSON.stringify(metadata)
        });

        // Get order items to decrement stock
        const order = await this.orderRepository.findById(orderId);
        if (order && order.items) {
          for (const item of order.items) {
            await this.supplementRepository.decrementStock(item.supplementId, item.quantity);
          }
        }

        // Clear the user's cart
        await this.cartService.clearCart(userId);

        return res.status(200).json({
          status: true,
          message: 'Payment verified successfully',
          data: {
            orderId,
            orderNumber: metadata.orderNumber,
            amount: result.data.amount / 100,
            status: 'success',
            channel: result.data.channel
          }
        });
      } else {
        // Payment failed
        const metadata = result.data.metadata || {};
        const orderId = metadata.orderId;

        if (orderId) {
          await this.orderRepository.updateStatus(orderId, 'failed');
        }

        return res.status(400).json({
          status: false,
          message: 'Payment verification failed',
          data: {
            status: result.data.status,
            gateway_response: result.data.gateway_response
          }
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack verification failed.' });
    }
  }
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
