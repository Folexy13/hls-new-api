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
exports.PaystackRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let PaystackRepository = class PaystackRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async savePayment(data) {
        return this.prisma.payment.create({
            data: {
                userId: data.userId,
                orderId: data.orderId,
                amount: data.amount,
                method: data.method,
                status: data.status,
                paystackReference: data.paystackReference,
                paystackChannel: data.paystackChannel,
                currency: data.currency || 'NGN',
                paidAt: data.paidAt,
                metadata: data.metadata,
            },
        });
    }
    async getPaymentByTransaction(transaction) {
        return this.prisma.payment.findFirst({
            where: { paystackReference: transaction }
        });
    }
    async getPaymentByOrderId(orderId) {
        return this.prisma.payment.findUnique({
            where: { orderId },
        });
    }
    async updatePaymentStatus(id, status) {
        return this.prisma.payment.update({
            where: { id },
            data: { status },
        });
    }
    async getPaymentsByUserId(userId, skip, take) {
        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: skip || 0,
                take: take || 10,
            }),
            this.prisma.payment.count({ where: { userId } }),
        ]);
        return { payments, total };
    }
};
exports.PaystackRepository = PaystackRepository;
exports.PaystackRepository = PaystackRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], PaystackRepository);
//# sourceMappingURL=paystack.repository.js.map