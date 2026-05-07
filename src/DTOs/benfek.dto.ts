import { z } from 'zod';

export const SaveGamePointsSchema = z.object({
  points: z.number().int().nonnegative('Points cannot be negative'),
  quizCode: z.string().optional().transform((value) => value?.trim().toUpperCase()),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type SaveGamePointsDTO = z.infer<typeof SaveGamePointsSchema>;

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

export const UpdateBenfekProfileSchema = z
  .object({
    email: z.string().email('Invalid email').optional(),
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
    phone: optionalTrimmedString,
    whatsappNumber: optionalTrimmedString,
    deliveryAddress: optionalTrimmedString,
    dropOffAddress: optionalTrimmedString,
    preferredPharmacyName: optionalTrimmedString,
    preferredPharmacyPhone: optionalTrimmedString,
    benfekName: optionalTrimmedString,
    benfekAge: optionalTrimmedString,
    benfekGender: optionalTrimmedString,
    allergies: optionalTrimmedString,
    scares: optionalTrimmedString,
    familyCondition: optionalTrimmedString,
    medications: optionalTrimmedString,
    hasCurrentCondition: z.boolean().optional(),
    basicNickname: optionalTrimmedString,
    basicWeight: optionalTrimmedString,
    basicHeight: optionalTrimmedString,
    lifestyleHabits: optionalTrimmedString,
    lifestyleFun: optionalTrimmedString,
    lifestyleDesires: optionalTrimmedString,
    lifestylePriority: optionalTrimmedString,
    preferenceDrugForm: optionalTrimmedString,
    preferenceBudget: z.number().finite().nonnegative().optional(),
  })
  .refine((data) => {
    if (data.preferredPharmacyPhone && !data.preferredPharmacyName) return false;
    return true;
  }, {
    message: 'Pharmacy name is required when pharmacy phone is provided',
    path: ['preferredPharmacyName'],
  });

export const ChangeBenfekPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type UpdateBenfekProfileDTO = z.infer<typeof UpdateBenfekProfileSchema>;
export type ChangeBenfekPasswordDTO = z.infer<typeof ChangeBenfekPasswordSchema>;
