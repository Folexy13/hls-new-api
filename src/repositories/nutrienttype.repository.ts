import { PrismaClient, NutrientType } from '@prisma/client';
import { injectable, inject } from 'inversify';

@injectable()
export class NutrientTypeRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}


  async findAll(skip = 0, take = 10): Promise<{ items: any[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.nutrientType.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          basic: true,
          lifestyle: true,
          preference: true,
          user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.nutrientType.count(),
    ]);
    return { items, total };
  }


  async findById(id: number): Promise<any | null> {
    return this.prisma.nutrientType.findUnique({
      where: { id },
      include: {
        basic: true,
        lifestyle: true,
        preference: true,
        user: { select: { id: true, email: true } },
      },
    });
  }


  async findByUserId(userId: number): Promise<any | null> {
    return this.prisma.nutrientType.findUnique({
      where: { userId },
      include: {
        basic: true,
        lifestyle: true,
        preference: true,
        user: { select: { id: true, email: true } },
      },
    });
  }


  async findByCode(code: string): Promise<any | null> {
    return this.prisma.nutrientType.findFirst({
      where: { code },
      include: {
        basic: true,
        lifestyle: true,
        preference: true,
        user: { select: { id: true, email: true } },
      },
    });
  }


  async createWithNested(data: any): Promise<any> {
    // Accepts: { code, userId, basic, lifestyle, preference }
    return this.prisma.nutrientType.create({
      data: {
        code: data.code,
        userId: data.userId,
        basic: data.basic ? { create: data.basic } : undefined,
        lifestyle: data.lifestyle ? { create: data.lifestyle } : undefined,
        preference: data.preference ? { create: data.preference } : undefined,
      },
      include: {
        basic: true,
        lifestyle: true,
        preference: true,
        user: { select: { id: true, email: true } },
      },
    });
  }

  async update(id: number, data: Partial<NutrientType>): Promise<NutrientType> {
    return this.prisma.nutrientType.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.nutrientType.delete({ where: { id } });
  }
}
