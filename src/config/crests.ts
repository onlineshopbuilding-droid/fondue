/**
 * Raider Crests: what a raider sacrificed at the Eagle Perch leaves behind.
 * Light raiders 1, middle ones 2, heavy ones 3, the Yeti and bosses 5. At most `perRun` per run, in
 * the campaign and in endless, so the grind stays at roughly 20 to 30 runs per tier-7 step.
 */
import type { EnemyType } from './enemies';

export const CRESTS: { byType: Record<EnemyType, number>; boss: number; perRun: number; hookRadius: number } = {
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
  /** Target size of the eagle's hook in world units (smaller than before: an aimed throw is needed). */
  hookRadius: 34,
};

/** Crests a raider of this type leaves at the perch. */
export function crestsFor(type: EnemyType, big = false): number {
  if (big) return CRESTS.boss;
  return CRESTS.byType[type] ?? 1;
}
