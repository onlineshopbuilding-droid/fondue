/** Alphorn: one note throws every raider near the keep back down the road. */
import { WORLD } from '../../../config/field';
import type { PushTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets } from '../targeting';

/** A thrown-back raider flies this long; its sideways speed follows from the push distance. */
const HOP_SECONDS = 0.5;
const HOP_UP = 420;

export class PushBehaviour implements WeaponBehaviour<PushTier> {
  fire(ctx: SimContext, tier: PushTier, shot: Shot): boolean {
    const edge = WORLD.gateX + tier.reach;
    const hit = allTargets(ctx).filter((e) => e.x <= edge && e.type !== 'siegeCart' && e.type !== 'yeti' && !e.big);
    if (hit.length === 0) return false;
    ctx.emit({ e: 'hornBlast', reach: tier.reach });
    for (const e of hit) {
      const flying = e.st === 'float';
      if (flying && !tier.hitsAir) continue;
      if (e.st === 'frozen' || e.st === 'air') continue;
      ctx.combat.hurt(e, tier.damage, 'shock', shot.p);
      if (e.dead) continue;
      if (flying) {
        e.x = Math.min(ctx.wall - 20, e.x + tier.push);
      } else {
        ctx.flight.knockBack(e, tier.push / HOP_SECONDS, -HOP_UP);
      }
    }
    return true;
  }
}
