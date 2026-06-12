import { and, desc, eq } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import {
  roomMessages,
  roomPlayers,
  users,
  type NewRoomMessage,
  type RoomMessage,
  type RoomPlayer,
  type User
} from '../../db/schema.js';

export type ChatMessageRow = Pick<RoomMessage, 'id' | 'roomId' | 'userId' | 'message' | 'createdAt'> &
  Pick<User, 'username' | 'fullName' | 'avatarUrl'>;

export class ChatRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async findRoomPlayer(roomId: string, userId: string): Promise<RoomPlayer | undefined> {
    const [player] = await this.db
      .select()
      .from(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)))
      .limit(1);

    return player;
  }

  async createMessage(message: NewRoomMessage): Promise<ChatMessageRow> {
    const [createdMessage] = await this.db.insert(roomMessages).values(message).returning();

    if (!createdMessage) {
      throw new Error('Failed to create chat message');
    }

    const [row] = await this.db
      .select({
        id: roomMessages.id,
        roomId: roomMessages.roomId,
        userId: roomMessages.userId,
        username: users.username,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        message: roomMessages.message,
        createdAt: roomMessages.createdAt
      })
      .from(roomMessages)
      .innerJoin(users, eq(roomMessages.userId, users.id))
      .where(eq(roomMessages.id, createdMessage.id))
      .limit(1);

    if (!row) {
      throw new Error('Failed to load chat message');
    }

    return row;
  }

  async listRecentMessages(roomId: string, limit = 50): Promise<ChatMessageRow[]> {
    const rows = await this.db
      .select({
        id: roomMessages.id,
        roomId: roomMessages.roomId,
        userId: roomMessages.userId,
        username: users.username,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        message: roomMessages.message,
        createdAt: roomMessages.createdAt
      })
      .from(roomMessages)
      .innerJoin(users, eq(roomMessages.userId, users.id))
      .where(eq(roomMessages.roomId, roomId))
      .orderBy(desc(roomMessages.createdAt))
      .limit(limit);

    return rows.reverse();
  }
}
