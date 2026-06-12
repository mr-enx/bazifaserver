import 'dotenv/config';
import { db } from '../db/index.js';
import { castleUpgrades, games } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function seedCastleUpgrades() {
  console.log('Seeding castle upgrades...');
  try {
    const allGames = await db.select().from(games);
    const ticTacToe = allGames.find((g: any) => g.slug === 'tic_tac_toe');
    const imageGuess = allGames.find((g: any) => g.slug === 'image_guess');

    if (!ticTacToe || !imageGuess) {
      console.error('Required games not found in database. Please seed games first.');
      process.exit(1);
    }

    await db.insert(castleUpgrades).values([
      {
        level: 1,
        requiredScores: {}, // Level 1 is the default, no requirements
      },
      {
        level: 2,
        requiredScores: {
          [ticTacToe.id]: 300,
          [imageGuess.id]: 200,
        },
      },
    ]).onConflictDoUpdate({ 
      target: castleUpgrades.level,
      set: {
        requiredScores: {
          [ticTacToe.id]: 300,
          [imageGuess.id]: 200,
        },
        updatedAt: new Date()
      }
    });
    
    console.log('Successfully seeded castle upgrades.');
  } catch (error) {
    console.error('Error seeding castle upgrades:', error);
  }
  process.exit(0);
}

seedCastleUpgrades();
