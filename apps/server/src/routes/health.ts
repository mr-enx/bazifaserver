import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@game-platform/shared';

export async function registerHealthRoutes(app: FastifyInstance) {
  const healthHandler = async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: 'game-platform-server',
    timestamp: new Date().toISOString()
  });

  app.get<{ Reply: HealthResponse }>('/health', healthHandler);
  app.get<{ Reply: HealthResponse }>('/api/health', healthHandler);

  app.get('/', async () => ({
    service: 'game-platform-server',
    status: 'ok',
    health: '/health',
    apiHealth: '/api/health'
  }));
}
