/** Roof Bolter: a wide fan of bolts over the whole height, balloons above and runners below. */
import { WORLD } from '../../../config/field';
import type { VolleyTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets } from '../targeting';

/** The fan reaches from almost level (far balloons) to steeply down (the road near the gate). Degrees below level. */
const FAN = { fromDeg: 3, toDeg: 56 };
const SPEED = 1500;
const NEXT_VOLLEY_AFTER = 0.35;

export class VolleyBehaviour implements WeaponBehaviour<VolleyTier> {
  fire(ctx: SimContext, tier: VolleyTier, shot: Shot): boolean {
    if (allTargets(ctx).length === 0) return false;
    this.volley(ctx, tier, shot.x, shot.y, shot.p, 0);
    for (let i = 1; i < tier.volleys; i++) ctx.weapons.later(shot, i, NEXT_VOLLEY_AFTER * i, 0);
    return true;
  }

  /** The second volley fills the gaps of the first. */
  followUp(ctx: SimContext, tier: VolleyTier, d: DelayedShot) {
    const slot = ctx.weapons.slotPosition(d.slot);
    this.volley(ctx, tier, slot.x, slot.y, d.p, 0.5);
  }

  private volley(ctx: SimContext, tier: VolleyTier, x: number, y: number, p: number, shift: number) {
    const reach = Math.hypot(ctx.s.meta.fieldW - x, WORLD.groundY - y);
    for (let i = 0; i < tier.bolts; i++) {
      const u = tier.bolts === 1 ? 0.5 : (i + shift) / (tier.bolts - 1 + shift * 2);
      const a = ((FAN.fromDeg + (FAN.toDeg - FAN.fromDeg) * u) * Math.PI) / 180;
      const q = ctx.projectiles.spawnProjectile('roofBolt', x, y, Math.cos(a) * SPEED, Math.sin(a) * SPEED);
      q.damage = tier.damage;
      q.pierce = tier.pierce;
      q.size = 8;
      q.ttl = reach / SPEED;
      q.rot = a;
      q.owner = p;
    }
    ctx.emit({ e: 'bolters', x, y });
  }
}
