/**
 * Plans the days of an endless run from a world's endless table: how many raiders come, which
 * types, and when each type first appears. Lightly random, but fully decided by the run's seed.
 */
import { ENEMY_TYPES, type EnemyType } from '../config/enemies';
import { DAY } from '../config/waves';
import type { EndlessDef } from '../config/worlds/types';
import { daySeed, type DayPlan, type DayPlanner, type RunInfo } from '../sim/plan';
import { Rng } from '../sim/rng';
import { enemyCountForDay, scheduleDay } from '../sim/spawn';

/** What a run rolled once: the day each type first appears and whether that day brings one more. */
export interface EndlessRolls {
  firstDay: Record<EnemyType, number>;
  extra: Record<EnemyType, boolean>;
}

/** The rolls of a run. Pure: the same seed gives the same answer, so nothing needs to be stored. */
export function endlessRolls(table: EndlessDef, seed: number): EndlessRolls {
  const rng = new Rng(daySeed(seed, 0));
  const firstDay = {} as Record<EnemyType, number>;
  const extra = {} as Record<EnemyType, boolean>;
  for (const t of ENEMY_TYPES) {
    const [lo, hi] = table.types[t].firstDay;
    firstDay[t] = lo + Math.floor(rng.next() * (hi - lo + 1));
    extra[t] = rng.next() < table.types[t].extraChance;
  }
  return { firstDay, extra };
}

export class EndlessPlanner implements DayPlanner {
  /** `countScale` is the difficulty's count factor times the tuning's spawn rate. */
  constructor(private table: EndlessDef, private countScale: number) {}

  plan(day: number, run: RunInfo, rng: Rng): DayPlan {
    const table = this.table;
    const rolls = endlessRolls(table, run.seed);
    const spread = 1 + (rng.next() * 2 - 1) * table.countSpread;
    const total = Math.round(enemyCountForDay(day, this.countScale, run.players) * spread);
    const known = ENEMY_TYPES.filter((t) => rolls.firstDay[t] <= day);

    // A type on its first day always shows up, otherwise its "New enemy" window would be a lie.
    const list: EnemyType[] = [];
    for (const t of known) {
      if (rolls.firstDay[t] !== day || t === 'grunt') continue;
      const n = table.types[t].firstCount + (rolls.extra[t] ? 1 : 0);
      for (let i = 0; i < n; i++) list.push(t);
    }
    const lead = list.length;
    const counts = new Map<EnemyType, number>();
    for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
    while (list.length < total) {
      const t = this.pick(known, counts, day, rolls, rng);
      counts.set(t, (counts.get(t) ?? 0) + 1);
      list.push(t);
    }
    const land = table.landscapes[Math.floor((day - 1) / table.daysPerLandscape) % table.landscapes.length];
    return { entries: scheduleDay(list, day, DAY.seconds, rng, lead), seconds: DAY.seconds, night: false, landscape: land, boss: null };
  }

  private pick(known: EnemyType[], counts: Map<EnemyType, number>, day: number, rolls: EndlessRolls, rng: Rng): EnemyType {
    let sum = 0;
    const weights = known.map((t) => {
      const def = this.table.types[t];
      const cap = Math.ceil(def.maxPerDay * (1 + Math.max(0, day - rolls.firstDay[t]) * 0.15));
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
