import type { ChessState } from '@game-platform/shared';
import type { GameAction } from '../game-engine.base.js';
import { ChessEngine } from './chess.engine.js';

const engine = new ChessEngine();

export function createRandomAutoSelectAction(state: ChessState, userId: string): GameAction | null {
  const legalActions: GameAction[] = [];

  for (let fromRow = 0; fromRow < 8; fromRow += 1) {
    for (let fromCol = 0; fromCol < 8; fromCol += 1) {
      const piece = state.board[fromRow]?.[fromCol] ?? null;
      if (!piece || piece.color !== state.turn) {
        continue;
      }

      for (let toRow = 0; toRow < 8; toRow += 1) {
        for (let toCol = 0; toCol < 8; toCol += 1) {
          const action: GameAction = {
            type: 'chess:move',
            payload: {
              from: { row: fromRow, col: fromCol },
              to: { row: toRow, col: toCol }
            }
          };

          if (engine.validateAction(state, action, userId)) {
            legalActions.push(action);
          }
        }
      }
    }
  }

  return legalActions[Math.floor(Math.random() * legalActions.length)] ?? null;
}
