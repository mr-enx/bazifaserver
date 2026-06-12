import type { AuthUser } from '@game-platform/shared';
import { CollectorRepository } from './collector.repository.js';

export class CollectorService {
  constructor(private readonly collectorRepository = new CollectorRepository()) {}

  async getCollectorStatus(userId: string) {
    const user = await this.collectorRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const now = new Date();
    const gemTimeDiff = now.getTime() - user.lastGemCollectionAt.getTime();
    const xpTimeDiff = now.getTime() - user.lastXpCollectionAt.getTime();
    
    const gemCollectInterval = 30 * 1000; // 30 seconds
    const xpCollectInterval = 50 * 1000; // 50 seconds
    
    const canCollectGem = gemTimeDiff >= gemCollectInterval;
    const canCollectXp = xpTimeDiff >= xpCollectInterval;
    
    const gemSecondsLeft = canCollectGem ? 0 : Math.ceil((gemCollectInterval - gemTimeDiff) / 1000);
    const xpSecondsLeft = canCollectXp ? 0 : Math.ceil((xpCollectInterval - xpTimeDiff) / 1000);
    
    return {
      gemMinerLevel: user.gemMinerLevel,
      xpMinerLevel: user.xpMinerLevel,
      canCollectGem,
      canCollectXp,
      gemSecondsLeft,
      xpSecondsLeft,
      gemAmount: 20, // Fixed 20 gems per collection
      xpAmount: 90   // Fixed 90 XP per collection
    };
  }

  async collectGems(user: AuthUser) {
    const now = new Date();
    // Convert string from AuthUser to Date
    const lastGemDate = new Date(user.lastGemCollectionAt);
    const gemTimeDiff = now.getTime() - lastGemDate.getTime();
    const gemCollectInterval = 30 * 1000;
    
    if (gemTimeDiff < gemCollectInterval) {
      const secondsLeft = Math.ceil((gemCollectInterval - gemTimeDiff) / 1000);
      throw new Error(`برای جمع‌آوری جواهر باید ${secondsLeft} ثانیه صبر کنید.`);
    }
    
    const updatedUser = await this.collectorRepository.collectGems(user.id, 20);
    return {
      success: true,
      collectedAmount: 20,
      newGemCount: updatedUser?.gem ?? user.gem + 20
    };
  }

  async collectXp(user: AuthUser) {
    const now = new Date();
    // Convert string from AuthUser to Date
    const lastXpDate = new Date(user.lastXpCollectionAt);
    const xpTimeDiff = now.getTime() - lastXpDate.getTime();
    const xpCollectInterval = 50 * 1000;
    
    if (xpTimeDiff < xpCollectInterval) {
      const secondsLeft = Math.ceil((xpCollectInterval - xpTimeDiff) / 1000);
      throw new Error(`برای جمع‌آوری تجربه باید ${secondsLeft} ثانیه صبر کنید.`);
    }
    
    const updatedUser = await this.collectorRepository.collectXp(user.id, 90);
    return {
      success: true,
      collectedAmount: 90,
      newXpCount: updatedUser?.xp ?? user.xp + 90
    };
  }
}
