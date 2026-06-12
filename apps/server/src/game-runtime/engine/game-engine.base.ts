export type PlayerInfo = {
  id: string;
  username: string;
  avatarUrl: string | null;
  seatIndex: number | null;
};

export type GameAction = {
  type: string;
  payload?: unknown;
};

export interface GameEngine {
  createInitialState(settings: unknown, players: PlayerInfo[]): unknown;
  validateAction(state: unknown, action: GameAction, playerId: string): boolean;
  applyAction(state: unknown, action: GameAction, playerId: string): unknown;
  getTurn(state: unknown): string | null;
  isRoundFinished(state: unknown): boolean;
  isMatchFinished(state: unknown): boolean;
  getWinner(state: unknown): string | null;
}
