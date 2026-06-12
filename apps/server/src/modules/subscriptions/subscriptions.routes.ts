import type { SubscriptionStatusResponse } from '@game-platform/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { purchaseSubscriptionBodySchema, type PurchaseSubscriptionBody } from './subscriptions.schemas.js';
import { SubscriptionsService } from './subscriptions.service.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: { message: error.issues[0]?.message ?? 'Invalid request' }
    };
  }

  return {
    statusCode: 500,
    body: { message: 'Internal server error' }
  };
}

export async function registerSubscriptionsRoutes(app: FastifyInstance) {
  const subscriptionsService = new SubscriptionsService();

  app.get<{ Reply: SubscriptionStatusResponse | { message: string } }>('/subscriptions/me', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await subscriptionsService.getMySubscriptionStatus(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.post<{ Body: PurchaseSubscriptionBody; Reply: SubscriptionStatusResponse | { message: string } }>(
    '/subscriptions/purchase',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const body = purchaseSubscriptionBodySchema.parse(request.body);
          return await subscriptionsService.purchaseSubscription(request.user, body.days);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );
}
