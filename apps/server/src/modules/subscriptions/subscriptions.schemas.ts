import { z } from 'zod';

export const purchaseSubscriptionBodySchema = z.object({
  days: z.number().int().positive()
});

export type PurchaseSubscriptionBody = z.infer<typeof purchaseSubscriptionBodySchema>;
