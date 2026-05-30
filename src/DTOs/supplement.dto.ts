import { z } from 'zod';

const OptionalRatingSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return Number(value.replace(/%/g, '').trim());
  return value;
}, z.number().min(0, 'Rating cannot be negative').max(100, 'Rating cannot exceed 100').nullable()).optional();

export const CreateSupplementSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rating: OptionalRatingSchema,
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

export const WholesalerUpdateSupplementSchema = UpdateSupplementSchema.extend({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  price: z.coerce.number().positive('Price must be positive').optional(),
  stock: z.coerce.number().nonnegative('Stock cannot be negative').optional(),
});

export const WholesalerPriceSchema = z.object({
  price: z.coerce.number().positive('Price must be greater than 0'),
  contact: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
});

export type CreateSupplementDTO = z.infer<typeof CreateSupplementSchema>;
export type UpdateSupplementDTO = z.infer<typeof UpdateSupplementSchema>;
export type WholesalerUpdateSupplementDTO = z.infer<typeof WholesalerUpdateSupplementSchema>;
export type WholesalerPriceDTO = z.infer<typeof WholesalerPriceSchema>;
