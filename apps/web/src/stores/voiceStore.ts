import {
  SOCKET_EVENTS,
  type SocketEventName,
  type VoiceMuteStatePayload,
  type VoiceUser,
  type VoiceUserChangedPayload,
  type VoiceUserLeftPayload,
  type VoiceSfuJoinAck,
  type VoiceSfuNewProducerPayload,
  type VoiceSfuProducerClosedPayload,
  type VoiceSfuCreateTransportAck,
  type VoiceSfuConsumeAck,
  type VoiceUsersPayload
} from '@game-platform/shared';
import { Device } from 'mediasoup-client';

import type { types } from 'mediasoup-client';
type Consumer = types.Consumer;
type Producer = types.Producer;
type Transport = types.Transport;
import { create } from 'zustand';
import { getLobbySocket } from '../lib/socket';

type RemoteAudioStream = {
  userId: string;
  stream: MediaStream;
};

type VoiceAckError = {
  error: string;
};

type VoiceStatus = 'idle' | 'joining' | 'joined';

type VoiceStore = {
  status: VoiceStatus;
  roomId: string | null;
  token: string | null;
  currentUser: VoiceUser | null;
  localStream: MediaStream | null;
  participants: VoiceUser[];
  remoteStreams: RemoteAudioStream[];
  isMuted: boolean;
  error: string | null;
  needsRetry: boolean;
  joinVoice: (roomId: string, token: string, currentUser: VoiceUser) => Promise<void>;
  leaveVoice: () => void;
  setMuted: (isMuted: boolean) => void;
  syncSocketHandlers: (token: string) => void;
  cleanupSocketHandlers: () => void;
  clearError: () => void;
  retryConnection: () => Promise<void>;
};

const consumerByProducerId = new Map<string, Consumer>();
const producerIdByConsumerId = new Map<string, string>();
const userIdByProducerId = new Map<string, string>();
const remoteStreamByUserId = new Map<string, MediaStream>();
const ACK_TIMEOUT_MS = 10_000;

let device: Device | null = null;
let recvTransport: Transport | null = null;
let sendTransport: Transport | null = null;
let producer: Producer | null = null;

let activeSocketToken: string | null = null;
let handlersAttached = false;
let joinInFlight: Promise<void> | null = null;
let muteRequestId = 0;

function sortUsers(users: VoiceUser[]): VoiceUser[] {
  return [...users].sort((a, b) => a.username.localeCompare(b.username));
}

function mergeUser(users: VoiceUser[], nextUser: VoiceUser): VoiceUser[] {
  return sortUsers([...users.filter((user) => user.userId !== nextUser.userId), nextUser]);
}

function removeUser(users: VoiceUser[], userId: string): VoiceUser[] {
  return users.filter((user) => user.userId !== userId);
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function stopRemoteStreams(): void {
  for (const stream of remoteStreamByUserId.values()) {
    stopStream(stream);
  }
  remoteStreamByUserId.clear();
}

function flushRemoteStreamsToStore(): void {
  useVoiceStore.setState({
    remoteStreams: [...remoteStreamByUserId.entries()].map(([userId, stream]) => ({ userId, stream }))
  });
}

function emitWithAck<T>(token: string, event: SocketEventName, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = getLobbySocket(token) as any;
    const timer = window.setTimeout(() => {
      reject(new Error(`Voice signaling timeout: ${String(event)}`));
    }, ACK_TIMEOUT_MS);

    try {
      socket.emit(event as SocketEventName, payload, (response: T | VoiceAckError | undefined) => {
        window.clearTimeout(timer);
        if (response && typeof response === 'object' && 'error' in response && typeof response.error === 'string') {
          reject(new Error(response.error));
          return;
        }

      resolve(response as T);  // ← اضافه کردن cast
      });
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  });
}

function closeMediasoupState(): void {
  for (const consumer of consumerByProducerId.values()) {
    try {
      consumer.close();
    } catch {
    }
  }
  consumerByProducerId.clear();
  producerIdByConsumerId.clear();
  userIdByProducerId.clear();

  if (producer) {
    try {
      producer.close();
    } catch {
    }
    producer = null;
  }

  if (sendTransport) {
    try {
      sendTransport.close();
    } catch {
    }
    sendTransport = null;
  }

  if (recvTransport) {
    try {
      recvTransport.close();
    } catch {
    }
    recvTransport = null;
  }

  stopRemoteStreams();
  flushRemoteStreamsToStore();
}

async function ensureDeviceLoaded(token: string, roomId: string): Promise<VoiceSfuJoinAck> {
  const joinAck = await emitWithAck<VoiceSfuJoinAck>(token, SOCKET_EVENTS.voiceJoin, { roomId });

  if (!device) {
    device = new Device();
  }

  if (!device.loaded) {
    await device.load({ routerRtpCapabilities: joinAck.routerRtpCapabilities as any });
  }

  return joinAck;
}

async function ensureRecvTransport(token: string, roomId: string): Promise<Transport> {
  if (!device || !device.loaded) {
    throw new Error('Voice device not ready');
  }

  if (recvTransport) {
    return recvTransport;
  }

  const options = await emitWithAck<VoiceSfuCreateTransportAck>(token, SOCKET_EVENTS.voiceSfuCreateTransport, {
    roomId,
    direction: 'recv'
  });

  const transport = device.createRecvTransport({
    id: options.id,
    iceParameters: options.iceParameters as any,
    iceCandidates: options.iceCandidates as any,
    dtlsParameters: options.dtlsParameters as any
  });

  transport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (error: Error) => void) => {
    void emitWithAck(token, SOCKET_EVENTS.voiceSfuConnectTransport, {
      roomId,
      transportId: transport.id,
      dtlsParameters
    })
      .then(() => callback())
      .catch((error) => errback(error instanceof Error ? error : new Error(String(error))));
  });

  transport.on('connectionstatechange', (state: string) => {
    if (state === 'failed' || state === 'closed') {
      useVoiceStore.setState({
        error: 'Voice connection failed. Retry connection.',
        needsRetry: true
      });
    }
  });

  recvTransport = transport;
  return transport;
}

async function ensureSendTransport(token: string, roomId: string): Promise<Transport> {
  if (!device || !device.loaded) {
    throw new Error('Voice device not ready');
  }

  if (sendTransport) {
    return sendTransport;
  }

  const options = await emitWithAck<VoiceSfuCreateTransportAck>(token, SOCKET_EVENTS.voiceSfuCreateTransport, {
    roomId,
    direction: 'send'
  });

  const transport = device.createSendTransport({
    id: options.id,
    iceParameters: options.iceParameters as any,
    iceCandidates: options.iceCandidates as any,
    dtlsParameters: options.dtlsParameters as any
  });

  transport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (error: Error) => void) => {
    void emitWithAck(token, SOCKET_EVENTS.voiceSfuConnectTransport, {
      roomId,
      transportId: transport.id,
      dtlsParameters
    })
      .then(() => callback())
      .catch((error) => errback(error instanceof Error ? error : new Error(String(error))));
  });

  transport.on(
    'produce',
    (
      { kind, rtpParameters, appData }: any,
      callback: (response: { id: string }) => void,
      errback: (error: Error) => void
    ) => {
    void emitWithAck<{ producerId: string }>(token, SOCKET_EVENTS.voiceSfuProduce, {
      roomId,
      transportId: transport.id,
      kind,
      rtpParameters,
      appData
    })
      .then((response) => callback({ id: response.producerId }))
      .catch((error) => errback(error instanceof Error ? error : new Error(String(error))));
    }
  );

  transport.on('connectionstatechange', (state: string) => {
    if (state === 'failed' || state === 'closed') {
      useVoiceStore.setState({
        error: 'Voice connection failed. Retry connection.',
        needsRetry: true
      });
    }
  });

  sendTransport = transport;
  return transport;
}

async function consumeProducer(token: string, roomId: string, producerId: string): Promise<void> {
  if (!device || !device.loaded) {
    return;
  }

  await ensureRecvTransport(token, roomId);

  if (!recvTransport) {
    return;
  }

  if (consumerByProducerId.has(producerId)) {
    return;
  }

  const response = await emitWithAck<VoiceSfuConsumeAck>(token, SOCKET_EVENTS.voiceSfuConsume, {
    roomId,
    producerId,
    rtpCapabilities: device.rtpCapabilities
  });

  const consumer = await recvTransport.consume({
    id: response.consumerId,
    producerId,
    kind: response.kind,
    rtpParameters: response.rtpParameters as any
  });

  consumerByProducerId.set(producerId, consumer);
  producerIdByConsumerId.set(consumer.id, producerId);
  userIdByProducerId.set(producerId, response.userId);

  const previousStream = remoteStreamByUserId.get(response.userId) ?? null;
  stopStream(previousStream);

  const stream = new MediaStream([consumer.track]);
  remoteStreamByUserId.set(response.userId, stream);
  flushRemoteStreamsToStore();

  consumer.on('transportclose', () => {
    consumerByProducerId.delete(producerId);
    producerIdByConsumerId.delete(consumer.id);
  });

  consumer.on('producerclose' as any, () => {
    consumerByProducerId.delete(producerId);
    producerIdByConsumerId.delete(consumer.id);
    userIdByProducerId.delete(producerId);
    remoteStreamByUserId.delete(response.userId);
    flushRemoteStreamsToStore();
  });

  await emitWithAck(token, SOCKET_EVENTS.voiceSfuResumeConsumer, {
    roomId,
    consumerId: consumer.id
  });
}

function handleVoiceUsers(payload: VoiceUsersPayload): void {
  const state = useVoiceStore.getState();

  if (payload.roomId !== state.roomId || !state.currentUser) {
    return;
  }

  const participants = sortUsers([state.currentUser, ...payload.users]);

  useVoiceStore.setState({
    participants,
    error: null,
    needsRetry: false
  });
}

function handleVoiceUserJoined(payload: VoiceUserChangedPayload): void {
  const state = useVoiceStore.getState();

  if (payload.roomId !== state.roomId || payload.user.userId === state.currentUser?.userId) {
    return;
  }

  useVoiceStore.setState((currentState) => ({
    participants: mergeUser(currentState.participants, payload.user),
    error: null,
    needsRetry: false
  }));
}

function handleVoiceUserLeft(payload: VoiceUserLeftPayload): void {
  const state = useVoiceStore.getState();

  if (payload.roomId !== state.roomId) {
    return;
  }

  for (const [producerId, userId] of userIdByProducerId.entries()) {
    if (userId !== payload.userId) {
      continue;
    }

    const consumer = consumerByProducerId.get(producerId);
    if (consumer) {
      try {
        consumer.close();
      } catch {
      }
      producerIdByConsumerId.delete(consumer.id);
    }

    consumerByProducerId.delete(producerId);
    userIdByProducerId.delete(producerId);
  }

  useVoiceStore.setState((currentState) => ({
    participants: removeUser(currentState.participants, payload.userId),
    remoteStreams: currentState.remoteStreams.filter((stream) => stream.userId !== payload.userId),
    error: null,
    needsRetry: false
  }));

  remoteStreamByUserId.delete(payload.userId);
  flushRemoteStreamsToStore();
}

function handleVoiceMuteState(payload: VoiceMuteStatePayload): void {
  const state = useVoiceStore.getState();

  if (payload.roomId !== state.roomId) {
    return;
  }

  useVoiceStore.setState((currentState) => ({
    participants: sortUsers(
      currentState.participants.map((user) =>
        user.userId === payload.userId ? { ...user, isMuted: payload.isMuted } : user
      )
    ),
    currentUser:
      payload.userId === currentState.currentUser?.userId
        ? { ...currentState.currentUser, isMuted: payload.isMuted }
        : currentState.currentUser,
    isMuted:
      payload.userId === currentState.currentUser?.userId
        ? payload.isMuted
        : currentState.isMuted
  }));
}

function handleSocketDisconnect(): void {
  const state = useVoiceStore.getState();

  closeMediasoupState();
  stopStream(state.localStream);

  useVoiceStore.setState({
    status: state.status === 'idle' ? 'idle' : 'joining',
    localStream: null,
    remoteStreams: [],
    error: state.status === 'idle' ? state.error : 'Voice disconnected. Reconnecting...',
    needsRetry: false
  });
}

function handleSocketConnect(): void {
  const state = useVoiceStore.getState();

  if (!state.token || !state.roomId || !state.currentUser) {
    return;
  }

  if (state.status === 'idle') {
    return;
  }

  void ensureVoiceSession(state.roomId, state.token).catch(() => {
    useVoiceStore.setState({
      error: 'Voice connection failed. Retry connection.',
      needsRetry: true
    });
  });
}

async function ensureVoiceSession(roomId: string, token: string): Promise<void> {
  if (joinInFlight) {
    return joinInFlight;
  }

  joinInFlight = (async () => {
    closeMediasoupState();
    const joinAck = await ensureDeviceLoaded(token, roomId);
    await ensureRecvTransport(token, roomId);

    for (const entry of joinAck.producers) {
      await consumeProducer(token, roomId, entry.producerId);
    }

    useVoiceStore.setState({
      status: 'joined',
      error: null,
      needsRetry: false
    });
  })();

  try {
    await joinInFlight;
  } finally {
    joinInFlight = null;
  }
}

function attachSocketHandlers(token: string): void {
  const socket = getLobbySocket(token);

  if (handlersAttached && activeSocketToken === token) {
    return;
  }

  detachSocketHandlers();

  activeSocketToken = token;
  handlersAttached = true;

  socket.on(SOCKET_EVENTS.voiceUsers, handleVoiceUsers);
  socket.on(SOCKET_EVENTS.voiceUserJoined, handleVoiceUserJoined);
  socket.on(SOCKET_EVENTS.voiceUserLeft, handleVoiceUserLeft);
  socket.on(SOCKET_EVENTS.voiceMuteState, handleVoiceMuteState);
  socket.on(SOCKET_EVENTS.voiceSfuNewProducer, (payload: VoiceSfuNewProducerPayload) => {
    const state = useVoiceStore.getState();
    if (payload.roomId !== state.roomId || !state.token) {
      return;
    }
    void consumeProducer(state.token, payload.roomId, payload.producerId).catch((error) => {
      console.warn('voice consume warning', error);
    });
  });
  socket.on(SOCKET_EVENTS.voiceSfuProducerClosed, (payload: VoiceSfuProducerClosedPayload) => {
    const state = useVoiceStore.getState();
    if (payload.roomId !== state.roomId) {
      return;
    }

    const consumer = consumerByProducerId.get(payload.producerId);
    if (consumer) {
      try {
        consumer.close();
      } catch {
      }
      producerIdByConsumerId.delete(consumer.id);
    }

    consumerByProducerId.delete(payload.producerId);
    userIdByProducerId.delete(payload.producerId);
    remoteStreamByUserId.delete(payload.userId);
    flushRemoteStreamsToStore();
  });
  socket.on('connect', handleSocketConnect);
  socket.on('disconnect', handleSocketDisconnect);
}

function detachSocketHandlers(): void {
  if (!handlersAttached || !activeSocketToken) {
    return;
  }

  const socket = getLobbySocket(activeSocketToken);

  socket.off(SOCKET_EVENTS.voiceUsers, handleVoiceUsers);
  socket.off(SOCKET_EVENTS.voiceUserJoined, handleVoiceUserJoined);
  socket.off(SOCKET_EVENTS.voiceUserLeft, handleVoiceUserLeft);
  socket.off(SOCKET_EVENTS.voiceMuteState, handleVoiceMuteState);
  socket.off(SOCKET_EVENTS.voiceSfuNewProducer);
  socket.off(SOCKET_EVENTS.voiceSfuProducerClosed);
  socket.off('connect', handleSocketConnect);
  socket.off('disconnect', handleSocketDisconnect);

  handlersAttached = false;
  activeSocketToken = null;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  status: 'idle',
  roomId: null,
  token: null,
  currentUser: null,
  localStream: null,
  participants: [],
  remoteStreams: [],
  isMuted: true,
  error: null,
  needsRetry: false,

  joinVoice: async (roomId, token, currentUser) => {
    const currentState = get();

    if (currentState.status === 'joining' && currentState.roomId === roomId) {
      return;
    }

    if (currentState.status === 'joined' && currentState.roomId === roomId) {
      return;
    }

    if (currentState.status !== 'idle') {
      get().leaveVoice();
    }

    set({
      status: 'joining',
      roomId,
      token,
      error: null,
      needsRetry: false
    });

    try {
      const user: VoiceUser = {
        ...currentUser,
        isMuted: true
      };

      attachSocketHandlers(token);

      set({
        status: 'joining',
        roomId,
        token,
        currentUser: user,
        participants: [user],
        remoteStreams: [],
        isMuted: true,
        error: null,
        needsRetry: false
      });

      await ensureVoiceSession(roomId, token);
      getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: true });
    } catch (error) {
      set({
        status: 'idle',
        roomId: null,
        token: null,
        currentUser: null,
        localStream: null,
        participants: [],
        remoteStreams: [],
        isMuted: true,
        error: error instanceof Error ? error.message : 'Voice join failed.',
        needsRetry: true
      });
    }
  },

  leaveVoice: () => {
    const state = get();

    if (state.roomId && state.token) {
      getLobbySocket(state.token).emit(SOCKET_EVENTS.voiceLeave, {
        roomId: state.roomId
      });
    }

    closeMediasoupState();
    stopStream(state.localStream);

    set({
      status: 'idle',
      roomId: null,
      token: null,
      currentUser: null,
      localStream: null,
      participants: [],
      remoteStreams: [],
      isMuted: true,
      error: null,
      needsRetry: false
    });
  },

  setMuted: (isMuted) => {
    const state = get();
    const token = state.token;
    const roomId = state.roomId;

    if (!token || !roomId) {
      return;
    }

    const requestId = ++muteRequestId;

    if (isMuted) {
      const currentUser = state.currentUser
        ? {
            ...state.currentUser,
            isMuted: true
          }
        : null;

      set({
        currentUser,
        isMuted: true,
        participants: currentUser ? mergeUser(state.participants, currentUser) : state.participants
      });

      if (producer) {
        producer.pause();
        void producer.replaceTrack({ track: null }).catch(() => {});
      }

      stopStream(state.localStream);

      set({
        localStream: null,
        error: null,
        needsRetry: false
      });

      getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: true });
    } else {
      void (async () => {
        await ensureVoiceSession(roomId, token);
        await ensureSendTransport(token, roomId);

        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            sampleSize: 16,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        if (requestId !== muteRequestId || get().isMuted) {
          stopStream(localStream);
          getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: true });
          return;
        }

        const track = localStream.getAudioTracks()[0];
        if (!track) {
          stopStream(localStream);
          throw new Error('Microphone track missing');
        }

        if (!producer && sendTransport) {
          producer = await sendTransport.produce({
            track,
            encodings: [{ maxBitrate: 16000 }],
            codecOptions: {
              opusStereo: false,
              opusDtx: true,
              opusFec: false,
              opusPtime: 60
            }
          });
        } else if (producer) {
          await producer.replaceTrack({ track });
          await producer.resume();
        }

        if (requestId !== muteRequestId || get().isMuted) {
          stopStream(localStream);
          if (producer) {
            producer.pause();
            await producer.replaceTrack({ track: null }).catch(() => {});
          }
          getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: true });
          return;
        }

        stopStream(get().localStream);

        set({
          currentUser: state.currentUser ? { ...state.currentUser, isMuted: false } : null,
          isMuted: false,
          localStream
        });

        if (state.currentUser) {
          useVoiceStore.setState((currentState) => {
            const unmutedUser = currentState.currentUser ? { ...currentState.currentUser, isMuted: false } : null;
            return {
              currentUser: unmutedUser,
              participants: unmutedUser ? mergeUser(currentState.participants, unmutedUser) : currentState.participants
            };
          });
        }

        getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: false });
      })().catch((error) => {
        if (requestId !== muteRequestId) {
          return;
        }

        set({
          error: error instanceof Error ? error.message : 'Microphone permission failed.',
          needsRetry: true,
          isMuted: true,
          currentUser: state.currentUser ? { ...state.currentUser, isMuted: true } : null
        });

        if (state.currentUser) {
          useVoiceStore.setState((currentState) => {
            const mutedUser = currentState.currentUser ? { ...currentState.currentUser, isMuted: true } : null;
            return {
              currentUser: mutedUser,
              participants: mutedUser ? mergeUser(currentState.participants, mutedUser) : currentState.participants
            };
          });
        }

        getLobbySocket(token).emit(SOCKET_EVENTS.voiceMuteState, { roomId, isMuted: true });
        return;
      });
    }
  },

  clearError: () => {
    set({
      error: null,
      needsRetry: false
    });
  },

  retryConnection: async () => {
    const state = get();

    if (!state.roomId || !state.token || !state.currentUser) {
      return;
    }

    const nextRoomId = state.roomId;
    const nextToken = state.token;
    const nextUser = state.currentUser;

    get().leaveVoice();

    await get().joinVoice(nextRoomId, nextToken, nextUser);
  },

  syncSocketHandlers: (token) => {
    attachSocketHandlers(token);
  },

  cleanupSocketHandlers: () => {
    detachSocketHandlers();
  }
}));
