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
