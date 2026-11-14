/**
 * The five weapon slots of the keep. Each slot has a role, and only weapons of that role fit
 * (see `slot` in weapons.ts). The index in SLOTS is the slot number used by loadouts and commands.
 *
 * Columns: role = which weapons fit; name = shown to players; x, y = centre of the weapon's art and of
 * its tap zone, in world units; unlockLevel = campaign level whose win opens the slot (0: open from the
 * start). What the King says when a slot opens is world story: `SLOT_INTROS` in
 * src/config/worlds/fondue/story.ts, the only place of those lines.
 */
export type SlotRole = 'damage' | 'slow' | 'support' | 'passive' | 'gate';

export interface SlotDef { role: SlotRole; name: string; x: number; y: number; unlockLevel: number }

export const SLOTS: SlotDef[] = [
  { role: 'damage', name: 'Damage', x: 52, y: 590, unlockLevel: 0 },
  { role: 'slow', name: 'Slow', x: 46, y: 392, unlockLevel: 2 },
  { role: 'gate', name: 'Gate', x: 146, y: 410, unlockLevel: 4 },
  { role: 'support', name: 'Support', x: 46, y: 282, unlockLevel: 7 },
  { role: 'passive', name: 'Passive', x: 136, y: 272, unlockLevel: 11 },
];

export const SLOT_COUNT = SLOTS.length;
/** Every role once, in slot order. */
export const SLOT_ROLES: SlotRole[] = SLOTS.map((s) => s.role);
/** Index of the slot with this role. */
export const slotOfRole = (role: SlotRole): number => SLOTS.findIndex((s) => s.role === role);
