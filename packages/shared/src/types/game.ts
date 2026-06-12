export type GameId = 'tic-tac-toe' | 'image-guess' | 'chess';

export type GameMetadata = {
  id: GameId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
};

export type GameType = 'online' | 'offline';

export type Game = {
  id: string;
  slug: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  isActive: boolean;
  gameType: GameType;
  roomsCount: number;
  score: number;
};

export type GameResultOutcome = 'won' | 'lost' | 'draw';

export type GameResultItem = {
  id: string;
  matchId: string;
  gameId: string;
  gameName: string;
  playerIds: string[];
  score: number;
  opponentScore: number;
  scoreByUserId: Record<string, number>;
  outcome: GameResultOutcome;
  createdAt?: string;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl: string | null;
  totalScore: number;
};

export type LeaderboardResponse = {
  global: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  friends: LeaderboardEntry[];
};
