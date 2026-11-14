/**
 * What campaign progress makes available (src/modes/unlocks.ts): derived from won levels only, so
 * nothing of it is stored. Replaces the old syncUnlocks/star-unlock tests of levels.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../../src/config/keep';
import { SLOT_COUNT } from '../../src/config/slots';
import { WEAPONS } from '../../src/config/weapons';
import { worldById } from '../../src/config/worlds';
import { slotUnlockLevel, weaponUnlockLevel } from '../../src/config/worlds/fondue/unlocks';
import { ENDLESS } from '../../src/modes';
import { completeTutorial } from '../../src/modes/progress';
import {
  endlessOpen, openSlots, slotIntro, slotOpen, slotRole, stationAvailable, syncUnlocks, weaponAvailable, weaponRole,
} from '../../src/modes/unlocks';
import { MemoryProfileStore, Profile } from '../../src/profile';

const W = 'fondue';
const fresh = () => Profile.load(new MemoryProfileStore());

describe('slots', () => {
  it('all five slots open within the first 15 levels, in rising order, each with an introduction', () => {
    for (let i = 0; i < SLOT_COUNT; i++) {
      expect(slotUnlockLevel(i)).toBeLessThanOrEqual(15);
      if (i > 0) expect(slotUnlockLevel(i)).toBeGreaterThan(slotUnlockLevel(i - 1));
      expect(slotIntro(i).length).toBeGreaterThan(10);
    }
  });

  it('slot 0 opens with the tutorial, the others with their won level', async () => {
    const p = await fresh();
    expect(openSlots(p, W)).toEqual([false, false, false, false, false]);
    completeTutorial(p, W);
    expect(openSlots(p, W)).toEqual([true, false, false, false, false]);
    for (let i = 1; i < SLOT_COUNT; i++) {
      const level = slotUnlockLevel(i);
      for (let l = 1; l < level; l++) p.markLevelDone(W, l);
      expect(slotOpen(p, W, i)).toBe(false);
      p.markLevelDone(W, level);
      expect(slotOpen(p, W, i)).toBe(true);
    }
    expect(slotOpen(p, W, SLOT_COUNT)).toBe(false);
  });

  it('endless opens with the last slot', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    expect(endlessOpen(p, W)).toBe(false);
    for (let l = 1; l <= slotUnlockLevel(SLOT_COUNT - 1); l++) p.markLevelDone(W, l);
    expect(endlessOpen(p, W)).toBe(true);
    expect(ENDLESS).toBeDefined();
  });

  it('every weapon fits exactly one slot role, and every slot has weapons', () => {
    const roles = Array.from({ length: SLOT_COUNT }, (_, i) => slotRole(i));
    expect(new Set(roles).size).toBe(SLOT_COUNT);
    for (const w of WEAPONS.filter((x) => x.enabled)) expect(roles).toContain(weaponRole(w));
    for (const role of roles) expect(WEAPONS.some((w) => w.enabled && weaponRole(w) === role)).toBe(true);
  });
});

describe('weapons and stations', () => {
  it('become buyable at their level, derived from won levels only', async () => {
    const p = await fresh();
    const late = WEAPONS.find((w) => w.enabled && (weaponUnlockLevel(w.id) ?? 0) > 1)!;
    const level = weaponUnlockLevel(late.id)!;
    for (let l = 1; l < level; l++) p.markLevelDone(W, l);
    expect(weaponAvailable(p, W, late.id)).toBe(false);
    p.markLevelDone(W, level);
    expect(weaponAvailable(p, W, late.id)).toBe(true);
    expect(stationAvailable(p, W, 'perch')).toBe(level >= STATIONS.perch.unlockLevel);
  });

  it('the unlock list of the world names every slot, weapon and station once', () => {
    const unlocks = worldById(W).unlocks;
    expect(unlocks.filter((u) => u.kind === 'slot')).toHaveLength(SLOT_COUNT);
    expect(unlocks.filter((u) => u.kind === 'weapon')).toHaveLength(WEAPONS.filter((w) => w.enabled).length);
    expect(unlocks.filter((u) => u.kind === 'station')).toHaveLength(2);
  });

  it('syncUnlocks only hands out the free Rolling Wheel, and only after the tutorial', async () => {
    const p = await fresh();
    syncUnlocks(p, W);
    expect(p.data.keep.weapons).toEqual({});
    p.markLevelDone(W, 30);
    syncUnlocks(p, W);
    expect(Object.keys(p.data.keep.weapons)).toEqual(['wheel']);
  });
});
