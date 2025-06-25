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
exports.CartController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const cart_service_1 = require("../services/cart.service");
const response_utility_1 = require("../utilities/response.utility");
const inversify_2 = require("inversify");
const cart_dto_1 = require("../DTOs/cart.dto");
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
let CartController = class CartController extends base_controller_1.BaseController {
    constructor(container, cartService) {
        super(container);
        this.cartService = cartService;
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
    async getCart(req, res) {
        try {
            const userId = req.user.id;
            const cart = await this.cartService.getCart(userId);
            if (!cart) {
                return response_utility_1.ResponseUtil.error(res, 'Cart not found', 404);
            }
            return response_utility_1.ResponseUtil.success(res, { cart });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async addToCart(req, res) {
        try {
            const userId = req.user.id;
            const data = cart_dto_1.AddToCartSchema.parse(req.body);
            const cart = await this.cartService.addToCart(userId, data);
            return response_utility_1.ResponseUtil.success(res, { cart });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async updateCartItem(req, res) {
        try {
            const userId = req.user.id;
            const itemId = parseInt(req.params.id);
            const data = cart_dto_1.UpdateCartItemSchema.parse(req.body);
            const cart = await this.cartService.updateCartItem(userId, itemId, data);
            if (!cart) {
                return response_utility_1.ResponseUtil.error(res, 'Cart item not found', 404);
            }
            return response_utility_1.ResponseUtil.success(res, { cart });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async removeCartItem(req, res) {
        try {
            const userId = req.user.id;
            const itemId = parseInt(req.params.id);
            const cart = await this.cartService.removeCartItem(userId, itemId);
            if (!cart) {
                return response_utility_1.ResponseUtil.error(res, 'Cart item not found', 404);
            }
            return response_utility_1.ResponseUtil.success(res, { cart });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async clearCart(req, res) {
        try {
            const userId = req.user.id;
            const cart = await this.cartService.clearCart(userId);
            if (!cart) {
                return response_utility_1.ResponseUtil.error(res, 'Cart not found', 404);
            }
            return response_utility_1.ResponseUtil.success(res, { cart });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
        }
    }
};
exports.CartController = CartController;
exports.CartController = CartController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(cart_service_1.CartService)),
    __metadata("design:paramtypes", [inversify_2.Container,
        cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map