/**
 * The unlock table of world 1: everything that becomes available per won campaign level.
 *
 * Weapons say themselves from which level they can be bought (`unlockLevel` in src/config/weapons.ts),
 * stations too (`unlockLevel` in src/config/keep.ts), and castle tiers in CASTLE_TIER_LEVEL
 * (src/config/slotTiers.ts). Slots are not in this table: they open by castle tier only
 * (CASTLE_TIER_FOR_SLOT). King Fridolin's introduction of a slot lives only in `SLOT_INTROS` (./story.ts).
 * The tier cap of weapons and hand per campaign section lives in src/config/tiers.ts.
 * Level 0 means: there from the very start (after the tutorial).
 */
import { STATIONS, STATION_IDS } from '../../keep';
import { CASTLE_TIER_LEVEL } from '../../slotTiers';
import { WEAPONS } from '../../weapons';
import type { UnlockDef } from '../types';
import { SLOT_INTROS } from './story';

/** Reads an optional number field of a config entry another package may not have added yet. */
const numberField = (entry: object, key: string): number | null => {
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** The King's introduction of a slot, shown once after the castle tier that opens it is built. */
export const slotIntro = (slot: number): string => SLOT_INTROS[slot] ?? '';

/** Won level from which a weapon can be unlocked with cheese; null if it never can. */
export const weaponUnlockLevel = (id: string): number | null => {
  const def = WEAPONS.find((w) => w.id === id);
  if (!def || !def.enabled) return null;
  return numberField(def, 'unlockLevel') ?? 0;
};

/** Everything that becomes available per won level, for the map, the win screen and the tables. */
export const UNLOCKS: UnlockDef[] = [
  // Castle tier 1 is there from the start; tiers 2..7 become buildable at their level.
  ...CASTLE_TIER_LEVEL.slice(1).map((level, i): UnlockDef => ({ level, kind: 'castle', tier: i + 2 })),
  ...WEAPONS.filter((w) => w.enabled).map((w): UnlockDef => ({ level: weaponUnlockLevel(w.id) ?? 0, kind: 'weapon', weapon: w.id })),
  ...STATION_IDS.map((station): UnlockDef => ({ level: STATIONS[station].unlockLevel, kind: 'station', station })),
].sort((a, b) => a.level - b.level);
