import type { GameFinishedResult, LeaderboardResponse, LeaderboardEntry } from '@game-platform/shared';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import { gameResults, games, playerGameScores, rooms, users, friendships } from '../../db/schema.js';

export type GameWithRoomsCountRow = {
  id: string;
  slug: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  gameType: 'online' | 'offline';
  isActive: boolean;
  roomsCount: number;
  score: number;
};

export type GameResultInsertRow = {
  gameId: string;
  dataResults: GameFinishedResult;
  xpAwardsByUserId: Map<string, number>;
};

export type RecentGameResultRow = {
  id: string;
  gameId: string;
  gameName: string;
  dataResults: GameFinishedResult;
};

export class GamesRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async findMany(
    options: { activeOnly?: boolean; gameType?: 'online' | 'offline'; userId?: string } = {}
  ): Promise<GameWithRoomsCountRow[]> {
    const query = this.db
      .select({
        id: games.id,
        slug: games.slug,
        name: games.name,
        minPlayers: games.minPlayers,
        maxPlayers: games.maxPlayers,
        gameType: games.gameType,
        isActive: games.isActive,
        roomsCount: sql<number>`count(distinct ${rooms.id})::int`,
        score: sql<number>`coalesce(max(${playerGameScores.score}), 0)::int`
      })
      .from(games)
      .leftJoin(rooms, eq(rooms.gameId, games.id))
      .leftJoin(
        playerGameScores,
        and(eq(playerGameScores.gameId, games.id), eq(playerGameScores.userId, options.userId ?? '00000000-0000-0000-0000-000000000000'))
      )
      .groupBy(games.id)
      .orderBy(asc(games.name));

    const conditions = [];

    if (options.activeOnly ?? true) {
      conditions.push(eq(games.isActive, true));
    }

    if (options.gameType) {
      conditions.push(eq(games.gameType, options.gameType));
    }

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }

  async createGameResult(row: GameResultInsertRow): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(gameResults).values({
        gameId: row.gameId,
        dataResults: row.dataResults
      });

      await Promise.all(
        [...row.xpAwardsByUserId.entries()]
          .filter(([, xpAward]) => xpAward !== 0)
          .map(async ([userId, xpAward]) => {
            await tx
              .update(users)
              .set({
                xp: sql`greatest(${users.xp} + ${xpAward}, 0)`,
                updatedAt: new Date()
              })
              .where(eq(users.id, userId));

            const gameScoreAward = xpAward * 3;

            await tx
              .insert(playerGameScores)
              .values({
                userId,
                gameId: row.gameId,
                score: Math.max(gameScoreAward, 0),
                updatedAt: new Date()
              })
              .onConflictDoUpdate({
                target: [playerGameScores.userId, playerGameScores.gameId],
                set: {
                  score: sql`greatest(${playerGameScores.score} + ${gameScoreAward}, 0)`,
                  updatedAt: new Date()
                }
              });
          })
      );
    });
  }

  async getUserGameBalance(userId: string, gameId: string): Promise<{ xp: number; score: number }> {
    const [row] = await this.db
      .select({
        xp: users.xp,
        score: sql<number>`coalesce(${playerGameScores.score}, 0)::int`
      })
      .from(users)
      .leftJoin(playerGameScores, and(eq(playerGameScores.userId, users.id), eq(playerGameScores.gameId, gameId)))
      .where(eq(users.id, userId))
      .limit(1);

    return {
      xp: row?.xp ?? 0,
      score: row?.score ?? 0
    };
  }

  async applyGameLeavePenalty(userId: string, gameId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          xp: sql`greatest(${users.xp} - 10, 0)`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      await tx
        .insert(playerGameScores)
        .values({
          userId,
          gameId,
          score: 0,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [playerGameScores.userId, playerGameScores.gameId],
          set: {
            score: sql`greatest(${playerGameScores.score} - 100, 0)`,
            updatedAt: new Date()
          }
        });
    });
  }

  async listRecentResultsForUser(userId: string, limit = 20): Promise<RecentGameResultRow[]> {
    return this.db
      .select({
        id: gameResults.id,
        gameId: gameResults.gameId,
        gameName: games.name,
        dataResults: gameResults.dataResults
      })
      .from(gameResults)
      .innerJoin(games, eq(gameResults.gameId, games.id))
      .where(sql`${gameResults.dataResults}->'score' ? ${userId}`)
      .orderBy(desc(gameResults.id))
      .limit(limit) as Promise<RecentGameResultRow[]>;
  }

  async getGlobalLeaderboard(userId: string): Promise<LeaderboardResponse> {
    const global = await this.db
      .select({
        userId: playerGameScores.userId,
        username: users.username,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        totalScore: sql<number>`sum(${playerGameScores.score})::int`
      })
      .from(playerGameScores)
      .innerJoin(users, eq(users.id, playerGameScores.userId))
      .groupBy(playerGameScores.userId, users.username, users.fullName, users.avatarUrl)
      .orderBy(desc(sql`sum(${playerGameScores.score})`))
      .limit(50);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthly = await this.db
      .select({
        userId: users.id,
        username: users.username,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        totalScore: sql<number>`sum((entry.value)::int)::int`
      })
      .from(gameResults)
      .innerJoin(sql`jsonb_each(${gameResults.dataResults}->'score') as entry`, sql`true`)
      .innerJoin(users, eq(users.id, sql`(entry.key)::uuid`))
      .where(sql`${gameResults.createdAt} >= ${startOfMonth}`)
      .groupBy(users.id, users.username, users.fullName, users.avatarUrl)
      .orderBy(desc(sql`sum((entry.value)::int)`))
      .limit(50);

    const friends = await this.db
      .select({
        userId: playerGameScores.userId,
        username: users.username,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        totalScore: sql<number>`sum(${playerGameScores.score})::int`
      })
      .from(playerGameScores)
      .innerJoin(users, eq(users.id, playerGameScores.userId))
      .innerJoin(friendships, and(
        eq(friendships.userId, userId),
        eq(friendships.friendId, playerGameScores.userId)
      ))
      .groupBy(playerGameScores.userId, users.username, users.fullName, users.avatarUrl)
      .orderBy(desc(sql`sum(${playerGameScores.score})`))
      .limit(50);

    return {
      global: global as LeaderboardEntry[],
      monthly: monthly as LeaderboardEntry[],
      friends: friends as LeaderboardEntry[]
    };
  }
}
