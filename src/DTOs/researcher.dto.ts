import { z } from 'zod';

const WholesalerDetailSchema = z.object({
  name: z.string().min(2, 'Wholesaler name is required').transform((value) => value.trim()),
  price: z.number().nonnegative('Wholesale price cannot be negative'),
  contact: z.string().min(2, 'Wholesaler contact is required').transform((value) => value.trim()),
  address: z.string().min(2, 'Wholesaler address is required').transform((value) => value.trim()),
});

export const ResearcherSupplementSchema = z.object({
  name: z.string().min(2, 'Name is required').transform((value) => value.trim()),
  description: z.string().min(2, 'Description is required').transform((value) => value.trim()),
  price: z.number().nonnegative('Price cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  dosageForm: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  tags: z.record(z.array(z.string())).optional().default({}),
  status: z.string().optional().default('in_stock'),
  wholesalers: z.array(WholesalerDetailSchema).optional().default([]),
});

export const UpdateResearcherSupplementSchema = ResearcherSupplementSchema.partial();

export const VerifyBenfekCodeSchema = z.object({
  code: z.string().min(1, 'Benfek code is required').transform((value) => value.trim().toUpperCase()),
});

export const DispatchPackSchema = z.object({
  code: z.string().min(1, 'Benfek code is required').transform((value) => value.trim().toUpperCase()),
  packId: z.string().min(1, 'Pack ID is required'),
  packName: z.string().min(1, 'Pack name is required'),
  supplementIds: z.array(z.number().int().positive()).min(1, 'Select at least one supplement'),
  status: z.string().optional().default('dispatched'),
});

export const CreateOperationalPaymentSchema = z.object({
  type: z.enum(['wholesaler', 'delivery']),
  amount: z.number().positive('Amount must be greater than 0'),
  payeeName: z.string().min(2, 'Payee name is required').transform((v) => v.trim()),
  payeeContact: z.string().optional().nullable().transform((v) => (v ? v.trim() : null)),
  payeeAddress: z.string().optional().nullable().transform((v) => (v ? v.trim() : null)),
  note: z.string().optional().nullable().transform((v) => (v ? v.trim() : null)),
  quizCode: z.string().optional().nullable().transform((v) => (v ? v.trim().toUpperCase() : null)),
  packId: z.string().optional().nullable().transform((v) => (v ? v.trim() : null)),
});

export type ResearcherSupplementDTO = z.infer<typeof ResearcherSupplementSchema>;
export type UpdateResearcherSupplementDTO = z.infer<typeof UpdateResearcherSupplementSchema>;
export type VerifyBenfekCodeDTO = z.infer<typeof VerifyBenfekCodeSchema>;
export type DispatchPackDTO = z.infer<typeof DispatchPackSchema>;
export type CreateOperationalPaymentDTO = z.infer<typeof CreateOperationalPaymentSchema>;
