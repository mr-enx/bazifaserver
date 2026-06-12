import type { ChessColor, ChessPiece, ChessPieceType, ChessSquare, ChessState } from '@game-platform/shared';
import type { GameAction, GameEngine, PlayerInfo } from '../game-engine.base.js';
import { PLAYER_TURN_SECONDS } from './game-settings.js';

type ChessMovePayload = {
  from: ChessSquare;
  to: ChessSquare;
};

export class ChessEngine implements GameEngine {
  createInitialState(_settings: unknown, players: PlayerInfo[]): ChessState {
    if (players.length !== 2) {
      throw new Error('Chess requires exactly 2 players');
    }

    const whitePlayer = players[0]!;
    const blackPlayer = players[1]!;
    const enginePlayers: ChessState['players'] = [
      {
        userId: whitePlayer.id,
        username: whitePlayer.username,
        avatarUrl: whitePlayer.avatarUrl ?? null,
        color: 'white'
      },
      {
        userId: blackPlayer.id,
        username: blackPlayer.username,
        avatarUrl: blackPlayer.avatarUrl ?? null,
        color: 'black'
      }
    ];

    return {
      game: 'chess',
      board: createInitialBoard(),
      players: enginePlayers,
      turn: 'white',
      currentTurnUserId: whitePlayer.id,
      turnStartedAt: new Date().toISOString(),
      turnDurationSeconds: PLAYER_TURN_SECONDS,
      status: 'playing',
      checkedColor: null,
      matchWinnerUserId: null,
      score: Object.fromEntries(enginePlayers.map((p) => [p.userId, 0])),
      lastMove: null,
      endedBy: null
    };
  }

  validateAction(state: unknown, action: GameAction, playerId: string): boolean {
    try {
      const chessState = readState(state);
      if (action.type === 'chess:move') {
        validateMoveAction(chessState, action, playerId);
        return true;
      }
      if (action.type === 'chess:resign') {
        validateResignAction(chessState, playerId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  applyAction(state: unknown, action: GameAction, playerId: string): unknown {
    const s = readState(state);

    if (action.type === 'chess:move') {
      const payload = validateMoveAction(s, action, playerId);
      return applyMove(s, playerId, payload);
    }

    if (action.type === 'chess:resign') {
      validateResignAction(s, playerId);
      const winnerUserId = s.players.find((p) => p.userId !== playerId)?.userId ?? null;
      return finishMatch(s, winnerUserId, 'resign', null);
    }

    throw new Error(`Unsupported Chess action: ${action.type}`);
  }

  getTurn(state: unknown): string | null {
    return readState(state).currentTurnUserId;
  }

  isRoundFinished(_state: unknown): boolean {
    return false;
  }

  isMatchFinished(state: unknown): boolean {
    return readState(state).status === 'finished';
  }

  getWinner(state: unknown): string | null {
    return readState(state).matchWinnerUserId;
  }
}

function readState(state: unknown): ChessState {
  if (!isChessState(state)) {
    throw new Error('Invalid Chess state');
  }
  return state;
}

function isChessState(v: unknown): v is ChessState {
  return (
    Boolean(v) &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    (v as any).game === 'chess' &&
    Array.isArray((v as any).players) &&
    Array.isArray((v as any).board)
  );
}

function validateResignAction(state: ChessState, playerId: string): void {
  if (state.status !== 'playing') {
    throw new Error('This match is already finished');
  }
  if (!state.players.some((p) => p.userId === playerId)) {
    throw new Error('You are not a player in this match');
  }
}

function validateMoveAction(state: ChessState, action: GameAction, playerId: string): ChessMovePayload {
  if (action.type !== 'chess:move') {
    throw new Error('Unsupported Chess action');
  }

  if (state.status !== 'playing') {
    throw new Error('This match is already finished');
  }

  if (!state.players.some((p) => p.userId === playerId)) {
    throw new Error('You are not a player in this match');
  }

  if (state.currentTurnUserId !== playerId) {
    throw new Error('It is not your turn');
  }

  const p = action.payload;
  if (!p || typeof p !== 'object') {
    throw new Error('Move payload is required');
  }

  const from = (p as ChessMovePayload).from;
  const to = (p as ChessMovePayload).to;
  if (!isSquare(from) || !isSquare(to)) {
    throw new Error('from/to is invalid');
  }
  if (!isOnBoard(from) || !isOnBoard(to)) {
    throw new Error('Move is outside the board');
  }

  const moverColor = requirePlayerColor(state, playerId);
  const piece = state.board[from.row]?.[from.col] ?? null;
  if (!piece || piece.color !== moverColor) {
    throw new Error('You must move your own piece');
  }

  if (!isLegalMove(state.board, moverColor, from, to)) {
    throw new Error('Illegal move');
  }

  return { from, to };
}

function applyMove(state: ChessState, playerId: string, payload: ChessMovePayload): ChessState {
  const moverColor = requirePlayerColor(state, playerId);
  const piece = state.board[payload.from.row]![payload.from.col]!;
  const captured = state.board[payload.to.row]![payload.to.col] ?? null;
  const { board: nextBoard, promotion } = makeMove(state.board, payload.from, payload.to);
  const nextTurn = oppositeColor(moverColor);

  const checkedColor = isInCheck(nextBoard, nextTurn) ? nextTurn : null;
  const hasMoves = hasAnyLegalMoves(nextBoard, nextTurn);

  const lastMove: ChessState['lastMove'] = {
    from: payload.from,
    to: payload.to,
    piece,
    captured,
    promotion
  };

  if (!hasMoves) {
    if (checkedColor) {
      return finishMatch(
        {
          ...state,
          board: nextBoard,
          lastMove
        },
        playerId,
        'checkmate',
        checkedColor
      );
    }

    return finishMatch(
      {
        ...state,
        board: nextBoard,
        lastMove
      },
      null,
      'stalemate',
      null
    );
  }

  return {
    ...state,
    board: nextBoard,
    turn: nextTurn,
    currentTurnUserId: state.players.find((p) => p.color === nextTurn)?.userId ?? null,
    turnStartedAt: new Date().toISOString(),
    turnDurationSeconds: PLAYER_TURN_SECONDS,
    checkedColor,
    lastMove,
    endedBy: null
  };
}

function finishMatch(
  state: ChessState,
  winnerUserId: string | null,
  endedBy: ChessState['endedBy'],
  checkedColor: ChessColor | null
): ChessState {
  const score: Record<string, number> = { ...state.score };

  for (const player of state.players) {
    score[player.userId] = 0;
  }

  if (winnerUserId) {
    score[winnerUserId] = 1;
  }

  return {
    ...state,
    status: 'finished',
    turn: state.turn,
    currentTurnUserId: null,
    turnStartedAt: null,
    turnDurationSeconds: PLAYER_TURN_SECONDS,
    checkedColor,
    matchWinnerUserId: winnerUserId,
    score,
    endedBy
  };
}

function requirePlayerColor(state: ChessState, userId: string): ChessColor {
  const player = state.players.find((p) => p.userId === userId);
  if (!player) {
    throw new Error('Player not found in match');
  }
  return player.color;
}

function isSquare(value: unknown): value is ChessSquare {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && 'row' in value && 'col' in value;
}

function isOnBoard(square: ChessSquare): boolean {
  return Number.isInteger(square.row) && Number.isInteger(square.col) && square.row >= 0 && square.row < 8 && square.col >= 0 && square.col < 8;
}

function oppositeColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function createInitialBoard(): ChessState['board'] {
  const empty = Array.from({ length: 8 }, () => Array<ChessPiece | null>(8).fill(null));

  const backRank: ChessPieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < 8; col += 1) {
    empty[0]![col] = { type: backRank[col]!, color: 'black' };
    empty[1]![col] = { type: 'pawn', color: 'black' };
    empty[6]![col] = { type: 'pawn', color: 'white' };
    empty[7]![col] = { type: backRank[col]!, color: 'white' };
  }

  return empty;
}

function cloneBoard(board: ChessState['board']): ChessState['board'] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function makeMove(
  board: ChessState['board'],
  from: ChessSquare,
  to: ChessSquare
): { board: ChessState['board']; promotion: ChessPieceType | null } {
  const next = cloneBoard(board);
  const piece = next[from.row]![from.col];
  if (!piece) {
    return { board: next, promotion: null };
  }

  next[from.row]![from.col] = null;

  let promotion: ChessPieceType | null = null;
  if (piece.type === 'pawn') {
    const lastRank = piece.color === 'white' ? 0 : 7;
    if (to.row === lastRank) {
      promotion = 'queen';
      next[to.row]![to.col] = { type: 'queen', color: piece.color };
      return { board: next, promotion };
    }
  }

  next[to.row]![to.col] = piece;
  return { board: next, promotion };
}

function isLegalMove(board: ChessState['board'], moverColor: ChessColor, from: ChessSquare, to: ChessSquare): boolean {
  const piece = board[from.row]?.[from.col] ?? null;
  if (!piece || piece.color !== moverColor) {
    return false;
  }

  const dest = board[to.row]?.[to.col] ?? null;
  if (dest && dest.color === moverColor) {
    return false;
  }

  const pseudoTargets = pseudoLegalTargets(board, from, piece);
  if (!pseudoTargets.some((t) => t.row === to.row && t.col === to.col)) {
    return false;
  }

  const { board: nextBoard } = makeMove(board, from, to);
  return !isInCheck(nextBoard, moverColor);
}

function pseudoLegalTargets(board: ChessState['board'], from: ChessSquare, piece: ChessPiece): ChessSquare[] {
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
  const dir = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  const targets: ChessSquare[] = [];

  const oneStep: ChessSquare = { row: from.row + dir, col: from.col };
  if (isOnBoard(oneStep) && !board[oneStep.row]![oneStep.col]) {
    targets.push(oneStep);
    const twoStep: ChessSquare = { row: from.row + dir * 2, col: from.col };
    if (from.row === startRow && isOnBoard(twoStep) && !board[twoStep.row]![twoStep.col]) {
      targets.push(twoStep);
    }
  }

  for (const dc of [-1, 1]) {
    const cap: ChessSquare = { row: from.row + dir, col: from.col + dc };
    if (!isOnBoard(cap)) continue;
    const piece = board[cap.row]![cap.col];
    if (piece && piece.color !== color) {
      targets.push(cap);
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
  const targets: ChessSquare[] = [];

  for (const [dr, dc] of steps) {
    const t = { row: from.row + dr, col: from.col + dc };
    if (!isOnBoard(t)) continue;
    const dest = board[t.row]![t.col];
    if (!dest || dest.color !== color) {
      targets.push(t);
    }
  }

  return targets;
}

function kingTargets(board: ChessState['board'], from: ChessSquare, color: ChessColor): ChessSquare[] {
  const targets: ChessSquare[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const t = { row: from.row + dr, col: from.col + dc };
      if (!isOnBoard(t)) continue;
      const dest = board[t.row]![t.col];
      if (!dest || dest.color !== color) {
        targets.push(t);
      }
    }
  }
  return targets;
}

function slideTargets(
  board: ChessState['board'],
  from: ChessSquare,
  color: ChessColor,
  dirs: Array<[number, number]>
): ChessSquare[] {
  const targets: ChessSquare[] = [];

  for (const [dr, dc] of dirs) {
    let r = from.row + dr;
    let c = from.col + dc;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const dest = board[r]![c];
      if (!dest) {
        targets.push({ row: r, col: c });
      } else {
        if (dest.color !== color) {
          targets.push({ row: r, col: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return targets;
}

function findKingSquare(board: ChessState['board'], color: ChessColor): ChessSquare | null {
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

function isInCheck(board: ChessState['board'], color: ChessColor): boolean {
  const king = findKingSquare(board, color);
  if (!king) {
    return true;
  }

  return isSquareAttacked(board, king, oppositeColor(color));
}

function isSquareAttacked(board: ChessState['board'], square: ChessSquare, byColor: ChessColor): boolean {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row]![col];
      if (!piece || piece.color !== byColor) continue;

      const from = { row, col };
      if (piece.type === 'pawn') {
        const dir = byColor === 'white' ? -1 : 1;
        for (const dc of [-1, 1]) {
          const t = { row: row + dir, col: col + dc };
          if (t.row === square.row && t.col === square.col) {
            return true;
          }
        }
        continue;
      }

      if (piece.type === 'king') {
        if (Math.abs(square.row - row) <= 1 && Math.abs(square.col - col) <= 1) {
          return true;
        }
        continue;
      }

      const targets = pseudoLegalTargets(board, from, piece);
      if (targets.some((t) => t.row === square.row && t.col === square.col)) {
        return true;
      }
    }
  }

  return false;
}

function hasAnyLegalMoves(board: ChessState['board'], color: ChessColor): boolean {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row]![col];
      if (!piece || piece.color !== color) continue;

      const from = { row, col };
      const targets = pseudoLegalTargets(board, from, piece);
      for (const to of targets) {
        if (isLegalMove(board, color, from, to)) {
          return true;
        }
      }
    }
  }
  return false;
}
