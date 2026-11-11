/** Rolling Wheel: a wheel rolls down the whole road. Higher tiers burn a trail and send a second wheel. */
import { WORLD } from '../../../config/field';
import type { RollTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';

const SECOND_WHEEL_AFTER = 0.55;

export class RollBehaviour implements WeaponBehaviour<RollTier> {
  fire(ctx: SimContext, tier: RollTier, shot: Shot): boolean {
    this.roll(ctx, tier, shot.p);
    for (let i = 1; i < tier.wheels; i++) ctx.weapons.later(shot, i, SECOND_WHEEL_AFTER * i, 0);
    return true;
  }

  followUp(ctx: SimContext, tier: RollTier, d: DelayedShot) { this.roll(ctx, tier, d.p); }

  private roll(ctx: SimContext, tier: RollTier, p: number) {
    const q = ctx.projectiles.spawnProjectile('wheel', WORLD.gateX + 30, WORLD.groundY + 22 - tier.radius, tier.speed, 0);
    q.size = tier.radius;
    q.damage = tier.damage;
    q.pierce = true;
    q.maxHits = tier.maxHits;
    q.seconds = tier.fireTrail;
    q.owner = p;
    ctx.emit({ e: 'wheel', size: tier.radius });
  }
}
