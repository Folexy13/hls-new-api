import { z } from 'zod';

export const CreateBasicSchema = z.object({
  gender: z.string().min(1),
  nickname: z.string().optional(),
  age: z.string().min(1),
  weight: z.string().min(1),
  height: z.string().min(1),
});

export const UpdateBasicSchema = z.object({
  gender: z.string().min(1).optional(),
  nickname: z.string().optional(),
  age: z.string().min(1).optional(),
  weight: z.string().min(1).optional(),
  height: z.string().min(1).optional(),
});

export type CreateBasicDTO = z.infer<typeof CreateBasicSchema>;
export type UpdateBasicDTO = z.infer<typeof UpdateBasicSchema>;
