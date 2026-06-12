import { eq } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import { castleUpgrades, users, playerGameScores, games } from '../../db/schema.js';

export class CastleRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async findUpgradeByLevel(level: number) {
    const [upgrade] = await this.db
      .select()
      .from(castleUpgrades)
      .where(eq(castleUpgrades.level, level))
      .limit(1);
    return upgrade;
  }

  async getUserScores(userId: string) {
    const scores = await this.db
      .select({
        gameSlug: games.slug,
        score: playerGameScores.score
      })
      .from(playerGameScores)
      .innerJoin(games, eq(games.id, playerGameScores.gameId))
      .where(eq(playerGameScores.userId, userId));
    
    return scores;
  }

  async getAllGames() {
    return this.db.select().from(games);
  }

  async updateUserCastleLevel(userId: string, level: number) {
    await this.db
      .update(users)
      .set({
        castleLevel: level,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}
