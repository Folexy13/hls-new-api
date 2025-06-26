import { z } from 'zod';

export const PaystackInitializeSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(), // amount in kobo
  metadata: z.record(z.any()).optional(),
});

export type PaystackInitializeDTO = z.infer<typeof PaystackInitializeSchema>;
