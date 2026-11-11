/** Marmot Sentry: shoots the raider closest to the gate on its own; a tap fires a quick burst. */
import { DT } from '../../../config/field';
import type { SentryTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { bodyY, frontTarget } from '../targeting';

const BURST_EVERY = 0.12;

export class SentryBehaviour implements WeaponBehaviour<SentryTier> {
  fire(ctx: SimContext, tier: SentryTier, _shot: Shot): boolean {
    if (!frontTarget(ctx, true)) return false;
    ctx.s.sentryBurst = tier.burst;
    ctx.s.sentryT = 0;
    return true;
  }

  tick(ctx: SimContext, tier: SentryTier, shot: Shot) {
    const s = ctx.s;
    s.sentryT -= DT;
    if (s.sentryT > 0) return;
    const target = frontTarget(ctx, true);
    if (!target) { s.sentryT = 0.2; s.sentryBurst = 0; return; }
    const bursting = s.sentryBurst > 0;
    if (bursting) s.sentryBurst--;
    s.sentryT = bursting && s.sentryBurst > 0 ? BURST_EVERY : tier.every;
    ctx.emit({ e: 'sentryShot', x: shot.x, y: shot.y, tx: Math.round(target.x), ty: Math.round(bodyY(target)) });
    ctx.combat.hurt(target, tier.damage, 'bolt', -1);
  }
}
