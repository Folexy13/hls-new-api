import { z } from 'zod';

export const PaystackInitializeSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(), // amount in kobo
  metadata: z.record(z.any()).optional(),
  callbackUrl: z.string().trim().optional(),
});

export type PaystackInitializeDTO = z.infer<typeof PaystackInitializeSchema>;

export const PaystackPackCheckoutSchema = z.object({
  packId: z.string().trim().min(1, 'Pack ID is required'),
  shippingAddress: z.string().trim().min(1, 'Delivery address is required'),
  callbackUrl: z.string().trim().optional(),
});

export type PaystackPackCheckoutDTO = z.infer<typeof PaystackPackCheckoutSchema>;
