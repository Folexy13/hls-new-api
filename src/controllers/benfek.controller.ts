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
import { z } from 'zod';
import { formatHealthField } from '../utilities/health-field.utility';

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
            whatsappNumber: true,
            profession: true,
            currentPlaceOfWork: true,
          },
        },
      },
    });

    let resolvedUser = user;
    const principalProfession = quizCode?.creator?.profession?.trim().toLowerCase();
    const principalPharmacyName = quizCode?.creator?.currentPlaceOfWork?.trim();
    const principalPharmacyPhone =
      quizCode?.creator?.phone?.trim() || quizCode?.creator?.whatsappNumber?.trim() || undefined;

    if (
      !resolvedUser.preferredPharmacyName?.trim() &&
      principalProfession === 'pharmacy' &&
      principalPharmacyName
    ) {
      resolvedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          preferredPharmacyName: principalPharmacyName,
          preferredPharmacyPhone: resolvedUser.preferredPharmacyPhone?.trim() || principalPharmacyPhone,
        },
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
    }

    return {
      ...resolvedUser,
      fullName: `${resolvedUser.firstName} ${resolvedUser.lastName}`.trim(),
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
              allergies: formatHealthField(quizCode.allergies),
              scares: formatHealthField(quizCode.scares),
              familyCondition: formatHealthField(quizCode.familyCondition),
              medications: formatHealthField(quizCode.medications),
              hasCurrentCondition: quizCode.hasCurrentCondition,
              currentConditions: (quizCode as any).currentConditions ?? undefined,
            },
            principal: quizCode.creator,
          }
        : null,
    };
  }

  private readonly supportTicketSchema = z.object({
    category: z.string().trim().min(1, 'Category is required'),
    subject: z.string().trim().min(1, 'Subject is required'),
    message: z.string().trim().min(1, 'Message is required'),
  });

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

      const packPayments = await this.prisma.payment.findMany({
        where: {
          userId,
          status: 'success',
        },
        select: {
          id: true,
          status: true,
          paidAt: true,
          paystackReference: true,
          metadata: true,
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      });

      const paymentByPackId = new Map<
        string,
        {
          status: string;
          paidAt: Date | null;
          paystackReference: string | null;
          orderId: number;
          orderStatus: string;
        }
      >();

      for (const payment of packPayments) {
        if (!payment.metadata) continue;

        try {
          const metadata = JSON.parse(payment.metadata) as { packId?: unknown };
          const packId = typeof metadata.packId === 'string' ? metadata.packId.trim() : '';
          if (!packId || paymentByPackId.has(packId)) continue;

          paymentByPackId.set(packId, {
            status: payment.status,
            paidAt: payment.paidAt,
            paystackReference: payment.paystackReference ?? null,
            orderId: payment.order.id,
            orderStatus: payment.order.status,
          });
        } catch {
          // Ignore malformed metadata and keep building the remaining pack state.
        }
      }

      const packsWithPaymentState = packs.map((pack) => {
        const payment = paymentByPackId.get(pack.packId);

        return {
          ...pack,
          payment: payment
            ? {
                isPaid: true,
                ...payment,
              }
            : {
                isPaid: false,
                status: null,
                paidAt: null,
                paystackReference: null,
                orderId: null,
                orderStatus: null,
              },
        };
      });

      return ResponseUtil.success(res, packsWithPaymentState, 'Benfek packs retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek packs', 500, error);
    }
  };

  getSupportTickets = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const tickets = await this.prisma.inbox.findMany({
        where: {
          userId,
          subject: {
            startsWith: '[Support]',
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ResponseUtil.success(
        res,
        {
          tickets: tickets.map((ticket) => {
            const [prefixedCategory, ...messageParts] = ticket.message.split('\n\n');
            const category = prefixedCategory.startsWith('Category: ')
              ? prefixedCategory.replace('Category: ', '').trim()
              : 'General';

            return {
              id: ticket.id,
              category,
              subject: ticket.subject.replace(/^\[Support\]\s*/, '').trim(),
              message: messageParts.join('\n\n').trim() || ticket.message,
              status: ticket.isRead ? 'resolved' : 'open',
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
            };
          }),
        },
        'Support tickets retrieved'
      );
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve support tickets', 500, error);
    }
  };

  createSupportTicket = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const data = this.supportTicketSchema.parse(req.body);
      const ticket = await this.prisma.inbox.create({
        data: {
          userId,
          subject: `[Support] ${data.subject}`,
          message: `Category: ${data.category}\n\n${data.message}`,
          isRead: false,
        },
      });

      return ResponseUtil.success(
        res,
        {
          ticket: {
            id: ticket.id,
            category: data.category,
            subject: data.subject,
            message: data.message,
            status: 'open',
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          },
        },
        'Support ticket created',
        201
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      return ResponseUtil.error(res, 'Failed to create support ticket', 500, error);
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
