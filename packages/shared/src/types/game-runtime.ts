export type GameAction = {
  type: string;
  payload?: unknown;
};

export type GameActionPayload = {
  roomId: string;
  matchId: string;
} & GameAction;

export type TicTacToeSymbol = 'X' | 'O';
export type TicTacToeCell = TicTacToeSymbol | null;

export type TicTacToePlayerState = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  symbol: TicTacToeSymbol;
};

export type TicTacToeLastMove = {
  row: number;
  col: number;
  userId: string;
  symbol: TicTacToeSymbol;
  round: number;
} | null;

export type TicTacToeRoundResult = {
  round: number;
  winnerUserId: string | null;
  isDraw: boolean;
} | null;

export type TicTacToeState = {
  game: 'tic_tac_toe';
  rounds: number;
  currentRound: number;
  boardSize: 3;
  board: TicTacToeCell[][];
  players: TicTacToePlayerState[];
  currentTurnUserId: string | null;
  turnStartedAt: string | null;
  turnDurationSeconds: number;
  score: Record<string, number>;
  roundWinnerUserId: string | null;
  matchWinnerUserId: string | null;
  status: 'playing' | 'finished';
  lastMove: TicTacToeLastMove;
  lastRoundResult: TicTacToeRoundResult;
  roundTransitionAt: string | null;
  matchTransitionAt: string | null;
};

export type TicTacToePlaceAction = {
  roomId: string;
  matchId: string;
  type: 'tic_tac_toe:place';
  payload: {
    row: number;
    col: number;
  };
};

export type ImageGuessItemState = {
  id: string;
  imageKey: string;
  revealed: boolean;
  selectedByUserId: string | null;
};

export type ImageGuessPlayerState = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type ImageGuessState = {
  game: 'image_guess';
  rounds: number;
  currentRound: number;
  imageCount: 8 | 18 | 28;
  items: ImageGuessItemState[];
  players: ImageGuessPlayerState[];
  score: Record<string, number>;
  currentTurnUserId: string | null;
  turnStartedAt: string | null;
  turnDurationSeconds: number;
  status: 'playing' | 'finished';
  matchWinnerUserId: string | null;
};

export type ImageGuessSelectAction = {
  roomId: string;
  matchId: string;
  type: 'image_guess:select';
  payload: {
    itemId: string;
  };
};

export type ChessColor = 'white' | 'black';

export type ChessPieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export type ChessPiece = {
  type: ChessPieceType;
  color: ChessColor;
};

export type ChessSquare = {
  row: number;
  col: number;
};

export type ChessLastMove = {
  from: ChessSquare;
  to: ChessSquare;
  piece: ChessPiece;
  captured: ChessPiece | null;
  promotion: ChessPieceType | null;
} | null;

export type ChessPlayerState = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  color: ChessColor;
};

export type ChessState = {
  game: 'chess';
  board: (ChessPiece | null)[][];
  players: ChessPlayerState[];
  turn: ChessColor;
  currentTurnUserId: string | null;

  /** شروع نوبت فعلی */
  turnStartedAt: string | null;

  /** مدت زمان هر نوبت بر حسب ثانیه */
  turnDurationSeconds: number;

  status: 'playing' | 'finished';
  checkedColor: ChessColor | null;
  matchWinnerUserId: string | null;
  score: Record<string, number>;
  lastMove: ChessLastMove;
  endedBy: 'checkmate' | 'stalemate' | 'resign' | null;
};

export type ChessMoveAction = {
  roomId: string;
  matchId: string;
  type: 'chess:move';
  payload: {
    from: ChessSquare;
    to: ChessSquare;
  };
};

export type ChessResignAction = {
  roomId: string;
  matchId: string;
  type: 'chess:resign';
};
