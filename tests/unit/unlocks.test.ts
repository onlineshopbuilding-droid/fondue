/**
 * What progress makes available (src/modes/unlocks.ts): derived from won levels and the castle tier,
 * so nothing of it is stored. Slots open by castle tier only (v0.4). Replaces the old syncUnlocks/star-unlock tests of levels.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../../src/config/keep';
import { SLOTS, SLOT_COUNT } from '../../src/config/slots';
import { CASTLE_TIER_FOR_SLOT, CASTLE_TIER_LEVEL, TABLE_UNLOCK_LEVEL } from '../../src/config/slotTiers';
import { WEAPONS } from '../../src/config/weapons';
import { worldById } from '../../src/config/worlds';
import { weaponUnlockLevel } from '../../src/config/worlds/fondue/unlocks';
import { ENDLESS } from '../../src/modes';
import { completeTutorial } from '../../src/modes/progress';
import {
  castleTierBuyableAt, castleTierUnlocked, coopTableOpen, endlessOpen, openSlots, slotCastleTier, slotIntro, slotOpen,
  slotRole, stationAvailable, syncUnlocks, weaponAvailable, weaponRole,
} from '../../src/modes/unlocks';
import { MemoryProfileStore, Profile } from '../../src/profile';

const W = 'fondue';
const fresh = () => Profile.load(new MemoryProfileStore());

describe('slots', () => {
  it('every slot opens with its castle tier (Damage 1, Slow 2, Gate 3, Support 4, Passive 5), each with an introduction', () => {
    expect(SLOTS.map((s) => [s.role, slotCastleTier(SLOTS.indexOf(s))])).toEqual([
      ['damage', 1], ['slow', 2], ['gate', 3], ['support', 4], ['passive', 5],
    ]);
    for (let i = 0; i < SLOT_COUNT; i++) {
      expect(SLOTS[i].castleTier).toBe(CASTLE_TIER_FOR_SLOT[SLOTS[i].role]);
      expect(slotIntro(i).length).toBeGreaterThan(10);
    }
  });

  it('opens exactly the slots of each castle tier 1..7', async () => {
    const want: Record<number, boolean[]> = {
      1: [true, false, false, false, false],
      2: [true, true, false, false, false],
      3: [true, true, true, false, false],
      4: [true, true, true, true, false],
      5: [true, true, true, true, true],
      6: [true, true, true, true, true],
      7: [true, true, true, true, true],
    };
    for (let tier = 1; tier <= 7; tier++) {
      const p = await fresh();
      completeTutorial(p, W);
      p.edit((d) => { d.keep.castleTier = tier; });
      // In slot order: damage, slow, gate, support, passive.
      expect(openSlots(p, W), `castle tier ${tier}`).toEqual(want[tier]);
    }
  });

  it('slot 0 opens with the tutorial; won campaign levels never open a slot', async () => {
    const p = await fresh();
    expect(openSlots(p, W)).toEqual([false, false, false, false, false]);
    completeTutorial(p, W);
    expect(openSlots(p, W)).toEqual([true, false, false, false, false]);
    for (let l = 1; l <= 100; l++) p.markLevelDone(W, l);
    expect(openSlots(p, W)).toEqual([true, false, false, false, false]);
    p.edit((d) => { d.keep.castleTier = 3; });
    expect(openSlots(p, W)).toEqual([true, true, true, false, false]);
    expect(slotOpen(p, W, SLOT_COUNT)).toBe(false);
    expect(slotOpen(p, W, -1)).toBe(false);
  });

  it('castle tiers become buildable at their won level: 2 at 6 and 7 at 75 (fixed), rising in between, 6 before 75', () => {
    expect(castleTierBuyableAt(1)).toBe(0);
    expect(castleTierBuyableAt(2)).toBe(6);
    expect(castleTierBuyableAt(7)).toBe(75);
    for (let tier = 2; tier <= 7; tier++) expect(castleTierBuyableAt(tier)).toBeGreaterThan(castleTierBuyableAt(tier - 1));
    expect(castleTierBuyableAt(6)).toBeLessThan(75);
    expect(castleTierBuyableAt(0)).toBe(Infinity);
    expect(castleTierBuyableAt(8)).toBe(Infinity);
    expect(CASTLE_TIER_LEVEL).toHaveLength(7);
  });

  it('castleTierUnlocked follows the won level only', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    expect(castleTierUnlocked(p, W, 1)).toBe(true);
    for (let l = 1; l < 6; l++) p.markLevelDone(W, l);
    expect(castleTierUnlocked(p, W, 2)).toBe(false);
    p.markLevelDone(W, 6);
    expect(castleTierUnlocked(p, W, 2)).toBe(true);
    expect(castleTierUnlocked(p, W, 3)).toBe(false);
  });

  it('the endless table opens once level 10 is won, the coop table once level 3 is won, whatever the slots', async () => {
    expect(TABLE_UNLOCK_LEVEL).toEqual({ coop: 3, endless: 10 });
    const p = await fresh();
    completeTutorial(p, W);
    for (let l = 1; l <= 2; l++) p.markLevelDone(W, l);
    expect(coopTableOpen(p, W)).toBe(false);
    p.markLevelDone(W, 3);
    expect(coopTableOpen(p, W)).toBe(true);
    for (let l = 4; l <= 9; l++) p.markLevelDone(W, l);
    expect(endlessOpen(p, W)).toBe(false);
    expect(ENDLESS.isAvailable(p, W)).toBe(false);
    p.markLevelDone(W, 10);
    // Castle tier 1: only the damage slot, and endless is open all the same.
    expect(openSlots(p, W)).toEqual([true, false, false, false, false]);
    expect(endlessOpen(p, W)).toBe(true);
    expect(ENDLESS.isAvailable(p, W)).toBe(true);
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

  it('a weapon also needs its slot open: Sticky Fondue waits for castle tier 2', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    for (let l = 1; l <= 30; l++) p.markLevelDone(W, l);
    expect(weaponAvailable(p, W, 'cheese')).toBe(false);
    p.edit((d) => { d.keep.castleTier = 2; });
    expect(weaponAvailable(p, W, 'cheese')).toBe(true);
    expect(weaponAvailable(p, W, 'mortar')).toBe(false);
  });

  it('the unlock list of the world names every buildable castle tier, weapon and station once, and no slot', () => {
    const unlocks = worldById(W).unlocks;
    expect(unlocks.some((u) => (u.kind as string) === 'slot')).toBe(false);
    expect(unlocks.filter((u) => u.kind === 'castle').map((u) => [u.level, (u as { tier: number }).tier])).toEqual(
      CASTLE_TIER_LEVEL.slice(1).map((level, i) => [level, i + 2]),
    );
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
