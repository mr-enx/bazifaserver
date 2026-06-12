import { z } from 'zod';

const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(128, 'Name must be at most 128 characters');

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Phone number is required')
  .max(32, 'Phone number is too long');

const requestIdSchema = z
  .string()
  .trim()
  .min(16, 'OTP request is invalid')
  .max(128, 'OTP request is invalid');

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'OTP code must be 6 digits');

export const registerBodySchema = z.object({
  phone: phoneSchema
});

export const loginBodySchema = z.object({
  phone: phoneSchema
});

export const verifyOtpBodySchema = z.object({
  requestId: requestIdSchema,
  code: otpCodeSchema
});

export const completeRegistrationBodySchema = z.object({
  requestId: requestIdSchema,
  onboardingToken: z.string().trim().min(32, 'Registration session is invalid').max(256, 'Registration session is invalid'),
  fullName: fullNameSchema,
  birthDateShamsi: z
    .string()
    .trim()
    .regex(/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/, 'Birth date must be in YYYY/MM/DD format')
    .max(16, 'Birth date is too long'),
  province: z.string().trim().min(2, 'Province is required').max(128, 'Province is too long'),
  city: z.string().trim().min(2, 'City is required').max(128, 'City is too long'),
  gender: z.union([z.literal('male'), z.literal('female')])
});

export const updateProfileBodySchema = z.object({
  fullName: fullNameSchema.optional(),
  birthDateShamsi: z
    .string()
    .trim()
    .regex(/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/, 'Birth date must be in YYYY/MM/DD format')
    .max(16, 'Birth date is too long')
    .optional(),
  province: z.string().trim().min(2, 'Province is required').max(128, 'Province is too long').optional(),
  city: z.string().trim().min(2, 'City is required').max(128, 'City is too long').optional(),
  gender: z.union([z.literal('male'), z.literal('female')]).optional(),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
  avatarUrl: z.union([z.string().trim().max(4096), z.literal(''), z.null()]).optional()
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type CompleteRegistrationBody = z.infer<typeof completeRegistrationBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
