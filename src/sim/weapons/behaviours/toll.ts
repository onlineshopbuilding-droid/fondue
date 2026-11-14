/** Cowbell Toll: a bell stroke dazes everyone in a circle around the thickest group, several tolls in a row. */
import type { TollTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets, crowdX } from '../targeting';

const NEXT_TOLL_AFTER = 0.7;

export class TollBehaviour implements WeaponBehaviour<TollTier> {
  fire(ctx: SimContext, tier: TollTier, shot: Shot): boolean {
    if (!this.toll(ctx, tier, shot.p)) return false;
    for (let i = 1; i < tier.tolls; i++) ctx.weapons.later(shot, i, NEXT_TOLL_AFTER * i, 0);
    return true;
  }

  /** Every further toll looks for the thickest group anew. */
  followUp(ctx: SimContext, tier: TollTier, d: DelayedShot) { this.toll(ctx, tier, d.p); }

  private toll(ctx: SimContext, tier: TollTier, p: number): boolean {
    const x = crowdX(ctx, tier.radius * 0.6);
    if (x === null) return false;
    ctx.emit({ e: 'toll', x, radius: tier.radius });
    for (const e of allTargets(ctx)) {
      if (Math.abs(e.x - x) > tier.radius) continue;
      const flying = e.st === 'float';
      if (flying && !tier.hitsAir) continue;
      ctx.combat.hurt(e, tier.damage, 'shock', p);
      if (!e.dead && !flying) ctx.combat.stun(e, tier.stun);
    }
    return true;
  }
}
