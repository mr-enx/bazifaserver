import { z } from 'zod';
import type { CreateReportRequest } from '@game-platform/shared';

export const createReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.string().max(500).optional()
}) satisfies z.ZodType<CreateReportRequest>;

export type CreateReportBody = z.infer<typeof createReportSchema>;
