import type { FastifyInstance } from 'fastify';
import type { Game, GameResultItem, LeaderboardResponse } from '@game-platform/shared';
import { GamesService } from './games.service.js';
import { CastleService } from './castle.service.js';
import { CollectorService } from './collector.service.js';
import { listGamesQuerySchema, type ListGamesQuery } from './games.schemas.js';

export async function registerGamesRoutes(app: FastifyInstance) {
  const gamesService = new GamesService();
  const castleService = new CastleService();
  const collectorService = new CollectorService();

  app.get<{ Querystring: ListGamesQuery; Reply: Game[] | { message: string } }>('/games', {
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = listGamesQuerySchema.parse(request.query);
      return gamesService.listGames({ activeOnly: true, gameType: query.type, userId: request.user.id });
    }
  });

  app.get<{ Reply: GameResultItem[] | { message: string } }>('/games/results/recent', {
    preHandler: app.authenticate,
    handler: async (request) => gamesService.listRecentResults(request.user)
  });

  app.get<{ Reply: LeaderboardResponse | { message: string } }>('/games/leaderboard', {
    preHandler: app.authenticate,
    handler: async (request) => gamesService.getLeaderboard(request.user)
  });

  app.get('/games/castle/requirements', {
    preHandler: app.authenticate,
    handler: async (request) => castleService.getUpgradeRequirements(request.user)
  });

  app.post<{ Reply: { success: boolean; newLevel: number } | { message: string } }>('/games/castle/upgrade', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await castleService.upgradeCastle(request.user);
      } catch (error) {
        request.log.error(error);
        return reply.status(400).send({ message: error instanceof Error ? error.message : 'Upgrade failed' });
      }
    }
  });

  app.get('/games/collector/status', {
    preHandler: app.authenticate,
    handler: async (request) => collectorService.getCollectorStatus(request.user.id)
  });

  app.post('/games/collector/gems', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await collectorService.collectGems(request.user);
      } catch (error) {
        request.log.error(error);
        return reply.status(400).send({ message: error instanceof Error ? error.message : 'Gem collection failed' });
      }
    }
  });

  app.post('/games/collector/xp', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await collectorService.collectXp(request.user);
      } catch (error) {
        request.log.error(error);
        return reply.status(400).send({ message: error instanceof Error ? error.message : 'XP collection failed' });
      }
    }
  });
}
