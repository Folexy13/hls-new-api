import { injectable, inject } from 'inversify';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalDTO } from '../DTOs/wallet.dto';
import { Role } from '../types/auth.types';
import { PaystackService } from './paystack.service';

// Define wallet and withdrawal types
interface Wallet {
  id: number;
  userId: number;
  balance: number;
  withdrawals: Withdrawal[];
  createdAt: Date;
  updatedAt: Date;
}

interface Withdrawal {
  id: number;
  userId: number;
  walletId: number;
  amount: number;
  status: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferReference: string | null;
  transferRecipientCode: string | null;
  month: number;
  year: number;
  wallet?: Wallet;
  user?: any;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class WalletService {
  constructor(
    @inject(WalletRepository) private walletRepository: WalletRepository,
    @inject(WithdrawalRepository) private withdrawalRepository: WithdrawalRepository
  ) {}  async getWallet(userId: number): Promise<Wallet | null> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) return null;

    // Cast the wallet to match our interface 
    // Since the PrismaClient type definitions are missing in our build
    return wallet as unknown as Wallet;
  }  async creditWallet(walletId: number, amount: number): Promise<Wallet> {
    const wallet = await this.walletRepository.updateBalance(walletId, amount, true);
    
    // Cast the wallet to match our interface
    return wallet as unknown as Wallet;
  }
  async debitWallet(walletId: number, amount: number): Promise<Wallet> {
    const existingWallet = await this.walletRepository.findById(walletId);
    if (!existingWallet) {
      throw new Error('Wallet not found');
    }
    if (existingWallet.balance < amount) {
      throw new Error('Insufficient balance');
    }
    const updatedWallet = await this.walletRepository.updateBalance(walletId, amount, false);
      // Cast the wallet to match our interface
    return updatedWallet as unknown as Wallet;
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

    const withdrawalLimit = userRole !== 'principal' ? 3 : 2;
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
      transferReference: null,
      transferRecipientCode: null,
      month,
      year
    });

    // Debit wallet
    await this.debitWallet(walletId, data.amount);

    try {
      const bankCode = await PaystackService.resolveBankCode(data.bankName);
      const recipient = await PaystackService.createTransferRecipient({
        name: data.accountName,
        accountNumber: data.accountNumber,
        bankCode,
      });

      const recipientCode = recipient?.data?.recipient_code;
      if (!recipientCode) {
        throw new Error('Paystack recipient code was not returned');
      }

      const transfer = await PaystackService.initiateTransfer({
        amount: data.amount,
        recipient: recipientCode,
        reason: `Principal withdrawal for user ${userId}`,
      });

      const transferReference = transfer?.data?.reference || transfer?.data?.transfer_code || null;

      return await this.withdrawalRepository.update(withdrawal.id, {
        status: 'processing' as any,
        transferReference: transferReference || null,
        transferRecipientCode: recipientCode,
      } as any);
    } catch (error) {
      await this.creditWallet(walletId, data.amount);
      await this.withdrawalRepository.update(withdrawal.id, {
        status: 'failed' as any,
      } as any);
      throw error;
    }

    return withdrawal;
  }

  async getWithdrawals(userId: number): Promise<Withdrawal[]> {
    return this.withdrawalRepository.findByUserId(userId);
  }

  async getWithdrawalById(id: number): Promise<Withdrawal | null> {
    return this.withdrawalRepository.findById(id);
  }
}
