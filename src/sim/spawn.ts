import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../config/enemies';
import { COOP, DAY, DIFFICULTIES, type Difficulty } from '../config/waves';
import type { Rng } from './rng';
import type { SpawnEntry } from './types';

export function enemyCountForDay(day: number, difficulty: Difficulty, players: number, spawnRate: number): number {
  const capped = Math.min(day, DAY.softCapDay);
  let n = DAY.base + DAY.perDay * (capped - 1);
  if (day > DAY.softCapDay) n += DAY.perDayAfterCap * (day - DAY.softCapDay);
  n *= DIFFICULTIES[difficulty].count * spawnRate;
  if (players > 1) n = n * coopFactor(day) + (COOP.earlyAdjust[day - 1] ?? 0) * DIFFICULTIES[difficulty].count * spawnRate;
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

export function unlockedTypes(day: number): EnemyType[] {
  return ENEMY_TYPES.filter((t) => ENEMIES[t].firstDay <= day);
}

/** Types whose first appearance is on exactly this day. */
export function newTypesOnDay(day: number): EnemyType[] {
  return ENEMY_TYPES.filter((t) => ENEMIES[t].firstDay === day);
}

/** Builds the sorted list of spawn times for one day. */
export function buildDayPlan(day: number, difficulty: Difficulty, players: number, spawnRate: number, rng: Rng): SpawnEntry[] {
  const total = enemyCountForDay(day, difficulty, players, spawnRate);
  const types = unlockedTypes(day);
  const counts = new Map<EnemyType, number>();
  const plan: SpawnEntry[] = [];

  // A freshly unlocked type always shows up a few times, otherwise the tip would be a lie.
  const guaranteed: EnemyType[] = [];
  for (const t of newTypesOnDay(day)) {
    const n = t === 'yeti' || t === 'siegeCart' ? 1 : 3;
    for (let i = 0; i < n; i++) guaranteed.push(t);
  }

  const span = DAY.seconds - 3;
  // Raiders come partly in packs, so the day has swells rather than a steady drip.
  const packCount = DAY.packs + Math.floor(day / DAY.packsPerDays);
  const packTimes: number[] = [];
  for (let i = 0; i < packCount; i++) packTimes.push(1 + ((i + rng.next()) / packCount) * (span - DAY.packSpread - 1));
  for (let i = 0; i < total; i++) {
    let type: EnemyType;
    if (i < guaranteed.length) {
      type = guaranteed[i];
    } else {
      type = pickWeighted(types, counts, day, rng);
    }
    counts.set(type, (counts.get(type) ?? 0) + 1);
    // Sooner-than-linear density: more enemies late in the day.
    const u = Math.pow(rng.next(), DAY.rampPower);
    const inPack = i >= guaranteed.length && rng.next() < DAY.packShare;
    const t = inPack ? packTimes[Math.floor(rng.next() * packCount)] + rng.next() * DAY.packSpread : 0.5 + u * span;
    plan.push({ t, type });
  }
  plan.sort((a, b) => a.t - b.t);
  return plan;
}

function pickWeighted(types: EnemyType[], counts: Map<EnemyType, number>, day: number, rng: Rng): EnemyType {
  let sum = 0;
  const weights = types.map((t) => {
    const def = ENEMIES[t];
    const cap = Math.ceil(def.maxPerDay * (1 + Math.max(0, day - def.firstDay) * 0.15));
    const w = (counts.get(t) ?? 0) >= cap ? 0 : def.weight;
    sum += w;
    return w;
  });
  let r = rng.next() * sum;
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0 && weights[i] > 0) return types[i];
  }
  return 'grunt';
}
