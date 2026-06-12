import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import {
  games,
  gameMatches,
  roomPlayers,
  rooms,
  users,
  type Game,
  type GameMatch,
  type NewRoom,
  type NewRoomPlayer,
  type Room,
  type RoomPlayer,
  type User
} from '../../db/schema.js';

export type RoomSummaryRow = {
  id: string;
  gameId: string;
  ownerUserId: string;
  ownerUsername: string;
  ownerFullName: string | null;
  ownerAvatarUrl: string | null;
  settings: Record<string, unknown>;
  status: Room['status'];
  isLocked: boolean;
  currentPlayerCount: number;
  minPlayers: number;
  maxPlayers: number;
  createdAt: Date;
  players?: { username: string; fullName: string | null }[];
};

export type RoomCoreRow = RoomSummaryRow & {
  game: Game;
  owner: Pick<
    User,
    | 'id'
    | 'username'
    | 'role'
    | 'fullName'
    | 'birthDateShamsi'
    | 'province'
    | 'city'
    | 'gender'
    | 'bio'
    | 'avatarUrl'
    | 'gem'
    | 'xp'
    | 'castleLevel'
    | 'xpMinerLevel'
    | 'gemMinerLevel'
    | 'lastGemCollectionAt'
    | 'lastXpCollectionAt'
    | 'lastChangelogVersion'
  >;
};

export type RoomPlayerRow = Pick<
  RoomPlayer,
  'id' | 'roomId' | 'userId' | 'isReady' | 'isConnected' | 'cancelRequested' | 'joinedAt' | 'seatIndex'
> &
  Pick<User, 'username' | 'fullName' | 'birthDateShamsi' | 'province' | 'city' | 'avatarUrl'>;

export type ActiveMatchRow = Pick<GameMatch, 'id' | 'roomId' | 'matchState'> & {
  gameSlug: string;
};

export type UserRoomMembershipRow = {
  roomId: string;
  roomStatus: Room['status'];
  gameSlug: string;
};

export type CurrentRoomMembershipRow = UserRoomMembershipRow & {
  gameId: string;
};

export class RoomsRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async findGameById(gameId: string): Promise<Game | undefined> {
    const [game] = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    return game;
  }

  async listRoomsByGameId(gameId: string): Promise<RoomSummaryRow[]> {
    return this.db
      .select({
        id: rooms.id,
        gameId: rooms.gameId,
        ownerUserId: rooms.ownerUserId,
        ownerUsername: users.username,
        ownerFullName: users.fullName,
        ownerAvatarUrl: users.avatarUrl,
        settings: rooms.settings,
        status: rooms.status,
        isLocked: rooms.isLocked,
        currentPlayerCount: sql<number>`count(${roomPlayers.id})::int`,
        minPlayers: games.minPlayers,
        maxPlayers: games.maxPlayers,
        createdAt: rooms.createdAt
      })
      .from(rooms)
      .innerJoin(games, eq(rooms.gameId, games.id))
      .innerJoin(users, eq(rooms.ownerUserId, users.id))
      .leftJoin(roomPlayers, eq(roomPlayers.roomId, rooms.id))
      .where(eq(rooms.gameId, gameId))
      .groupBy(rooms.id, games.id, users.id)
      .orderBy(asc(rooms.createdAt));
  }

  async listAllRooms(): Promise<RoomSummaryRow[]> {
    return this.db
      .select({
        id: rooms.id,
        gameId: rooms.gameId,
        ownerUserId: rooms.ownerUserId,
        ownerUsername: users.username,
        ownerFullName: users.fullName,
        ownerAvatarUrl: users.avatarUrl,
        settings: rooms.settings,
        status: rooms.status,
        isLocked: rooms.isLocked,
        currentPlayerCount: sql<number>`count(${roomPlayers.id})::int`,
        minPlayers: games.minPlayers,
        maxPlayers: games.maxPlayers,
        createdAt: rooms.createdAt
      })
      .from(rooms)
      .innerJoin(games, eq(rooms.gameId, games.id))
      .innerJoin(users, eq(rooms.ownerUserId, users.id))
      .leftJoin(roomPlayers, eq(roomPlayers.roomId, rooms.id))
      .groupBy(rooms.id, games.id, users.id)
      .orderBy(asc(rooms.createdAt));
  }

  async findAllPlayersByRoomIds(
    roomIds: string[]
  ): Promise<{ roomId: string; username: string; fullName: string | null }[]> {
    if (roomIds.length === 0) return [];

    return this.db
      .select({
        roomId: roomPlayers.roomId,
        username: users.username,
        fullName: users.fullName
      })
      .from(roomPlayers)
      .innerJoin(users, eq(roomPlayers.userId, users.id))
      .where(inArray(roomPlayers.roomId, roomIds));
  }

  async createRoomWithOwner(room: NewRoom, ownerPlayer: Omit<NewRoomPlayer, 'roomId'>): Promise<Room> {
    return this.db.transaction(async (tx) => {
      const [createdRoom] = await tx.insert(rooms).values(room).returning();

      if (!createdRoom) {
        throw new Error('Failed to create room');
      }

      await tx
        .insert(roomPlayers)
        .values({ ...ownerPlayer, roomId: createdRoom.id })
        .onConflictDoNothing({ target: [roomPlayers.roomId, roomPlayers.userId] });

      return createdRoom;
    });
  }

  async findRoomCoreById(roomId: string): Promise<RoomCoreRow | undefined> {
    const [row] = await this.db
      .select({
        id: rooms.id,
        gameId: rooms.gameId,
        ownerUserId: rooms.ownerUserId,
        ownerUsername: users.username,
        ownerFullName: users.fullName,
        ownerAvatarUrl: users.avatarUrl,
        settings: rooms.settings,
        status: rooms.status,
        isLocked: rooms.isLocked,
        currentPlayerCount: sql<number>`count(${roomPlayers.id})::int`,
        minPlayers: games.minPlayers,
        maxPlayers: games.maxPlayers,
        createdAt: rooms.createdAt,
        game: games,
        owner: {
          id: users.id,
          username: users.username,
          role: users.role,
          fullName: users.fullName,
          birthDateShamsi: users.birthDateShamsi,
          province: users.province,
          city: users.city,
          gender: users.gender,
          bio: users.bio,
          avatarUrl: users.avatarUrl,
          gem: users.gem,
          xp: users.xp,
          castleLevel: users.castleLevel,
          xpMinerLevel: users.xpMinerLevel,
          gemMinerLevel: users.gemMinerLevel,
          lastGemCollectionAt: users.lastGemCollectionAt,
          lastXpCollectionAt: users.lastXpCollectionAt,
          lastChangelogVersion: users.lastChangelogVersion
        }
      })
      .from(rooms)
      .innerJoin(games, eq(rooms.gameId, games.id))
      .innerJoin(users, eq(rooms.ownerUserId, users.id))
      .leftJoin(roomPlayers, eq(roomPlayers.roomId, rooms.id))
      .where(eq(rooms.id, roomId))
      .groupBy(rooms.id, games.id, users.id)
      .limit(1);

    return row;
  }

  async listPlayers(roomId: string): Promise<RoomPlayerRow[]> {
    return this.db
.select({
  id: roomPlayers.id,
  roomId: roomPlayers.roomId,
  userId: roomPlayers.userId,
  username: users.username,
  fullName: users.fullName,
  birthDateShamsi: users.birthDateShamsi,
  province: users.province,
  city: users.city,
  avatarUrl: users.avatarUrl,
  isReady: roomPlayers.isReady,
  isConnected: roomPlayers.isConnected,
  cancelRequested: roomPlayers.cancelRequested,
  joinedAt: roomPlayers.joinedAt,
  seatIndex: roomPlayers.seatIndex
})
      .from(roomPlayers)
      .innerJoin(users, eq(roomPlayers.userId, users.id))
      .where(eq(roomPlayers.roomId, roomId))
      .orderBy(asc(roomPlayers.joinedAt));
  }

  async findPlayer(roomId: string, userId: string): Promise<RoomPlayer | undefined> {
    const [player] = await this.db
      .select()
      .from(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)))
      .limit(1);

    return player;
  }

  async findUserRoomMembership(userId: string): Promise<UserRoomMembershipRow | undefined> {
    const [row] = await this.db
      .select({
        roomId: roomPlayers.roomId,
        roomStatus: rooms.status,
        gameSlug: games.slug
      })
      .from(roomPlayers)
      .innerJoin(rooms, eq(roomPlayers.roomId, rooms.id))
      .innerJoin(games, eq(rooms.gameId, games.id))
      .where(eq(roomPlayers.userId, userId))
      .limit(1);

    return row;
  }

  async findCurrentRoomMembership(userId: string): Promise<CurrentRoomMembershipRow | undefined> {
    const [row] = await this.db
      .select({
        roomId: roomPlayers.roomId,
        roomStatus: rooms.status,
        gameSlug: games.slug,
        gameId: rooms.gameId
      })
      .from(roomPlayers)
      .innerJoin(rooms, eq(roomPlayers.roomId, rooms.id))
      .innerJoin(games, eq(rooms.gameId, games.id))
      .where(eq(roomPlayers.userId, userId))
      .limit(1);

    return row;
  }

  async addPlayer(roomId: string, userId: string): Promise<void> {
    await this.db
      .insert(roomPlayers)
      .values({ roomId, userId, isConnected: true, cancelRequested: false })
      .onConflictDoUpdate({
        target: [roomPlayers.roomId, roomPlayers.userId],
        set: { isConnected: true }
      });
  }

  async setPlayerConnected(roomId: string, userId: string, isConnected: boolean): Promise<void> {
    await this.db
      .update(roomPlayers)
      .set({ isConnected })
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  async findActiveMatchByRoomId(roomId: string): Promise<ActiveMatchRow | undefined> {
    const [row] = await this.db
      .select({
        id: gameMatches.id,
        roomId: gameMatches.roomId,
        matchState: gameMatches.matchState,
        gameSlug: games.slug
      })
      .from(gameMatches)
      .innerJoin(games, eq(gameMatches.gameId, games.id))
      .where(and(eq(gameMatches.roomId, roomId), eq(gameMatches.status, 'active')))
      .limit(1);

    return row;
  }

  async setPlayerReady(roomId: string, userId: string, isReady: boolean): Promise<void> {
    await this.db
      .update(roomPlayers)
      .set({ isReady })
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  async setPlayerCancelRequested(roomId: string, userId: string, cancelRequested: boolean): Promise<void> {
    await this.db
      .update(roomPlayers)
      .set({ cancelRequested })
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  async resetPlayersReady(roomId: string): Promise<void> {
    await this.db
      .update(roomPlayers)
      .set({ isReady: false, cancelRequested: false })
      .where(eq(roomPlayers.roomId, roomId));
  }

  async removePlayer(roomId: string, userId: string): Promise<void> {
    await this.db.delete(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  async updateSettingsAndResetReady(roomId: string, settings: Record<string, unknown>): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.update(rooms).set({ settings, updatedAt: new Date() }).where(eq(rooms.id, roomId));
      await tx.update(roomPlayers).set({ isReady: false }).where(eq(roomPlayers.roomId, roomId));
    });
  }

  async updateOwner(roomId: string, ownerUserId: string): Promise<void> {
    await this.db.update(rooms).set({ ownerUserId, updatedAt: new Date() }).where(eq(rooms.id, roomId));
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.db.delete(rooms).where(eq(rooms.id, roomId));
  }

  async markRoomFinished(roomId: string): Promise<void> {
    await this.db.update(rooms).set({ status: 'finished', updatedAt: new Date() }).where(eq(rooms.id, roomId));
  }
}
