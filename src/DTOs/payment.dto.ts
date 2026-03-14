import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
  method: z.string().min(1, 'Method is required'),
  status: z.string().min(1, 'Status is required'),
  paystackReference: z.string().optional().nullable(),
  paystackChannel: z.string().optional().nullable(),
  currency: z.string().min(1, 'Currency is required').default('NGN'),
  paidAt: z.coerce.date().optional().nullable(),
  metadata: z.string().optional().nullable(),
});

export type CreatePaymentDTO = z.infer<typeof CreatePaymentSchema>;
