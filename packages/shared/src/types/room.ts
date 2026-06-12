import type { AuthUser } from './auth.js';
import type { Game } from './game.js';

export type RoomStatus = 'waiting' | 'in_game' | 'finished';

export type RoomSettings = Record<string, unknown>;

export type RoomListItem = {
  id: string;
  gameId: string;
  ownerUserId: string;
  ownerUsername: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  settings: RoomSettings;
  status: RoomStatus;
  isLocked: boolean;
  currentPlayerCount: number;
  maxPlayers: number;
  players: { username: string; fullName: string | null }[];
  createdAt: string;
};

export type RoomPlayer = {
  id: string;
  userId: string;
  username: string;
  fullName: string | null;
  age: number | null;
  province: string | null;
  city: string | null;
  avatarUrl: string | null;
  isReady: boolean;
  isConnected: boolean;
  cancelRequested: boolean;
  disconnectedUntil: string | null;
  joinedAt: string;
  seatIndex: number | null;
};


export type ActiveRoomMatch = {
  matchId: string;
  gameSlug: string;
  state: unknown;
};

export type RoomDetails = Omit<RoomListItem, 'players'> & {
  game: Game;
  owner: AuthUser;
  players: RoomPlayer[];
  minPlayers: number;
  canStart: boolean;
  activeMatch: ActiveRoomMatch | null;
};
