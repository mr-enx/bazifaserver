import type { AuthUser } from '@game-platform/shared';
import { CastleRepository } from './castle.repository.js';
import { GamesService } from './games.service.js';

type UpgradeItem = {
  slug: string;
  gameName: string;
  requiredScore: number;
  userScore: number;
  hasEnoughScore: boolean;
};

export class CastleService {
  constructor(
    private readonly castleRepository = new CastleRepository(),
    private readonly gamesService = new GamesService()
  ) {}

  async getUpgradeRequirements(user: AuthUser) {
    const nextLevel = user.castleLevel + 1;
    const upgrade = await this.castleRepository.findUpgradeByLevel(nextLevel);
    const userGames = await this.gamesService.listGames({ userId: user.id, activeOnly: false });
    
    const items: UpgradeItem[] = Object.entries(upgrade?.requiredScores ?? {}).map(([gameId, score]) => {
      const matchedGame = userGames.find(g => g.id === gameId);
      const userScore = matchedGame?.score ?? 0;

      return {
        slug: matchedGame?.slug ?? 'unknown',
        gameName: matchedGame?.name ?? 'بازی ناشناخته',
        requiredScore: score,
        userScore,
        hasEnoughScore: userScore >= score
      };
    });

    return {
      nextLevel,
      items
    };
  }

  async upgradeCastle(user: AuthUser) {
    const nextLevel = user.castleLevel + 1;
    const upgrade = await this.castleRepository.findUpgradeByLevel(nextLevel);

    if (!upgrade) {
      throw new Error('No more upgrades available');
    }

    const userGames = await this.gamesService.listGames({ userId: user.id, activeOnly: false });
    const required = upgrade.requiredScores;
    
    // Check requirements dynamically
    for (const [gameId, requiredScore] of Object.entries(required)) {
      const matchedGame = userGames.find(g => g.id === gameId);
      const userScore = matchedGame?.score ?? 0;
      if (userScore < requiredScore) {
        const gameName = matchedGame?.name ?? 'بازی ناشناخته';
        throw new Error(`امتیاز شما در بازی ${gameName} کافی نیست. نیاز به ${requiredScore} امتیاز دارید.`);
      }
    }

    await this.castleRepository.updateUserCastleLevel(user.id, nextLevel);
    
    return { success: true, newLevel: nextLevel };
  }
}
