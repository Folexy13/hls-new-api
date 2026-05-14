import { z } from 'zod';

export const WithdrawalSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal amount is ₦100.00'),
  bankName: z.string().min(2, 'Bank name must be at least 2 characters'),
  accountNumber: z.string().min(10, 'Invalid account number'),
  accountName: z.string().min(2, 'Account name must be at least 2 characters'),
});

export type WithdrawalDTO = z.infer<typeof WithdrawalSchema>;
