/**
 * The light randomness of endless: decided by the seed alone, within the spans of the world's
 * endless table, and spread the way the table says over many runs.
 */
import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from '../../src/config/enemies';
import { worldById } from '../../src/config/worlds';
import { EndlessPlanner, endlessRolls } from '../../src/modes/endlessPlanner';
import { daySeed } from '../../src/sim/plan';
import { Rng } from '../../src/sim/rng';

const TABLE = worldById('fondue').endless;
const planOf = (seed: number, day: number, players = 1) =>
  new EndlessPlanner(TABLE, 1).plan(day, { seed, players }, new Rng(daySeed(seed, day)));
const SEEDS = Array.from({ length: 2000 }, (_, i) => i * 7919 + 13);

describe('endless randomness', () => {
  it('the same seed gives the same plan, day after day', () => {
    for (const day of [1, 4, 9, 16]) expect(planOf(1234, day)).toEqual(planOf(1234, day));
    expect(endlessRolls(TABLE, 99)).toEqual(endlessRolls(TABLE, 99));
  });

  it('different seeds give different runs', () => {
    const firstDays = new Set(SEEDS.slice(0, 50).map((s) => JSON.stringify(endlessRolls(TABLE, s).firstDay)));
    expect(firstDays.size).toBeGreaterThan(1);
  });

  it('every raider first appears inside its window from the table, and every day of the window happens', () => {
    for (const t of ENEMY_TYPES) {
      const [lo, hi] = TABLE.types[t].firstDay;
      const seen = new Set<number>();
      for (const s of SEEDS) {
        const d = endlessRolls(TABLE, s).firstDay[t];
        expect(d).toBeGreaterThanOrEqual(lo);
        expect(d).toBeLessThanOrEqual(hi);
        seen.add(d);
      }
      expect(seen.size).toBe(hi - lo + 1);
    }
  });

  it('a raider never comes before its first day and always comes on it', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const first = endlessRolls(TABLE, seed).firstDay;
      for (const t of ENEMY_TYPES.filter((x) => x !== 'grunt')) {
        const before = planOf(seed, first[t] - 1).entries.filter((e) => e.type === t).length;
        const on = planOf(seed, first[t]).entries.filter((e) => e.type === t).length;
        expect(before).toBe(0);
        expect(on).toBeGreaterThanOrEqual(TABLE.types[t].firstCount);
      }
    }
  });

  it('the Yeti brings an extra one about as often as the table says, and then really brings two', () => {
    const chance = TABLE.types.yeti.extraChance;
    const extra = SEEDS.filter((s) => endlessRolls(TABLE, s).extra.yeti);
    expect(extra.length / SEEDS.length).toBeGreaterThan(chance - 0.04);
    expect(extra.length / SEEDS.length).toBeLessThan(chance + 0.04);
    const seed = extra[0];
    const day = endlessRolls(TABLE, seed).firstDay.yeti;
    const yetis = planOf(seed, day).entries.filter((e) => e.type === 'yeti').length;
    expect(yetis).toBeGreaterThanOrEqual(TABLE.types.yeti.firstCount + 1);
  });
});
