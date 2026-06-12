import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchCurrentRoomMembership } from '../lib/api';
import { clearPendingRoomLeave, isPendingRoomLeave } from '../lib/pendingRoomLeave';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

export function RootRedirect() {
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);
  const activeGame = useGameStore((state) => state.activeGame);
  const clearActiveGame = useGameStore((state) => state.clearActiveGame);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveDestination() {
      if (status !== 'authenticated' || !token) {
        setDestination('/games');
        return;
      }

      try {
        const membership = await fetchCurrentRoomMembership(token);

        if (!isMounted) {
          return;
        }

        if (!membership) {
          clearPendingRoomLeave();
        }

        if (membership?.roomId && isPendingRoomLeave(membership.roomId)) {
          setDestination('/games');
          return;
        }

        if (membership?.roomStatus === 'in_game') {
          setDestination(`/rooms/${membership.roomId}/game`);
          return;
        }

        if (membership?.roomId) {
          setDestination(`/rooms/${membership.roomId}`);
          return;
        }

        clearActiveGame();
        setDestination('/games');
      } catch {
        if (isMounted) {
          setDestination(activeGame ? `/rooms/${activeGame.roomId}/game` : '/games');
        }
      }
    }

    if (status !== 'idle') {
      void resolveDestination();
    }

    return () => {
      isMounted = false;
    };
  }, [activeGame, clearActiveGame, status, token]);

  if (status === 'idle') {
    return null;
  }

  if (!destination) {
    return null;
  }

  return <Navigate to={destination} replace />;
}
