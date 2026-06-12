import { useEffect, useRef, useState, type ReactNode } from 'react';
import Phaser from 'phaser';

type PhaserGameProps = {
  config: Omit<Phaser.Types.Core.GameConfig, 'parent'>;
  className?: string;
  fallback?: ReactNode;
  onReady?: (game: Phaser.Game) => void;
};

export function PhaserGame({
  config,
  className,
  fallback,
  onReady
}: PhaserGameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onReadyRef = useRef(onReady);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (cancelled || !hostRef.current || gameRef.current) {
          return;
        }

        try {
          const game = new Phaser.Game({
            ...config,
            parent: hostRef.current
          });

          gameRef.current = game;
          setMountError(null);
          onReadyRef.current?.(game);
        } catch (error) {
          setMountError(error instanceof Error ? error.message : 'Phaser failed to mount.');
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [config]);

  if (mountError) {
    return (
      fallback ?? (
        <div className={className}>
          Unable to load game board: {mountError}
        </div>
      )
    );
  }

  return <div ref={hostRef} className={className} />;
}
