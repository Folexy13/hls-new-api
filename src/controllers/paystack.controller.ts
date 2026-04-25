import { inject, injectable } from 'inversify';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaystackService } from '../services/paystack.service';
import { CartService } from '../services/cart.service';
import { PaystackRepository } from '../repositories/paystack.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SupplementRepository } from '../repositories/supplement.repository';
import { AuthenticatedRequest } from '../types/auth.types';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import {
  PaystackInitializeSchema,
  PaystackInitializeDTO,
  PaystackPackCheckoutDTO,
  PaystackPackCheckoutSchema,
} from '../DTOs/paystack.dto';

@injectable()
export class PaystackController extends BaseController {
  constructor(
    container: Container,
    @inject('PrismaClient') private prisma: PrismaClient,
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
  initializeCheckout = async (req: AuthenticatedRequest, res: Response) => {
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
  checkoutFromCart = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      const { shippingAddress, notes, callbackUrl } = req.body;

      if (!userId || !email) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const cart = await this.cartService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty.' });
      }

      const total = await this.cartService.getCartTotal(cart);
      const order = await this.orderRepository.createOrderFromCart(
        userId,
        cart.items,
        total,
        shippingAddress
      );

      const metadata = {
        checkoutType: 'cart',
        orderId: order.id,
        orderNumber: (order as any).orderNumber,
        cartId: cart.id,
        userId,
        notes: notes || null,
      };

      const result = await PaystackService.initializeTransaction({ 
        email, 
        amount: Math.round(total * 100), // Convert to kobo
        metadata,
      });

      return res.status(200).json({
        ...result,
        orderId: order.id,
        orderNumber: (order as any).orderNumber,
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack checkout failed.' });
    }
  };

  checkoutPack = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const email = req.user.email;

      if (!userId || !email) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const data: PaystackPackCheckoutDTO = PaystackPackCheckoutSchema.parse(req.body);

      const quizCodes = await this.prisma.quizCode.findMany({
        where: { usedBy: userId, isUsed: true },
        select: { code: true },
      });

      if (!quizCodes.length) {
        return res.status(404).json({ message: 'No active benfek quiz code found for this account.' });
      }

      const pack = await this.prisma.researcherPack.findFirst({
        where: {
          packId: data.packId,
          quizCode: { in: quizCodes.map((item) => item.code) },
          status: 'dispatched',
        },
        include: {
          items: {
            include: {
              supplement: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      if (!pack || pack.items.length === 0) {
        return res.status(404).json({ message: 'Dispatched pack not found or has no payable supplements.' });
      }

      const total = pack.items.reduce(
        (sum, item) => sum + Number(item.supplement.price) * Number(item.quantity || 1),
        0
      );
      const totalQuantity = pack.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

      const order = await this.orderRepository.create({
        userId,
        total,
        totalQuantity,
        status: 'pending',
        shippingAddress: data.shippingAddress,
        notes: `Pack checkout for ${pack.packName}`,
      });

      await Promise.all(
        pack.items.map((item) =>
          this.orderRepository.addOrderItem({
            orderId: order.id,
            supplementId: item.supplementId,
            quantity: item.quantity,
            price: item.supplement.price,
            productName: item.supplement.name,
          })
        )
      );

      const metadata = {
        checkoutType: 'pack',
        packId: pack.packId,
        packName: pack.packName,
        quizCode: pack.quizCode,
        userId,
        orderId: order.id,
        orderNumber: (order as any).orderNumber,
        shippingAddress: data.shippingAddress,
      };

      const result = await PaystackService.initializeTransaction({
        email,
        amount: Math.round(total * 100),
        metadata,
        callbackUrl: data.callbackUrl,
      });

      return res.status(200).json({
        ...result,
        orderId: order.id,
        orderNumber: (order as any).orderNumber,
        packId: pack.packId,
        packName: pack.packName,
      });
    } catch (error: any) {
      console.error('Pack checkout error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || error?.message || 'Pack checkout failed.' });
    }
  };

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
  verifyCheckout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ message: 'Reference is required.' });
      }

      const existingPayment = await this.paystackRepository.getPaymentByTransaction(reference as string);
      if (existingPayment && existingPayment.status !== 'pending') {
        return res.status(200).json({
          message: 'Payment already processed.',
          data: { status: existingPayment.status, orderId: existingPayment.orderId },
        });
      }

      const result = await PaystackService.verifyTransaction(reference as string);
      const userId = req.user.id;
      const metadata = (result.data.metadata || {}) as Record<string, any>;
      const orderId = Number(metadata.orderId || existingPayment?.orderId || 0);

      if (!orderId) {
        return res.status(400).json({ message: 'Order ID not found in payment metadata.' });
      }

      if (result.data.status === 'success') {
        await this.orderRepository.updateStatus(orderId, 'paid');

        const storedMetadata = this.parseStoredMetadata(existingPayment?.metadata);
        const mergedMetadata = this.buildPaymentMetadata(
          {
            ...storedMetadata,
            ...metadata,
          },
          {
          verify: result.data,
          paystackReference: reference,
          paystackTransactionId: result.data.id ? String(result.data.id) : null,
          }
        );

        await this.paystackRepository.upsertPaymentByOrderId({
          userId,
          orderId,
          amount: result.data.amount / 100,
          method: 'paystack',
          status: 'success',
          paystackReference: reference as string,
          paystackTransactionId: result.data.id ? String(result.data.id) : undefined,
          paystackChannel: result.data.channel,
          currency: result.data.currency,
          paidAt: result.data.paid_at ? new Date(result.data.paid_at) : new Date(),
          metadata: mergedMetadata,
        });

        if (metadata.checkoutType !== 'pack') {
          const order = await this.orderRepository.findById(orderId);
          if (order && order.items) {
            for (const item of order.items) {
              await this.supplementRepository.decrementStock(item.supplementId, item.quantity);
            }
          }
          await this.cartService.clearCart(userId);
        }

        return res.status(200).json({
          status: true,
          message: 'Payment verified successfully',
          data: {
            orderId,
            orderNumber: metadata.orderNumber,
            packId: metadata.packId,
            packName: metadata.packName,
            amount: result.data.amount / 100,
            status: 'success',
            channel: result.data.channel,
            checkoutType: metadata.checkoutType || 'cart',
            packId: metadata.packId || null,
            packName: metadata.packName || null,
            paystackReference: reference,
            paystackTransactionId: result.data.id ? String(result.data.id) : null,
          },
        });
      }

      await this.orderRepository.updateStatus(orderId, 'failed');
      const storedMetadata = this.parseStoredMetadata(existingPayment?.metadata);
      await this.paystackRepository.upsertPaymentByOrderId({
        userId,
        orderId,
        amount: result.data.amount ? result.data.amount / 100 : 0,
        method: 'paystack',
        status: 'failed',
        paystackReference: reference as string,
        paystackTransactionId: result.data.id ? String(result.data.id) : undefined,
        paystackChannel: result.data.channel,
        currency: result.data.currency || 'NGN',
        metadata: this.buildPaymentMetadata(
          {
            ...storedMetadata,
            ...metadata,
          },
          {
            verify: result.data,
            paystackReference: reference,
            paystackTransactionId: result.data.id ? String(result.data.id) : null,
          }
        ),
      });

      return res.status(400).json({
        status: false,
        message: 'Payment verification failed',
        data: {
          status: result.data.status,
          gateway_response: result.data.gateway_response,
          checkoutType: metadata.checkoutType || 'cart',
        },
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || 'Paystack verification failed.' });
    }
  };
}
