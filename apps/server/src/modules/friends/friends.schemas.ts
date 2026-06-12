import { z } from 'zod';

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Invalid identifier');

export const createFriendRequestBodySchema = z.object({
  receiverId: uuidSchema.optional(),
  phone: z.string().trim().min(6, 'Phone number is required').max(32, 'Phone number is too long').optional()
}).refine((value) => Boolean(value.receiverId || value.phone), {
  message: 'Receiver id or phone number is required'
});

export const friendRequestParamsSchema = z.object({
  requestId: uuidSchema
});

export type CreateFriendRequestBody = z.infer<typeof createFriendRequestBodySchema>;
export type FriendRequestParams = z.infer<typeof friendRequestParamsSchema>;
