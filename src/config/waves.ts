// How a level runs as a chain of waves: banner, pauses, the "never long without a raider" rule, the
// endless wave formula, the difficulties, the co-op factors and the landscape cycle of endless.
// The campaign's levels take their waves from the world's level table (worlds/fondue/campaign.ts).
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
  /** Multiplies gold from kills. Endless is the place to earn gold, and harder pays more (E1). */
  gold: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { label: 'Easy', count: 0.8, speed: 0.92, damage: 0.8, gold: 0.8 },
  medium: { label: 'Medium', count: 1, speed: 1, damage: 1, gold: 1 },
  hard: { label: 'Hard', count: 1.3, speed: 1.12, damage: 1.35, gold: 1.3 },
};

/**
 * The wave rhythm of every run (B1, B2, B3).
 * bannerSeconds: the level banner at the start; raiders already walk under it.
 * firstWaveDelay: seconds from the level start to the first arrival of wave 1.
 * pauseMin/pauseMax: breathing room after a wave has fully arrived (the level table picks inside it).
 * clearDelay: once nobody is alive, the next arrival comes after at most this many seconds, so a
 *   level is never more than about 2 s without a living raider (B2 allows 5 s).
 * endBannerSeconds: the defeat banner before the result.
 * maxAliveMin/maxAliveMax: most raiders alive at once, early level and late level (B4: 12 to 30).
 */
export const WAVES = {
  bannerSeconds: 1.2,
  firstWaveDelay: 0.3,
  pauseMin: 2,
  pauseMax: 4,
  clearDelay: 1.5,
  endBannerSeconds: 2.6,
  maxAliveMin: 12,
  maxAliveMax: 30,
  /** B2 test limit: the longest stretch without a living raider. */
  maxQuietSeconds: 5,
};

/**
 * Endless: waves without end. Raiders of wave n: base + perWave * (n - 1), slower growth after
 * softCapWave; spawnSeconds is how long a wave takes to arrive; growth values are added per wave.
 * maxAlive grows from WAVES.maxAliveMin by maxAlivePerWave up to WAVES.maxAliveMax.
 */
export const ENDLESS_WAVES = {
  base: 6,
  perWave: 1.1,
  softCapWave: 30,
  perWaveAfterCap: 2.2,
  spawnSeconds: 9,
  pause: 3,
  /** Every fourth wave is a spike: this many times the raiders. */
  spikeEvery: 4,
  spikeFactor: 1.7,
  damageGrowth: 0.035,
  speedGrowth: 0.004,
  hpGrowth: 0.016,
  maxAlivePerWave: 0.6,
};

/**
 * Co-op. countFactor: raiders times this when two play (B4: fewer, faster raiders, so a second hand
 * matters more than before; start 1.8, tuned by bots so that two do not win more often than one).
 * goldPerKill: share of a kill's gold in co-op; both players are paid the whole gold of the round (E-066).
 */
export const COOP = { countFactor: 1.8, goldPerKill: 0.6 };

/** Landscape cycle of endless: the order of the landscapes, changing every WAVES_PER_LANDSCAPE waves. */
export const LANDSCAPES = ['meadow', 'canyon', 'marsh', 'snowpine'] as const;
export type Landscape = (typeof LANDSCAPES)[number];
export const WAVES_PER_LANDSCAPE = 8;
