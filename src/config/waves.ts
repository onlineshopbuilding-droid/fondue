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
  easy: { label: 'Easy', count: 0.75, speed: 0.9, damage: 0.7, gold: 1.15 },
  medium: { label: 'Medium', count: 1, speed: 1, damage: 1, gold: 1 },
  hard: { label: 'Hard', count: 1.3, speed: 1.12, damage: 1.35, gold: 0.9 },
};

export const DAY = {
  /** Length of the fight in seconds. */
  seconds: 50,
  bannerSeconds: 2.6,
  endBannerSeconds: 2.6,
  /** Enemies per day: base + perDay * (day - 1), slower growth after softCapDay. */
  base: 38,
  perDay: 14,
  softCapDay: 12,
  perDayAfterCap: 12,
  /** Hard limit of living enemies; spawns wait while it is reached. */
  maxAlive: 200,
  /** Per-day growth after day 1: gate damage, walk speed, and hit points against weapons. */
  damageGrowth: 0.13,
  speedGrowth: 0.015,
  hpGrowth: 0.12,
  /** Share of the day over which spawning ramps from sparse to dense. */
  rampPower: 0.8,
};

/** Extra enemies in co-op. */
export const COOP = { countFactor: 1.9 };

/** Landscape cycle: changes every N days. */
export const LANDSCAPES = ['meadow', 'canyon', 'marsh', 'snowpine'] as const;
export type Landscape = (typeof LANDSCAPES)[number];
export const DAYS_PER_LANDSCAPE = 3;
