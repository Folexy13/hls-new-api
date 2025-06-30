import { z } from 'zod';

export const CreatePreferenceSchema = z.object({
  drugForm: z.string().min(1),
  minBudget: z.number().min(0),
  maxBudget: z.number().min(0),
});

export const UpdatePreferenceSchema = z.object({
  drugForm: z.string().min(1).optional(),
  minBudget: z.number().min(0).optional(),
  maxBudget: z.number().min(0).optional(),
});

export type CreatePreferenceDTO = z.infer<typeof CreatePreferenceSchema>;
export type UpdatePreferenceDTO = z.infer<typeof UpdatePreferenceSchema>;
