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
exports.WalletRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let WalletRepository = class WalletRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(skip, take) {
        return __awaiter(this, void 0, void 0, function* () {
            const [wallets, total] = yield Promise.all([
                this.prisma.wallet.findMany({
                    skip,
                    take,
                    include: { withdrawals: true },
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.wallet.count()
            ]);
            return { items: wallets, total };
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.wallet.findUnique({
                where: { id },
                include: { withdrawals: true }
            });
        });
    }
    findByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.wallet.findUnique({
                where: { userId },
                include: { withdrawals: true }
            });
        });
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.wallet.create({
                data,
                include: { withdrawals: true }
            });
        });
    }
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.wallet.update({
                where: { id },
                data,
                include: { withdrawals: true }
            });
        });
    }
    updateBalance(id, amount, isCredit) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.wallet.update({
                where: { id },
                data: {
                    balance: {
                        [isCredit ? 'increment' : 'decrement']: amount
                    }
                },
                include: { withdrawals: true }
            });
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.wallet.delete({
                where: { id }
            });
        });
    }
};
exports.WalletRepository = WalletRepository;
exports.WalletRepository = WalletRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], WalletRepository);
