import { z } from 'zod';

export const CreateSupplementSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  stock: z.number().nonnegative('Stock cannot be negative'),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  dosageForm: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  tags: z.record(z.array(z.string())).optional(),
  status: z.string().optional(),
});
export const UpdateSupplementSchema = CreateSupplementSchema.partial();
export type CreateSupplementDTO = z.infer<typeof CreateSupplementSchema>;
export type UpdateSupplementDTO = z.infer<typeof UpdateSupplementSchema>;
