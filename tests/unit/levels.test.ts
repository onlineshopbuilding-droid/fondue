/**
 * The 100 generated campaign levels of world 1, and how campaign progress turns into unlocks
 * in the profile (syncUnlocks, the price of a weapon's first unlock).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { STARS } from '../../src/config/stars';
import { worldById } from '../../src/config/worlds';
import type { LevelDef } from '../../src/config/worlds/types';
import { buyWeaponUnlock, maxGateTier, maxHandTier, syncUnlocks, weaponAvailable } from '../../src/modes';
import { newProfile } from './helpers';

const W = 'fondue';
const LEVELS = worldById(W).campaign;
const UNLOCKS = worldById(W).unlocks;
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

describe('syncUnlocks', () => {
  const firstWeapon = UNLOCKS.find((u) => u.kind === 'weapon' && u.level > 1)!;
  const weaponId = firstWeapon.kind === 'weapon' ? firstWeapon.weapon : '';

  it('a fresh profile has only what no win is needed for', async () => {
    const p = await newProfile();
    syncUnlocks(p, W);
    for (const u of UNLOCKS.filter((x) => x.kind === 'weapon')) {
      if (u.kind === 'weapon') expect(p.hasWeapon(u.weapon)).toBe(u.level <= 0);
    }
  });

  it('gives what the won levels bring, nothing more, and only once', async () => {
    const p = await newProfile();
    for (let l = 1; l < firstWeapon.level; l++) p.markLevelDone(W, l);
    syncUnlocks(p, W);
    expect(p.hasWeapon(weaponId)).toBe(false);
    p.markLevelDone(W, firstWeapon.level);
    syncUnlocks(p, W);
    expect(p.hasWeapon(weaponId)).toBe(true);
    const before = JSON.stringify(p.data.unlockedWeapons);
    syncUnlocks(p, W);
    expect(JSON.stringify(p.data.unlockedWeapons)).toBe(before);
  });

  it('brings an old profile up to date: everything up to its highest win', async () => {
    const p = await newProfile();
    p.markLevelDone(W, 50);
    syncUnlocks(p, W);
    for (const u of UNLOCKS.filter((x) => x.level <= 50)) {
      if (u.kind === 'weapon') expect(p.hasWeapon(u.weapon)).toBe(true);
      if (u.kind === 'slot') expect(p.hasSlot(u.slot)).toBe(true);
      if (u.kind === 'station') expect(p.hasStation(u.station)).toBe(true);
    }
    for (const u of UNLOCKS.filter((x) => x.level > 50)) if (u.kind === 'weapon') expect(p.hasWeapon(u.weapon)).toBe(false);
  });

  it('gate and hand tiers follow progress without an entry in the profile', async () => {
    const p = await newProfile();
    expect(maxHandTier(p, W)).toBe(1);
    p.markLevelDone(W, 100);
    expect(maxGateTier(p, W)).toBeGreaterThan(0);
    expect(maxHandTier(p, W)).toBeGreaterThan(1);
  });
});

describe('price of a weapon\'s first unlock', () => {
  const saved = STARS.weaponUnlock;
  afterEach(() => { STARS.weaponUnlock = saved; });
  const unlock = UNLOCKS.find((u) => u.kind === 'weapon' && u.level > 1)!;
  const id = unlock.kind === 'weapon' ? unlock.weapon : '';

  it('at 0 the weapon is simply unlocked by the win', async () => {
    STARS.weaponUnlock = 0;
    const p = await newProfile();
    p.markLevelDone(W, unlock.level);
    syncUnlocks(p, W);
    expect(p.hasWeapon(id)).toBe(true);
  });

  it('above 0 the win only makes it available; the armoury sells it for that many stars', async () => {
    STARS.weaponUnlock = 4;
    const p = await newProfile();
    expect(buyWeaponUnlock(p, W, id)).toBe(false);
    p.markLevelDone(W, unlock.level);
    syncUnlocks(p, W);
    expect(p.hasWeapon(id)).toBe(false);
    expect(weaponAvailable(p, W, id)).toBe(true);
    p.addStars(3);
    expect(buyWeaponUnlock(p, W, id)).toBe(false);
    expect(p.data.stars).toBe(3);
    p.addStars(2);
    expect(buyWeaponUnlock(p, W, id)).toBe(true);
    expect(p.hasWeapon(id)).toBe(true);
    expect(p.data.stars).toBe(1);
    expect(buyWeaponUnlock(p, W, id)).toBe(true);
    expect(p.data.stars).toBe(1);
  });
});
