import type { ImageGuessState } from '@game-platform/shared';
import type { GameAction, GameEngine, PlayerInfo } from '../game-engine.base.js';

type ImageGuessSettingsInput = {
  rounds?: unknown;
  imageCount?: unknown;
};

type SelectPayload = {
  itemId: string;
};

const ALLOWED_IMAGE_COUNTS = [8, 18, 28] as const;

export class ImageGuessEngine implements GameEngine {
  createInitialState(settings: unknown, players: PlayerInfo[]): ImageGuessState {
    if (players.length < 1) {
      throw new Error('Image Guess requires at least 1 player');
    }

    const normalized = readSettings(settings);
    const enginePlayers: ImageGuessState['players'] = players.map((player) => ({
      userId: player.id,
      username: player.username,
      avatarUrl: player.avatarUrl
    }));

    return {
      game: 'image_guess',
      rounds: normalized.rounds,
      currentRound: 1,
      imageCount: normalized.imageCount,
      items: createItems(normalized.imageCount),
      players: enginePlayers,
      score: Object.fromEntries(enginePlayers.map((player) => [player.userId, 0])),
      currentTurnUserId: enginePlayers[0]?.userId ?? null,
      status: 'playing',
      matchWinnerUserId: null
    };
  }

  validateAction(state: unknown, action: GameAction, playerId: string): boolean {
    try {
      validateSelectAction(readState(state), action, playerId);
      return true;
    } catch {
      return false;
    }
  }

  applyAction(state: unknown, action: GameAction, playerId: string): ImageGuessState {
    const currentState = readState(state);
    const payload = validateSelectAction(currentState, action, playerId);
    const score = { ...currentState.score, [playerId]: (currentState.score[playerId] ?? 0) + 1 };
    const items = currentState.items.map((item) =>
      item.id === payload.itemId ? { ...item, revealed: true, selectedByUserId: playerId } : item
    );
    const allRevealed = items.every((item) => item.revealed);

    if (!allRevealed) {
      return {
        ...currentState,
        items,
        score,
        currentTurnUserId: nextPlayerId(currentState, playerId)
      };
    }

    if (currentState.currentRound < currentState.rounds) {
      const nextRound = currentState.currentRound + 1;
      return {
        ...currentState,
        currentRound: nextRound,
        items: createItems(currentState.imageCount),
        score,
        currentTurnUserId: currentState.players[(nextRound - 1) % currentState.players.length]?.userId ?? null
      };
    }

    return {
      ...currentState,
      items,
      score,
      currentTurnUserId: null,
      status: 'finished',
      matchWinnerUserId: findMatchWinnerUserId(score)
    };
  }

  getTurn(state: unknown): string | null {
    return readState(state).currentTurnUserId;
  }

  isRoundFinished(state: unknown): boolean {
    return readState(state).items.every((item) => item.revealed);
  }

  isMatchFinished(state: unknown): boolean {
    return readState(state).status === 'finished';
  }

  getWinner(state: unknown): string | null {
    return readState(state).matchWinnerUserId;
  }
}

function readSettings(raw: unknown): { rounds: number; imageCount: 8 | 18 | 28 } {
  const settings = raw && typeof raw === 'object' ? (raw as ImageGuessSettingsInput) : {};
  const rounds = typeof settings.rounds === 'number' && Number.isInteger(settings.rounds) ? settings.rounds : 1;
  const imageCount = typeof settings.imageCount === 'number' && Number.isInteger(settings.imageCount) ? settings.imageCount : 18;

  if (rounds < 1 || rounds > 10) {
    throw new Error('rounds must be between 1 and 10');
  }

  if (!ALLOWED_IMAGE_COUNTS.includes(imageCount as ImageGuessState['imageCount'])) {
    throw new Error('imageCount must be one of 8, 18, or 28');
  }

  return { rounds, imageCount: imageCount as ImageGuessState['imageCount'] };
}

function readState(state: unknown): ImageGuessState {
  if (!isImageGuessState(state)) {
    throw new Error('Invalid Image Guess state');
  }

  return state;
}

function isImageGuessState(state: unknown): state is ImageGuessState {
  return (
    Boolean(state) &&
    typeof state === 'object' &&
    (state as ImageGuessState).game === 'image_guess' &&
    Array.isArray((state as ImageGuessState).players) &&
    Array.isArray((state as ImageGuessState).items)
  );
}

function validateSelectAction(state: ImageGuessState, action: GameAction, playerId: string): SelectPayload {
  if (action.type !== 'image_guess:select') {
    throw new Error('Unsupported Image Guess action');
  }

  if (state.status !== 'playing') {
    throw new Error('This match is already finished');
  }

  if (!state.players.some((player) => player.userId === playerId)) {
    throw new Error('You are not a player in this match');
  }

  if (state.currentTurnUserId !== playerId) {
    throw new Error('It is not your turn');
  }

  const payload = action.payload;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Selection payload is required');
  }

  const itemId = (payload as SelectPayload).itemId;
  if (typeof itemId !== 'string' || itemId.length === 0) {
    throw new Error('itemId is required');
  }

  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new Error('Item does not exist');
  }

  if (item.revealed || item.selectedByUserId) {
    throw new Error('Item is already revealed');
  }

  return { itemId };
}

function createItems(imageCount: ImageGuessState['imageCount']): ImageGuessState['items'] {
  return Array.from({ length: imageCount }, (_, index) => ({
    id: `item-${index + 1}`,
    imageKey: `image-${index + 1}`,
    revealed: false,
    selectedByUserId: null
  }));
}

function nextPlayerId(state: ImageGuessState, currentUserId: string): string {
  const currentIndex = state.players.findIndex((player) => player.userId === currentUserId);
  return state.players[(currentIndex + 1) % state.players.length]?.userId ?? state.players[0]?.userId ?? currentUserId;
}

function findMatchWinnerUserId(score: Record<string, number>): string | null {
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return null;
  }

  return sorted[0]![1] > (sorted[1]?.[1] ?? -1) ? sorted[0]![0] : null;
}
