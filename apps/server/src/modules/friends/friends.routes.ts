import type {
  CancelFriendRequestResponse,
  CreateFriendRequestResponse,
  FriendListItem,
  NotificationItem,
  OutgoingFriendRequestItem,
  RespondToFriendRequestResponse
} from '@game-platform/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { FriendsError, FriendsService } from './friends.service.js';
import {
  createFriendRequestBodySchema,
  friendRequestParamsSchema,
  type CreateFriendRequestBody,
  type FriendRequestParams
} from './friends.schemas.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof FriendsError) {
    return {
      statusCode: error.statusCode,
      body: { message: error.message }
    };
  }

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

export async function registerFriendsRoutes(app: FastifyInstance) {
  const friendsService = new FriendsService();

  app.post<{ Body: CreateFriendRequestBody; Reply: CreateFriendRequestResponse | { message: string } }>(
    '/friends/requests',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const body = createFriendRequestBodySchema.parse(request.body);
          return await friendsService.createFriendRequest(request.user, body);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.get<{ Reply: NotificationItem[] | { message: string } }>('/notifications', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await friendsService.listNotifications(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.get<{ Reply: OutgoingFriendRequestItem[] | { message: string } }>('/friends/requests/sent', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await friendsService.listOutgoingPendingRequests(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.post<{ Params: FriendRequestParams; Reply: RespondToFriendRequestResponse | { message: string } }>(
    '/friends/requests/:requestId/accept',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const params = friendRequestParamsSchema.parse(request.params);
          return await friendsService.acceptFriendRequest(params.requestId, request.user);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.post<{ Params: FriendRequestParams; Reply: RespondToFriendRequestResponse | { message: string } }>(
    '/friends/requests/:requestId/reject',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const params = friendRequestParamsSchema.parse(request.params);
          return await friendsService.rejectFriendRequest(params.requestId, request.user);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.delete<{ Params: FriendRequestParams; Reply: CancelFriendRequestResponse | { message: string } }>(
    '/friends/requests/:requestId',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const params = friendRequestParamsSchema.parse(request.params);
          return await friendsService.cancelFriendRequest(params.requestId, request.user);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.get<{ Reply: FriendListItem[] | { message: string } }>('/friends', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await friendsService.listFriends(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });
}
