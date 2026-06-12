export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
};

export type ChatSendPayload = {
  roomId: string;
  message: string;
};

export type ChatHistoryPayload = {
  roomId: string;
  messages: ChatMessage[];
};

export type ChatErrorPayload = {
  message: string;
};

export type DirectChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isSeen: boolean;
  createdAt: string;
};

export type DirectChatThread = {
  friend: {
    id: string;
    username: string;
    fullName?: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: string | null;
  };
  messages: DirectChatMessage[];
};

export type SendDirectMessageRequest = {
  message: string;
};
