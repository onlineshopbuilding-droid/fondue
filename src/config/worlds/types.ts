/**
 * The data types of a world: a package of king, story, raiders, landscapes and campaign.
 * Fondue is world 1; the code must never assume there is only one.
 */
import type { EnemyType } from '../enemies';
import type { StationId } from '../keep';
import type { Difficulty, Landscape } from '../waves';

/** One day of a level: how many raiders of each type arrive. */
export interface DayDef {
  counts: Partial<Record<EnemyType, number>>;
  night: boolean;
  /** Seconds until nightfall. */
  seconds: number;
  /** Oversized raiders that walk in on this day (boss days). */
  big: Partial<Record<EnemyType, number>>;
}

/** What makes a boss level special. */
export interface BossDef {
  /** Shown on the map and in the banner. */
  name: string;
  line: string;
}

/**
 * What sets a level apart from its neighbours.
 *   onlyTypes: only these raiders come.   night: every day is dark.
 *   flood: far more of one type.          allTypes: everything known so far, at once.
 */
export type TwistDef =
  | { kind: 'onlyTypes'; types: EnemyType[]; label: string }
  | { kind: 'night'; label: string }
  | { kind: 'flood'; type: EnemyType; label: string }
  | { kind: 'allTypes'; label: string };

/** A hint the game shows at a fixed moment of a level (the guided level 1). */
export interface HintDef {
  day: number;
  /** 'market' shows in the market after that day, 'battle' at the start of the fight. */
  when: 'market' | 'battle';
  text: string;
}

export interface LevelDef {
  id: number;
  name: string;
  landscape: Landscape;
  days: DayDef[];
  /** Strength of the raiders in this level: multiplies hit points and, weaker, gate damage and speed. */
  power: number;
  boss: BossDef | null;
  twist: TwistDef | null;
  /** Stars for the first win. */
  stars: number;
  /** One sentence for the win screen. */
  story: string;
  /** Only these market items can be bought; null means everything the profile has unlocked. */
  marketOnly: string[] | null;
  startGold: number;
  hints: HintDef[];
  /** Raider types met for the first time in the campaign in this level (derived from the days). */
  newEnemies: EnemyType[];
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
  /** The first day it can appear lies somewhere in this span, decided per run. */
  firstDay: [number, number];
  /** How many arrive on that first day. */
  firstCount: number;
  /** Chance that the first day brings one more than that. */
  extraChance: number;
  /** Share among the raiders once it is around. */
  weight: number;
  /** Most of this type per day before scaling; grows 15 % per day after its first. */
  maxPerDay: number;
}

export interface EndlessDef {
  /** The day count is the formula value times a random factor between 1 - spread and 1 + spread. */
  countSpread: number;
  types: Record<EnemyType, EndlessTypeDef>;
  landscapes: Landscape[];
  daysPerLandscape: number;
  /** false: every weapon and slot is available, whatever the campaign progress (for testing). */
  onlyUnlockedWeapons: boolean;
  /** Campaign level that must be won before endless opens; 0 means from the start. */
  availableFromLevel: number;
  /** One-time stars for reaching these days, per difficulty. */
  milestones: Record<Difficulty, { day: number; stars: number }[]>;
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
