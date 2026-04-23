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

  private buildPaymentMetadata(
    baseMetadata: Record<string, unknown>,
    extras: Record<string, unknown>
  ) {
    return JSON.stringify({
      ...baseMetadata,
      ...extras,
      updatedAt: new Date().toISOString(),
    });
  }

  private parseStoredMetadata(metadata?: string | null): Record<string, unknown> {
    if (!metadata) return {};
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async upsertPendingPayment(params: {
    userId: number;
    orderId: number;
    amount: number;
    reference: string;
    metadata: Record<string, unknown>;
    accessCode?: string;
    authorizationUrl?: string;
  }) {
    return this.paystackRepository.upsertPaymentByOrderId({
      userId: params.userId,
      orderId: params.orderId,
      amount: params.amount,
      method: 'paystack',
      status: 'pending',
      paystackReference: params.reference,
      metadata: this.buildPaymentMetadata(params.metadata, {
        initialize: {
          accessCode: params.accessCode || null,
          authorizationUrl: params.authorizationUrl || null,
          reference: params.reference,
        },
      }),
    });
  }

  private async createOrReusePackOrder(params: {
    userId: number;
    researcherPackId: number;
    packId: string;
    packName: string;
    quizCode: string;
    shippingAddress?: string | null;
    items: Array<{
      supplementId: number;
      quantity: number;
      price: number;
      productName: string;
    }>;
    total: number;
    totalQuantity: number;
  }) {
    const packOrderMarker = `PACK_CHECKOUT:${params.researcherPackId}:${params.quizCode}:${params.packId}`;

    return this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: {
          userId: params.userId,
          notes: packOrderMarker,
          status: { in: ['pending', 'failed'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const order = existingOrder
        ? await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              total: params.total,
              totalQuantity: params.totalQuantity,
              status: 'pending',
              shippingAddress: params.shippingAddress || null,
              notes: packOrderMarker,
            },
          })
        : await tx.order.create({
            data: {
              userId: params.userId,
              total: params.total,
              totalQuantity: params.totalQuantity,
              status: 'pending',
              shippingAddress: params.shippingAddress || null,
              notes: packOrderMarker,
            },
          });

      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      await tx.orderItem.createMany({
        data: params.items.map((item) => ({
          orderId: order.id,
          supplementId: item.supplementId,
          quantity: item.quantity,
          price: item.price,
          productName: item.productName,
        })),
      });

      return order;
    });
  }

  initializeCheckout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data: PaystackInitializeDTO = PaystackInitializeSchema.parse(req.body);
      const result = await PaystackService.initializeTransaction(data);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Invalid payload.' });
    }
  };

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
        amount: Math.round(total * 100),
        metadata,
        callbackUrl,
      });

      await this.upsertPendingPayment({
        userId,
        orderId: order.id,
        amount: total,
        reference: result?.data?.reference,
        accessCode: result?.data?.access_code,
        authorizationUrl: result?.data?.authorization_url,
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
      const { packId, callbackUrl } = PaystackPackCheckoutSchema.parse(req.body);

      if (!userId || !email) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const quizCodes = await this.prisma.quizCode.findMany({
        where: { usedBy: userId, isUsed: true },
        select: { code: true },
      });

      const pack = await this.prisma.researcherPack.findFirst({
        where: {
          packId,
          quizCode: { in: quizCodes.map((entry) => entry.code) },
          status: 'dispatched',
        },
        include: {
          items: {
            include: {
              supplement: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!pack || !pack.items.length) {
        return res.status(404).json({ message: 'Dispatched pack not found.' });
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          deliveryAddress: true,
          dropOffAddress: true,
        } as any,
      });

      const normalizedItems = pack.items.map((item) => ({
        supplementId: item.supplementId,
        quantity: item.quantity,
        price: Number(item.supplement.price || 0),
        productName: item.supplement.name,
      }));

      const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

      const order = await this.createOrReusePackOrder({
        userId,
        researcherPackId: pack.id,
        packId: pack.packId,
        packName: pack.packName,
        quizCode: pack.quizCode,
        shippingAddress: (user as any)?.deliveryAddress || (user as any)?.dropOffAddress || null,
        items: normalizedItems,
        total,
        totalQuantity,
      });

      const metadata = {
        checkoutType: 'pack',
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId,
        researcherPackDbId: pack.id,
        packId: pack.packId,
        packName: pack.packName,
        quizCode: pack.quizCode,
      };

      const result = await PaystackService.initializeTransaction({
        email,
        amount: Math.round(total * 100),
        metadata,
        callbackUrl,
      });

      await this.upsertPendingPayment({
        userId,
        orderId: order.id,
        amount: total,
        reference: result?.data?.reference,
        accessCode: result?.data?.access_code,
        authorizationUrl: result?.data?.authorization_url,
        metadata,
      });

      return res.status(200).json({
        ...result,
        orderId: order.id,
        orderNumber: order.orderNumber,
        pack: {
          id: pack.id,
          packId: pack.packId,
          packName: pack.packName,
          total,
          totalQuantity,
        },
      });
    } catch (error: any) {
      console.error('Pack checkout error:', error);
      return res.status(500).json({ message: error?.response?.data?.message || error?.message || 'Pack payment initialization failed.' });
    }
  };

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
