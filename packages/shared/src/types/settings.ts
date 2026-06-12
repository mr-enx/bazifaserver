export type TicTacToeSettings = {
  rounds: number;
  boardSize: 3;
};

export type ImageGuessSettings = {
  rounds: number;
  imageCount: 8 | 18 | 28;
};

export type GameSettings = TicTacToeSettings | ImageGuessSettings;

export const IMAGE_GUESS_IMAGE_COUNT_OPTIONS = [8, 18, 28] as const;
export const TIC_TAC_TOE_BOARD_SIZE_OPTIONS = [3] as const;
