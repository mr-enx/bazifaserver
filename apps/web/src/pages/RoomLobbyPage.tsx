import { useQueryClient } from '@tanstack/react-query';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IMAGE_GUESS_IMAGE_COUNT_OPTIONS,
  SOCKET_EVENTS,
  TIC_TAC_TOE_BOARD_SIZE_OPTIONS,
  type ChatMessage,
  type GameFinishedPayload,
  type ImageGuessSettings,
  type RoomDetails,
  type RoomErrorPayload,
  type RoomGameStartedPayload,
  type RoomSettings,
  type TicTacToeSettings,
  type VoiceUser
} from '@game-platform/shared';
import { GameFinishedDialog } from '../components/game-results/GameFinishedDialog';

import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProfileBottomSheet } from '../components/profile/ProfileBottomSheet';
import { ChatPanel } from '../components/chat/ChatPanel';
import { RoomInviteDialog } from '../components/chat/RoomInviteDialog';
import { VoiceAudioRenderer } from '../components/voice/VoiceAudioRenderer';
import { Dialog } from '../components/ui/Dialog';
import { PlayerAvatarCard } from '../components/game/PlayerAvatarCard';
import { fetchRoom } from '../lib/api';
import { isIosPwa } from '../lib/isIosPwa';
import { getLobbySocket } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';
import { useVoiceStore } from '../stores/voiceStore';

import BackLobbyIcon from '../assets/icon-back-lobby.png';
import SettingsLobbyIcon from '../assets/icon-settings-lobby.png';
import FriendsLobbyIcon from '../assets/icon-friends-lobby.png';
import BackgroundChat from '../assets/background-chat.png';

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}


function settingsSummary(settings: RoomDetails['settings']): string {
  const entries = Object.entries(settings);
  return entries.length === 0
    ? 'Default settings'
    : entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
}

function readNumber(settings: RoomSettings, key: string, fallback: number): number {
  const value = settings[key];
  return typeof value === 'number' ? value : fallback;
}

type SettingsPanelProps = {
  room: RoomDetails;
  onSubmit: (settings: RoomSettings) => void;
};

type ProfileSheetUser = {
  userId: string;
  username: string;
  fullName?: string | null;
  age?: number | null;
  province?: string | null;
  city?: string | null;
  avatarUrl: string | null;
};


function OwnerSettingsPanel({ room, onSubmit }: SettingsPanelProps) {
  const [rounds, setRounds] = useState(() =>
    readNumber(room.settings, 'rounds', room.game.slug === 'image_guess' ? 1 : 3)
  );

  const [imageCount, setImageCount] = useState<ImageGuessSettings['imageCount']>(() => {
    const value = readNumber(room.settings, 'imageCount', 18);

    return IMAGE_GUESS_IMAGE_COUNT_OPTIONS.includes(value as ImageGuessSettings['imageCount'])
      ? (value as ImageGuessSettings['imageCount'])
      : 18;
  });

  useEffect(() => {
    setRounds(readNumber(room.settings, 'rounds', room.game.slug === 'image_guess' ? 1 : 3));

    const nextImageCount = readNumber(room.settings, 'imageCount', 18);

    setImageCount(
      IMAGE_GUESS_IMAGE_COUNT_OPTIONS.includes(nextImageCount as ImageGuessSettings['imageCount'])
        ? (nextImageCount as ImageGuessSettings['imageCount'])
        : 18
    );
  }, [room.game.slug, room.settings]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (room.game.slug === 'tic_tac_toe') {
      onSubmit({ rounds, boardSize: 3 } satisfies TicTacToeSettings);
      return;
    }

    if (room.game.slug === 'image_guess') {
      onSubmit({ rounds, imageCount } satisfies ImageGuessSettings);
      return;
    }

    onSubmit({});
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-8"
    >
    <p className="mt-3 text-center font-bold text-ink/60">
        فقط صاحب اتاق میتواند تنظیمات را بروزرسانی کند
      </p>

      {room.game.slug === 'tic_tac_toe' || room.game.slug === 'image_guess' ? (
        <label className="mt-5 block">
          <span className="text-md font-black uppercase tracking-[0.18em] text-ink/50">
            تعداد راند ها
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={rounds}
            onChange={(event) => setRounds(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl  bg-white px-4 py-3 font-black outline-none ring-moss/30 transition focus:ring-4"
          />
        </label>
      ) : (
        <p className="mt-5 text-center font-bold text-ink/50">
          این بازی تنظیمات خاصی ندارد.
        </p>
      )}

      {room.game.slug === 'tic_tac_toe' ? (
        <label className="mt-4 block">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-ink/50">
            Board size
          </span>
          <select
            value={3}
            disabled
            className="mt-2 w-full rounded-2xl  bg-white px-4 py-3 font-black text-ink/60 outline-none"
          >
            {TIC_TAC_TOE_BOARD_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} x {size}
              </option>
            ))}
          </select>

          <p className="mt-2 text-sm font-bold text-ink/50">
            Only 3 x 3 is enabled for now.
          </p>
        </label>
      ) : null}

      {room.game.slug === 'image_guess' ? (
        <label className="mt-4 block">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-ink/50">
            Image count
          </span>
          <select
            value={imageCount}
            onChange={(event) =>
              setImageCount(Number(event.target.value) as ImageGuessSettings['imageCount'])
            }
            className="mt-2 w-full rounded-2xl  bg-white px-4 py-3 font-black outline-none ring-moss/30 transition focus:ring-4"
          >
            {IMAGE_GUESS_IMAGE_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} images
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="submit"
        className="mt-3 w-full rounded-2xl bg-moss px-8 py-2 text-lg font-black text-white shadow-xl shadow-ink/10"
      >
        ذخیره
      </button>
    </form>
  );
}

function ReadOnlySettingsPanel({ room }: { room: RoomDetails }) {
  return (
    <div className="rounded-[2rem]  bg-white/75 p-6 shadow-xl shadow-ink/10">
      <h2 className="font-display text-3xl font-black">Settings</h2>
      <p className="mt-3 rounded-3xl bg-canvas p-4 font-bold text-ink/60">
        {settingsSummary(room.settings)}
      </p>
    </div>
  );
}

export function RoomLobbyPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isChatMicActive, setIsChatMicActive] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSheetUser | null>(null);
  const [floatingChatMessages, setFloatingChatMessages] = useState<Record<string, ChatMessage>>({});
  const [isIosStandalone, setIsIosStandalone] = useState(false);

  const setActiveGame = useGameStore((state) => state.setActiveGame);
  const lastFinishedGame = useGameStore((state) => state.lastFinishedGame);
  const setLastFinishedGame = useGameStore((state) => state.setLastFinishedGame);
  const clearLastFinishedGame = useGameStore((state) => state.clearLastFinishedGame);

  const showToast = useToastStore((state) => state.showToast);

  const syncActiveGame = useCallback(
    (state: RoomDetails) => {
      if (state.id !== roomId || state.status !== 'in_game' || !state.activeMatch) {
        return;
      }

      setActiveGame({
        roomId: state.id,
        matchId: state.activeMatch.matchId,
        gameSlug: state.activeMatch.gameSlug,
        state: state.activeMatch.state
      });
    },
    [roomId, setActiveGame]
  );

  const voiceStatus = useVoiceStore((state) => state.status);
  const voiceRoomId = useVoiceStore((state) => state.roomId);
  const participants = useVoiceStore((state) => state.participants);
  const remoteStreams = useVoiceStore((state) => state.remoteStreams);
  const joinVoice = useVoiceStore((state) => state.joinVoice);
  const leaveVoice = useVoiceStore((state) => state.leaveVoice);
  const setMuted = useVoiceStore((state) => state.setMuted);
  const clearError = useVoiceStore((state) => state.clearError);
  const syncSocketHandlers = useVoiceStore((state) => state.syncSocketHandlers);

  useEffect(() => {
    setIsIosStandalone(isIosPwa());
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    syncSocketHandlers(token);
  }, [syncSocketHandlers, token]);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      if (!roomId || !token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const roomDetails = await fetchRoom(roomId, token);

        if (isMounted) {
          setRoom(roomDetails);
          syncActiveGame(roomDetails);

          if (roomDetails.status === 'in_game' && roomDetails.activeMatch) {
            navigate(`/rooms/${roomDetails.id}/game`, { replace: true });
          }
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Failed to load room';
          setError(message);
          showToast(message, 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRoom();

    return () => {
      isMounted = false;
    };
  }, [navigate, roomId, syncActiveGame, token]);

  useEffect(() => {
    if (!roomId || !token) {
      return;
    }

    const socket = getLobbySocket(token);

    const handleState = (state: RoomDetails) => {
      if (state.id === roomId) {
        setRoom(state);
        setError(null);
        syncActiveGame(state);
      }
    };

    const handleError = (payload: RoomErrorPayload) => setError(payload.message);

    const handleGameStarted = (payload: RoomGameStartedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setActiveGame({
        roomId: payload.roomId,
        matchId: payload.matchId,
        gameSlug: payload.gameSlug,
        state: payload.initialState
      });

      navigate(`/rooms/${payload.roomId}/game`, { replace: true });
    };

    const handleGameFinished = (payload: GameFinishedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setLastFinishedGame(payload);
      void queryClient.invalidateQueries({ queryKey: ['recent-game-results'] });
      void refreshCurrentUser();
    };

    const handleConnectError = (connectError: Error) => setError(connectError.message);
    const handleConnect = () => socket.emit(SOCKET_EVENTS.roomJoin, { roomId });

    socket.on(SOCKET_EVENTS.roomState, handleState);
    socket.on(SOCKET_EVENTS.roomError, handleError);
    socket.on(SOCKET_EVENTS.roomGameStarted, handleGameStarted);
    socket.on(SOCKET_EVENTS.gameFinished, handleGameFinished);
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off(SOCKET_EVENTS.roomState, handleState);
      socket.off(SOCKET_EVENTS.roomError, handleError);
      socket.off(SOCKET_EVENTS.roomGameStarted, handleGameStarted);
      socket.off(SOCKET_EVENTS.gameFinished, handleGameFinished);
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [roomId, setActiveGame, navigate, queryClient, refreshCurrentUser, setLastFinishedGame, syncActiveGame, token]);

  const lastShownErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      showToast(error, 'error');
      lastShownErrorRef.current = error;
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!room || !roomId || !token || !user) {
      return;
    }

    if (voiceStatus === 'joined' && voiceRoomId === roomId) {
      return;
    }

    const voiceUser: VoiceUser = {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isMuted: true
    };

    void joinVoice(roomId, token, voiceUser);
  }, [room, roomId, token, user, joinVoice, voiceStatus, voiceRoomId]);

  const handleFloatingChatMessage = useCallback((message: ChatMessage) => {
    setFloatingChatMessages((currentMessages) => ({
      ...currentMessages,
      [message.userId]: message
    }));
  }, []);

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.userId === user?.id),
    [room, user?.id]
  );

  const isOwner = room?.ownerUserId === user?.id;
  const finishedResult = lastFinishedGame?.roomId === room?.id ? lastFinishedGame : null;

  function handleStartGame() {
    if (!roomId || !token || !isOwner || !room?.canStart) {
      return;
    }

    const socket = getLobbySocket(token);
    socket.emit(SOCKET_EVENTS.roomStartGame, { roomId });
  }

  function handleReadyToggle() {
    if (!roomId || !token || !currentPlayer) {
      return;
    }

    const socket = getLobbySocket(token);
    socket.emit(
      currentPlayer.isReady ? SOCKET_EVENTS.roomUnready : SOCKET_EVENTS.roomReady,
      { roomId }
    );
  }

  function handleLeave() {
    if (!roomId || !token) {
      leaveVoice();
      navigate('/games');
      return;
    }

    setIsChatMicActive(false);
    leaveVoice();

    const destination = room ? `/games/${room.gameId}/rooms` : '/games';
    const socket = getLobbySocket(token);

    socket.emit(SOCKET_EVENTS.roomLeave, { roomId });
    navigate(destination, { replace: true });
  }

  function handleSettingsUpdate(settings: RoomSettings) {
    if (!roomId || !token) {
      return;
    }

    const socket = getLobbySocket(token);
    socket.emit(SOCKET_EVENTS.roomUpdateSettings, { roomId, settings });
  }

  function handleChatMicStart() {
    if (!roomId) {
      return;
    }

    if (!(voiceStatus === 'joined' && voiceRoomId === roomId)) {
      return;
    }

    clearError();
    setIsChatMicActive(true);
    setMuted(false);
  }

  function handleChatMicEnd() {
    if (!roomId) {
      return;
    }

    if (!(voiceStatus === 'joined' && voiceRoomId === roomId)) {
      return;
    }

    setIsChatMicActive(false);
    setMuted(true);
  }

  function openProfile(profileUser: ProfileSheetUser) {
    if (profileUser.userId === user?.id) {
      return;
    }

    setSelectedProfile(profileUser);
  }

  if (isLoading && !room) {
    return (
      <section
        className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BackgroundChat})` }}
      >
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="rounded-[2rem]  bg-white/75 p-8 text-center font-black shadow-xl shadow-ink/10">
            Loading lobby...
          </div>
        </div>
      </section>
    );
  }

  if (!room) {
    return (
      <section
        className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BackgroundChat})` }}
      >
        <div className="flex flex-1 items-center justify-center px-4">
          <Dialog
            avatarType={3}
            open
            onClose={() => navigate('/games')}
            title="اتاق یافت نشد"
          >
            <div className="px-2 py-4 text-center font-bold text-ink">
              <p className="mb-6">{error ?? 'This room could not be loaded.'}</p>
              <Link
                to="/games"
                className="inline-flex rounded-full bg-ember px-5 py-3 font-black text-white"
              >
                بازگشتن
              </Link>
            </div>
          </Dialog>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BackgroundChat})` }}
      >
        <header
          className="relative z-50 shrink-0 border-b border-ink/10"
          style={isIosStandalone ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
        >
          <nav className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={handleLeave}
              className="h-14 w-14 shrink-0 bg-center bg-no-repeat bg-[length:100%_100%]"
              style={{ backgroundImage: `url(${BackLobbyIcon})` }}
              aria-label="Back"
            />

            <h1 className="min-w-0 flex-1 truncate text-center font-display text-lg font-black tracking-tight">
{getDisplayName({
  username: room.ownerUsername,
  fullName: room.ownerName
})}

              &apos;s room
            </h1>

            <button
              type="button"
              onClick={() => setIsInviteDialogOpen(true)}
              className="h-14 w-14 shrink-0 bg-center bg-no-repeat bg-[length:100%_100%]"
              style={{ backgroundImage: `url(${FriendsLobbyIcon})` }}
              aria-label="Friends"
            />

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-14 w-14 shrink-0 bg-center bg-no-repeat bg-[length:100%_100%]"
              style={{ backgroundImage: `url(${SettingsLobbyIcon})` }}
              aria-label="Settings"
            />
          </nav>

          <div className="border-t border-ink/10 px-4 pb-3 pt-2">
            <div className="flex flex-wrap items-center justify-center gap-4 pb-1 pt-2">
              {room.players.map((player) => {
                const isTalking = participants.some(
                  (participant) =>
                    participant.userId === player.userId && participant.isMuted === false
                );

                const isSelf = player.userId === user?.id;

                return (
                  <div key={player.id} className="shrink-0">
                    <PlayerAvatarCard
                      userId={player.userId}
                      username={player.username}
                      fullName={player.fullName}
                      avatarUrl={player.avatarUrl}
                      isSelf={isSelf}
                      isTalking={isTalking}
                      isOwner={player.userId === room.ownerUserId}
                      isReady={player.isReady}
                      isConnected={player.isConnected}
                      disconnectedUntil={player.disconnectedUntil}
                      floatingMessage={floatingChatMessages[player.userId]?.message}
                      onClick={() =>
openProfile({
  userId: player.userId,
  username: player.username,
  fullName: player.fullName,
  age: player.age,
  province: player.province,
  city: player.city,
  avatarUrl: player.avatarUrl
})

                      }
                      onReadyToggle={isSelf ? handleReadyToggle : undefined}
                      isReadyDisabled={!currentPlayer}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {isOwner && room.canStart ? (
          <div className="shrink-0 px-4 pt-3">
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full rounded-2xl bg-moss px-6 py-4 text-lg font-black text-white shadow-xl shadow-ink/10"
            >
              شروع بازی
            </button>
          </div>
        ) : null}

        {room.status === 'in_game' && room.activeMatch ? (
          <div className="shrink-0 px-4 pt-3">
            <button
              type="button"
              onClick={() => {
                setActiveGame({
                  roomId: room.id,
                  matchId: room.activeMatch!.matchId,
                  gameSlug: room.activeMatch!.gameSlug,
                  state: room.activeMatch!.state
                });
                navigate(`/rooms/${room.id}/game`);
              }}
              className="w-full rounded-2xl bg-ink px-6 py-4 text-lg font-black text-white shadow-xl shadow-ink/10"
            >
              Rejoin Game
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden pt-3">
          {token ? (
            <ChatPanel
              roomId={room.id}
              token={token}
              currentUserId={user?.id}
              onNewMessage={handleFloatingChatMessage}
              onMicPointerDown={handleChatMicStart}
              onMicPointerUp={handleChatMicEnd}
              onMicPointerLeave={handleChatMicEnd}
              isMicActive={isChatMicActive}
              variant="inline"
            />
          ) : null}
        </div>

        <div className="hidden">
          {remoteStreams.map((item) => (
            <VoiceAudioRenderer key={item.userId} stream={item.stream} />
          ))}
        </div>

        <Dialog
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="تنظیمات اتاق"
        >
          {isOwner ? (
            <OwnerSettingsPanel
              room={room}
              onSubmit={(settings) => {
                handleSettingsUpdate(settings);
                setIsSettingsOpen(false);
              }}
            />
          ) : (
            <ReadOnlySettingsPanel room={room} />
          )}
        </Dialog>

        {finishedResult ? (
          <GameFinishedDialog
            open={Boolean(finishedResult)}
            room={room}
            result={finishedResult}
            currentUserId={user?.id}
            onClose={() => clearLastFinishedGame(finishedResult.matchId)}
          />
        ) : null}
      </section>

      <RoomInviteDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        roomId={roomId!}
      />

<ProfileBottomSheet
  isOpen={Boolean(selectedProfile)}
  userId={selectedProfile?.userId ?? null}
  onClose={() => setSelectedProfile(null)}
/>
    </>
  );
}
