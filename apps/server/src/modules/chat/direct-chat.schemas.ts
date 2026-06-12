import { z } from 'zod';

export const directChatParamsSchema = z.object({
  friendId: z.string().uuid()
});

export const sendDirectMessageBodySchema = z.object({
  message: z.string().min(1).max(1000)
});

export type DirectChatParams = z.infer<typeof directChatParamsSchema>;
export type SendDirectMessageBody = z.infer<typeof sendDirectMessageBodySchema>;
