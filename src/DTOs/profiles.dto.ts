import { z } from 'zod';
import { CreateBasicSchema } from './basic.dto';
import { CreateLifestyleSchema } from './lifestyle.dto';
import { CreatePreferenceSchema } from './preference.dto';

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalUrlString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().url('Invalid image URL').optional());

const BaseProfileSchema = z.object({
  email: z.string().email('Invalid email format').transform(val => val.trim()),
  firstName: z.string().min(2, 'First name must be at least 2 characters').transform(val => val.trim()),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').transform(val => val.trim()),
  phone: optionalTrimmedString,
});

const PrincipalExtrasSchema = z.object({
  profileImageUrl: optionalUrlString,
  profession: optionalTrimmedString,
  currentPlaceOfWork: optionalTrimmedString,
  licenseNumber: optionalTrimmedString,
  yearsOfExperience: optionalTrimmedString,
  preferredPaymentMethod: optionalTrimmedString,
  bankName: optionalTrimmedString,
  accountNumber: optionalTrimmedString,
  accountName: optionalTrimmedString,
});

const BenfekProfileExtrasSchema = z.object({
  allergies: optionalTrimmedString,
  scares: optionalTrimmedString,
  familyCondition: optionalTrimmedString,
  medications: optionalTrimmedString,
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
