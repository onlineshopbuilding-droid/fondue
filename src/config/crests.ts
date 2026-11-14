/**
 * Raider Crests: what a raider sacrificed at the Eagle Perch leaves behind.
 * Light raiders 1, middle ones 2, heavy ones 3, the Yeti and bosses 5. At most `perRun` per run, in
 * the campaign and in endless, so the grind stays at roughly 20 to 30 runs per tier-7 step.
 */
import type { EnemyType } from './enemies';

export interface CrestRules {
  byType: Record<EnemyType, number>;
  boss: number;
  perRun: number;
  /** Target size of the eagle's hook in world units: a flying raider this close is caught. */
  hookRadius: number;
  /** A raider must fly at least this fast (world px/s) to be caught: carrying one up and letting go does not count. */
  minSpeed: number;
  /** Aim assist: a throw that will pass within this distance is bent onto the hook ... */
  assistRadius: number;
  /** ... but only when it already heads that way (cosine of the angle between flight and hook). */
  headingCos: number;
  /** A throw that comes this close to the hook counts as a try at the perch (hit rate, bots). */
  tryRadius: number;
}

export const CRESTS: CrestRules = {
  byType: {
    grunt: 1, slinger: 1, shade: 1,
    bomber: 2, pogo: 2, hexer: 2, balloonist: 2, crowcaller: 2,
    goatRider: 3, siegeCart: 3,
    yeti: 5,
  },
  /** A boss (an oversized raider) always leaves this many. */
  boss: 5,
  /** Most crests one run can bring. */
  perRun: 4,
  // v0.2 caught throws within 66 px (104 px when let go at the hook) and bent throws within 170 px
  // at a 25° heading. v0.3 asks for an aimed throw (C6).
  hookRadius: 34,
  minSpeed: 450,
  assistRadius: 40,
  headingCos: 0.985,
  tryRadius: 160,
};

/** Crests a raider of this type leaves at the perch. */
export function crestsFor(type: EnemyType, big = false): number {
  if (big) return CRESTS.boss;
  return CRESTS.byType[type] ?? 1;
}
