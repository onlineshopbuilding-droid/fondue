import { ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/world';
import { AIM, WEAPONS, type HornId, type WeaponSlot } from '../config/shop';
import { AIM_LAND_Y, aimShot } from './aim';
import type { Hand, Projectile, ProjectileKind } from './types';
import { clamp, type SimContext } from './context';

/**
 * The weapons on the keep: which one is built, reloading, and what firing each of them does.
 */
export class WeaponSystem {
  constructor(private ctx: SimContext) {}

  /** Highest owned item of a slot, or null. */
  tierOf(slot: WeaponSlot): string | null {
    const ids: Record<WeaponSlot, string[]> = {
      wheel: ['wheel3', 'wheel2', 'wheel1'],
      stomper: ['stomper3', 'stomper2', 'stomper1'],
      comet: ['comet3', 'comet2', 'comet1'],
      horn: [],
      bolter: ['bolter3', 'bolter2', 'bolter1'],
    };
    if (slot === 'horn') return this.ctx.s.meta.hornEquipped;
    return ids[slot].find((i) => this.ctx.owns(i)) ?? null;
  }

  startCooldown(slot: WeaponSlot, seconds: number) {
    this.ctx.s.cooldowns[slot] = seconds;
    this.ctx.s.cooldownMax[slot] = seconds;
  }

  activate(p: number, slot: WeaponSlot) {
    const s = this.ctx.s;
    const h = s.hands[p];
    if (!h || s.phase !== 'battle' || s.paused) return;
    const tier = this.tierOf(slot);
    const modeOf: Partial<Record<WeaponSlot, Hand['mode']>> = { stomper: 'stomper', comet: 'comet', horn: 'horn', bolter: 'bolter' };
    if (modeOf[slot] && h.mode === modeOf[slot]) { this.ctx.hands.cancelMode(p); return; }
    if (!tier || s.cooldowns[slot] > 0) { this.ctx.emit({ e: 'denied', p }); return; }
    if (h.holding >= 0 || h.holdingProj >= 0) this.ctx.hands.dropHeld(p);
    if (h.mode !== 'none') this.ctx.hands.cancelMode(p);
    h.modePress = false;

    switch (slot) {
      case 'wheel': {
        const w = WEAPONS.wheel[tier as keyof typeof WEAPONS.wheel];
        const q = this.ctx.projectiles.spawnProjectile('wheel', WORLD.gateX + 30, WORLD.groundY + 22 - w.radius, w.speed, 0);
        q.size = w.radius; q.damage = w.damage; q.pierce = true; q.maxHits = w.maxHits;
        this.startCooldown(slot, w.cooldown);
        this.ctx.emit({ e: 'wheel', size: w.radius });
        break;
      }
      case 'stomper':
        h.mode = 'stomper';
        break;
      case 'comet':
        h.mode = 'comet';
        break;
      case 'horn':
        h.mode = 'horn';
        break;
      case 'bolter':
        h.mode = 'bolter';
        break;
    }
  }

  /** Letting go of a weapon being aimed. Too short a pull changes nothing and costs nothing. */
  fireAimed(p: number, slot: 'horn' | 'bolter', x: number, y: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    h.mode = 'none';
    const horn = s.meta.hornEquipped as HornId | null;
    if (slot === 'horn' && !horn) return;
    const shot = aimShot(slot, horn, x, y, s.meta.fieldW, this.ctx.tuning.gravity);
    if (!shot.ok) { this.ctx.emit({ e: 'aimHint', p, slot }); return; }
    if (s.cooldowns[slot] > 0) { this.ctx.emit({ e: 'denied', p }); return; }
    if (slot === 'bolter') this.fireBolter(shot);
    else this.fireHorn(p, horn!, shot);
  }

  fireBolter(shot: ReturnType<typeof aimShot>) {
    const tier = this.tierOf('bolter');
    if (!tier) return;
    const w = WEAPONS.bolter[tier as keyof typeof WEAPONS.bolter];
    const speed = Math.hypot(shot.vx, shot.vy);
    const heading = Math.atan2(shot.vy, shot.vx);
    const spread = (AIM.bolter.spreadDeg * Math.PI) / 180;
    for (let i = 0; i < w.bolts; i++) {
      const a = heading + (i - (w.bolts - 1) / 2) * spread;
      const q = this.ctx.projectiles.spawnProjectile('roofBolt', shot.x0, shot.y0, Math.cos(a) * speed, Math.sin(a) * speed);
      q.damage = w.damage * shot.power;
      q.pierce = w.pierce;
      q.size = 8;
      q.ttl = shot.flight;
      q.rot = a;
    }
    this.startCooldown('bolter', w.cooldown);
    this.ctx.emit({ e: 'bolters', x: shot.x0, y: shot.y0 });
  }

  fireHorn(p: number, id: HornId, shot: ReturnType<typeof aimShot>) {
    const w = WEAPONS.horn[id];
    this.startCooldown('horn', w.cooldown);
    const kind: ProjectileKind = w.kind === 'blast' ? 'shell' : w.kind === 'freeze' ? 'frostShell' : 'fireShell';
    const q = this.ctx.projectiles.spawnProjectile(kind, shot.x0, shot.y0, shot.vx, shot.vy);
    q.owner = p;
    if (w.kind === 'blast') { q.size = w.radius; q.damage = w.damage; this.ctx.emit({ e: 'mortar', x: shot.x0, y: shot.y0 }); }
    else if (w.kind === 'freeze') { q.size = w.radius; this.ctx.emit({ e: 'shoot', x: shot.x0, y: shot.y0, kind }); }
    else { q.size = w.halfWidth; q.damage = w.flameSeconds; this.ctx.emit({ e: 'bellows', x: shot.x0, halfWidth: 30 }); }
  }

  /** A horn shell has come down. */
  landHorn(q: Projectile) {
    if (q.kind === 'shell') { this.ctx.combat.blast(q.x, q.y, q.size, q.damage, q.owner); return; }
    if (q.kind === 'fireShell') { this.ctx.emit({ e: 'bellows', x: q.x, halfWidth: q.size }); this.ctx.combat.addFlame(q.x, q.size, q.damage); return; }
    this.ctx.emit({ e: 'freeze', x: q.x, y: q.y - 40, radius: q.size });
    for (const e of this.ctx.s.enemies) {
      if (e.dead || e.st === 'held' || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      if (e.type === 'siegeCart' || e.crow) continue;
      if (Math.hypot(e.x - q.x, e.y - ENEMIES[e.type].height * 0.5 - (q.y - 40)) > q.size + ENEMIES[e.type].radius) continue;
      this.ctx.combat.freeze(e, q.owner);
    }
  }

  fireStomper(p: number, x: number, vy: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    h.mode = 'none';
    const tier = this.tierOf('stomper');
    if (!tier || s.cooldowns.stomper > 0) { this.ctx.emit({ e: 'denied', p }); return; }
    const w = WEAPONS.stomper[tier as keyof typeof WEAPONS.stomper];
    this.startCooldown('stomper', w.cooldown);
    const q = this.ctx.projectiles.spawnProjectile('slab', clamp(x, WORLD.gateX + w.halfWidth * 0.3, s.meta.fieldW), -180, 0, Math.max(2200, vy));
    q.size = w.halfWidth; q.damage = w.damage; q.heldBy = -1;
  }

  /** The sky answers a tap on the field. The comet comes in at a slant and lands right there. */
  fireComet(p: number, x: number) {
    const s = this.ctx.s;
    s.hands[p].mode = 'none';
    const tier = this.tierOf('comet');
    if (!tier || s.cooldowns.comet > 0) { this.ctx.emit({ e: 'denied', p }); return; }
    const w = WEAPONS.comet[tier as 'comet1'];
    // A whole number of steps, so that the landing is exact.
    const t = Math.round(WEAPONS.comet.fallSeconds / DT) * DT;
    const g = this.ctx.tuning.gravity;
    const target = clamp(x, WORLD.gateX + 10, s.meta.fieldW);
    const startX = target + 150;
    const startY = -160;
    // Velocity is integrated before position each step; the last term cancels the resulting offset.
    const q = this.ctx.projectiles.spawnProjectile('comet', startX, startY, (target - startX) / t, (AIM_LAND_Y + 1 - startY) / t - (g * t) / 2 - (g * DT) / 2);
    q.size = w.radius * (1 + WEAPONS.comet.bonus);
    q.damage = w.damage * (1 + WEAPONS.comet.bonus);
    q.owner = p;
    this.startCooldown('comet', w.cooldown);
    this.ctx.emit({ e: 'shoot', x: q.x, y: 40, kind: 'comet' });
  }
}
