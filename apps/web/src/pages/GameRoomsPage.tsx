import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Game } from '@game-platform/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { createRoom, fetchGames, fetchRooms, joinRoom } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getXpProgressInfo } from '../lib/xp';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { Text } from '../components/ui/Text';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';
import ButtonAdd from '../assets/button-add.png';
import xpIcon from '../assets/icon-level.png';
import ImageGuessImage from '../assets/image-Image Guess.png';
import TicTacToeImage from '../assets/image-Tic Tac Toe.png';
import ChessImage from '../assets/image-chess.png';
import backgroundListUser from '../assets/backgrond-list-user.png';
import backgroundLinearHeaderGameRoom from '../assets/backgrond-lnear-header-game-room.png';
import IconMember from '../assets/icon-member.png';
import IconMemberActive from '../assets/icon-member-active.png';
import menuClickSound from '../assets/sounds/menu_click_06.ogg';

const VISUAL_MIN = 20;
const VISUAL_MAX = 95;

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function gameImageSrc(game?: Game): string {
  const slug = game?.slug;

  if (slug === 'tic-tac-toe') {
    return TicTacToeImage;
  }

  if (slug === 'image-guess') {
    return ImageGuessImage;
  }

  if (slug === 'chess') {
    return ChessImage;
  }

  return TicTacToeImage;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function GameRoomsPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);
  const { soundVolume } = useSettingsStore();

  const shownQueryErrorRef = useRef<string | null>(null);

  const playClickSound = () => {
    const audio = new Audio(menuClickSound);
    audio.volume = soundVolume / 100;
    audio.play().catch(console.error);
  };

  const gamesQuery = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => fetchGames(token!),
    enabled: Boolean(token),
  });

  const roomsQuery = useQuery({
    queryKey: ['rooms', gameId],
    queryFn: () => fetchRooms(gameId!, token!),
    enabled: Boolean(gameId && token),
    refetchInterval: 3000,
  });

  const game = gamesQuery.data?.find((item) => item.id === gameId);
  const roomsCount = roomsQuery.data?.length ?? 0;

  const xpInfo = getXpProgressInfo(game?.score ?? 0);
  const rawPercent = Math.max(
    0,
    Math.min(100, (xpInfo.currentLevelXp / xpInfo.currentLevelCapacity) * 100),
  );
  const visualPercent = VISUAL_MIN + (rawPercent / 100) * (VISUAL_MAX - VISUAL_MIN);

  const createRoomMutation = useMutation({
    mutationFn: () => createRoom(gameId!, token!),
    onSuccess: (room) => {
      void queryClient.invalidateQueries({ queryKey: ['rooms', gameId] });
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      navigate(`/rooms/${room.id}`);
    },
    onError: (error) => {
      showToast(getErrorMessage(error, 'خطا در ساخت روم'));
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: (roomId: string) => joinRoom(roomId, token!),
    onSuccess: (room) => {
      navigate(`/rooms/${room.id}`);
    },
    onError: (error) => {
      showToast(getErrorMessage(error, 'خطا در ورود به روم'));
    },
  });

  useEffect(() => {
    const queryError = roomsQuery.error ?? gamesQuery.error;

    if (!(queryError instanceof Error)) {
      shownQueryErrorRef.current = null;
      return;
    }

    if (shownQueryErrorRef.current === queryError.message) {
      return;
    }

    shownQueryErrorRef.current = queryError.message;
    showToast(queryError.message);
  }, [gamesQuery.error, roomsQuery.error, showToast]);

  return (
    <section className="relative space-y-6">
      <div
        className="relative left-1/2 w-screen -translate-x-1/2 bg-[length:100%_100%] bg-center bg-no-repeat px-4 pt-6 pb-14 md:px-6 md:pt-8 md:pb-20"
        style={{
          backgroundImage: `url(${backgroundLinearHeaderGameRoom})`,
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-row items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={gameImageSrc(game)}
                alt={game?.name ?? 'Game'}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white md:h-28 md:w-28 md:rounded-[1.5rem]"
              />
              <div className="absolute -bottom-2 -right-2 z-10 h-11 w-11 md:h-14 md:w-14">
                <img src={xpIcon} alt="XP" className="h-full w-full object-contain" />
                <Text
                  preset="levelBadge"
                  className="absolute inset-0 flex items-center justify-center text-xs md:text-sm"
                >
                  {xpInfo.level}
                </Text>
              </div>
            </div>

            <div className="min-w-0 flex flex-1 flex-col items-stretch gap-1">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-ink/40 md:text-xs">
                    LEVEL
                  </span>
                  <span className="font-display text-xl font-black text-ink md:text-2xl">
                    {String(xpInfo.level).padStart(2, '0')}
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl font-black tracking-tight text-ink md:text-4xl">
                  {game?.name ?? 'لیست روم ها'}
                </h1>
              </div>

              <div className="relative flex h-11 w-full items-center justify-center">
                <div className="relative flex h-7 w-full items-center justify-center overflow-hidden rounded-full bg-black/35 px-8">
                  <div className="absolute inset-[2px] rounded-sm bg-black/20" />
                  <div className="absolute inset-[2px] overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-md"
                      style={{
                        width: `${visualPercent}%`,
                        background:
                          'linear-gradient(to bottom, #15FBFF 0%, #13D8FC 50%, #11B5F9 51%, #11B5F9 100%)',
                        border: '1px solid #0000005b',
                        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.66)',
                      }}
                    />
                  </div>
                  <div className="absolute inset-x-[2px] top-[2px] h-[45%] rounded-sm bg-white/10" />
                  <Text
                    preset="outlinedWhite"
                    className="relative z-10 w-full text-center text-[10px] leading-none"
                  >
                    {xpInfo.progressText}
                  </Text>
                </div>
              </div>

              <div className="flex flex-row-reverse items-center gap-4">
                <p className="text-xs font-black text-ink/70 md:text-base">
                  امتیاز کل :{' '}
                  <span className="text-ink">
                    {gamesQuery.isLoading ? '...' : game?.score ?? 0}
                  </span>
                </p>
                <p className="text-xs font-black text-ink/70 md:text-base">
                  تعداد اتاق ها :{' '}
                  <span className="text-ink">
                    {roomsQuery.isLoading ? '...' : roomsCount}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {roomsQuery.isLoading ? (
        <div className="rounded-[1.5rem]  bg-white/75 p-6 text-center font-black shadow-xl shadow-ink/10 md:rounded-[2rem] md:p-8">
          Loading rooms...
        </div>
      ) : null}

      {roomsQuery.data?.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-ink/20 bg-white/60 p-6 text-center shadow-xl shadow-ink/10 md:rounded-[2rem] md:p-8">
          <h2 className="font-display text-2xl font-black md:text-3xl">
            هنوز رومی وجود ندارد
          </h2>
          <p className="mt-3 font-bold text-ink/60">
            برای ساخت روم جدید روی دکمه + بزنید.
          </p>
        </div>
      ) : null}

      {roomsQuery.data && roomsQuery.data.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          {roomsQuery.data.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => joinRoomMutation.mutate(room.id)}
              disabled={joinRoomMutation.isPending}
              style={{ backgroundImage: `url(${backgroundListUser})` }}
              className="group w-full  bg-[length:100%_100%] bg-center bg-no-repeat p-4 text-right transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-xl disabled:cursor-wait disabled:opacity-70 md:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 rounded-full bg-moss/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-moss md:px-3 md:text-xs">
                  {room.status}
                </span>

                <div className="min-w-0 flex flex-1 items-center justify-end gap-3 md:gap-4">
                  <div className="min-w-0 text-right">
                    <h2 className="truncate font-display text-base font-black md:text-xl">
                      {room.ownerUsername}'s room
                    </h2>

                    <div className="mt-2 flex flex-row-reverse items-center gap-1">
                      {Array.from({ length: room.maxPlayers }).map((_, index) => {
                        const isActive = index < room.currentPlayerCount;

                        return (
                          <img
                            key={index}
                            src={isActive ? IconMemberActive : IconMember}
                            alt={isActive ? 'active member' : 'member slot'}
                            className="h-5 w-5 object-contain md:h-6 md:w-6"
                          />
                        );
                      })}
                    </div>
                  </div>

                  <AvatarWithFrame
                    avatarUrl={room.ownerAvatarUrl}
                    alt={room.ownerUsername}
                    size="md"
                    fallback={
                      <span className="grid h-full w-full place-items-center rounded-full bg-ink text-sm font-black text-white md:text-base">
                        {initials(room.ownerUsername)}
                      </span>
                    }
                    className="shrink-0 scale-[1.15] md:scale-[1.20]"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <FloatingActionButton
        aria-label="Create room"
        onClick={() => {
          playClickSound();
          createRoomMutation.mutate();
        }}
        disabled={!gameId || !token}
        isLoading={createRoomMutation.isPending}
        iconSrc={ButtonAdd}
        iconAlt="Create room"
        position="right"
      />
    </section>
  );
}
