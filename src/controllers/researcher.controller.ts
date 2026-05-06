import { Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import { NotificationService } from '../services/notification.service';
import {
  DispatchPackSchema,
  CreateOperationalPaymentSchema,
  ResearcherSupplementSchema,
  UpdateResearcherSupplementSchema,
  VerifyBenfekCodeSchema,
} from '../DTOs/researcher.dto';
import { formatHealthField } from '../utilities/health-field.utility';

@injectable()
export class ResearcherController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationService) private notificationService: NotificationService
  ) {}

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  private ensureResearcher(req: AuthenticatedRequest, res: Response): boolean {
    if (!['researcher', 'principal'].includes(req.user.role)) {
      ResponseUtil.error(res, 'Only researchers can access this resource', 403);
      return false;
    }
    return true;
  }

  private isChecker(req: AuthenticatedRequest): boolean {
    if (req.user.role === 'principal') return true;
    return req.user.role === 'researcher'; // Experimental: allow all researchers access
  }

  private ensureChecker(req: AuthenticatedRequest, res: Response): boolean {
    if (!this.isChecker(req)) {
      ResponseUtil.error(res, 'Checker access required', 403);
      return false;
    }
    return true;
  }

  private ensureMaker(req: AuthenticatedRequest, res: Response): boolean {
    if (req.user.role !== 'researcher' || req.user.researcherType !== 'maker') {
      ResponseUtil.error(res, 'Maker access required', 403);
      return false;
    }
    return true;
  }

  verifyBenfekCode = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const { code } = VerifyBenfekCodeSchema.parse(req.body);
      const quizCode = await this.prisma.quizCode.findUnique({
        where: { code },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!quizCode) {
        return ResponseUtil.error(res, 'Invalid benfek code', 404);
      }

      // Requirement: Only verified benfeks who completed registration can be accessed
      if (!quizCode.isUsed) {
        return ResponseUtil.error(res, 'Benfek not fully registered', 400);
      }

      const packs = await this.prisma.researcherPack.findMany({
        where: { quizCode: code },
        include: { items: { include: { supplement: true } } },
        orderBy: { updatedAt: 'desc' },
      });

      return ResponseUtil.success(res, {
        benfek: {
          code: quizCode.code,
          name: quizCode.benfekName,
          fullName: quizCode.benfekName,
          phone: quizCode.benfekPhone,
          age: quizCode.benfekAge,
          gender: quizCode.benfekGender,
          registrationStatus: quizCode.isUsed ? 'registered' : 'not_registered',
          usedAt: quizCode.usedAt,
          health: {
            allergies: formatHealthField(quizCode.allergies),
            scares: formatHealthField(quizCode.scares),
            familyCondition: formatHealthField(quizCode.familyCondition),
            medications: formatHealthField(quizCode.medications),
            hasCurrentCondition: quizCode.hasCurrentCondition,
            currentConditions: (quizCode as any).currentConditions ?? undefined,
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
              desires: quizCode.lifestyleDesires,
              priority: quizCode.lifestylePriority,
            },
            preferences: {
              drugForm: quizCode.preferenceDrugForm,
              budget: quizCode.preferenceBudget,
            },
          },
          principal: quizCode.creator,
        },
        packs,
      }, 'Benfek code verified');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to verify benfek code', 500, error);
    }
  };

  getSupplements = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const search = String(req.query.search || '').trim();
      const code = String(req.query.code || '').trim().toUpperCase();
      const skip = (page - 1) * limit;
      const where: any = {};
      let principalId: number | null = null;

      // Researcher gallery visibility:
      // - If no (valid) benfek code provided: return ONLY supplements uploaded by researchers.
      // - If benfek code provided and resolves to a principal: include that principal's supplements too.
      if (code) {
        const quizCode = await this.prisma.quizCode.findUnique({
          where: { code },
          select: { createdBy: true },
        });
        if (quizCode) principalId = quizCode.createdBy;
      }

      const visibilityOr: any[] = [{ user: { is: { role: 'researcher' } } }];
      if (principalId) visibilityOr.push({ userId: principalId });
      const baseVisibility = { OR: visibilityOr };

      if (search) {
        where.AND = [
          baseVisibility,
          {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { manufacturer: { contains: search } },
              { category: { contains: search } },
            ],
          },
        ];
      } else {
        Object.assign(where, baseVisibility);
      }

      const [supplements, total] = await Promise.all([
        this.prisma.supplement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { user: { select: { id: true, role: true } } },
        }),
        this.prisma.supplement.count({ where }),
      ]);

      const canViewWholesale = this.isChecker(req);
      const sanitizedSupplements = canViewWholesale
        ? (supplements as any[])
        : (supplements as any[]).map((supplement: any) => ({ ...supplement, wholesalers: null }));

      const enriched = sanitizedSupplements.map((supplement: any) => {
        const uploaderRole = String(supplement?.user?.role || 'unknown');
        const source =
          principalId && supplement.userId === principalId ? 'principal' : uploaderRole;
        return { ...supplement, source };
      });

      return ResponseUtil.success(res, {
        supplements: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, 'Supplements retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve supplements', 500, error);
    }
  };

  createSupplement = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const data = ResearcherSupplementSchema.parse(req.body);
      if (data.wholesalers?.length && !this.isChecker(req)) {
        return ResponseUtil.error(res, 'Wholesaler details require checker access', 403);
      }
      const supplement = await this.prisma.supplement.create({
        data: {
          ...data,
          imageUrl: data.imageUrl || null,
          category: data.category || null,
          manufacturer: data.manufacturer || null,
          strength: data.strength || null,
          dosageForm: null, // Moved to tags
          budgetRange: null, // Moved to tags
          expiryDate: (data as any).expiryDate || null,
          tags: data.tags,
          wholesalers: data.wholesalers?.length ? data.wholesalers : null,
          userId: req.user.id,
        } as any,
      });

      return ResponseUtil.success(res, { supplement }, 'Supplement added to gallery', 201);
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to create supplement', 500, error);
    }
  };

  updateSupplement = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const id = Number(req.params.id);
      const data = UpdateResearcherSupplementSchema.parse(req.body);
      if (data.wholesalers !== undefined && !this.isChecker(req)) {
        return ResponseUtil.error(res, 'Wholesaler details require checker access', 403);
      }
      const supplement = await this.prisma.supplement.update({
        where: { id },
        data: {
          ...data,
          tags: data.tags,
          expiryDate: (data as any).expiryDate,
          dosageForm: null, // Ensure columns stay clean
          budgetRange: null,
          ...(data.strength !== undefined && { strength: data.strength || null }),
          ...(data.wholesalers !== undefined && {
            wholesalers: (data.wholesalers || []).length ? data.wholesalers : null,
          }),
        } as any,
      });

      return ResponseUtil.success(res, { supplement }, 'Supplement updated');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to update supplement', 500, error);
    }
  };

  deleteSupplement = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const id = Number(req.params.id);
      await this.prisma.supplement.delete({ where: { id } });
      return ResponseUtil.success(res, null, 'Supplement deleted');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete supplement', 500, error);
    }
  };

  dispatchPack = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const data = DispatchPackSchema.parse(req.body);
      const quizCode = await this.prisma.quizCode.findUnique({
        where: { code: data.code },
        include: { creator: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
      if (!quizCode) return ResponseUtil.error(res, 'Invalid benfek code', 404);

      const pack = await this.prisma.researcherPack.upsert({
        where: {
          quizCode_packId: {
            quizCode: data.code,
            packId: data.packId,
          },
        },
        create: {
          quizCode: data.code,
          packId: data.packId,
          packName: data.packName,
          researcherId: req.user.id,
          status: data.status,
        },
        update: {
          packName: data.packName,
          researcherId: req.user.id,
          status: data.status,
        },
      });

      const itemData = (data as any).items || (data.supplementIds || []).map((id: number) => ({ id, quantity: 1 }));
      const activeIds = itemData.map((i: any) => i.id);

      await this.prisma.researcherPackItem.deleteMany({
        where: {
          packId: pack.id,
          supplementId: { notIn: activeIds },
        },
      });

      await Promise.all(
        itemData.map((item: any) =>
          this.prisma.researcherPackItem.upsert({
            where: {
              packId_supplementId: {
                packId: pack.id,
                supplementId: item.id,
              },
            },
            create: {
              packId: pack.id,
              supplementId: item.id,
              quantity: item.quantity,
              selectedWholesalerName: item.selectedWholesalerName || null,
              selectedWholesalerPrice: item.selectedWholesalerPrice ?? null,
              selectedWholesalerContact: item.selectedWholesalerContact || null,
              selectedWholesalerAddress: item.selectedWholesalerAddress || null,
              selectedWholesalerDetails: item.selectedWholesalerName
                ? {
                    name: item.selectedWholesalerName,
                    price: item.selectedWholesalerPrice ?? null,
                    contact: item.selectedWholesalerContact || null,
                    address: item.selectedWholesalerAddress || null,
                  }
                : null,
              requiresReselection: !item.selectedWholesalerName,
              dispatchedWithoutWholesaler: Boolean(item.forceDispatchWithoutWholesaler),
              effectiveMarkupFactor: 1.3,
            } as any,
            update: {
              quantity: item.quantity,
              selectedWholesalerName: item.selectedWholesalerName || null,
              selectedWholesalerPrice: item.selectedWholesalerPrice ?? null,
              selectedWholesalerContact: item.selectedWholesalerContact || null,
              selectedWholesalerAddress: item.selectedWholesalerAddress || null,
              selectedWholesalerDetails: item.selectedWholesalerName
                ? {
                    name: item.selectedWholesalerName,
                    price: item.selectedWholesalerPrice ?? null,
                    contact: item.selectedWholesalerContact || null,
                    address: item.selectedWholesalerAddress || null,
                  }
                : null,
              requiresReselection: !item.selectedWholesalerName,
              dispatchedWithoutWholesaler: Boolean(item.forceDispatchWithoutWholesaler),
              effectiveMarkupFactor: 1.3,
            } as any,
          })
        )
      );

      const result = await this.prisma.researcherPack.findUnique({
        where: { id: pack.id },
        include: { items: { include: { supplement: true } } },
      });

      if (result && data.status === 'dispatched') {
        const checkers = await (this.prisma.user.findMany({
          where: { role: 'researcher', researcherType: 'checker' as any },
          select: { id: true, email: true, firstName: true, lastName: true },
        }) as any);

        if (Array.isArray(checkers) && checkers.length) {
          const items = (result.items || []) as any[];
          const payloadItemsById = new Map<number, any>(
            itemData.map((item: any) => [Number(item.id), item] as [number, any])
          );
          const sellingTotal = items.reduce((sum, item) => {
            const price = Number(item?.supplement?.price || 0);
            const qty = Number(item?.quantity || 1);
            return sum + price * qty;
          }, 0);

          const wholesaleTotal = items.reduce((sum, item) => {
            const qty = Number(item?.quantity || 1);
            const source = payloadItemsById.get(Number(item.supplementId));
            const price = Number(source?.selectedWholesalerPrice || 0);
            if (price > 0) {
              return sum + price * qty;
            }

            return sum + Number(item?.supplement?.price || 0) * qty / 1.3;
          }, 0);

          const principalName = `${quizCode.creator.firstName} ${quizCode.creator.lastName}`.trim();
          const marginTotal = sellingTotal - wholesaleTotal;

          const lines = items.map((item) => {
            const name = String(item?.supplement?.name || 'Unknown');
            const sell = Number(item?.supplement?.price || 0);
            const qty = Number(item?.quantity || 1);
            const source = payloadItemsById.get(Number(item.supplementId));
            const sourcePrice =
              Number(source?.selectedWholesalerPrice || 0) > 0
                ? Number(source?.selectedWholesalerPrice || 0)
                : sell / 1.3;
            const margin = sell - sourcePrice;
            const sourceLabel = source?.selectedWholesalerName
              ? `${source.selectedWholesalerName} NGN ${sourcePrice.toLocaleString()}`
              : `Fallback markup 1.3 (cost NGN ${Math.round(sourcePrice).toLocaleString()})`;
            return `- ${name} x${qty}: sell NGN ${sell.toLocaleString()} | source ${sourceLabel} | margin NGN ${Math.round(margin).toLocaleString()}`;
          });

          const subject = `Pack dispatched: ${result.packName} (${data.code})`;
          const baseMessage = [
            `Benfek: ${quizCode.benfekName} (${quizCode.benfekPhone})`,
            `Code: ${data.code}`,
            `Pack: ${result.packName}`,
            `Principal: ${principalName} (${quizCode.creator.email})`,
            `Items: ${items.length}`,
            `Top item: ${lines[0] || 'N/A'}`,
            `Totals: sell NGN ${sellingTotal.toLocaleString()} | wholesale NGN ${wholesaleTotal.toLocaleString()} | margin NGN ${marginTotal.toLocaleString()}`,
          ].join('\n');
          const message = this.truncateText(baseMessage, 240);

          await this.prisma.inbox.createMany({
            data: checkers.map((checker: any) => ({
              userId: checker.id,
              subject,
              message,
              isRead: false,
            })),
          });

          await Promise.all(
            checkers
              .filter((checker: any) => checker.email)
              .map((checker: any) =>
                this.notificationService.sendEmail(
                  checker.email,
                  subject,
                  `<pre>${[baseMessage, '', 'Item sourcing', ...lines].join('\n')}</pre>`,
                  [baseMessage, '', 'Item sourcing', ...lines].join('\n')
                ).catch(() => undefined)
              )
          );
        }

        await this.notificationService.sendPackAvailableMessage({
          phone: quizCode.benfekPhone,
          packName: result.packName,
          code: data.code,
        }).catch(() => undefined);
      }

      return ResponseUtil.success(res, { pack: result }, 'Pack dispatched to benfek');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to dispatch pack', 500, error);
    }
  };

  createOperationalPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.ensureMaker(req, res)) return;

      const data = CreateOperationalPaymentSchema.parse(req.body);
      let principalId: number | null = null;

      if (data.quizCode) {
        const quizCode = await this.prisma.quizCode.findUnique({
          where: { code: data.quizCode },
          select: { createdBy: true },
        });
        if (!quizCode) return ResponseUtil.error(res, 'Invalid benfek code', 404);
        principalId = quizCode.createdBy;
      }

      const payment = await this.prisma.operationalPayment.create({
        data: {
          type: data.type as any,
          status: 'completed' as any,
          amount: data.amount,
          payeeName: data.payeeName,
          payeeContact: data.payeeContact || null,
          payeeAddress: data.payeeAddress || null,
          note: data.note || null,
          quizCode: data.quizCode || null,
          packId: data.packId || null,
          principalId,
          makerId: req.user.id,
        } as any,
        include: {
          principal: { select: { id: true, firstName: true, lastName: true, email: true } },
          maker: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return ResponseUtil.success(res, { payment }, 'Operational payment recorded', 201);
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to record operational payment', 500, error);
    }
  };

  getOperationalPayments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;

      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;

      const where: any = {};
      const principalId = req.query.principalId ? Number(req.query.principalId) : null;
      const quizCode = String(req.query.quizCode || '').trim().toUpperCase();
      const type = String(req.query.type || '').trim().toLowerCase();

      if (!this.isChecker(req)) {
        // Makers can only see their own payment records.
        where.makerId = req.user.id;
      }

      if (Number.isFinite(principalId as any) && principalId) where.principalId = principalId;
      if (quizCode) where.quizCode = quizCode;
      if (type === 'wholesaler' || type === 'delivery') where.type = type;

      const [payments, total] = await Promise.all([
        this.prisma.operationalPayment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            principal: { select: { id: true, firstName: true, lastName: true, email: true } },
            maker: { select: { id: true, firstName: true, lastName: true, email: true } },
            confirmedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        this.prisma.operationalPayment.count({ where }),
      ]);

      return ResponseUtil.success(res, {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, 'Operational payments retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve operational payments', 500, error);
    }
  };

  getOrderById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.ensureChecker(req, res)) return;

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return ResponseUtil.error(res, 'Invalid order ID', 400);

      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          items: { include: { supplement: true } },
          payment: true,
        },
      });

      if (!order) return ResponseUtil.error(res, 'Order not found', 404);
      return ResponseUtil.success(res, { order }, 'Order retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve order', 500, error);
    }
  };

  getPrincipalPayments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.ensureChecker(req, res)) return;

      const principalId = Number(req.params.principalId);
      if (!Number.isFinite(principalId) || principalId <= 0) return ResponseUtil.error(res, 'Invalid principal ID', 400);

      const orderId = req.query.orderId ? Number(req.query.orderId) : null;
      const where: any = {
        order: {
          items: {
            some: {
              supplement: { userId: principalId },
            },
          },
        },
      };
      if (orderId && Number.isFinite(orderId)) where.orderId = orderId;

      const payments = await this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          order: { include: { items: { include: { supplement: true } } } },
        },
      });

      return ResponseUtil.success(res, { payments }, 'Principal payments retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve principal payments', 500, error);
    }
  };

  getPrincipalAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.ensureChecker(req, res)) return;

      const principalId = Number(req.params.principalId);
      if (!Number.isFinite(principalId) || principalId <= 0) return ResponseUtil.error(res, 'Invalid principal ID', 400);

      const [wallet, withdrawals, payments, operationalPayments] = await Promise.all([
        this.prisma.wallet.findUnique({ where: { userId: principalId } }),
        this.prisma.withdrawal.findMany({ where: { userId: principalId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        this.prisma.payment.findMany({
          where: {
            status: 'success',
            order: { items: { some: { supplement: { userId: principalId } } } },
          },
          select: { amount: true },
        }),
        this.prisma.operationalPayment.findMany({
          where: { principalId },
          select: { amount: true, type: true },
        }),
      ]);

      const revenueTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const opsTotals = operationalPayments.reduce(
        (acc: any, p: any) => {
          const key = String(p.type || '').toLowerCase();
          acc[key] = (acc[key] || 0) + Number(p.amount || 0);
          acc.total = (acc.total || 0) + Number(p.amount || 0);
          return acc;
        },
        { total: 0, wholesaler: 0, delivery: 0 }
      );

      return ResponseUtil.success(res, {
        account: {
          walletBalance: wallet?.balance || 0,
          revenueTotal,
          operationalPayments: opsTotals,
          withdrawals,
        },
      }, 'Principal account retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve principal account', 500, error);
    }
  };

  getBenfekPacks = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      const code = String(req.params.code || '').trim().toUpperCase();
      const packs = await this.prisma.researcherPack.findMany({
        where: { quizCode: code },
        include: { items: { include: { supplement: true } } },
        orderBy: { updatedAt: 'desc' },
      });

      return ResponseUtil.success(res, { packs }, 'Benfek packs retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek packs', 500, error);
    }
  };

  getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.isChecker(req)) return ResponseUtil.error(res, 'Checker access required', 403);

      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        this.prisma.inbox.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.inbox.count({ where: { userId: req.user.id } }),
      ]);

      return ResponseUtil.success(res, {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, 'Notifications retrieved');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve notifications', 500, error);
    }
  };

  markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      if (!this.isChecker(req)) return ResponseUtil.error(res, 'Checker access required', 403);

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return ResponseUtil.error(res, 'Invalid notification id', 400);

      const updated = await this.prisma.inbox.updateMany({
        where: { id, userId: req.user.id },
        data: { isRead: true },
      });

      if (updated.count === 0) return ResponseUtil.error(res, 'Notification not found', 404);
      return ResponseUtil.success(res, null, 'Notification marked as read');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to update notification', 500, error);
    }
  };

  deletePack = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensureResearcher(req, res)) return;
      await this.prisma.researcherPack.delete({ where: { id: Number(req.params.id) } });
      return ResponseUtil.success(res, null, 'Pack deleted');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete pack', 500, error);
    }
  };
}
