import { injectable, inject } from 'inversify';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalDTO } from '../DTOs/wallet.dto';
import { PrismaClient, Role, Wallet, Withdrawal } from '@prisma/client';

@injectable()
export class WalletService {
  constructor(
    @inject(WalletRepository) private walletRepository: WalletRepository,
    @inject(WithdrawalRepository) private withdrawalRepository: WithdrawalRepository
  ) {}

  async getWallet(userId: number): Promise<Wallet | null> {
    return this.walletRepository.findByUserId(userId);
  }

  async creditWallet(walletId: number, amount: number): Promise<Wallet> {
    return this.walletRepository.updateBalance(walletId, amount, true);
  }

  async debitWallet(walletId: number, amount: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }
    return this.walletRepository.updateBalance(walletId, amount, false);
  }
  async requestWithdrawal(
    userId: number,
    userRole: Role,
    walletId: number,
    data: WithdrawalDTO
  ): Promise<Withdrawal> {
    // Check monthly withdrawal limit
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    const monthlyWithdrawals = await this.withdrawalRepository.findUserWithdrawalsForMonth(
      userId,
      month,
      year
    );

    const withdrawalLimit = userRole === Role.pharmacy ? 3 : 2;
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

  async getWithdrawals(userId: number): Promise<Withdrawal[]> {
    return this.withdrawalRepository.findByUserId(userId);
  }

  async getWithdrawalById(id: number): Promise<Withdrawal | null> {
    return this.withdrawalRepository.findById(id);
  }
}
