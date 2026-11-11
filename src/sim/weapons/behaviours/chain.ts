/** Storm Bell: lightning strikes the toughest raider and jumps on to its nearest neighbours, weaker each time. */
import type { ChainTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Enemy } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets, bodyY, toughTarget } from '../targeting';

export class ChainBehaviour implements WeaponBehaviour<ChainTier> {
  fire(ctx: SimContext, tier: ChainTier, shot: Shot): boolean {
    const first = toughTarget(ctx);
    if (!first) return false;
    const points = [shot.x, shot.y];
    const struck = new Set<number>();
    let current: Enemy | null = first;
    let damage = tier.damage;
    for (let jump = 0; current && jump <= tier.jumps; jump++) {
      struck.add(current.id);
      points.push(Math.round(current.x), Math.round(bodyY(current)));
      const from = current;
      ctx.combat.hurt(from, damage, 'shock', shot.p);
      if (!from.dead) ctx.combat.stun(from, tier.stun);
      damage *= tier.falloff;
      current = this.nearest(ctx, from, struck, tier.jumpRange);
    }
    ctx.emit({ e: 'lightning', points });
    return true;
  }

  private nearest(ctx: SimContext, from: Enemy, struck: Set<number>, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of allTargets(ctx)) {
      if (struck.has(e.id)) continue;
      const d = Math.hypot(e.x - from.x, bodyY(e) - bodyY(from));
      if (d <= bestD) { bestD = d; best = e; }
    }
    return best;
  }
}
