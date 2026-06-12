type RoundTransitionOverlayProps = {
  currentRound: number;
  rounds: number;
};

export function RoundTransitionOverlay({
  currentRound,
  rounds
}: RoundTransitionOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="animate-round-overlay rounded-[2rem] bg-ink/95 px-10 py-8 text-center text-white shadow-2xl backdrop-blur-md">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">
          Round
        </p>

        <h2 className="mt-3 font-display text-5xl font-black">
          {currentRound}
          <span className="mx-2 text-white/40">/</span>
          {rounds}
        </h2>
      </div>
    </div>
  );
}
