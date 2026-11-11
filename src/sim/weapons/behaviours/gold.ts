/** Golden Fondue: for a short while every kill pays more gold. Combat reads the timer when it pays out. */
import type { GoldTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';

export class GoldBehaviour implements WeaponBehaviour<GoldTier> {
  fire(ctx: SimContext, tier: GoldTier, _shot: Shot): boolean {
    ctx.s.goldRushT = tier.seconds;
    ctx.s.goldRushFactor = tier.factor;
    ctx.emit({ e: 'goldRush', seconds: tier.seconds });
    return true;
  }
}
