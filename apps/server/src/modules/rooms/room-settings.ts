import { IMAGE_GUESS_IMAGE_COUNT_OPTIONS, type ImageGuessSettings, type RoomSettings, type TicTacToeSettings } from '@game-platform/shared';
import { RoomsError } from './rooms.errors.js';

function readInteger(settings: RoomSettings, key: string, defaultValue: number): number {
  const value = settings[key] === undefined ? defaultValue : settings[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new RoomsError(`${key} must be an integer`, 400);
  }

  return value;
}

function readRounds(settings: RoomSettings, defaultValue: number): number {
  const rounds = readInteger(settings, 'rounds', defaultValue);
  if (rounds < 1 || rounds > 10) {
    throw new RoomsError('rounds must be between 1 and 10', 400);
  }

  return rounds;
}

export function defaultSettingsForGame(slug: string): RoomSettings {
  if (slug === 'tic_tac_toe') {
    return { rounds: 3, boardSize: 3 } satisfies TicTacToeSettings;
  }

  if (slug === 'image_guess') {
    return { rounds: 1, imageCount: 18 } satisfies ImageGuessSettings;
  }

  if (slug === 'chess') {
    return {};
  }

  return {};
}

export function validateSettingsForGame(slug: string, rawSettings: RoomSettings): RoomSettings {
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    throw new RoomsError('settings must be an object', 400);
  }

  if (slug === 'tic_tac_toe') {
    const rounds = readRounds(rawSettings, 3);
    const boardSize = readInteger(rawSettings, 'boardSize', 3);
    if (boardSize !== 3) {
      throw new RoomsError('boardSize must be 3', 400);
    }

    return { rounds, boardSize } satisfies TicTacToeSettings;
  }

  if (slug === 'image_guess') {
    const rounds = readRounds(rawSettings, 1);
    const imageCount = readInteger(rawSettings, 'imageCount', 18);
    if (!IMAGE_GUESS_IMAGE_COUNT_OPTIONS.includes(imageCount as ImageGuessSettings['imageCount'])) {
      throw new RoomsError('imageCount must be one of 8, 18, or 28', 400);
    }

    return { rounds, imageCount: imageCount as ImageGuessSettings['imageCount'] } satisfies ImageGuessSettings;
  }

  if (slug === 'chess') {
    return {};
  }

  throw new RoomsError('Unsupported game settings', 400);
}
