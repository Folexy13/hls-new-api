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
import { computePrincipalCredit } from '../utilities/principal-credit.utility';
 
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

  private async recordPrincipalCreditForPack(params: {
    orderId: number;
    paymentId: number;
    paymentReference: string;
    packId: string;
    packName: string;
    quizCode: string;
  }) {
    const quizCodeRecord = await this.prisma.quizCode.findUnique({
      where: { code: params.quizCode },
      select: { createdBy: true, benfekName: true },
    });

    if (!quizCodeRecord?.createdBy) {
      return;
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: quizCodeRecord.createdBy },
      select: { id: true, balance: true },
    });

    if (!wallet?.id) {
      return;
    }

    const packRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT rpi.id,
              rpi.quantity,
              rpi.selectedWholesalerName,
              rpi.selectedWholesalerPrice,
              rpi.dispatchedWithoutWholesaler,
              rpi.effectiveMarkupFactor,
              s.name AS supplementName,
              s.price AS sellingPrice
       FROM ResearcherPackItem rpi
       INNER JOIN ResearcherPack rp ON rp.id = rpi.packId
       INNER JOIN Supplement s ON s.id = rpi.supplementId
       WHERE rp.packId = ? AND rp.quizCode = ?
       ORDER BY rpi.id ASC`,
      params.packId,
      params.quizCode
    );

    if (!Array.isArray(packRows) || packRows.length === 0) {
      return;
    }

    const supplementSummaries = packRows.map((row) => {
      const qty = Number(row.quantity || 1);
      const sellingPrice = Number(row.sellingPrice || 0);
      const amount = sellingPrice * qty;
      const hasSelectedWholesaler =
        row.selectedWholesalerName && Number.isFinite(Number(row.selectedWholesalerPrice)) && Number(row.selectedWholesalerPrice) > 0;
      const markupFactor = Number(row.effectiveMarkupFactor || 1.3) || 1.3;
      const costPrice = hasSelectedWholesaler
        ? Number(row.selectedWholesalerPrice || 0) * qty
        : amount / markupFactor;
      const credit = computePrincipalCredit(amount, costPrice);

      return {
        line: `${String(row.supplementName || 'Supplement')} x${qty}`,
        amount,
        costPrice,
        markupFactor,
        selectedWholesalerName: row.selectedWholesalerName || null,
        dispatchedWithoutWholesaler: Boolean(row.dispatchedWithoutWholesaler),
        ...credit,
      };
    });

    const aggregate = supplementSummaries.reduce(
      (acc, item) => {
        acc.amount += item.amount;
        acc.costPrice += item.costPrice;
        acc.tax += item.tax;
        acc.serviceCharge += item.serviceCharge;
        acc.hlsCommission += item.hlsCommission;
        acc.principalShare += item.principalShare;
        return acc;
      },
      { amount: 0, costPrice: 0, tax: 0, serviceCharge: 0, hlsCommission: 0, principalShare: 0 }
    );

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: aggregate.principalShare } },
    });

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO PrincipalCredit
      (principalId, walletId, quizCode, packId, packName, benfekName, orderId, paymentId, paymentReference, supplement, amount, costPrice, markupFactor, taxAmount, serviceChargeAmount, hlsCommissionAmount, principalShare, status, details, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unresolved', ?, NOW(), NOW())`,
      quizCodeRecord.createdBy,
      wallet.id,
      params.quizCode,
      params.packId,
      params.packName,
      quizCodeRecord.benfekName,
      params.orderId,
      params.paymentId,
      params.paymentReference,
      supplementSummaries.map((item) => item.line).join(', '),
      aggregate.amount,
      aggregate.costPrice,
      1.3,
      aggregate.tax,
      aggregate.serviceCharge,
      aggregate.hlsCommission,
      aggregate.principalShare,
      JSON.stringify({
        packName: params.packName,
        packId: params.packId,
        benfekName: quizCodeRecord.benfekName,
        items: supplementSummaries,
      })
    );
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
        metadata,
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

      // Check if payment already processed
      const existingPayment = await this.paystackRepository.getPaymentByTransaction(reference as string);
      if (existingPayment) {
        return res.status(200).json({ 
          message: 'Payment already processed.',
          data: { status: existingPayment.status }
        });
      }

      const result = await PaystackService.verifyTransaction(reference as string);
      const userId = req.user.id;

      if (result.data.status === 'success') {
        const metadata = result.data.metadata || {};
        const rawOrderId = metadata.orderId;
        const orderId =
          typeof rawOrderId === 'number' ? rawOrderId : Number.parseInt(String(rawOrderId), 10);

        if (!orderId) {
          return res.status(400).json({ message: 'Order ID not found in payment metadata.' });
        }

        // Update order status to paid
        await this.orderRepository.updateStatus(orderId, 'paid');

        // Create payment record
        const payment = await this.paystackRepository.savePayment({
          userId,
          orderId,
          amount: result.data.amount / 100, // Convert from kobo to naira
          method: 'paystack',
          status: 'success',
          paystackReference: reference as string,
          paystackTransactionId: result.data.id ? String(result.data.id) : undefined,
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

        // Pack checkout can succeed without the user having an active cart.
        // Clearing the cart is best-effort and should not fail verification.
        try {
          await this.cartService.clearCart(userId);
        } catch (cartError: any) {
          if (cartError?.message !== 'Cart not found') {
            throw cartError;
          }
        }

        if (metadata.checkoutType === 'pack' && metadata.packId && metadata.packName && metadata.quizCode) {
          await this.recordPrincipalCreditForPack({
            orderId,
            paymentId: payment.id,
            paymentReference: reference as string,
            packId: String(metadata.packId),
            packName: String(metadata.packName),
            quizCode: String(metadata.quizCode),
          });
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
            channel: result.data.channel
          }
        });
      } else {
        // Payment failed
        const metadata = result.data.metadata || {};
        const rawOrderId = metadata.orderId;
        const orderId =
          typeof rawOrderId === 'number' ? rawOrderId : Number.parseInt(String(rawOrderId), 10);

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
