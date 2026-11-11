import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/world';
import type { WeaponSlot } from '../config/shop';
import { isAimSlot } from './aim';
import type { Enemy, Projectile } from './types';
import { clamp, type SimContext } from './context';

/**
 * Everything a hand does: grabbing, holding, throwing and pressing a weapon on the keep.
 * The guest predicts some of this on its own machine, see GuestSession (handbook, trap 4).
 */
export class Hands {
  constructor(private ctx: SimContext) {}

  press(p: number, x: number, y: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    if (!h) return;
    h.x = x; h.y = y; h.down = true;
    h.pressX = x; h.pressY = y; h.pressTick = s.tick;
    if (s.phase !== 'battle' || s.paused) return;
    h.modePress = h.mode !== 'none';
    if (h.mode !== 'none') return;
    if (this.tryGrabBomb(p, x, y)) return;
    this.tryGrabEnemy(p, x, y);
  }

  tryGrabBomb(p: number, x: number, y: number): boolean {
    const h = this.ctx.s.hands[p];
    let best: Projectile | null = null;
    let bestD = 44 + this.ctx.tuning.grabRadius * 0.5;
    for (const q of this.ctx.s.projectiles) {
      if (q.kind !== 'bomb' || q.heldBy >= 0) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bestD) { bestD = d; best = q; }
    }
    if (!best) return false;
    best.heldBy = p;
    best.byPlayer = true;
    h.holdingProj = best.id;
    return true;
  }

  grabDistance(e: Enemy, x: number, y: number): number {
    const def = ENEMIES[e.type];
    const halfW = def.radius;
    const top = e.y - (e.crow ? 40 : def.height);
    const dx = Math.max(0, Math.abs(x - e.x) - halfW);
    const dy = y < top ? top - y : y > e.y ? y - e.y : 0;
    return Math.hypot(dx, dy);
  }

  tryGrabEnemy(p: number, x: number, y: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    const pad = this.ctx.tuning.grabRadius;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of s.enemies) {
      if (e.dead || e.hidden || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      if (e.heldBy.length > 0 && !(e.type === 'yeti' && !e.heldBy.includes(p))) continue;
      const d = this.grabDistance(e, x, y);
      if (d > pad) continue;
      // Prefer the enemy the pointer is actually inside, then the closest centre.
      const score = d + Math.abs(x - e.x) * 0.02;
      if (score < bestD) { bestD = score; best = e; }
    }
    if (!best) return;
    const e = best;
    if (e.shieldOn) { this.ctx.emit({ e: 'shieldBlock', x: e.x, y: e.y - 40 }); return; }
    if (!ENEMIES[e.type].grabbable) {
      this.ctx.emit({ e: 'tapCart', x, y, hp: e.hp });
      this.ctx.combat.hurt(e, e.maxHp / BEHAVIOUR.siegeCartTaps, 'tap', p);
      return;
    }
    e.heldBy.push(p);
    e.frozenHeld = e.st === 'frozen';
    e.grabOffX = clamp(e.x - x, -ENEMIES[e.type].radius, ENEMIES[e.type].radius);
    e.grabOffY = clamp(e.y - y, 0, ENEMIES[e.type].height);
    if (e.type === 'yeti') {
      e.grabOffX = 0; e.grabOffY = ENEMIES.yeti.height * 0.5;
      if (e.heldBy.length === 1) e.tugLimit = e.x + BEHAVIOUR.yeti.tugReach;
      if (e.heldBy.length === 2) { e.st = 'held'; e.vx = 0; e.vy = 0; }
    } else {
      e.st = 'held';
      e.vx = 0; e.vy = 0;
    }
    h.holding = e.id;
    this.ctx.emit({ e: 'grab', id: e.id, p, x: e.x, y: e.y, etype: e.type });
  }

  release(p: number, x: number, y: number, vx: number, vy: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    if (!h) return;
    h.x = x; h.y = y; h.down = false;

    if (s.phase !== 'battle') { this.dropHeld(p); return; }
    if (s.paused) return;
    // This press began before the weapon was picked, so letting go is not an aimed shot.
    if (h.mode !== 'none' && !h.modePress) return;

    if (h.mode === 'horn' || h.mode === 'bolter') { this.ctx.weapons.fireAimed(p, h.mode, x, y); return; }
    if (h.mode === 'stomper') { this.ctx.weapons.fireStomper(p, x, vy); return; }
    if (h.mode === 'comet') { this.ctx.weapons.fireComet(p, x); return; }

    if (h.holdingProj >= 0) {
      const q = s.projectiles.find((o) => o.id === h.holdingProj);
      h.holdingProj = -1;
      if (q) {
        q.heldBy = -1;
        const v = this.clampThrow(vx, vy);
        q.vx = v.vx; q.vy = v.vy; q.x = x; q.y = y;
        q.landed = false;
      }
      return;
    }

    const e = s.enemies.find((o) => o.id === h.holding);
    h.holding = -1;
    if (!e || e.dead) return;

    const held = (s.tick - h.pressTick) * DT;
    const moved = Math.hypot(x - h.pressX, y - h.pressY);
    const isTap = held <= BEHAVIOUR.tapMaxSeconds && moved <= BEHAVIOUR.tapMaxMove;

    if (e.type === 'yeti') {
      const wasLifted = e.heldBy.length === 2;
      e.heldBy = [];
      for (const other of s.hands) if (other.holding === e.id) other.holding = -1;
      if (wasLifted) this.throwEnemy(e, vx, vy, p);
      return;
    }

    e.heldBy = [];
    if (isTap && e.st === 'held') {
      if (e.frozenHeld) { this.ctx.combat.shatter(e, p); return; }
      if (e.type === 'bomber' && e.armed) {
        e.armed = false;
        e.kegFuse = BEHAVIOUR.kegDropFuse;
        e.st = 'walk';
        e.y = this.ctx.groundOf(e);
        this.ctx.emit({ e: 'kegDrop', x: e.x, y: e.y });
        return;
      }
    }

    e.x = clamp(x + e.grabOffX, WORLD.gateX + 10, this.ctx.wall - 10);
    e.y = Math.min(y + e.grabOffY, this.ctx.groundOf(e));
    e.thrownBy = p;
    if (this.ctx.stations.tryPerch(e)) return;
    if (this.ctx.stations.tryRearPotOnRelease(e, vx, vy)) return;
    this.throwEnemy(e, vx, vy, p);
    this.liftFlatThrow(e);
    this.ctx.stations.applyCauldronAssist(e);
    this.ctx.stations.steerAtPerch(e);
  }

  clampThrow(vx: number, vy: number) {
    const m = this.ctx.tuning.throwMult;
    let ax = vx * m;
    let ay = vy * m;
    const sp = Math.hypot(ax, ay);
    if (sp > this.ctx.tuning.maxThrow) {
      ax *= this.ctx.tuning.maxThrow / sp;
      ay *= this.ctx.tuning.maxThrow / sp;
    }
    return { vx: ax, vy: ay };
  }

  throwEnemy(e: Enemy, vx: number, vy: number, p: number) {
    const v = this.clampThrow(vx, vy);
    e.vx = v.vx; e.vy = v.vy;
    e.st = 'air';
    e.thrownBy = p;
    e.rotV = clamp(v.vx / 110, -14, 14) + (Math.abs(v.vy) / 240) * (v.vx >= 0 ? 1 : -1);
    if (Math.abs(e.rotV) < 1) e.rotV = this.ctx.rng.range(-3, 3);
    this.ctx.emit({ e: 'release', id: e.id, p, speed: Math.hypot(v.vx, v.vy), x: e.x, y: e.y });
  }

  /** A sideways fling from road height would land in its first tick; give it a low arc instead. */
  liftFlatThrow(e: Enemy) {
    const speed = Math.abs(e.vx);
    if (this.ctx.groundOf(e) - e.y >= 20 || speed <= 250 || e.vy > speed * 0.5 || e.vy < -speed * 0.25) return;
    e.y = this.ctx.groundOf(e) - 22;
    e.vy = -speed * 0.25;
  }

  dropHeld(p: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    if (!h) return;
    const e = s.enemies.find((o) => o.id === h.holding);
    if (e) {
      e.heldBy = e.heldBy.filter((q) => q !== p);
      if (e.type === 'yeti' && e.st === 'held') {
        for (const q of e.heldBy) s.hands[q].holding = -1;
        e.heldBy = [];
      }
      if (e.st === 'held' && e.heldBy.length === 0) { e.st = 'air'; e.vx = 0; e.vy = 0; }
    }
    h.holding = -1;
    const q = s.projectiles.find((o) => o.id === h.holdingProj);
    if (q) {
      q.heldBy = -1;
    }
    h.holdingProj = -1;
    h.mode = 'none';
  }

  cancelMode(p: number) {
    const h = this.ctx.s.hands[p];
    if (!h || h.mode === 'none') return;
    h.mode = 'none';
  }

  /** The hand came down on a weapon at the keep. Never grabs anything. */
  pressSlot(p: number, slot: WeaponSlot, x: number, y: number) {
    const s = this.ctx.s;
    const h = s.hands[p];
    if (!h) return;
    h.x = x; h.y = y; h.down = true;
    h.pressX = x; h.pressY = y; h.pressTick = s.tick;
    if (s.phase !== 'battle' || s.paused) return;
    if (h.mode === slot) { this.cancelMode(p); h.modePress = false; return; }
    this.ctx.weapons.activate(p, slot);
    // Aiming starts with this very press; armed weapons wait for the next one.
    h.modePress = h.mode === slot && isAimSlot(slot);
  }

  updateHeld(e: Enemy) {
    const s = this.ctx.s;
    const hands = e.heldBy.map((p) => s.hands[p]);
    if (hands.length === 0) { e.st = 'air'; return; }
    let tx = 0;
    let ty = 0;
    for (const h of hands) { tx += h.x; ty += h.y; }
    tx = tx / hands.length + e.grabOffX;
    ty = ty / hands.length + e.grabOffY;
    const k = this.ctx.tuning.holdSpring;
    const c = 2 * Math.sqrt(k) * 0.72;
    e.vx += (k * (tx - e.x) - c * e.vx) * DT;
    e.vy += (k * (ty - e.y) - c * e.vy) * DT;
    e.x += e.vx * DT;
    e.y += e.vy * DT;
    e.x = clamp(e.x, WORLD.gateX + 10, this.ctx.wall - 10);
    const ground = this.ctx.groundOf(e);
    if (e.y > ground) { e.y = ground; e.vy = Math.min(0, e.vy); }
    e.rot += (clamp(e.vx / 900, -0.8, 0.8) - e.rot) * 0.2;
  }

  /** A single hand on a yeti can only drag it a little. */
  updateTug(e: Enemy) {
    const s = this.ctx.s;
    const h = s.hands[e.heldBy[0]];
    if (!h) return;
    const pull = clamp((h.x - e.x) * 2, -BEHAVIOUR.yeti.tugSpeed, BEHAVIOUR.yeti.tugSpeed);
    // The limit creeps forward, so holding on slows a yeti but cannot stop it for good.
    e.tugLimit -= this.ctx.speedOf(e) * 0.5 * DT;
    e.x = Math.max(WORLD.gateX + ENEMIES.yeti.range, Math.min(e.tugLimit, e.x + pull * DT));
  }
}
