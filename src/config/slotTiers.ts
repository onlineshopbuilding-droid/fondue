/**
 * The castle as the measure of progress (v0.4): which castle tier opens which weapon slot, from which
 * won campaign level each castle tier can be built, and when the coop and endless tables open.
 * Slots open by castle tier only, never by campaign level. Nothing of this is stored in the profile.
 *
 * CASTLE_TIER_FOR_SLOT: tier 1 (start) Damage, 2 Slow, 3 Gate, 4 Support, 5 Passive; tiers 6 and 7
 * open no slot (more gate strength, a grander hall). Keyed by slot role, so the order of SLOTS does
 * not matter. The v0.3 -> v0.4 save import (src/profile/fromV3.ts) uses it to raise the castle tier
 * of an old save until every slot that was open in v0.3 stays open.
 *
 * CASTLE_TIER_LEVEL: index = tier - 1; the campaign level that must be won before that tier can be
 * built (gold and, for tier 7, Raider Crests come on top: CASTLE_TIERS in ./keep.ts). Tier 2 at 6 and
 * tier 7 at 75 are fixed by Tim; tiers 3 to 6 are starting values for the balance.
 *
 * TABLE_UNLOCK_LEVEL: won campaign level from which the coop table and the endless table in the hall
 * are mended and open (both fixed by Tim).
 *
 * CHALLENGE_SLOT_MARGIN: a level challenge may ask for a weapon of a slot only this many won levels
 * after the castle tier of that slot became buildable, so the player can surely have it by then.
 */
import type { SlotRole } from './slots';

export const CASTLE_TIER_FOR_SLOT: Readonly<Record<SlotRole, number>> = Object.freeze({
  damage: 1,
  slow: 2,
  gate: 3,
  support: 4,
  passive: 5,
});

export const CASTLE_TIER_LEVEL: readonly number[] = Object.freeze([0, 6, 12, 20, 28, 50, 75]);

export const TABLE_UNLOCK_LEVEL: Readonly<{ coop: number; endless: number }> = Object.freeze({ coop: 3, endless: 10 });

export const CHALLENGE_SLOT_MARGIN = 4;
