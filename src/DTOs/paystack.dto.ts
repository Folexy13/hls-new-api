import { z } from 'zod';

export const PaystackInitializeSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(), // amount in kobo
  metadata: z.record(z.any()).optional(),
  callbackUrl: z.string().url().optional(),
});

export type PaystackInitializeDTO = z.infer<typeof PaystackInitializeSchema>;

export const PaystackPackCheckoutSchema = z.object({
  packId: z.string().min(1),
  callbackUrl: z.string().url().optional(),
});

export type PaystackPackCheckoutDTO = z.infer<typeof PaystackPackCheckoutSchema>;
