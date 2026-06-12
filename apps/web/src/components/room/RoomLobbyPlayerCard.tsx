import type { RoomDetails } from '@game-platform/shared';
import ownerIcon from '../../assets/icon-owner.png';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

type RoomLobbyPlayerCardProps = {
  player: RoomDetails['players'][number];
  isTalking: boolean;
  isSelf: boolean;
  isOwner?: boolean;
  onClick: () => void;
  floatingMessage?: string | null;
};

function getDisplayName(user: { name?: string | null; username: string }): string {
  return user.name?.trim() || user.username;
}

function initials(value: string): string {
  return value.slice(0, 2).toUpperCase();
}

export function RoomLobbyPlayerCard({
  player,
  isTalking,
  isSelf,
  isOwner = false,
  onClick,
  floatingMessage
}: RoomLobbyPlayerCardProps) {
  const displayName = getDisplayName(player);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSelf}
      className={`relative flex w-[72px] shrink-0 flex-col items-center disabled:opacity-100 ${
        isSelf ? '' : 'transition-transform hover:scale-[1.03]'
      }`}
    >
      {floatingMessage ? (
        <div className="pointer-events-none absolute -top-12 left-1/2 z-30 w-max max-w-[180px] -translate-x-1/2 rounded-2xl bg-ink px-3 py-2 text-center text-xs font-black leading-4 text-white shadow-xl shadow-ink/20">
          <span className="line-clamp-2 break-words">{floatingMessage}</span>
          <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-ink" />
        </div>
      ) : null}

      <div className="relative h-16 w-16">
        <AvatarWithFrame
          avatarUrl={player.avatarUrl}
          alt={displayName}
          size="md"
          fallback={
            <span
              className={`grid h-full w-full place-items-center rounded-full font-black text-white transition ${
                isTalking ? 'bg-blue-600' : 'bg-ink'
              }`}
            >
              {initials(displayName)}
            </span>
          }
          className={`absolute inset-0 scale-[1.15] transition ${
            isTalking ? 'opacity-80' : ''
          }`}
        />

        <div
          className={`absolute -right-1 -top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-canvas ${
            player.isReady ? 'bg-moss text-white' : 'bg-ink/20 text-transparent'
          }`}
        >
          ✓
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1">
        <span className="line-clamp-2 text-center text-xs font-black leading-4 text-ink">
          {displayName}
        </span>

        {isOwner ? (
          <img
            src={ownerIcon}
            alt="Owner"
            className="h-4 w-4 shrink-0 object-contain"
          />
        ) : null}
      </div>
    </button>
  );
}
