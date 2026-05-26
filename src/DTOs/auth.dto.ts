import { z } from 'zod';

const optionalTrimmedString = (message: string) =>
  z.string().transform(val => val.trim()).refine(val => val.length >= 2, message).optional();

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
  firstName: optionalTrimmedString('First name must be at least 2 characters'),
  lastName: optionalTrimmedString('Last name must be at least 2 characters'),
  businessName: optionalTrimmedString('Business name must be at least 2 characters'),
  mainBranch: optionalTrimmedString('Main branch must be at least 2 characters'),
  phone: z.string().min(5, 'Phone number is required').transform(val => val.trim()).optional(),
  contact: z.string().min(5, 'Office number is required').transform(val => val.trim()).optional(),
  role: z.enum(['benfek', 'principal', 'wholesaler', 'pharmacy', 'researcher']).optional().default('benfek')
}).superRefine((data, ctx) => {
  const isWholesaler = data.role === 'wholesaler';

  if (!(data.firstName ?? data.businessName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: isWholesaler ? 'Business name is required' : 'First name is required',
      path: [isWholesaler ? 'businessName' : 'firstName']
    });
  }

  if (!(data.lastName ?? data.mainBranch)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: isWholesaler ? 'Main branch is required' : 'Last name is required',
      path: [isWholesaler ? 'mainBranch' : 'lastName']
    });
  }
}).transform(data => {
  return {
    ...data,
    firstName: data.firstName ?? data.businessName!,
    lastName: data.lastName ?? data.mainBranch!,
    phone: data.phone ?? data.contact,
  };
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const RegisterBenfekSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').transform(val => val.trim()),
  email: z.string().email('Invalid email format').transform(val => val.trim()),
  password: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length >= 8, 'Password must be at least 8 characters')
    .refine(
      val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(val),
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const RegisterUnreferredBenfekSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').transform(val => val.trim()),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').transform(val => val.trim()),
  email: z.string().email('Invalid email format').transform(val => val.trim()),
  phone: z.string().min(5, 'Phone number is required').transform(val => val.trim()).optional(),
  quizCode: z.string().min(1, 'Quiz code is required').transform(val => val.trim().toUpperCase()).optional(),
  password: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length >= 8, 'Password must be at least 8 characters')
    .refine(
      val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(val),
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;
export type LoginUserDTO = z.infer<typeof LoginUserSchema>;
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;
export type RegisterBenfekDTO = z.infer<typeof RegisterBenfekSchema>;
export type RegisterUnreferredBenfekDTO = z.infer<typeof RegisterUnreferredBenfekSchema>;
