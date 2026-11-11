/**
 * The data types of one run: the rules that never change while it lasts, the values it starts
 * with, and the result at its end. A game mode builds these; the simulation only reads them.
 */
import type { EnemyType } from '../config/enemies';
import type { Flags } from '../config/flags';
import type { StationId } from '../config/keep';
import type { Tuning } from '../config/tuning';
import type { Difficulty, Landscape } from '../config/waves';
import type { DayPlanner } from './plan';

/** How strong the raiders of a run are, and how that grows from day to day. */
export interface Scaling {
  /** Multiplies the number of raiders, their walk speed, their damage to the gate, their hit points, and gold per kill. */
  count: number;
  speed: number;
  damage: number;
  hp: number;
  gold: number;
  /** Added per day after the first, as a share: 0.2 means +20 % each day. */
  damageGrowth: number;
  speedGrowth: number;
  hpGrowth: number;
}

/** What a run offers for one weapon. */
export interface WeaponRule {
  /** Can be put into a slot in this run. */
  offered: boolean;
  /** Campaign: the lasting tier from the profile. Endless: null, it starts at tier 1 and is upgraded in the run. */
  fixedTier: number | null;
}

/** Rules of one run. Plain data: sent to the guest once, stored for resuming. */
export interface RunRules {
  /** Unique per run, so that a reward is paid out exactly once. */
  runId: string;
  mode: string;
  world: string;
  level: number | null;
  /** Only for display and the score list. */
  difficulty: Difficulty | null;
  /** Surviving this day wins the run; null means it never ends. */
  lastDay: number | null;
  players: number;
  scaling: Scaling;
  /** Which of the five slots exist in this run. */
  slotsOpen: boolean[];
  weapons: Record<string, WeaponRule>;
  stationsOffered: StationId[];
  maxGateTier: number;
  /** Hand tier of each player at the start. */
  handStart: number[];
  /** The hand can be upgraded with gold during the run (endless). */
  handBuyable: boolean;
  /** Weapons can be upgraded during the run (endless). */
  tierUpgrades: boolean;
  /** A market follows each day. */
  hasMarket: boolean;
  /** The gate takes hits but never falls (tutorial prelude). */
  gateCannotFall: boolean;
  /** Only these market items can be bought (level 1: the cauldron); null means no restriction. */
  marketOnly: string[] | null;
}

/** What stands on the keep right now. Changes with purchases. */
export interface Loadout {
  gateTier: number;
  /** Weapon id in each slot, or null. */
  slotWeapon: (string | null)[];
  /** Tier of every weapon owned in this run. */
  weaponTier: Record<string, number>;
  stations: Record<StationId, boolean>;
  /** Hand tier per player. */
  handTier: number[];
}

/** Counts kept during a run. Rewards and later challenges are rules on these numbers. */
export interface RunStatsData {
  kills: number;
  killsByCause: Record<string, number>;
  killsByType: Record<string, number>;
  /** Raiders given to the cauldron or the eagle. */
  offerings: number;
  /** Kegs shaken loose, and raiders killed by any keg blast. */
  kegsShaken: number;
  kegBlastKills: number;
  /** Times each weapon was fired. */
  weaponShots: Record<string, number>;
  /** Gate hit points lost over the whole run. */
  gateDamage: number;
  goldEarned: number;
  throws: number;
  daysCleared: number;
}

export const emptyStats = (): RunStatsData => ({
  kills: 0, killsByCause: {}, killsByType: {}, offerings: 0, kegsShaken: 0, kegBlastKills: 0,
  weaponShots: {}, gateDamage: 0, goldEarned: 0, throws: 0, daysCleared: 0,
});

/** The values a run starts with: a fresh level, a developer jump, or a day being resumed. */
export interface RunStart {
  day: number;
  gold: number;
  offerings: number;
  loadout: Loadout;
  stats: RunStatsData;
  totalScore: number;
  totalKills: number;
  /** Enemy types already met, so they are not announced again. */
  seenTypes: EnemyType[];
}

export interface RunSetup {
  seed: number;
  names: string[];
  tuning: Tuning;
  flags?: Flags;
  fieldW?: number;
  rules: RunRules;
  /** Host only. A pure calculation: the same day and random stream give the same plan. */
  planner: DayPlanner;
  start: RunStart;
  /** A developer tool shaped this run: it reaches neither the scores nor the stars. */
  devRun?: boolean;
}

/** How a run ended. Travels in Meta, so every device can pay out its own reward. */
export interface RunResult {
  runId: string;
  won: boolean;
  /** Last day that was started. */
  day: number;
  score: number;
  kills: number;
  stats: RunStatsData;
}

/** What scene and guest need to know about the day being played. */
export interface TodayInfo {
  landscape: Landscape;
  night: boolean;
  /** Name of the boss of this day, or null. */
  boss: string | null;
  /** Types that appear for the first time in this run today. */
  newTypes: EnemyType[];
  /** Length of the fight until nightfall. */
  seconds: number;
}

export const emptyLoadout = (players: number, handStart: number[] = []): Loadout => ({
  gateTier: 0,
  slotWeapon: [null, null, null, null, null],
  weaponTier: {},
  stations: { cauldron: false, perch: false },
  handTier: Array.from({ length: players }, (_, i) => handStart[i] ?? 1),
});

export const freshStart = (rules: RunRules): RunStart => ({
  day: 1, gold: 0, offerings: 0, loadout: emptyLoadout(rules.players, rules.handStart), stats: emptyStats(),
  totalScore: 0, totalKills: 0, seenTypes: [],
});
