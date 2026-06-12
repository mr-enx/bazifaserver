import type { ReactNode, CSSProperties } from 'react';
import backgroundPattern from '../assets/background.webp';
import { isIosPwa } from '../lib/isIosPwa';

type AppBackgroundProps = {
  pathname: string;
  backgroundOffsetX?: number;
  children: ReactNode;
};

export function AppBackground({
  pathname,
  backgroundOffsetX = 0,
  children,
}: AppBackgroundProps) {
  const hasTiledBackground =
    pathname === '/shop' ||
    pathname === '/chat' ||
    pathname.startsWith('/chat/') ||
    pathname === '/notifications' ||
    pathname === '/profile' ||
    pathname === '/games' ||
    pathname.startsWith('/games/');

  const iosPwa = isIosPwa();

  const patternStyle: CSSProperties = {
    backgroundImage: `url(${backgroundPattern})`,
    backgroundSize: '140px 140px',
    backgroundRepeat: 'repeat',
    transform: `translate3d(${backgroundOffsetX}px, 0, 0)`,
    transition: 'transform 2050ms cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform',
  };

  return (
    <div
      className="w-full overflow-hidden bg-canvas text-ink"
      style={
        iosPwa
          ? {
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
            }
          : {
              position: 'relative',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
            }
      }
    >
      {hasTiledBackground ? (
        <>
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-0"
            style={{
              left: '-280px',
              right: '-280px',
              ...patternStyle,
            }}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-52 bg-gradient-to-b from-black/40 to-transparent" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-52 bg-gradient-to-t from-black/40 to-transparent" />
        </>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
