import { PrismaClient, QuizCode } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';

export interface CreateQuizCodeDTO {
  createdBy: number;
  benfekName: string;
  benfekPhone: string;
  allergies?: string;
  scares?: string;
  familyCondition?: string;
  medications?: string;
  hasCurrentCondition?: boolean;
  expiresAt?: Date;
}

export interface QuizCodeWithCreator extends QuizCode {
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@injectable()
export class QuizCodeRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * Generate a unique quiz code
   */
  generateCode(): string {
    // Generate a short, readable code (8 characters)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new quiz code with benfek data
   */
  async create(data: CreateQuizCodeDTO): Promise<QuizCode> {
    const code = this.generateCode();
    
    return this.prisma.quizCode.create({
      data: {
        code,
        createdBy: data.createdBy,
        benfekName: data.benfekName,
        benfekPhone: data.benfekPhone,
        allergies: data.allergies,
        scares: data.scares,
        familyCondition: data.familyCondition,
        medications: data.medications,
        hasCurrentCondition: data.hasCurrentCondition || false,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find a quiz code by its code string
   */
  async findByCode(code: string): Promise<QuizCodeWithCreator | null> {
    return this.prisma.quizCode.findUnique({
      where: { code },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as Promise<QuizCodeWithCreator | null>;
  }

  /**
   * Validate a quiz code - check if it exists, is not used, and not expired
   */
  async validateCode(code: string): Promise<{ 
    valid: boolean; 
    message: string; 
    quizCode?: QuizCodeWithCreator 
  }> {
    const quizCode = await this.findByCode(code);

    if (!quizCode) {
      return { valid: false, message: 'Invalid quiz code' };
    }

    if (quizCode.isUsed) {
      return { valid: false, message: 'This quiz code has already been used' };
    }

    if (quizCode.expiresAt && new Date() > quizCode.expiresAt) {
      return { valid: false, message: 'This quiz code has expired' };
    }

    return { valid: true, message: 'Quiz code is valid', quizCode };
  }

  /**
   * Mark a quiz code as used
   */
  async markAsUsed(code: string, userId: number): Promise<QuizCode> {
    return this.prisma.quizCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedBy: userId,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Get quiz codes created by a specific principal
   */
  async findByCreator(createdBy: number, skip?: number, take?: number): Promise<{ codes: QuizCode[]; total: number }> {
    const where = { createdBy };
    const [codes, total] = await Promise.all([
      this.prisma.quizCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 50,
      }),
      this.prisma.quizCode.count({ where }),
    ]);

    return { codes, total };
  }

  /**
   * Get benfeks for a principal with optional name search
   */
  async findBenfeksByCreator(
    createdBy: number,
    benfekName?: string,
    skip?: number,
    take?: number
  ): Promise<{ codes: QuizCode[]; total: number }> {
    const where: any = { createdBy };
    if (benfekName) {
      where.benfekName = { contains: benfekName };
    }

    const [codes, total] = await Promise.all([
      this.prisma.quizCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 50,
      }), 
      this.prisma.quizCode.count({ where }),
    ]);

    return { codes, total };
  }

  /**
   * Get all quiz codes with pagination
   */
  async findAll(skip?: number, take?: number): Promise<{ codes: QuizCodeWithCreator[]; total: number }> {
    const [codes, total] = await Promise.all([
      this.prisma.quizCode.findMany({
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 50,
      }),
      this.prisma.quizCode.count(),
    ]);

    return { codes: codes as QuizCodeWithCreator[], total };
  }

  /**
   * Delete a quiz code
   */
  async delete(id: number): Promise<QuizCode> {
    return this.prisma.quizCode.delete({
      where: { id },
    });
  }
}
