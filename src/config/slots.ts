/**
 * The five weapon slots of the keep. Each slot has a role, and only weapons of that role fit
 * (see `slot` in weapons.ts). The index in SLOTS is the slot number used by loadouts and commands.
 *
 * Columns: role = which weapons fit; name = shown to players; x, y = centre of the weapon's art and of
 * its tap zone, in world units; unlockLevel = campaign level whose win opens the slot (0: open from the
 * start); intro = what the king says when the slot opens.
 */
export type SlotRole = 'damage' | 'slow' | 'support' | 'passive' | 'gate';

export interface SlotDef { role: SlotRole; name: string; x: number; y: number; unlockLevel: number; intro: string }

export const SLOTS: SlotDef[] = [
  { role: 'damage', name: 'Damage', x: 52, y: 590, unlockLevel: 0, intro: 'Tap the wheel and it rolls down the road. Hurt them before they reach the gate!' },
  { role: 'slow', name: 'Slow', x: 46, y: 392, unlockLevel: 2, intro: 'A new slot! Weapons here hold the raiders back so your hand can catch them.' },
  { role: 'gate', name: 'Gate', x: 146, y: 410, unlockLevel: 4, intro: 'The gate arm is free. Whatever sits here strikes the raiders right at our door.' },
  { role: 'support', name: 'Support', x: 46, y: 282, unlockLevel: 7, intro: 'Support weapons help your hands and the gate. Tap them at the right moment.' },
  { role: 'passive', name: 'Passive', x: 136, y: 272, unlockLevel: 11, intro: 'The tower roof! Passive weapons fire all on their own. Watch the ring fill up.' },
];

export const SLOT_COUNT = SLOTS.length;
/** Every role once, in slot order. */
export const SLOT_ROLES: SlotRole[] = SLOTS.map((s) => s.role);
/** Index of the slot with this role. */
export const slotOfRole = (role: SlotRole): number => SLOTS.findIndex((s) => s.role === role);
