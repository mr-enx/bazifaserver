import type { AuthUser, Game, GameResultItem, LeaderboardResponse } from '@game-platform/shared';
import { GamesRepository, type GameWithRoomsCountRow, type RecentGameResultRow } from './games.repository.js';

function toGame(row: GameWithRoomsCountRow): Game {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    gameType: row.gameType,
    isActive: row.isActive,
    roomsCount: row.roomsCount,
    score: row.score
  };
}

function toGameResultItem(row: RecentGameResultRow, userId: string): GameResultItem {
  const scoreByUserId = row.dataResults.score;
  const score = scoreByUserId[userId] ?? 0;
  const opponentScore = findOpponentScore(scoreByUserId, userId);

  return {
    id: row.id,
    matchId: row.dataResults['game-id'],
    gameId: row.gameId,
    gameName: row.gameName,
    playerIds: Object.keys(scoreByUserId),
    score,
    opponentScore,
    scoreByUserId,
    outcome: inferOutcome(row.dataResults, userId, score, opponentScore)
  };
}

function findOpponentScore(scoreByUserId: Record<string, number>, currentUserId: string): number {
  return Object.entries(scoreByUserId).reduce((highest, [userId, score]) => {
    if (userId === currentUserId) {
      return highest;
    }

    return Math.max(highest, score);
  }, 0);
}

function inferOutcome(
  result: RecentGameResultRow['dataResults'],
  userId: string,
  score: number,
  opponentScore: number
): GameResultItem['outcome'] {
  if (result.winners.includes(userId)) {
    return 'won';
  }

  if (result.losers.includes(userId)) {
    return 'lost';
  }

  if (score > opponentScore) {
    return 'won';
  }

  if (score < opponentScore) {
    return 'lost';
  }

  return 'draw';
}

export class GamesService {
  constructor(private readonly gamesRepository = new GamesRepository()) {}

  async listGames(
    options: { activeOnly?: boolean; gameType?: 'online' | 'offline'; userId?: string } = {}
  ): Promise<Game[]> {
    const rows = await this.gamesRepository.findMany(options);
    return rows.map(toGame);
  }

  async listRecentResults(user: AuthUser): Promise<GameResultItem[]> {
    const rows = await this.gamesRepository.listRecentResultsForUser(user.id);
    return rows.map((row) => toGameResultItem(row, user.id));
  }

  async getLeaderboard(user: AuthUser): Promise<LeaderboardResponse> {
    return this.gamesRepository.getGlobalLeaderboard(user.id);
  }
}
