/**
 * The data types of one run: the rules that never change while it lasts, the values it starts
 * with, and the result at its end. A game mode builds these; the simulation only reads them.
 * A run is one fight made of waves; nothing is bought during it (the keep comes from the profile).
 */
import type { EnemyType } from '../config/enemies';
import type { Flags } from '../config/flags';
import type { StationId } from '../config/keep';
import type { Tuning } from '../config/tuning';
import type { Difficulty, Landscape } from '../config/waves';
import type { WavePlanner } from './plan';

/** How strong the raiders of a run are, and how that grows from wave to wave. */
export interface Scaling {
  /** Multiplies the number of raiders, their walk speed, their damage to the gate, their hit points, and gold per kill. */
  count: number;
  speed: number;
  damage: number;
  hp: number;
  gold: number;
  /** Added per wave after the first, as a share: 0.02 means +2 % each wave. */
  damageGrowth: number;
  speedGrowth: number;
  hpGrowth: number;
  /**
   * Share of the strength above 1 (speed, damage, hp) that applies in wave 1, 2, ...; waves past the
   * list get all of it.
   */
  easeIn?: number[];
}

/** Rules of one run. Plain data: sent to the guest once, stored for resuming. */
export interface RunRules {
  /** Unique per run, so that a reward is paid out exactly once. */
  runId: string;
  mode: string;
  world: string;
  level: number | null;
  /** Only for display, gold and the score list. */
  difficulty: Difficulty | null;
  /** Clearing this wave wins the run; null means it never ends (endless). */
  lastWave: number | null;
  players: number;
  scaling: Scaling;
  /** Most raiders alive at once; arrivals wait while it is reached. */
  maxAlive: number;
  /** Which of the five slots exist in this run. */
  slotsOpen: boolean[];
  /** The gate takes hits but never falls (tutorial prelude). */
  gateCannotFall: boolean;
}

/** What stands on the keep: the permanent keep of the (host's) profile. Nothing changes it during a run. */
export interface Loadout {
  /** Castle tier index (0 = tier 1). */
  gateTier: number;
  /** Weapon id in each slot, or null. */
  slotWeapon: (string | null)[];
  /** Tier of every worn weapon. */
  weaponTier: Record<string, number>;
  stations: Record<StationId, boolean>;
  /** Station tiers (0 = not owned). */
  stationTier?: Partial<Record<StationId, number>>;
  /** Hand tier per player. */
  handTier: number[];
}

/** Counts kept during a run. Rewards and challenges are rules on these numbers. */
export interface RunStatsData {
  kills: number;
  killsByCause: Record<string, number>;
  killsByType: Record<string, number>;
  /** Raiders killed by a throw (cause impact), by type. */
  throwKillsByType: Record<string, number>;
  /** Kegs shaken loose, kegs that blew up among raiders, and raiders killed by any keg blast. */
  kegsShaken: number;
  kegBlasts: number;
  kegBlastKills: number;
  /** Times each weapon was fired. */
  weaponShots: Record<string, number>;
  /** Gate hit points lost over the whole run. */
  gateDamage: number;
  goldEarned: number;
  /** Raider Crests left at the Eagle Perch in this run (capped per run). */
  crestsEarned: number;
  /** Throws that came near the Eagle Perch, and those that landed on the hook (hit rate, `perchHitRate`). */
  perchTries: number;
  perchHits: number;
  throws: number;
  wavesCleared: number;
}

export const emptyStats = (): RunStatsData => ({
  kills: 0, killsByCause: {}, killsByType: {}, throwKillsByType: {}, kegsShaken: 0, kegBlasts: 0, kegBlastKills: 0,
  weaponShots: {}, gateDamage: 0, goldEarned: 0, crestsEarned: 0, perchTries: 0, perchHits: 0, throws: 0, wavesCleared: 0,
});

/** The values a run starts with: a fresh level, a developer jump, or a wave being resumed. */
export interface RunStart {
  /** Wave to begin with (1 = the start of the level). */
  wave: number;
  /** Gold earned in this run so far. */
  gold: number;
  /** Gate hit points to begin with; 0 means full. */
  gateHp: number;
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
  /**
   * Right edge of the host's visible part of the field in world units (B3): raiders step in there,
   * not somewhere out of sight. Missing means the field's own right edge.
   */
  viewRight?: number;
  rules: RunRules;
  /** Host only. A pure calculation: the same wave and random stream give the same plan. */
  planner: WavePlanner;
  start: RunStart;
  /** A developer tool shaped this run: it reaches neither the scores nor the rewards. */
  devRun?: boolean;
}

/** How a run ended. Travels in Meta, so every device can pay out its own reward. */
export interface RunResult {
  runId: string;
  won: boolean;
  /** A developer tool shaped this run: no scores, no rewards. */
  devRun: boolean;
  names: string[];
  /** Last wave that was started. */
  wave: number;
  score: number;
  kills: number;
  /** Gate strength at the end as a share of full (0..1); cheese 2 and 3. */
  gateShare: number;
  stats: RunStatsData;
}

/** What scene and guest need to know about the wave being fought. */
export interface WaveInfo {
  landscape: Landscape;
  night: boolean;
  /** Name of the boss of this wave, or null. */
  boss: string | null;
  /** Types that appear for the first time in this run in this wave. */
  newTypes: EnemyType[];
  /** Current wave, and the last one (null without end). */
  wave: number;
  lastWave: number | null;
}

export const emptyLoadout = (players: number, handStart: number[] = []): Loadout => ({
  gateTier: 0,
  slotWeapon: [null, null, null, null, null],
  weaponTier: {},
  stations: { cauldron: false, perch: false },
  handTier: Array.from({ length: players }, (_, i) => handStart[i] ?? 1),
});

export const freshStart = (rules: RunRules, loadout: Loadout = emptyLoadout(rules.players)): RunStart => ({
  wave: 1, gold: 0, gateHp: 0, loadout, stats: emptyStats(), totalScore: 0, totalKills: 0, seenTypes: [],
});
