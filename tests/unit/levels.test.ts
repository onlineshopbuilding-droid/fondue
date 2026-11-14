/**
 * The 100 generated campaign levels of world 1. (How progress turns into unlocks, v0.3: tests/unit/unlocks.test.ts.)
 */
import { describe, expect, it, vi } from 'vitest';
import { ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { worldById } from '../../src/config/worlds';
import type { LevelDef } from '../../src/config/worlds/types';

const W = 'fondue';
const LEVELS = worldById(W).campaign;
const typesIn = (l: LevelDef): Set<EnemyType> => {
  const s = new Set<EnemyType>();
  for (const w of l.waves) for (const [t, n] of [...Object.entries(w.counts), ...Object.entries(w.big ?? {})] as [EnemyType, number][]) if (n > 0) s.add(t);
  return s;
};

describe('level generation', () => {
  it('has 100 levels, numbered 1 to 100, each with at least three waves and a planned length', () => {
    expect(LEVELS).toHaveLength(100);
    LEVELS.forEach((l, i) => {
      expect(l.id).toBe(i + 1);
      expect(l.waves.length).toBeGreaterThanOrEqual(3);
      expect(l.targetSeconds).toBeGreaterThan(0);
      expect(l.power).toBeGreaterThanOrEqual(1);
    });
  });

  it('is fixed: building the table again gives exactly the same levels', async () => {
    vi.resetModules();
    const fresh = await import('../../src/config/worlds/fondue/campaign');
    expect(JSON.parse(JSON.stringify(fresh.buildCampaign()))).toEqual(JSON.parse(JSON.stringify(LEVELS)));
  });

  it('every raider has one first level: it is announced there, shows up there, and never earlier', () => {
    for (const t of ENEMY_TYPES) {
      const first = LEVELS.filter((l) => l.newEnemies.includes(t));
      expect(first, t).toHaveLength(1);
      const level = first[0];
      expect(typesIn(level).has(t), `${t} in level ${level.id}`).toBe(true);
      for (const l of LEVELS.filter((x) => x.id < level.id)) expect(typesIn(l).has(t), `${t} before level ${level.id}`).toBe(false);
    }
  });

  it('every tenth level is a boss level, and only those', () => {
    for (const l of LEVELS) {
      if (l.id % 10 === 0) {
        expect(l.boss, `level ${l.id}`).not.toBeNull();
        // v0.2 compared stars; v0.3 has none: the boss level is stronger and longer than the level before.
        expect(l.power).toBeGreaterThan(LEVELS[l.id - 2].power);
        expect(l.targetSeconds).toBeGreaterThan(LEVELS[l.id - 2].targetSeconds);
        expect(l.waves[l.waves.length - 1].boss).toBe(true);
      } else {
        expect(l.boss, `level ${l.id}`).toBeNull();
      }
    }
  });

  it('a boss level\'s last wave is bigger than its first', () => {
    const total = (w: LevelDef['waves'][number]) => Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0);
    for (const l of LEVELS.filter((x) => x.boss)) expect(total(l.waves[l.waves.length - 1])).toBeGreaterThan(total(l.waves[0]));
  });

  it('twist levels do what their twist says', () => {
    const twisted = LEVELS.filter((l) => l.twist);
    expect(twisted.length).toBeGreaterThan(5);
    for (const l of twisted) {
      const twist = l.twist!;
      if (twist.kind === 'night') expect(l.night).toBe(true);
      if (twist.kind === 'onlyTypes') for (const t of typesIn(l)) expect(twist.types).toContain(t);
      if (twist.kind === 'flood') expect(typesIn(l).has(twist.type)).toBe(true);
    }
    for (const l of LEVELS.filter((x) => !x.twist || x.twist.kind !== 'night')) expect(l.night).toBe(false);
  });
});
