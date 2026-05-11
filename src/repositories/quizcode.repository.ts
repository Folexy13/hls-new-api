import { PrismaClient, QuizCode } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { ConflictError } from '../utilities/errors';
import { getPhoneSearchVariants, normalizeEmail, normalizePhone } from '../utilities/contact-normalizer.utility';

export interface CreateQuizCodeDTO {
  createdBy: number;
  benfekName: string;
  benfekEmail: string;
  benfekPhone: string;
  benfekAge: string;
  benfekGender: string;
  benfekWeight: string;
  benfekHeight: string;
  allergies?: string[];
  scares?: string[];
  familyCondition?: string[];
  medications?: string[];
  currentConditions?: string[];
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
    const benfekEmail = normalizeEmail(data.benfekEmail);
    const benfekPhone = normalizePhone(data.benfekPhone);

    const existing = await this.findExistingBenfekContact(benfekEmail, benfekPhone);
    if (existing) {
      const contactType = normalizePhone(existing.benfekPhone) === benfekPhone ? 'phone number' : 'email address';
      const message = existing.isUsed
        ? `This Benfek has already registered with this ${contactType}. Please use the existing registered profile.`
        : `A quiz code already exists for this Benfek ${contactType}. Please use the existing code instead.`;

      throw new ConflictError(message);
    }

    return this.prisma.quizCode.create({
      data: {
        code,
        createdBy: data.createdBy,
        benfekName: data.benfekName,
        benfekEmail,
        benfekPhone,
        benfekAge: data.benfekAge,
        benfekGender: data.benfekGender,
        basicWeight: data.benfekWeight,
        basicHeight: data.benfekHeight,
        allergies: (data.allergies as unknown as Prisma.InputJsonValue | undefined),
        scares: (data.scares as unknown as Prisma.InputJsonValue | undefined),
        familyCondition: (data.familyCondition as unknown as Prisma.InputJsonValue | undefined),
        medications: (data.medications as unknown as Prisma.InputJsonValue | undefined),
        currentConditions: (data.currentConditions as unknown as Prisma.InputJsonValue | undefined),
        hasCurrentCondition: data.hasCurrentCondition || false,
        expiresAt: data.expiresAt,
      } as any,
    });
  }

  async findExistingBenfekContact(benfekEmail?: string, benfekPhone?: string): Promise<QuizCode | null> {
    const conditions = [
      ...(benfekEmail ? [{ benfekEmail }] : []),
      ...getPhoneSearchVariants(benfekPhone).map((phone) => ({ benfekPhone: phone })),
    ];

    if (!conditions.length) return null;

    return this.prisma.quizCode.findFirst({
      where: { OR: conditions },
      orderBy: [
        { isUsed: 'desc' },
        { usedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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
  async markAsUsed(code: string, userId?: number | null): Promise<QuizCode> {
    return this.prisma.quizCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedBy: userId ?? null,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Save benfek quiz answers and mark as used (public completion flow)
   */
  async completeBenfekQuiz(
    code: string,
    data: {
      basicNickname?: string;
      basicWeight?: string;
      basicHeight?: string;
      lifestyleHabits: string;
      lifestyleFun: string;
      lifestyleDesires: string;
      lifestylePriority: string;
      preferenceDrugForm: string;
      preferenceBudget: number;
    }
  ): Promise<QuizCode> {
    return this.prisma.quizCode.update({
      where: { code },
      data: {
        basicNickname: data.basicNickname,
        ...(data.basicWeight ? { basicWeight: data.basicWeight } : {}),
        ...(data.basicHeight ? { basicHeight: data.basicHeight } : {}),
        lifestyleHabits: data.lifestyleHabits,
        lifestyleFun: data.lifestyleFun,
        lifestyleDesires: data.lifestyleDesires,
        lifestylePriority: data.lifestylePriority,
        preferenceDrugForm: data.preferenceDrugForm,
        preferenceBudget: data.preferenceBudget,
        isUsed: true,
        usedAt: new Date(),
        usedBy: null,
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

    const allCodes = await this.prisma.quizCode.findMany({
      where,
      orderBy: [
        { isUsed: 'desc' },
        { usedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });
    const deduped = this.dedupeBenfeksByContact(allCodes);
    const start = skip || 0;
    const end = start + (take || 50);

    return { codes: deduped.slice(start, end), total: deduped.length };
  }

  private dedupeBenfeksByContact(codes: QuizCode[]): QuizCode[] {
    const byContact = new Map<string, QuizCode>();
    const result: QuizCode[] = [];

    for (const code of codes) {
      const contactKey = normalizePhone(code.benfekPhone) || normalizeEmail(code.benfekEmail) || `id:${code.id}`;
      const existing = byContact.get(contactKey);

      if (!existing) {
        byContact.set(contactKey, code);
        result.push(code);
        continue;
      }

      if (this.shouldPrioritizeBenfek(code, existing)) {
        byContact.set(contactKey, code);
        const index = result.findIndex((item) => item.id === existing.id);
        if (index >= 0) result[index] = code;
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private shouldPrioritizeBenfek(candidate: QuizCode, current: QuizCode): boolean {
    if (candidate.isUsed !== current.isUsed) return candidate.isUsed;

    const candidateTime = candidate.usedAt || candidate.createdAt;
    const currentTime = current.usedAt || current.createdAt;
    if (candidateTime.getTime() !== currentTime.getTime()) {
      return candidateTime.getTime() > currentTime.getTime();
    }

    return candidate.id > current.id;
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

  /**
   * Update benfek health details
   */
  async updateBenfekHealthDetails(
    id: number,
    data: {
      allergies?: string[];
      scares?: string[];
      familyCondition?: string[];
      medications?: string[];
      currentConditions?: string[];
      hasCurrentCondition?: boolean;
    }
  ): Promise<QuizCode> {
    return this.prisma.quizCode.update({
      where: { id },
      data: {
        allergies: data.allergies !== undefined ? (data.allergies as unknown as Prisma.InputJsonValue | undefined) : undefined,
        scares: data.scares !== undefined ? (data.scares as unknown as Prisma.InputJsonValue | undefined) : undefined,
        familyCondition: data.familyCondition !== undefined ? (data.familyCondition as unknown as Prisma.InputJsonValue | undefined) : undefined,
        medications: data.medications !== undefined ? (data.medications as unknown as Prisma.InputJsonValue | undefined) : undefined,
        currentConditions: data.currentConditions !== undefined ? (data.currentConditions as unknown as Prisma.InputJsonValue | undefined) : undefined,
        hasCurrentCondition: data.hasCurrentCondition !== undefined ? data.hasCurrentCondition : undefined,
      },
    });
  }
}
