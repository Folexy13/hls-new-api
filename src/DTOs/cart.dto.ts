import { z } from 'zod';

export const AddToCartSchema = z.object({
  supplementId: z.number().positive('Invalid supplement ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
});

export type AddToCartDTO = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemDTO = z.infer<typeof UpdateCartItemSchema>;
