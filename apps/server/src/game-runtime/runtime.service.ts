import type {
  AuthUser,
  ChessState,
  GameActionPayload,
  GameFinishedResult,
  RoomDetails,
  RoomSettings,
  TicTacToeState
} from '@game-platform/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { gameMatches, games, rooms, type GamePointRules, type MatchState } from '../db/schema.js';
import { GamesRepository } from '../modules/games/games.repository.js';
import { validateSettingsForGame } from '../modules/rooms/room-settings.js';
import { RoomsError } from '../modules/rooms/rooms.errors.js';
import { RoomsRepository } from '../modules/rooms/rooms.repository.js';
import { createRandomAutoSelectAction as createRandomChessAction } from './engine/chess/random-auto-select.js';
import type { GameAction, PlayerInfo } from './engine/game-engine.base.js';
import { createRandomAutoSelectAction as createRandomTicTacToeAction } from './engine/tic-tac-toe/random-auto-select.js';
import { requireGameEngine } from './game-registry.js';

export class GameRuntimeError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
  }
}

export type ActiveMatch = {
  matchId: string;
  roomId: string;
  gameId: string;
  gameSlug: string;
  gameName: string;
  pointRules: GamePointRules;
  players: PlayerInfo[];
  state: unknown;
  settings: RoomSettings;
};

export type ActiveMatchUpdate = ActiveMatch & {
  resultSummary: GameFinishedResult | null;
};

export type StartGameResult = ActiveMatch & {
  roomState: RoomDetails;
};

type MatchStateListener = (match: ActiveMatchUpdate) => void | Promise<void>;

type TicTacToeTransitionEngine = {
  advanceRound: (state: unknown) => unknown;
  finishMatch: (state: unknown) => unknown;
  isMatchFinished: (state: unknown) => boolean;
  getWinner: (state: unknown) => string | null;
};

function toMatchState(state: unknown): MatchState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { value: state };
  }

  return state as MatchState;
}

export class GameRuntimeService {
  private readonly activeMatches = new Map<string, ActiveMatch>();
  private readonly roundTransitionTimers = new Map<string, NodeJS.Timeout>();
  private readonly turnTimers = new Map<string, NodeJS.Timeout>();
  private matchStateListener: MatchStateListener | null = null;

  constructor(
    private readonly roomsRepository = new RoomsRepository(),
    private readonly gamesRepository = new GamesRepository()
  ) {}

  setMatchStateListener(listener: MatchStateListener): void {
    this.matchStateListener = listener;
  }

  getActiveMatch(matchId: string): ActiveMatch | undefined {
    return this.activeMatches.get(matchId);
  }

  async startGame(roomId: string, user: AuthUser): Promise<StartGameResult> {
    const roomCore = await this.roomsRepository.findRoomCoreById(roomId);
    if (!roomCore) {
      throw new RoomsError('اتاق پیدا نشد', 404);
    }

    if (roomCore.ownerUserId !== user.id) {
      throw new RoomsError('Only the room owner can start the game', 403);
    }

    if (roomCore.status !== 'waiting') {
      throw new RoomsError('Game can only be started from a waiting room', 409);
    }

    const playerRows = await this.roomsRepository.listPlayers(roomId);
    if (playerRows.length < roomCore.minPlayers) {
      throw new RoomsError(`At least ${roomCore.minPlayers} players are required`, 409);
    }

    if (playerRows.length > roomCore.maxPlayers) {
      throw new RoomsError(`No more than ${roomCore.maxPlayers} players are allowed`, 409);
    }

    if (!playerRows.every((player) => player.isReady)) {
      throw new RoomsError('All players must be ready before starting', 409);
    }

    const settings = validateSettingsForGame(roomCore.game.slug, roomCore.settings);
    const engine = requireGameEngine(roomCore.game.slug);
    const players = playerRows.map<PlayerInfo>((player) => ({
      id: player.userId,
      username: player.username,
      avatarUrl: player.avatarUrl,
      seatIndex: player.seatIndex
    }));
    const initialState = engine.createInitialState(settings, players);

    const createdMatch = await db.transaction(async (tx) => {
      const [updatedRoom] = await tx
        .update(rooms)
        .set({ status: 'in_game', updatedAt: new Date() })
        .where(and(eq(rooms.id, roomId), eq(rooms.status, 'waiting')))
        .returning({ id: rooms.id });

      if (!updatedRoom) {
        throw new RoomsError('Game can only be started from a waiting room', 409);
      }

      const [match] = await tx
        .insert(gameMatches)
        .values({
          roomId,
          gameId: roomCore.gameId,
          status: 'active',
          matchState: toMatchState(initialState)
        })
        .returning();

      if (!match) {
        throw new Error('Failed to create game match');
      }

      return match;
    });

    const activeMatch: ActiveMatch = {
      matchId: createdMatch.id,
      roomId,
      gameId: roomCore.gameId,
      gameSlug: roomCore.game.slug,
      gameName: roomCore.game.name,
      pointRules: roomCore.game.pointRules,
      players,
      state: initialState,
      settings
    };

    this.activeMatches.set(createdMatch.id, activeMatch);
    this.scheduleTurnTimer(activeMatch);

    return {
      ...activeMatch,
      roomState: await this.loadRoomState(roomId)
    };
  }

  async applyAction(actionPayload: GameActionPayload, user: AuthUser): Promise<ActiveMatchUpdate> {
    const activeMatch = await this.loadActiveMatch(actionPayload.roomId, actionPayload.matchId);
    if (!activeMatch.players.some((player) => player.id === user.id)) {
      throw new GameRuntimeError('You are not a player in this match', 403);
    }

    const action: GameAction = { type: actionPayload.type, payload: actionPayload.payload };
    return this.applyGameAction(activeMatch, action, user.id);
  }

  private async applyGameAction(activeMatch: ActiveMatch, action: GameAction, userId: string): Promise<ActiveMatchUpdate> {
    const engine = requireGameEngine(activeMatch.gameSlug);
    let nextState: unknown;
    try {
      nextState = engine.applyAction(activeMatch.state, action, userId);
    } catch (error) {
      throw new GameRuntimeError(error instanceof Error ? error.message : 'Invalid game action', 400);
    }

    const isFinished = engine.isMatchFinished(nextState);
    const winnerUserId = engine.getWinner(nextState);
    const finishedAt = isFinished ? new Date() : null;
    const resultSummary = isFinished ? createPointResultSummary(activeMatch, nextState, winnerUserId) : null;

    await db.transaction(async (tx) => {
      await tx
        .update(gameMatches)
        .set({
          matchState: toMatchState(nextState),
          ...(isFinished
            ? {
                status: 'finished' as const
              }
            : {})
        })
        .where(eq(gameMatches.id, activeMatch.matchId));

      if (isFinished) {
        await tx
          .update(rooms)
          .set({ status: 'waiting', updatedAt: new Date() })
          .where(eq(rooms.id, activeMatch.roomId));
      }
    });

    if (isFinished && finishedAt) {
      await this.persistRecentResults({
        match: activeMatch,
        state: nextState,
        winnerUserId
      });
    }

    const updatedMatch: ActiveMatch = {
      ...activeMatch,
      state: nextState
    };

    if (isFinished) {
      this.activeMatches.delete(activeMatch.matchId);
      this.clearRoundTransitionTimer(activeMatch.matchId);
      this.clearTurnTimer(activeMatch.matchId);
    } else {
      this.activeMatches.set(activeMatch.matchId, updatedMatch);
      this.scheduleTicTacToeTransition(updatedMatch);
      this.scheduleTurnTimer(updatedMatch);
    }

    return { ...updatedMatch, resultSummary };
  }

  async leaveActiveGame(
    roomId: string,
    matchId: string,
    userId: string,
    options: { requireBalance?: boolean } = {}
  ): Promise<ActiveMatchUpdate | null> {
    const activeMatch = await this.loadActiveMatch(roomId, matchId);
    const requireBalance = options.requireBalance ?? true;

    if (!activeMatch.players.some((player) => player.id === userId)) {
      throw new GameRuntimeError('You are not a player in this match', 403);
    }

    const balance = await this.gamesRepository.getUserGameBalance(userId, activeMatch.gameId);
    if (requireBalance && (balance.xp < 10 || balance.score < 100)) {
      throw new GameRuntimeError('متاسفانه شما امتیاز ندارید که خارج شوید', 409);
    }

    const nextState = markPlayerLeft(activeMatch.state, userId);
    const remainingPlayers = activeMatch.players.filter((player) => player.id !== userId);
    const shouldFinish = remainingPlayers.length <= 1;
    const winnerUserId = shouldFinish ? (remainingPlayers[0]?.id ?? null) : readWinnerUserId(nextState);
    const resultSummary = shouldFinish
      ? createPointResultSummary(activeMatch, nextState, winnerUserId, {
          excludedAwardUserIds: new Set([userId]),
          scoreOverridesByUserId: new Map([[userId, -10]])
        })
      : createLeaveResultSummary(activeMatch.matchId, userId);

    await db.transaction(async (tx) => {
      await tx
        .update(gameMatches)
        .set({
          matchState: toMatchState(nextState),
          ...(shouldFinish
            ? {
                status: 'finished' as const
              }
            : {})
        })
        .where(eq(gameMatches.id, activeMatch.matchId));

      if (shouldFinish) {
        await tx
          .update(rooms)
          .set({ status: 'waiting', updatedAt: new Date() })
          .where(eq(rooms.id, activeMatch.roomId));
      }
    });

    if (shouldFinish) {
      await this.persistRecentResults({
        match: activeMatch,
        state: nextState,
        winnerUserId,
        excludedAwardUserIds: new Set([userId]),
        scoreOverridesByUserId: new Map([[userId, -10]])
      });
    } else if (resultSummary) {
      await this.gamesRepository.createGameResult({
        gameId: activeMatch.gameId,
        dataResults: resultSummary,
        xpAwardsByUserId: new Map()
      });
    }

    await this.gamesRepository.applyGameLeavePenalty(userId, activeMatch.gameId);

    const updatedMatch: ActiveMatch = {
      ...activeMatch,
      players: remainingPlayers,
      state: nextState
    };

    if (shouldFinish) {
      this.activeMatches.delete(activeMatch.matchId);
      this.clearRoundTransitionTimer(activeMatch.matchId);
      this.clearTurnTimer(activeMatch.matchId);
    } else {
      this.activeMatches.set(activeMatch.matchId, updatedMatch);
      this.scheduleTurnTimer(updatedMatch);
    }

    return { ...updatedMatch, resultSummary };
  }

  async cancelActiveGame(roomId: string, matchId: string): Promise<ActiveMatchUpdate> {
    const activeMatch = await this.loadActiveMatch(roomId, matchId);
    const nextState = finishStateWithoutWinner(activeMatch.state);
    const resultSummary = createZeroPointResultSummary(activeMatch.matchId, activeMatch.state);

    await db.transaction(async (tx) => {
      await tx
        .update(gameMatches)
        .set({
          matchState: toMatchState(nextState),
          status: 'finished' as const
        })
        .where(eq(gameMatches.id, activeMatch.matchId));

      await tx
        .update(rooms)
        .set({ status: 'waiting', updatedAt: new Date() })
        .where(eq(rooms.id, activeMatch.roomId));
    });

    this.activeMatches.delete(activeMatch.matchId);
    this.clearRoundTransitionTimer(activeMatch.matchId);
    this.clearTurnTimer(activeMatch.matchId);

    if (resultSummary) {
      await this.gamesRepository.createGameResult({
        gameId: activeMatch.gameId,
        dataResults: resultSummary,
        xpAwardsByUserId: new Map()
      });
    }

    return {
      ...activeMatch,
      state: nextState,
      resultSummary
    };
  }

  private clearRoundTransitionTimer(matchId: string): void {
    const existing = this.roundTransitionTimers.get(matchId);
    if (!existing) {
      return;
    }

    clearTimeout(existing);
    this.roundTransitionTimers.delete(matchId);
  }

  private clearTurnTimer(matchId: string): void {
    const existing = this.turnTimers.get(matchId);
    if (!existing) {
      return;
    }

    clearTimeout(existing);
    this.turnTimers.delete(matchId);
  }

  private scheduleTurnTimer(match: ActiveMatch): void {
    this.clearTurnTimer(match.matchId);

    const turnInfo = readTurnTimerInfo(match.state);
    if (!turnInfo) {
      return;
    }

    const deadlineMs = new Date(turnInfo.turnStartedAt).getTime() + turnInfo.turnDurationSeconds * 1000;
    const delay = Math.max(deadlineMs - Date.now(), 0);

    const timer = setTimeout(async () => {
      this.turnTimers.delete(match.matchId);

      try {
        const currentMatch = await this.loadActiveMatch(match.roomId, match.matchId);
        const currentTurnInfo = readTurnTimerInfo(currentMatch.state);

        if (
          !currentTurnInfo ||
          currentTurnInfo.currentTurnUserId !== turnInfo.currentTurnUserId ||
          currentTurnInfo.turnStartedAt !== turnInfo.turnStartedAt
        ) {
          return;
        }

        const action = createRandomAutoAction(currentMatch.gameSlug, currentMatch.state, currentTurnInfo.currentTurnUserId);
        if (!action) {
          this.clearTurnTimer(currentMatch.matchId);
          return;
        }

        const updatedMatch = await this.applyGameAction(currentMatch, action, currentTurnInfo.currentTurnUserId);
        if (this.matchStateListener) {
          await this.matchStateListener(updatedMatch);
        }
      } catch {
        this.clearTurnTimer(match.matchId);
      }
    }, delay);

    this.turnTimers.set(match.matchId, timer);
  }

  private scheduleTicTacToeTransition(match: ActiveMatch): void {
    this.clearRoundTransitionTimer(match.matchId);

    if (match.gameSlug !== 'tic_tac_toe') {
      return;
    }

    const state = match.state as {
      roundTransitionAt?: string | null;
      matchTransitionAt?: string | null;
    } | null;

    const transitionAt = state?.matchTransitionAt ?? state?.roundTransitionAt;

    if (!transitionAt) {
      return;
    }

    const rawEngine = requireGameEngine(match.gameSlug) as unknown;
    const engine = rawEngine as Partial<TicTacToeTransitionEngine>;

    if (
      typeof engine.advanceRound !== 'function' ||
      typeof engine.finishMatch !== 'function' ||
      typeof engine.isMatchFinished !== 'function' ||
      typeof engine.getWinner !== 'function'
    ) {
      return;
    }

    const delay = Math.max(new Date(transitionAt).getTime() - Date.now(), 0);

    const timer = setTimeout(async () => {
      try {
        const currentMatch = await this.loadActiveMatch(match.roomId, match.matchId);
        const currentState = currentMatch.state as {
          roundTransitionAt?: string | null;
          matchTransitionAt?: string | null;
        } | null;

        if (!currentState) {
          this.clearRoundTransitionTimer(match.matchId);
          return;
        }

        const currentTransitionAt = currentState.matchTransitionAt ?? currentState.roundTransitionAt;
        if (!currentTransitionAt) {
          this.clearRoundTransitionTimer(match.matchId);
          return;
        }

        let nextState = currentMatch.state;

        if (currentState.matchTransitionAt) {
          if (typeof engine.finishMatch !== 'function') {
            throw new Error('Game engine does not implement finishMatch');
          }

          nextState = engine.finishMatch(currentMatch.state);
        } else {
          if (typeof engine.advanceRound !== 'function') {
            throw new Error('Game engine does not implement advanceRound');
          }

          nextState = engine.advanceRound(currentMatch.state);
        }

        const isFinished =
          typeof engine.isMatchFinished === 'function'
            ? engine.isMatchFinished(nextState)
            : Boolean(currentState.matchTransitionAt);

        const winnerUserId =
          typeof engine.getWinner === 'function'
            ? engine.getWinner(nextState)
            : null;
        const finishedAt = isFinished ? new Date() : null;
        const resultSummary = isFinished ? createPointResultSummary(currentMatch, nextState, winnerUserId) : null;

        await db.transaction(async (tx) => {
          await tx
            .update(gameMatches)
            .set({
              matchState: toMatchState(nextState),
              ...(isFinished
                ? {
                    status: 'finished' as const
                  }
                : {})
            })
            .where(eq(gameMatches.id, currentMatch.matchId));

          if (isFinished) {
            await tx
              .update(rooms)
              .set({ status: 'waiting', updatedAt: new Date() })
              .where(eq(rooms.id, currentMatch.roomId));
          }
        });

        if (isFinished && finishedAt) {
          await this.persistRecentResults({
            match: currentMatch,
            state: nextState,
            winnerUserId
          });
        }

        const updatedMatch: ActiveMatch = {
          ...currentMatch,
          state: nextState
        };

        if (isFinished) {
          this.activeMatches.delete(currentMatch.matchId);
          this.clearRoundTransitionTimer(currentMatch.matchId);
          this.clearTurnTimer(currentMatch.matchId);
        } else {
          this.activeMatches.set(currentMatch.matchId, updatedMatch);
          this.scheduleTicTacToeTransition(updatedMatch);
          this.scheduleTurnTimer(updatedMatch);
        }

        if (this.matchStateListener) {
          await this.matchStateListener({ ...updatedMatch, resultSummary });
        }
      } catch {
        this.clearRoundTransitionTimer(match.matchId);
      }
    }, delay);

    this.roundTransitionTimers.set(match.matchId, timer);
  }

  private async loadActiveMatch(roomId: string, matchId: string): Promise<ActiveMatch> {
    const memoryMatch = this.activeMatches.get(matchId);
    if (memoryMatch) {
      if (memoryMatch.roomId !== roomId) {
        throw new GameRuntimeError('Match does not belong to this room', 400);
      }

      return memoryMatch;
    }

    const [row] = await db
      .select({
        match: gameMatches,
        gameSlug: games.slug,
        gameName: games.name,
        pointRules: games.pointRules
      })
      .from(gameMatches)
      .innerJoin(games, eq(gameMatches.gameId, games.id))
      .where(and(eq(gameMatches.id, matchId), eq(gameMatches.roomId, roomId), eq(gameMatches.status, 'active')))
      .limit(1);

    if (!row) {
      throw new GameRuntimeError('Active match not found', 404);
    }

    const players = readPlayersFromState(row.match.matchState);
    const activeMatch: ActiveMatch = {
      matchId: row.match.id,
      roomId: row.match.roomId,
      gameId: row.match.gameId,
      gameSlug: row.gameSlug,
      gameName: row.gameName,
      pointRules: row.pointRules,
      players,
      state: row.match.matchState,
      settings: {}
    };

    this.activeMatches.set(matchId, activeMatch);

    const maybeTicTacToeState = activeMatch.state as {
      roundTransitionAt?: string | null;
      matchTransitionAt?: string | null;
    };

    if (
      activeMatch.gameSlug === 'tic_tac_toe' &&
      (maybeTicTacToeState.roundTransitionAt || maybeTicTacToeState.matchTransitionAt)
    ) {
      this.scheduleTicTacToeTransition(activeMatch);
    }

    this.scheduleTurnTimer(activeMatch);

    return activeMatch;
  }

  private async loadRoomState(roomId: string): Promise<StartGameResult['roomState']> {
    const { RoomsService } = await import('../modules/rooms/rooms.service.js');
    return new RoomsService(this.roomsRepository).getRoom(roomId);
  }

  private async persistRecentResults(input: {
    match: ActiveMatch;
    state: unknown;
    winnerUserId: string | null;
    excludedAwardUserIds?: Set<string>;
    scoreOverridesByUserId?: Map<string, number>;
  }): Promise<void> {
    const resultSummary = createPointResultSummary(input.match, input.state, input.winnerUserId, {
      excludedAwardUserIds: input.excludedAwardUserIds,
      scoreOverridesByUserId: input.scoreOverridesByUserId
    });
    const xpAwardsByUserId = resultSummary ? new Map(Object.entries(resultSummary.score)) : null;
    if (!resultSummary || !xpAwardsByUserId) {
      return;
    }

    for (const userId of input.excludedAwardUserIds ?? []) {
      xpAwardsByUserId.delete(userId);
    }

    await this.gamesRepository.createGameResult({
      gameId: input.match.gameId,
      dataResults: resultSummary,
      xpAwardsByUserId
    });
  }
}

function readTurnTimerInfo(
  state: unknown
): { currentTurnUserId: string; turnStartedAt: string; turnDurationSeconds: number } | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return null;
  }

  const record = state as Record<string, unknown>;
  if (
    typeof record.currentTurnUserId !== 'string' ||
    typeof record.turnStartedAt !== 'string' ||
    typeof record.turnDurationSeconds !== 'number' ||
    !Number.isFinite(record.turnDurationSeconds) ||
    record.turnDurationSeconds <= 0
  ) {
    return null;
  }

  return {
    currentTurnUserId: record.currentTurnUserId,
    turnStartedAt: record.turnStartedAt,
    turnDurationSeconds: record.turnDurationSeconds
  };
}

function createRandomAutoAction(gameSlug: string, state: unknown, currentTurnUserId: string): GameAction | null {
  if (gameSlug === 'tic_tac_toe' && isTicTacToeStateForAutoAction(state)) {
    return createRandomTicTacToeAction(state);
  }

  if (gameSlug === 'chess' && isChessStateForAutoAction(state)) {
    return createRandomChessAction(state, currentTurnUserId);
  }

  return null;
}

function isTicTacToeStateForAutoAction(state: unknown): state is TicTacToeState {
  return Boolean(state && typeof state === 'object' && 'game' in state && state.game === 'tic_tac_toe');
}

function isChessStateForAutoAction(state: unknown): state is ChessState {
  return Boolean(state && typeof state === 'object' && 'game' in state && state.game === 'chess');
}

function readPlayersFromState(state: unknown): PlayerInfo[] {
  if (!state || typeof state !== 'object' || !('players' in state) || !Array.isArray(state.players)) {
    return [];
  }

  return state.players
    .filter((player): player is { userId: string; username: string; avatarUrl: string | null } => {
      return Boolean(player && typeof player === 'object' && 'userId' in player && typeof player.userId === 'string');
    })
    .map((player) => ({
      id: player.userId,
      username: typeof player.username === 'string' ? player.username : 'Player',
      avatarUrl: typeof player.avatarUrl === 'string' ? player.avatarUrl : null,
      seatIndex: null
    }));
}

function readMatchResultSummary(
  state: unknown
): { playerIds: string[]; scoreByUserId: Record<string, number> } | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return null;
  }

  const activePlayerIds =
    'players' in state && Array.isArray(state.players)
      ? state.players
          .filter(
            (player): player is { userId: string } =>
              Boolean(player && typeof player === 'object' && 'userId' in player && typeof player.userId === 'string')
          )
          .map((player) => player.userId)
      : [];
  const leftPlayerIds = readStringArray('leftPlayerUserIds' in state ? state.leftPlayerUserIds : null);
  const playerIds = [...activePlayerIds, ...leftPlayerIds].filter((userId, index, list) => list.indexOf(userId) === index);

  const rawScore = 'score' in state && state.score && typeof state.score === 'object' ? state.score : null;
  const scoreByUserId = Object.fromEntries(
    Object.entries(rawScore ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
  );

  if (playerIds.length === 0) {
    return null;
  }

  return { playerIds, scoreByUserId };
}



function createPointResultSummary(
  match: ActiveMatch,
  state: unknown,
  winnerUserId: string | null,
  options: { excludedAwardUserIds?: Set<string>; scoreOverridesByUserId?: Map<string, number> } = {}
): GameFinishedResult | null {
  const resultSummary = createFinishedResultSummary(match.matchId, state, winnerUserId);
  const summary = readMatchResultSummary(state);
  if (!resultSummary || !summary) {
    return null;
  }

  const pointScoreByUserId = calculateXpAwards({
    gameSlug: match.gameSlug,
    pointRules: match.pointRules,
    playerIds: summary.playerIds.filter((userId) => !options.excludedAwardUserIds?.has(userId)),
    scoreByUserId: summary.scoreByUserId,
    winners: resultSummary.winners,
    state
  });

  for (const [userId, score] of options.scoreOverridesByUserId ?? []) {
    pointScoreByUserId.set(userId, score);
  }

  return {
    ...resultSummary,
    score: Object.fromEntries(pointScoreByUserId)
  };
}

function createLeaveResultSummary(matchId: string, userId: string): GameFinishedResult {
  return {
    'game-id': matchId,
    status: 'finished',
    score: { [userId]: -10 },
    winners: [],
    losers: [userId]
  };
}

function createZeroPointResultSummary(matchId: string, state: unknown): GameFinishedResult | null {
  const summary = readMatchResultSummary(state);
  if (!summary) {
    return null;
  }

  return {
    'game-id': matchId,
    status: 'finished',
    score: Object.fromEntries(summary.playerIds.map((userId) => [userId, 0])),
    winners: [],
    losers: []
  };
}

type XpAwardInput = {
  gameSlug: string;
  pointRules: GamePointRules;
  playerIds: string[];
  scoreByUserId: Record<string, number>;
  winners: string[];
  state: unknown;
};

function calculateXpAwards(input: XpAwardInput): Map<string, number> {
  const rules = normalizePointRules(input.pointRules);
  const awards = new Map<string, number>();

  for (const userId of input.playerIds) {
    let points = rules.base_points ?? 0;

    const normalizedSlug = input.gameSlug.replace(/[-_]/g, '');

    if (
      normalizedSlug === 'tictactoe' ||
      normalizedSlug === 'imageguess' ||
      normalizedSlug === 'guessimage'
    ) {
      points += (input.scoreByUserId[userId] ?? 0) * (rules.round_win_points ?? 0);
    }

    if (input.gameSlug === 'ludo') {
      points += readPlayerMetric(input.state, userId, ['finishedTokensByUserId', 'finished_tokens_by_user_id', 'finishedTokens']) *
        (rules.finished_token_points ?? 0);
      points += readPlayerMetric(input.state, userId, ['stepsByUserId', 'stepByUserId', 'movesByUserId', 'steps', 'moves']) *
        (rules.step_points ?? 0);
    }

    if (input.winners.includes(userId)) {
      points *= rules.final_win_multiplier ?? 1;
    }

    awards.set(userId, Math.round(points));
  }

  return awards;
}

function normalizePointRules(rules: GamePointRules): Required<GamePointRules> {
  return {
    base_points: readFiniteRule(rules.base_points, 0),
    round_win_points: readFiniteRule(rules.round_win_points, 0),
    finished_token_points: readFiniteRule(rules.finished_token_points, 0),
    step_points: readFiniteRule(rules.step_points, 0),
    final_win_multiplier: readFiniteRule(rules.final_win_multiplier, 1)
  };
}

function readFiniteRule(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readPlayerMetric(state: unknown, userId: string, keys: string[]): number {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return 0;
  }

  const record = state as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const metric = (value as Record<string, unknown>)[userId];
    if (typeof metric === 'number' && Number.isFinite(metric)) {
      return metric;
    }
  }

  return 0;
}

function createFinishedResultSummary(
  matchId: string,
  state: unknown,
  winnerUserId: string | null
): GameFinishedResult | null {
  const summary = readMatchResultSummary(state);
  if (!summary) {
    return null;
  }

  const scores = summary.scoreByUserId;
  const playerScores = summary.playerIds.map((userId) => ({
    userId,
    score: scores[userId] ?? 0
  }));

  const highestScore = playerScores.reduce((highest, item) => Math.max(highest, item.score), 0);
  const scoreWinners =
    winnerUserId === null
      ? playerScores.filter((item) => item.score === highestScore).map((item) => item.userId)
      : [winnerUserId];
  const winners = scoreWinners.filter((userId, index, list) => list.indexOf(userId) === index);
  const losers = summary.playerIds.filter((userId) => !winners.includes(userId));

  return {
    'game-id': matchId,
    status: 'finished',
    score: scores,
    winners,
    losers
  };
}

function markPlayerLeft(state: unknown, userId: string): unknown {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return state;
  }

  const record = state as Record<string, unknown>;
  const currentPlayers = Array.isArray(record.players) ? record.players : [];
  const nextPlayers = currentPlayers.filter((player) => {
    return !(
      player &&
      typeof player === 'object' &&
      'userId' in player &&
      (player as { userId?: unknown }).userId === userId
    );
  });

  return {
    ...record,
    players: nextPlayers,
    currentTurnUserId: record.currentTurnUserId === userId ? readFirstPlayerId(nextPlayers) : record.currentTurnUserId,
    turnStartedAt: record.currentTurnUserId === userId ? new Date().toISOString() : record.turnStartedAt,
    leftPlayerUserIds: [...readStringArray(record.leftPlayerUserIds), userId].filter((item, index, list) => list.indexOf(item) === index)
  };
}

function finishStateWithoutWinner(state: unknown): unknown {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return state;
  }

  return {
    ...(state as Record<string, unknown>),
    status: 'finished',
    currentTurnUserId: null,
    turnStartedAt: null,
    matchWinnerUserId: null
  };
}

function readFirstPlayerId(players: unknown[]): string | null {
  const firstPlayer = players.find((player) => {
    return Boolean(player && typeof player === 'object' && 'userId' in player && typeof (player as { userId?: unknown }).userId === 'string');
  });

  return firstPlayer && typeof firstPlayer === 'object' && 'userId' in firstPlayer
    ? ((firstPlayer as { userId: string }).userId)
    : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readWinnerUserId(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('matchWinnerUserId' in state)) {
    return null;
  }

  const winnerUserId = (state as { matchWinnerUserId?: unknown }).matchWinnerUserId;
  return typeof winnerUserId === 'string' ? winnerUserId : null;
}
