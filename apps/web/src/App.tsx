import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { DirectChatThread, FriendListItem } from '@game-platform/shared';
import { SOCKET_EVENTS } from '@game-platform/shared';

import { useAuthStore } from './stores/authStore';
import { fetchCurrentRoomMembership } from './lib/api';
import { clearPendingRoomLeave, isPendingRoomLeave } from './lib/pendingRoomLeave';
import { getLobbySocket } from './lib/socket';

import { AppHeader } from './components/AppHeader';
import { AppNavigation } from './components/AppNavigation';
import { AppBackground } from './components/AppBackground';
import { AppTabbedPages } from './components/AppTabbedPages';
import { AppIdleGuard } from './components/AppIdleGuard';
import { RecentGameResultsDialog } from './components/game-results/RecentGameResultsDialog';
import { ProfileDialog } from './components/profile/ProfileDialog';
import { NotificationsDialog } from './components/notifications/NotificationsDialog';
import { LoginDialogSheet } from './components/auth/LoginDialogSheet';
import { ToastContainer } from './components/ui/ToastContainer';

export function App() {
  const { status, token, bootstrap, refreshCurrentUser, setAnonymous } =
    useAuthStore();
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const location = useLocation();
  const navigate = useNavigate();

  const [isOfflineDialogOpen, setIsOfflineDialogOpen] = useState(false);
  const [hasIosPwaPadding, setHasIosPwaPadding] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
  const [isRecentResultsDialogOpen, setIsRecentResultsDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isIdlePaused, setIsIdlePaused] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      void bootstrap();
    }
  }, [bootstrap, status]);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setHasIosPwaPadding(isIosDevice && isStandalone);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || isIdlePaused) {
      return;
    }

    const ping = async () => {
      try {
        await refreshCurrentUser();
        setIsOfflineDialogOpen(false);
      } catch {
        setIsOfflineDialogOpen(true);
      }
    };

    void ping();

    const intervalId = window.setInterval(() => {
      void ping();
    }, 45_000);

    return () => window.clearInterval(intervalId);
  }, [isIdlePaused, refreshCurrentUser, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !token || !userId || isIdlePaused) {
      return;
    }

    const socket = getLobbySocket(token);

    const handleFriendsUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    };

    const handleNotificationsUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleSentRequestsUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] });
    };

    const handlePresence = (payload: { userId: string; isOnline: boolean; lastSeenAt: string | null }) => {
      queryClient.setQueryData<FriendListItem[]>(['friends'], (currentFriends) => {
        if (!currentFriends) return currentFriends;

        let changed = false;
        const nextFriends = currentFriends.map((friend) => {
          if (friend.id !== payload.userId) {
            return friend;
          }

          const next = {
            ...friend,
            isOnline: payload.isOnline,
            lastSeenAt: payload.lastSeenAt
          };

          changed = true;
          return next;
        });

        return changed ? nextFriends : currentFriends;
      });
    };

    const handleDirectChatNewMessage = (message: {
      id: string;
      senderId: string;
      receiverId: string;
      message: string;
      isSeen: boolean;
      createdAt: string;
    }) => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;

      queryClient.setQueryData<DirectChatThread>(['direct-chat', otherUserId], (thread) => {
        if (!thread) return thread;

        const exists = thread.messages.some((existing) => existing.id === message.id);
        if (exists) return thread;

        return {
          ...thread,
          messages: [...thread.messages, message]
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    };

    const handleDirectChatSeen = (payload: { friendId: string; seenAt: string }) => {
      const seenAtMs = new Date(payload.seenAt).getTime();

      queryClient.setQueryData<DirectChatThread>(['direct-chat', payload.friendId], (thread) => {
        if (!thread) return thread;

        let changed = false;
        const nextMessages = thread.messages.map((message) => {
          if (
            message.senderId === userId &&
            message.receiverId === payload.friendId &&
            !message.isSeen &&
            new Date(message.createdAt).getTime() <= seenAtMs
          ) {
            changed = true;
            return { ...message, isSeen: true };
          }

          return message;
        });

        return changed ? { ...thread, messages: nextMessages } : thread;
      });

      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    };

    socket.on(SOCKET_EVENTS.socialFriendsUpdated, handleFriendsUpdated);
    socket.on(SOCKET_EVENTS.socialNotificationsUpdated, handleNotificationsUpdated);
    socket.on(SOCKET_EVENTS.socialSentRequestsUpdated, handleSentRequestsUpdated);
    socket.on(SOCKET_EVENTS.socialPresence, handlePresence);
    socket.on(SOCKET_EVENTS.directChatNewMessage, handleDirectChatNewMessage);
    socket.on(SOCKET_EVENTS.directChatMessagesSeen, handleDirectChatSeen);

    return () => {
      socket.off(SOCKET_EVENTS.socialFriendsUpdated, handleFriendsUpdated);
      socket.off(SOCKET_EVENTS.socialNotificationsUpdated, handleNotificationsUpdated);
      socket.off(SOCKET_EVENTS.socialSentRequestsUpdated, handleSentRequestsUpdated);
      socket.off(SOCKET_EVENTS.socialPresence, handlePresence);
      socket.off(SOCKET_EVENTS.directChatNewMessage, handleDirectChatNewMessage);
      socket.off(SOCKET_EVENTS.directChatMessagesSeen, handleDirectChatSeen);
    };
  }, [isIdlePaused, queryClient, status, token, userId]);

  useEffect(() => {
    if (status !== 'authenticated' || !token || isIdlePaused) {
      return;
    }

    let isMounted = true;

    async function syncCurrentMembershipRoute() {
      try {
        const membership = await fetchCurrentRoomMembership(token!);

        if (!isMounted || !membership) {
          if (!membership) {
            clearPendingRoomLeave();
          }
          return;
        }

        if (isPendingRoomLeave(membership.roomId)) {
          return;
        }

        const destination =
          membership.roomStatus === 'in_game'
            ? `/rooms/${membership.roomId}/game`
            : `/rooms/${membership.roomId}`;

        if (location.pathname !== destination) {
          navigate(destination, { replace: true });
        }
      } catch {
        // Route sync is best-effort; normal auth/offline handling covers failures.
      }
    }

    void syncCurrentMembershipRoute();

    return () => {
      isMounted = false;
    };
  }, [isIdlePaused, location.pathname, navigate, status, token]);

  useEffect(() => {
    if (status === 'anonymous') {
      setIsLoginDialogOpen(true);
      return;
    }

    if (status === 'authenticated') {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  function handleRetry() {
    setIsOfflineDialogOpen(false);

    void refreshCurrentUser().catch(() => {
      setIsOfflineDialogOpen(true);
    });
  }

  function handleLoginAgain() {
    setAnonymous();
    setIsOfflineDialogOpen(false);
    setIsLoginDialogOpen(true);
  }

  const isRoomLobbyPage =
    Boolean(matchPath('/rooms/:roomId', location.pathname)) ||
    Boolean(matchPath('/rooms/:roomId/lobby', location.pathname));

  const isRoomGamePage = Boolean(
    matchPath('/rooms/:roomId/game', location.pathname)
  );

  const isDirectChatPage = Boolean(
    matchPath('/chat/:friendId', location.pathname)
  );

  const isFullscreenPage =
    isRoomLobbyPage || isRoomGamePage || isDirectChatPage;

  const isGamesHomePage = location.pathname === '/games';
  const isShopPage = location.pathname === '/shop';
  const isChatPage = location.pathname === '/chat';

  const isTopLevelAnimatedPage = isGamesHomePage || isShopPage || isChatPage;

  const backgroundOffsetX =
    location.pathname === '/shop'
      ? 60
      : location.pathname.startsWith('/chat')
        ? -60
        : 0;

  const headerHeight = hasIosPwaPadding ? '94px' : '64px';

  const animatedMainClassName = 'fixed left-0 right-0 overflow-hidden';

  const animatedMainStyle: CSSProperties = {
    top: headerHeight,
    bottom: 'calc(100px + env(safe-area-inset-bottom))',
  };

  const defaultMainStyle: CSSProperties = {
    paddingTop: headerHeight,
    paddingBottom: 'calc(112px + env(safe-area-inset-bottom))',
  };

  const isBootstrapping = status === 'idle';

  return (
    <AppBackground
      pathname={location.pathname}
      backgroundOffsetX={backgroundOffsetX}
    >
      {!isFullscreenPage ? (
        <AppHeader onProfileClick={() => setIsProfileDialogOpen(true)} />
      ) : null}

      {isBootstrapping ? (
        <main
          className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6"
          style={defaultMainStyle}
        >
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            در حال بررسی وضعیت ورود...
          </div>
        </main>
      ) : isFullscreenPage ? (
 <main
    className="overflow-hidden"
    style={
      isDirectChatPage
        ? {
            position: 'fixed',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }
        : isRoomLobbyPage || isRoomGamePage
          ? {
              position: 'fixed',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            }
          : {
              height: `calc(100dvh - ${headerHeight})`,
              paddingTop: headerHeight
            }
    }
  >
    <Outlet />
  </main>


      ) : isTopLevelAnimatedPage ? (
        <main className={animatedMainClassName} style={animatedMainStyle}>
          <AppTabbedPages
            onNotificationsClick={() => setIsNotificationsDialogOpen(true)}
            onRecentResultsClick={() => setIsRecentResultsDialogOpen(true)}
          />
        </main>
      ) : (
        <main
          className="mx-auto flex-1 min-h-0 w-full max-w-6xl px-6"
          style={defaultMainStyle}
        >
          <Outlet />
        </main>
      )}

      {!isFullscreenPage ? <AppNavigation /> : null}

      <ProfileDialog
        open={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
      />

      <NotificationsDialog
        open={isNotificationsDialogOpen}
        onClose={() => setIsNotificationsDialogOpen(false)}
      />

      <RecentGameResultsDialog
        open={isRecentResultsDialogOpen}
        onClose={() => setIsRecentResultsDialogOpen(false)}
      />

      <LoginDialogSheet
        open={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        dismissible={false}
      />

      <AppIdleGuard
        status={status}
        suspend={isOfflineDialogOpen || isLoginDialogOpen}
        refreshCurrentUser={refreshCurrentUser}
        onOffline={() => setIsOfflineDialogOpen(true)}
        onPausedChange={setIsIdlePaused}
      />

      {isOfflineDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white p-6 text-right shadow-2xl shadow-ink/25">
            <h2 className="font-display text-2xl font-black text-ink">
              شما آفلاین هستید
            </h2>

            <p className="mt-3 font-bold leading-7 text-ink/65">
              شما آفلاین هستید و یا شخص دیگری وارد اکانت شما شده است.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full bg-moss px-5 py-3 font-black text-white"
              >
                تلاش مجدد
              </button>

              <button
                type="button"
                onClick={handleLoginAgain}
                className="rounded-full bg-ink px-5 py-3 font-black text-white"
              >
                وارد شدن دوباره
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer />
    </AppBackground>
  );
}
