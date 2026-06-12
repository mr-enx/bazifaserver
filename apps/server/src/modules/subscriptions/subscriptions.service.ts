import type { AuthUser, SubscriptionStatusResponse } from '@game-platform/shared';
import { SubscriptionsRepository } from './subscriptions.repository.js';

function secondsBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 1000));
}

export class SubscriptionsService {
  constructor(private readonly subscriptionsRepository = new SubscriptionsRepository()) {}

  async getMySubscriptionStatus(user: AuthUser): Promise<SubscriptionStatusResponse> {
    const now = new Date();
    const active = await this.subscriptionsRepository.findActiveByUserId(user.id, now);

    if (!active) {
      return {
        active: false,
        purchasedAt: null,
        expiresAt: null,
        remainingSeconds: 0
      };
    }

    return {
      active: true,
      purchasedAt: active.purchasedAt.toISOString(),
      expiresAt: active.expiresAt.toISOString(),
      remainingSeconds: secondsBetween(active.expiresAt, now)
    };
  }

  async purchaseSubscription(user: AuthUser, days: number): Promise<SubscriptionStatusResponse> {
    const now = new Date();
    const latest = await this.subscriptionsRepository.findLatestByUserId(user.id);
    const base = latest && latest.expiresAt.getTime() > now.getTime() ? latest.expiresAt : now;

    const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await this.subscriptionsRepository.create({
      userId: user.id,
      purchasedAt: now,
      expiresAt
    });

    return {
      active: true,
      purchasedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: secondsBetween(expiresAt, now)
    };
  }
}
