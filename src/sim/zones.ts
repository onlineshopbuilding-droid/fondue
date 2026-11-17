/**
 * Patches of road that act on whoever stands in them: fire burns, sticky cheese and snow slow,
 * hot cheese before the gate scalds and slows.
 * Weapons lay them down; they fade on their own.
 */
import { DT } from '../config/field';
import { FLAME_DPS } from '../config/weapons';
import type { SimContext } from './context';
import type { Enemy, Zone } from './types';

export class Zones {
  constructor(private ctx: SimContext) {}

  addFire(x: number, halfWidth: number, seconds: number, dps = FLAME_DPS) {
    this.add({ kind: 'fire', x, halfWidth, t: seconds, dur: seconds, dps, slow: 1 });
  }

  addCheese(x: number, halfWidth: number, seconds: number, slow: number, dps: number) {
    this.add({ kind: 'cheese', x, halfWidth, t: seconds, dur: seconds, dps, slow });
  }

  addSnow(x: number, halfWidth: number, seconds: number, slow: number) {
    this.add({ kind: 'snow', x, halfWidth, t: seconds, dur: seconds, dps: 0, slow });
  }

  addHotCheese(x: number, halfWidth: number, seconds: number, slow: number, dps: number) {
    this.add({ kind: 'hotCheese', x, halfWidth, t: seconds, dur: seconds, dps, slow });
  }

  private add(z: Omit<Zone, 'id'>) {
    if (z.t <= 0) return;
    this.ctx.s.zones.push({ id: this.ctx.s.nextId++, ...z });
    this.ctx.emit({ e: 'zone', kind: z.kind, x: z.x, halfWidth: z.halfWidth });
  }

  /** Walk speed factor for a raider: the strongest slowing zone it stands in. */
  slowAt(e: Enemy): number {
    let f = 1;
    for (const z of this.ctx.s.zones) {
      if (z.slow < f && Math.abs(e.x - z.x) <= z.halfWidth && this.ctx.enemies.isGrounded(e)) f = z.slow;
    }
    return f;
  }

  update() {
    const s = this.ctx.s;
    for (const z of s.zones) {
      z.t -= DT;
      if (z.dps <= 0) continue;
      for (const e of [...s.enemies]) {
        if (e.dead || !this.ctx.enemies.isGrounded(e)) continue;
        if (Math.abs(e.x - z.x) <= z.halfWidth) this.ctx.combat.hurt(e, z.dps * DT, 'fire', -1);
      }
    }
    s.zones = s.zones.filter((z) => z.t > 0);
  }
}
