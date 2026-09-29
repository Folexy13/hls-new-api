import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { ForbiddenError, NotFoundError } from '../utilities/errors';
import { ensureSystemPrincipal, isSystemPrincipalEmail } from '../utilities/benfek-link.utility';

const SELF_DELETABLE_ROLES: Role[] = ['benfek', 'principal', 'wholesaler'];

@injectable()
export class AccountService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async deleteOwnAccount(userId: number, currentPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Account not found');
    }

    if (!SELF_DELETABLE_ROLES.includes(user.role)) {
      throw new ForbiddenError('This account type cannot be deleted from this dashboard');
    }

    if (user.role === 'principal' && isSystemPrincipalEmail(user.email)) {
      throw new ForbiddenError('The system principal account cannot be deleted');
    }

    const wallet = user.role === 'principal'
      ? await this.prisma.wallet.findUnique({
          where: { userId: user.id },
          select: { id: true, balance: true },
        })
      : null;

    if (wallet && Number(wallet.balance) !== 0) {
      throw new ForbiddenError('Please withdraw or resolve your wallet balance before deleting your account.');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenError('Current password is incorrect');
    }

    const systemPrincipal = user.role === 'principal'
      ? await ensureSystemPrincipal(this.prisma)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      });

      await tx.payment.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      });

      await tx.withdrawal.updateMany({
        where: { userId: user.id },
        data: { userId: null, walletId: null },
      });

      if (wallet) {
        await tx.withdrawal.updateMany({
          where: { walletId: wallet.id },
          data: { walletId: null },
        });

        await tx.principalCredit.updateMany({
          where: { walletId: wallet.id },
          data: { walletId: null },
        });
      }

      await tx.principalCredit.updateMany({
        where: { principalId: user.id },
        data: { principalId: null },
      });

      if (user.role === 'benfek') {
        const linkedQuizCodes = await tx.quizCode.findMany({
          where: { usedBy: user.id },
          select: { id: true },
        });

        if (linkedQuizCodes.length) {
          await tx.quizCode.deleteMany({ where: { usedBy: user.id } });
        }
      }

      if (user.role === 'principal' && systemPrincipal) {
        await tx.quizCode.updateMany({
          where: { createdBy: user.id },
          data: { createdBy: systemPrincipal.id },
        });
      }

      const userSupplements = await tx.supplement.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const supplementIds = userSupplements.map((supplement) => supplement.id);

      if (supplementIds.length) {
        await tx.cartItem.deleteMany({ where: { supplementId: { in: supplementIds } } });
        await tx.supplement.updateMany({
          where: { id: { in: supplementIds } },
          data: {
            userId: null,
            stock: 0,
            status: 'inactive',
          },
        });
      }

      await tx.user.delete({ where: { id: user.id } });
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
