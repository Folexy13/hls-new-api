import { z } from 'zod';

export const CreateQuizCodeSchema = z.object({
  benfekName: z.string().min(1, 'Benfek name is required'),
  benfekPhone: z.string().min(1, 'Benfek phone is required'),
  allergies: z.string().optional(),
  scares: z.string().optional(),
  familyCondition: z.string().optional(),
  medications: z.string().optional(),
  hasCurrentCondition: z.boolean().optional(),
});

export const ValidateQuizCodeSchema = z.object({
  code: z.string().min(1, 'Quiz code is required'),
});

export type CreateQuizCodeDTO = z.infer<typeof CreateQuizCodeSchema>;
export type ValidateQuizCodeDTO = z.infer<typeof ValidateQuizCodeSchema>;
