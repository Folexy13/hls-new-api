import { z } from 'zod';

export const CreateSupplementSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  stock: z.number().nonnegative('Stock cannot be negative'),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  expiryDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format'), z.literal('')])
    .optional()
    .nullable(),
  dosageForm: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  tags: z.record(z.array(z.string())).optional(),
  wholesalers: z
    .object({
      name: z.string().optional().nullable(),
      price: z.number().optional().nullable(),
      contact: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  status: z.string().optional(),
});
export const UpdateSupplementSchema = CreateSupplementSchema.partial();
export type CreateSupplementDTO = z.infer<typeof CreateSupplementSchema>;
export type UpdateSupplementDTO = z.infer<typeof UpdateSupplementSchema>;
