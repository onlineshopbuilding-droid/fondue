/** Ember Beacon: while it burns, every raider thrown by a hand bursts where it lands hard. */
import type { BeaconTier } from '../../../config/weapons';
import type { SimContext } from '../../context';
import type { Shot, WeaponBehaviour } from '../behaviour';

export class BeaconBehaviour implements WeaponBehaviour<BeaconTier> {
  fire(ctx: SimContext, tier: BeaconTier, _shot: Shot): boolean {
    ctx.s.beaconT = tier.seconds;
    ctx.emit({ e: 'beacon', seconds: tier.seconds });
    return true;
  }

  onLethalLanding(ctx: SimContext, tier: BeaconTier, x: number, y: number, p: number) {
    if (ctx.s.beaconT <= 0) return;
    ctx.combat.blast(x, y - 30, tier.radius, tier.damage, p);
    ctx.zones.addFire(x, tier.radius * 0.6, tier.flameSeconds);
  }
}
