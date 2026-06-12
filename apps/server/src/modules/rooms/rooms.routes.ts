import type { FastifyInstance } from 'fastify';
import type { ActiveRoomMatch, RoomDetails, RoomListItem } from '@game-platform/shared';
import { RoomsError, RoomsService } from './rooms.service.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof RoomsError) {
    return { statusCode: error.statusCode, body: { message: error.message } };
  }

  return { statusCode: 500, body: { message: 'Internal server error' } };
}

export async function registerRoomsRoutes(app: FastifyInstance) {
  const roomsService = new RoomsService();

  app.get<{ Reply: RoomListItem[] | { message: string } }>('/admin/rooms', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.listAllRoomsForAdmin(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.delete<{ Params: { roomId: string }; Reply: { success: true } | { message: string } }>('/admin/rooms/:roomId', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.deleteRoomAsAdmin(request.params.roomId, request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.get<{ Params: { gameId: string }; Reply: RoomListItem[] | { message: string } }>('/games/:gameId/rooms', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.listRooms(request.params.gameId);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.post<{ Params: { gameId: string }; Reply: RoomDetails | { message: string } }>('/games/:gameId/rooms', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.createRoom(request.params.gameId, request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.get<{ Reply: Awaited<ReturnType<RoomsService['getCurrentRoomMembership']>> | { message: string } }>('/rooms/current-membership', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.getCurrentRoomMembership(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.get<{ Params: { roomId: string }; Reply: RoomDetails | { message: string } }>('/rooms/:roomId', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.getRoom(request.params.roomId);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.get<{ Params: { roomId: string }; Reply: ActiveRoomMatch | null | { message: string } }>('/rooms/:roomId/active-match', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        const room = await roomsService.getRoom(request.params.roomId);
        if (!room.players.some((player) => player.userId === request.user.id)) {
          return reply.status(403).send({ message: 'You are not a member of this room' });
        }

        return room.activeMatch;
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });

  app.post<{ Params: { roomId: string }; Reply: RoomDetails | { message: string } }>('/rooms/:roomId/join', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await roomsService.joinRoom(request.params.roomId, request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });
}
