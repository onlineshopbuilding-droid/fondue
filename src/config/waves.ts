// How many raiders a day brings and how that grows: the difficulties, the day formula, the co-op factors and the landscape cycle.
// The campaign's levels take their raider counts from the world's level table; these numbers drive endless and the day timing.
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyDef {
  /** Name shown in the menus. */
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

/** One day of fighting. */
export const DAY = {
  /** Length of the fight in seconds. */
  seconds: 50,
  /** Seconds the day banner shows before the fight, and the win or defeat banner after it. */
  bannerSeconds: 2.6,
  endBannerSeconds: 2.6,
  /** Enemies per day: base + perDay * (day - 1), slower growth after softCapDay. */
  base: 40,
  perDay: 7,
  softCapDay: 18,
  perDayAfterCap: 18,
  /**
   * Share of a day's raiders that arrive in packs, how many packs (plus one more every packsPerDays
   * days), and over how many seconds each pack arrives.
   */
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
 * Columns: countFactor = raiders times this from day 1; lateFactor = the factor after easeTo; easeFrom, easeTo = days
 * of the change; goldFactor = gold per kill times this in co-op; campaignFactor = see its own comment.
 */
export const COOP = { countFactor: 2.3, lateFactor: 2.1, easeFrom: 22, easeTo: 36, earlyAdjust: [-8, -6, -3, 0], goldFactor: 0.5, /** Raiders of a campaign level times this when two play. */ campaignFactor: 1.7 };

/** Landscape cycle of endless: the order of the landscapes, changing every DAYS_PER_LANDSCAPE days. */
export const LANDSCAPES = ['meadow', 'canyon', 'marsh', 'snowpine'] as const;
export type Landscape = (typeof LANDSCAPES)[number];
export const DAYS_PER_LANDSCAPE = 3;
