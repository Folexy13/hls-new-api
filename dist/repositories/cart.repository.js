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
exports.CartRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let CartRepository = class CartRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(skip, take) {
        // Using raw queries to avoid Prisma model type issues
        const carts = await this.prisma.$queryRaw `
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      LIMIT ${take || 50} OFFSET ${skip || 0}
    `;
        const totalResult = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM Cart
    `;
        // Get items for each cart
        for (const cart of carts) {
            const items = await this.prisma.$queryRaw `
        SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
               s.id as 'supplement.id', s.name as 'supplement.name', 
               s.description as 'supplement.description', s.price as 'supplement.price',
               s.stock as 'supplement.stock', s.userId as 'supplement.userId',
               s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
        FROM CartItem ci
        JOIN Supplement s ON ci.supplementId = s.id
        WHERE ci.cartId = ${cart.id}
      `;
            // Transform the flat results into nested objects
            cart.items = items.map(item => ({
                id: item.id,
                cartId: item.cartId,
                supplementId: item.supplementId,
                quantity: item.quantity,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                supplement: {
                    id: item['supplement.id'],
                    name: item['supplement.name'],
                    description: item['supplement.description'],
                    price: item['supplement.price'],
                    stock: item['supplement.stock'],
                    userId: item['supplement.userId'],
                    createdAt: item['supplement.createdAt'],
                    updatedAt: item['supplement.updatedAt']
                }
            }));
        }
        return { items: carts, total: totalResult[0].count };
    }
    async findById(id) {
        const carts = await this.prisma.$queryRaw `
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      WHERE id = ${id}
    `;
        if (!carts.length)
            return null;
        const cart = carts[0];
        const items = await this.prisma.$queryRaw `
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${id}
    `;
        // Transform the flat results into nested objects
        cart.items = items.map(item => ({
            id: item.id,
            cartId: item.cartId,
            supplementId: item.supplementId,
            quantity: item.quantity,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            supplement: {
                id: item['supplement.id'],
                name: item['supplement.name'],
                description: item['supplement.description'],
                price: item['supplement.price'],
                stock: item['supplement.stock'],
                userId: item['supplement.userId'],
                createdAt: item['supplement.createdAt'],
                updatedAt: item['supplement.updatedAt']
            }
        }));
        return cart;
    }
    async findByUserId(userId) {
        const carts = await this.prisma.$queryRaw `
      SELECT id, userId, createdAt, updatedAt FROM Cart 
      WHERE userId = ${userId}
    `;
        if (!carts.length)
            return null;
        const cart = carts[0];
        const items = await this.prisma.$queryRaw `
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${cart.id}
    `;
        // Transform the flat results into nested objects
        cart.items = items.map(item => ({
            id: item.id,
            cartId: item.cartId,
            supplementId: item.supplementId,
            quantity: item.quantity,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            supplement: {
                id: item['supplement.id'],
                name: item['supplement.name'],
                description: item['supplement.description'],
                price: item['supplement.price'],
                stock: item['supplement.stock'],
                userId: item['supplement.userId'],
                createdAt: item['supplement.createdAt'],
                updatedAt: item['supplement.updatedAt']
            }
        }));
        return cart;
    }
    async create(data) {
        await this.prisma.$executeRaw `
      INSERT INTO Cart (userId, createdAt, updatedAt)
      VALUES (${data.userId}, NOW(), NOW())
    `;
        const carts = await this.prisma.$queryRaw `
      SELECT id FROM Cart WHERE userId = ${data.userId} ORDER BY id DESC LIMIT 1
    `;
        return this.findById(carts[0].id);
    }
    async update(id, data) {
        if (data.userId) {
            await this.prisma.$executeRaw `
        UPDATE Cart SET userId = ${data.userId}, updatedAt = NOW()
        WHERE id = ${id}
      `;
        }
        return this.findById(id);
    }
    async delete(id) {
        await this.prisma.$executeRaw `DELETE FROM CartItem WHERE cartId = ${id}`;
        await this.prisma.$executeRaw `DELETE FROM Cart WHERE id = ${id}`;
    }
    async addItem(cartId, supplementId, quantity) {
        await this.prisma.$executeRaw `
      INSERT INTO CartItem (cartId, supplementId, quantity, createdAt, updatedAt)
      VALUES (${cartId}, ${supplementId}, ${quantity}, NOW(), NOW())
    `;
        const items = await this.prisma.$queryRaw `
      SELECT ci.id FROM CartItem ci 
      WHERE ci.cartId = ${cartId} AND ci.supplementId = ${supplementId}
      ORDER BY ci.id DESC LIMIT 1
    `;
        if (!items.length) {
            throw new Error('Failed to create cart item');
        }
        const result = await this.prisma.$queryRaw `
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.id = ${items[0].id}
    `;
        if (!result.length) {
            throw new Error('Failed to fetch created cart item');
        }
        // Transform to the expected format
        return {
            id: result[0].id,
            cartId: result[0].cartId,
            supplementId: result[0].supplementId,
            quantity: result[0].quantity,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            supplement: {
                id: result[0]['supplement.id'],
                name: result[0]['supplement.name'],
                description: result[0]['supplement.description'],
                price: result[0]['supplement.price'],
                stock: result[0]['supplement.stock'],
                userId: result[0]['supplement.userId'],
                createdAt: result[0]['supplement.createdAt'],
                updatedAt: result[0]['supplement.updatedAt']
            }
        };
    }
    async updateItem(id, quantity) {
        await this.prisma.$executeRaw `
      UPDATE CartItem SET quantity = ${quantity}, updatedAt = NOW()
      WHERE id = ${id}
    `;
        const result = await this.prisma.$queryRaw `
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.id = ${id}
    `;
        if (!result.length) {
            throw new Error('Cart item not found');
        }
        // Transform to the expected format
        return {
            id: result[0].id,
            cartId: result[0].cartId,
            supplementId: result[0].supplementId,
            quantity: result[0].quantity,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            supplement: {
                id: result[0]['supplement.id'],
                name: result[0]['supplement.name'],
                description: result[0]['supplement.description'],
                price: result[0]['supplement.price'],
                stock: result[0]['supplement.stock'],
                userId: result[0]['supplement.userId'],
                createdAt: result[0]['supplement.createdAt'],
                updatedAt: result[0]['supplement.updatedAt']
            }
        };
    }
    async removeItem(id) {
        await this.prisma.$executeRaw `DELETE FROM CartItem WHERE id = ${id}`;
    }
    async clearCart(cartId) {
        await this.prisma.$executeRaw `DELETE FROM CartItem WHERE cartId = ${cartId}`;
    }
    async findCartItem(cartId, supplementId) {
        const result = await this.prisma.$queryRaw `
      SELECT ci.id, ci.cartId, ci.supplementId, ci.quantity, ci.createdAt, ci.updatedAt,
             s.id as 'supplement.id', s.name as 'supplement.name', 
             s.description as 'supplement.description', s.price as 'supplement.price',
             s.stock as 'supplement.stock', s.userId as 'supplement.userId',
             s.createdAt as 'supplement.createdAt', s.updatedAt as 'supplement.updatedAt'
      FROM CartItem ci
      JOIN Supplement s ON ci.supplementId = s.id
      WHERE ci.cartId = ${cartId} AND ci.supplementId = ${supplementId}
    `;
        if (!result.length) {
            return null;
        }
        // Transform to the expected format
        return {
            id: result[0].id,
            cartId: result[0].cartId,
            supplementId: result[0].supplementId,
            quantity: result[0].quantity,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            supplement: {
                id: result[0]['supplement.id'],
                name: result[0]['supplement.name'],
                description: result[0]['supplement.description'],
                price: result[0]['supplement.price'],
                stock: result[0]['supplement.stock'],
                userId: result[0]['supplement.userId'],
                createdAt: result[0]['supplement.createdAt'],
                updatedAt: result[0]['supplement.updatedAt']
            }
        };
    }
};
exports.CartRepository = CartRepository;
exports.CartRepository = CartRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], CartRepository);
//# sourceMappingURL=cart.repository.js.map