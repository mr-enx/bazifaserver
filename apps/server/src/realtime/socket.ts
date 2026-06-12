import type { AuthUser, ClientToServerEvents, GameFinishedResult, ServerToClientEvents, VoiceUser } from '@game-platform/shared';
import { SOCKET_EVENTS } from '@game-platform/shared';
import type { FastifyInstance } from 'fastify';
import type { Consumer, Producer, Router, WebRtcTransport, Worker } from 'mediasoup/node/lib/types';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import { GameRuntimeError, GameRuntimeService } from '../game-runtime/runtime.service.js';
import { AuthError, AuthService } from '../modules/auth/auth.service.js';
import { ChatError, ChatService } from '../modules/chat/chat.service.js';
import { FriendsRepository } from '../modules/friends/friends.repository.js';
import {
  RoomsError,
  RoomsService,
  clearDisconnectDeadline,
  roomPlayerKey,
  setDisconnectDeadline
} from '../modules/rooms/rooms.service.js';

type InterServerEvents = Record<string, never>;

type SocketData = {
  user: AuthUser;
  roomIds: Set<string>;
};

type VoiceParticipant = VoiceUser & {
  socketId: string | null;
};

type LobbyServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type LobbySocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const DISCONNECT_GRACE_MS = 120_000;
const disconnectTimers = new Map<string, NodeJS.Timeout>();

let lobbyServer: LobbyServer | null = null;

class RealtimeVoiceError extends Error {}

let mediasoupModulePromise: Promise<any> | null = null;

async function loadMediasoup(): Promise<any> {
  if (!mediasoupModulePromise) {
    mediasoupModulePromise = import('mediasoup').catch((error: unknown) => {
      throw new RealtimeVoiceError(
        error instanceof Error
          ? `Voice SFU unavailable: ${error.message}`
          : 'Voice SFU unavailable: mediasoup failed to load'
      );
    });
  }

  return mediasoupModulePromise;
}

function userRoomId(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser<E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  lobbyServer?.to(userRoomId(userId)).emit(event, ...args);
}

export function emitToUsers<E extends keyof ServerToClientEvents>(
  userIds: readonly string[],
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  for (const userId of userIds) {
    emitToUser(userId, event, ...args);
  }
}

function readSocketToken(socket: LobbySocket): string | undefined {
  const token = socket.handshake.auth?.token;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

function errorMessage(error: unknown): string {
  if (
    error instanceof RoomsError ||
    error instanceof AuthError ||
    error instanceof ChatError ||
    error instanceof GameRuntimeError ||
    error instanceof RealtimeVoiceError
  ) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Realtime room action failed';
}

async function emitRoomState(io: LobbyServer, roomsService: RoomsService, roomId: string): Promise<void> {
  const state = await roomsService.getRoom(roomId);
  io.to(roomId).emit(SOCKET_EVENTS.roomState, state);
}

async function resetReadyAndEmitRoomState(io: LobbyServer, roomsService: RoomsService, roomId: string): Promise<void> {
  const state = await roomsService.resetReady(roomId);
  io.to(roomId).emit(SOCKET_EVENTS.roomState, state);
}

async function assertRoomMember(roomsService: RoomsService, roomId: string, userId: string): Promise<void> {
  const room = await roomsService.getRoom(roomId);
  if (!room.players.some((player) => player.userId === userId)) {
    throw new RoomsError('You are not a member of this room', 403);
  }
}

function toVoiceUser(participant: VoiceParticipant): VoiceUser {
  return {
    userId: participant.userId,
    username: participant.username,
    avatarUrl: participant.avatarUrl,
    isMuted: participant.isMuted
  };
}

function isFinishedGameState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'status' in state && state.status === 'finished';
}

export function registerSocketServer(app: FastifyInstance): LobbyServer {
  const io: LobbyServer = new Server(app.server, {
    cors: {
      origin: env.clientOrigins,
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/'
  });

  const authService = new AuthService();
  const roomsService = new RoomsService();
  const chatService = new ChatService();
  const gameRuntimeService = new GameRuntimeService();
  const friendsRepository = new FriendsRepository();

  const activeSocialConnections = new Map<string, number>();
  const presenceDisconnectTimers = new Map<string, NodeJS.Timeout>();
  const PRESENCE_DISCONNECT_DEBOUNCE_MS = 5_000;

  async function notifyFriendsPresence(userId: string, isOnline: boolean): Promise<void> {
    const friendIds = await friendsRepository.listFriendIds(userId);
    const payload = {
      userId,
      isOnline,
      lastSeenAt: isOnline ? null : new Date().toISOString()
    };

    emitToUsers(friendIds, SOCKET_EVENTS.socialPresence, payload);
  }

  async function createGameFinishedPayload(
    roomId: string,
    match: { matchId: string; gameSlug: string; resultSummary: GameFinishedResult }
  ) {
    const room = await roomsService.getRoom(roomId).catch(() => null);

    return {
      roomId,
      matchId: match.matchId,
      gameSlug: match.gameSlug,
      result: match.resultSummary,
      players: room?.players,
      ownerUserId: room?.ownerUserId
    };
  }

  function cancelDisconnectRemoval(roomId: string, userId: string): void {
    const key = roomPlayerKey(roomId, userId);
    const timer = disconnectTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }

    clearDisconnectDeadline(roomId, userId);
  }

  async function leaveRoomOrActiveGame(
    roomId: string,
    userId: string,
    options: { matchId?: string; requireBalance?: boolean } = {}
  ): Promise<void> {
    const fallbackActiveMatch = options.matchId
      ? gameRuntimeService.getActiveMatch(options.matchId)
      : (await roomsService.getActiveMatch(roomId));
    const activeMatchId = options.matchId ?? fallbackActiveMatch?.matchId ?? null;

    if (activeMatchId) {
      const match = await gameRuntimeService.leaveActiveGame(roomId, activeMatchId, userId, {
        requireBalance: options.requireBalance
      });

      if (match) {
        io.to(roomId).emit(SOCKET_EVENTS.gameState, {
          roomId,
          matchId: match.matchId,
          gameSlug: match.gameSlug,
          state: match.state
        });

        if (match.resultSummary) {
          io.to(roomId).emit(SOCKET_EVENTS.gameFinished, await createGameFinishedPayload(roomId, {
            matchId: match.matchId,
            gameSlug: match.gameSlug,
            resultSummary: match.resultSummary
          }));
        }

        if (isFinishedGameState(match.state)) {
          await resetReadyAndEmitRoomState(io, roomsService, roomId);
        }
      }
    }

    const result = await roomsService.leaveRoom(roomId, userId);

    if (result.newOwnerUserId) {
      io.to(roomId).emit(SOCKET_EVENTS.roomOwnerChanged, { roomId, ownerUserId: result.newOwnerUserId });
    }

    if (result.state) {
      io.to(roomId).emit(SOCKET_EVENTS.roomState, result.state);
    }
  }

  function scheduleDisconnectRemoval(roomId: string, userId: string): void {
    const key = roomPlayerKey(roomId, userId);
    const existingTimer = disconnectTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    setDisconnectDeadline(roomId, userId, new Date(Date.now() + DISCONNECT_GRACE_MS));

    const timer = setTimeout(async () => {
      disconnectTimers.delete(key);
      clearDisconnectDeadline(roomId, userId);

      try {
        await leaveRoomOrActiveGame(roomId, userId, { requireBalance: false });
      } catch {
        // The player may already have returned or left explicitly.
      }
    }, DISCONNECT_GRACE_MS);

    disconnectTimers.set(key, timer);
  }

  const VOICE_DISCONNECT_TTL_MS = 45_000;

  type VoiceSfuPeer = {
    participant: VoiceParticipant;
    disconnectTimer: NodeJS.Timeout | null;
    sendTransport: WebRtcTransport | null;
    recvTransport: WebRtcTransport | null;
    producer: Producer | null;
    consumers: Map<string, Consumer>;
  };

  type VoiceSfuRoom = {
    roomId: string;
    router: Router;
    peers: Map<string, VoiceSfuPeer>;
    producers: Map<string, { producer: Producer; userId: string }>;
  };

  let mediasoupWorkerPromise: Promise<Worker> | null = null;
  const voiceRooms = new Map<string, VoiceSfuRoom>();

  async function getMediasoupWorker(): Promise<Worker> {
    if (!mediasoupWorkerPromise) {
      const mediasoup = await loadMediasoup();
      mediasoupWorkerPromise = mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 40_000,
        rtcMaxPort: 49_999
      });
    }

    return mediasoupWorkerPromise!;
  }

  async function getOrCreateVoiceRoom(roomId: string): Promise<VoiceSfuRoom> {
    const existing = voiceRooms.get(roomId);
    if (existing) {
      return existing;
    }

    const worker = await getMediasoupWorker();
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48_000,
          channels: 2,
          parameters: {
            maxaveragebitrate: 16_000,
            useinbandfec: 0,
            usedtx: 1
          }
        }
      ]
    });

    const room: VoiceSfuRoom = {
      roomId,
      router,
      peers: new Map(),
      producers: new Map()
    };

    voiceRooms.set(roomId, room);
    return room;
  }

  function getOrCreateVoicePeer(room: VoiceSfuRoom, userId: string, user: AuthUser, socketId: string): VoiceSfuPeer {
    const existing = room.peers.get(userId);
    if (existing) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }

      existing.participant = {
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isMuted: existing.participant.isMuted,
        socketId
      };

      return existing;
    }

    const peer: VoiceSfuPeer = {
      participant: {
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isMuted: false,
        socketId
      },
      disconnectTimer: null,
      sendTransport: null,
      recvTransport: null,
      producer: null,
      consumers: new Map()
    };

    room.peers.set(userId, peer);
    return peer;
  }

  function closeVoicePeerResources(room: VoiceSfuRoom, peer: VoiceSfuPeer): void {
    for (const consumer of peer.consumers.values()) {
      try {
        consumer.close();
      } catch {
      }
    }
    peer.consumers.clear();

    if (peer.producer) {
      try {
        peer.producer.close();
      } catch {
      }
      peer.producer = null;
    }

    if (peer.sendTransport) {
      try {
        peer.sendTransport.close();
      } catch {
      }
      peer.sendTransport = null;
    }

    if (peer.recvTransport) {
      try {
        peer.recvTransport.close();
      } catch {
      }
      peer.recvTransport = null;
    }
  }

  function removeVoicePeer(roomId: string, userId: string): VoiceUser | null {
    const room = voiceRooms.get(roomId);
    if (!room) {
      return null;
    }

    const peer = room.peers.get(userId);
    if (!peer) {
      return null;
    }

    if (peer.disconnectTimer) {
      clearTimeout(peer.disconnectTimer);
      peer.disconnectTimer = null;
    }

    closeVoicePeerResources(room, peer);
    room.peers.delete(userId);

    if (room.peers.size === 0) {
      voiceRooms.delete(roomId);
      try {
        room.router.close();
      } catch {
      }
    }

    return toVoiceUser(peer.participant);
  }

  function scheduleVoicePeerRemoval(io: LobbyServer, roomId: string, userId: string): void {
    const room = voiceRooms.get(roomId);
    if (!room) {
      return;
    }

    const peer = room.peers.get(userId);
    if (!peer) {
      return;
    }

    if (peer.disconnectTimer) {
      clearTimeout(peer.disconnectTimer);
    }

    peer.participant.socketId = null;
    closeVoicePeerResources(room, peer);

    peer.disconnectTimer = setTimeout(() => {
      const removed = removeVoicePeer(roomId, userId);
      if (removed) {
        io.to(roomId).emit(SOCKET_EVENTS.voiceUserLeft, { roomId, userId });
      }
    }, VOICE_DISCONNECT_TTL_MS);
  }

  function markSocketDisconnectedFromVoice(io: LobbyServer, socketId: string): void {
    for (const [roomId, room] of voiceRooms) {
      for (const [userId, peer] of room.peers) {
        if (peer.participant.socketId === socketId) {
          scheduleVoicePeerRemoval(io, roomId, userId);
        }
      }
    }
  }

  gameRuntimeService.setMatchStateListener(async (match) => {
    io.to(match.roomId).emit(SOCKET_EVENTS.gameState, {
      roomId: match.roomId,
      matchId: match.matchId,
      gameSlug: match.gameSlug,
      state: match.state
    });

    if (isFinishedGameState(match.state)) {
      if (match.resultSummary) {
        io.to(match.roomId).emit(SOCKET_EVENTS.gameFinished, {
          roomId: match.roomId,
          matchId: match.matchId,
          gameSlug: match.gameSlug,
          result: match.resultSummary
        });
      }

      await resetReadyAndEmitRoomState(io, roomsService, match.roomId);
    }
  });

  io.use(async (socket, next) => {
    const token = readSocketToken(socket);
    if (!token) {
      next(new Error('Missing auth token'));
      return;
    }

    try {
      const { user } = await authService.validateToken(token);
      socket.data.user = user;
      socket.data.roomIds = new Set<string>();
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    try {
      void socket.join(userRoomId(socket.data.user.id));
    } catch {
    }

    const currentCount = activeSocialConnections.get(socket.data.user.id) ?? 0;
    activeSocialConnections.set(socket.data.user.id, currentCount + 1);

    const pendingDisconnectTimer = presenceDisconnectTimers.get(socket.data.user.id);
    if (pendingDisconnectTimer) {
      clearTimeout(pendingDisconnectTimer);
      presenceDisconnectTimers.delete(socket.data.user.id);
    } else if (currentCount === 0) {
      void notifyFriendsPresence(socket.data.user.id, true);
    }

    socket.on(SOCKET_EVENTS.roomJoin, async ({ roomId }) => {
      try {
        cancelDisconnectRemoval(roomId, socket.data.user.id);
        const state = await roomsService.joinRoom(roomId, socket.data.user);
        await socket.join(roomId);
        socket.data.roomIds.add(roomId);
        socket.to(roomId).emit(SOCKET_EVENTS.roomUserJoined, { roomId, userId: socket.data.user.id });
        io.to(roomId).emit(SOCKET_EVENTS.roomState, state);

        const messages = await chatService.getHistory(roomId, socket.data.user);
        socket.emit(SOCKET_EVENTS.chatHistory, { roomId, messages });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.roomLeave, async ({ roomId }) => {
      try {
        cancelDisconnectRemoval(roomId, socket.data.user.id);
        const voiceUser = removeVoicePeer(roomId, socket.data.user.id);
        if (voiceUser) {
          socket.to(roomId).emit(SOCKET_EVENTS.voiceUserLeft, { roomId, userId: voiceUser.userId });
        }

        await leaveRoomOrActiveGame(roomId, socket.data.user.id, { requireBalance: false });
        socket.data.roomIds.delete(roomId);
        await socket.leave(roomId);
        socket.to(roomId).emit(SOCKET_EVENTS.roomUserLeft, { roomId, userId: socket.data.user.id });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceJoin, async ({ roomId }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        if (!socket.rooms.has(roomId)) {
          await socket.join(roomId);
          socket.data.roomIds.add(roomId);
        }

        const room = await getOrCreateVoiceRoom(roomId);
        const existingPeer = room.peers.get(socket.data.user.id);
        const wasDisconnected = existingPeer?.participant.socketId === null;
        const peer = getOrCreateVoicePeer(room, socket.data.user.id, socket.data.user, socket.id);

        const existingUsers = [...room.peers.values()]
          .filter((item) => item.participant.userId !== socket.data.user.id)
          .map((item) => toVoiceUser(item.participant));

        socket.emit(SOCKET_EVENTS.voiceUsers, { roomId, users: existingUsers });

        if (!existingPeer || wasDisconnected) {
          socket.to(roomId).emit(SOCKET_EVENTS.voiceUserJoined, { roomId, user: toVoiceUser(peer.participant) });
        }

        const existingProducers = [...room.producers.entries()]
          .filter(([, entry]) => entry.userId !== socket.data.user.id)
          .map(([producerId, entry]) => ({ producerId, userId: entry.userId }));
        ack?.({
          routerRtpCapabilities: room.router.rtpCapabilities,
          producers: existingProducers
        });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceLeave, async ({ roomId }) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const voiceUser = removeVoicePeer(roomId, socket.data.user.id);
        if (voiceUser) {
          socket.to(roomId).emit(SOCKET_EVENTS.voiceUserLeft, { roomId, userId: voiceUser.userId });
        }
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceSfuCreateTransport, async ({ roomId, direction }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const room = await getOrCreateVoiceRoom(roomId);
        const peer = room.peers.get(socket.data.user.id);
        if (!peer) {
          return;
        }

const announcedIp = env.mediasoupAnnouncedIp;

const transport = await room.router.createWebRtcTransport({
  listenIps: [
    announcedIp ? { ip: '0.0.0.0', announcedIp } : { ip: '127.0.0.1' }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 24_000
});


        try {
          await transport.setMaxIncomingBitrate(24_000);
        } catch {
        }

        if (direction === 'send') {
          if (peer.sendTransport) {
            try {
              peer.sendTransport.close();
            } catch {
            }
          }
          peer.sendTransport = transport;
        } else {
          if (peer.recvTransport) {
            try {
              peer.recvTransport.close();
            } catch {
            }
          }
          peer.recvTransport = transport;
        }

        ack?.({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceSfuConnectTransport, async ({ roomId, transportId, dtlsParameters }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const room = voiceRooms.get(roomId);
        const peer = room?.peers.get(socket.data.user.id);
        const transport =
          peer?.sendTransport?.id === transportId
            ? peer.sendTransport
            : peer?.recvTransport?.id === transportId
              ? peer.recvTransport
              : null;

        if (!room || !peer || !transport) {
          return;
        }

        await transport.connect({ dtlsParameters: dtlsParameters as any });
        ack?.({ ok: true });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceSfuProduce, async ({ roomId, transportId, kind, rtpParameters }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const room = voiceRooms.get(roomId);
        const peer = room?.peers.get(socket.data.user.id);
        if (!room || !peer || !peer.sendTransport || peer.sendTransport.id !== transportId) {
          ack?.({ error: 'Voice send transport is not ready. Please retry voice.' });
          return;
        }

        if (kind !== 'audio') {
          ack?.({ error: 'Only audio voice streams are supported.' });
          return;
        }

        if (peer.producer) {
          try {
            peer.producer.close();
          } catch {
          }
          peer.producer = null;
        }

        const normalizedRtpParameters: any = rtpParameters ?? {};
        if (!Array.isArray(normalizedRtpParameters.encodings) || normalizedRtpParameters.encodings.length === 0) {
          normalizedRtpParameters.encodings = [{}];
        }

        const maxBitrate = Number(normalizedRtpParameters.encodings[0]?.maxBitrate ?? 16_000);
        normalizedRtpParameters.encodings[0].maxBitrate = Math.max(12_000, Math.min(16_000, maxBitrate));

        const producer = await peer.sendTransport.produce({
          kind: 'audio',
          rtpParameters: normalizedRtpParameters,
          appData: {
            userId: socket.data.user.id,
            roomId
          }
        });

        peer.producer = producer;
        room.producers.set(producer.id, { producer, userId: socket.data.user.id });

        producer.on('transportclose', () => {
          room.producers.delete(producer.id);
          io.to(roomId).emit(SOCKET_EVENTS.voiceSfuProducerClosed, { roomId, producerId: producer.id, userId: socket.data.user.id });
        });

        producer.on('close', () => {
          room.producers.delete(producer.id);
        });

        socket.to(roomId).emit(SOCKET_EVENTS.voiceSfuNewProducer, { roomId, producerId: producer.id, userId: socket.data.user.id });
        ack?.({ producerId: producer.id });
      } catch (error) {
        const message = errorMessage(error);
        ack?.({ error: message });
        socket.emit(SOCKET_EVENTS.roomError, { message });
      }
    });

    socket.on(SOCKET_EVENTS.voiceSfuConsume, async ({ roomId, producerId, rtpCapabilities }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const room = voiceRooms.get(roomId);
        const peer = room?.peers.get(socket.data.user.id);
        const producerEntry = room?.producers.get(producerId);

        if (!room || !peer || !peer.recvTransport || !producerEntry) {
          return;
        }

        if (producerEntry.userId === socket.data.user.id) {
          return;
        }

        const canConsume = room.router.canConsume({ producerId, rtpCapabilities: rtpCapabilities as any });
        if (!canConsume) {
          return;
        }

        const consumer = await peer.recvTransport.consume({
          producerId,
          rtpCapabilities: rtpCapabilities as any,
          paused: true
        });

        peer.consumers.set(consumer.id, consumer);

        consumer.on('transportclose', () => {
          peer.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
          peer.consumers.delete(consumer.id);
          socket.emit(SOCKET_EVENTS.voiceSfuProducerClosed, { roomId, producerId, userId: producerEntry.userId });
          try {
            consumer.close();
          } catch {
          }
        });

        ack?.({
          consumerId: consumer.id,
          producerId,
          kind: 'audio',
          rtpParameters: consumer.rtpParameters,
          userId: producerEntry.userId
        });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceSfuResumeConsumer, async ({ roomId, consumerId }, ack) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const room = voiceRooms.get(roomId);
        const peer = room?.peers.get(socket.data.user.id);
        const consumer = peer?.consumers.get(consumerId);
        if (!room || !peer || !consumer) {
          return;
        }

        await consumer.resume();
        ack?.({ ok: true });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.voiceMuteState, async ({ roomId, isMuted }) => {
      try {
        await assertRoomMember(roomsService, roomId, socket.data.user.id);

        const peer = voiceRooms.get(roomId)?.peers.get(socket.data.user.id);
        if (!peer) {
          return;
        }

        peer.participant.isMuted = isMuted;
        if (peer.producer) {
          try {
            if (isMuted) {
              await peer.producer.pause();
            } else {
              await peer.producer.resume();
            }
          } catch {
          }
        }
        io.to(roomId).emit(SOCKET_EVENTS.voiceMuteState, { roomId, userId: socket.data.user.id, isMuted });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.roomReady, async ({ roomId }) => {
      try {
        await roomsService.setReady(roomId, socket.data.user.id, true);
        io.to(roomId).emit(SOCKET_EVENTS.roomReadyChanged, { roomId, userId: socket.data.user.id, isReady: true });
        await emitRoomState(io, roomsService, roomId);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.roomUnready, async ({ roomId }) => {
      try {
        await roomsService.setReady(roomId, socket.data.user.id, false);
        io.to(roomId).emit(SOCKET_EVENTS.roomReadyChanged, { roomId, userId: socket.data.user.id, isReady: false });
        await emitRoomState(io, roomsService, roomId);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.roomUpdateSettings, async ({ roomId, settings }) => {
      try {
        const state = await roomsService.updateSettings(roomId, socket.data.user, settings);
        io.to(roomId).emit(SOCKET_EVENTS.roomSettingsUpdated, { roomId, settings: state.settings });
        io.to(roomId).emit(SOCKET_EVENTS.roomState, state);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.roomStartGame, async ({ roomId }) => {
      try {
        const result = await gameRuntimeService.startGame(roomId, socket.data.user);

        if (!socket.rooms.has(roomId)) {
          await socket.join(roomId);
          socket.data.roomIds.add(roomId);
        }

        io.to(roomId).emit(SOCKET_EVENTS.roomState, result.roomState);
        io.to(roomId).emit(SOCKET_EVENTS.roomGameStarted, {
          roomId,
          matchId: result.matchId,
          gameSlug: result.gameSlug,
          initialState: result.state
        });
        io.to(roomId).emit(SOCKET_EVENTS.gameState, {
          roomId,
          matchId: result.matchId,
          gameSlug: result.gameSlug,
          state: result.state
        });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.roomError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.gameAction, async (payload) => {
      try {
        const result = await gameRuntimeService.applyAction(payload, socket.data.user);

        io.to(payload.roomId).emit(SOCKET_EVENTS.gameState, {
          roomId: payload.roomId,
          matchId: result.matchId,
          gameSlug: result.gameSlug,
          state: result.state
        });

        if (isFinishedGameState(result.state)) {
          if (result.resultSummary) {
            io.to(payload.roomId).emit(SOCKET_EVENTS.gameFinished, await createGameFinishedPayload(payload.roomId, {
              matchId: result.matchId,
              gameSlug: result.gameSlug,
              resultSummary: result.resultSummary
            }));
          }

          await resetReadyAndEmitRoomState(io, roomsService, payload.roomId);
        }
      } catch (error) {
        socket.emit(SOCKET_EVENTS.gameError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.gameLeave, async (payload, ack) => {
      try {
        cancelDisconnectRemoval(payload.roomId, socket.data.user.id);
        const voiceUser = removeVoicePeer(payload.roomId, socket.data.user.id);
        if (voiceUser) {
          socket.to(payload.roomId).emit(SOCKET_EVENTS.voiceUserLeft, { roomId: payload.roomId, userId: voiceUser.userId });
        }

        await leaveRoomOrActiveGame(payload.roomId, socket.data.user.id, {
          matchId: payload.matchId,
          requireBalance: true
        });
        socket.data.roomIds.delete(payload.roomId);
        await socket.leave(payload.roomId);
        socket.to(payload.roomId).emit(SOCKET_EVENTS.roomUserLeft, { roomId: payload.roomId, userId: socket.data.user.id });
        ack?.({ ok: true });
      } catch (error) {
        const message = errorMessage(error);
        ack?.({ ok: false, message });
        socket.emit(SOCKET_EVENTS.gameError, { message });
      }
    });

    socket.on(SOCKET_EVENTS.gameCancelRequest, async (payload) => {
      try {
        const state = await roomsService.requestCancel(payload.roomId, socket.data.user.id);
        io.to(payload.roomId).emit(SOCKET_EVENTS.roomState, state);

        if (state.players.length > 0 && state.players.every((player) => player.cancelRequested)) {
          const match = await gameRuntimeService.cancelActiveGame(payload.roomId, payload.matchId);

          io.to(payload.roomId).emit(SOCKET_EVENTS.gameState, {
            roomId: payload.roomId,
            matchId: match.matchId,
            gameSlug: match.gameSlug,
            state: match.state
          });

          if (match.resultSummary) {
            io.to(payload.roomId).emit(SOCKET_EVENTS.gameFinished, await createGameFinishedPayload(payload.roomId, {
              matchId: match.matchId,
              gameSlug: match.gameSlug,
              resultSummary: match.resultSummary
            }));
          }

          await resetReadyAndEmitRoomState(io, roomsService, payload.roomId);
        }
      } catch (error) {
        socket.emit(SOCKET_EVENTS.gameError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.chatHistoryRequest, async ({ roomId }) => {
      try {
        const messages = await chatService.getHistory(roomId, socket.data.user);
        socket.emit(SOCKET_EVENTS.chatHistory, { roomId, messages });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.chatError, { message: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.chatSend, async ({ roomId, message }) => {
      try {
        const chatMessage = await chatService.sendMessage(roomId, socket.data.user, message);

        if (!socket.rooms.has(roomId)) {
          await socket.join(roomId);
          socket.data.roomIds.add(roomId);
        }

        io.to(roomId).emit(SOCKET_EVENTS.chatNewMessage, chatMessage);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.chatError, { message: errorMessage(error) });
      }
    });

    socket.on('disconnect', async () => {
      const remainingCount = (activeSocialConnections.get(socket.data.user.id) ?? 1) - 1;
      if (remainingCount <= 0) {
        activeSocialConnections.delete(socket.data.user.id);

        const timer = setTimeout(() => {
          presenceDisconnectTimers.delete(socket.data.user.id);
          void notifyFriendsPresence(socket.data.user.id, false);
        }, PRESENCE_DISCONNECT_DEBOUNCE_MS);

        presenceDisconnectTimers.set(socket.data.user.id, timer);
      } else {
        activeSocialConnections.set(socket.data.user.id, remainingCount);
      }

      markSocketDisconnectedFromVoice(io, socket.id);

      await Promise.all(
        [...socket.data.roomIds].map(async (roomId) => {
          try {
            scheduleDisconnectRemoval(roomId, socket.data.user.id);
            const result = await roomsService.handleDisconnect(roomId, socket.data.user.id);

            if (result.state) {
              io.to(roomId).emit(SOCKET_EVENTS.roomState, result.state);
            }
          } catch {
            // The room may already have been removed by an explicit leave.
          }
        })
      );
    });
  });

  app.addHook('onClose', async () => {
    await io.close();

    if (mediasoupWorkerPromise) {
      try {
        const worker = await mediasoupWorkerPromise;
        worker.close();
      } catch {
      }
    }
  });

  lobbyServer = io;
  return io;
}
