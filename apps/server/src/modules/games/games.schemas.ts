import { z } from 'zod';

export const listGamesQuerySchema = z.object({
  type: z.enum(['online', 'offline']).optional()
});

export type ListGamesQuery = z.infer<typeof listGamesQuerySchema>;
