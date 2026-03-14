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
exports.OrderRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let OrderRepository = class OrderRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.order.create({
            data: {
                userId: data.userId,
                total: data.total,
                totalQuantity: data.totalQuantity || 0,
                status: data.status || 'pending',
                shippingAddress: data.shippingAddress,
                notes: data.notes,
            },
        });
    }
    async findById(id) {
        return this.prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        supplement: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async findByOrderNumber(orderNumber) {
        return this.prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: {
                    include: {
                        supplement: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async findByUserId(userId, skip, take) {
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { userId },
                include: {
                    items: {
                        include: {
                            supplement: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    price: true,
                                    imageUrl: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: skip || 0,
                take: take || 10,
            }),
            this.prisma.order.count({ where: { userId } }),
        ]);
        return { orders: orders, total };
    }
    async updateStatus(id, status) {
        return this.prisma.order.update({
            where: { id },
            data: { status },
        });
    }
    async addOrderItem(data) {
        return this.prisma.orderItem.create({
            data: {
                orderId: data.orderId,
                supplementId: data.supplementId,
                quantity: data.quantity,
                price: data.price,
                productName: data.productName,
            },
        });
    }
    async createOrderFromCart(userId, cartItems, total, shippingAddress) {
        // Calculate total quantity from all cart items
        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        return this.prisma.$transaction(async (tx) => {
            // Create the order with total and totalQuantity
            const order = await tx.order.create({
                data: {
                    userId,
                    total,
                    totalQuantity,
                    status: 'pending',
                    shippingAddress,
                },
            });
            // Create order items
            await tx.orderItem.createMany({
                data: cartItems.map((item) => ({
                    orderId: order.id,
                    supplementId: item.supplementId,
                    quantity: item.quantity,
                    price: item.supplement.price,
                    productName: item.supplement.name,
                })),
            });
            return order;
        });
    }
};
exports.OrderRepository = OrderRepository;
exports.OrderRepository = OrderRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], OrderRepository);
//# sourceMappingURL=order.repository.js.map