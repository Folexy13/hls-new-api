import { Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import { SaveGamePointsSchema } from '../DTOs/benfek.dto';

@injectable()
export class BenfekController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

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
