import type {
  ChatErrorPayload,
  ChatHistoryPayload,
  ChatMessage,
  ChatSendPayload,
  DirectChatMessage
} from './chat.js';
import type { GameActionPayload, TicTacToePlaceAction } from './game-runtime.js';
import type { RoomDetails, RoomPlayer, RoomSettings } from './room.js';

export const SOCKET_EVENTS = {
  socialPresence: 'social:presence',
  socialFriendsUpdated: 'social:friends-updated',
  socialNotificationsUpdated: 'social:notifications-updated',
  socialSentRequestsUpdated: 'social:sent-requests-updated',
  directChatNewMessage: 'direct-chat:new-message',
  directChatMessagesSeen: 'direct-chat:messages-seen',
  roomJoin: 'room:join',
  roomLeave: 'room:leave',
  roomReady: 'room:ready',
  roomUnready: 'room:unready',
  roomUpdateSettings: 'room:update-settings',
  roomStartGame: 'room:start-game',
  chatSend: 'chat:send',
  chatHistoryRequest: 'chat:history-request',
  roomState: 'room:state',
  roomUserJoined: 'room:user-joined',
  roomUserLeft: 'room:user-left',
  roomOwnerChanged: 'room:owner-changed',
  roomReadyChanged: 'room:ready-changed',
  roomSettingsUpdated: 'room:settings-updated',
  roomError: 'room:error',
  roomGameStarted: 'room:game-started',
  gameState: 'game:state',
  gameFinished: 'game:finished',
  gameError: 'game:error',
  gameAction: 'game:action',
  gameLeave: 'game:leave',
  gameCancelRequest: 'game:cancel-request',
  voiceJoin: 'voice:join',
  voiceLeave: 'voice:leave',
  voiceMuteState: 'voice:mute-state',
  voiceUserJoined: 'voice:user-joined',
  voiceUserLeft: 'voice:user-left',
  voiceUsers: 'voice:users',
  voiceSfuCreateTransport: 'voice:sfu:create-transport',
  voiceSfuConnectTransport: 'voice:sfu:connect-transport',
  voiceSfuProduce: 'voice:sfu:produce',
  voiceSfuConsume: 'voice:sfu:consume',
  voiceSfuResumeConsumer: 'voice:sfu:resume-consumer',
  voiceSfuNewProducer: 'voice:sfu:new-producer',
  voiceSfuProducerClosed: 'voice:sfu:producer-closed',
  chatNewMessage: 'chat:new-message',
  chatHistory: 'chat:history',
  chatError: 'chat:error'
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export type SocialPresencePayload = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type DirectChatMessagesSeenPayload = {
  friendId: string;
  seenAt: string;
};

export type RoomSocketPayload = {
  roomId: string;
};

export type RoomReadyChangedPayload = {
  roomId: string;
  userId: string;
  isReady: boolean;
};

export type RoomUpdateSettingsPayload = {
  roomId: string;
  settings: RoomSettings;
};

export type RoomSettingsUpdatedPayload = {
  roomId: string;
  settings: RoomSettings;
};

export type RoomUserChangedPayload = {
  roomId: string;
  userId: string;
};

export type RoomOwnerChangedPayload = {
  roomId: string;
  ownerUserId: string;
};

export type RoomErrorPayload = {
  message: string;
};

export type RoomGameStartedPayload = {
  roomId: string;
  matchId: string;
  gameSlug: string;
  initialState: unknown;
};

export type GameStatePayload = {
  roomId: string;
  matchId: string;
  gameSlug: string;
  state: unknown;
};

export type GameLeavePayload = {
  roomId: string;
  matchId: string;
};

export type GameLeaveAck = {
  ok: boolean;
  message?: string;
};

export type GameFinishedResult = {
  'game-id': string;
  status: 'finished';
  score: Record<string, number>;
  winners: string[];
  losers: string[];
};

export type GameFinishedPayload = {
  roomId: string;
  matchId: string;
  gameSlug: string;
  result: GameFinishedResult;
  players?: RoomPlayer[];
  ownerUserId?: string;
};

export type GameErrorPayload = {
  message: string;
};

export type VoiceUser = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isMuted: boolean;
};

export type VoiceUsersPayload = {
  roomId: string;
  users: VoiceUser[];
};

export type VoiceUserChangedPayload = {
  roomId: string;
  user: VoiceUser;
};

export type VoiceUserLeftPayload = {
  roomId: string;
  userId: string;
};

export type VoiceMuteStatePayload = {
  roomId: string;
  userId: string;
  isMuted: boolean;
};

export type VoiceMuteStateUpdatePayload = {
  roomId: string;
  isMuted: boolean;
};

export type VoiceSfuProducerInfo = {
  producerId: string;
  userId: string;
};

export type VoiceSfuJoinAck = {
  routerRtpCapabilities: unknown;
  producers: VoiceSfuProducerInfo[];
};

export type VoiceSfuCreateTransportPayload = {
  roomId: string;
  direction: 'send' | 'recv';
};

export type VoiceSfuCreateTransportAck = {
  id: string;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
};

export type VoiceSfuConnectTransportPayload = {
  roomId: string;
  transportId: string;
  dtlsParameters: unknown;
};

export type VoiceSfuConnectTransportAck = {
  ok: true;
};

export type VoiceSfuProducePayload = {
  roomId: string;
  transportId: string;
  kind: 'audio';
  rtpParameters: unknown;
  appData?: Record<string, unknown>;
};

export type VoiceSfuProduceAck = {
  producerId: string;
} | {
  error: string;
};

export type VoiceSfuConsumePayload = {
  roomId: string;
  producerId: string;
  rtpCapabilities: unknown;
};

export type VoiceSfuConsumeAck = {
  consumerId: string;
  producerId: string;
  kind: 'audio';
  rtpParameters: unknown;
  userId: string;
};

export type VoiceSfuResumeConsumerPayload = {
  roomId: string;
  consumerId: string;
};

export type VoiceSfuNewProducerPayload = {
  roomId: string;
  producerId: string;
  userId: string;
};

export type VoiceSfuProducerClosedPayload = {
  roomId: string;
  producerId: string;
  userId: string;
};

export type ServerToClientEvents = {
  [SOCKET_EVENTS.socialPresence]: (payload: SocialPresencePayload) => void;
  [SOCKET_EVENTS.socialFriendsUpdated]: () => void;
  [SOCKET_EVENTS.socialNotificationsUpdated]: () => void;
  [SOCKET_EVENTS.socialSentRequestsUpdated]: () => void;
  [SOCKET_EVENTS.directChatNewMessage]: (payload: DirectChatMessage) => void;
  [SOCKET_EVENTS.directChatMessagesSeen]: (payload: DirectChatMessagesSeenPayload) => void;
  [SOCKET_EVENTS.roomState]: (state: RoomDetails) => void;
  [SOCKET_EVENTS.roomUserJoined]: (payload: RoomUserChangedPayload) => void;
  [SOCKET_EVENTS.roomUserLeft]: (payload: RoomUserChangedPayload) => void;
  [SOCKET_EVENTS.roomOwnerChanged]: (payload: RoomOwnerChangedPayload) => void;
  [SOCKET_EVENTS.roomReadyChanged]: (payload: RoomReadyChangedPayload) => void;
  [SOCKET_EVENTS.roomSettingsUpdated]: (payload: RoomSettingsUpdatedPayload) => void;
  [SOCKET_EVENTS.roomError]: (payload: RoomErrorPayload) => void;
  [SOCKET_EVENTS.roomGameStarted]: (payload: RoomGameStartedPayload) => void;
  [SOCKET_EVENTS.gameState]: (payload: GameStatePayload) => void;
  [SOCKET_EVENTS.gameFinished]: (payload: GameFinishedPayload) => void;
  [SOCKET_EVENTS.gameError]: (payload: GameErrorPayload) => void;
  [SOCKET_EVENTS.voiceUserJoined]: (payload: VoiceUserChangedPayload) => void;
  [SOCKET_EVENTS.voiceUserLeft]: (payload: VoiceUserLeftPayload) => void;
  [SOCKET_EVENTS.voiceUsers]: (payload: VoiceUsersPayload) => void;
  [SOCKET_EVENTS.voiceMuteState]: (payload: VoiceMuteStatePayload) => void;
  [SOCKET_EVENTS.voiceSfuNewProducer]: (payload: VoiceSfuNewProducerPayload) => void;
  [SOCKET_EVENTS.voiceSfuProducerClosed]: (payload: VoiceSfuProducerClosedPayload) => void;
  [SOCKET_EVENTS.chatNewMessage]: (message: ChatMessage) => void;
  [SOCKET_EVENTS.chatHistory]: (payload: ChatHistoryPayload) => void;
  [SOCKET_EVENTS.chatError]: (payload: ChatErrorPayload) => void;
};

export type ClientToServerEvents = {
  [SOCKET_EVENTS.roomJoin]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.roomLeave]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.roomReady]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.roomUnready]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.roomUpdateSettings]: (payload: RoomUpdateSettingsPayload) => void;
  [SOCKET_EVENTS.roomStartGame]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.gameAction]: (payload: GameActionPayload) => void;
  [SOCKET_EVENTS.gameLeave]: (payload: GameLeavePayload, ack?: (response: GameLeaveAck) => void) => void;
  [SOCKET_EVENTS.gameCancelRequest]: (payload: GameLeavePayload) => void;
  [SOCKET_EVENTS.voiceJoin]: (payload: RoomSocketPayload, ack?: (response: VoiceSfuJoinAck) => void) => void;
  [SOCKET_EVENTS.voiceLeave]: (payload: RoomSocketPayload) => void;
  [SOCKET_EVENTS.voiceMuteState]: (payload: VoiceMuteStateUpdatePayload) => void;
  [SOCKET_EVENTS.voiceSfuCreateTransport]: (
    payload: VoiceSfuCreateTransportPayload,
    ack?: (response: VoiceSfuCreateTransportAck) => void
  ) => void;
  [SOCKET_EVENTS.voiceSfuConnectTransport]: (
    payload: VoiceSfuConnectTransportPayload,
    ack?: (response: VoiceSfuConnectTransportAck) => void
  ) => void;
  [SOCKET_EVENTS.voiceSfuProduce]: (payload: VoiceSfuProducePayload, ack?: (response: VoiceSfuProduceAck) => void) => void;
  [SOCKET_EVENTS.voiceSfuConsume]: (payload: VoiceSfuConsumePayload, ack?: (response: VoiceSfuConsumeAck) => void) => void;
  [SOCKET_EVENTS.voiceSfuResumeConsumer]: (payload: VoiceSfuResumeConsumerPayload, ack?: (response: { ok: true }) => void) => void;
  [SOCKET_EVENTS.chatSend]: (payload: ChatSendPayload) => void;
  [SOCKET_EVENTS.chatHistoryRequest]: (payload: RoomSocketPayload) => void;
};
