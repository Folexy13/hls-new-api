import { z } from 'zod';

export const WithdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  bankName: z.string().min(2, 'Bank name must be at least 2 characters'),
  accountNumber: z.string().min(10, 'Invalid account number'),
  accountName: z.string().min(2, 'Account name must be at least 2 characters'),
});

export type WithdrawalDTO = z.infer<typeof WithdrawalSchema>;
