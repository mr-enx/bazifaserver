import { create } from 'zustand';
import type { GameFinishedPayload } from '@game-platform/shared';

const ACTIVE_GAME_STORAGE_KEY = 'bazifa:active-game';

type ActiveGameState = {
  roomId: string;
  matchId: string;
  gameSlug: string;
  state: unknown;
};

type GameStore = {
  activeGame: ActiveGameState | null;
  lastFinishedGame: GameFinishedPayload | null;
  setActiveGame: (game: ActiveGameState) => void;
  updateState: (roomId: string, matchId: string, gameSlug: string, state: unknown) => void;
  setLastFinishedGame: (result: GameFinishedPayload) => void;
  clearLastFinishedGame: (matchId?: string) => void;
  clearActiveGame: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  activeGame: readStoredActiveGame(),
  lastFinishedGame: null,
  setActiveGame: (game) => {
    storeActiveGame(game);
    set({ activeGame: game });
  },
  updateState: (roomId, matchId, gameSlug, state) =>
    set((current) => {
      if (!current.activeGame || current.activeGame.roomId !== roomId || current.activeGame.matchId !== matchId) {
        return current;
      }

      const activeGame = {
        ...current.activeGame,
        state,
        matchId,
        gameSlug
      };

      storeActiveGame(activeGame);

      return {
        activeGame: {
          ...activeGame
        }
      };
    }),
  setLastFinishedGame: (result) => set({ lastFinishedGame: result }),
  clearLastFinishedGame: (matchId) =>
    set((current) => {
      if (matchId && current.lastFinishedGame?.matchId !== matchId) {
        return current;
      }

      return { lastFinishedGame: null };
    }),
  clearActiveGame: () => {
    clearStoredActiveGame();
    set({ activeGame: null });
  }
}));

function readStoredActiveGame(): ActiveGameState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
    return value ? (JSON.parse(value) as ActiveGameState) : null;
  } catch {
    return null;
  }
}

function storeActiveGame(game: ActiveGameState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(game));
}

function clearStoredActiveGame(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
}
