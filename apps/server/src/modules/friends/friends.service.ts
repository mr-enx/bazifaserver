import type {
  AuthUser,
  CancelFriendRequestResponse,
  CreateFriendRequestResponse,
  CreateFriendRequestRequest,
  FriendListItem,
  FriendRequestItem,
  FriendUserSummary,
  NotificationItem,
  OutgoingFriendRequestItem,
  RespondToFriendRequestResponse
} from '@game-platform/shared';
import { SOCKET_EVENTS } from '@game-platform/shared';
import type { FriendRequest } from '../../db/schema.js';
import { emitToUser } from '../../realtime/socket.js';
import { normalizePhoneNumber } from '../auth/auth.utils.js';
import {
  FriendsRepository,
  type FriendListRow,
  type FriendUserRow,
  type NotificationRow,
  type OutgoingFriendRequestRow
} from './friends.repository.js';

export class FriendsError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

function toIsoString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function toUserSummary(user: FriendUserRow): FriendUserSummary {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName ?? null,
    avatarUrl: user.avatarUrl
  };
}


function toFriendRequestItem(request: FriendRequest): FriendRequestItem {
  return {
    id: request.id,
    senderId: request.senderId,
    receiverId: request.receiverId,
    status: request.status,
    createdAt: toIsoString(request.createdAt),
    updatedAt: toIsoString(request.updatedAt),
    respondedAt: request.respondedAt ? toIsoString(request.respondedAt) : null
  };
}

function toNotificationItem(notification: NotificationRow): NotificationItem {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    actorId: notification.actorId,
    friendRequestId: notification.friendRequestId,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: toIsoString(notification.createdAt),
    actor: toUserSummary(notification.actor),
    friendRequest: toFriendRequestItem(notification.friendRequest)
  };
}

function toOutgoingFriendRequestItem(row: OutgoingFriendRequestRow): OutgoingFriendRequestItem {
  return {
    request: toFriendRequestItem(row.request),
    receiver: toUserSummary(row.receiver)
  };
}

function toFriendListItem(friend: FriendListRow): FriendListItem {
return {
  id: friend.id,
  username: friend.username,
  fullName: friend.fullName ?? null,
  avatarUrl: friend.avatarUrl,
  createdAt: toIsoString(friend.createdAt),
    isOnline: friend.isOnline,
    lastSeenAt: friend.lastSeenAt ? toIsoString(friend.lastSeenAt) : null,
    unreadCount: friend.unreadCount,
    lastMessage: friend.lastMessage
      ? {
          id: friend.lastMessage.id,
          senderId: friend.lastMessage.senderId,
          receiverId: friend.lastMessage.receiverId,
          message: friend.lastMessage.message,
          isSeen: friend.lastMessage.isSeen,
          createdAt:
            friend.lastMessage.createdAt instanceof Date
              ? toIsoString(friend.lastMessage.createdAt)
              : new Date(friend.lastMessage.createdAt).toISOString()
        }
      : null
  };
}

export class FriendsService {
  constructor(private readonly friendsRepository = new FriendsRepository()) {}

  async createFriendRequest(sender: AuthUser, payload: CreateFriendRequestRequest): Promise<CreateFriendRequestResponse> {
    const receiver = await this.resolveReceiver(payload);
    const receiverId = receiver.id;

    if (sender.id === receiverId) {
      throw new FriendsError('You cannot send a friend request to yourself', 400);
    }

    const alreadyFriends = await this.friendsRepository.areFriends(sender.id, receiverId);
    if (alreadyFriends) {
      throw new FriendsError('You are already friends with this user', 409);
    }

    const existingPendingRequest = await this.friendsRepository.findPendingRequestBetweenUsers(sender.id, receiverId);
    if (existingPendingRequest) {
      if (existingPendingRequest.senderId === sender.id) {
        throw new FriendsError('A friend request is already pending for this user', 409);
      }

      throw new FriendsError('This user has already sent you a friend request', 409);
    }

    const result = await this.friendsRepository.createFriendRequestWithNotification({
      senderId: sender.id,
      receiverId,
      title: 'Friend request',
      message: `${sender.username} sent you a friend request.`
    });

    emitToUser(receiverId, SOCKET_EVENTS.socialNotificationsUpdated);
    emitToUser(sender.id, SOCKET_EVENTS.socialSentRequestsUpdated);

    return {
      request: toFriendRequestItem(result.request),
      notificationId: result.notificationId
    };
  }

  private async resolveReceiver(payload: CreateFriendRequestRequest): Promise<FriendUserRow> {
    if (payload.receiverId) {
      const receiver = await this.friendsRepository.findUserById(payload.receiverId);
      if (!receiver) {
        throw new FriendsError('User not found', 404);
      }

      return receiver;
    }

    if (!payload.phone) {
      throw new FriendsError('Receiver id or phone number is required', 400);
    }

    let normalizedPhone: string;

    try {
      normalizedPhone = normalizePhoneNumber(payload.phone);
    } catch (error) {
      throw new FriendsError(error instanceof Error ? error.message : 'Phone number is invalid', 400);
    }

    const receiver = await this.friendsRepository.findUserByPhone(normalizedPhone);
    if (!receiver) {
      throw new FriendsError('No user found with this phone number', 404);
    }

    return receiver;
  }

  async listNotifications(user: AuthUser): Promise<NotificationItem[]> {
    const notifications = await this.friendsRepository.listNotificationsForUser(user.id);
    return notifications.map(toNotificationItem);
  }

  async listOutgoingPendingRequests(user: AuthUser): Promise<OutgoingFriendRequestItem[]> {
    const requests = await this.friendsRepository.listOutgoingPendingRequests(user.id);
    return requests.map(toOutgoingFriendRequestItem);
  }

  async acceptFriendRequest(requestId: string, user: AuthUser): Promise<RespondToFriendRequestResponse> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new FriendsError('Friend request not found', 404);
    }

    if (request.receiverId !== user.id) {
      throw new FriendsError('You cannot accept this friend request', 403);
    }

    if (request.status !== 'pending') {
      throw new FriendsError('This friend request has already been handled', 409);
    }

    const result = await this.friendsRepository.acceptFriendRequest(requestId);

    emitToUser(user.id, SOCKET_EVENTS.socialNotificationsUpdated);
    emitToUser(user.id, SOCKET_EVENTS.socialFriendsUpdated);
    emitToUser(result.request.senderId, SOCKET_EVENTS.socialFriendsUpdated);
    emitToUser(result.request.senderId, SOCKET_EVENTS.socialSentRequestsUpdated);

    return {
      request: toFriendRequestItem(result.request),
      friendshipCreated: result.friendshipCreated
    };
  }

  async rejectFriendRequest(requestId: string, user: AuthUser): Promise<RespondToFriendRequestResponse> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new FriendsError('Friend request not found', 404);
    }

    if (request.receiverId !== user.id) {
      throw new FriendsError('You cannot reject this friend request', 403);
    }

    if (request.status !== 'pending') {
      throw new FriendsError('This friend request has already been handled', 409);
    }

    const updatedRequest = await this.friendsRepository.rejectFriendRequest(requestId);

    emitToUser(user.id, SOCKET_EVENTS.socialNotificationsUpdated);
    emitToUser(updatedRequest.senderId, SOCKET_EVENTS.socialSentRequestsUpdated);

    return {
      request: toFriendRequestItem(updatedRequest),
      friendshipCreated: false
    };
  }

  async cancelFriendRequest(requestId: string, user: AuthUser): Promise<CancelFriendRequestResponse> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new FriendsError('Friend request not found', 404);
    }

    if (request.senderId !== user.id) {
      throw new FriendsError('You cannot cancel this friend request', 403);
    }

    if (request.status !== 'pending') {
      throw new FriendsError('This friend request has already been handled', 409);
    }

    const deletedRequest = await this.friendsRepository.deletePendingRequestAsSender(requestId, user.id);
    if (!deletedRequest) {
      throw new FriendsError('Friend request not found', 404);
    }

    emitToUser(user.id, SOCKET_EVENTS.socialSentRequestsUpdated);
    emitToUser(deletedRequest.receiverId, SOCKET_EVENTS.socialNotificationsUpdated);

    return { deleted: true, requestId };
  }

  async listFriends(user: AuthUser): Promise<FriendListItem[]> {
    const friends = await this.friendsRepository.listFriends(user.id);
    return friends.map(toFriendListItem);
  }
}
