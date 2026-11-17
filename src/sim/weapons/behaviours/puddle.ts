/** Sticky Fondue: molten cheese on the road in front of the foremost raiders. It slows, later it burns, at the top it covers the whole road. */
import { WORLD } from '../../../config/field';
import type { PuddleTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { frontTarget } from '../targeting';

export class PuddleBehaviour implements WeaponBehaviour<PuddleTier> {
  fire(ctx: SimContext, tier: PuddleTier, _shot: Shot): boolean {
    const front = frontTarget(ctx, false);
    if (!front) return false;
    if (tier.wholeRoad) {
      // The top tier floods the whole road from the gate to the far edge.
      const half = (ctx.s.meta.fieldW - WORLD.gateX) / 2;
      ctx.zones.addCheese(WORLD.gateX + half, half, tier.seconds, tier.slow, tier.dps);
      return true;
    }
    // The puddle starts just ahead of the first raider, so the whole column has to wade through.
    const left = Math.max(WORLD.gateX + 20, front.x - tier.halfWidth * 0.5);
    const x = Math.min(left + tier.halfWidth, ctx.s.meta.fieldW - tier.halfWidth * 0.5);
    ctx.zones.addCheese(x, tier.halfWidth, tier.seconds, tier.slow, tier.dps);
    return true;
  }
}
