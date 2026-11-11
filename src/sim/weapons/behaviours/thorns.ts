/** Hedgehog Gate: whoever strikes the gate is hurt by its spikes; a tap bursts them outwards. */
import { WORLD } from '../../../config/field';
import type { ThornsTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Enemy } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets } from '../targeting';

export class ThornsBehaviour implements WeaponBehaviour<ThornsTier> {
  fire(ctx: SimContext, tier: ThornsTier, shot: Shot): boolean {
    const near = allTargets(ctx).filter((e) => e.x <= WORLD.gateX + tier.burstReach && e.st !== 'float');
    if (near.length === 0) return false;
    ctx.emit({ e: 'thorns', reach: tier.burstReach });
    for (const e of near) ctx.combat.hurt(e, tier.burstDamage, 'spike', shot.p);
    return true;
  }

  onGateStruck(ctx: SimContext, tier: ThornsTier, attacker: Enemy) {
    ctx.combat.hurt(attacker, tier.reflect, 'spike', -1);
  }
}
