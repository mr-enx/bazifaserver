import type { TicTacToeState } from '@game-platform/shared';

export type RandomTicTacToeCell = {
  row: number;
  col: number;
};

export function انتخاب_خودکار_تصادفی(state: TicTacToeState): RandomTicTacToeCell | null {
  const emptyCells: RandomTicTacToeCell[] = [];

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < (state.board[row]?.length ?? 0); col += 1) {
      if (!state.board[row]?.[col]) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) {
    return null;
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)] ?? null;
}
