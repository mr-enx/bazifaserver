import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscriptions, type NewSubscription, type Subscription } from '../../db/schema.js';

export class SubscriptionsRepository {
  async findLatestByUserId(userId: string): Promise<Subscription | null> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.expiresAt))
      .limit(1);

    return row ?? null;
  }

  async findActiveByUserId(userId: string, now: Date): Promise<Subscription | null> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.expiresAt))
      .limit(1);

    if (!row) {
      return null;
    }

    return row.expiresAt.getTime() > now.getTime() ? row : null;
  }

  async create(subscription: NewSubscription): Promise<Subscription> {
    const [row] = await db.insert(subscriptions).values(subscription).returning();
    return row;
  }
}
