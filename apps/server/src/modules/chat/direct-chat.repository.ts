import { and, desc, eq, or, sql } from 'drizzle-orm';
import { Repository } from '../../db/repository.js';
import {
  directMessages,
  friendships,
  userSessions,
  users,
  type DirectMessage,
  type NewDirectMessage,
  type User
} from '../../db/schema.js';

export type DirectChatFriendRow = Pick<User, 'id' | 'username' | 'avatarUrl' | 'fullName'> & {
  isOnline: boolean;
  lastSeenAt: Date | null;
};


export class DirectChatRepository extends Repository {
  constructor() {
    super();
  }

  async findFriend(userId: string, friendId: string): Promise<DirectChatFriendRow | undefined> {
    const [friend] = await this.db
.select({
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl,
  isOnline: sql<boolean>`exists (select 1 from ${userSessions} where ${userSessions.userId} = ${users.id} and ${userSessions.isRevoked} = false and ${userSessions.expiresAt} > now() and ${userSessions.lastSeenAt} > now() - interval '10 seconds')`,
  lastSeenAt: sql<Date | null>`(select max(${userSessions.lastSeenAt}) from ${userSessions} where ${userSessions.userId} = ${users.id} and ${userSessions.isRevoked} = false and ${userSessions.expiresAt} > now())`
})

      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)))
      .limit(1);

    return friend;
  }

  async listMessages(userId: string, friendId: string, limit = 50): Promise<DirectMessage[]> {
    const rows = await this.db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
          and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(limit);

    return rows.reverse();
  }

  async createMessage(message: NewDirectMessage): Promise<DirectMessage> {
    const [createdMessage] = await this.db.insert(directMessages).values(message).returning();
    if (!createdMessage) {
      throw new Error('Failed to create direct message');
    }

    return createdMessage;
  }

  async markMessagesAsSeen(userId: string, friendId: string): Promise<void> {
    await this.db
      .update(directMessages)
      .set({ isSeen: true })
      .where(
        and(
          eq(directMessages.senderId, friendId),
          eq(directMessages.receiverId, userId),
          eq(directMessages.isSeen, false)
        )
      );
  }
}
