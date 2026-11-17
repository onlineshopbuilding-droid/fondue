/** Pinecone Catapult (passive): lobs pinecones on the thickest group; further cones land beside the first. */
import { WORLD } from '../../../config/field';
import { SHELL_FLIGHT, type LobTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX } from '../targeting';

/** Cones fly a little longer than a mortar shell, high over the field. */
const FLIGHT = SHELL_FLIGHT + 0.25;
const NEXT_CONE_AFTER = 0.1;

export class LobBehaviour implements WeaponBehaviour<LobTier> {
  fire(ctx: SimContext, tier: LobTier, shot: Shot): boolean {
    const x = crowdX(ctx, tier.radius, FLIGHT);
    if (x === null) return false;
    for (let i = 0; i < tier.cones; i++) {
      const side = i % 2 === 1 ? 1 : -1;
      const off = i === 0 ? 0 : side * Math.ceil(i / 2) * tier.radius * 0.9;
      const target = Math.max(WORLD.gateX + 30, Math.min(ctx.s.meta.fieldW, x + off));
      const v = ctx.projectiles.arcTo(shot.x, shot.y, target, FLIGHT + NEXT_CONE_AFTER * i);
      const q = ctx.projectiles.spawnProjectile('pinecone', shot.x, shot.y, v.vx, v.vy);
      q.size = tier.radius;
      q.damage = tier.damage;
      q.seconds = tier.stun;
      q.owner = shot.p;
    }
    ctx.emit({ e: 'catapult', x: shot.x, y: shot.y });
    return true;
  }
}
