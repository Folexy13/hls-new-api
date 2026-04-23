import { z } from 'zod';

export const SaveGamePointsSchema = z.object({
  points: z.number().int().nonnegative('Points cannot be negative'),
  quizCode: z.string().optional().transform((value) => value?.trim().toUpperCase()),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type SaveGamePointsDTO = z.infer<typeof SaveGamePointsSchema>;

const optionalTrimmedString = () =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    });

export const UpdateBenfekProfileSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: optionalTrimmedString(),
  lastName: optionalTrimmedString(),
  phone: optionalTrimmedString(),
  whatsappNumber: optionalTrimmedString(),
  deliveryAddress: optionalTrimmedString(),
  dropOffAddress: optionalTrimmedString(),
  benfekName: optionalTrimmedString(),
  benfekAge: optionalTrimmedString(),
  benfekGender: optionalTrimmedString(),
  allergies: optionalTrimmedString(),
  scares: optionalTrimmedString(),
  familyCondition: optionalTrimmedString(),
  medications: optionalTrimmedString(),
  hasCurrentCondition: z.boolean().optional(),
  basicNickname: optionalTrimmedString(),
  basicWeight: optionalTrimmedString(),
  basicHeight: optionalTrimmedString(),
  lifestyleHabits: optionalTrimmedString(),
  lifestyleFun: optionalTrimmedString(),
  lifestylePriority: optionalTrimmedString(),
  preferenceDrugForm: optionalTrimmedString(),
  preferenceBudget: z.number().nonnegative('Budget must be 0 or more').optional(),
});

export const ChangeBenfekPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export const CreateSupportTicketSchema = z.object({
  category: z.string().min(2, 'Category is required').transform((value) => value.trim()),
  subject: z.string().min(3, 'Subject is required').transform((value) => value.trim()),
  message: z.string().min(10, 'Message must be at least 10 characters').transform((value) => value.trim()),
});

export type UpdateBenfekProfileDTO = z.infer<typeof UpdateBenfekProfileSchema>;
export type ChangeBenfekPasswordDTO = z.infer<typeof ChangeBenfekPasswordSchema>;
export type CreateSupportTicketDTO = z.infer<typeof CreateSupportTicketSchema>;
