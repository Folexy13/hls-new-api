import { z } from 'zod';

export const SaveGamePointsSchema = z.object({
  points: z.number().int().nonnegative('Points cannot be negative'),
  quizCode: z.string().optional().transform((value) => value?.trim().toUpperCase()),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type SaveGamePointsDTO = z.infer<typeof SaveGamePointsSchema>;
