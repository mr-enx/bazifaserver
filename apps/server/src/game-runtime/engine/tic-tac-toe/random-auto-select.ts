import type { TicTacToeState } from '@game-platform/shared';
import type { GameAction } from '../game-engine.base.js';

export function createRandomAutoSelectAction(state: TicTacToeState): GameAction | null {
  const emptyCells: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < (state.board[row]?.length ?? 0); col += 1) {
      if (!state.board[row]?.[col]) {
        emptyCells.push({ row, col });
      }
    }
  }

  const selectedCell = emptyCells[Math.floor(Math.random() * emptyCells.length)] ?? null;
  return selectedCell ? { type: 'tic_tac_toe:place', payload: selectedCell } : null;
}
