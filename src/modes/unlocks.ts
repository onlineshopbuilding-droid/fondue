/**
 * What progress makes available, derived from `levelsDone`, the castle tier and the unlock tables;
 * nothing of this is stored, so a changed table can never break a saved profile.
 *   Slots open by castle tier (CASTLE_TIER_FOR_SLOT), never by campaign level.
 *   Castle tiers become buildable (with gold) by won level (CASTLE_TIER_LEVEL).
 *   Weapons and stations become buyable (with cheese) by won level; a weapon also needs its slot open.
 *   The coop and endless tables open by won level (TABLE_UNLOCK_LEVEL).
 *   The tier cap of weapons and hand rises per campaign section; tier 7 needs the Eagle Perch.
 */
import { STATIONS, type StationId } from '../config/keep';
import { SLOTS, SLOT_COUNT, slotOfRole } from '../config/slots';
import { CASTLE_TIER_FOR_SLOT, CASTLE_TIER_LEVEL, TABLE_UNLOCK_LEVEL } from '../config/slotTiers';
import { TIER_CAP_BY_LEVEL, TIER_MAX, TIER_MAX_NEEDS_STATION } from '../config/tiers';
import { WEAPONS, type WeaponDef } from '../config/weapons';
import { worldById } from '../config/worlds';
import { slotIntro, weaponUnlockLevel } from '../config/worlds/fondue/unlocks';
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

/** The castle tier that opens a slot (Infinity for a slot that does not exist). */
export function slotCastleTier(slot: number): number {
  const role = slotRole(slot);
  return role ? CASTLE_TIER_FOR_SLOT[role] : Number.POSITIVE_INFINITY;
}

/**
 * Is this weapon slot open? It opens with the castle tier of the slot; the damage slot (castle tier 1)
 * opens with the tutorial.
 */
export function slotOpen(p: ProfileLike, world: string, slot: number): boolean {
  if (slot < 0 || slot >= SLOT_COUNT) return false;
  const tier = slotCastleTier(slot);
  if (tier <= 1) return dataOf(p).seen.tutorial || levelsReached(p, world) > 0;
  return dataOf(p).keep.castleTier >= tier;
}

/**
 * The won campaign level from which this castle tier can be built (1..7; tier 1 is there from the
 * start: 0). Infinity for a tier that does not exist.
 */
export function castleTierBuyableAt(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > CASTLE_TIER_LEVEL.length) return Number.POSITIVE_INFINITY;
  return CASTLE_TIER_LEVEL[tier - 1];
}

/** Has the campaign reached the level that lets this castle tier be built? (Gold is asked on top.) */
export function castleTierUnlocked(p: ProfileLike, world: string, tier: number): boolean {
  return levelsReached(p, world) >= castleTierBuyableAt(tier);
}

export const openSlots = (p: ProfileLike, world: string): boolean[] =>
  Array.from({ length: SLOT_COUNT }, (_, i) => slotOpen(p, world, i));

/** The introduction line of a slot (King Fridolin). */
export { slotIntro };

/** The campaign has reached the level from which this weapon can be unlocked, and its slot is open. */
export function weaponAvailable(p: ProfileLike, world: string, id: string): boolean {
  const level = weaponUnlockLevel(id);
  if (level === null || levelsReached(p, world) < level) return false;
  const def = WEAPONS.find((w) => w.id === id);
  const role = def ? weaponRole(def) : null;
  return role !== null && slotOpen(p, world, slotOfRole(role));
}

/** The campaign has reached the level from which this station can be unlocked. */
export function stationAvailable(p: ProfileLike, world: string, id: StationId): boolean {
  return levelsReached(p, world) >= STATIONS[id].unlockLevel;
}

/** Highest tier that can be bought for weapons and hand right now (the castle has CASTLE_TIER_LEVEL). */
export function tierCap(p: ProfileLike, world: string): number {
  if (dataOf(p).keep.stations[TIER_MAX_NEEDS_STATION] > 0) return TIER_MAX;
  const done = levelsReached(p, world);
  let cap = 1;
  for (const step of TIER_CAP_BY_LEVEL) if (done >= step.afterLevel) cap = Math.max(cap, step.cap);
  return Math.min(cap, TIER_MAX - 1);
}

/** The endless table opens once its campaign level is won (10), whatever slots are open. */
export function endlessOpen(p: ProfileLike, world: string): boolean {
  return levelsReached(p, world) >= TABLE_UNLOCK_LEVEL.endless;
}

/** The coop table opens once its campaign level is won (3). */
export function coopTableOpen(p: ProfileLike, world: string): boolean {
  return levelsReached(p, world) >= TABLE_UNLOCK_LEVEL.coop;
}

/** Weapons that fit a slot. */
export const weaponsForRole = (role: SlotRoleId): WeaponDef[] => WEAPONS.filter((w) => w.enabled && weaponRole(w) === role);

/** What winning exactly this level makes available. */
export function unlocksOfLevel(world: string, level: number): UnlockDef[] {
  return worldById(world).unlocks.filter((u) => u.level === level);
}

/** The won level that makes a weapon, station or castle tier available; null when nothing does. For "from level N" hints. */
export function unlockLevelOf(world: string, kind: UnlockDef['kind'], id: string | number): number | null {
  for (const u of worldById(world).unlocks) {
    if (u.kind !== kind) continue;
    const key = u.kind === 'weapon' ? u.weapon : u.kind === 'station' ? u.station : u.tier;
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
