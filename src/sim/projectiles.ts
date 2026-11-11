import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/world';
import { WEAPONS } from '../config/shop';
import { AIM_LAND_Y } from './aim';
import type { Projectile, ProjectileKind } from './types';
import type { SimContext } from './context';

/**
 * Everything that flies besides raiders: bombs, stones, bolts, wheels, comets, slabs and shells.
 */
export class Projectiles {
  constructor(private ctx: SimContext) {}

  spawnProjectile(kind: ProjectileKind, x: number, y: number, vx: number, vy: number): Projectile {
    const q: Projectile = {
      id: this.ctx.s.nextId++, kind, x, y, vx, vy, rot: 0, t: 0, size: 10, damage: 0,
      heldBy: -1, owner: -1, pierce: false, hit: [], maxHits: Infinity, ttl: 2.5, byPlayer: false, landed: false,
    };
    this.ctx.s.projectiles.push(q);
    return q;
  }

  updateProjectiles() {
    const s = this.ctx.s;
    const g = this.ctx.tuning.gravity;
    const groundLine = WORLD.groundY + 22;
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
        case 'wheel':
          q.x += q.vx * DT;
          q.rot += (q.vx / q.size) * DT;
          for (const e of [...s.enemies]) {
            if (e.dead || q.hit.includes(e.id) || !this.ctx.enemies.isGrounded(e)) continue;
            if (Math.abs(e.x - q.x) > q.size + ENEMIES[e.type].radius * 0.6) continue;
            q.hit.push(e.id);
            this.ctx.combat.hurt(e, q.damage, 'crush', -1);
            if (q.hit.length >= q.maxHits) { q.t = -1; this.ctx.emit({ e: 'explosion', x: q.x, y: q.y, radius: q.size }); break; }
          }
          if (q.x > s.meta.fieldW + 140) q.t = -1;
          break;
        case 'slab':
          q.y += q.vy * DT;
          if (q.y >= groundLine - 30) {
            this.ctx.emit({ e: 'slam', x: q.x, y: groundLine, halfWidth: q.size });
            for (const e of [...s.enemies]) {
              if (e.dead || !this.ctx.enemies.isGrounded(e)) continue;
              if (Math.abs(e.x - q.x) <= q.size + ENEMIES[e.type].radius * 0.5) this.ctx.combat.hurt(e, q.damage, 'crush', -1);
            }
            q.t = -1;
          }
          break;
        case 'comet':
          this.updateComet(q);
          break;
        case 'roofBolt':
          this.updateRoofBolt(q);
          break;
        case 'shell':
        case 'frostShell':
        case 'fireShell':
          this.updateShell(q);
          break;
      }
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
        if (q.x < WORLD.gateX + 70) { this.explodeBomb(q); return; }
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
    if (q.x < WORLD.gateX + 90) this.ctx.combat.damageGate(q.damage || BEHAVIOUR.bomb.gateDamage, WORLD.gateX + 6, q.y, 'bomber');
    if (q.byPlayer) this.ctx.combat.blast(q.x, q.y, radius, BEHAVIOUR.bomb.blastDamage, -1);
    else this.ctx.emit({ e: 'explosion', x: q.x, y: q.y, radius });
  }

  updateComet(q: Projectile) {
    if (q.t < 0) return;
    q.vy += this.ctx.tuning.gravity * DT;
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.rot += 0.3;
    if (q.y < AIM_LAND_Y) return;
    q.t = -1;
    this.ctx.combat.blast(q.x, AIM_LAND_Y, q.size, q.damage, q.owner);
    const tier = this.ctx.weapons.tierOf('comet');
    if (tier) this.ctx.combat.addFlame(q.x, q.size * 0.6, WEAPONS.comet[tier as 'comet1'].flameSeconds);
  }

  updateShell(q: Projectile) {
    q.vy += this.ctx.tuning.gravity * DT;
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.rot += 0.3;
    if (q.y < AIM_LAND_Y) return;
    q.y = AIM_LAND_Y;
    q.t = -1;
    this.ctx.weapons.landHorn(q);
  }

  updateRoofBolt(q: Projectile) {
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.t += DT;
    for (const e of [...this.ctx.s.enemies]) {
      if (e.dead || e.hidden || q.hit.includes(e.id) || e.st === 'held') continue;
      const def = ENEMIES[e.type];
      if (Math.abs(q.x - e.x) > def.radius + 6) continue;
      if (q.y < e.y - def.height || q.y > e.y) continue;
      q.hit.push(e.id);
      this.ctx.combat.hurt(e, q.damage, 'bolt', -1);
      if (!q.pierce) { q.t = -1; return; }
    }
    if (q.y > WORLD.groundY + 30 || q.x > this.ctx.s.meta.fieldW + 80 || q.t > q.ttl) q.t = -1;
  }
}
