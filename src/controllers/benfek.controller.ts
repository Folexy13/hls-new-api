import { Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import {
  ChangeBenfekPasswordSchema,
  SaveGamePointsSchema,
  UpdateBenfekProfileSchema,
} from '../DTOs/benfek.dto';
import { NotificationService } from '../services/notification.service';

@injectable()
export class BenfekController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationService) private notificationService: NotificationService
  ) {}

  private async buildProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsappNumber: true,
        deliveryAddress: true,
        dropOffAddress: true,
        preferredPharmacyName: true,
        preferredPharmacyPhone: true,
        role: true,
      },
    });

    if (!user) return null;

    const quizCode = await this.prisma.quizCode.findFirst({
      where: { usedBy: userId, isUsed: true },
      orderBy: [{ usedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        code: true,
        benfekName: true,
        benfekPhone: true,
        benfekAge: true,
        benfekGender: true,
        basicNickname: true,
        basicWeight: true,
        basicHeight: true,
        lifestyleHabits: true,
        lifestyleFun: true,
        lifestylePriority: true,
        preferenceDrugForm: true,
        preferenceBudget: true,
        allergies: true,
        scares: true,
        familyCondition: true,
        medications: true,
        hasCurrentCondition: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      quizCode: quizCode
        ? {
            code: quizCode.code,
            benfekName: quizCode.benfekName,
            benfekPhone: quizCode.benfekPhone,
            benfekAge: quizCode.benfekAge,
            benfekGender: quizCode.benfekGender,
            quiz: {
              basics: {
                nickname: quizCode.basicNickname,
                weight: quizCode.basicWeight,
                height: quizCode.basicHeight,
              },
              lifestyle: {
                habits: quizCode.lifestyleHabits,
                funActivities: quizCode.lifestyleFun,
                priority: quizCode.lifestylePriority,
              },
              preferences: {
                drugForm: quizCode.preferenceDrugForm,
                budget: quizCode.preferenceBudget,
              },
            },
            health: {
              allergies: quizCode.allergies,
              scares: quizCode.scares,
              familyCondition: quizCode.familyCondition,
              medications: quizCode.medications,
              hasCurrentCondition: quizCode.hasCurrentCondition,
            },
            principal: quizCode.creator,
          }
        : null,
    };
  }

  getProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const profile = await this.buildProfile(userId);
      if (!profile) {
        return ResponseUtil.error(res, 'Benfek profile not found', 404);
      }

      return ResponseUtil.success(res, { profile }, 'Benfek profile retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek profile', 500, error);
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const data = UpdateBenfekProfileSchema.parse(req.body);

      const userData: Record<string, unknown> = {};
      const userFields = [
        'email',
        'firstName',
        'lastName',
        'phone',
        'whatsappNumber',
        'deliveryAddress',
        'dropOffAddress',
        'preferredPharmacyName',
        'preferredPharmacyPhone',
      ] as const;

      for (const field of userFields) {
        if (field in data) {
          userData[field] = data[field];
        }
      }

      if (Object.keys(userData).length > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      const quizCode = await this.prisma.quizCode.findFirst({
        where: { usedBy: userId, isUsed: true },
        orderBy: [{ usedAt: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true },
      });

      if (quizCode) {
        const quizData: Record<string, unknown> = {};
        const quizFieldMap: Record<string, string> = {
          benfekName: 'benfekName',
          benfekAge: 'benfekAge',
          benfekGender: 'benfekGender',
          allergies: 'allergies',
          scares: 'scares',
          familyCondition: 'familyCondition',
          medications: 'medications',
          hasCurrentCondition: 'hasCurrentCondition',
          basicNickname: 'basicNickname',
          basicWeight: 'basicWeight',
          basicHeight: 'basicHeight',
          lifestyleHabits: 'lifestyleHabits',
          lifestyleFun: 'lifestyleFun',
          lifestylePriority: 'lifestylePriority',
          preferenceDrugForm: 'preferenceDrugForm',
          preferenceBudget: 'preferenceBudget',
        };

        for (const [payloadField, quizField] of Object.entries(quizFieldMap)) {
          if (payloadField in data) {
            quizData[quizField] = (data as Record<string, unknown>)[payloadField];
          }
        }

        if (Object.keys(quizData).length > 0) {
          await this.prisma.quizCode.update({
            where: { id: quizCode.id },
            data: quizData,
          });
        }
      }

      const profile = await this.buildProfile(userId);
      return ResponseUtil.success(res, { profile }, 'Benfek profile updated');
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      return ResponseUtil.error(res, 'Failed to update benfek profile', 500, error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const data = ChangeBenfekPasswordSchema.parse(req.body);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });

      if (!user) {
        return ResponseUtil.error(res, 'Benfek profile not found', 404);
      }

      const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isPasswordValid) {
        return ResponseUtil.error(res, 'Current password is incorrect', 400);
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return ResponseUtil.success(res, null, 'Password updated successfully');
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      return ResponseUtil.error(res, 'Failed to update password', 500, error);
    }
  };

  getOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const orders = await this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              supplement: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
          payment: {
            select: {
              status: true,
              method: true,
              paystackReference: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ResponseUtil.success(res, { orders }, 'Benfek orders retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek orders', 500, error);
    }
  };

  getMyPacks = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const quizCodes = await this.prisma.quizCode.findMany({
        where: { usedBy: userId, isUsed: true },
        select: { code: true },
      });

      if (!quizCodes.length) {
        return ResponseUtil.success(res, [], 'Benfek packs retrieved');
      }

      const packs = await this.prisma.researcherPack.findMany({
        where: {
          quizCode: { in: quizCodes.map((quizCode) => quizCode.code) },
          status: 'dispatched',
        },
        include: {
          items: {
            include: {
              supplement: true,
            },
          },
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return ResponseUtil.success(res, packs, 'Benfek packs retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek packs', 500, error);
    }
  };

  saveGamePoints = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = SaveGamePointsSchema.parse(req.body);
      const userId = req.user?.id;
      const where = userId
        ? { userId }
        : data.quizCode
          ? { quizCode: data.quizCode }
          : null;

      if (!where) {
        return ResponseUtil.error(res, 'A signed-in benfek or quiz code is required', 400);
      }

      const existing = await this.prisma.benfekGamePoint.findFirst({ where });
      const gamePoints = existing
        ? await this.prisma.benfekGamePoint.update({
            where: { id: existing.id },
            data: {
              points: data.points,
              email: data.email,
              phone: data.phone,
              quizCode: data.quizCode,
              metadata: data.metadata,
            },
          })
        : await this.prisma.benfekGamePoint.create({
            data: {
              userId,
              quizCode: data.quizCode,
              email: data.email,
              phone: data.phone,
              points: data.points,
              metadata: data.metadata,
            },
          });

      if (userId && data.quizCode) {
        await this.prisma.quizCode.updateMany({
          where: { code: data.quizCode },
          data: {
            usedBy: userId,
            isUsed: true,
            usedAt: new Date(),
          },
        });
      }

      return ResponseUtil.success(res, { gamePoints }, 'Game points saved');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to save game points', 500, error);
    }
  };

  getMyGamePoints = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const gamePoints = await this.prisma.benfekGamePoint.findUnique({
        where: { userId: req.user.id },
      });

      return ResponseUtil.success(res, { gamePoints }, 'Game points retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve game points', 500, error);
    }
  };

  sendInvoiceImage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageUrl, caption, phone, email } = req.body as {
        imageUrl?: string;
        caption?: string;
        phone?: string;
        email?: string;
      };

      if (!imageUrl || typeof imageUrl !== 'string') {
        return ResponseUtil.error(res, 'invoice image URL is required', 400);
      }

      const targetPhone = phone?.trim();
      const targetEmail = email?.trim() || req.user.email;
      const resolvedCaption =
        typeof caption === 'string' && caption.trim().length > 0
          ? caption.trim()
          : 'Please review your HLS invoice.';

      const result = await this.notificationService.sendInvoiceImage({
        phone: targetPhone,
        email: targetEmail,
        imageUrl: imageUrl.trim(),
        caption: resolvedCaption,
      });

      if (!result.success) {
        return ResponseUtil.error(res, 'Failed to send invoice notification', 500, result.reason);
      }

      return ResponseUtil.success(res, { sent: true, result }, 'Invoice notification sent');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to send invoice image', 500, error);
    }
  };
}
