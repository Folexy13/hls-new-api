import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid email format').transform(val => val.trim()),
  password: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length >= 8, 'Password must be at least 8 characters')
    .refine(
      val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(val),
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  firstName: z.string().min(2, 'First name must be at least 2 characters').transform(val => val.trim()),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').transform(val => val.trim()),
  role: z.enum(['benfek', 'principal', 'wholesaler', 'pharmacy', 'researcher']).optional().default('benfek')
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;
export type LoginUserDTO = z.infer<typeof LoginUserSchema>;
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;
