import type { ChessColor, ChessPiece, ChessPieceType, ChessSquare, ChessState } from '@game-platform/shared';
import { isOnBoard, isSameSquare, oppositeColor } from './chess-utils';

export function findKingSquare(board: ChessState['board'], color: ChessColor): ChessSquare | null {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row]![col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }

  return null;
}

export function getLegalMovesForPiece(
  board: ChessState['board'],
  color: ChessColor,
  from: ChessSquare
): ChessSquare[] {
  const piece = board[from.row]?.[from.col] ?? null;

  if (!piece || piece.color !== color) {
    return [];
  }

  return pseudoLegalTargets(board, from, piece).filter((to) => isLegalMove(board, color, from, to));
}

export function isLegalMove(
  board: ChessState['board'],
  moverColor: ChessColor,
  from: ChessSquare,
  to: ChessSquare
): boolean {
  const piece = board[from.row]?.[from.col] ?? null;

  if (!piece || piece.color !== moverColor) {
    return false;
  }

  const dest = board[to.row]?.[to.col] ?? null;

  if (dest && dest.color === moverColor) {
    return false;
  }

  const pseudoTargets = pseudoLegalTargets(board, from, piece);

  if (!pseudoTargets.some((target) => isSameSquare(target, to))) {
    return false;
  }

  const nextBoard = makeMove(board, from, to);

  return !isInCheck(nextBoard, moverColor);
}

export function pseudoLegalTargets(board: ChessState['board'], from: ChessSquare, piece: ChessPiece): ChessSquare[] {
  switch (piece.type) {
    case 'pawn':
      return pawnTargets(board, from, piece.color);
    case 'knight':
      return knightTargets(board, from, piece.color);
    case 'bishop':
      return slideTargets(board, from, piece.color, [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]);
    case 'rook':
      return slideTargets(board, from, piece.color, [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]);
    case 'queen':
      return slideTargets(board, from, piece.color, [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]);
    case 'king':
      return kingTargets(board, from, piece.color);
    default:
      return [];
  }
}

function pawnTargets(board: ChessState['board'], from: ChessSquare, color: ChessColor): ChessSquare[] {
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  const targets: ChessSquare[] = [];

  const oneStep = { row: from.row + direction, col: from.col };

  if (isOnBoard(oneStep) && !board[oneStep.row]?.[oneStep.col]) {
    targets.push(oneStep);

    const twoStep = { row: from.row + direction * 2, col: from.col };
    if (from.row === startRow && isOnBoard(twoStep) && !board[twoStep.row]?.[twoStep.col]) {
      targets.push(twoStep);
    }
  }

  for (const colOffset of [-1, 1]) {
    const capture = { row: from.row + direction, col: from.col + colOffset };

    if (!isOnBoard(capture)) {
      continue;
    }

    const piece = board[capture.row]?.[capture.col] ?? null;
    if (piece && piece.color !== color) {
      targets.push(capture);
    }
  }

  return targets;
}

function knightTargets(board: ChessState['board'], from: ChessSquare, color: ChessColor): ChessSquare[] {
  const steps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ] as const;

  return steps
    .map(([rowOffset, colOffset]) => ({
      row: from.row + rowOffset,
      col: from.col + colOffset
    }))
    .filter((target) => isAvailableTarget(board, target, color));
}

function kingTargets(board: ChessState['board'], from: ChessSquare, color: ChessColor): ChessSquare[] {
  const targets: ChessSquare[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const target = {
        row: from.row + rowOffset,
        col: from.col + colOffset
      };

      if (isAvailableTarget(board, target, color)) {
        targets.push(target);
      }
    }
  }

  return targets;
}

function slideTargets(
  board: ChessState['board'],
  from: ChessSquare,
  color: ChessColor,
  directions: Array<[number, number]>
): ChessSquare[] {
  const targets: ChessSquare[] = [];

  for (const [rowDirection, colDirection] of directions) {
    let row = from.row + rowDirection;
    let col = from.col + colDirection;

    while (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const piece = board[row]?.[col] ?? null;

      if (!piece) {
        targets.push({ row, col });
      } else {
        if (piece.color !== color) {
          targets.push({ row, col });
        }
        break;
      }

      row += rowDirection;
      col += colDirection;
    }
  }

  return targets;
}

function isAvailableTarget(board: ChessState['board'], target: ChessSquare, color: ChessColor): boolean {
  if (!isOnBoard(target)) {
    return false;
  }

  const piece = board[target.row]?.[target.col] ?? null;
  return !piece || piece.color !== color;
}

export function isInCheck(board: ChessState['board'], color: ChessColor): boolean {
  const king = findKingSquare(board, color);

  if (!king) {
    return true;
  }

  return isSquareAttacked(board, king, oppositeColor(color));
}

export function isSquareAttacked(board: ChessState['board'], square: ChessSquare, byColor: ChessColor): boolean {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row]?.[col] ?? null;

      if (!piece || piece.color !== byColor) {
        continue;
      }

      if (piece.type === 'pawn') {
        const direction = byColor === 'white' ? -1 : 1;

        if (
          isSameSquare({ row: row + direction, col: col - 1 }, square) ||
          isSameSquare({ row: row + direction, col: col + 1 }, square)
        ) {
          return true;
        }

        continue;
      }

      if (piece.type === 'king') {
        if (Math.abs(square.row - row) <= 1 && Math.abs(square.col - col) <= 1) {
          return true;
        }

        continue;
      }

      if (pseudoLegalTargets(board, { row, col }, piece).some((target) => isSameSquare(target, square))) {
        return true;
      }
    }
  }

  return false;
}

export function makeMove(board: ChessState['board'], from: ChessSquare, to: ChessSquare): ChessState['board'] {
  const next = board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  const piece = next[from.row]?.[from.col] ?? null;

  if (!piece) {
    return next;
  }

  next[from.row]![from.col] = null;
  next[to.row]![to.col] = promoteIfNeeded(piece, to);

  return next;
}

function promoteIfNeeded(piece: ChessPiece, to: ChessSquare): ChessPiece {
  if (piece.type !== 'pawn') {
    return piece;
  }

  const lastRank = piece.color === 'white' ? 0 : 7;

  if (to.row !== lastRank) {
    return piece;
  }

  return {
    type: 'queen' satisfies ChessPieceType,
    color: piece.color
  };
}
