/**
 * The unlock table of world 1: from which won level each weapon slot opens, with King Fridolin's
 * one-line introduction, and the list of everything that becomes available per level.
 *
 * Weapons say themselves from which level they can be bought (`unlockLevel` in src/config/weapons.ts),
 * stations too (`unlockLevel` in src/config/keep.ts), and slots in src/config/slots.ts when that
 * file has them; the values below are the fallback for slots. The tier cap per campaign section
 * lives in src/config/tiers.ts. Level 0 means: there from the very start (after the tutorial).
 */
import { STATIONS, STATION_IDS } from '../../keep';
import { SLOTS } from '../../slots';
import { WEAPONS } from '../../weapons';
import type { UnlockDef } from '../types';

export interface SlotUnlockDef { level: number; intro: string }

/** Index = slot (0 damage, 1 slow, 2 gate, 3 support, 4 passive). */
export const SLOT_UNLOCKS: SlotUnlockDef[] = [
  { level: 0, intro: 'This is your Damage slot. Whatever sits here rolls, stabs and smashes down the road.' },
  { level: 2, intro: 'This is your Slow slot. Sticky, frosty or ticking: it holds the raiders back.' },
  { level: 4, intro: 'This is your Gate slot. Right above the gate, it guards the last few steps.' },
  { level: 7, intro: 'This is your Support slot. It helps you and your hand instead of hitting.' },
  { level: 11, intro: 'This is your Passive slot. It works all by itself, no tap needed.' },
];

/** Reads an optional number field of a config entry another package may not have added yet. */
const numberField = (entry: object, key: string): number | null => {
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const stringField = (entry: object, key: string): string | null => {
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
};

/** Won level that opens a slot. */
export const slotUnlockLevel = (slot: number): number =>
  (SLOTS[slot] && numberField(SLOTS[slot], 'unlockLevel')) ?? SLOT_UNLOCKS[slot]?.level ?? 0;

/** The king's introduction of a slot. */
export const slotIntro = (slot: number): string =>
  (SLOTS[slot] && stringField(SLOTS[slot], 'intro')) ?? SLOT_UNLOCKS[slot]?.intro ?? '';

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
