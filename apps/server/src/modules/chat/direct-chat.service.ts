import type { AuthUser, DirectChatMessage, DirectChatThread } from '@game-platform/shared';
import { SOCKET_EVENTS } from '@game-platform/shared';
import type { DirectMessage } from '../../db/schema.js';
import { emitToUser } from '../../realtime/socket.js';
import { DirectChatRepository, type DirectChatFriendRow } from './direct-chat.repository.js';

const MAX_DIRECT_MESSAGE_LENGTH = 1000;
const DIRECT_CHAT_HISTORY_LIMIT = 50;

export class DirectChatError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

function sanitizeMessage(message: string): string {
  return message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function toDirectChatMessage(message: DirectMessage): DirectChatMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    message: message.message,
    isSeen: message.isSeen,
    createdAt: message.createdAt.toISOString()
  };
}

function toIsoString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function toThread(friend: DirectChatFriendRow, messages: DirectMessage[]): DirectChatThread {
  return {
friend: {
  id: friend.id,
  username: friend.username,
  fullName: friend.fullName ?? null,
  avatarUrl: friend.avatarUrl,
  isOnline: friend.isOnline,
  lastSeenAt: friend.lastSeenAt ? toIsoString(friend.lastSeenAt) : null
},

    messages: messages.map(toDirectChatMessage)
  };
}

export class DirectChatService {
  constructor(private readonly directChatRepository = new DirectChatRepository()) {}

  async getThread(user: AuthUser, friendId: string): Promise<DirectChatThread> {
    const friend = await this.directChatRepository.findFriend(user.id, friendId);
    if (!friend) {
      throw new DirectChatError('Friend not found', 404);
    }

    await this.directChatRepository.markMessagesAsSeen(user.id, friendId);
    emitToUser(friendId, SOCKET_EVENTS.directChatMessagesSeen, { friendId: user.id, seenAt: new Date().toISOString() });
    emitToUser(user.id, SOCKET_EVENTS.socialFriendsUpdated);
    emitToUser(friendId, SOCKET_EVENTS.socialFriendsUpdated);

    const messages = await this.directChatRepository.listMessages(user.id, friendId, DIRECT_CHAT_HISTORY_LIMIT);
    return toThread(friend, messages);
  }

  async sendMessage(user: AuthUser, friendId: string, rawMessage: unknown): Promise<DirectChatMessage> {
    const friend = await this.directChatRepository.findFriend(user.id, friendId);
    if (!friend) {
      throw new DirectChatError('Friend not found', 404);
    }

    if (typeof rawMessage !== 'string') {
      throw new DirectChatError('Message must be a string', 400);
    }

    const message = sanitizeMessage(rawMessage);
    if (!message) {
      throw new DirectChatError('Message cannot be empty', 400);
    }

    if (message.length > MAX_DIRECT_MESSAGE_LENGTH) {
      throw new DirectChatError(`Message must be ${MAX_DIRECT_MESSAGE_LENGTH} characters or fewer`, 400);
    }

    const createdMessage = await this.directChatRepository.createMessage({
      senderId: user.id,
      receiverId: friend.id,
      message
    });

    const response = toDirectChatMessage(createdMessage);
    emitToUser(friend.id, SOCKET_EVENTS.directChatNewMessage, response);
    emitToUser(user.id, SOCKET_EVENTS.directChatNewMessage, response);
    emitToUser(user.id, SOCKET_EVENTS.socialFriendsUpdated);
    emitToUser(friend.id, SOCKET_EVENTS.socialFriendsUpdated);

    return response;
  }
}
