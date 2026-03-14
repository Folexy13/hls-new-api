"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackController = void 0;
const inversify_1 = require("inversify");
const paystack_service_1 = require("../services/paystack.service");
const cart_service_1 = require("../services/cart.service");
const paystack_repository_1 = require("../repositories/paystack.repository");
const order_repository_1 = require("../repositories/order.repository");
const supplement_repository_1 = require("../repositories/supplement.repository");
const base_controller_1 = require("./base.controller");
const inversify_2 = require("inversify");
const paystack_dto_1 = require("../DTOs/paystack.dto");
let PaystackController = class PaystackController extends base_controller_1.BaseController {
    constructor(container, cartService, paystackRepository, orderRepository, supplementRepository) {
        super(container);
        this.cartService = cartService;
        this.paystackRepository = paystackRepository;
        this.orderRepository = orderRepository;
        this.supplementRepository = supplementRepository;
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
    async initializeCheckout(req, res) {
        try {
            const data = paystack_dto_1.PaystackInitializeSchema.parse(req.body);
            const result = await paystack_service_1.PaystackService.initializeTransaction(data);
            return res.status(200).json(result);
        }
        catch (error) {
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
    async checkoutFromCart(req, res) {
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
            const order = await this.orderRepository.createOrderFromCart(userId, cart.items, total, shippingAddress);
            const metadata = {
                orderId: order.id,
                orderNumber: order.orderNumber,
                cartId: cart.id,
                userId,
                notes
            };
            const result = await paystack_service_1.PaystackService.initializeTransaction({
                email,
                amount: Math.round(total * 100), // Convert to kobo
                metadata
            });
            return res.status(200).json({
                ...result,
                orderId: order.id,
                orderNumber: order.orderNumber
            });
        }
        catch (error) {
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
    async verifyCheckout(req, res) {
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
            const result = await paystack_service_1.PaystackService.verifyTransaction(reference);
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
            }
            else {
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
        }
        catch (error) {
            console.error('Verification error:', error);
            return res.status(500).json({ message: error?.response?.data?.message || 'Paystack verification failed.' });
        }
    }
};
exports.PaystackController = PaystackController;
exports.PaystackController = PaystackController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(cart_service_1.CartService)),
    __param(2, (0, inversify_1.inject)(paystack_repository_1.PaystackRepository)),
    __param(3, (0, inversify_1.inject)(order_repository_1.OrderRepository)),
    __param(4, (0, inversify_1.inject)(supplement_repository_1.SupplementRepository)),
    __metadata("design:paramtypes", [inversify_2.Container,
        cart_service_1.CartService,
        paystack_repository_1.PaystackRepository,
        order_repository_1.OrderRepository,
        supplement_repository_1.SupplementRepository])
], PaystackController);
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
//# sourceMappingURL=paystack.controller.js.map