import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import { ShopPage } from '../pages/ShopPage';
import { GamesHomePage } from '../pages/GamesHomePage';
import { ChatPage } from '../pages/ChatPage';

const PAGE_INDEX: Record<string, number> = {
  '/shop': 0,
  '/games': 1,
  '/chat': 2,
};

function getPageIndex(pathname: string): number | null {
  return PAGE_INDEX[pathname] ?? null;
}

type AppTabbedPagesProps = {
  onNotificationsClick?: () => void;
  onRecentResultsClick?: () => void;
};

export function AppTabbedPages({
  onNotificationsClick,
  onRecentResultsClick
}: AppTabbedPagesProps) {
  const location = useLocation();
  const navigationType = useNavigationType();

  const currentIndex = useMemo(() => {
    return getPageIndex(location.pathname);
  }, [location.pathname]);

  const previousIndexRef = useRef<number>(1);
  const lastValidIndexRef = useRef<number>(1);
  const shouldAnimateRef = useRef(false);

  useEffect(() => {
    if (currentIndex !== null) {
      shouldAnimateRef.current = previousIndexRef.current !== currentIndex;
      previousIndexRef.current = currentIndex;
      lastValidIndexRef.current = currentIndex;
    } else {
      shouldAnimateRef.current = false;
    }
  }, [currentIndex, navigationType]);

  const activeIndex = currentIndex ?? lastValidIndexRef.current;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <motion.div
        className="flex h-full w-full"
        animate={{
          x: `${activeIndex * -100}%`,
        }}
        transition={
          shouldAnimateRef.current
            ? {
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1],
              }
            : {
                duration: 0,
              }
        }
        style={{
          willChange: 'transform',
        }}
      >
        <section className="h-full min-w-full overflow-y-auto overflow-x-hidden">
          <ShopPage />
        </section>

        <section className="h-full min-w-full overflow-y-auto overflow-x-hidden">
          <GamesHomePage
            onNotificationsClick={onNotificationsClick}
            onRecentResultsClick={onRecentResultsClick}
          />
        </section>

        <section className="h-full min-w-full overflow-y-auto overflow-x-hidden">
          <ChatPage />
        </section>
      </motion.div>
    </div>
  );
}
