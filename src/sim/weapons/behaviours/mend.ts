/** Mending Horn: heals the gate at once, and on higher tiers keeps mending it for a while. Needs a damaged gate. */
import type { MendTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';

export class MendBehaviour implements WeaponBehaviour<MendTier> {
  fire(ctx: SimContext, tier: MendTier, _shot: Shot): boolean {
    const s = ctx.s;
    if (s.gateMax <= 0 || s.gateHp >= s.gateMax) return false;
    const before = s.gateHp;
    s.gateHp = Math.min(s.gateMax, s.gateHp + s.gateMax * tier.heal);
    s.mendT = tier.seconds;
    s.mendRate = tier.regen;
    ctx.emit({ e: 'mend', amount: Math.round(s.gateHp - before) });
    return true;
  }
}
