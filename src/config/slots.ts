/**
 * The five weapon slots of the keep. Each slot has a type, and only weapons of that type fit
 * (see `slotType` in weapons.ts).
 *
 * Columns: type = which weapons fit; name = shown in the market; x, y = centre of the weapon's art
 * and of its grip zone, in world units. The keep art (keep0 to keep4) leaves these places free.
 */
import type { SlotType } from './weapons';

export interface SlotDef { type: SlotType; name: string; x: number; y: number }

export const SLOTS: SlotDef[] = [
  { type: 'foot', name: 'Wall Foot', x: 52, y: 590 },
  { type: 'wall', name: 'Wall', x: 46, y: 392 },
  { type: 'gate', name: 'Gate Arm', x: 146, y: 410 },
  { type: 'shrine', name: 'Shrine', x: 46, y: 282 },
  { type: 'tower', name: 'Tower Roof', x: 136, y: 272 },
];

export const SLOT_COUNT = SLOTS.length;
