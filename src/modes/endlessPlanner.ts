/**
 * Plans the waves of an endless run from a world's endless table: how many raiders come, which
 * types, and in which wave each type first appears. Lightly random, but fully decided by the run's seed.
 */
import { ENEMY_TYPES, type EnemyType } from '../config/enemies';
import { ENDLESS_WAVES } from '../config/waves';
import type { EndlessDef } from '../config/worlds/types';
import { waveSeed, type RunInfo, type WavePlan, type WavePlanner } from '../sim/plan';
import { Rng } from '../sim/rng';
import { enemyCountForWave, scheduleWave } from '../sim/spawn';

/** What a run rolled once: the wave each type first appears in and whether that wave brings one more. */
export interface EndlessRolls {
  firstWave: Record<EnemyType, number>;
  extra: Record<EnemyType, boolean>;
}

/** The rolls of a run. Pure: the same seed gives the same answer, so nothing needs to be stored. */
export function endlessRolls(table: EndlessDef, seed: number): EndlessRolls {
  const rng = new Rng(waveSeed(seed, 0));
  const firstWave = {} as Record<EnemyType, number>;
  const extra = {} as Record<EnemyType, boolean>;
  for (const t of ENEMY_TYPES) {
    const [lo, hi] = table.types[t].firstWave;
    firstWave[t] = lo + Math.floor(rng.next() * (hi - lo + 1));
    extra[t] = rng.next() < table.types[t].extraChance;
  }
  return { firstWave, extra };
}

export class EndlessPlanner implements WavePlanner {
  /** `countScale` is the difficulty's count factor times the tuning's spawn rate. */
  constructor(private table: EndlessDef, private countScale: number) {}

  plan(wave: number, run: RunInfo, rng: Rng): WavePlan {
    const table = this.table;
    const rolls = endlessRolls(table, run.seed);
    const spread = 1 + (rng.next() * 2 - 1) * table.countSpread;
    const total = Math.round(enemyCountForWave(wave, this.countScale, run.players) * spread);
    const known = ENEMY_TYPES.filter((t) => rolls.firstWave[t] <= wave);

    // A type in its first wave always shows up, otherwise its "New enemy" window would be a lie.
    const list: EnemyType[] = [];
    for (const t of known) {
      if (rolls.firstWave[t] !== wave || t === 'grunt') continue;
      const n = table.types[t].firstCount + (rolls.extra[t] ? 1 : 0);
      for (let i = 0; i < n; i++) list.push(t);
    }
    const counts = new Map<EnemyType, number>();
    for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
    while (list.length < total) {
      const t = this.pick(known, counts, wave, rolls, rng);
      counts.set(t, (counts.get(t) ?? 0) + 1);
      list.push(t);
    }
    const land = table.landscapes[Math.floor((wave - 1) / table.wavesPerLandscape) % table.landscapes.length];
    const w = ENDLESS_WAVES;
    const packs = Math.max(1, Math.min(4, Math.round(list.length / 6)));
    return { entries: scheduleWave(list, w.spawnSeconds, packs, rng), pauseAfter: w.pause, night: false, landscape: land, boss: null };
  }

  private pick(known: EnemyType[], counts: Map<EnemyType, number>, wave: number, rolls: EndlessRolls, rng: Rng): EnemyType {
    let sum = 0;
    const weights = known.map((t) => {
      const def = this.table.types[t];
      const cap = Math.ceil(def.maxPerWave * (1 + Math.max(0, wave - rolls.firstWave[t]) * this.table.capGrowth));
      const w = (counts.get(t) ?? 0) >= cap ? 0 : def.weight;
      sum += w;
      return w;
    });
    let r = rng.next() * sum;
    for (let i = 0; i < known.length; i++) {
      r -= weights[i];
      if (r <= 0 && weights[i] > 0) return known[i];
    }
    return 'grunt';
  }
}
