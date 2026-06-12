import type {
  TicTacToeCell,
  TicTacToeState,
  TicTacToeSymbol,
  TicTacToeRoundResult,
} from '@game-platform/shared';
import type { GameAction, GameEngine, PlayerInfo } from '../game-engine.base.js';
import { PLAYER_TURN_SECONDS } from './game-settings.js';

type TicTacToeSettingsInput = {
  rounds?: unknown;
  boardSize?: unknown;
};

type PlacePayload = {
  row: number;
  col: number;
};

const BOARD_SIZE = 3;
const SYMBOLS: [TicTacToeSymbol, TicTacToeSymbol] = ['X', 'O'];
const ROUND_TRANSITION_DELAY_MS = 3000;

// ─── Public Engine ───────────────────────────────────────────────────────────

export class TicTacToeEngine implements GameEngine {
  // ── createInitialState ────────────────────────────────────────────────────

  createInitialState(settings: unknown, players: PlayerInfo[]): TicTacToeState {
    if (players.length !== 2) {
      throw new Error('Tic Tac Toe requires exactly 2 players');
    }

    const normalized = readSettings(settings);
    const enginePlayers: TicTacToeState['players'] = players.map((p, i) => ({
      userId: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl ?? '',
      symbol: SYMBOLS[i]!,
    }));

    return {
      game: 'tic_tac_toe',
      rounds: normalized.rounds,
      currentRound: 1,
      boardSize: BOARD_SIZE,
      board: createEmptyBoard(),
      players: enginePlayers,
      currentTurnUserId: enginePlayers[0]!.userId,
      turnStartedAt: new Date().toISOString(),
      turnDurationSeconds: PLAYER_TURN_SECONDS,
      score: Object.fromEntries(enginePlayers.map((p) => [p.userId, 0])),
      roundWinnerUserId: null,
      matchWinnerUserId: null,
      status: 'playing',
      lastMove: null,
      lastRoundResult: null,
      roundTransitionAt: null,
      matchTransitionAt: null,
    };
  }

  // ── validateAction ────────────────────────────────────────────────────────

  validateAction(state: unknown, action: GameAction, _playerId: string): boolean {
    try {
      const ticTacToeState = readState(state);
      validatePlaceAction(ticTacToeState, action, _playerId);
      return true;
    } catch {
      return false;
    }
  }

  // ── applyAction ───────────────────────────────────────────────────────────

  applyAction(state: unknown, action: GameAction, playerId: string): unknown {
    const s: TicTacToeState = readState(state);

    if (action.type !== 'tic_tac_toe:place') {
      throw new Error(`Unsupported Tic Tac Toe action: ${action.type}`);
    }

    return this.placePiece(s, action, playerId) as unknown;
  }

  // ── delegated helpers ─────────────────────────────────────────────────────

  getTurn(state: unknown): string | null {
    const s = readState(state);
    return s.currentTurnUserId;
  }

  isRoundFinished(state: unknown): boolean {
    const s = readState(state);
    return s.lastRoundResult !== null;
  }

  isMatchFinished(state: unknown): boolean {
    const s = readState(state);
    return s.status === 'finished';
  }

  getWinner(state: unknown): string | null {
    const s = readState(state);

    if (s.status === 'finished') {
      return s.matchWinnerUserId;
    }

    return findMatchWinnerUserId(s.score);
  }

  /**
   * Called by GameRuntimeService after the 3 seconds delay for non-final rounds.
   * It clears the board and moves the game to the next round.
   */
  advanceRound(state: unknown): TicTacToeState {
    const s = readState(state);

    if (s.status !== 'playing') {
      return s;
    }

    if (!s.lastRoundResult) {
      return s;
    }

    if (!s.roundTransitionAt) {
      return s;
    }

    const nextRound = s.currentRound + 1;
    const nextStarter = s.players[(nextRound - 1) % s.players.length]!;

    return {
      ...s,
      currentRound: nextRound,
      board: createEmptyBoard(),
      currentTurnUserId: nextStarter.userId,
      turnStartedAt: new Date().toISOString(),
      turnDurationSeconds: PLAYER_TURN_SECONDS,
      roundWinnerUserId: null,
      lastMove: null,
      lastRoundResult: null,
      roundTransitionAt: null,
      matchTransitionAt: null,
    };
  }

  /**
   * Called by GameRuntimeService after the 3 seconds delay for the final round.
   * It marks the match as finished so the room can return to lobby.
   */
  finishMatch(state: unknown): TicTacToeState {
    const s = readState(state);

    if (s.status === 'finished') {
      return s;
    }

    if (!s.matchTransitionAt) {
      return s;
    }

    return {
      ...s,
      status: 'finished',
      currentTurnUserId: null,
      turnStartedAt: null,
      turnDurationSeconds: PLAYER_TURN_SECONDS,
      matchWinnerUserId: findMatchWinnerUserId(s.score),
      roundTransitionAt: null,
      matchTransitionAt: null,
    };
  }

  // ── internal: placePiece ──────────────────────────────────────────────────

  private placePiece(state: TicTacToeState, action: GameAction, playerId: string): TicTacToeState {
    const payload = validatePlaceAction(state, action, playerId) as PlacePayload;
    const player = state.players.find((p) => p.userId === playerId);

    if (!player) {
      throw new Error('Player not found in match');
    }

    const board = cloneBoard(state.board);
    board[payload.row]![payload.col] = player.symbol;

    const roundWinnerUserId = findWinnerUserId(board, state.players);
    const isDraw = !roundWinnerUserId && board.every((row) => row.every(Boolean));
    const score = { ...state.score };

    if (roundWinnerUserId) {
      score[roundWinnerUserId] = (score[roundWinnerUserId] ?? 0) + 1;
    }

    const lastMove: TicTacToeState['lastMove'] = {
      row: payload.row,
      col: payload.col,
      userId: playerId,
      symbol: player.symbol,
      round: state.currentRound,
    };

    if (!roundWinnerUserId && !isDraw) {
      return {
        ...state,
        board,
        currentTurnUserId: nextPlayerId(state, playerId),
        turnStartedAt: new Date().toISOString(),
        turnDurationSeconds: PLAYER_TURN_SECONDS,
        roundWinnerUserId: null,
        lastMove,
        lastRoundResult: null,
        roundTransitionAt: null,
        matchTransitionAt: null,
      };
    }

    const isFinalRound = state.currentRound >= state.rounds;
    const lastRoundResult = buildRoundResult(state.currentRound, roundWinnerUserId, isDraw);

    if (isFinalRound) {
      return {
        ...state,
        board,
        currentTurnUserId: null,
        turnStartedAt: null,
        turnDurationSeconds: PLAYER_TURN_SECONDS,
        score,
        roundWinnerUserId,
        matchWinnerUserId: findMatchWinnerUserId(score),
        status: 'playing',
        lastMove,
        lastRoundResult,
        roundTransitionAt: null,
        matchTransitionAt: new Date(Date.now() + ROUND_TRANSITION_DELAY_MS).toISOString(),
      };
    }

    return {
      ...state,
      board,
      currentTurnUserId: null,
      turnStartedAt: null,
      turnDurationSeconds: PLAYER_TURN_SECONDS,
      score,
      roundWinnerUserId,
      lastMove,
      lastRoundResult,
      roundTransitionAt: new Date(Date.now() + ROUND_TRANSITION_DELAY_MS).toISOString(),
      matchTransitionAt: null,
    };
  }
}

// ─── Settings / State readers ────────────────────────────────────────────────

function readSettings(raw: unknown): { rounds: number; boardSize: 3 } {
  const obj = (raw && typeof raw === 'object') ? (raw as TicTacToeSettingsInput) : {};
  const rounds =
    typeof obj.rounds === 'number' && Number.isInteger(obj.rounds) ? obj.rounds : 3;
  const boardSize = typeof obj.boardSize === 'number' ? obj.boardSize : BOARD_SIZE;

  if (rounds < 1 || rounds > 10) {
    throw new Error('rounds must be between 1 and 10');
  }
  if (boardSize !== BOARD_SIZE) {
    throw new Error('boardSize must be 3');
  }

  return { rounds, boardSize: BOARD_SIZE };
}

function readState(state: unknown): TicTacToeState {
  if (!isTicTacToeState(state)) {
    throw new Error('Invalid Tic Tac Toe state');
  }
  return state;
}

function isTicTacToeState(v: unknown): v is TicTacToeState {
  return (
    Boolean(v) &&
    typeof v === 'object' &&
    (v as any).game === 'tic_tac_toe' &&
    Array.isArray((v as any).players) &&
    Array.isArray((v as any).board)
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validatePlaceAction(
  state: TicTacToeState,
  action: GameAction,
  playerId: string,
): PlacePayload {
  if (action.type !== 'tic_tac_toe:place') {
    throw new Error('Unsupported Tic Tac Toe action');
  }

  if (state.status !== 'playing') {
    throw new Error('This match is already finished');
  }

  if (state.roundTransitionAt) {
    throw new Error('Waiting for next round');
  }

  if (state.matchTransitionAt) {
    throw new Error('Waiting for match to finish');
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

  const row = (p as PlacePayload).row;
  const col = (p as PlacePayload).col;
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    throw new Error('row and col must be integers');
  }
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    throw new Error('Move is outside the board');
  }
  if (state.board[row]![col]) {
    throw new Error('Cell is already occupied');
  }

  return { row, col };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyBoard(): TicTacToeCell[][] {
  return Array.from(
    { length: BOARD_SIZE },
    () => Array<TicTacToeCell>(BOARD_SIZE).fill(null),
  );
}

function cloneBoard(board: TicTacToeCell[][]): TicTacToeCell[][] {
  return board.map((r) => [...r]);
}

function nextPlayerId(state: TicTacToeState, id: string): string {
  const idx = state.players.findIndex((p) => p.userId === id);
  return state.players[(idx + 1) % state.players.length]!.userId;
}

function findWinnerUserId(
  board: TicTacToeCell[][],
  players: TicTacToeState['players'],
): string | null {
  const lines: TicTacToeCell[][] = [
    ...board,
    ...[0, 1, 2].map((c) => [board[0]![c], board[1]![c], board[2]![c]]),
    [board[0]![0], board[1]![1], board[2]![2]],
    [board[0]![2], board[1]![1], board[2]![0]],
  ];

  const sym = lines.find((l) => l[0] && l.every((c) => c === l[0]))?.[0];
  return sym ? (players.find((p) => p.symbol === sym)?.userId ?? null) : null;
}

function findMatchWinnerUserId(score: Record<string, number>): string | null {
  const entries = Object.entries(score);
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return sorted[0]![1] > (sorted[1]?.[1] ?? -1) ? sorted[0]![0] : null;
}

function buildRoundResult(
  round: number,
  winnerUserId: string | null,
  isDraw: boolean,
): TicTacToeRoundResult {
  return { round, winnerUserId, isDraw };
}
