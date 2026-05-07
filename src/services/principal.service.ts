import { inject, injectable } from 'inversify';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrincipalRepository } from '../repositories/principal.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { QuizCodeRepository } from '../repositories/quizcode.repository';
import { CreateBenfekRecordDTO, CreateBenfekUserDTO, CreatePrincipalUserDTO, UpdatePrincipalUserDTO } from '../DTOs/principal.dto';

@injectable()
export class PrincipalService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
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
    const unresolvedCredits = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, packId, packName, benfekName, supplement, amount, costPrice, markupFactor,
              taxAmount, serviceChargeAmount, hlsCommissionAmount, principalShare,
              createdAt, status
       FROM PrincipalCredit
       WHERE principalId = ? AND status = 'unresolved'
       ORDER BY createdAt DESC`,
      userId
    ).catch(() => []);
    const unresolvedPrincipalShare = Array.isArray(unresolvedCredits)
      ? unresolvedCredits.reduce((sum: number, credit: any) => sum + Number(credit.principalShare || 0), 0)
      : 0;
    const walletBalance = Number(wallet?.balance ?? 0);
    const withdrawableBalance = Math.max(0, walletBalance - unresolvedPrincipalShare);

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
      walletBalance,
      withdrawableBalance,
      unresolvedCredits: Array.isArray(unresolvedCredits)
        ? unresolvedCredits.map((credit: any) => ({
            id: Number(credit.id),
            packId: String(credit.packId || ''),
            packName: String(credit.packName || ''),
            benfekName: String(credit.benfekName || ''),
            supplement: String(credit.supplement || ''),
            amount: Number(credit.amount || 0),
            costPrice: Number(credit.costPrice || 0),
            markupFactor: Number(credit.markupFactor || 1.3),
            taxAmount: Number(credit.taxAmount || 0),
            serviceChargeAmount: Number(credit.serviceChargeAmount || 0),
            hlsCommissionAmount: Number(credit.hlsCommissionAmount || 0),
            principalShare: Number(credit.principalShare || 0),
            date: credit.createdAt ? new Date(credit.createdAt).toLocaleDateString() : 'Recently',
            status: String(credit.status || 'unresolved'),
          }))
        : [],
      withdrawals: {
        totalRequested: totals.totalRequested,
        totalCompleted: totals.totalCompleted,
        totalPending: totals.totalPending,
        count: withdrawals.length,
      },
    };
  }

  async getNotificationSummary(userId: number) {
    const staleCodeDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      principal,
      unreadInboxCount,
      recentCompletedRegistrationCount,
      quizCompletedAccountPendingCount,
      staleUnusedCodeCount,
      pendingWithdrawalCount,
      failedWithdrawalCount,
      packReadyCount,
      unresolvedCredits,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          profession: true,
          currentPlaceOfWork: true,
          licenseNumber: true,
          yearsOfExperience: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          preferredPaymentMethod: true,
        },
      }),
      this.prisma.inbox.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      this.prisma.quizCode.count({
        where: {
          createdBy: userId,
          isUsed: true,
          usedBy: { not: null },
          usedAt: { gte: recentDate },
        },
      }),
      this.prisma.quizCode.count({
        where: {
          createdBy: userId,
          isUsed: true,
          usedBy: null,
        },
      }),
      this.prisma.quizCode.count({
        where: {
          createdBy: userId,
          isUsed: false,
          createdAt: { lte: staleCodeDate },
        },
      }),
      this.prisma.withdrawal.count({
        where: {
          userId,
          status: { in: ['pending', 'processing'] },
        },
      }),
      this.prisma.withdrawal.count({
        where: {
          userId,
          status: 'failed',
        },
      }),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT rp.id
         FROM ResearcherPack rp
         INNER JOIN QuizCode qc ON qc.code = rp.quizCode
         WHERE qc.createdBy = ? AND rp.status = 'dispatched'`,
        userId
      ).then((rows) => Array.isArray(rows) ? rows.length : 0).catch(() => 0),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, packName, benfekName, amount, principalShare, createdAt
         FROM PrincipalCredit
         WHERE principalId = ? AND status = 'unresolved'
         ORDER BY createdAt DESC`,
        userId
      ).catch(() => []),
    ]);

    const missingProfileFields = [
      ['Profession', principal?.profession],
      ['Current place of work', principal?.currentPlaceOfWork],
      ['License number', principal?.licenseNumber],
      ['Years of experience', principal?.yearsOfExperience],
      ['Preferred payment method', principal?.preferredPaymentMethod],
      ['Bank name', principal?.bankName],
      ['Account number', principal?.accountNumber],
      ['Account name', principal?.accountName],
    ]
      .filter(([, value]) => !String(value || '').trim())
      .map(([label]) => label);

    const unresolvedCreditCount = Array.isArray(unresolvedCredits) ? unresolvedCredits.length : 0;
    const unresolvedCreditAmount = Array.isArray(unresolvedCredits)
      ? unresolvedCredits.reduce((sum, credit) => sum + Number(credit.principalShare || 0), 0)
      : 0;

    const detectedItems = [
      ...(pendingWithdrawalCount > 0
        ? [{
            sourceKey: 'withdrawal_pending',
            type: 'withdrawal_pending',
            title: 'Withdrawal in progress',
            message: `${pendingWithdrawalCount} withdrawal request${pendingWithdrawalCount === 1 ? ' is' : 's are'} still pending or processing.`,
            count: pendingWithdrawalCount,
            href: '/principal/withdraw?tab=withdraw',
          }]
        : []),
      ...(failedWithdrawalCount > 0
        ? [{
            sourceKey: 'withdrawal_failed',
            type: 'withdrawal_failed',
            title: 'Withdrawal needs attention',
            message: `${failedWithdrawalCount} withdrawal request${failedWithdrawalCount === 1 ? ' has' : 's have'} failed. Check payment details or try again.`,
            count: failedWithdrawalCount,
            href: '/principal/withdraw?tab=withdraw',
          }]
        : []),
      ...(unresolvedCreditCount > 0
        ? [{
            sourceKey: 'credit_resolution',
            type: 'credit_resolution',
            title: 'Resolve principal credits',
            message: `${unresolvedCreditCount} wallet credit${unresolvedCreditCount === 1 ? ' needs' : 's need'} resolution before ${unresolvedCreditCount === 1 ? 'it becomes' : 'they become'} withdrawable.`,
            count: unresolvedCreditCount,
            href: '/principal/withdraw?tab=unresolved',
          }]
        : []),
      ...(unreadInboxCount > 0
        ? [{
            sourceKey: 'hls_notice',
            type: 'hls_notice',
            title: 'New HLS notices',
            message: `${unreadInboxCount} unread notice${unreadInboxCount === 1 ? '' : 's'} from HLS.`,
            count: unreadInboxCount,
            href: '/principal/my-profile?tab=settings&section=notifications',
          }]
        : []),
      ...(recentCompletedRegistrationCount > 0
        ? [{
            sourceKey: 'benfek_registration',
            type: 'benfek_registration',
            title: 'Benfek registrations completed',
            message: `${recentCompletedRegistrationCount} benfek${recentCompletedRegistrationCount === 1 ? ' has' : 's have'} completed account creation recently.`,
            count: recentCompletedRegistrationCount,
            href: '/principal/benfeks',
          }]
        : []),
      ...(quizCompletedAccountPendingCount > 0
        ? [{
            sourceKey: 'benfek_account_pending',
            type: 'benfek_account_pending',
            title: 'Benfeks need to finish account setup',
            message: `${quizCompletedAccountPendingCount} benfek${quizCompletedAccountPendingCount === 1 ? ' has' : 's have'} completed the quiz but not final account creation.`,
            count: quizCompletedAccountPendingCount,
            href: '/principal/benfeks',
          }]
        : []),
      ...(staleUnusedCodeCount > 0
        ? [{
            sourceKey: 'unused_quiz_codes',
            type: 'unused_quiz_codes',
            title: 'Unused quiz codes',
            message: `${staleUnusedCodeCount} quiz code${staleUnusedCodeCount === 1 ? ' is' : 's are'} older than 48 hours and still unused.`,
            count: staleUnusedCodeCount,
            href: '/principal/benfeks',
          }]
        : []),
      ...(packReadyCount > 0
        ? [{
            sourceKey: 'pack_ready',
            type: 'pack_ready',
            title: 'Supplement packs ready',
            message: `${packReadyCount} researcher pack${packReadyCount === 1 ? ' is' : 's are'} dispatched and ready for benfek action.`,
            count: packReadyCount,
            href: '/principal/benfeks',
          }]
        : []),
      ...(missingProfileFields.length > 0
        ? [{
            sourceKey: 'complete_profile',
            type: 'complete_profile',
            title: 'Complete your profile',
            message: `Add ${missingProfileFields.slice(0, 3).join(', ')}${missingProfileFields.length > 3 ? ', and more' : ''}.`,
            count: 1,
            href: '/principal/my-profile?tab=settings&section=payments',
          }]
        : []),
    ];

    const activeSourceKeys = detectedItems.map((item) => item.sourceKey);
    const existingNotifications = await this.prisma.principalNotification.findMany({
      where: {
        userId,
        sourceKey: { in: activeSourceKeys.length ? activeSourceKeys : ['__none__'] },
      },
    });
    const existingBySourceKey = new Map(
      existingNotifications.map((notification) => [notification.sourceKey, notification])
    );

    await Promise.all(
      detectedItems.map((item) => {
        const fingerprint = JSON.stringify({
          count: item.count,
          message: item.message,
          href: item.href,
        });
        const existing = existingBySourceKey.get(item.sourceKey);

        if (!existing) {
          return this.prisma.principalNotification.create({
            data: {
              userId,
              sourceKey: item.sourceKey,
              type: item.type,
              title: item.title,
              message: item.message,
              href: item.href,
              count: item.count,
              fingerprint,
            },
          });
        }

        const conditionChanged = existing.fingerprint !== fingerprint;
        return this.prisma.principalNotification.update({
          where: { id: existing.id },
          data: {
            type: item.type,
            title: item.title,
            message: item.message,
            href: item.href,
            count: item.count,
            fingerprint,
            isRead: conditionChanged ? false : existing.isRead,
            isDeleted: conditionChanged ? false : existing.isDeleted,
          },
        });
      })
    );

    if (activeSourceKeys.length > 0) {
      await this.prisma.principalNotification.updateMany({
        where: {
          userId,
          sourceKey: { notIn: activeSourceKeys },
          isDeleted: false,
        },
        data: {
          isRead: true,
          isDeleted: true,
        },
      });
    } else {
      await this.prisma.principalNotification.updateMany({
        where: {
          userId,
          isDeleted: false,
        },
        data: {
          isRead: true,
          isDeleted: true,
        },
      });
    }

    const notifications = await this.prisma.principalNotification.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: [
        { updatedAt: 'desc' },
      ],
    });

    const items = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href,
      count: notification.count,
      isRead: notification.isRead,
      updatedAt: notification.updatedAt,
    }));

    return {
      count: items
        .filter((item) => !item.isRead)
        .reduce((sum, item) => sum + Number(item.count || 0), 0),
      walletCredits: {
        unresolvedCount: unresolvedCreditCount,
        unresolvedAmount: unresolvedCreditAmount,
      },
      withdrawals: {
        pendingCount: pendingWithdrawalCount,
        failedCount: failedWithdrawalCount,
      },
      benfekRegistrations: {
        recentCompletedCount: recentCompletedRegistrationCount,
        quizCompletedAccountPendingCount,
        staleUnusedCodeCount,
      },
      packs: {
        readyCount: packReadyCount,
      },
      hlsNotices: {
        unreadCount: unreadInboxCount,
      },
      profile: {
        incomplete: missingProfileFields.length > 0,
        missingFields: missingProfileFields,
      },
      items,
    };
  }

  async markNotificationRead(userId: number, notificationId: number) {
    return this.prisma.principalNotification.updateMany({
      where: {
        id: notificationId,
        userId,
        isDeleted: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllNotificationsRead(userId: number) {
    return this.prisma.principalNotification.updateMany({
      where: {
        userId,
        isDeleted: false,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async deleteNotification(userId: number, notificationId: number) {
    return this.prisma.principalNotification.updateMany({
      where: {
        id: notificationId,
        userId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        isRead: true,
      },
    });
  }

  async resolvePrincipalCredit(userId: number, creditId: number) {
    const result = await this.prisma.$executeRawUnsafe(
      `UPDATE PrincipalCredit SET status = 'resolved', updatedAt = NOW() WHERE id = ? AND principalId = ?`,
      creditId,
      userId
    );
    if (!result) {
      throw new Error('Credit not found');
    }

    return this.getIncomeSummary(userId);
  }
}
