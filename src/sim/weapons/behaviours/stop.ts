/** Cuckoo Clock: every raider stands still for a moment. Higher tiers stop fliers and break guards. */
import { BEHAVIOUR } from '../../../config/enemies';
import type { StopTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets } from '../targeting';

export class StopBehaviour implements WeaponBehaviour<StopTier> {
  fire(ctx: SimContext, tier: StopTier, _shot: Shot): boolean {
    const all = allTargets(ctx);
    if (all.length === 0) return false;
    ctx.emit({ e: 'cuckoo', seconds: tier.seconds });
    if (tier.hitsAir) ctx.s.airStopT = tier.seconds;
    for (const e of all) {
      if (tier.breaksGuards) {
        if (e.shieldOn) { e.shieldOn = false; e.cycleT = tier.seconds + BEHAVIOUR.hexerShield.off; }
        if (e.hidden) { e.hidden = false; e.cycleT = tier.seconds + BEHAVIOUR.shade.visible; }
      }
      ctx.combat.stun(e, tier.seconds);
    }
    return true;
  }
}
