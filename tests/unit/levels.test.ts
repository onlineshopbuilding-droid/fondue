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
  for (const d of l.days) for (const [t, n] of Object.entries(d.counts) as [EnemyType, number][]) if (n > 0) s.add(t);
  return s;
};

describe('level generation', () => {
  it('has 100 levels, numbered 1 to 100, each with at least one day', () => {
    expect(LEVELS).toHaveLength(100);
    LEVELS.forEach((l, i) => {
      expect(l.id).toBe(i + 1);
      expect(l.days.length).toBeGreaterThan(0);
      expect(l.stars).toBeGreaterThan(0);
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
        expect(l.stars).toBeGreaterThan(LEVELS[l.id - 2].stars);
      } else {
        expect(l.boss, `level ${l.id}`).toBeNull();
      }
    }
  });

  it('a boss level\'s last day is bigger than its first', () => {
    const total = (d: LevelDef['days'][number]) => Object.values(d.counts).reduce((a, b) => a + (b ?? 0), 0);
    for (const l of LEVELS.filter((x) => x.boss)) expect(total(l.days[l.days.length - 1])).toBeGreaterThan(total(l.days[0]));
  });

  it('twist levels do what their twist says', () => {
    const twisted = LEVELS.filter((l) => l.twist);
    expect(twisted.length).toBeGreaterThan(5);
    for (const l of twisted) {
      const twist = l.twist!;
      if (twist.kind === 'night') expect(l.days.every((d) => d.night)).toBe(true);
      if (twist.kind === 'onlyTypes') for (const t of typesIn(l)) expect(twist.types).toContain(t);
      if (twist.kind === 'flood') expect(typesIn(l).has(twist.type)).toBe(true);
    }
    for (const l of LEVELS.filter((x) => !x.twist || x.twist.kind !== 'night')) expect(l.days.some((d) => d.night)).toBe(false);
  });
});
