/**
 * Which castle tier opens which weapon slot (from v0.4 on, slots open by castle tier, no longer by
 * campaign level). Keyed by slot role, so the order of SLOTS does not matter.
 *   tier 1 (start) Damage, 2 Slow, 3 Gate, 4 Support, 5 Passive; tiers 6 and 7 open no slot.
 * The v0.3 -> v0.4 save import (src/profile/fromV3.ts) uses this to raise the castle tier of an old
 * save until every slot that was open in v0.3 stays open.
 */
import type { SlotRole } from './slots';

export const CASTLE_TIER_FOR_SLOT: Readonly<Record<SlotRole, number>> = Object.freeze({
  damage: 1,
  slow: 2,
  gate: 3,
  support: 4,
  passive: 5,
});
