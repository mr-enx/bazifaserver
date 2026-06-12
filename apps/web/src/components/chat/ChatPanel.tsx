import { FormEvent, MouseEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import {
  SOCKET_EVENTS,
  type ChatErrorPayload,
  type ChatHistoryPayload,
  type ChatMessage
} from '@game-platform/shared';
import { getLobbySocket } from '../../lib/socket';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';
import IconSendLobby from '../../assets/icon-send-lobby.png';

type ChatPanelProps = {
  roomId: string;
  token: string;
  currentUserId?: string;
  title?: string;
  onMicPointerDown?: () => void;
  onMicPointerUp?: () => void;
  onMicPointerLeave?: () => void;
  isMicActive?: boolean;
  readyLabel?: string;
  isReady?: boolean;
  onReadyToggle?: () => void;
  isReadyDisabled?: boolean;
  bottomOffsetClassName?: string;
  onNewMessage?: (message: ChatMessage) => void;
  variant?: 'modal' | 'inline';
};

function getDisplayName(user: { name?: string | null; username: string }): string {
  return user.name?.trim() || user.username;
}

function initials(value: string): string {
  return value.slice(0, 2).toUpperCase();
}

function mergeMessages(currentMessages: ChatMessage[], nextMessages: ChatMessage[]): ChatMessage[] {
  const messagesById = new Map<string, ChatMessage>();

  for (const message of currentMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of nextMessages) {
    messagesById.set(message.id, message);
  }

  return [...messagesById.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function ChatPanel({
  roomId,
  token,
  currentUserId,
  title = 'Chat',
  onMicPointerDown,
  onMicPointerUp,
  onMicPointerLeave,
  isMicActive = false,
  readyLabel,
  isReady = false,
  onReadyToggle,
  isReadyDisabled = false,
  bottomOffsetClassName = 'bottom-0',
  onNewMessage,
  variant = 'modal'
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openedInputRef = useRef<HTMLInputElement | null>(null);
  const chatModalRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = getLobbySocket(token);

    const handleHistory = (payload: ChatHistoryPayload) => {
      if (payload.roomId !== roomId) return;
      setMessages((currentMessages) => mergeMessages(currentMessages, payload.messages));
      setError(null);
    };

    const handleNewMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;
      setMessages((currentMessages) => mergeMessages(currentMessages, [message]));
      setError(null);
      onNewMessage?.(message);
    };

    const handleError = (payload: ChatErrorPayload) => setError(payload.message);

    socket.on(SOCKET_EVENTS.chatHistory, handleHistory);
    socket.on(SOCKET_EVENTS.chatNewMessage, handleNewMessage);
    socket.on(SOCKET_EVENTS.chatError, handleError);
    socket.emit(SOCKET_EVENTS.chatHistoryRequest, { roomId });

    return () => {
      socket.off(SOCKET_EVENTS.chatHistory, handleHistory);
      socket.off(SOCKET_EVENTS.chatNewMessage, handleNewMessage);
      socket.off(SOCKET_EVENTS.chatError, handleError);
    };
  }, [roomId, token, onNewMessage]);

  useEffect(() => {
    if (!isChatOpen && variant !== 'inline') return;

    const focusTimeout = setTimeout(() => {
      openedInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(focusTimeout);
  }, [isChatOpen, variant]);

  useEffect(() => {
    if (!isChatOpen || variant === 'inline') return;

    const visualViewport = window.visualViewport;
    if (!visualViewport || !chatModalRef.current) return;

    const updateLayout = () => {
      const modal = chatModalRef.current;
      if (!modal) return;
      modal.style.height = `${visualViewport.height}px`;
      modal.style.transform = `translateY(${visualViewport.offsetTop}px)`;
    };

    updateLayout();
    visualViewport.addEventListener('resize', updateLayout);
    visualViewport.addEventListener('scroll', updateLayout);

    return () => {
      visualViewport.removeEventListener('resize', updateLayout);
      visualViewport.removeEventListener('scroll', updateLayout);
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen && variant !== 'inline') return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    scrollToBottom();
    const frame = requestAnimationFrame(scrollToBottom);
    const timeout = setTimeout(scrollToBottom, 150);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [isChatOpen, messages, variant]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();
    if (!message) return;

    const socket = getLobbySocket(token);
    socket.emit(SOCKET_EVENTS.chatSend, { roomId, message });

    setDraft('');
    if (variant !== 'inline') {
      setIsChatOpen(false);
    }
  }

  function openChat() {
    setIsChatOpen(true);
  }

  function closeChat() {
    setIsChatOpen(false);
  }

  function stopClose(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function handleMicPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onMicPointerDown?.();
  }

  function handleMicPointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onMicPointerUp?.();
  }

  function handleMicPointerCancel(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onMicPointerLeave?.();
  }

  const chatInput = (
    <form onSubmit={handleSubmit} className="flex items-center gap-2" onClick={stopClose}>
      <input
        ref={isChatOpen ? openedInputRef : undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={openChat}
        onClick={stopClose}
        maxLength={1000}
        placeholder="یه چیزی بنویس..."
        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/95 px-4 py-3 font-bold text-ink outline-none ring-moss/30 transition focus:ring-4"
      />

      <button
        type="button"
        onPointerDown={handleMicPointerDown}
        onPointerUp={handleMicPointerUp}
        onPointerCancel={handleMicPointerCancel}
        onLostPointerCapture={onMicPointerLeave}
        className={`inline-flex h-12 w-12 touch-none select-none items-center justify-center rounded-2xl font-black text-white shadow-xl transition ${
          isMicActive ? 'scale-[0.99] bg-moss shadow-moss/30' : 'bg-ink shadow-ink/20'
        }`}
        aria-label="Hold to talk"
        title={isMicActive ? 'Talking...' : 'Hold to talk'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-xl">
          <path
            d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4z"
            fill="currentColor"
          />
          <path
            d="M11 19.931V22h2v-2.069c3.939-.495 7-3.858 7-7.931h-2c0 3.309-2.691 6-6 6s-6-2.691-6-6H4c0 4.072 3.061 7.436 7 7.931z"
            fill="currentColor"
          />
        </svg>
      </button>

      <button
        type="submit"
        disabled={!draft.trim()}
        className="shrink-0 transition disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="ارسال"
      >
        <img src={IconSendLobby} alt="ارسال" className="h-12 w-12 object-contain" />
      </button>
    </form>
  );

  const messageListContent = (
    <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 overscroll-contain">
      {messages.length === 0 ? (
        <div className="grid h-full min-h-[260px] place-items-center text-center font-bold text-white/70">
          هیچ پیامی ارسال نشده
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const isMine = message.userId === currentUserId;
            const displayName = getDisplayName(message);

            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isMine ? 'flex-row-reverse text-right' : ''}`}
              >
                <AvatarWithFrame
                  avatarUrl={message.avatarUrl}
                  alt={displayName}
                  size="md"
                  fallback={
                    <span className="text-sm font-black text-white">
                      {initials(displayName)}
                    </span>
                  }
                  className="shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/20"
                />

                <div
                  className={`max-w-[82%] rounded-3xl px-4 py-3 backdrop-blur-md ${
                    isMine
                      ? 'bg-white/20 text-white ring-1 ring-white/15'
                      : 'bg-black/25 text-white ring-1 ring-white/10'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm font-bold leading-6">
                    {message.message}
                  </p>
                  <div className={`mt-1 flex ${isMine ? 'justify-end' : ''}`}>
                    <span className="text-[10px] font-bold text-white/55">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="flex h-full w-full flex-col">
        {messageListContent}
        <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <div className="mx-auto w-full max-w-6xl">
            {onReadyToggle ? (
              <button
                type="button"
                onClick={onReadyToggle}
                disabled={isReadyDisabled}
                className={`mb-2 mx-auto block w-fit rounded-2xl px-6 py-3 text-sm font-black text-white shadow-xl transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isReady ? 'bg-moss' : 'bg-ink shadow-ink/20'
                }`}
              >
                {readyLabel ?? title}
              </button>
            ) : null}
            {error ? (
              <p className="mb-3 rounded-2xl bg-ember/10 px-4 py-3 font-bold text-ember">{error}</p>
            ) : null}
            {chatInput}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isChatOpen ? (
        <div
          ref={chatModalRef}
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-lg"
          onClick={closeChat}
        >
          <div className="flex h-full w-full flex-col">
            {error ? (
              <p
                className="mx-4 mt-4 shrink-0 rounded-2xl bg-ember/90 px-4 py-3 font-bold text-white"
                onClick={stopClose}
              >
                {error}
              </p>
            ) : null}

            {messageListContent}

            <div
              className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3"
              onClick={stopClose}
            >
              {chatInput}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`fixed left-0 right-0 z-40 border-t border-ink/10 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] ${bottomOffsetClassName}`}
      >
        <div className="mx-auto w-full max-w-6xl">
          {onReadyToggle ? (
            <button
              type="button"
              onClick={onReadyToggle}
              disabled={isReadyDisabled}
              className={`mb-2 mx-auto w-fit rounded-2xl px-6 py-3 text-sm font-black text-white shadow-xl transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isReady ? 'bg-moss' : 'bg-ink shadow-ink/20'
              }`}
            >
              {readyLabel ?? title}
            </button>
          ) : null}

          {!isChatOpen && error ? (
            <p className="mb-3 rounded-2xl bg-ember/10 px-4 py-3 font-bold text-ember">{error}</p>
          ) : null}

          {chatInput}
        </div>
      </div>
    </>
  );
}
