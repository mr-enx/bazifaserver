import { PointerEvent, useEffect, useState } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { getPrimaryAvatar } from '../../lib/avatar';
import defaultProfile from '../../assets/default_profile.png';

type VoiceChatPanelProps = {
  roomId: string;
  token: string;
  currentUser?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
};

export function VoiceChatPanel({ roomId, token, currentUser }: VoiceChatPanelProps) {
  const status = useVoiceStore((state) => state.status);
  const activeRoomId = useVoiceStore((state) => state.roomId);
  const participants = useVoiceStore((state) => state.participants);
  const remoteStreams = useVoiceStore((state) => state.remoteStreams);
  const error = useVoiceStore((state) => state.error);
  const needsRetry = useVoiceStore((state) => state.needsRetry);
  const isMuted = useVoiceStore((state) => state.isMuted);
  const setMuted = useVoiceStore((state) => state.setMuted);
  const retryConnection = useVoiceStore((state) => state.retryConnection);
  const clearError = useVoiceStore((state) => state.clearError);
  const syncSocketHandlers = useVoiceStore((state) => state.syncSocketHandlers);
  const joinVoice = useVoiceStore((state) => state.joinVoice);
  const leaveVoice = useVoiceStore((state) => state.leaveVoice);

  const [isHoldingToTalk, setIsHoldingToTalk] = useState(false);

  const isInThisRoom = status === 'joined' && activeRoomId === roomId;
  const isJoiningThisRoom = status === 'joining' && activeRoomId === roomId;
  const isConnecting = status === 'joining' || isJoiningThisRoom;

  useEffect(() => {
    syncSocketHandlers(token);
  }, [syncSocketHandlers, token]);

  // Auto-join voice when panel mounts
  useEffect(() => {
    if (!currentUser || !roomId || !token) {
      return;
    }

    // Don't join if already in this room or currently joining
    if ((status === 'joined' || status === 'joining') && activeRoomId === roomId) {
      return;
    }

    joinVoice(roomId, token, {
      userId: currentUser.id,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      isMuted: true
    });

    return () => {
      // Leave voice when panel unmounts
      leaveVoice();
    };
  }, [roomId, token, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTalkStart() {
    if (!isInThisRoom) {
      return;
    }

    clearError();
    setIsHoldingToTalk(true);
    setMuted(false);
  }

  function handleTalkEnd() {
    if (!isInThisRoom) {
      return;
    }

    setIsHoldingToTalk(false);
    setMuted(true);
  }

  function handleTalkPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    handleTalkStart();
  }

  function handleTalkPointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    handleTalkEnd();
  }

  function handleTalkPointerCancel(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    handleTalkEnd();
  }

  async function handleRetry() {
    clearError();
    setIsHoldingToTalk(false);
    await retryConnection();
  }

  return (
    <section className="rounded-[2rem]  bg-white/75 p-6 shadow-xl shadow-ink/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-black">Voice chat</h2>
          <p className="mt-1 text-sm font-bold text-ink/50">Auto-connected voice for this room.</p>
        </div>

        <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-ink/50">
          {participants.length} voice
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            isInThisRoom
              ? 'bg-moss/10 text-moss'
              : isConnecting
                ? 'bg-amber-100 text-amber-700'
                : 'bg-ink/10 text-ink/60'
          }`}
        >
          {isInThisRoom ? 'Connected to voice' : isConnecting ? 'Connecting to voice...' : 'Voice not connected'}
        </div>

        {isInThisRoom ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              isMuted ? 'bg-ember/10 text-ember' : 'bg-moss/10 text-moss'
            }`}
          >
            {isMuted ? 'Mic muted' : 'Transmitting voice'}
          </div>
        ) : null}
      </div>

      {status === 'joined' && activeRoomId !== roomId ? (
        <p className="mt-4 rounded-2xl bg-ink/10 px-4 py-3 text-sm font-bold text-ink/60">
          Voice is active in another room.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-2xl bg-ember/10 px-4 py-3 font-bold text-ember">{error}</p>

          {needsRetry ? (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-2xl bg-ember px-5 py-3 font-black text-white shadow-xl shadow-ink/10"
            >
              Retry Connection
            </button>
          ) : null}
        </div>
      ) : null}

      {isInThisRoom ? (
        <div className="mt-5">
          <button
            type="button"
            onPointerDown={handleTalkPointerDown}
            onPointerUp={handleTalkPointerUp}
            onPointerCancel={handleTalkPointerCancel}
            onLostPointerCapture={handleTalkEnd}
            className={`w-full touch-none select-none rounded-3xl px-6 py-5 text-lg font-black text-white shadow-xl transition ${
              isHoldingToTalk ? 'bg-moss scale-[0.99] shadow-moss/30' : 'bg-ink shadow-ink/20'
            }`}
          >
            {isHoldingToTalk ? 'Talking...' : 'Hold to Talk'}
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {participants.length === 0 ? (
          <div className="rounded-3xl bg-canvas p-4 text-center font-bold text-ink/50 ring-1 ring-ink/10">
            No one is in voice yet.
          </div>
        ) : (
          participants.map((participant) => (
            <article
              key={participant.userId}
              className="flex items-center justify-between gap-3 rounded-3xl bg-canvas p-4 ring-1 ring-ink/10"
            >
              <div className="flex min-w-0 items-center gap-3">
                {participant.avatarUrl ? (
                  <img
                    src={getPrimaryAvatar(participant.avatarUrl) || defaultProfile}
                    alt=""
                    className={`h-10 w-10 rounded-2xl object-cover ${!participant.isMuted ? 'ring-2 ring-blue-500' : ''}`}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = defaultProfile;
                    }}
                  />
                ) : (
                  <img
                    src={defaultProfile}
                    alt=""
                    className={`h-10 w-10 rounded-2xl object-cover ${!participant.isMuted ? 'ring-2 ring-blue-500' : ''}`}
                  />
                )}

                <div className="min-w-0">
                  <h3 className="truncate font-black">{participant.username}</h3>
                  <p className="text-sm font-bold text-ink/50">{participant.isMuted ? 'Muted' : 'Talking'}</p>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                  participant.isMuted ? 'bg-ember/10 text-ember' : 'bg-moss/10 text-moss'
                }`}
              >
                {participant.isMuted ? 'Muted' : 'Live'}
              </span>
            </article>
          ))
        )}
      </div>

      <div className="hidden">
        {remoteStreams.map((remoteStream) => (
          <audio
            key={remoteStream.userId}
            autoPlay
            playsInline
            ref={(element) => {
              if (element && element.srcObject !== remoteStream.stream) {
                element.srcObject = remoteStream.stream;
                element.muted = false;
                element.volume = 1;
                void element.play().catch((error) => {
                  console.warn('voice audio autoplay warning', error);
                });
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
