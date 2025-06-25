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
exports.SupplementRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let SupplementRepository = class SupplementRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(skip, take) {
        // Using raw queries to avoid Prisma model type issues
        const supplements = await this.prisma.$queryRaw `
      SELECT s.id, s.name, s.description, s.price, s.stock, s.userId, 
             s.createdAt, s.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Supplement s
      JOIN User u ON s.userId = u.id
      ORDER BY s.createdAt DESC
      LIMIT ${take || 50} OFFSET ${skip || 0}
    `;
        const totalResult = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM Supplement
    `;
        // Transform the flat results into nested objects
        const transformedSupplements = supplements.map(supplement => ({
            id: supplement.id,
            name: supplement.name,
            description: supplement.description,
            price: supplement.price,
            stock: supplement.stock,
            userId: supplement.userId,
            createdAt: supplement.createdAt,
            updatedAt: supplement.updatedAt,
            user: {
                id: supplement['user.id'],
                firstName: supplement['user.firstName'],
                lastName: supplement['user.lastName'],
                email: supplement['user.email']
            }
        }));
        return {
            items: transformedSupplements,
            total: totalResult[0].count
        };
    }
    async findById(id) {
        return this.prisma.supplement.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
    }
    async findByUserId(userId) {
        return this.prisma.supplement.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    async create(data) {
        const { user, ...supplementData } = data;
        return this.prisma.supplement.create({
            data: supplementData,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
    }
    async update(id, data) {
        const { id: dataId, user, ...updateData } = data;
        return this.prisma.supplement.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
    }
    async delete(id) {
        await this.prisma.supplement.delete({
            where: { id }
        });
    }
    async search(query) {
        return this.prisma.supplement.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { description: { contains: query } }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    async updateStock(id, quantity) {
        return this.prisma.supplement.update({
            where: { id },
            data: {
                stock: {
                    decrement: quantity
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
    }
    async isInCart(id) {
        const cartItems = await this.prisma.cartItem.findMany({
            where: { supplementId: id }
        });
        return cartItems.length > 0;
    }
};
exports.SupplementRepository = SupplementRepository;
exports.SupplementRepository = SupplementRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], SupplementRepository);
//# sourceMappingURL=supplement.repository.js.map