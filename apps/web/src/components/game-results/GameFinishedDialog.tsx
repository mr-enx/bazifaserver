import type { GameFinishedPayload, RoomDetails, RoomPlayer } from '@game-platform/shared';

import ownerIcon from '../../assets/icon-owner.png';
import { Dialog } from '../ui/Dialog';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

type GameFinishedDialogProps = {
  open: boolean;
  room?: RoomDetails | null;
  result: GameFinishedPayload;
  currentUserId?: string;
  onClose: () => void;
};

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

function getHeaderText(result: GameFinishedPayload, currentUserId?: string): string {
  if (!currentUserId) {
    return 'نتیجه بازی';
  }

  if (result.result.winners.includes(currentUserId)) {
    return 'شما بردید';
  }

  if (result.result.losers.includes(currentUserId)) {
    return 'شما باختید';
  }

  return 'نتیجه بازی';
}

function getHeaderToneClass(result: GameFinishedPayload, currentUserId?: string): string {
  if (!currentUserId) {
    return 'text-ink';
  }

  if (result.result.winners.includes(currentUserId)) {
    return 'text-moss';
  }

  if (result.result.losers.includes(currentUserId)) {
    return 'text-ember';
  }

  return 'text-ink';
}

function getRowClassName(userId: string, winners: string[], losers: string[]) {
  if (winners.includes(userId)) {
    return 'bg-moss/15';
  }

  if (losers.includes(userId)) {
    return 'bg-ember/15';
  }

  return 'bg-white/80';
}

export function GameFinishedDialog({
  open,
  room,
  result,
  currentUserId,
  onClose
}: GameFinishedDialogProps) {
  const players: RoomPlayer[] = result.players ?? room?.players ?? [];
  const ownerUserId = result.ownerUserId ?? room?.ownerUserId;
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = result.result.score[a.userId] ?? 0;
    const scoreB = result.result.score[b.userId] ?? 0;
    return scoreB - scoreA;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={currentUserId && result.result.losers.includes(currentUserId) ? 6 : 2}
      title='نتیجه ی بازی'
    >
      <div className="flex max-h-[86dvh] flex-col">
        <div className="border-b border-ink/10 pb-4 text-center">
          <h2
            className={`mt-2 font-display text-3xl font-black ${getHeaderToneClass(
              result,
              currentUserId
            )}`}
          >
            {getHeaderText(result, currentUserId)}
          </h2>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto">
          <div className="space-y-3">
            {sortedPlayers.map((player) => {
              const score = result.result.score[player.userId] ?? 0;
              const isSelf = player.userId === currentUserId;
              const isOwner = player.userId === ownerUserId;

              return (
                <div
                  key={player.userId}
                  className={`rounded-[1.5rem] px-4 py-3 ${getRowClassName(
                    player.userId,
                    result.result.winners,
                    result.result.losers
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0">
                        <AvatarWithFrame
                          avatarUrl={player.avatarUrl}
                          alt={getDisplayName(player)}
                          size="md"
                          fallback={
                            <span className="text-xs font-black text-white">
                              {initials(player.username)}
                            </span>
                          }
                          className="overflow-hidden rounded-[8px] bg-ink/20"
                        />
                      </div>

                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-black text-ink">
                            {getDisplayName(player)}
                            {isSelf ? ' (شما)' : ''}
                          </p>

                          {isOwner ? (
                            <img
                              src={ownerIcon}
                              alt="Owner"
                              className="h-4 w-4 shrink-0 object-contain"
                              title="Owner"
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full bg-ink px-3 py-1 text-sm font-black text-white">
                      {score}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
