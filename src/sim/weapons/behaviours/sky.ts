/** Comet: falls on the thickest group and leaves fire. Higher tiers break into shards that land beside it. */
import { WORLD } from '../../../config/field';
import { SKY_FALL, type SkyTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX } from '../targeting';

const START = { dx: 150, y: -160 };
/** Shards are smaller and weaker than the comet, and land a little later, further and further out. */
const SHARD = { size: 0.55, damage: 0.45, spacing: 0.95, delay: 0.09 };

export class SkyBehaviour implements WeaponBehaviour<SkyTier> {
  fire(ctx: SimContext, tier: SkyTier, shot: Shot): boolean {
    const x = crowdX(ctx, tier.radius, SKY_FALL);
    if (x === null) return false;
    this.drop(ctx, x, SKY_FALL, tier.radius, tier.damage, tier.flameSeconds, shot.p);
    for (let i = 0; i < tier.shards; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const step = Math.floor(i / 2) + 1;
      const sx = x + side * step * tier.radius * SHARD.spacing;
      this.drop(ctx, sx, SKY_FALL + SHARD.delay * (i + 1), tier.radius * SHARD.size, tier.damage * SHARD.damage, tier.flameSeconds * 0.6, shot.p);
    }
    ctx.emit({ e: 'shoot', x: x + START.dx, y: 40, kind: 'comet' });
    return true;
  }

  private drop(ctx: SimContext, x: number, fall: number, radius: number, damage: number, flame: number, p: number) {
    const target = Math.max(WORLD.gateX + 10, Math.min(ctx.s.meta.fieldW, x));
    const startX = target + START.dx;
    const v = ctx.projectiles.arcTo(startX, START.y, target, fall);
    const q = ctx.projectiles.spawnProjectile('comet', startX, START.y, v.vx, v.vy);
    q.size = radius;
    q.damage = damage;
    q.seconds = flame;
    q.owner = p;
  }
}
