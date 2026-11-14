/**
 * The question the simulation asks before each wave: "what arrives now?". A planner answers it from
 * the wave number and a random stream of its own, so the answer never depends on the fight before
 * and a resumed level gets the same waves.
 */
import type { EnemyType } from '../config/enemies';
import type { Landscape } from '../config/waves';
import type { WaveDef } from '../config/worlds/types';
import type { Rng } from './rng';
import { scheduleWave } from './spawn';
import type { SpawnEntry } from './types';

export interface WavePlan {
  /** Arrivals with times in seconds from the start of the wave. */
  entries: SpawnEntry[];
  /** Seconds of breath after the last arrival. */
  pauseAfter: number;
  night: boolean;
  landscape: Landscape;
  boss: string | null;
}

/** What a planner may know about the run it plans for. */
export interface RunInfo { seed: number; players: number }

export interface WavePlanner {
  /** Must be a pure calculation from its arguments. `run.players` scales the count in co-op. */
  plan(wave: number, run: RunInfo, rng: Rng): WavePlan;
}

/** A run whose waves are fixed in advance: a campaign level or the tutorial. */
export class FixedPlanner implements WavePlanner {
  constructor(
    private waves: WaveDef[],
    private landscape: Landscape,
    private opts: { night?: boolean; boss?: string | null; coopFactor?: number } = {},
  ) {}

  plan(wave: number, run: RunInfo, rng: Rng): WavePlan {
    const spec = this.waves[Math.max(0, Math.min(wave, this.waves.length) - 1)];
    const factor = run.players > 1 ? this.opts.coopFactor ?? 1 : 1;
    const types: EnemyType[] = [];
    for (const [type, n] of Object.entries(spec.counts) as [EnemyType, number][]) {
      for (let i = 0; i < Math.round(n * factor); i++) types.push(type);
    }
    const entries = scheduleWave(types, spec.spawnSeconds, spec.packs, rng);
    for (const [type, n] of Object.entries(spec.big ?? {}) as [EnemyType, number][]) {
      // The boss walks in early in its wave, while the field is busy.
      for (let i = 0; i < n; i++) entries.push({ t: spec.spawnSeconds * (0.15 + 0.25 * rng.next()), type, big: true });
    }
    entries.sort((a, b) => a.t - b.t);
    return {
      entries, pauseAfter: spec.pauseAfter, night: this.opts.night ?? false, landscape: this.landscape,
      boss: spec.boss ? this.opts.boss ?? null : null,
    };
  }
}

/** Seed of the random stream of one wave: mixes the run seed with the wave number. */
export function waveSeed(seed: number, wave: number): number {
  let h = (seed ^ 0x9e3779b9) + Math.imul(wave, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) | 0;
}
