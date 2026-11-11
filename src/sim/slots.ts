/**
 * The grip zones of the weapon slots on the keep: which slot a press lands on.
 * A press on a slot never grabs a raider, and the zones never reach the road in front of the gate.
 */
import { WORLD } from '../config/field';
import { SLOTS } from '../config/slots';

/** Nearest slot within `radius` among those for which `usable` says yes, or -1. */
export function slotAt(x: number, y: number, radius: number, usable: (slot: number) => boolean): number {
  if (x > WORLD.slotZoneMaxX) return -1;
  let best = -1;
  let bestD = radius;
  SLOTS.forEach((slot, i) => {
    if (!usable(i)) return;
    const d = Math.hypot(x - slot.x, y - slot.y);
    if (d <= bestD) { bestD = d; best = i; }
  });
  return best;
}
