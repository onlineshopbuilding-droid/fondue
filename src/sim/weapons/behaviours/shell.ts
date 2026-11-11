/**
 * The gate arms that lob a shell in an arc: Gate Mortar (blast at the raider closest to the gate),
 * Frost Horn (ice on the thickest group) and Dragon Bellows (fire on the thickest group).
 */
import { WORLD } from '../../../config/field';
import { SHELL_FLIGHT, type ShellTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { ProjectileKind } from '../../types';
import type { Shot, WeaponBehaviour } from '../behaviour';
import { crowdX, frontTarget, leadX } from '../targeting';

const KIND: Record<ShellTier['effect'], ProjectileKind> = { blast: 'shell', freeze: 'frostShell', flame: 'fireShell' };
/** Further shells of one shot leave a little later each. */
const NEXT_SHELL_AFTER = 0.14;

export class ShellBehaviour implements WeaponBehaviour<ShellTier> {
  fire(ctx: SimContext, tier: ShellTier, shot: Shot): boolean {
    const x = this.aim(ctx, tier);
    if (x === null) return false;
    for (let i = 0; i < tier.shells; i++) this.lob(ctx, tier, shot, x + this.offset(tier, i), SHELL_FLIGHT + NEXT_SHELL_AFTER * i);
    if (tier.effect === 'blast') ctx.emit({ e: 'mortar', x: shot.x, y: shot.y });
    else if (tier.effect === 'flame') ctx.emit({ e: 'bellows', x: shot.x, halfWidth: 30 });
    else ctx.emit({ e: 'shoot', x: shot.x, y: shot.y, kind: 'frostShell' });
    return true;
  }

  private aim(ctx: SimContext, tier: ShellTier): number | null {
    if (tier.effect === 'blast') {
      const front = frontTarget(ctx, false);
      return front ? leadX(ctx, front, SHELL_FLIGHT) : null;
    }
    return crowdX(ctx, tier.radius, SHELL_FLIGHT);
  }

  /** Mortar shells walk up the column behind the first; fires spread to both sides. */
  private offset(tier: ShellTier, i: number): number {
    if (i === 0) return 0;
    if (tier.effect === 'blast') return i * tier.radius * 1.1;
    const side = i % 2 === 1 ? 1 : -1;
    return side * Math.ceil(i / 2) * tier.radius * 1.7;
  }

  private lob(ctx: SimContext, tier: ShellTier, shot: Shot, x: number, flight: number) {
    const target = Math.max(WORLD.gateX + 30, Math.min(ctx.s.meta.fieldW, x));
    const v = ctx.projectiles.arcTo(shot.x, shot.y, target, flight);
    const q = ctx.projectiles.spawnProjectile(KIND[tier.effect], shot.x, shot.y, v.vx, v.vy);
    q.owner = shot.p;
    q.size = tier.radius;
    q.seconds = tier.seconds;
    if (tier.effect === 'blast') q.damage = tier.damage;
    // For fire, `damage` in the table is the burn per second.
    if (tier.effect === 'flame') q.aux = tier.damage;
  }
}
