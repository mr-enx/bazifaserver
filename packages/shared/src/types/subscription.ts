export type SubscriptionStatusResponse = {
  active: boolean;
  purchasedAt: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
};

export type PurchaseSubscriptionRequest = {
  days: number;
};
