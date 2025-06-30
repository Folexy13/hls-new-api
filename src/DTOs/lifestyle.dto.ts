import { z } from 'zod';

export const CreateLifestyleSchema = z.object({
  habit: z.string().min(1),
  fun: z.string().min(1),
  routine: z.string().min(1),
  career: z.string().min(1),
});

export const UpdateLifestyleSchema = z.object({
  habit: z.string().min(1).optional(),
  fun: z.string().min(1).optional(),
  routine: z.string().min(1).optional(),
  career: z.string().min(1).optional(),
});

export type CreateLifestyleDTO = z.infer<typeof CreateLifestyleSchema>;
export type UpdateLifestyleDTO = z.infer<typeof UpdateLifestyleSchema>;
