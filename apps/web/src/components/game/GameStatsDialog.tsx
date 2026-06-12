import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { useAuthStore } from '../../stores/authStore';
import { fetchGames } from '../../lib/api';
import { getXpProgressInfo } from '../../lib/xp';
import { Text } from '../ui/Text';
import type { Game } from '@game-platform/shared';

import xpIcon from '../../assets/icon-level.png';
import ImageGuessImage from '../../assets/image-Image Guess.png';
import TicTacToeImage from '../../assets/image-Tic Tac Toe.png';
import ChessImage from '../../assets/image-chess.png';

const VISUAL_MIN = 5;
const VISUAL_MAX = 95;

type GameStatsDialogProps = {
  open: boolean;
  onClose: () => void;
  avatarType?: 1 | 2;
};

function gameImageSrc(game?: Game): string {
  const slug = game?.slug?.toLowerCase().replace(/_/g, '-');

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

export function GameStatsDialog({ open, onClose, avatarType }: GameStatsDialogProps) {
  const token = useAuthStore((state) => state.token);

  const { data: games, isLoading } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => fetchGames(token!),
    enabled: open && !!token,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={4}
      title='آمار بازی‌ها'
    >
      <div className="flex flex-col gap-6 text-ink">

        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center font-black text-ink/60">
              در حال بارگذاری...
            </div>
          ) : !games || games.length === 0 ? (
            <div className="flex h-32 items-center justify-center font-black text-ink/60">
              بازی یافت نشد
            </div>
          ) : (
            games.map((game) => {
              const xpInfo = getXpProgressInfo(game.score ?? 0);
              const rawPercent = Math.max(
                0,
                Math.min(100, (xpInfo.currentLevelXp / xpInfo.currentLevelCapacity) * 100),
              );
              const visualPercent = VISUAL_MIN + (rawPercent / 100) * (VISUAL_MAX - VISUAL_MIN);

              return (
                <div
                  key={game.id}
                  className="rounded-[1.5rem]  bg-white/80 p-4 shadow-lg shadow-ink/5"
                >
                  <div className="flex flex-row items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={gameImageSrc(game)}
                        alt={game.name}
                        className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white md:h-20 md:w-20"
                      />
                      <div className="absolute -bottom-1 -right-1 z-10 h-8 w-8 md:h-10 md:w-10">
                        <img src={xpIcon} alt="XP" className="h-full w-full object-contain" />
                        <Text
                          preset="levelBadge"
                          className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs"
                        >
                          {xpInfo.level}
                        </Text>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col items-stretch gap-1">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-ink/40 md:text-[10px]">LEVEL</span>
                          <span className="font-display text-base font-black text-ink md:text-xl">
                            {String(xpInfo.level).padStart(2, '0')}
                          </span>
                        </div>
                        <h3 className="truncate font-display text-lg font-black tracking-tight md:text-2xl text-right">
                          {game.name}
                        </h3>
                      </div>

                      <div className="relative flex h-8 w-full items-center justify-center">
                        <div className="relative flex h-5 w-full items-center justify-center overflow-hidden rounded-full bg-black/35 px-8">
                          <div className="absolute inset-[1px] rounded-sm bg-black/20" />
                          <div className="absolute inset-[1px] overflow-hidden rounded-full">
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
                          <div className="absolute inset-x-[1px] top-[1px] h-[45%] rounded-sm bg-white/10" />
                          <Text
                            preset="outlinedWhite"
                            className="relative z-10 w-full text-center text-[8px] leading-none md:text-[9px]"
                          >
                            {xpInfo.progressText}
                          </Text>
                        </div>
                      </div>

                      <div className="flex flex-row-reverse items-center justify-between">
                        <p className="text-[10px] font-black text-ink/70 md:text-xs text-right">
                          امتیاز کل :{' '}
                          <span className="text-ink">
                            {game.score ?? 0}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
