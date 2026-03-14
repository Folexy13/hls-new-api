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
exports.CartService = void 0;
const inversify_1 = require("inversify");
const cart_repository_1 = require("../repositories/cart.repository");
const client_1 = require("@prisma/client");
const errors_1 = require("../utilities/errors");
let CartService = class CartService {
    constructor(cartRepository, prisma) {
        this.cartRepository = cartRepository;
        this.prisma = prisma;
    }
    async getCart(userId) {
        return this.cartRepository.findByUserId(userId);
    }
    async addToCart(userId, data) {
        const cart = await this.getOrCreateCart(userId);
        // Check if supplement exists in cart
        const existingItem = cart.items.find(item => item.supplementId === data.supplementId);
        if (existingItem) {
            // Update quantity if item exists
            await this.cartRepository.updateItem(existingItem.id, existingItem.quantity + data.quantity);
        }
        else {
            // Add new item if it doesn't exist
            await this.cartRepository.addItem(cart.id, data.supplementId, data.quantity);
        }
        return this.cartRepository.findById(cart.id);
    }
    async updateCartItem(userId, itemId, data) {
        const cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            throw new errors_1.AppError('Cart not found', 404);
        }
        const cartItem = cart.items.find(item => item.id === itemId);
        if (!cartItem) {
            throw new errors_1.AppError('Cart item not found', 404);
        }
        await this.cartRepository.updateItem(itemId, data.quantity);
        return this.cartRepository.findById(cart.id);
    }
    async removeCartItem(userId, itemId) {
        const cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            throw new errors_1.AppError('Cart not found', 404);
        }
        const cartItem = cart.items.find(item => item.id === itemId);
        if (!cartItem) {
            throw new errors_1.AppError('Cart item not found', 404);
        }
        await this.cartRepository.removeItem(itemId);
        return this.cartRepository.findById(cart.id);
    }
    async clearCart(userId) {
        const cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            throw new errors_1.AppError('Cart not found', 404);
        }
        await this.cartRepository.clearCart(cart.id);
        return this.cartRepository.findById(cart.id);
    }
    async getOrCreateCart(userId) {
        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepository.create({
                userId,
                items: []
            });
        }
        return cart;
    }
    async getCartTotal(cart) {
        let total = 0;
        for (const item of cart.items) {
            total += item.quantity * item.supplement.price;
        }
        return total;
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(cart_repository_1.CartRepository)),
    __param(1, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [cart_repository_1.CartRepository,
        client_1.PrismaClient])
], CartService);
//# sourceMappingURL=cart.service.js.map