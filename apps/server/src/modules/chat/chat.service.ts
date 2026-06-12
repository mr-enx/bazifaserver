import type { AuthUser, ChatMessage } from '@game-platform/shared';
import { ChatRepository, type ChatMessageRow } from './chat.repository.js';

const MAX_CHAT_MESSAGE_LENGTH = 1000;
const CHAT_HISTORY_LIMIT = 50;

export class ChatError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    username: row.username,
    name: row.fullName,
    avatarUrl: row.avatarUrl,
    message: row.message,
    createdAt: row.createdAt.toISOString()
  };
}

function sanitizeMessage(message: string): string {
  return message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export class ChatService {
  constructor(private readonly chatRepository = new ChatRepository()) {}

  async sendMessage(roomId: string, user: AuthUser, rawMessage: unknown): Promise<ChatMessage> {
    if (typeof rawMessage !== 'string') {
      throw new ChatError('Message must be a string', 400);
    }

    const message = sanitizeMessage(rawMessage);

    if (!message) {
      throw new ChatError('Message cannot be empty', 400);
    }

    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      throw new ChatError(`Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer`, 400);
    }

    const player = await this.chatRepository.findRoomPlayer(roomId, user.id);

    if (!player) {
      throw new ChatError('You must be a room member to chat', 403);
    }

    const row = await this.chatRepository.createMessage({ roomId, userId: user.id, message });
    return toChatMessage(row);
  }

  async getHistory(roomId: string, user: AuthUser): Promise<ChatMessage[]> {
    const player = await this.chatRepository.findRoomPlayer(roomId, user.id);

    if (!player) {
      throw new ChatError('You must be a room member to view chat history', 403);
    }

    const rows = await this.chatRepository.listRecentMessages(roomId, CHAT_HISTORY_LIMIT);
    return rows.map(toChatMessage);
  }
}
