import { z } from 'zod';
import { CreateBasicSchema } from './basic.dto';
import { CreateLifestyleSchema } from './lifestyle.dto';
import { CreatePreferenceSchema } from './preference.dto';

const BaseProfileSchema = z.object({
  email: z.string().email('Invalid email format').transform(val => val.trim()),
  firstName: z.string().min(2, 'First name must be at least 2 characters').transform(val => val.trim()),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').transform(val => val.trim()),
  phone: z.string().min(1, 'Phone is required').optional(),
});

const PrincipalExtrasSchema = z.object({
  profileImageUrl: z.string().url('Invalid image URL').optional(),
  profession: z.string().optional(),
  currentPlaceOfWork: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  preferredPaymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});

const BenfekProfileExtrasSchema = z.object({
  allergies: z.string().optional(),
  scares: z.string().optional(),
  familyCondition: z.string().optional(),
  medications: z.string().optional(),
  hasCurrentCondition: z.boolean().optional(),
  basic: CreateBasicSchema.optional(),
  lifestyle: CreateLifestyleSchema.optional(),
  preference: CreatePreferenceSchema.optional(),
});

export const CreateWholesalerProfileSchema = BaseProfileSchema;
export const UpdateWholesalerProfileSchema = BaseProfileSchema.partial();

export const CreateResearcherProfileSchema = BaseProfileSchema;
export const UpdateResearcherProfileSchema = BaseProfileSchema.partial();

export const CreatePrincipalProfileSchema = BaseProfileSchema.merge(PrincipalExtrasSchema);
export const UpdatePrincipalProfileSchema = BaseProfileSchema.partial().merge(PrincipalExtrasSchema.partial());

export const CreateBenfekProfileSchema = BaseProfileSchema.merge(BenfekProfileExtrasSchema);
export const UpdateBenfekProfileSchema = BaseProfileSchema.partial().merge(BenfekProfileExtrasSchema.partial());

export type CreateWholesalerProfileDTO = z.infer<typeof CreateWholesalerProfileSchema>;
export type UpdateWholesalerProfileDTO = z.infer<typeof UpdateWholesalerProfileSchema>;
export type CreateResearcherProfileDTO = z.infer<typeof CreateResearcherProfileSchema>;
export type UpdateResearcherProfileDTO = z.infer<typeof UpdateResearcherProfileSchema>;
export type CreatePrincipalProfileDTO = z.infer<typeof CreatePrincipalProfileSchema>;
export type UpdatePrincipalProfileDTO = z.infer<typeof UpdatePrincipalProfileSchema>;
export type CreateBenfekProfileDTO = z.infer<typeof CreateBenfekProfileSchema>;
export type UpdateBenfekProfileDTO = z.infer<typeof UpdateBenfekProfileSchema>;
