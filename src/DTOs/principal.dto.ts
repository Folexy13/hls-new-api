import { z } from 'zod';
import { CreatePrincipalProfileSchema, UpdatePrincipalProfileSchema } from './profiles.dto';

const PasswordSchema = z
  .string()
  .transform(val => val.trim())
  .refine(val => val.length >= 8, 'Password must be at least 8 characters')
  .refine(
    val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(val),
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const CreatePrincipalUserSchema = CreatePrincipalProfileSchema.extend({
  password: PasswordSchema,
});

export const UpdatePrincipalUserSchema = UpdatePrincipalProfileSchema.extend({
  password: PasswordSchema.optional(),
});

export const CreateBenfekUserSchema = CreatePrincipalProfileSchema.extend({
  password: PasswordSchema,
});

export type CreatePrincipalUserDTO = z.infer<typeof CreatePrincipalUserSchema>;
export type UpdatePrincipalUserDTO = z.infer<typeof UpdatePrincipalUserSchema>;
export type CreateBenfekUserDTO = z.infer<typeof CreateBenfekUserSchema>;
