/** Fondue Forks: forks spring out of the road under the thickest group, hurt it and pin it. */
import type { SpikesTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX, groundTargets } from '../targeting';

const PULSE_EVERY = 0.6;

export class SpikesBehaviour implements WeaponBehaviour<SpikesTier> {
  fire(ctx: SimContext, tier: SpikesTier, shot: Shot): boolean {
    const x = crowdX(ctx, tier.halfWidth);
    if (x === null) return false;
    this.stab(ctx, tier, x, shot.p);
    for (let i = 1; i < tier.pulses; i++) ctx.weapons.later(shot, i, PULSE_EVERY * i, x);
    return true;
  }

  followUp(ctx: SimContext, tier: SpikesTier, d: DelayedShot) { this.stab(ctx, tier, d.x, d.p); }

  private stab(ctx: SimContext, tier: SpikesTier, x: number, p: number) {
    ctx.emit({ e: 'spikes', x, halfWidth: tier.halfWidth });
    for (const e of groundTargets(ctx)) {
      if (Math.abs(e.x - x) > tier.halfWidth) continue;
      ctx.combat.hurt(e, tier.damage, 'spike', p);
      ctx.combat.stun(e, tier.pin);
    }
  }
}
