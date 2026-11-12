export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyDef {
  label: string;
  /** Multiplies enemy count. */
  count: number;
  /** Multiplies enemy speed. */
  speed: number;
  /** Multiplies damage to the gate. */
  damage: number;
  /** Multiplies gold from kills. */
  gold: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { label: 'Easy', count: 0.8, speed: 0.92, damage: 0.8, gold: 1 },
  medium: { label: 'Medium', count: 1, speed: 1, damage: 1, gold: 1 },
  hard: { label: 'Hard', count: 1.3, speed: 1.12, damage: 1.35, gold: 0.9 },
};

export const DAY = {
  /** Length of the fight in seconds. */
  seconds: 50,
  bannerSeconds: 2.6,
  endBannerSeconds: 2.6,
  /** Enemies per day: base + perDay * (day - 1), slower growth after softCapDay. */
  base: 40,
  perDay: 7,
  softCapDay: 18,
  perDayAfterCap: 18,
  /** Share of a day's raiders that arrive in packs, how many packs, and how long each one takes. */
  packShare: 0.55,
  packs: 3,
  packsPerDays: 6,
  packSpread: 3,
  /** Hard limit of living enemies; spawns wait while it is reached. */
  maxAlive: 200,
  /** Per-day growth after day 1: gate damage, walk speed, and hit points against weapons. */
  damageGrowth: 0.2,
  speedGrowth: 0.03,
  hpGrowth: 0.09,
  /** Share of the day over which spawning ramps from sparse to dense. */
  rampPower: 0.8,
};

/**
 * Extra enemies in co-op. The factor applies from day 1 and eases to lateFactor between easeFrom
 * and easeTo, because the second pair of hands matters less once weapons do most of the work.
 * earlyAdjust is added on days 1, 2, ... (raiders before scaling): two weak players must survive day 1 too.
 */
export const COOP = { countFactor: 2.3, lateFactor: 2.1, easeFrom: 22, easeTo: 36, earlyAdjust: [-8, -6, -3, 0], goldFactor: 0.5, /** Raiders of a campaign level times this when two play. */ campaignFactor: 1.9 };

/** Landscape cycle: changes every N days. */
export const LANDSCAPES = ['meadow', 'canyon', 'marsh', 'snowpine'] as const;
export type Landscape = (typeof LANDSCAPES)[number];
export const DAYS_PER_LANDSCAPE = 3;
