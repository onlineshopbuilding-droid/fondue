/**
 * Turns the unlock table of a world into what a profile may use: which unlocks a level brings,
 * and writing them into the profile. Everything here reads the table; nothing is hard-coded.
 */
import { STARS } from '../config/stars';
import { worldById } from '../config/worlds';
import type { UnlockDef } from '../config/worlds/types';
import type { Profile } from '../profile';

/** The unlocks that winning exactly this level brings. */
export function unlocksOfLevel(world: string, level: number): UnlockDef[] {
  return worldById(world).unlocks.filter((u) => u.level === level);
}

/** Stars the armoury asks for the first unlock of a weapon the campaign has made available; 0 = free. */
export const weaponUnlockPrice = (): number => STARS.weaponUnlock;

/**
 * Writes one unlock into the profile. Gates and hand tiers need no entry: they follow from progress.
 * A weapon with an unlock price only becomes available; the armoury sells it (`buyWeaponUnlock`).
 */
function grant(profile: Profile, u: UnlockDef): boolean {
  if (u.kind === 'slot') return profile.unlockSlot(u.slot);
  if (u.kind === 'weapon') return weaponUnlockPrice() > 0 ? false : profile.unlockWeapon(u.weapon);
  if (u.kind === 'station') return profile.unlockStation(u.station);
  return false;
}

/**
 * Makes sure the profile has everything its campaign progress entitles it to. Called at start-up
 * and after every win, so a changed table reaches old profiles too.
 */
export function syncUnlocks(profile: Profile, world: string): void {
  const done = profile.highestLevelDone(world);
  for (const u of worldById(world).unlocks) if (u.level <= done) grant(profile, u);
}

/** The campaign has made this weapon available: the level that unlocks it is won. */
export function weaponAvailable(profile: Profile, world: string, id: string): boolean {
  const level = unlockLevelOf(world, 'weapon', id);
  return level !== null && level <= profile.highestLevelDone(world);
}

/**
 * The armoury sells the first unlock of an available weapon for `weaponUnlockPrice()` stars.
 * True if the weapon is now unlocked; false, and nothing changes, if it is not available or the stars are short.
 */
export function buyWeaponUnlock(profile: Profile, world: string, id: string): boolean {
  if (profile.hasWeapon(id)) return true;
  if (!weaponAvailable(profile, world, id)) return false;
  const price = weaponUnlockPrice();
  if (price > 0 && !profile.spendStars(price)) return false;
  return profile.unlockWeapon(id);
}

/** Highest gate tier that can be built in a level, from campaign progress. */
export function maxGateTier(profile: Profile, world: string): number {
  const done = profile.highestLevelDone(world);
  let tier = 0;
  for (const u of worldById(world).unlocks) if (u.kind === 'gate' && u.level <= done) tier = Math.max(tier, u.tier);
  return tier;
}

/** Highest hand tier the armoury sells, from campaign progress. */
export function maxHandTier(profile: Profile, world: string): number {
  const done = profile.highestLevelDone(world);
  let tier = 1;
  for (const u of worldById(world).unlocks) if (u.kind === 'hand' && u.level <= done) tier = Math.max(tier, u.tier);
  return tier;
}

/** The level whose win unlocks a weapon, slot or station; null when nothing does. For "from level N" hints. */
export function unlockLevelOf(world: string, kind: UnlockDef['kind'], id: string | number): number | null {
  for (const u of worldById(world).unlocks) {
    if (u.kind !== kind) continue;
    const key = u.kind === 'slot' ? u.slot : u.kind === 'weapon' ? u.weapon : u.kind === 'station' ? u.station : u.tier;
    if (key === id) return u.level;
  }
  return null;
}
