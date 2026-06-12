import type { AuthUser } from '@game-platform/shared';
import { AuthError, AuthService, extractBearerToken } from './auth.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: import('fastify').preHandlerHookHandler;
  }

  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function authPlugin(app: import('fastify').FastifyInstance) {
  const authService = new AuthService();

  app.decorate('authenticate', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.status(401).send({ message: 'Missing bearer token' });
    }

    try {
      const authenticatedSession = await authService.validateToken(token);
      request.user = authenticatedSession.user;
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({ message: error.message });
      }

      request.log.error(error);
      return reply.status(500).send({ message: 'Internal server error' });
    }
  });
}
