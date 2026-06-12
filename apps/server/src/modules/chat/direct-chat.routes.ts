import type { DirectChatMessage, DirectChatThread, SendDirectMessageRequest } from '@game-platform/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { DirectChatError, DirectChatService } from './direct-chat.service.js';
import {
  directChatParamsSchema,
  sendDirectMessageBodySchema,
  type DirectChatParams,
  type SendDirectMessageBody
} from './direct-chat.schemas.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof DirectChatError) {
    return { statusCode: error.statusCode, body: { message: error.message } };
  }

  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: error.issues[0]?.message ?? 'Invalid request' } };
  }

  return { statusCode: 500, body: { message: 'Internal server error' } };
}

export async function registerDirectChatRoutes(app: FastifyInstance) {
  const directChatService = new DirectChatService();

  app.get<{ Params: DirectChatParams; Reply: DirectChatThread | { message: string } }>('/chat/:friendId', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        const params = directChatParamsSchema.parse(request.params);
        return await directChatService.getThread(request.user, params.friendId);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.post<{
    Params: DirectChatParams;
    Body: SendDirectMessageBody;
    Reply: DirectChatMessage | { message: string };
  }>('/chat/:friendId/messages', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        const params = directChatParamsSchema.parse(request.params);
        const body = sendDirectMessageBodySchema.parse(request.body satisfies SendDirectMessageRequest);
        return await directChatService.sendMessage(request.user, params.friendId, body.message);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });
}
