/**
 * Helpers for wave plans: how many raiders an endless wave has, and how a list of raiders is spread
 * over a wave in a few bunches.
 */
import type { EnemyType } from '../config/enemies';
import { COOP, ENDLESS_WAVES } from '../config/waves';
import type { Rng } from './rng';
import type { SpawnEntry } from './types';

/** Raiders of an endless wave before any random spread. `countScale` is difficulty times the tuning's spawn rate. */
export function enemyCountForWave(wave: number, countScale: number, players: number): number {
  const w = ENDLESS_WAVES;
  const capped = Math.min(wave, w.softCapWave);
  let n = w.base + w.perWave * (capped - 1);
  if (wave > w.softCapWave) n += w.perWaveAfterCap * (wave - w.softCapWave);
  if (wave % w.spikeEvery === 0) n *= w.spikeFactor;
  n *= countScale;
  if (players > 1) n *= COOP.countFactor;
  return Math.max(1, Math.round(n));
}

/**
 * Gives every raider of a wave its arrival time, in seconds from the wave's start. The first one
 * comes at once; the rest arrive in `packs` bunches spread over `seconds`, so a wave swells instead
 * of dripping. The gap between two arrivals stays short (the field-empty rule in WaveFlow covers the rest).
 */
export function scheduleWave(types: EnemyType[], seconds: number, packs: number, rng: Rng): SpawnEntry[] {
  const plan: SpawnEntry[] = [];
  const n = types.length;
  if (n === 0) return plan;
  const bunches = Math.max(1, Math.min(packs, n));
  const span = Math.max(0, seconds);
  // Mix the types, so a bunch is not all of one kind.
  const order = types.map((t) => ({ t, k: rng.next() })).sort((a, b) => a.k - b.k).map((o) => o.t);
  const perBunch = Math.ceil(n / bunches);
  order.forEach((type, i) => {
    const b = Math.floor(i / perBunch);
    const start = bunches === 1 ? 0 : (b / bunches) * span;
    const width = span / bunches;
    const inBunch = i - b * perBunch;
    const count = Math.min(perBunch, n - b * perBunch);
    const t = i === 0 ? 0 : start + (count > 1 ? (inBunch / count) * width * 0.85 : 0) + rng.next() * width * 0.1;
    plan.push({ t: Math.max(0, Math.min(span, t)), type });
  });
  plan.sort((a, b) => a.t - b.t);
  return plan;
}
