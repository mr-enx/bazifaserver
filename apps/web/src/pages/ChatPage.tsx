import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FriendListItem } from '@game-platform/shared';

import {
  acceptFriendRequest,
  cancelFriendRequest,
  fetchFriends,
  fetchNotifications,
  fetchSentFriendRequests,
  rejectFriendRequest,
  sendFriendRequest
} from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Dialog } from '../components/ui/Dialog';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { FriendsListSection } from '../components/chat/FriendsListSection';
import { FriendRequestsSection } from '../components/chat/FriendRequestsSection';
import { ChatSectionTabs } from '../components/chat/ChatSectionTabs';
import backgroundListUser from '../assets/backgrond-list-user.png';
import menuClickSound from '../assets/sounds/menu_click_06.ogg';

type ChatTab = 'friends' | 'requests';

function sortFriends(friends: FriendListItem[]): FriendListItem[] {
  return [...friends].sort((first, second) => {
    if (second.unreadCount !== first.unreadCount) {
      return second.unreadCount - first.unreadCount;
    }

    const secondLastMessageAt = second.lastMessage ? new Date(second.lastMessage.createdAt).getTime() : 0;
    const firstLastMessageAt = first.lastMessage ? new Date(first.lastMessage.createdAt).getTime() : 0;

    if (secondLastMessageAt !== firstLastMessageAt) {
      return secondLastMessageAt - firstLastMessageAt;
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

export function ChatPage() {
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';

  const token = useAuthStore((state) => state.token);
  const { soundVolume } = useSettingsStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ChatTab>('friends');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const playClickSound = () => {
    const audio = new Audio(menuClickSound);
    audio.volume = soundVolume / 100;
    audio.play().catch(console.error);
  };

  const friendsQuery = useQuery({
    queryKey: ['friends'],
    queryFn: () => fetchFriends(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000
  });

  const sentRequestsQuery = useQuery({
    queryKey: ['sentFriendRequests'],
    queryFn: () => fetchSentFriendRequests(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] });
    }
  });

  const sendByPhoneMutation = useMutation({
    mutationFn: (phone: string) => sendFriendRequest(token!, { phone }),
    onSuccess: () => {
      setInviteFeedback('درخواست دوستی با موفقیت ارسال شد.');
      setInvitePhone('');
      setIsInviteDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] });
    },
    onError: (error) => {
      setInviteFeedback(
        error instanceof Error ? error.message : 'ارسال درخواست دوستی ناموفق بود.'
      );
    }
  });

  const pendingNotifications = useMemo(() => {
    return (notificationsQuery.data ?? []).filter(
      (notification) => notification.friendRequest.status === 'pending'
    );
  }, [notificationsQuery.data]);

  const sortedFriends = useMemo(() => sortFriends(friendsQuery.data ?? []), [friendsQuery.data]);

  function isUpdatingRequest(requestId: string): boolean {
    return (
      (acceptMutation.isPending && acceptMutation.variables === requestId) ||
      (rejectMutation.isPending && rejectMutation.variables === requestId) ||
      (cancelMutation.isPending && cancelMutation.variables === requestId)
    );
  }

  function openInviteDialog() {
    setInvitePhone('');
    setInviteFeedback(null);
    setIsInviteDialogOpen(true);
  }

  return (
    <>
      <section className="relative h-full min-h-0">
        <div className="h-full overflow-y-auto px-4 pb-32 pt-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <ChatSectionTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              requestsCount={pendingNotifications.length}
            />

            {activeTab === 'friends' ? (
              <FriendsListSection
                friends={sortedFriends}
                backgroundListUser={backgroundListUser}
                isLoading={friendsQuery.isLoading}
                isError={friendsQuery.isError}
                errorMessage={
                  friendsQuery.error instanceof Error
                    ? friendsQuery.error.message
                    : 'لطفا دوباره تلاش کن.'
                }
                onRetry={() => void friendsQuery.refetch()}
              />
            ) : (
<FriendRequestsSection
  incomingNotifications={pendingNotifications}
  outgoingRequests={(sentRequestsQuery.data ?? []).filter((item) => item.request.status === 'pending')}
  backgroundListUser={backgroundListUser}
  onAccept={(requestId) => acceptMutation.mutate(requestId)}
  onReject={(requestId) => rejectMutation.mutate(requestId)}
  onCancel={(requestId) => cancelMutation.mutate(requestId)}
  isUpdatingRequest={isUpdatingRequest}
  isLoading={notificationsQuery.isLoading || sentRequestsQuery.isLoading}
  isError={notificationsQuery.isError || sentRequestsQuery.isError}
  errorMessage={
    notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : sentRequestsQuery.error instanceof Error
        ? sentRequestsQuery.error.message
        : 'لطفا دوباره تلاش کن.'
  }
  onRetry={() => {
    void notificationsQuery.refetch();
    void sentRequestsQuery.refetch();
  }}
/>

            )}
          </div>
        </div>

        {isChatRoute ? (
          <FloatingActionButton
            aria-label="ارسال درخواست دوستی"
            onClick={() => {
              playClickSound();
              openInviteDialog();
            }}
            disabled={!token}
            position="right"
            className="bottom-6"
          />
        ) : null}
      </section>

      <Dialog
        open={isInviteDialogOpen}
        onClose={() => {
          if (!sendByPhoneMutation.isPending) {
            setIsInviteDialogOpen(false);
          }
        }}
        avatarType={7}
        title='ارسال درخواست دوستی'
      >
        <div className="flex flex-col gap-6 text-ink">
          <h2 className="text-center font-display text-2xl font-black">ارسال درخواست دوستی</h2>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();

              if (!token) {
                setInviteFeedback('برای ارسال درخواست باید وارد حساب شوی.');
                return;
              }

              setInviteFeedback(null);
              sendByPhoneMutation.mutate(invitePhone.trim());
            }}
          >
            <label className="block text-right">
              <span className="text-sm font-black text-ink">شماره تماس</span>
              <input
                type="tel"
                dir="ltr"
                value={invitePhone}
                onChange={(event) => setInvitePhone(event.target.value)}
                placeholder="مثلا 09123456789"
                className="mt-2 w-full rounded-2xl bg-white px-4 py-3 font-bold text-ink outline-none ring-moss/30 transition focus:ring-4"
              />
            </label>

            {inviteFeedback ? (
              <p
                className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                  sendByPhoneMutation.isError
                    ? 'border border-ember/20 bg-ember/10 text-ember'
                    : 'border border-moss/15 bg-moss/10 text-moss'
                }`}
              >
                {inviteFeedback}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsInviteDialogOpen(false);
                  setInvitePhone('');
                  setInviteFeedback(null);
                }}
                className="rounded-2xl  px-4 py-3 font-black text-ink/70 transition hover:bg-white"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={
                  sendByPhoneMutation.isPending || invitePhone.trim().length === 0
                }
                className="rounded-2xl bg-moss px-5 py-3 font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
              >
                {sendByPhoneMutation.isPending
                  ? 'در حال ارسال...'
                  : 'ارسال درخواست'}
              </button>
            </div>
          </form>
        </div>
      </Dialog>
    </>
  );
}
