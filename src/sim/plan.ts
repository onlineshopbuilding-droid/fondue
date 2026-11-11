/**
 * The question the simulation asks before each day: "what arrives today?". A planner answers it
 * from the day number and a random stream of its own, so the answer never depends on the fight before.
 */
import type { EnemyType } from '../config/enemies';
import { DAY, type Landscape } from '../config/waves';
import type { Rng } from './rng';
import { scheduleDay } from './spawn';
import type { SpawnEntry } from './types';

export interface DayPlan {
  entries: SpawnEntry[];
  /** Seconds until nightfall. */
  seconds: number;
  night: boolean;
  landscape: Landscape;
  boss: string | null;
}

/** What a planner may know about the run it plans for. */
export interface RunInfo { seed: number; players: number }

export interface DayPlanner {
  /** Must be a pure calculation from its arguments. `run.players` scales the count in co-op. */
  plan(day: number, run: RunInfo, rng: Rng): DayPlan;
}

/** One day written down as data: how many of each type, and a few extras. */
export interface DaySpec {
  counts: Partial<Record<EnemyType, number>>;
  night?: boolean;
  seconds?: number;
  /** Raiders that arrive oversized (boss days). */
  big?: Partial<Record<EnemyType, number>>;
  boss?: string | null;
}

/** A run whose days are fixed in advance: a campaign level or the tutorial. */
export class FixedPlanner implements DayPlanner {
  constructor(private days: DaySpec[], private landscape: Landscape, private coopCount: (day: number) => number = () => 1) {}

  plan(day: number, run: RunInfo, rng: Rng): DayPlan {
    const spec = this.days[Math.min(day, this.days.length) - 1];
    const factor = run.players > 1 ? this.coopCount(day) : 1;
    const seconds = spec.seconds ?? DAY.seconds;
    const types: EnemyType[] = [];
    for (const [type, n] of Object.entries(spec.counts) as [EnemyType, number][]) {
      for (let i = 0; i < Math.round(n * factor); i++) types.push(type);
    }
    const entries = scheduleDay(types, day, seconds, rng);
    for (const [type, n] of Object.entries(spec.big ?? {}) as [EnemyType, number][]) {
      // Bosses walk in around the middle of the day, when the field is already busy.
      for (let i = 0; i < n; i++) entries.push({ t: seconds * (0.35 + 0.3 * rng.next()), type, big: true });
    }
    entries.sort((a, b) => a.t - b.t);
    return { entries, seconds, night: spec.night ?? false, landscape: this.landscape, boss: spec.boss ?? null };
  }
}

/** Seed of the random stream of one day: mixes the run seed with the day number. */
export function daySeed(seed: number, day: number): number {
  let h = (seed ^ 0x9e3779b9) + Math.imul(day, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) | 0;
}
