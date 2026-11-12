// Part of the simulation: a thrown raider in the air, its landing and whether the landing kills.
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/field';
import type { Enemy } from './types';
import { clamp, type SimContext } from './context';

/**
 * A thrown raider in the air: gravity, walls, landing, and whether the landing kills.
 */
export class Flight {
  constructor(private ctx: SimContext) {}

  updateAir(e: Enemy) {
    const def = ENEMIES[e.type];
    e.vy += this.ctx.tuning.gravity * DT;
    e.x += e.vx * DT;
    e.y += e.vy * DT;
    e.rot += e.rotV * DT;

    if (e.thrownBy >= 0 && this.ctx.stations.tryPerch(e, WORLD.perch.flySnapRadius)) return;
    if (this.ctx.stations.tryPotInFlight(e)) return;

    if (e.x < WORLD.gateX + def.radius * 0.5) {
      e.x = WORLD.gateX + def.radius * 0.5;
      const sp = Math.abs(e.vx);
      if (sp >= this.ctx.tuning.lethalImpact * 1.1) {
        this.landLethal(e, sp);
        return;
      }
      this.ctx.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: false });
      e.vx = sp * 0.35;
    }
    if (e.x > this.ctx.wall) { e.x = this.ctx.wall; e.vx = -Math.abs(e.vx) * 0.4; }

    const ground = this.ctx.groundOf(e);
    if (e.y < ground) return;
    e.y = ground;
    const sp = Math.hypot(e.vy, e.vx * 0.4);
    if (e.frozenHeld) {
      this.ctx.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: true });
      this.ctx.combat.shatter(e, e.thrownBy, this.ctx.weapons.shatterSpread());
      return;
    }
    const lethalAt = e.crow ? this.ctx.tuning.lethalImpact * BEHAVIOUR.crow.lethalShare : this.ctx.tuning.lethalImpact;
    if (sp >= lethalAt) {
      this.landLethal(e, sp);
      return;
    }
    this.ctx.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: false });
    e.vy = -e.vy * 0.3;
    e.vx *= 0.5;
    e.rotV *= 0.5;
    if (Math.abs(e.vy) < 130) {
      e.vy = 0; e.vx = 0; e.rot = 0; e.rotV = 0;
      e.st = 'stun';
      e.t = BEHAVIOUR.stunSeconds;
      e.y = ground;
    }
  }

  landLethal(e: Enemy, speed: number) {
    this.ctx.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed, etype: e.type, lethal: true });
    const { x, y, thrownBy } = e;
    if (e.type === 'crowcaller' && !e.crow) {
      e.crow = true;
      e.st = 'float';
      e.y = this.ctx.groundOf(e) - 30;
      e.vx = 0; e.vy = 0; e.rot = 0; e.rotV = 0;
      this.ctx.emit({ e: 'crow', x: e.x, y: e.y });
      this.burst(x, y, thrownBy);
      return;
    }
    // A big raider takes a hard landing as a heavy blow instead of dying outright.
    if (e.big) {
      this.ctx.combat.hurt(e, e.maxHp * BEHAVIOUR.big.landingDamage, 'impact', e.thrownBy);
      if (!e.dead) { e.vx = 0; e.vy = 0; e.rot = 0; e.rotV = 0; e.st = 'stun'; e.t = BEHAVIOUR.stunSeconds; }
      this.burst(x, y, thrownBy);
      return;
    }
    if (this.ctx.tuning.knockOthers) this.knockAround(e, speed);
    this.ctx.combat.kill(e, 'impact', e.thrownBy);
    this.burst(x, y, thrownBy);
  }

  /** While the Ember Beacon burns, a raider thrown by a hand bursts where it landed. */
  private burst(x: number, y: number, p: number) {
    if (p >= 0) this.ctx.weapons.onLethalLanding(x, y, p);
  }

  /** Sends a standing raider into a short hop away from x, as a blast of air or a shove would. */
  knockBack(o: Enemy, vx: number, vy: number) {
    o.st = 'air';
    o.vx = vx;
    o.vy = vy;
    o.rotV = this.ctx.rng.range(-6, 6);
    o.thrownBy = -1;
  }

  knockAround(src: Enemy, speed: number) {
    for (const o of this.ctx.s.enemies) {
      if (o === src || o.dead || o.type === 'siegeCart' || o.type === 'yeti' || o.big) continue;
      if (o.st !== 'walk' && o.st !== 'attack') continue;
      if (Math.abs(o.x - src.x) > 60) continue;
      this.knockBack(o, Math.sign(o.x - src.x || 1) * 120, -clamp(speed * 0.3, 120, 300));
    }
  }
}
