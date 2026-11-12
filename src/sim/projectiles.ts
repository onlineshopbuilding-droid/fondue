// Part of the simulation: everything that flies besides raiders, such as bombs, bolts, wheels and shells.
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/field';
import type { Projectile, ProjectileKind } from './types';
import type { SimContext } from './context';

/** Height at which shells, comets and slabs meet the road. */
export const LAND_Y = WORLD.groundY + 22;

/**
 * Everything that flies besides raiders: bombs, stones, bolts, wheels, comets, slabs and shells.
 * A projectile carries the numbers of the weapon that fired it, so landing needs no look-up.
 */
export class Projectiles {
  constructor(private ctx: SimContext) {}

  spawnProjectile(kind: ProjectileKind, x: number, y: number, vx: number, vy: number): Projectile {
    const q: Projectile = {
      id: this.ctx.s.nextId++, kind, x, y, vx, vy, rot: 0, t: 0, size: 10, damage: 0,
      heldBy: -1, owner: -1, pierce: false, hit: [], maxHits: Infinity, ttl: 2.5, byPlayer: false, landed: false,
      seconds: 0, aux: 0, burstOnLand: false,
    };
    this.ctx.s.projectiles.push(q);
    return q;
  }

  /**
   * Launch velocity of something that should come down at (tx, LAND_Y) after `flight` seconds.
   * Velocity is integrated before position each step; the last term cancels the resulting offset.
   */
  arcTo(x0: number, y0: number, tx: number, flight: number): { vx: number; vy: number; t: number } {
    const t = Math.max(DT, Math.round(flight / DT) * DT);
    const g = this.ctx.tuning.gravity;
    return { vx: (tx - x0) / t, vy: (LAND_Y + 1 - y0) / t - (g * t) / 2 - (g * DT) / 2, t };
  }

  updateProjectiles() {
    const s = this.ctx.s;
    const g = this.ctx.tuning.gravity;
    for (const q of [...s.projectiles]) {
      switch (q.kind) {
        case 'bomb': this.updateBomb(q); break;
        case 'stone':
        case 'bolt':
          if (q.kind === 'stone') q.vy += g * DT;
          q.x += q.vx * DT;
          q.y += q.vy * DT;
          q.rot += 0.25;
          if (q.x <= WORLD.gateX + 8) {
            this.ctx.combat.damageGate(q.damage, WORLD.gateX + 6, q.y, q.kind === 'stone' ? 'slinger' : 'siegeCart');
            q.t = -1;
          }
          break;
        case 'wheel': this.updateWheel(q); break;
        case 'slab': this.updateSlab(q); break;
        case 'comet': this.updateComet(q); break;
        case 'roofBolt': this.updateRoofBolt(q); break;
        case 'shell':
        case 'frostShell':
        case 'fireShell':
          this.updateShell(q);
          break;
      }
    }
  }

  private updateWheel(q: Projectile) {
    const s = this.ctx.s;
    const before = q.x;
    q.x += q.vx * DT;
    q.rot += (q.vx / q.size) * DT;
    // A burning wheel lays a strip of fire every stretch of road it has covered.
    if (q.seconds > 0 && Math.floor(q.x / 120) !== Math.floor(before / 120) && q.x > WORLD.gateX + 60 && q.x < s.meta.fieldW) {
      this.ctx.zones.addFire(q.x - 60, 64, q.seconds);
    }
    for (const e of [...s.enemies]) {
      if (e.dead || q.hit.includes(e.id) || !this.ctx.enemies.isGrounded(e)) continue;
      if (Math.abs(e.x - q.x) > q.size + ENEMIES[e.type].radius * 0.6) continue;
      q.hit.push(e.id);
      this.ctx.combat.hurt(e, q.damage, 'crush', q.owner);
      if (q.hit.length >= q.maxHits) { q.t = -1; this.ctx.emit({ e: 'explosion', x: q.x, y: q.y, radius: q.size }); break; }
    }
    if (q.x > s.meta.fieldW + 140) q.t = -1;
  }

  private updateSlab(q: Projectile) {
    q.y += q.vy * DT;
    if (q.y < LAND_Y - 30) return;
    q.t = -1;
    this.ctx.emit({ e: 'slam', x: q.x, y: LAND_Y, halfWidth: q.size, shock: q.aux });
    for (const e of [...this.ctx.s.enemies]) {
      if (e.dead || !this.ctx.enemies.isGrounded(e)) continue;
      const d = Math.abs(e.x - q.x);
      if (d <= q.size + ENEMIES[e.type].radius * 0.5) this.ctx.combat.hurt(e, q.damage, 'crush', q.owner);
      else if (d <= q.aux) this.ctx.combat.stun(e, q.seconds);
    }
  }

  updateBomb(q: Projectile) {
    const s = this.ctx.s;
    const b = BEHAVIOUR.bomb;
    q.t -= DT;
    const fused = q.t <= 0;
    if (q.heldBy >= 0) {
      const h = s.hands[q.heldBy];
      if (h) { q.x = h.x; q.y = h.y; }
    } else if (!q.landed) {
      q.vy += this.ctx.tuning.gravity * DT;
      q.x += q.vx * DT;
      q.y += q.vy * DT;
      q.rot += 0.2;
      const ground = WORLD.groundY + 20;
      if (q.x <= WORLD.gateX + 8) {
        this.explodeBomb(q);
        return;
      }
      if (q.y >= ground) {
        q.y = ground;
        if (q.burstOnLand || q.x < WORLD.gateX + 70) { this.explodeBomb(q); return; }
        if (q.vy > 300) { q.vy = -q.vy * 0.25; q.vx *= 0.5; } else { q.landed = true; q.vx = 0; q.vy = 0; }
      }
    }
    if (fused) {
      if (q.heldBy >= 0) {
        const h = s.hands[q.heldBy];
        if (h) h.holdingProj = -1;
        q.heldBy = -1;
      }
      this.explodeBomb(q, b.blastRadius);
    }
  }

  explodeBomb(q: Projectile, radius = BEHAVIOUR.bomb.blastRadius) {
    q.t = -1;
    // A keg shaken loose belongs to the player and spares the gate.
    if (!q.burstOnLand && q.x < WORLD.gateX + 90) this.ctx.combat.damageGate(q.damage || BEHAVIOUR.bomb.gateDamage, WORLD.gateX + 6, q.y, 'bomber');
    if (q.byPlayer) this.ctx.combat.blast(q.x, q.y, radius, BEHAVIOUR.bomb.blastDamage, q.owner, true);
    else this.ctx.emit({ e: 'explosion', x: q.x, y: q.y, radius });
  }

  private updateComet(q: Projectile) {
    if (q.t < 0) return;
    q.vy += this.ctx.tuning.gravity * DT;
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.rot += 0.3;
    if (q.y < LAND_Y) return;
    q.t = -1;
    this.ctx.combat.blast(q.x, LAND_Y, q.size, q.damage, q.owner);
    this.ctx.zones.addFire(q.x, q.size * 0.6, q.seconds);
  }

  private updateShell(q: Projectile) {
    q.vy += this.ctx.tuning.gravity * DT;
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.rot += 0.3;
    if (q.y < LAND_Y) return;
    q.y = LAND_Y;
    q.t = -1;
    if (q.kind === 'shell') { this.ctx.combat.blast(q.x, q.y, q.size, q.damage, q.owner); return; }
    if (q.kind === 'fireShell') {
      this.ctx.emit({ e: 'bellows', x: q.x, halfWidth: q.size });
      this.ctx.zones.addFire(q.x, q.size, q.seconds, q.aux);
      return;
    }
    this.ctx.emit({ e: 'freeze', x: q.x, y: q.y - 40, radius: q.size });
    for (const e of this.ctx.s.enemies) {
      if (e.dead || e.st === 'held' || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      if (e.type === 'siegeCart' || e.crow || e.big) continue;
      if (Math.hypot(e.x - q.x, e.y - ENEMIES[e.type].height * 0.5 - (q.y - 40)) > q.size + ENEMIES[e.type].radius) continue;
      this.ctx.combat.freeze(e, q.owner, q.seconds);
    }
  }

  private updateRoofBolt(q: Projectile) {
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.t += DT;
    for (const e of [...this.ctx.s.enemies]) {
      if (e.dead || e.hidden || q.hit.includes(e.id) || e.st === 'held' || e.st === 'hooked' || e.st === 'cooking') continue;
      const def = ENEMIES[e.type];
      const scale = e.big ? BEHAVIOUR.big.scale : 1;
      if (Math.abs(q.x - e.x) > def.radius * scale + 6) continue;
      if (q.y < e.y - def.height * scale || q.y > e.y) continue;
      q.hit.push(e.id);
      this.ctx.combat.hurt(e, q.damage, 'bolt', q.owner);
      if (!q.pierce) { q.t = -1; return; }
    }
    if (q.y > WORLD.groundY + 30 || q.x > this.ctx.s.meta.fieldW + 80 || q.t > q.ttl) q.t = -1;
  }
}
