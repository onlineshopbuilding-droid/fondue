/**
 * Helping Hand: every player gets a second hand for a while.
 * This only keeps the state: `s.extraHandT[player]` (seconds left, counted down by WeaponSystem.tick)
 * and `s.extraHandStrength` (share of the player's own hand strength), plus the event `extraHand`.
 * Grabbing with a second finger is built by package P-Hände, which reads these fields.
 */
import type { HelperTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';

export class HelperBehaviour implements WeaponBehaviour<HelperTier> {
  fire(ctx: SimContext, tier: HelperTier, _shot: Shot): boolean {
    const s = ctx.s;
    for (let p = 0; p < s.extraHandT.length; p++) s.extraHandT[p] = tier.seconds;
    s.extraHandStrength = tier.strength;
    ctx.emit({ e: 'extraHand', seconds: tier.seconds });
    return true;
  }
}
