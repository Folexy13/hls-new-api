import { inject, injectable } from 'inversify';
import bcrypt from 'bcrypt';
import { PrincipalRepository } from '../repositories/principal.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { QuizCodeRepository } from '../repositories/quizcode.repository';
import { CreateBenfekRecordDTO, CreateBenfekUserDTO, CreatePrincipalUserDTO, UpdatePrincipalUserDTO } from '../DTOs/principal.dto';

@injectable()
export class PrincipalService {
  constructor(
    @inject(PrincipalRepository) private principalRepository: PrincipalRepository,
    @inject(WalletRepository) private walletRepository: WalletRepository,
    @inject(WithdrawalRepository) private withdrawalRepository: WithdrawalRepository,
    @inject(QuizCodeRepository) private quizCodeRepository: QuizCodeRepository
  ) {}

  async createBenfekRecord(principalId: number, data: CreateBenfekRecordDTO) {
    return this.quizCodeRepository.create({
      ...data,
      createdBy: principalId,
    });
  }

  async getBenfeksByPrincipal(principalId: number, page: number, limit: number, name?: string) {
    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.max(1, Math.min(limit, 100));
    
    const { codes, total } = await this.quizCodeRepository.findBenfeksByCreator(principalId, name, skip, take);
    
    return { benfeks: codes, total };
  }

  async createPrincipal(data: CreatePrincipalUserDTO) {
    const existingUser = await this.principalRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.principalRepository.createPrincipal({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      profileImageUrl: data.profileImageUrl,
      profession: data.profession,
      currentPlaceOfWork: data.currentPlaceOfWork,
      licenseNumber: data.licenseNumber,
      yearsOfExperience: data.yearsOfExperience,
      preferredPaymentMethod: data.preferredPaymentMethod,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createBenfek(data: CreateBenfekUserDTO) {
    const existingUser = await this.principalRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.principalRepository.createBenfek({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getPrincipals(page: number, limit: number) {
    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.max(1, Math.min(limit, 100));
    const [principals, total] = await Promise.all([
      this.principalRepository.findAllPrincipals(skip, take),
      this.principalRepository.countPrincipals(),
    ]);

    const sanitized = principals.map(({ password, ...rest }) => rest);
    return { principals: sanitized, total };
  }

  async getPrincipalById(id: number) {
    const principal = await this.principalRepository.findPrincipalById(id);
    if (!principal) return null;
    const { password, ...rest } = principal;
    return rest;
  }

  async updatePrincipal(id: number, data: UpdatePrincipalUserDTO) {
    const principal = await this.principalRepository.findPrincipalById(id);
    if (!principal) {
      throw new Error('Principal not found');
    }

    const updateData: Partial<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
      profileImageUrl: string;
      profession: string;
      currentPlaceOfWork: string;
      licenseNumber: string;
      yearsOfExperience: string;
      preferredPaymentMethod: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }> = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      profileImageUrl: data.profileImageUrl,
      profession: data.profession,
      currentPlaceOfWork: data.currentPlaceOfWork,
      licenseNumber: data.licenseNumber,
      yearsOfExperience: data.yearsOfExperience,
      preferredPaymentMethod: data.preferredPaymentMethod,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.principalRepository.updatePrincipal(id, updateData);
    const { password, ...rest } = updated;
    return rest;
  }

  async deletePrincipal(id: number) {
    const principal = await this.principalRepository.findPrincipalById(id);
    if (!principal) {
      throw new Error('Principal not found');
    }
    const deleted = await this.principalRepository.deletePrincipal(id);
    const { password, ...rest } = deleted;
    return rest;
  }

  async getIncomeSummary(userId: number) {
    const wallet = await this.walletRepository.findByUserId(userId);
    const withdrawals = await this.withdrawalRepository.findByUserId(userId);

    const totals = withdrawals.reduce(
      (acc, w) => {
        acc.totalRequested += w.amount;
        if (w.status === 'completed') acc.totalCompleted += w.amount;
        if (w.status === 'pending') acc.totalPending += w.amount;
        return acc;
      },
      { totalRequested: 0, totalCompleted: 0, totalPending: 0 }
    );

    return {
      walletBalance: wallet?.balance ?? 0,
      withdrawals: {
        totalRequested: totals.totalRequested,
        totalCompleted: totals.totalCompleted,
        totalPending: totals.totalPending,
        count: withdrawals.length,
      },
    };
  }
}
