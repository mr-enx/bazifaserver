import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { Repository } from '../../db/repository.js';
import {
  friendRequests,
  friendships,
  notifications,
  userSessions,
  users,
  type DirectMessage,
  type FriendRequest,
  type Notification,
  type User
} from '../../db/schema.js';

export type FriendUserRow = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl'>;

export type NotificationRow = Pick<
  Notification,
  'id' | 'userId' | 'type' | 'actorId' | 'friendRequestId' | 'title' | 'message' | 'isRead' | 'createdAt'
> & {
  actor: FriendUserRow;
  friendRequest: FriendRequest;
};

export type DirectChatPreviewRow = Pick<
  DirectMessage,
  'id' | 'senderId' | 'receiverId' | 'message' | 'isSeen' | 'createdAt'
>;

export type FriendListRow = FriendUserRow & {
  createdAt: Date;
  isOnline: boolean;
  lastSeenAt: Date | null;
  unreadCount: number;
  lastMessage: DirectChatPreviewRow | null;
};

export type OutgoingFriendRequestRow = {
  request: FriendRequest;
  receiver: FriendUserRow;
};

export class FriendsRepository extends Repository {
  constructor() {
    super();
  }

  async listFriendIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId));

    return rows.map((row) => row.friendId);
  }

  async findUserById(userId: string): Promise<FriendUserRow | undefined> {
    const [user] = await this.db
.select({
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl
})

      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  async findUserByPhone(phone: string): Promise<FriendUserRow | undefined> {
    const [user] = await this.db
.select({
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl
})

      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    return user;
  }

  async areFriends(firstUserId: string, secondUserId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, firstUserId), eq(friendships.friendId, secondUserId)),
          and(eq(friendships.userId, secondUserId), eq(friendships.friendId, firstUserId))
        )
      )
      .limit(1);

    return Boolean(row);
  }

  async findPendingRequestBetweenUsers(firstUserId: string, secondUserId: string): Promise<FriendRequest | undefined> {
    const [request] = await this.db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, 'pending'),
          or(
            and(eq(friendRequests.senderId, firstUserId), eq(friendRequests.receiverId, secondUserId)),
            and(eq(friendRequests.senderId, secondUserId), eq(friendRequests.receiverId, firstUserId))
          )
        )
      )
      .limit(1);

    return request;
  }

  async createFriendRequestWithNotification({
    senderId,
    receiverId,
    title,
    message
  }: {
    senderId: string;
    receiverId: string;
    title: string;
    message: string;
  }): Promise<{ request: FriendRequest; notificationId: string }> {
    return this.db.transaction(async (tx) => {
      const [createdRequest] = await tx
        .insert(friendRequests)
        .values({
          senderId,
          receiverId,
          status: 'pending'
        })
        .returning();

      if (!createdRequest) {
        throw new Error('Failed to create friend request');
      }

      const [createdNotification] = await tx
        .insert(notifications)
        .values({
          userId: receiverId,
          type: 'friend_request',
          actorId: senderId,
          friendRequestId: createdRequest.id,
          title,
          message
        })
        .returning({ id: notifications.id });

      if (!createdNotification) {
        throw new Error('Failed to create notification');
      }

      return {
        request: createdRequest,
        notificationId: createdNotification.id
      };
    });
  }

  async findFriendRequestById(requestId: string): Promise<FriendRequest | undefined> {
    const [request] = await this.db.select().from(friendRequests).where(eq(friendRequests.id, requestId)).limit(1);
    return request;
  }

  async acceptFriendRequest(requestId: string): Promise<{ request: FriendRequest; friendshipCreated: boolean }> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [updatedRequest] = await tx
        .update(friendRequests)
        .set({
          status: 'accepted',
          respondedAt: now,
          updatedAt: now
        })
        .where(eq(friendRequests.id, requestId))
        .returning();

      if (!updatedRequest) {
        throw new Error('Failed to accept friend request');
      }

      const insertedFriendships = await tx
        .insert(friendships)
        .values([
          {
            userId: updatedRequest.senderId,
            friendId: updatedRequest.receiverId,
            createdAt: now
          },
          {
            userId: updatedRequest.receiverId,
            friendId: updatedRequest.senderId,
            createdAt: now
          }
        ])
        .onConflictDoNothing({ target: [friendships.userId, friendships.friendId] })
        .returning({ id: friendships.id });

      await tx
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.friendRequestId, requestId));

      return {
        request: updatedRequest,
        friendshipCreated: insertedFriendships.length > 0
      };
    });
  }

  async rejectFriendRequest(requestId: string): Promise<FriendRequest> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [updatedRequest] = await tx
        .update(friendRequests)
        .set({
          status: 'rejected',
          respondedAt: now,
          updatedAt: now
        })
        .where(eq(friendRequests.id, requestId))
        .returning();

      if (!updatedRequest) {
        throw new Error('Failed to reject friend request');
      }

      await tx
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.friendRequestId, requestId));

      return updatedRequest;
    });
  }

  async listNotificationsForUser(userId: string): Promise<NotificationRow[]> {
    return this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        actorId: notifications.actorId,
        friendRequestId: notifications.friendRequestId,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
actor: {
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl
},

        friendRequest: friendRequests
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .innerJoin(friendRequests, eq(notifications.friendRequestId, friendRequests.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt), desc(friendRequests.createdAt));
  }

  async listOutgoingPendingRequests(senderId: string): Promise<OutgoingFriendRequestRow[]> {
    return this.db
      .select({
        request: friendRequests,
        receiver: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl
        }
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.receiverId, users.id))
      .where(and(eq(friendRequests.senderId, senderId), eq(friendRequests.status, 'pending')))
      .orderBy(desc(friendRequests.createdAt));
  }

  async deletePendingRequestAsSender(requestId: string, senderId: string): Promise<FriendRequest | undefined> {
    const [deletedRequest] = await this.db
      .delete(friendRequests)
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.status, 'pending')
        )
      )
      .returning();

    return deletedRequest;
  }

  async listFriends(userId: string): Promise<FriendListRow[]> {
    return this.db
.select({
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl,
  createdAt: friendships.createdAt,
        isOnline: sql<boolean>`exists (select 1 from ${userSessions} where ${userSessions.userId} = ${users.id} and ${userSessions.isRevoked} = false and ${userSessions.expiresAt} > now() and ${userSessions.lastSeenAt} > now() - interval '10 seconds')`,
        lastSeenAt: sql<Date | null>`(select max(${userSessions.lastSeenAt}) from ${userSessions} where ${userSessions.userId} = ${users.id} and ${userSessions.isRevoked} = false and ${userSessions.expiresAt} > now())`,
        unreadCount: sql<number>`(
          select count(*)::int
          from direct_messages dm
          where dm.sender_id = ${friendships.friendId}
            and dm.receiver_id = ${friendships.userId}
            and dm.is_seen = false
        )`,
        lastMessage: sql<DirectChatPreviewRow | null>`(
          select case when dm.id is null then null else json_build_object(
            'id', dm.id,
            'senderId', dm.sender_id,
            'receiverId', dm.receiver_id,
            'message', dm.message,
            'isSeen', dm.is_seen,
            'createdAt', dm.created_at
          ) end
          from direct_messages dm
          where (dm.sender_id = ${friendships.userId} and dm.receiver_id = ${friendships.friendId})
             or (dm.sender_id = ${friendships.friendId} and dm.receiver_id = ${friendships.userId})
          order by dm.created_at desc
          limit 1
        )`
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(eq(friendships.userId, userId))
      .orderBy(
        desc(sql<number>`(
          select count(*)::int
          from direct_messages dm
          where dm.sender_id = ${friendships.friendId}
            and dm.receiver_id = ${friendships.userId}
            and dm.is_seen = false
        )`),
        desc(sql<Date | null>`(
          select dm.created_at
          from direct_messages dm
          where (dm.sender_id = ${friendships.userId} and dm.receiver_id = ${friendships.friendId})
             or (dm.sender_id = ${friendships.friendId} and dm.receiver_id = ${friendships.userId})
          order by dm.created_at desc
          limit 1
        )`),
        desc(friendships.createdAt),
        asc(users.username)
      );
  }
}
