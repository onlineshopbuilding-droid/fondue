/** Cuckoo Clock: every raider stands still for a moment. Higher tiers stop fliers and break guards. */
import { BEHAVIOUR } from '../../../config/enemies';
import type { StopTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets, targetable } from '../targeting';

export class StopBehaviour implements WeaponBehaviour<StopTier> {
  fire(ctx: SimContext, tier: StopTier, _shot: Shot): boolean {
    // Hidden shades are no targets, but a clock that breaks guards drags them into the open first.
    const lurking = tier.breaksGuards ? ctx.s.enemies.filter((e) => e.hidden && targetable(ctx, { ...e, hidden: false })) : [];
    if (allTargets(ctx).length + lurking.length === 0) return false;
    for (const e of lurking) { e.hidden = false; e.cycleT = tier.seconds + BEHAVIOUR.shade.visible; }
    const all = allTargets(ctx);
    ctx.emit({ e: 'cuckoo', seconds: tier.seconds });
    if (tier.hitsAir) ctx.s.airStopT = tier.seconds;
    for (const e of all) {
      if (tier.breaksGuards) {
        if (e.shieldOn) { e.shieldOn = false; e.cycleT = tier.seconds + BEHAVIOUR.hexerShield.off; }
      }
      ctx.combat.stun(e, tier.seconds);
    }
    return true;
  }
}
