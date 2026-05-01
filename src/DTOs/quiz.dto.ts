import { z } from 'zod';

const optionalMultiValueField = z
  .union([z.array(z.string()), z.string(), z.undefined()])
  .transform((value) => {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => item.trim()).filter(Boolean);
      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  });

export const CreateQuizCodeSchema = z.object({
  benfekName: z.string().min(1, 'Benfek name is required'),
  benfekPhone: z.string().min(1, 'Benfek phone is required'),
  benfekAge: z.string().min(1, 'Benfek age is required'),
  benfekGender: z.string().min(1, 'Benfek gender is required'),
  allergies: optionalMultiValueField,
  scares: optionalMultiValueField,
  familyCondition: optionalMultiValueField,
  medications: optionalMultiValueField,
  currentConditions: optionalMultiValueField,
  hasCurrentCondition: z.boolean().optional(),
});

export const ValidateQuizCodeSchema = z.object({
  code: z.string().min(1, 'Quiz code is required'),
});

export const UseQuizCodeSchema = z.object({
  code: z.string().min(1, 'Quiz code is required'),
});

export const CompleteBenfekQuizSchema = z.object({
  code: z.string().min(1, 'Quiz code is required'),
  basics: z.object({
    nickname: z.string().optional(),
    weight: z.string().min(1, 'Weight is required'),
    height: z.string().min(1, 'Height is required'),
  }),
  lifestyle: z.object({
    habits: z.string().min(1, 'Habits is required'),
    funActivities: z.string().min(1, 'Fun activities is required'),
    priority: z.string().min(1, 'Priority is required'),
  }),
  preferences: z.object({
    drugForm: z.string().min(1, 'Drug form is required'),
    budget: z.number().positive('Budget must be positive'),
  }),
});

export type CreateQuizCodeDTO = z.infer<typeof CreateQuizCodeSchema>;
export type ValidateQuizCodeDTO = z.infer<typeof ValidateQuizCodeSchema>;
export type UseQuizCodeDTO = z.infer<typeof UseQuizCodeSchema>;
export type CompleteBenfekQuizDTO = z.infer<typeof CompleteBenfekQuizSchema>;
