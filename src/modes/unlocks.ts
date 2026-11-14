/**
 * What campaign progress makes available, derived from `levelsDone` and the unlock table; nothing of
 * this is stored, so a changed table can never break a saved profile.
 *   Slots open by won level. Weapons and stations become buyable (with cheese) by won level.
 *   The tier cap rises per campaign section; tier 7 needs the Eagle Perch.
 */
import { STATIONS, type StationId } from '../config/keep';
import { SLOTS, SLOT_COUNT } from '../config/slots';
import { TIER_CAP_BY_LEVEL, TIER_MAX, TIER_MAX_NEEDS_STATION } from '../config/tiers';
import { WEAPONS, type WeaponDef } from '../config/weapons';
import { worldById } from '../config/worlds';
import { slotIntro, slotUnlockLevel, weaponUnlockLevel } from '../config/worlds/fondue/unlocks';
import type { UnlockDef } from '../config/worlds/types';
import type { Profile, ProfileData } from '../profile';

/** The task of a slot and of the weapons that fit it. */
export type SlotRoleId = 'damage' | 'slow' | 'support' | 'passive' | 'gate';

/** Names of the slot types before v0.3, for config entries that do not carry a role yet. */
const OLD_TYPE_ROLE: Record<string, SlotRoleId> = { foot: 'damage', wall: 'slow', shrine: 'support', tower: 'passive', gate: 'gate' };

/** The first weapon of all; free, and in slot 0 after the tutorial. */
export const STARTER_WEAPON = 'wheel';

export type ProfileLike = Profile | Readonly<ProfileData>;
export const dataOf = (p: ProfileLike): Readonly<ProfileData> => ('keep' in p ? p : p.data);

const field = (entry: object, key: string): unknown => (entry as Record<string, unknown>)[key];

/** The role of a slot (0..4). */
export function slotRole(slot: number): SlotRoleId | null {
  const def = SLOTS[slot];
  if (!def) return null;
  const role = field(def, 'role') ?? OLD_TYPE_ROLE[String(field(def, 'type'))];
  return typeof role === 'string' ? (role as SlotRoleId) : null;
}

/** The role of a weapon: the slot it fits. */
export function weaponRole(def: WeaponDef): SlotRoleId | null {
  const slot = field(def, 'slot');
  if (typeof slot === 'string') return slot as SlotRoleId;
  return OLD_TYPE_ROLE[String(field(def, 'slotType'))] ?? null;
}

/** Cheese price of a weapon's unlock (0 = free). */
export function weaponCheesePrice(def: WeaponDef): number {
  const price = field(def, 'cheesePrice');
  return typeof price === 'number' && Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0;
}

/** Gold price factor of a weapon's tiers. */
export function weaponGoldScale(def: WeaponDef): number {
  const scale = field(def, 'goldScale');
  return typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** Highest won level of a world. */
export function levelsReached(p: ProfileLike, world: string): number {
  const w = dataOf(p).worlds[world];
  return w && Object.hasOwn(dataOf(p).worlds, world) ? Math.max(0, ...w.levelsDone) : 0;
}

/** Is this weapon slot open? Slot 0 opens with the tutorial. */
export function slotOpen(p: ProfileLike, world: string, slot: number): boolean {
  if (slot < 0 || slot >= SLOT_COUNT) return false;
  const level = slotUnlockLevel(slot);
  if (level <= 0) return dataOf(p).seen.tutorial || levelsReached(p, world) > 0;
  return levelsReached(p, world) >= level;
}

export const openSlots = (p: ProfileLike, world: string): boolean[] =>
  Array.from({ length: SLOT_COUNT }, (_, i) => slotOpen(p, world, i));

/** The introduction line of a slot (King Fridolin). */
export { slotIntro };

/** The campaign has reached the level from which this weapon can be unlocked. */
export function weaponAvailable(p: ProfileLike, world: string, id: string): boolean {
  const level = weaponUnlockLevel(id);
  return level !== null && levelsReached(p, world) >= level;
}

/** The campaign has reached the level from which this station can be unlocked. */
export function stationAvailable(p: ProfileLike, world: string, id: StationId): boolean {
  return levelsReached(p, world) >= STATIONS[id].unlockLevel;
}

/** Highest tier that can be bought for weapons, castle and hand right now. */
export function tierCap(p: ProfileLike, world: string): number {
  if (dataOf(p).keep.stations[TIER_MAX_NEEDS_STATION] > 0) return TIER_MAX;
  const done = levelsReached(p, world);
  let cap = 1;
  for (const step of TIER_CAP_BY_LEVEL) if (done >= step.afterLevel) cap = Math.max(cap, step.cap);
  return Math.min(cap, TIER_MAX - 1);
}

/** Endless opens with the last slot. */
export function endlessOpen(p: ProfileLike, world: string): boolean {
  return slotOpen(p, world, SLOT_COUNT - 1);
}

/** Weapons that fit a slot. */
export const weaponsForRole = (role: SlotRoleId): WeaponDef[] => WEAPONS.filter((w) => w.enabled && weaponRole(w) === role);

/** What winning exactly this level makes available. */
export function unlocksOfLevel(world: string, level: number): UnlockDef[] {
  return worldById(world).unlocks.filter((u) => u.level === level);
}

/** The won level that makes a weapon, slot or station available; null when nothing does. For "from level N" hints. */
export function unlockLevelOf(world: string, kind: UnlockDef['kind'], id: string | number): number | null {
  for (const u of worldById(world).unlocks) {
    if (u.kind !== kind) continue;
    const key = u.kind === 'slot' ? u.slot : u.kind === 'weapon' ? u.weapon : u.kind === 'station' ? u.station : u.tier;
    if (key === id) return u.level;
  }
  return null;
}

/**
 * Makes sure a profile that has played the tutorial (or any level) owns the free Rolling Wheel and
 * wears it in slot 0 when that slot is empty. Called at start-up and after every run. Safe to repeat.
 */
export function syncUnlocks(profile: Profile, world: string): void {
  if (!slotOpen(profile, world, 0)) return;
  profile.edit((d) => {
    let changed = false;
    if (!Object.hasOwn(d.keep.weapons, STARTER_WEAPON) && WEAPONS.some((w) => w.id === STARTER_WEAPON)) {
      d.keep.weapons[STARTER_WEAPON] = { tier: 1 };
      changed = true;
    }
    if (d.keep.loadout[0] === null && Object.hasOwn(d.keep.weapons, STARTER_WEAPON) && !d.keep.loadout.includes(STARTER_WEAPON)) {
      d.keep.loadout[0] = STARTER_WEAPON;
      changed = true;
    }
    return changed;
  });
}
