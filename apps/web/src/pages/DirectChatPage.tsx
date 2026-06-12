import { ChangeEvent, Fragment, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DirectChatThread, FriendListItem } from '@game-platform/shared';
import { Link, useParams } from 'react-router-dom';
import { fetchDirectChatThread, sendDirectMessage } from '../lib/api';
import { isIosPwa } from '../lib/isIosPwa';
import { useAuthStore } from '../stores/authStore';
import { ProfileBottomSheet } from '../components/profile/ProfileBottomSheet';
import { MessageBubble } from '../components/chat/MessageBubble';

import ButtonBack from '../assets/button-back.png';
import ButtonSend from '../assets/icon-send-lobby.png';
import BackgroundNav from '../assets/background-navigation.png';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getLocalDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getStartOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatChatDateSeparator(value: string): string {
  const messageDate = new Date(value);
  const today = getStartOfLocalDay(new Date());
  const messageDay = getStartOfLocalDay(messageDate);

  const diffInMs = today.getTime() - messageDay.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'امروز';
  if (diffInDays === 1) return 'دیروز';

  return messageDate.toLocaleDateString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

export function DirectChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [hasIosPwaPadding, setHasIosPwaPadding] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  const threadQueryKey = useMemo(() => ['direct-chat', friendId], [friendId]);

  const threadQuery = useQuery({
    queryKey: threadQueryKey,
    queryFn: () => fetchDirectChatThread(token!, friendId!),
    enabled: Boolean(token && friendId),
    refetchInterval: 30_000
  });

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
  };

  const updateIsNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    isNearBottomRef.current = distanceFromBottom < 80;
  };

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendDirectMessage(token!, friendId!, text),
    onSuccess: (sentMessage) => {
      setMessage('');

      if (textareaRef.current) {
        textareaRef.current.style.height = '52px';
        textareaRef.current.style.overflowY = 'hidden';
      }

      queryClient.setQueryData<DirectChatThread>(threadQueryKey, (currentThread) => {
        if (!currentThread) return currentThread;

        // جلوگیری از تکراری شدن پیام: ممکن است رویداد سوکت زودتر از پاسخ میوتیشن برسد
        if (currentThread.messages.some((existing) => existing.id === sentMessage.id)) {
          return currentThread;
        }

        return {
          ...currentThread,
          messages: [...currentThread.messages, sentMessage]
        };
      });

      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });

      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    }
  });

  useEffect(() => {
    setHasIosPwaPadding(isIosPwa());
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateIsNearBottom();

    container.addEventListener('scroll', handleScroll);
    updateIsNearBottom();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [threadQuery.data]);

  useEffect(() => {
    const messageCount = threadQuery.data?.messages.length ?? 0;
    const prevCount = prevMessageCountRef.current;

    if (!threadQuery.data) return;

    if (!didInitialScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        didInitialScrollRef.current = true;
      });
    } else if (messageCount > prevCount && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    }

    prevMessageCountRef.current = messageCount;
  }, [threadQuery.data]);

  useEffect(() => {
    if (!threadQuery.data || !friendId) return;

    queryClient.setQueryData<FriendListItem[]>(['friends'], (friends) => {
      if (!friends) return friends;

      const lastMessage = threadQuery.data.messages[threadQuery.data.messages.length - 1] ?? null;

      return friends.map((friend) =>
        friend.id === friendId
          ? {
              ...friend,
              unreadCount: 0,
              lastMessage: lastMessage
                ? {
                    id: lastMessage.id,
                    senderId: lastMessage.senderId,
                    receiverId: lastMessage.receiverId,
                    message: lastMessage.message,
                    isSeen: lastMessage.isSeen,
                    createdAt: lastMessage.createdAt
                  }
                : friend.lastMessage
            }
          : friend
      );
    });
  }, [friendId, queryClient, threadQuery.data]);

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);

    const textarea = event.target;
    const maxHeight = 108;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMutation.isPending) return;

    sendMutation.mutate(trimmedMessage);
  }

  if (threadQuery.isLoading) {
    return (
      <section className="grid h-full min-h-0 w-full place-items-center overflow-hidden bg-white p-8 font-black text-ink">
        در حال بارگذاری گفتگو...
      </section>
    );
  }

  if (threadQuery.isError) {
    return (
      <section className="grid h-full min-h-0 w-full place-items-start overflow-hidden bg-white p-5">
        <div className="w-full rounded-[2rem] border border-ember/20 bg-ember/10 p-5 text-ember">
          <p className="font-black">بارگذاری گفتگو ناموفق بود.</p>
          <p className="mt-2 font-bold">
            {threadQuery.error instanceof Error
              ? threadQuery.error.message
              : 'لطفا دوباره تلاش کن.'}
          </p>
          <button
            type="button"
            onClick={() => void threadQuery.refetch()}
            className="mt-4 rounded-full bg-ember px-5 py-3 font-black text-white"
          >
            تلاش دوباره
          </button>
        </div>
      </section>
    );
  }

  if (!threadQuery.data) {
    return null;
  }

  return (
<section
  className="grid h-full min-h-0 w-full overflow-hidden"
  style={{
    gridTemplateRows: 'auto minmax(0,1fr) auto',
    paddingTop: 0,
    paddingBottom: 0,
    backgroundImage: 'linear-gradient(to top, rgba(0, 102, 255, 0.3) 0%, rgba(29, 202, 255, 0.2) 50%, rgba(0, 162, 255, 0.3) 100%)'
  }}
>
      <header className="z-20 flex items-center justify-between gap-4 px-5 py-4" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 1rem)`, backgroundImage: `url(${BackgroundNav})`, backgroundSize: '100% 100%', backgroundPosition: 'center', boxShadow: '0 6px 12px rgba(0, 0, 0, 0.25)' }}>
        <Link to="/chat" className="shrink-0">
          <img src={ButtonBack} alt="بازگشت" className="h-11 w-11 object-contain" />
        </Link>

        <div className="flex items-center gap-3 text-right">
          <div>
            <h1 className="font-display text-2xl font-black text-white">
              {getDisplayName(threadQuery.data.friend)}
            </h1>

            <p
              className={
                threadQuery.data.friend.isOnline
                  ? 'text-sm font-black text-cyan-400'
                  : 'text-sm font-bold text-[#aaaaaa]'
              }
            >
              {threadQuery.data.friend.isOnline ? 'آنلاین' : 'آفلاین'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileSheetOpen(true)}
            className="shrink-0"
            aria-label="نمایش پروفایل"
          >
            <AvatarWithFrame
              avatarUrl={threadQuery.data.friend.avatarUrl}
              alt={getDisplayName(threadQuery.data.friend)}
              size="md"
              fallback={
                <span className="font-display text-lg font-black text-white">
                  {initials(threadQuery.data.friend.username)}
                </span>
              }
            />
          </button>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className="min-h-0 overflow-y-auto px-5 py-3"
      >
        <div className="flex min-h-full flex-col justify-end space-y-1">
          {threadQuery.data.messages.length === 0 ? (
            <div className="rounded-[2rem] border bg-white/70 p-8 text-center font-black text-ink/60">
              اولین پیام را برای شروع گفتگو بفرست.
            </div>
          ) : null}

          {threadQuery.data.messages.map((chatMessage, index) => {
            const isMine = chatMessage.senderId === currentUser?.id;
            const previousMessage = threadQuery.data.messages[index - 1];
            const nextMessage = threadQuery.data.messages[index + 1];

            const shouldShowDateSeparator =
              !previousMessage ||
              getLocalDateKey(previousMessage.createdAt) !== getLocalDateKey(chatMessage.createdAt);

            const isFirstInGroup =
              !previousMessage ||
              previousMessage.senderId !== chatMessage.senderId ||
              getLocalDateKey(previousMessage.createdAt) !== getLocalDateKey(chatMessage.createdAt);

            const isLastInGroup =
              !nextMessage ||
              nextMessage.senderId !== chatMessage.senderId ||
              getLocalDateKey(nextMessage.createdAt) !== getLocalDateKey(chatMessage.createdAt);

            const isSameSenderAsPrevious =
              previousMessage &&
              previousMessage.senderId === chatMessage.senderId &&
              getLocalDateKey(previousMessage.createdAt) === getLocalDateKey(chatMessage.createdAt);

            return (
              <Fragment key={chatMessage.id}>
                {shouldShowDateSeparator ? (
                  <div className="sticky top-3 z-[1] flex justify-center py-2">
                    <span className="rounded-full bg-ink/20 px-4 py-1.5 text-xs font-black text-white ">
                      {formatChatDateSeparator(chatMessage.createdAt)}
                    </span>
                  </div>
                ) : null}

                <div className={isSameSenderAsPrevious ? 'mt-0' : ''}>
                  <MessageBubble
                    isMine={isMine}
                    message={chatMessage.message}
                    createdAt={chatMessage.createdAt}
                    isSeen={chatMessage.isSeen}
                    showTail={isLastInGroup}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="z-20" style={{ backgroundImage: `url(${BackgroundNav})`, backgroundSize: '100% 100%', backgroundPosition: 'center', boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.45)' }}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-row-reverse items-end gap-3 p-4"
        >
          <button
            type="submit"
            disabled={sendMutation.isPending || !message.trim()}
            className="shrink-0 transition disabled:cursor-not-allowed disabled:opacity-35"
          >
            <img src={ButtonSend} alt="ارسال" className="h-12 w-12 object-contain" />
          </button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            maxLength={1000}
            rows={1}
            placeholder="پیامت را بنویس..."
            className="min-h-[52px] max-h-[108px] min-w-0 flex-1 resize-none overflow-hidden rounded-2xl  bg-canvas px-5 py-3 text-right font-bold leading-7 outline-none transition focus:border-moss focus:bg-white"
          />
        </form>

        {sendMutation.isError ? (
          <p className="bg-ember/10 px-5 py-3 text-center text-sm font-black text-ember">
            {sendMutation.error instanceof Error
              ? sendMutation.error.message
              : 'ارسال پیام ناموفق بود.'}
          </p>
        ) : null}
      </div>

      <ProfileBottomSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        userId={threadQuery.data.friend.id}
      />
    </section>
  );
}
