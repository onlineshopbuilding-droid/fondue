/**
 * The unlock table of world 1: from which won level each weapon slot opens, and the list of
 * everything that becomes available per level.
 *
 * Weapons say themselves from which level they can be bought (`unlockLevel` in src/config/weapons.ts),
 * stations too (`unlockLevel` in src/config/keep.ts), and slots in src/config/slots.ts. King
 * Fridolin's introduction of a slot lives only in `SLOT_INTROS` (./story.ts). The tier cap per
 * campaign section lives in src/config/tiers.ts. Level 0 means: there from the very start (after the tutorial).
 */
import { STATIONS, STATION_IDS } from '../../keep';
import { SLOTS } from '../../slots';
import { WEAPONS } from '../../weapons';
import type { UnlockDef } from '../types';
import { SLOT_INTROS } from './story';

/** Reads an optional number field of a config entry another package may not have added yet. */
const numberField = (entry: object, key: string): number | null => {
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Won level that opens a slot. */
export const slotUnlockLevel = (slot: number): number => SLOTS[slot]?.unlockLevel ?? 0;

/** The King's introduction of a slot, shown once on the win screen of the level that opens it. */
export const slotIntro = (slot: number): string => SLOT_INTROS[slot] ?? '';

/** Won level from which a weapon can be unlocked with cheese; null if it never can. */
export const weaponUnlockLevel = (id: string): number | null => {
  const def = WEAPONS.find((w) => w.id === id);
  if (!def || !def.enabled) return null;
  return numberField(def, 'unlockLevel') ?? 0;
};

/** Everything that becomes available per won level, for the map, the win screen and the tables. */
export const UNLOCKS: UnlockDef[] = [
  ...SLOTS.map((_, slot): UnlockDef => ({ level: slotUnlockLevel(slot), kind: 'slot', slot })),
  ...WEAPONS.filter((w) => w.enabled).map((w): UnlockDef => ({ level: weaponUnlockLevel(w.id) ?? 0, kind: 'weapon', weapon: w.id })),
  ...STATION_IDS.map((station): UnlockDef => ({ level: STATIONS[station].unlockLevel, kind: 'station', station })),
].sort((a, b) => a.level - b.level);
