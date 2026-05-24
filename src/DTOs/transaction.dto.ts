import { z } from 'zod';

export const CheckoutFromCartSchema = z.object({
  shippingAddress: z.string().min(1, 'Shipping address is required').optional(),
  notes: z.string().optional(),
});

export const VerifyTransactionSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
});

export type CheckoutFromCartDTO = z.infer<typeof CheckoutFromCartSchema>;
export type VerifyTransactionDTO = z.infer<typeof VerifyTransactionSchema>;
