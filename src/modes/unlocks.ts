/**
 * Turns the unlock table of a world into what a profile may use: which unlocks a level brings,
 * and writing them into the profile. Everything here reads the table; nothing is hard-coded.
 */
import { worldById } from '../config/worlds';
import type { UnlockDef } from '../config/worlds/types';
import type { Profile } from '../profile';

/** The unlocks that winning exactly this level brings. */
export function unlocksOfLevel(world: string, level: number): UnlockDef[] {
  return worldById(world).unlocks.filter((u) => u.level === level);
}

/** Writes one unlock into the profile. Gates and hand tiers need no entry: they follow from progress. */
function grant(profile: Profile, u: UnlockDef): boolean {
  if (u.kind === 'slot') return profile.unlockSlot(u.slot);
  if (u.kind === 'weapon') return profile.unlockWeapon(u.weapon);
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
