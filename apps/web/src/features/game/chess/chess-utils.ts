import type { ChessColor, ChessSquare, ChessState } from '@game-platform/shared';

export function isSameSquare(a: ChessSquare | null, b: ChessSquare | null): boolean {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

export function toKey(square: ChessSquare): string {
  return `${square.row}:${square.col}`;
}

export function getUserColor(state: ChessState, userId: string | null): ChessColor | null {
  if (!userId) return null;
  return state.players.find((p) => p.userId === userId)?.color ?? null;
}

export function transformSquareForView(square: ChessSquare, viewColor: ChessColor): ChessSquare {
  if (viewColor === 'white') {
    return square;
  }

  return {
    row: 7 - square.row,
    col: 7 - square.col
  };
}

export function untransformSquareForView(square: ChessSquare, viewColor: ChessColor): ChessSquare {
  if (viewColor === 'white') {
    return square;
  }

  return {
    row: 7 - square.row,
    col: 7 - square.col
  };
}

export function isOnBoard(square: ChessSquare): boolean {
  return (
    Number.isInteger(square.row) &&
    Number.isInteger(square.col) &&
    square.row >= 0 &&
    square.row < 8 &&
    square.col >= 0 &&
    square.col < 8
  );
}

export function oppositeColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}
