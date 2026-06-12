import type { GameEngine } from './engine/game-engine.base.js';
import { ChessEngine } from './engine/chess/chess.engine.js';
import { ImageGuessEngine } from './engine/image-guess/image-guess.engine.js';
import { TicTacToeEngine } from './engine/tic-tac-toe/tic-tac-toe.engine.js';

const engines = new Map<string, GameEngine>([
  ['tic_tac_toe', new TicTacToeEngine()],
  ['image_guess', new ImageGuessEngine()],
  ['chess', new ChessEngine()]
]);

export function getGameEngine(gameSlug: string): GameEngine | undefined {
  return engines.get(gameSlug);
}

export function requireGameEngine(gameSlug: string): GameEngine {
  const engine = getGameEngine(gameSlug);
  if (!engine) {
    throw new Error(`No game engine registered for ${gameSlug}`);
  }

  return engine;
}
