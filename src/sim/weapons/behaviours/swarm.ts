/** Hornet Hive (passive): sends hornets at the raiders closest to the gate, one raider per hornet as far as they go. */
import type { SwarmTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets } from '../targeting';

export class SwarmBehaviour implements WeaponBehaviour<SwarmTier> {
  fire(ctx: SimContext, tier: SwarmTier, shot: Shot): boolean {
    const front = allTargets(ctx).sort((a, b) => a.x - b.x);
    if (front.length === 0) return false;
    for (let i = 0; i < tier.hornets; i++) {
      const target = front[i % front.length];
      const q = ctx.projectiles.spawnProjectile('hornet', shot.x, shot.y - 10 + (i % 3) * 8, 0, 0);
      q.aux = target.id;
      q.damage = tier.damage;
      q.maxHits = tier.stings;
      q.size = 10;
      q.t = 0;
      q.seconds = 0;
      q.owner = shot.p;
    }
    ctx.emit({ e: 'hive', x: shot.x, y: shot.y });
    return true;
  }
}
