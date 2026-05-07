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
        lifestyleDesires: true,
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
                desires: quizCode.lifestyleDesires,
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

  private async syncBenfekNotifications(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        whatsappNumber: true,
        deliveryAddress: true,
        dropOffAddress: true,
        preferredPharmacyName: true,
        preferredPharmacyPhone: true,
      },
    });

    const quizCodes = await this.prisma.quizCode.findMany({
      where: { usedBy: userId, isUsed: true },
      select: { code: true },
    });
    const quizCodeValues = quizCodes.map((quizCode) => quizCode.code);

    const [
      unreadNoticeCount,
      cartItemCount,
      failedPaymentCount,
      activeOrderCount,
      readyPacks,
    ] = await Promise.all([
      this.prisma.inbox.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      this.prisma.cartItem.count({
        where: {
          cart: { userId },
        },
      }),
      this.prisma.payment.count({
        where: {
          userId,
          status: 'failed',
        },
      }),
      this.prisma.order.count({
        where: {
          userId,
          status: { in: ['paid', 'processing', 'shipped'] },
        },
      }),
      quizCodeValues.length
        ? this.prisma.researcherPack.findMany({
            where: {
              quizCode: { in: quizCodeValues },
              status: 'dispatched',
            },
            select: {
              packId: true,
              items: { select: { id: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const successfulPackPayments = await this.prisma.payment.findMany({
      where: {
        userId,
        status: 'success',
      },
      select: { metadata: true },
    });
    const paidPackIds = new Set<string>();
    for (const payment of successfulPackPayments) {
      if (!payment.metadata) continue;
      try {
        const metadata = JSON.parse(payment.metadata) as { packId?: unknown };
        if (typeof metadata.packId === 'string' && metadata.packId.trim()) {
          paidPackIds.add(metadata.packId.trim());
        }
      } catch {
        // Ignore malformed payment metadata.
      }
    }

    const unpaidReadyPackCount = readyPacks.filter(
      (pack) => pack.items.length > 0 && !paidPackIds.has(pack.packId)
    ).length;

    const missingProfileFields = [
      ['WhatsApp or phone number', user?.whatsappNumber || user?.phone],
      ['Delivery address', user?.deliveryAddress],
      ['Preferred pharmacy', user?.preferredPharmacyName],
      ['Preferred pharmacy phone', user?.preferredPharmacyPhone],
    ]
      .filter(([, value]) => !String(value || '').trim())
      .map(([label]) => label);

    const detectedItems = [
      ...(unpaidReadyPackCount > 0
        ? [{
            sourceKey: 'benfek_pack_ready',
            type: 'benfek_pack_ready',
            title: 'Nutrient packs ready',
            message: `${unpaidReadyPackCount} nutrient pack${unpaidReadyPackCount === 1 ? ' is' : 's are'} ready for review or payment.`,
            count: unpaidReadyPackCount,
            href: '/benfek/dashboard',
          }]
        : []),
      ...(activeOrderCount > 0
        ? [{
            sourceKey: 'benfek_order_active',
            type: 'benfek_order_active',
            title: 'Order update',
            message: `${activeOrderCount} order${activeOrderCount === 1 ? ' is' : 's are'} paid, processing, or on the way.`,
            count: activeOrderCount,
            href: '/benfek/account',
          }]
        : []),
      ...(failedPaymentCount > 0
        ? [{
            sourceKey: 'benfek_payment_failed',
            type: 'benfek_payment_failed',
            title: 'Payment needs attention',
            message: `${failedPaymentCount} payment attempt${failedPaymentCount === 1 ? ' has' : 's have'} failed. Please retry checkout if needed.`,
            count: failedPaymentCount,
            href: '/cart',
          }]
        : []),
      ...(unreadNoticeCount > 0
        ? [{
            sourceKey: 'benfek_hls_notice',
            type: 'benfek_hls_notice',
            title: 'New HLS notice',
            message: `${unreadNoticeCount} unread support or HLS notice${unreadNoticeCount === 1 ? '' : 's'} need your attention.`,
            count: unreadNoticeCount,
            href: '/support',
          }]
        : []),
      ...(cartItemCount > 0
        ? [{
            sourceKey: 'benfek_cart_waiting',
            type: 'benfek_cart_waiting',
            title: 'Items in cart',
            message: `${cartItemCount} item${cartItemCount === 1 ? ' is' : 's are'} waiting in your cart.`,
            count: cartItemCount,
            href: '/cart',
          }]
        : []),
      ...(missingProfileFields.length > 0
        ? [{
            sourceKey: 'benfek_complete_profile',
            type: 'benfek_complete_profile',
            title: 'Complete your profile',
            message: `Add ${missingProfileFields.slice(0, 3).join(', ')}${missingProfileFields.length > 3 ? ', and more' : ''}.`,
            count: 1,
            href: '/benfek/profile',
          }]
        : []),
      ...(quizCodeValues.length === 0
        ? [{
            sourceKey: 'benfek_quiz_link_missing',
            type: 'benfek_quiz_link_missing',
            title: 'Complete your assessment',
            message: 'Validate your quiz code or complete the assessment so HLS can personalize your experience.',
            count: 1,
            href: '/assessment',
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

    const benfekSourcePrefix = 'benfek_';
    if (activeSourceKeys.length > 0) {
      await this.prisma.principalNotification.updateMany({
        where: {
          userId,
          sourceKey: { startsWith: benfekSourcePrefix, notIn: activeSourceKeys },
          isDeleted: false,
        },
        data: { isRead: true, isDeleted: true },
      });
    } else {
      await this.prisma.principalNotification.updateMany({
        where: {
          userId,
          sourceKey: { startsWith: benfekSourcePrefix },
          isDeleted: false,
        },
        data: { isRead: true, isDeleted: true },
      });
    }

    const notifications = await this.prisma.principalNotification.findMany({
      where: {
        userId,
        sourceKey: { startsWith: benfekSourcePrefix },
        isDeleted: false,
      },
      orderBy: [{ updatedAt: 'desc' }],
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
      packs: { readyCount: unpaidReadyPackCount },
      orders: { activeCount: activeOrderCount },
      payments: { failedCount: failedPaymentCount },
      cart: { itemCount: cartItemCount },
      hlsNotices: { unreadCount: unreadNoticeCount },
      profile: {
        incomplete: missingProfileFields.length > 0,
        missingFields: missingProfileFields,
      },
      assessment: { linkedQuizCodes: quizCodeValues.length },
      items,
    };
  }

  getNotificationSummary = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      const summary = await this.syncBenfekNotifications(userId);
      return ResponseUtil.success(res, summary, 'Benfek notification summary retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek notifications', 500, error);
    }
  };

  markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }

      await this.prisma.principalNotification.updateMany({
        where: {
          userId,
          sourceKey: { startsWith: 'benfek_' },
          isDeleted: false,
          isRead: false,
        },
        data: { isRead: true },
      });
      return ResponseUtil.success(res, { read: true }, 'Benfek notifications marked as read');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to mark benfek notifications as read', 500, error);
    }
  };

  deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const notificationId = Number.parseInt(String(req.params.id), 10);
      if (!userId) {
        return ResponseUtil.error(res, 'Authentication required', 401);
      }
      if (!notificationId) {
        return ResponseUtil.error(res, 'Invalid notification id', 400);
      }

      await this.prisma.principalNotification.updateMany({
        where: {
          id: notificationId,
          userId,
          sourceKey: { startsWith: 'benfek_' },
          isDeleted: false,
        },
        data: { isDeleted: true, isRead: true },
      });
      return ResponseUtil.success(res, { id: notificationId }, 'Benfek notification deleted');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete benfek notification', 500, error);
    }
  };

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
          lifestyleDesires: 'lifestyleDesires',
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
