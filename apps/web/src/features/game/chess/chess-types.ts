import type { ChessPiece, ChessSquare } from '@game-platform/shared';

export type AnimatedMove = {
  key: string;
  piece: ChessPiece;
  from: ChessSquare;
  to: ChessSquare;
};

export const MOVE_ANIMATION_MS = 220;
