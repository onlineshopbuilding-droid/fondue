// The step from a v0.3 save (profile version 1) to v0.4 (profile version 2).
// v0.3 opened the weapon slots by won campaign level; v0.4 opens them by castle tier
// (CASTLE_TIER_FOR_SLOT). A v0.3 save keeps every slot it had open: its castle tier is raised for free
// to the lowest tier that opens all of them. Nothing is taken away, no gold is charged.
// The v0.3 rules are frozen here, so later changes of the slot config cannot change the import.
import { CASTLE_TIER_FOR_SLOT } from '../config/slotTiers';
import type { SlotRole } from '../config/slots';
import { sanitizeProfile, type RawRecord } from './sanitize';
import { CASTLE_TIER_MAX, CASTLE_TIER_MIN, type ProfileData } from './schema';

/** Storage key of the v0.3 profile. Read once for the import; never written or removed. */
export const V3_PROFILE_KEY = 'fondue.v3.profile';

/** The slots of v0.3 in loadout order, each with the campaign level whose win opened it (0: the tutorial). */
export const V3_SLOTS: readonly { role: SlotRole; unlockLevel: number }[] = Object.freeze([
  { role: 'damage', unlockLevel: 0 },
  { role: 'slow', unlockLevel: 2 },
  { role: 'gate', unlockLevel: 4 },
  { role: 'support', unlockLevel: 7 },
  { role: 'passive', unlockLevel: 11 },
]);

/** Highest won level over every world of the save. */
function highestLevel(data: ProfileData): number {
  let best = 0;
  for (const world of Object.values(data.worlds)) best = Math.max(best, ...world.levelsDone);
  return best;
}

/**
 * The slot roles that were open in v0.3: by won level as v0.3 counted it, and every slot that still
 * wears a weapon (it was open when the weapon was put there).
 */
export function v3OpenSlots(data: ProfileData): SlotRole[] {
  const level = highestLevel(data);
  return V3_SLOTS.filter(({ unlockLevel }, i) => {
    const byLevel = unlockLevel <= 0 ? data.seen.tutorial || level > 0 : level >= unlockLevel;
    return byLevel || data.keep.loadout[i] != null;
  }).map((s) => s.role);
}

/** The lowest castle tier that opens every one of these slots. */
export function castleTierForSlots(roles: readonly SlotRole[]): number {
  const needed = Math.max(CASTLE_TIER_MIN, ...roles.map((role) => CASTLE_TIER_FOR_SLOT[role]));
  return Math.min(CASTLE_TIER_MAX, needed);
}

/** The profile with its castle tier raised, if needed, so every slot open in v0.3 stays open. A copy. */
export function liftCastleForV3Slots(data: ProfileData): ProfileData {
  const next = sanitizeProfile(JSON.parse(JSON.stringify(data)));
  next.keep.castleTier = Math.max(next.keep.castleTier, castleTierForSlots(v3OpenSlots(next)));
  return next;
}

/** Migration step 1 -> 2 (raw data in, raw data out). */
export function stepV3ToV4(raw: RawRecord): RawRecord {
  return liftCastleForV3Slots(sanitizeProfile(raw)) as unknown as RawRecord;
}
