import type { GameMetadata } from '../types/index.js';

export const SUPPORTED_GAMES = [
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: 'image-guess',
    name: 'Image Guess',
    minPlayers: 2,
    maxPlayers: 8
  },
  {
    id: 'chess',
    name: 'Chess',
    minPlayers: 2,
    maxPlayers: 2
  }
] as const satisfies readonly GameMetadata[];
