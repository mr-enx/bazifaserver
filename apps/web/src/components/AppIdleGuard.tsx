import { useCallback, useEffect, useRef, useState } from 'react';

import { pauseLobbySocket, resumeLobbySocket } from '../lib/socket';
import { Dialog } from './ui/Dialog';

type AppIdleGuardProps = {
  status: string;
  suspend: boolean;
  refreshCurrentUser: () => Promise<unknown>;
  onOffline: () => void;
  onPausedChange: (paused: boolean) => void;
};

export function AppIdleGuard({
  status,
  suspend,
  refreshCurrentUser,
  onOffline,
  onPausedChange,
}: AppIdleGuardProps) {
  const [isIdleDialogOpen, setIsIdleDialogOpen] = useState(false);

  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const fetchResumeGateRef = useRef<{ promise: Promise<void>; resolve: (() => void) | null } | null>(null);
  const isNetworkPausedRef = useRef(false);
  const idleTimeoutIdRef = useRef<number | null>(null);

  const pauseNetworkRequests = useCallback(() => {
    if (isNetworkPausedRef.current) {
      return;
    }

    isNetworkPausedRef.current = true;

    if (!fetchResumeGateRef.current) {
      let resolve: (() => void) | null = null;
      const promise = new Promise<void>((nextResolve) => {
        resolve = nextResolve;
      });
      fetchResumeGateRef.current = { promise, resolve };
    }
  }, []);

  const resumeNetworkRequests = useCallback(() => {
    if (!isNetworkPausedRef.current) {
      return;
    }

    isNetworkPausedRef.current = false;
    const gate = fetchResumeGateRef.current;
    fetchResumeGateRef.current = null;
    gate?.resolve?.();
  }, []);

  const scheduleIdleTimeout = useCallback(() => {
    if (idleTimeoutIdRef.current) {
      window.clearTimeout(idleTimeoutIdRef.current);
    }

    idleTimeoutIdRef.current = window.setTimeout(() => {
      setIsIdleDialogOpen(true);
      onPausedChange(true);
      pauseNetworkRequests();
      pauseLobbySocket();
      if (idleTimeoutIdRef.current) {
        window.clearTimeout(idleTimeoutIdRef.current);
        idleTimeoutIdRef.current = null;
      }
    }, 5 * 60 * 1000);
  }, [onPausedChange, pauseNetworkRequests]);

  const recordActivity = useCallback(() => {
    if (status !== 'authenticated') {
      return;
    }

    if (suspend || isIdleDialogOpen) {
      if (idleTimeoutIdRef.current) {
        window.clearTimeout(idleTimeoutIdRef.current);
        idleTimeoutIdRef.current = null;
      }
      return;
    }

    scheduleIdleTimeout();
  }, [isIdleDialogOpen, scheduleIdleTimeout, status, suspend]);

  const handleRetry = useCallback(() => {
    setIsIdleDialogOpen(false);
    onPausedChange(false);
    resumeNetworkRequests();
    resumeLobbySocket();
    scheduleIdleTimeout();

    if (status === 'authenticated') {
      void refreshCurrentUser().catch(() => {
        onOffline();
      });
    }
  }, [onOffline, onPausedChange, refreshCurrentUser, resumeNetworkRequests, scheduleIdleTimeout, status]);

  useEffect(() => {
    if (originalFetchRef.current) {
      return;
    }

    originalFetchRef.current = window.fetch.bind(window);
    const originalFetch = originalFetchRef.current!;

    window.fetch = async (...args) => {
      while (isNetworkPausedRef.current) {
        const gate = fetchResumeGateRef.current;
        if (!gate) {
          break;
        }
        await gate.promise;
      }

      return originalFetch(...args);
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (idleTimeoutIdRef.current) {
        window.clearTimeout(idleTimeoutIdRef.current);
        idleTimeoutIdRef.current = null;
      }

      setIsIdleDialogOpen(false);
      onPausedChange(false);
      resumeNetworkRequests();
      resumeLobbySocket();
      return;
    }

    recordActivity();

    const handler = () => recordActivity();

    window.addEventListener('mousemove', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('wheel', handler, { passive: true });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handler();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('scroll', handler);
      window.removeEventListener('wheel', handler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onPausedChange, recordActivity, resumeNetworkRequests, status]);

  return (
    <Dialog
      open={isIdleDialogOpen}
      onClose={handleRetry}
      closeOnBackdropClick={false}
      avatarType={3}
      title='هنوز در بازی هستید؟'
    >
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-ink">
          هنوز در بازی هستید؟
        </h2>
        <div className="mt-6">
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-full bg-moss px-6 py-3 font-black text-white"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    </Dialog>
  );
}
