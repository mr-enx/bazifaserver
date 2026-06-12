import { sql } from 'drizzle-orm';
import { games } from '../db/schema.js';
import { closeDb, db } from '../db/index.js';

const now = new Date();

const gameSeeds = [
  {
    slug: 'tic_tac_toe',
    name: 'Tic Tac Toe',
    minPlayers: 2,
    maxPlayers: 2,
    gameType: 'online',
    isActive: true,
    pointRules: { base_points: 5, round_win_points: 5, final_win_multiplier: 2 },
    createdAt: now,
    updatedAt: now
  },
  {
    slug: 'image_guess',
    name: 'Image Guess',
    minPlayers: 1,
    maxPlayers: 4,
    gameType: 'online',
    isActive: true,
    pointRules: { base_points: 4, round_win_points: 3, final_win_multiplier: 1.4 },
    createdAt: now,
    updatedAt: now
  },
  {
    slug: 'ludo',
    name: 'Ludo',
    minPlayers: 2,
    maxPlayers: 4,
    gameType: 'offline',
    isActive: false,
    pointRules: { base_points: 20, finished_token_points: 5, step_points: 0.1, final_win_multiplier: 1.5 },
    createdAt: now,
    updatedAt: now
  },
  {
    slug: 'chess',
    name: 'Chess',
    minPlayers: 2,
    maxPlayers: 2,
    gameType: 'online',
    isActive: true,
    pointRules: { base_points: 10, round_win_points: 0, final_win_multiplier: 2 },
    createdAt: now,
    updatedAt: now
  }
] satisfies (typeof games.$inferInsert)[];

try {
  await db
    .insert(games)
    .values(gameSeeds)
    .onConflictDoUpdate({
      target: games.slug,
      set: {
        name: sql.raw('excluded.name'),
        minPlayers: sql.raw('excluded.min_players'),
        maxPlayers: sql.raw('excluded.max_players'),
        gameType: sql.raw('excluded.game_type'),
        isActive: sql.raw('excluded.is_active'),
        pointRules: sql.raw('excluded.point_rules'),
        updatedAt: now
      }
    });

  console.log(`Seeded ${gameSeeds.length} games.`);
} finally {
  await closeDb();
}
