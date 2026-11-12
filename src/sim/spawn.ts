/**
 * Helpers for day plans: how many raiders an endless day has, how co-op scales that, and how a
 * list of raiders is spread over the day in packs and a rising drip.
 */
import type { EnemyType } from '../config/enemies';
import { COOP, DAY } from '../config/waves';
import type { Rng } from './rng';
import type { SpawnEntry } from './types';

/** Raiders of an endless day before any random spread. `countScale` is difficulty times the tuning's spawn rate. */
export function enemyCountForDay(day: number, countScale: number, players: number): number {
  const capped = Math.min(day, DAY.softCapDay);
  let n = DAY.base + DAY.perDay * (capped - 1);
  if (day > DAY.softCapDay) n += DAY.perDayAfterCap * (day - DAY.softCapDay);
  n *= countScale;
  if (players > 1) n = n * coopFactor(day) + (COOP.earlyAdjust[day - 1] ?? 0) * countScale;
  return Math.round(n);
}

/**
 * Two hands double the throwing but weapons are shared, so late in a run the second player adds
 * less than early on. The factor stays high first and then eases towards its late value.
 */
export function coopFactor(day: number): number {
  const u = Math.max(0, Math.min(1, (day - COOP.easeFrom) / (COOP.easeTo - COOP.easeFrom)));
  return COOP.countFactor + (COOP.lateFactor - COOP.countFactor) * u;
}

/**
 * Gives every raider of a day its arrival time. Raiders come partly in packs, so the day has swells
 * rather than a steady drip; the first `lead` raiders are spread evenly (new types should be seen).
 */
export function scheduleDay(types: EnemyType[], day: number, seconds: number, rng: Rng, lead = 0): SpawnEntry[] {
  const plan: SpawnEntry[] = [];
  const span = seconds - 3;
  const packCount = DAY.packs + Math.floor(day / DAY.packsPerDays);
  const packTimes: number[] = [];
  for (let i = 0; i < packCount; i++) packTimes.push(1 + ((i + rng.next()) / packCount) * (span - DAY.packSpread - 1));
  types.forEach((type, i) => {
    // Sooner-than-linear density: more raiders late in the day.
    const u = Math.pow(rng.next(), DAY.rampPower);
    const inPack = i >= lead && rng.next() < DAY.packShare;
    const t = inPack ? packTimes[Math.floor(rng.next() * packCount)] + rng.next() * DAY.packSpread : 0.5 + u * span;
    plan.push({ t: Math.max(0.3, Math.min(seconds - 0.5, t)), type });
  });
  plan.sort((a, b) => a.t - b.t);
  return plan;
}
