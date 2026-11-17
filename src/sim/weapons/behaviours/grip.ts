/**
 * Iron Grip: for a while every hand is stronger (`s.gripStrength`, read by SimContext.strengthOf) and a
 * hard throw kills more easily (`s.gripLethal` scales the lethal impact speed, read by Flight).
 */
import type { GripTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';

export class GripBehaviour implements WeaponBehaviour<GripTier> {
  fire(ctx: SimContext, tier: GripTier, _shot: Shot): boolean {
    const s = ctx.s;
    s.gripT = tier.seconds;
    s.gripStrength = tier.strength;
    s.gripLethal = tier.lethal;
    ctx.emit({ e: 'grip', seconds: tier.seconds });
    return true;
  }
}
