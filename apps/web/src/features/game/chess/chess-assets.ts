import type { ChessColor, ChessPiece } from '@game-platform/shared';

export const PIECE_SVGS: Record<ChessColor, Record<ChessPiece['type'], string>> = {
  white: {
    king: new URL('../../../assets/chess/white-king.svg', import.meta.url).href,
    queen: new URL('../../../assets/chess/white-queen.svg', import.meta.url).href,
    rook: new URL('../../../assets/chess/white-rook.svg', import.meta.url).href,
    bishop: new URL('../../../assets/chess/white-bishop.svg', import.meta.url).href,
    knight: new URL('../../../assets/chess/white-knight.svg', import.meta.url).href,
    pawn: new URL('../../../assets/chess/white-pawn.svg', import.meta.url).href
  },
  black: {
    king: new URL('../../../assets/chess/black-king.svg', import.meta.url).href,
    queen: new URL('../../../assets/chess/black-queen.svg', import.meta.url).href,
    rook: new URL('../../../assets/chess/black-rook.svg', import.meta.url).href,
    bishop: new URL('../../../assets/chess/black-bishop.svg', import.meta.url).href,
    knight: new URL('../../../assets/chess/black-knight.svg', import.meta.url).href,
    pawn: new URL('../../../assets/chess/black-pawn.svg', import.meta.url).href
  }
};

export const BOARD_BACKGROUND_SVG = new URL('../../../assets/chess/rect-8x8.svg', import.meta.url).href;

export function getPieceAlt(piece: ChessPiece): string {
  return `${piece.color} ${piece.type}`;
}
