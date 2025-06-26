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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
    getCart(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.cartRepository.findByUserId(userId);
        });
    }
    addToCart(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield this.getOrCreateCart(userId);
            // Check if supplement exists in cart
            const existingItem = cart.items.find(item => item.supplementId === data.supplementId);
            if (existingItem) {
                // Update quantity if item exists
                yield this.cartRepository.updateItem(existingItem.id, existingItem.quantity + data.quantity);
            }
            else {
                // Add new item if it doesn't exist
                yield this.cartRepository.addItem(cart.id, data.supplementId, data.quantity);
            }
            return this.cartRepository.findById(cart.id);
        });
    }
    updateCartItem(userId, itemId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield this.cartRepository.findByUserId(userId);
            if (!cart) {
                throw new errors_1.AppError('Cart not found', 404);
            }
            const cartItem = cart.items.find(item => item.id === itemId);
            if (!cartItem) {
                throw new errors_1.AppError('Cart item not found', 404);
            }
            yield this.cartRepository.updateItem(itemId, data.quantity);
            return this.cartRepository.findById(cart.id);
        });
    }
    removeCartItem(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield this.cartRepository.findByUserId(userId);
            if (!cart) {
                throw new errors_1.AppError('Cart not found', 404);
            }
            const cartItem = cart.items.find(item => item.id === itemId);
            if (!cartItem) {
                throw new errors_1.AppError('Cart item not found', 404);
            }
            yield this.cartRepository.removeItem(itemId);
            return this.cartRepository.findById(cart.id);
        });
    }
    clearCart(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield this.cartRepository.findByUserId(userId);
            if (!cart) {
                throw new errors_1.AppError('Cart not found', 404);
            }
            yield this.cartRepository.clearCart(cart.id);
            return this.cartRepository.findById(cart.id);
        });
    }
    getOrCreateCart(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let cart = yield this.cartRepository.findByUserId(userId);
            if (!cart) {
                cart = yield this.cartRepository.create({
                    userId,
                    items: []
                });
            }
            return cart;
        });
    }
    getCartTotal(cart) {
        return __awaiter(this, void 0, void 0, function* () {
            let total = 0;
            for (const item of cart.items) {
                total += item.quantity * item.supplement.price;
            }
            return total;
        });
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
