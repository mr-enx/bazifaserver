const BASE_LEVEL_CAPACITY = 80;
const LEVEL_CAPACITY_STEP = 240;

export type XpProgressInfo = {
  level: number;
  totalXp: number;
  currentLevelStartXp: number;
  currentLevelCapacity: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressText: string;
};

export function getLevelCapacity(level: number): number {
  return BASE_LEVEL_CAPACITY + (level - 1) * LEVEL_CAPACITY_STEP;
}

export function getTotalXpRequiredToReachLevel(level: number): number {
  if (level <= 1) {
    return 0;
  }

  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getLevelCapacity(currentLevel);
  }

  return total;
}

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = 1;
  let consumedXp = 0;

  while (true) {
    const capacity = getLevelCapacity(level);
    if (safeXp < consumedXp + capacity) {
      return level;
    }
    consumedXp += capacity;
    level += 1;
  }
}

export function getXpProgressInfo(xp: number): XpProgressInfo {
  const totalXp = Math.max(0, xp);
  const level = getLevelFromXp(totalXp);
  const currentLevelStartXp = getTotalXpRequiredToReachLevel(level);
  const currentLevelCapacity = getLevelCapacity(level);
  const currentLevelXp = totalXp - currentLevelStartXp;
  const nextLevelXp = currentLevelStartXp + currentLevelCapacity;

  return {
    level,
    totalXp,
    currentLevelStartXp,
    currentLevelCapacity,
    currentLevelXp,
    nextLevelXp,
    progressText: `${currentLevelXp}/${currentLevelCapacity}`
  };
}
