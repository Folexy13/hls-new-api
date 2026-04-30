import { z } from 'zod';
import { CreatePrincipalProfileSchema, UpdatePrincipalProfileSchema } from './profiles.dto';

const optionalMultiValueField = z
  .union([z.array(z.string()), z.string(), z.undefined()])
  .transform((value) => {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => item.trim()).filter(Boolean);
      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  });

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

export const CreateBenfekRecordSchema = z.object({
  benfekName: z.string().min(2, 'Name must be at least 2 characters'),
  benfekPhone: z.string().min(10, 'Phone must be at least 10 characters'),
  benfekAge: z.string().min(1, 'Age is required'),
  benfekGender: z.string().min(1, "Gender is required"),
  allergies: optionalMultiValueField,
  scares: optionalMultiValueField,
  familyCondition: optionalMultiValueField,
  medications: optionalMultiValueField,
  currentConditions: optionalMultiValueField,
  hasCurrentCondition: z.boolean().default(false),
});

export type CreateBenfekRecordDTO = z.infer<typeof CreateBenfekRecordSchema>;
export type CreatePrincipalUserDTO = z.infer<typeof CreatePrincipalUserSchema>;
export type UpdatePrincipalUserDTO = z.infer<typeof UpdatePrincipalUserSchema>;
export type CreateBenfekUserDTO = z.infer<typeof CreateBenfekUserSchema>;
