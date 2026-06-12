import { eq, sql } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import { users } from '../../db/schema.js';

export class CollectorRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async getUserById(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user;
  }

  async collectGems(userId: string, amount: number) {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        gem: sql`${users.gem} + ${amount}`,
        lastGemCollectionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async collectXp(userId: string, amount: number) {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${amount}`,
        lastXpCollectionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
}
