/**
 * The light randomness of endless: decided by the seed alone, within the spans of the world's
 * endless table, and spread the way the table says over many runs.
 */
import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from '../../src/config/enemies';
import { worldById } from '../../src/config/worlds';
import { EndlessPlanner, endlessRolls } from '../../src/modes/endlessPlanner';
import { waveSeed } from '../../src/sim/plan';
import { Rng } from '../../src/sim/rng';

const TABLE = worldById('fondue').endless;
const planOf = (seed: number, wave: number, players = 1) =>
  new EndlessPlanner(TABLE, 1).plan(wave, { seed, players }, new Rng(waveSeed(seed, wave)));
const SEEDS = Array.from({ length: 2000 }, (_, i) => i * 7919 + 13);

describe('endless randomness', () => {
  it('the same seed gives the same plan, wave after wave', () => {
    for (const wave of [1, 4, 9, 16]) expect(planOf(1234, wave)).toEqual(planOf(1234, wave));
    expect(endlessRolls(TABLE, 99)).toEqual(endlessRolls(TABLE, 99));
  });

  it('different seeds give different runs', () => {
    const firstWaves = new Set(SEEDS.slice(0, 50).map((s) => JSON.stringify(endlessRolls(TABLE, s).firstWave)));
    expect(firstWaves.size).toBeGreaterThan(1);
  });

  it('every raider first appears inside its window from the table, and every wave of the window happens', () => {
    for (const t of ENEMY_TYPES) {
      const [lo, hi] = TABLE.types[t].firstWave;
      const seen = new Set<number>();
      for (const s of SEEDS) {
        const w = endlessRolls(TABLE, s).firstWave[t];
        expect(w).toBeGreaterThanOrEqual(lo);
        expect(w).toBeLessThanOrEqual(hi);
        seen.add(w);
      }
      expect(seen.size).toBe(hi - lo + 1);
    }
  });

  it('a raider never comes before its first wave and always comes in it', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const first = endlessRolls(TABLE, seed).firstWave;
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
    const wave = endlessRolls(TABLE, seed).firstWave.yeti;
    const yetis = planOf(seed, wave).entries.filter((e) => e.type === 'yeti').length;
    expect(yetis).toBeGreaterThanOrEqual(TABLE.types.yeti.firstCount + 1);
  });
});
