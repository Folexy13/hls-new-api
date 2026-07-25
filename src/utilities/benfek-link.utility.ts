import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient, type QuizCode, type User } from '@prisma/client';
import { getPhoneSearchVariants, normalizeEmail, normalizePhone } from './contact-normalizer.utility';

export const SYSTEM_PRINCIPAL_EMAIL = 'system-benfek-principal@hlsnigeria.com';

const QUIZ_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateQuizCode = () => {
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += QUIZ_CODE_CHARS.charAt(Math.floor(Math.random() * QUIZ_CODE_CHARS.length));
  }
  return code;
};

const splitFullName = (fullName?: string | null) => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const shouldHydrateBenfekNameFromQuizCode = (
  benfek: { firstName?: string | null; lastName?: string | null; email?: string | null },
  quizCodeName?: string | null,
) => {
  const currentFullName = `${benfek.firstName || ''} ${benfek.lastName || ''}`.trim().toLowerCase();
  const normalizedQuizCodeName = String(quizCodeName || '').trim().toLowerCase();
  const emailLocalPart = normalizeEmail(benfek.email || '').split('@')[0];

  if (!normalizedQuizCodeName) return false;
  if (!currentFullName) return true;
  if (currentFullName === normalizedQuizCodeName) return false;
  if (currentFullName === 'benfek user') return true;
  if (emailLocalPart && currentFullName === emailLocalPart) return true;

  return false;
};

const createUniqueQuizCode = async (
  prisma: PrismaClient,
  data: {
    createdBy: number;
    usedBy: number;
    benfekName: string;
    benfekEmail: string;
    benfekPhone: string;
    benfekAge?: string;
    benfekGender?: string;
  },
): Promise<QuizCode> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await prisma.quizCode.create({
        data: {
          code: generateQuizCode(),
          createdBy: data.createdBy,
          usedBy: data.usedBy,
          usedAt: new Date(),
          isUsed: true,
          benfekName: data.benfekName,
          benfekEmail: normalizeEmail(data.benfekEmail),
          benfekPhone: normalizePhone(data.benfekPhone),
          benfekAge: data.benfekAge?.trim() || '',
          benfekGender: data.benfekGender?.trim() || '',
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
    }
  }

  throw new Error('Failed to generate a unique benfek code.');
};

export const ensureSystemPrincipal = async (prisma: PrismaClient): Promise<User> => {
  const existing = await prisma.user.findUnique({
    where: { email: SYSTEM_PRINCIPAL_EMAIL },
  });

  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  return prisma.user.create({
    data: {
      email: SYSTEM_PRINCIPAL_EMAIL,
      username: SYSTEM_PRINCIPAL_EMAIL,
      password: hashedPassword,
      firstName: 'HLS',
      lastName: 'System',
      role: 'principal',
      profession: 'hls ap',
      currentPlaceOfWork: 'HLS Pharmacy',
      wallet: {
        create: {
          balance: 0,
        },
      },
    } as any,
  });
};

export const isSystemPrincipalEmail = (email?: string | null) =>
  normalizeEmail(email) === SYSTEM_PRINCIPAL_EMAIL;

export const ensureOperationalQuizCodeForBenfek = async (
  prisma: PrismaClient,
  benfek: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  },
  options?: {
    createdBy?: number;
  },
): Promise<QuizCode> => {
  const existingByUser = await prisma.quizCode.findFirst({
    where: { usedBy: benfek.id, isUsed: true },
    orderBy: [{ usedAt: 'desc' }, { updatedAt: 'desc' }],
  });

  if (existingByUser) return existingByUser;

  const normalizedEmail = normalizeEmail(benfek.email);
  const normalizedPhone = normalizePhone(benfek.phone);
  const contactWhere = [
    ...(normalizedEmail ? [{ benfekEmail: normalizedEmail }] : []),
    ...getPhoneSearchVariants(normalizedPhone).map((phone) => ({ benfekPhone: phone })),
  ];

  if (contactWhere.length) {
    const existingByContact = await prisma.quizCode.findFirst({
      where: { OR: contactWhere },
      orderBy: [
        { isUsed: 'desc' },
        { usedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (existingByContact) {
      if (shouldHydrateBenfekNameFromQuizCode(benfek, existingByContact.benfekName)) {
        const hydratedName = splitFullName(existingByContact.benfekName);
        await prisma.user.update({
          where: { id: benfek.id },
          data: {
            firstName: hydratedName.firstName || benfek.firstName,
            lastName: hydratedName.lastName || benfek.lastName,
          },
        });
      }

      return prisma.quizCode.update({
        where: { id: existingByContact.id },
        data: {
          usedBy: benfek.id,
          usedAt: new Date(),
          isUsed: true,
          benfekName: `${benfek.firstName} ${benfek.lastName}`.trim() || existingByContact.benfekName,
          benfekEmail: normalizedEmail || existingByContact.benfekEmail,
          benfekPhone: normalizedPhone || existingByContact.benfekPhone,
          ...(options?.createdBy ? { createdBy: options.createdBy } : {}),
        },
      });
    }
  }

  const systemPrincipal = options?.createdBy
    ? null
    : await ensureSystemPrincipal(prisma);

  return createUniqueQuizCode(prisma, {
    createdBy: options?.createdBy || systemPrincipal!.id,
    usedBy: benfek.id,
    benfekName: `${benfek.firstName} ${benfek.lastName}`.trim() || benfek.email,
    benfekEmail: normalizedEmail,
    benfekPhone: normalizedPhone,
  });
};
