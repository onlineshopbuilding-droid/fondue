import type { WeaponSlot } from '../config/shop';
import type { Meta } from './types';

const GATES = ['gate0', 'gate1', 'gate2', 'gate3', 'gate4'];

export const SLOT_TIERS: Record<Exclude<WeaponSlot, 'horn'>, string[]> = {
  wheel: ['wheel1', 'wheel2', 'wheel3'],
  stomper: ['stomper1', 'stomper2', 'stomper3'],
  comet: ['comet1', 'comet2', 'comet3'],
  bolter: ['bolter1', 'bolter2', 'bolter3'],
};

/** Whether a weapon stands on the keep. */
export function ownsSlot(slot: WeaponSlot, m: Meta): boolean {
  if (slot === 'horn') return m.hornEquipped !== null;
  return SLOT_TIERS[slot].some((id) => m.owned.includes(id));
}

/** Build stage of the keep: follows the best gate, 0 to 4. */
export function buildTier(m: Meta): number {
  return GATES.reduce((best, g, i) => (m.owned.includes(g) ? i : best), 0);
}

export const gateOfTier = (tier: number) => GATES[tier];
