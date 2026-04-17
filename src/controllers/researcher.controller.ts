import { Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import {
  DispatchPackSchema,
  ResearcherSupplementSchema,
  UpdateResearcherSupplementSchema,
  VerifyBenfekCodeSchema,
} from '../DTOs/researcher.dto';

@injectable()
export class ResearcherController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  private ensureResearcher(req: AuthenticatedRequest, res: Response): boolean {
    if (!['researcher', 'principal'].includes(req.user.role)) {
      ResponseUtil.error(res, 'Only researchers can access this resource', 403);
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

      const packs = await this.prisma.researcherPack.findMany({
        where: { quizCode: code },
        include: { items: { include: { supplement: true } } },
        orderBy: { updatedAt: 'desc' },
      });

      return ResponseUtil.success(res, {
        benfek: {
          code: quizCode.code,
          name: quizCode.benfekName,
          phone: quizCode.benfekPhone,
          age: quizCode.benfekAge,
          gender: quizCode.benfekGender,
          registrationStatus: quizCode.isUsed ? 'registered' : 'not_registered',
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
      const skip = (page - 1) * limit;
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
          { manufacturer: { contains: search } },
          { category: { contains: search } },
        ];
      }

      const [supplements, total] = await Promise.all([
        this.prisma.supplement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.supplement.count({ where }),
      ]);

      return ResponseUtil.success(res, {
        supplements,
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
      const supplement = await this.prisma.supplement.create({
        data: {
          ...data,
          imageUrl: data.imageUrl || null,
          category: data.category || null,
          manufacturer: data.manufacturer || null,
          dosageForm: data.dosageForm || null,
          budgetRange: data.budgetRange || null,
          tags: data.tags,
          userId: req.user.id,
        },
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
      const supplement = await this.prisma.supplement.update({
        where: { id },
        data: {
          ...data,
          tags: data.tags,
        },
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
      const quizCode = await this.prisma.quizCode.findUnique({ where: { code: data.code } });
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

      await this.prisma.researcherPackItem.deleteMany({
        where: {
          packId: pack.id,
          supplementId: { notIn: data.supplementIds },
        },
      });

      await Promise.all(
        data.supplementIds.map((supplementId) =>
          this.prisma.researcherPackItem.upsert({
            where: {
              packId_supplementId: {
                packId: pack.id,
                supplementId,
              },
            },
            create: { packId: pack.id, supplementId, quantity: 1 },
            update: { quantity: 1 },
          })
        )
      );

      const result = await this.prisma.researcherPack.findUnique({
        where: { id: pack.id },
        include: { items: { include: { supplement: true } } },
      });

      return ResponseUtil.success(res, { pack: result }, 'Pack dispatched to benfek');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to dispatch pack', 500, error);
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
