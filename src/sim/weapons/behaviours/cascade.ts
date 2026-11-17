/** Cheese Cascade: hot cheese pours from the gate arch and leaves a scalding, slowing pool right before the gate. */
import { WORLD } from '../../../config/field';
import type { CascadeTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { groundTargets } from '../targeting';

/** It only pours when a raider on the road is this close to the gate (generous: raiders run fast). */
export const CASCADE_WAKE = 700;
/** The pool starts right at the gate. */
const START = WORLD.gateX + 12;

export class CascadeBehaviour implements WeaponBehaviour<CascadeTier> {
  fire(ctx: SimContext, tier: CascadeTier, _shot: Shot): boolean {
    const near = groundTargets(ctx).filter((e) => e.x <= WORLD.gateX + CASCADE_WAKE);
    if (near.length === 0) return false;
    const x = START + tier.halfWidth;
    ctx.zones.addHotCheese(x, tier.halfWidth, tier.seconds, tier.slow, tier.dps);
    ctx.emit({ e: 'cascade', halfWidth: tier.halfWidth });
    if (tier.stun > 0) for (const e of near) if (Math.abs(e.x - x) <= tier.halfWidth) ctx.combat.stun(e, tier.stun);
    return true;
  }
}
