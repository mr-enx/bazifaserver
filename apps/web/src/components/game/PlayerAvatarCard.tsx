import { useEffect, useMemo, useState } from 'react';
import ownerIcon from '../../assets/icon-owner.png';
import { FloatingChatMessage } from '../chat/FloatingChatMessage';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

type PlayerAvatarCardProps = {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  isCurrentTurn?: boolean;
  isSelf?: boolean;
  isTalking?: boolean;
  isOwner?: boolean;
  isReady?: boolean;
  isConnected?: boolean;
  cancelRequested?: boolean;
  disconnectedUntil?: string | null;
  turnStartedAt?: string | null;
  turnDurationSeconds?: number | null;
  floatingMessage?: string;
  onClick?: () => void;
  onReadyToggle?: () => void;
  isReadyDisabled?: boolean;
};

function initials(username: string, fullName?: string | null): string {
  const nameToUse = fullName || username;
  return nameToUse.slice(0, 2).toUpperCase();
}

export function PlayerAvatarCard({
  username,
  fullName,
  avatarUrl,
  isCurrentTurn = false,
  isSelf = false,
  isTalking = false,
  isOwner = false,
  isReady,
  isConnected = true,
  cancelRequested = false,
  disconnectedUntil,
  turnStartedAt,
  turnDurationSeconds,
  floatingMessage,
  onClick,
  onReadyToggle,
  isReadyDisabled = false,
}: PlayerAvatarCardProps) {
  const showLobbyMeta = isTalking;
  const [now, setNow] = useState(() => Date.now());

  const offlineSecondsLeft = useMemo(() => {
    if (isConnected || !disconnectedUntil) {
      return null;
    }

    return Math.max(0, Math.ceil((new Date(disconnectedUntil).getTime() - now) / 1000));
  }, [disconnectedUntil, isConnected, now]);

  const turnProgress = useMemo(() => {
    if (!isCurrentTurn || !turnStartedAt || !turnDurationSeconds || turnDurationSeconds <= 0) {
      return null;
    }

    const startedAtMs = new Date(turnStartedAt).getTime();
    if (!Number.isFinite(startedAtMs)) {
      return null;
    }

    const durationMs = turnDurationSeconds * 1000;
    const elapsedMs = Math.max(0, now - startedAtMs);
    const remainingMs = Math.max(0, durationMs - elapsedMs);

    return {
      percent: Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)),
      secondsLeft: Math.ceil(remainingMs / 1000)
    };
  }, [isCurrentTurn, now, turnDurationSeconds, turnStartedAt]);

  const hasTurnProgress = Boolean(isCurrentTurn && turnStartedAt && turnDurationSeconds && turnDurationSeconds > 0);

  useEffect(() => {
    if (offlineSecondsLeft === null && !hasTurnProgress) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), hasTurnProgress ? 200 : 1000);
    return () => window.clearInterval(intervalId);
  }, [offlineSecondsLeft, hasTurnProgress]);

  const offlineLabel =
    offlineSecondsLeft === null
      ? null
      : `آفلاین ${Math.floor(offlineSecondsLeft / 60)}:${String(offlineSecondsLeft % 60).padStart(2, '0')}`;

  return (
    <div className="relative flex flex-col items-center">
      <FloatingChatMessage message={floatingMessage} />

      {offlineLabel ? (
        <span className="absolute -top-7 z-30 rounded-full bg-ember px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
          {offlineLabel}
        </span>
      ) : cancelRequested ? (
        <span className="absolute -top-7 z-30 rounded-full bg-ember px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
          درخواست لغو دارد
        </span>
      ) : null}

      {turnProgress ? (
        <div className="flex items-center gap-1 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="text-ink/60">
            <path fill="currentColor" d="M12.5 8H11v6l4.75 2.85l.75-1.23l-4-2.37zm4.837-6.19l4.607 3.845l-1.28 1.535l-4.61-3.843zm-10.674 0l1.282 1.536L3.337 7.19l-1.28-1.536zM12 4a9 9 0 1 0 .001 18.001A9 9 0 0 0 12 4m0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7s7 3.14 7 7s-3.14 7-7 7"/>
          </svg>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-black/15 shadow-inner">
            <div
              className="h-full rounded-full bg-moss transition-[width] duration-200"
              style={{ width: `${turnProgress.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {onReadyToggle && isSelf ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReadyToggle();
          }}
          disabled={isReadyDisabled}
          className={`mb-1 rounded-2xl px-4 py-2 text-xs font-black text-white shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
            isReady ? 'bg-moss' : 'bg-ink'
          }`}
        >
          {isReady ? 'آماده هستم' : 'آماده نیستم'}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        className={`relative flex flex-col items-center gap-2 transition active:scale-95 ${
          isCurrentTurn ? 'scale-110' : 'scale-100'
        } ${offlineLabel ? 'opacity-60 grayscale' : ''}`}
      >
        <div
          className={`relative transition-transform duration-200 ${
            isCurrentTurn ? 'scale-110' : 'scale-100'
          }`}
        >
          <AvatarWithFrame
            avatarUrl={avatarUrl}
            alt={fullName || username}
            size="lg"
            fallback={
              <span className="text-sm font-black text-white">
                {initials(username, fullName)}
              </span>
            }
            className="rounded-[10px] p-0"
          />
          {isTalking ? (
            <span className="absolute -right-1 -top-1 z-20 h-4 w-4 rounded-full border-2 border-white bg-moss shadow" />
          ) : null}

          {typeof isReady === 'boolean' ? (
            <span
              className={`absolute -bottom-1 -right-1 z-20 h-4 w-4 rounded-full border-2 border-white shadow ${
                isReady ? 'bg-green-500' : 'bg-gray-400'
              }`}
              title={isReady ? 'Ready' : 'Not ready'}
            />
          ) : null}
        </div>

        <div
          className={`rounded-full px-3 py-2 text-center transition ${
            isCurrentTurn ? 'bg-sky-500 text-white' : 'bg-black/20 text-ink'
          }`}
        >
          <div className="flex max-w-[110px] items-center justify-center gap-1">
            <p className="truncate text-xs font-black">
              {fullName || username}
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

          {showLobbyMeta ? (
            <div className="mt-1 flex items-center justify-center gap-1.5">
              {isTalking ? (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-600">
                  Voice
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}
