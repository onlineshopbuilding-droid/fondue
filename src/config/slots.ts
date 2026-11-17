/**
 * The five weapon slots of the keep. Each slot has a role, and only weapons of that role fit
 * (see `slot` in weapons.ts). The index in SLOTS is the slot number used by loadouts and commands.
 *
 * Columns: role = which weapons fit; name = shown to players; x, y = centre of the weapon's art and of
 * its tap zone, in world units. castleTier = the castle tier that opens the slot, taken from
 * CASTLE_TIER_FOR_SLOT (./slotTiers.ts, the only place of that number). What the King says when a slot
 * opens is world story: `SLOT_INTROS` in src/config/worlds/fondue/story.ts, the only place of those lines.
 */
import { CASTLE_TIER_FOR_SLOT } from './slotTiers';

export type SlotRole = 'damage' | 'slow' | 'support' | 'passive' | 'gate';

export interface SlotDef { role: SlotRole; name: string; x: number; y: number; castleTier: number }

const slot = (role: SlotRole, name: string, x: number, y: number): SlotDef => ({ role, name, x, y, castleTier: CASTLE_TIER_FOR_SLOT[role] });

export const SLOTS: SlotDef[] = [
  slot('damage', 'Damage', 52, 590),
  slot('slow', 'Slow', 46, 392),
  slot('gate', 'Gate', 146, 410),
  slot('support', 'Support', 46, 282),
  slot('passive', 'Passive', 136, 272),
];

export const SLOT_COUNT = SLOTS.length;
/** Every role once, in slot order. */
export const SLOT_ROLES: SlotRole[] = SLOTS.map((s) => s.role);
/** Index of the slot with this role. */
export const slotOfRole = (role: SlotRole): number => SLOTS.findIndex((s) => s.role === role);
