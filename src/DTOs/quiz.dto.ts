import { z } from 'zod';

export const CreateQuizCodeSchema = z.object({
  benfekName: z.string().min(1, 'Benfek name is required'),
  benfekPhone: z.string().min(1, 'Benfek phone is required'),
  benfekAge: z.string().min(1, 'Benfek age is required'),
  benfekGender: z.string().min(1, 'Benfek gender is required'),
  allergies: z.string().optional(),
  scares: z.string().optional(),
  familyCondition: z.string().optional(),
  medications: z.string().optional(),
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
