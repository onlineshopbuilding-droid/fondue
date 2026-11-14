/**
 * What every game mode must be able to do: build a run for the simulation and hand out the
 * reward when it is over. Tutorial, campaign and endless are classes behind this interface.
 */
import type { Flags } from '../config/flags';
import type { Tuning } from '../config/tuning';
import type { Difficulty } from '../config/waves';
import type { UnlockDef } from '../config/worlds/types';
import type { Profile, ScoreEntry } from '../profile';
import type { RunResult, RunRules, RunSetup, RunStart } from '../sim/rules';

/** What the player picked. */
export interface RunChoice {
  world: string;
  level?: number;
  difficulty?: Difficulty;
  /** Developer quick start: begin an endless run on this later day. */
  quickStart?: number;
  /**
   * Developer menu: begin an endless run on any day up to QUICK_START_MAX_DAY, with the belongings of
   * the latest quick start before it. Unlike `quickStart`, any day is taken.
   */
  devDay?: number;
  /** Developer jump: begin a level on this day with fitting belongings. */
  day?: number;
  /** A stored day start of an interrupted level. */
  resume?: { rules: RunRules; start: RunStart; seed: number };
}

/** What the app knows when a run starts. */
export interface RunEnv {
  names: string[];
  fieldW: number;
  /** Hand tier of every player: the host's from its profile, the guest's as it told the host. */
  handTiers: number[];
  /** Developer values. When set, the run does not count. */
  tuning?: Tuning;
  flags?: Flags;
  devRun?: boolean;
  /** A seed chosen from outside (tests, `?seed=`); endless picks a random one otherwise. */
  seed?: number;
}

/** What a finished run brought, already written to the profile. */
export interface Reward {
  /** False when nothing was paid: a developer run, or a run already paid out. */
  counted: boolean;
  /** Cheese newly earned in this run (each of a level's five only once). */
  cheese: number;
  /** This level was won for the first time. */
  firstWin: boolean;
  unlocks: UnlockDef[];
  /** One sentence of story for the win screen. */
  story: string;
  score: ScoreEntry | null;
  /** Level to offer next, or null. */
  nextLevel: number | null;
}

export const noReward = (): Reward => ({ counted: false, cheese: 0, firstWin: false, unlocks: [], story: '', score: null, nextLevel: null });

/** Where the game goes after a run. */
export type NextStep =
  | { to: 'lobby' }
  | { to: 'level'; world: string; level: number };

export type Role = 'solo' | 'host' | 'guest';

export interface GameMode {
  readonly id: string;
  /** Can this mode be started with this profile? (Endless may open only after some levels.) */
  isAvailable(profile: Profile, world: string): boolean;
  /** Builds the run: rules, day planner, starting values. */
  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup;
  /** Pays out the reward into the profile of this device. Safe to call twice: the second call pays nothing. */
  reward(result: RunResult, rules: RunRules, profile: Profile, role: Role): Reward;
  /** Where to go once the result screen is closed. */
  next(result: RunResult, rules: RunRules, profile: Profile): NextStep;
}

/** A run id that will not repeat on this device. */
export function newRunId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
