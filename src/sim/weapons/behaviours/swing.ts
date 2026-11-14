/** Battering Log: a trunk swings out of the gate, hurts whoever stands close and knocks them back, several swings. */
import { WORLD } from '../../../config/field';
import type { SwingTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { groundTargets } from '../targeting';

const NEXT_SWING_AFTER = 0.6;
/** Raiders this far beyond the trunk's reach already wake it (it swings as they come in). */
const WAKE_EXTRA = 220;
const HOP_SECONDS = 0.45;
const HOP_UP = 380;

export class SwingBehaviour implements WeaponBehaviour<SwingTier> {
  fire(ctx: SimContext, tier: SwingTier, shot: Shot): boolean {
    if (!groundTargets(ctx).some((e) => e.x <= WORLD.gateX + tier.reach + WAKE_EXTRA)) return false;
    this.swing(ctx, tier, shot.p);
    for (let i = 1; i < tier.swings; i++) ctx.weapons.later(shot, i, NEXT_SWING_AFTER * i, 0);
    return true;
  }

  followUp(ctx: SimContext, tier: SwingTier, d: DelayedShot) { this.swing(ctx, tier, d.p); }

  private swing(ctx: SimContext, tier: SwingTier, p: number) {
    ctx.emit({ e: 'logSwing', reach: tier.reach });
    for (const e of groundTargets(ctx)) {
      if (e.x > WORLD.gateX + tier.reach) continue;
      ctx.combat.hurt(e, tier.damage, 'crush', p);
      if (e.dead || e.st === 'frozen') continue;
      // Siege carts, Yetis and big raiders are too heavy to be thrown back; they are only dazed.
      if (e.type === 'siegeCart' || e.type === 'yeti' || e.big) { ctx.combat.stun(e, tier.stun); continue; }
      ctx.flight.knockBack(e, tier.push / HOP_SECONDS, -HOP_UP);
    }
  }
}
