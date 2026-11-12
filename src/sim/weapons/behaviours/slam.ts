/** Stomper: a block drops on the thickest group. Higher tiers daze the surroundings and strike again. */
import { WORLD } from '../../../config/field';
import type { SlamTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { DelayedShot } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX } from '../targeting';

const NEXT_SLAM_AFTER = 0.5;
const FALL_SPEED = 2200;
const START_Y = -180;

export class SlamBehaviour implements WeaponBehaviour<SlamTier> {
  fire(ctx: SimContext, tier: SlamTier, shot: Shot): boolean {
    if (!this.drop(ctx, tier, shot.p)) return false;
    for (let i = 1; i < tier.slams; i++) ctx.weapons.later(shot, i, NEXT_SLAM_AFTER * i, 0);
    return true;
  }

  /** Every further strike looks for the thickest group anew. */
  followUp(ctx: SimContext, tier: SlamTier, d: DelayedShot) { this.drop(ctx, tier, d.p); }

  private drop(ctx: SimContext, tier: SlamTier, p: number): boolean {
    // The block needs a moment to fall; aim at where the group will be.
    const x = crowdX(ctx, tier.halfWidth, 0.2);
    if (x === null) return false;
    const q = ctx.projectiles.spawnProjectile('slab', Math.max(WORLD.gateX + tier.halfWidth * 0.3, Math.min(ctx.s.meta.fieldW, x)), START_Y, 0, FALL_SPEED);
    q.size = tier.halfWidth;
    q.damage = tier.damage;
    q.aux = tier.shockRadius;
    q.seconds = tier.shockStun;
    q.owner = p;
    return true;
  }
}
