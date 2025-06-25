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
exports.WalletService = void 0;
const inversify_1 = require("inversify");
const wallet_repository_1 = require("../repositories/wallet.repository");
const withdrawal_repository_1 = require("../repositories/withdrawal.repository");
let WalletService = class WalletService {
    constructor(walletRepository, withdrawalRepository) {
        this.walletRepository = walletRepository;
        this.withdrawalRepository = withdrawalRepository;
    }
    async getWallet(userId) {
        const wallet = await this.walletRepository.findByUserId(userId);
        if (!wallet)
            return null;
        // Cast the wallet to match our interface 
        // Since the PrismaClient type definitions are missing in our build
        return wallet;
    }
    async creditWallet(walletId, amount) {
        const wallet = await this.walletRepository.updateBalance(walletId, amount, true);
        // Cast the wallet to match our interface
        return wallet;
    }
    async debitWallet(walletId, amount) {
        const existingWallet = await this.walletRepository.findById(walletId);
        if (!existingWallet) {
            throw new Error('Wallet not found');
        }
        if (existingWallet.balance < amount) {
            throw new Error('Insufficient balance');
        }
        const updatedWallet = await this.walletRepository.updateBalance(walletId, amount, false);
        // Cast the wallet to match our interface
        return updatedWallet;
    }
    async requestWithdrawal(userId, userRole, walletId, data) {
        // Check monthly withdrawal limit
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const monthlyWithdrawals = await this.withdrawalRepository.findUserWithdrawalsForMonth(userId, month, year);
        const withdrawalLimit = userRole === 'pharmacy' ? 3 : 2;
        if (monthlyWithdrawals.length >= withdrawalLimit) {
            throw new Error(`Monthly withdrawal limit of ${withdrawalLimit} reached for ${userRole} role`);
        }
        // Check wallet balance
        const wallet = await this.walletRepository.findById(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        if (wallet.balance < data.amount) {
            throw new Error('Insufficient balance');
        }
        // Create withdrawal request
        const withdrawal = await this.withdrawalRepository.create({
            ...data,
            userId,
            walletId,
            status: 'pending',
            month,
            year
        });
        // Debit wallet
        await this.debitWallet(walletId, data.amount);
        return withdrawal;
    }
    async getWithdrawals(userId) {
        return this.withdrawalRepository.findByUserId(userId);
    }
    async getWithdrawalById(id) {
        return this.withdrawalRepository.findById(id);
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(wallet_repository_1.WalletRepository)),
    __param(1, (0, inversify_1.inject)(withdrawal_repository_1.WithdrawalRepository)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        withdrawal_repository_1.WithdrawalRepository])
], WalletService);
//# sourceMappingURL=wallet.service.js.map