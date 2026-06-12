import type {
  ActiveRoomMatch,
  AuthUser,
  Game,
  RoomDetails,
  RoomListItem,
  RoomPlayer,
  RoomSettings
} from '@game-platform/shared';
import { calculateAgeFromJalaliBirthDate } from '../auth/auth.utils.js';
import { RoomsError } from './rooms.errors.js';
import { defaultSettingsForGame, validateSettingsForGame } from './room-settings.js';
import {
  RoomsRepository,
  type RoomCoreRow,
  type RoomPlayerRow,
  type RoomSummaryRow
} from './rooms.repository.js';
import type { Game as GameRow, Room as RoomRow } from '../../db/schema.js';

export { RoomsError } from './rooms.errors.js';

export type LeaveRoomResult = {
  roomDeleted: boolean;
  previousOwnerUserId: string | null;
  newOwnerUserId: string | null;
  state: RoomDetails | null;
};

export type CurrentRoomMembership = {
  roomId: string;
  gameId: string;
  roomStatus: RoomDetails['status'];
  gameSlug: string;
};

const disconnectDeadlines = new Map<string, Date>();

export function roomPlayerKey(roomId: string, userId: string): string {
  return `${roomId}:${userId}`;
}

export function setDisconnectDeadline(roomId: string, userId: string, deadline: Date): void {
  disconnectDeadlines.set(roomPlayerKey(roomId, userId), deadline);
}

export function clearDisconnectDeadline(roomId: string, userId: string): void {
  disconnectDeadlines.delete(roomPlayerKey(roomId, userId));
}

function toIsoString(date: Date): string {
  return date.toISOString();
}

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    gameType: row.gameType,
    isActive: row.isActive,
    roomsCount: 0,
    score: 0
  };
}

function toListItem(row: RoomSummaryRow): RoomListItem {
  return {
    id: row.id,
    gameId: row.gameId,
    ownerUserId: row.ownerUserId,
    ownerUsername: row.ownerUsername,
    ownerName: row.ownerFullName,
    ownerAvatarUrl: row.ownerAvatarUrl,
    settings: row.settings,
    status: row.status,
    isLocked: row.isLocked,
    currentPlayerCount: row.currentPlayerCount,
    maxPlayers: row.maxPlayers,
    players: row.players ?? [],
    createdAt: toIsoString(row.createdAt)
  };
}

function resolveUserAge(user: { birthDateShamsi: string | null }): number | null {
  if (user.birthDateShamsi) {
    try {
      return calculateAgeFromJalaliBirthDate(user.birthDateShamsi);
    } catch {
      return null;
    }
  }

  return null;
}

function toPlayer(row: RoomPlayerRow): RoomPlayer {
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    fullName: row.fullName,
    age: resolveUserAge(row),
    province: row.province,
    city: row.city,
    avatarUrl: row.avatarUrl,
    isReady: row.isReady,
    isConnected: row.isConnected,
    cancelRequested: row.cancelRequested,
    disconnectedUntil: row.isConnected ? null : (disconnectDeadlines.get(roomPlayerKey(row.roomId, row.userId)) ?? null)?.toISOString() ?? null,
    joinedAt: toIsoString(row.joinedAt),
    seatIndex: row.seatIndex
  };
}


function toDetails(core: RoomCoreRow, players: RoomPlayer[], activeMatch: ActiveRoomMatch | null): RoomDetails {
  const currentPlayerCount = players.length;
  const activePlayers = players.filter((player) => player.isConnected);

  const canStart =
    core.status === 'waiting' &&
    activePlayers.length >= core.minPlayers &&
    activePlayers.length <= core.maxPlayers &&
    activePlayers.length > 0 &&
    activePlayers.every((player) => player.isReady);

  return {
    ...toListItem({ ...core, currentPlayerCount }),
    currentPlayerCount,
    minPlayers: core.minPlayers,
    game: toGame(core.game),
    owner: (() => {
      return {
        ...core.owner,
        age: resolveUserAge(core.owner),
        lastGemCollectionAt: core.owner.lastGemCollectionAt.toISOString(),
        lastXpCollectionAt: core.owner.lastXpCollectionAt.toISOString()
      };
    })(),
    players,
    canStart,
    activeMatch
  };
}

function ensureAdmin(user: AuthUser): void {
  if (user.role !== 'admin') {
    throw new RoomsError('Forbidden', 403);
  }
}

function ensureAdminOrObserver(user: AuthUser): void {
  if (user.role !== 'admin' && user.role !== 'observer') {
    throw new RoomsError('Forbidden', 403);
  }
}

function isSingleRoomMembershipConflict(error: unknown): boolean {
  const dbError = error as { code?: string; constraint?: string } | null;
  return dbError?.code === '23505' && dbError.constraint === 'room_players_user_id_unique';
}

export class RoomsService {
  constructor(private readonly roomsRepository = new RoomsRepository()) {}

  async listRooms(gameId: string): Promise<RoomListItem[]> {
    const game = await this.roomsRepository.findGameById(gameId);

    if (!game) {
      throw new RoomsError('Game not found', 404);
    }

    const rows = await this.roomsRepository.listRoomsByGameId(gameId);
    return rows.map(toListItem);
  }

  async listAllRoomsForAdmin(user: AuthUser): Promise<RoomListItem[]> {
    ensureAdminOrObserver(user);

    const rows = await this.roomsRepository.listAllRooms();
    const roomIds = rows.map((r) => r.id);
    const allPlayers = await this.roomsRepository.findAllPlayersByRoomIds(roomIds);

    const playersByRoomId = allPlayers.reduce(
      (acc, p) => {
        if (!acc[p.roomId]) acc[p.roomId] = [];
        acc[p.roomId].push({ username: p.username, fullName: p.fullName });
        return acc;
      },
      {} as Record<string, { username: string; fullName: string | null }[]>
    );

    const rowsWithPlayers = rows.map((row) => ({
      ...row,
      players: playersByRoomId[row.id] ?? []
    }));

    return rowsWithPlayers.map(toListItem);
  }

  async getCurrentRoomMembership(user: AuthUser): Promise<CurrentRoomMembership | null> {
    const membership = await this.roomsRepository.findCurrentRoomMembership(user.id);

    if (!membership) {
      return null;
    }

    return membership;
  }

  async createRoom(gameId: string, user: AuthUser): Promise<RoomDetails> {
    const game = await this.roomsRepository.findGameById(gameId);

    if (!game || !game.isActive) {
      throw new RoomsError('Game not found', 404);
    }

    const existingMembership = await this.roomsRepository.findUserRoomMembership(user.id);

    if (existingMembership) {
      throw new RoomsError('You are already in another room', 409);
    }

    let room: RoomRow;

    try {
      room = await this.roomsRepository.createRoomWithOwner(
        {
          gameId,
          ownerUserId: user.id,
          settings: defaultSettingsForGame(game.slug),
          status: 'waiting'
        },
        {
          userId: user.id,
          isConnected: true,
          isReady: false
        }
      );
    } catch (error) {
      if (isSingleRoomMembershipConflict(error)) {
        throw new RoomsError('You are already in another room', 409);
      }

      throw error;
    }

    return this.getRoom(room.id);
  }

  async getRoom(roomId: string): Promise<RoomDetails> {
    const core = await this.roomsRepository.findRoomCoreById(roomId);

    if (!core) {
      throw new RoomsError('اتاق پیدا نشد', 404);
    }

    const players = (await this.roomsRepository.listPlayers(roomId)).map(toPlayer);
    const activeMatch = await this.getActiveMatch(roomId);

    return toDetails(core, players, activeMatch);
  }

  async getActiveMatch(roomId: string): Promise<ActiveRoomMatch | null> {
    const match = await this.roomsRepository.findActiveMatchByRoomId(roomId);

    if (!match) {
      return null;
    }

    return {
      matchId: match.id,
      gameSlug: match.gameSlug,
      state: match.matchState
    };
  }

  async joinRoom(roomId: string, user: AuthUser): Promise<RoomDetails> {
    const room = await this.getRoom(roomId);

    if (room.status === 'finished') {
      throw new RoomsError('Cannot join a finished room', 409);
    }

    const existingPlayer = room.players.find((player) => player.userId === user.id);

    if (!existingPlayer) {
      if (room.status !== 'waiting') {
        throw new RoomsError('Cannot join a game in progress', 409);
      }

      const existingMembership = await this.roomsRepository.findUserRoomMembership(user.id);

      if (existingMembership) {
        throw new RoomsError('You are already in another room', 409);
      }

      if (room.currentPlayerCount >= room.maxPlayers) {
        throw new RoomsError('Room is full', 409);
      }
    }

    try {
      clearDisconnectDeadline(roomId, user.id);
      await this.roomsRepository.addPlayer(roomId, user.id);
    } catch (error) {
      if (isSingleRoomMembershipConflict(error)) {
        throw new RoomsError('You are already in another room', 409);
      }

      throw error;
    }

    return this.getRoom(roomId);
  }

  async updateSettings(roomId: string, user: AuthUser, rawSettings: RoomSettings): Promise<RoomDetails> {
    const room = await this.getRoom(roomId);

    if (room.ownerUserId !== user.id) {
      throw new RoomsError('Only the room owner can update settings', 403);
    }

    if (room.status !== 'waiting') {
      throw new RoomsError('Settings can only be changed while the room is waiting', 409);
    }

    const settings = validateSettingsForGame(room.game.slug, rawSettings);
    await this.roomsRepository.updateSettingsAndResetReady(roomId, settings);

    return this.getRoom(roomId);
  }

  async setReady(roomId: string, userId: string, isReady: boolean): Promise<RoomDetails> {
    const room = await this.getRoom(roomId);

    if (!room.players.some((player) => player.userId === userId)) {
      throw new RoomsError('You are not a member of this room', 403);
    }

    if (room.status !== 'waiting') {
      throw new RoomsError('Ready state can only change in waiting rooms', 409);
    }

    await this.roomsRepository.setPlayerReady(roomId, userId, isReady);
    return this.getRoom(roomId);
  }

  async requestCancel(roomId: string, userId: string): Promise<RoomDetails> {
    const room = await this.getRoom(roomId);

    if (room.status !== 'in_game') {
      throw new RoomsError('Cancel requests are only available during games', 409);
    }

    if (!room.players.some((player) => player.userId === userId)) {
      throw new RoomsError('You are not a member of this room', 403);
    }

    await this.roomsRepository.setPlayerCancelRequested(roomId, userId, true);
    return this.getRoom(roomId);
  }

  async resetReady(roomId: string): Promise<RoomDetails> {
    await this.roomsRepository.resetPlayersReady(roomId);
    return this.getRoom(roomId);
  }

  async leaveRoom(roomId: string, userId: string): Promise<LeaveRoomResult> {
    const room = await this.getRoom(roomId);
    const existingPlayer = room.players.find((player) => player.userId === userId);

    if (!existingPlayer) {
      return {
        roomDeleted: false,
        previousOwnerUserId: room.ownerUserId,
        newOwnerUserId: null,
        state: room
      };
    }

    const previousOwnerUserId = room.ownerUserId;

    clearDisconnectDeadline(roomId, userId);
    await this.roomsRepository.removePlayer(roomId, userId);

    const remainingPlayers = await this.roomsRepository.listPlayers(roomId);

    if (remainingPlayers.length === 0) {
      if (room.status === 'waiting') {
        await this.roomsRepository.deleteRoom(roomId);
      } else {
        await this.roomsRepository.markRoomFinished(roomId);
      }

      return {
        roomDeleted: true,
        previousOwnerUserId,
        newOwnerUserId: null,
        state: null
      };
    }

    let newOwnerUserId: string | null = null;

    if (previousOwnerUserId === userId) {
      newOwnerUserId = remainingPlayers[0]!.userId;
      await this.roomsRepository.updateOwner(roomId, newOwnerUserId);
    }

    return {
      roomDeleted: false,
      previousOwnerUserId,
      newOwnerUserId,
      state: await this.getRoom(roomId)
    };
  }

  async handleDisconnect(roomId: string, userId: string): Promise<LeaveRoomResult> {
    const room = await this.getRoom(roomId);
    const existingPlayer = room.players.find((player) => player.userId === userId);

    if (!existingPlayer) {
      return {
        roomDeleted: false,
        previousOwnerUserId: room.ownerUserId,
        newOwnerUserId: null,
        state: room
      };
    }

    await this.roomsRepository.setPlayerConnected(roomId, userId, false);

    return {
      roomDeleted: false,
      previousOwnerUserId: room.ownerUserId,
      newOwnerUserId: null,
      state: await this.getRoom(roomId)
    };
  }

  async handleReconnect(roomId: string, userId: string): Promise<RoomDetails> {
    const room = await this.getRoom(roomId);
    const existingPlayer = room.players.find((player) => player.userId === userId);

    if (!existingPlayer) {
      throw new RoomsError('You are not a member of this room', 403);
    }

    clearDisconnectDeadline(roomId, userId);
    await this.roomsRepository.setPlayerConnected(roomId, userId, true);

    return this.getRoom(roomId);
  }

  async deleteRoomForAdmin(roomId: string, user: AuthUser): Promise<void> {
    ensureAdmin(user);

    const room = await this.roomsRepository.findRoomCoreById(roomId);

    if (!room) {
      throw new RoomsError('اتاق پیدا نشد', 404);
    }

    await this.roomsRepository.deleteRoom(roomId);
  }

  async deleteRoomAsAdmin(roomId: string, user: AuthUser): Promise<void> {
    return this.deleteRoomForAdmin(roomId, user);
  }
}
