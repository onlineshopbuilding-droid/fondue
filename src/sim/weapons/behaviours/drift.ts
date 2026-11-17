/**
 * Snowdrift Cannon: lobs snowballs at the thickest group; each piles into a slowing drift on the road.
 * On the top tier a blizzard covers the whole road as well.
 */
import { WORLD } from '../../../config/field';
import { SHELL_FLIGHT, type DriftTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX } from '../targeting';

const NEXT_BALL_AFTER = 0.12;

export class DriftBehaviour implements WeaponBehaviour<DriftTier> {
  fire(ctx: SimContext, tier: DriftTier, shot: Shot): boolean {
    const x = crowdX(ctx, tier.halfWidth, SHELL_FLIGHT);
    if (x === null) return false;
    if (tier.wholeRoad) {
      const half = (ctx.s.meta.fieldW - WORLD.gateX) / 2;
      ctx.zones.addSnow(WORLD.gateX + half, half, tier.seconds, tier.slow);
      ctx.emit({ e: 'snowdrift', x: WORLD.gateX + half, y: WORLD.groundY });
    }
    // Drifts spread to both sides of the group: middle, behind, ahead.
    for (let i = 0; i < tier.drifts; i++) {
      const side = i % 2 === 1 ? 1 : -1;
      const off = i === 0 ? 0 : side * Math.ceil(i / 2) * tier.halfWidth * 1.8;
      const target = Math.max(WORLD.gateX + 40, Math.min(ctx.s.meta.fieldW, x + off));
      const v = ctx.projectiles.arcTo(shot.x, shot.y, target, SHELL_FLIGHT + NEXT_BALL_AFTER * i);
      const q = ctx.projectiles.spawnProjectile('snowball', shot.x, shot.y, v.vx, v.vy);
      q.size = tier.halfWidth;
      q.seconds = tier.seconds;
      q.aux = tier.slow;
      q.owner = shot.p;
    }
    ctx.emit({ e: 'shoot', x: shot.x, y: shot.y, kind: 'snowball' });
    return true;
  }
}
