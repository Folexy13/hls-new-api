import { z } from 'zod';

export const ResearcherSupplementSchema = z.object({
  name: z.string().min(2, 'Name is required').transform((value) => value.trim()),
  description: z.string().min(2, 'Description is required').transform((value) => value.trim()),
  price: z.number().nonnegative('Price cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  dosageForm: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  tags: z.record(z.array(z.string())).optional().default({}),
  status: z.string().optional().default('in_stock'),
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

export type ResearcherSupplementDTO = z.infer<typeof ResearcherSupplementSchema>;
export type UpdateResearcherSupplementDTO = z.infer<typeof UpdateResearcherSupplementSchema>;
export type VerifyBenfekCodeDTO = z.infer<typeof VerifyBenfekCodeSchema>;
export type DispatchPackDTO = z.infer<typeof DispatchPackSchema>;
