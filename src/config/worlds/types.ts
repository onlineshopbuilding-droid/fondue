/**
 * The data types of a world: a package of king, story, raiders, landscapes and campaign.
 * Fondue is world 1; the code must never assume there is only one.
 */
import type { EnemyType } from '../enemies';
import type { StationId } from '../keep';
import type { Landscape } from '../waves';

/**
 * One wave of a level: how many raiders of each type arrive, over how many seconds, and the breath
 * after it. The next wave starts when `pauseAfter` is over, or sooner once nobody is alive (B2).
 */
export interface WaveDef {
  counts: Partial<Record<EnemyType, number>>;
  /** Seconds over which the wave arrives, in `packs` bunches. */
  spawnSeconds: number;
  packs: number;
  /** Seconds of breath after the last arrival before the next wave. */
  pauseAfter: number;
  /** Oversized raiders in this wave (the boss wave). */
  big?: Partial<Record<EnemyType, number>>;
  /** This wave brings the level's boss: its name is shown. */
  boss?: boolean;
}

/**
 * A challenge of a level, built from a template. It is judged only on the numbers of the run
 * (`RunStatsData`), so the simulation needs no rule of its own. See worlds/fondue/challenges.ts.
 */
export interface ChallengeDef {
  /** Template id, e.g. 'killType', 'kegBlasts', 'cauldron'. */
  template: string;
  params: Record<string, number | string>;
  /** Game text, e.g. "Let 5 Keg Haulers explode". */
  text: string;
}

/** What makes a boss level special. */
export interface BossDef {
  /** Shown on the map and in the banner. */
  name: string;
  line: string;
}

/**
 * What sets a level apart from its neighbours.
 *   onlyTypes: only these raiders come.   night: every wave is dark.
 *   flood: far more of one type.          allTypes: everything known so far, at once.
 */
export type TwistDef =
  | { kind: 'onlyTypes'; types: EnemyType[]; label: string }
  | { kind: 'night'; label: string }
  | { kind: 'flood'; type: EnemyType; label: string }
  | { kind: 'allTypes'; label: string };

/** A hint the king gives at the start of a wave (the guided level 1). */
export interface HintDef {
  wave: number;
  text: string;
}

export interface LevelDef {
  id: number;
  name: string;
  landscape: Landscape;
  /** Every wave of the level is fought in the dark. */
  night: boolean;
  waves: WaveDef[];
  /** Planned length of the level in seconds (map, table, bot checks). */
  targetSeconds: number;
  challenges: [ChallengeDef, ChallengeDef];
  /** Strength of the raiders in this level: multiplies hit points and, weaker, gate damage and speed. */
  power: number;
  boss: BossDef | null;
  twist: TwistDef | null;
  /** One sentence for the win screen. */
  story: string;
  hints: HintDef[];
  /** Raider types met for the first time in the campaign in this level (derived from the waves). */
  newEnemies: EnemyType[];
  /** Most raiders alive at once (B4). */
  maxAlive: number;
}

/** What a level unlocks for good once it is won. */
export type UnlockDef =
  | { level: number; kind: 'slot'; slot: number }
  | { level: number; kind: 'weapon'; weapon: string }
  | { level: number; kind: 'station'; station: StationId }
  | { level: number; kind: 'gate'; tier: number }
  | { level: number; kind: 'hand'; tier: number };

/** How one raider type shows up in endless runs. */
export interface EndlessTypeDef {
  /** The first wave it can appear in lies somewhere in this span, decided per run. */
  firstWave: [number, number];
  /** How many arrive in that first wave. */
  firstCount: number;
  /** Chance that the first wave brings one more than that. */
  extraChance: number;
  /** Share among the raiders once it is around. */
  weight: number;
  /** Most of this type per wave before scaling; grows by `capGrowth` per wave after its first. */
  maxPerWave: number;
}

export interface EndlessDef {
  /** The wave count is the formula value times a random factor between 1 - spread and 1 + spread. */
  countSpread: number;
  types: Record<EnemyType, EndlessTypeDef>;
  landscapes: Landscape[];
  wavesPerLandscape: number;
  /** Share by which a type's per-wave cap grows each wave after its first. */
  capGrowth: number;
  /** false: every weapon and slot is available, whatever the campaign progress (developer testing). */
  onlyUnlockedWeapons: boolean;
}

export interface WorldDef {
  id: string;
  name: string;
  king: { name: string; title: string };
  landscapes: Landscape[];
  /** The raiders of this world, picked from the directory in enemies.ts. */
  enemies: EnemyType[];
  stations: StationId[];
  campaign: LevelDef[];
  unlocks: UnlockDef[];
  endless: EndlessDef;
}
