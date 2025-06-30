import { z } from 'zod';
import { CreateBasicSchema } from './basic.dto';
import { CreateLifestyleSchema } from './lifestyle.dto';
import { CreatePreferenceSchema } from './preference.dto';

export const CreateNutrientTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  userId: z.number().int().positive('User ID must be a positive integer'),
  basic: CreateBasicSchema.optional(),
  lifestyle: CreateLifestyleSchema.optional(),
  preference: CreatePreferenceSchema.optional(),
});

export const UpdateNutrientTypeSchema = z.object({
  code: z.string().min(1).optional(),
  basic: CreateBasicSchema.partial().optional(),
  lifestyle: CreateLifestyleSchema.partial().optional(),
  preference: CreatePreferenceSchema.partial().optional(),
});

export const GetNutrientTypeByCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type CreateNutrientTypeDTO = z.infer<typeof CreateNutrientTypeSchema>;
export type UpdateNutrientTypeDTO = z.infer<typeof UpdateNutrientTypeSchema>;
export type GetNutrientTypeByCodeDTO = z.infer<typeof GetNutrientTypeByCodeSchema>;
