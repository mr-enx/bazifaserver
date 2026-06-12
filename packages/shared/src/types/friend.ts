export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type NotificationType = 'friend_request';

export type FriendUserSummary = {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl: string | null;
};

export type FriendRequestItem = {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  friendRequestId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: FriendUserSummary;
  friendRequest: FriendRequestItem;
};

export type OutgoingFriendRequestItem = {
  request: FriendRequestItem;
  receiver: FriendUserSummary;
};

export type FriendListItem = FriendUserSummary & {
  createdAt: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  unreadCount: number;
  lastMessage: DirectChatPreview | null;
};

export type DirectChatPreview = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isSeen: boolean;
  createdAt: string;
};

export type CreateFriendRequestRequest = {
  receiverId?: string;
  phone?: string;
};

export type CreateFriendRequestResponse = {
  request: FriendRequestItem;
  notificationId: string;
};

export type RespondToFriendRequestResponse = {
  request: FriendRequestItem;
  friendshipCreated: boolean;
};

export type CancelFriendRequestResponse = {
  deleted: boolean;
  requestId: string;
};
