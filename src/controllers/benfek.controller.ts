import { Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import {
  ChangeBenfekPasswordSchema,
  CreateSupportTicketSchema,
  SaveGamePointsSchema,
  UpdateBenfekProfileSchema,
} from '../DTOs/benfek.dto';

@injectable()
export class BenfekController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

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
        role: true,
        quizCodesCreated: false,
      } as any,
    });

    if (!user) return null;

    const quizCode = await this.prisma.quizCode.findFirst({
      where: { usedBy: userId, isUsed: true },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      whatsappNumber: (user as any).whatsappNumber || user.phone || null,
      deliveryAddress: (user as any).deliveryAddress || null,
      dropOffAddress: (user as any).dropOffAddress || null,
      role: user.role,
      quizCode: quizCode
        ? {
            code: quizCode.code,
            principal: quizCode.creator,
            benfekName: quizCode.benfekName,
            benfekAge: quizCode.benfekAge,
            benfekGender: quizCode.benfekGender,
            health: {
              allergies: quizCode.allergies,
              scares: quizCode.scares,
              familyCondition: quizCode.familyCondition,
              medications: quizCode.medications,
              hasCurrentCondition: quizCode.hasCurrentCondition,
            },
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
          }
        : null,
    };
  }

  getMyProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const profile = await this.buildProfile(req.user.id);
      if (!profile) {
        return ResponseUtil.error(res, 'Benfek profile not found', 404);
      }
      return ResponseUtil.success(res, { profile }, 'Benfek profile retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek profile', 500, error);
    }
  };

  updateMyProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = UpdateBenfekProfileSchema.parse(req.body);
      const existing = await this.prisma.user.findUnique({ where: { id: req.user.id } });
      if (!existing) {
        return ResponseUtil.error(res, 'Benfek profile not found', 404);
      }

      if (data.email && data.email !== existing.email) {
        const emailOwner = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (emailOwner && emailOwner.id !== req.user.id) {
          return ResponseUtil.error(res, 'Email address is already registered', 409);
        }
      }

      if (data.phone && data.phone !== existing.phone) {
        const phoneOwner = await this.prisma.user.findUnique({ where: { phone: data.phone } });
        if (phoneOwner && phoneOwner.id !== req.user.id) {
          return ResponseUtil.error(res, 'Phone number is already registered', 409);
        }
      }

      const userData: Record<string, unknown> = {};
      if (data.email !== undefined) userData.email = data.email;
      if (data.firstName !== undefined) userData.firstName = data.firstName;
      if (data.lastName !== undefined) userData.lastName = data.lastName;
      if (data.phone !== undefined) userData.phone = data.phone;
      if (data.whatsappNumber !== undefined) userData.whatsappNumber = data.whatsappNumber;
      if (data.deliveryAddress !== undefined) userData.deliveryAddress = data.deliveryAddress;
      if (data.dropOffAddress !== undefined) userData.dropOffAddress = data.dropOffAddress;

      if (Object.keys(userData).length) {
        await this.prisma.user.update({
          where: { id: req.user.id },
          data: userData as any,
        });
      }

      const existingQuizCode = await this.prisma.quizCode.findFirst({
        where: { usedBy: req.user.id, isUsed: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingQuizCode) {
        const quizData: Record<string, unknown> = {};
        if (data.benfekName !== undefined) quizData.benfekName = data.benfekName;
        if (data.benfekAge !== undefined) quizData.benfekAge = data.benfekAge;
        if (data.benfekGender !== undefined) quizData.benfekGender = data.benfekGender;
        if (data.allergies !== undefined) quizData.allergies = data.allergies;
        if (data.scares !== undefined) quizData.scares = data.scares;
        if (data.familyCondition !== undefined) quizData.familyCondition = data.familyCondition;
        if (data.medications !== undefined) quizData.medications = data.medications;
        if (data.hasCurrentCondition !== undefined) quizData.hasCurrentCondition = data.hasCurrentCondition;
        if (data.basicNickname !== undefined) quizData.basicNickname = data.basicNickname;
        if (data.basicWeight !== undefined) quizData.basicWeight = data.basicWeight;
        if (data.basicHeight !== undefined) quizData.basicHeight = data.basicHeight;
        if (data.lifestyleHabits !== undefined) quizData.lifestyleHabits = data.lifestyleHabits;
        if (data.lifestyleFun !== undefined) quizData.lifestyleFun = data.lifestyleFun;
        if (data.lifestylePriority !== undefined) quizData.lifestylePriority = data.lifestylePriority;
        if (data.preferenceDrugForm !== undefined) quizData.preferenceDrugForm = data.preferenceDrugForm;
        if (data.preferenceBudget !== undefined) quizData.preferenceBudget = data.preferenceBudget;

        if (Object.keys(quizData).length) {
          await this.prisma.quizCode.update({
            where: { id: existingQuizCode.id },
            data: quizData as any,
          });
        }
      }

      const profile = await this.buildProfile(req.user.id);
      return ResponseUtil.success(res, { profile }, 'Benfek profile updated');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to update benfek profile', 500, error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = ChangeBenfekPasswordSchema.parse(req.body);
      const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return ResponseUtil.error(res, 'Benfek account not found', 404);
      }

      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        return ResponseUtil.error(res, 'Current password is incorrect', 400);
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
      });

      return ResponseUtil.success(res, null, 'Password updated successfully');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to update password', 500, error);
    }
  };

  getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: { userId: req.user.id },
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
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.order.count({ where: { userId: req.user.id } }),
      ]);

      return ResponseUtil.success(
        res,
        {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Purchase history retrieved'
      );
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve purchase history', 500, error);
    }
  };

  createSupportTicket = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = CreateSupportTicketSchema.parse(req.body);
      const ticket = await this.prisma.supportTicket.create({
        data: {
          userId: req.user.id,
          category: data.category,
          subject: data.subject,
          message: data.message,
        },
      });

      return ResponseUtil.success(res, { ticket }, 'Support request submitted', 201);
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to submit support request', 500, error);
    }
  };

  getMySupportTickets = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tickets = await this.prisma.supportTicket.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });

      return ResponseUtil.success(res, { tickets }, 'Support requests retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve support requests', 500, error);
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
}
