/**
 * Developer cheats (F2): each cheat changes the profile for good and marks it as changed by cheats;
 * the reset gives an unmarked, fresh profile; the second-hand switch is a setting, not a cheat.
 */
import { describe, expect, it } from 'vitest';
import { SECOND_HAND_FLAG, secondHandSimulated } from '../../src/config/flags';
import { STATIONS } from '../../src/config/keep';
import { TIER_MAX } from '../../src/config/tiers';
import { weaponById } from '../../src/config/weapons';
import { DEFAULT_WORLD } from '../../src/config/worlds';
import {
  CHEAT_BADGE, cheatBadge, cheatsUsed, giveCheese, giveCrests, giveGold, resetProfile, setCastleTier, setHandTier,
  setSecondHandSimulated, setStationTier, setWeaponTier, unlockEverything, unlockLevels,
} from '../../src/modes/cheats';
import { importCode, MemoryProfileStore, Profile } from '../../src/profile';
import { slotOpen } from '../../src/modes/unlocks';

const W = DEFAULT_WORLD;
const fresh = (): Promise<Profile> => Profile.load(new MemoryProfileStore());

describe('developer cheats', () => {
  it('a fresh profile carries no cheat mark', async () => {
    const p = await fresh();
    expect(cheatsUsed(p)).toBe(false);
    expect(cheatBadge(p)).toBeNull();
  });

  it('gives gold, cheese and crests, marks the profile and keeps "earned" honest', async () => {
    const p = await fresh();
    expect(giveGold(p, 5000)).toBe(5000);
    expect(giveCheese(p, 50)).toBe(50);
    expect(giveCrests(p, 40)).toBe(40);
    expect(p.data.wallet).toEqual({ cheese: 50, gold: 5000, crests: 40 });
    expect(p.data.earned).toEqual({ cheese: 0, gold: 0, crests: 0 });
    expect(cheatBadge(p)).toBe(CHEAT_BADGE);
    expect(p.data.cheats.log.join('\n')).toContain('gold +5000');
    expect(giveGold(p, -3)).toBe(0);
    expect(giveGold(p, Number.NaN)).toBe(0);
  });

  it('the mark survives saving: it travels in the export code', async () => {
    const p = await fresh();
    giveGold(p, 1);
    expect(importCode(p.exportCode()).cheats.used).toBe(true);
  });

  it('unlocks levels: they count as won and open the slots', async () => {
    const p = await fresh();
    expect(slotOpen(p, W, 4)).toBe(false);
    unlockLevels(p, W, 12);
    expect(p.highestLevelDone(W)).toBe(12);
    expect(slotOpen(p, W, 4)).toBe(true);
    expect(p.hasWeapon('wheel')).toBe(true);
    expect(cheatsUsed(p)).toBe(true);
    unlockLevels(p, W, 100000);
    expect(p.highestLevelDone(W)).toBeLessThanOrEqual(100);
  });

  it('sets any weapon tier directly, owns the weapon and keeps tiers within 1..7', async () => {
    const p = await fresh();
    const id = 'forks';
    expect(weaponById(id)).toBeDefined();
    expect(setWeaponTier(p, W, id, 5)).toBe(true);
    expect(p.weaponTier(id)).toBe(5);
    setWeaponTier(p, W, id, 99);
    expect(p.weaponTier(id)).toBe(TIER_MAX);
    setWeaponTier(p, W, id, 0);
    expect(p.weaponTier(id)).toBe(1);
    expect(setWeaponTier(p, W, 'no-such-weapon', 3)).toBe(false);
    expect(cheatsUsed(p)).toBe(true);
  });

  it('a weapon set by cheat goes into its open, empty slot', async () => {
    const p = await fresh();
    unlockLevels(p, W, 3);
    setWeaponTier(p, W, 'cheese', 2);
    expect(p.data.keep.loadout[1]).toBe('cheese');
  });

  it('sets castle, hand and station tiers', async () => {
    const p = await fresh();
    expect(setCastleTier(p, 6)).toBe(6);
    expect(p.data.keep.castleTier).toBe(6);
    expect(setCastleTier(p, 12)).toBe(TIER_MAX);
    expect(setHandTier(p, 7)).toBe(7);
    expect(p.data.keep.handTier).toBe(7);
    expect(setHandTier(p, -1)).toBe(1);
    expect(setStationTier(p, 'cauldron', 3)).toBe(3);
    expect(p.data.keep.stations.cauldron).toBe(3);
    expect(setStationTier(p, 'cauldron', 99)).toBe(STATIONS.cauldron.tiers.length);
    expect(setStationTier(p, 'perch', 0)).toBe(0);
    expect(cheatsUsed(p)).toBe(true);
  });

  it('unlocks everything: all slots open, every weapon and station owned', async () => {
    const p = await fresh();
    unlockEverything(p, W);
    for (let s = 0; s < 5; s++) expect(slotOpen(p, W, s)).toBe(true);
    expect(p.hasWeapon('forks')).toBe(true);
    expect(p.data.keep.stations.cauldron).toBeGreaterThanOrEqual(1);
    expect(p.data.keep.stations.perch).toBeGreaterThanOrEqual(1);
    expect(p.data.keep.loadout.every((id) => id !== null)).toBe(true);
    expect(cheatsUsed(p)).toBe(true);
  });

  it('reset erases everything, including the mark, and gives a new profile id', async () => {
    const p = await fresh();
    const id = p.data.profileId;
    giveGold(p, 999);
    resetProfile(p, W);
    expect(p.data.wallet.gold).toBe(0);
    expect(cheatsUsed(p)).toBe(false);
    expect(p.data.profileId).not.toBe(id);
  });

  it('the simulated second hand is a stored switch, not a cheat', async () => {
    const p = await fresh();
    expect(secondHandSimulated(p.data.settings.flags)).toBe(false);
    setSecondHandSimulated(p, true);
    expect(p.data.settings.flags[SECOND_HAND_FLAG]).toBe('on');
    expect(secondHandSimulated(p.data.settings.flags)).toBe(true);
    expect(cheatsUsed(p)).toBe(false);
    setSecondHandSimulated(p, false);
    expect(secondHandSimulated(p.data.settings.flags)).toBe(false);
  });
});
