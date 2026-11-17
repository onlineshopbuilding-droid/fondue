/**
 * Storm Bell (passive): lightning strikes the toughest raider and jumps on to its nearest neighbours,
 * weaker each time. On the top tier two bolts start at once, the second at the next toughest raider.
 */
import type { ChainTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Enemy } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { allTargets, bodyY, toughTarget } from '../targeting';

export class ChainBehaviour implements WeaponBehaviour<ChainTier> {
  fire(ctx: SimContext, tier: ChainTier, shot: Shot): boolean {
    const first = toughTarget(ctx);
    if (!first) return false;
    const struck = new Set<number>();
    this.strike(ctx, tier, shot, first, struck);
    for (let i = 1; i < tier.strikes; i++) {
      let next: Enemy | null = null;
      for (const e of allTargets(ctx)) if (!struck.has(e.id) && (!next || e.hp > next.hp)) next = e;
      if (!next) break;
      this.strike(ctx, tier, shot, next, struck);
    }
    return true;
  }

  private strike(ctx: SimContext, tier: ChainTier, shot: Shot, first: Enemy, struck: Set<number>) {
    const points = [shot.x, shot.y];
    let current: Enemy | null = first;
    let damage = tier.damage;
    for (let jump = 0; current && jump <= tier.jumps; jump++) {
      struck.add(current.id);
      points.push(Math.round(current.x), Math.round(bodyY(current)));
      const from: Enemy = current;
      ctx.combat.hurt(from, damage, 'shock', shot.p);
      if (!from.dead) ctx.combat.stun(from, tier.stun);
      damage *= tier.falloff;
      current = this.nearest(ctx, from, struck, tier.jumpRange);
    }
    ctx.emit({ e: 'lightning', points });
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
