import { ENEMIES } from '../config/enemies';
import { DT, WORLD, perchX } from '../config/world';
import { PERCH } from '../config/shop';
import type { Enemy } from './types';
import { clamp, type SimContext } from './context';

/**
 * The two offering sites: the Great Cauldron and the Eagle Perch.
 * Includes the gentle steering that lets a throw aimed at them actually land there.
 */
export class Stations {
  constructor(private ctx: SimContext) {}

  tryPerch(e: Enemy, radius: number = WORLD.perch.snapRadius): boolean {
    const s = this.ctx.s;
    if (!this.ctx.owns('perch') || s.perchBusy > 0) return false;
    const { hookY } = WORLD.perch;
    const x = perchX(s.meta.fieldW);
    if (Math.hypot(e.x - x, e.y - hookY - ENEMIES[e.type].height * 0.3) > radius) return false;
    if (e.type === 'siegeCart' || e.type === 'yeti') return false;
    e.st = 'hooked';
    e.x = x;
    e.y = hookY + ENEMIES[e.type].height * PERCH.hangDrop;
    e.vx = 0; e.vy = 0;
    e.rot = 0;
    e.t = PERCH.hangSeconds + PERCH.eatSeconds;
    e.heldBy = [];
    s.perchBusy = e.t;
    return true;
  }

  get potAtBack() { return this.ctx.flag('cauldron') === 'back'; }

  canPot(e: Enemy) { return this.ctx.owns('cauldron') && this.ctx.s.potBusy <= 0 && e.type !== 'siegeCart'; }

  /** Starts melting a raider. The pot is taken until that is done and pays out at the end. */
  enterPot(e: Enemy, x: number, y: number) {
    const s = this.ctx.s;
    const seconds = this.ctx.tuning.cauldronSeconds;
    e.st = 'cooking';
    e.t = seconds;
    e.x = x; e.y = y;
    e.vx = 0; e.vy = 0; e.rotV = 0;
    e.heldBy = [];
    s.potBusy = seconds;
    s.potMax = seconds;
    this.ctx.emit({ e: 'splash', x, y: this.potAtBack ? y : WORLD.groundY, etype: e.type });
  }

  /** Distance from the middle of a raider's body to the rim of the rear pot. */
  rearPotDistance(e: Enemy): number {
    const { x, rimY } = WORLD.cauldronBack;
    return Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.45 - rimY);
  }

  /** Lifted to the rear pot and let go: it goes in. Thrown at it from close by: steered in. */
  tryRearPotOnRelease(e: Enemy, vx: number, vy: number): boolean {
    if (!this.potAtBack || !this.canPot(e)) return false;
    const { x, rimY, snapRadius } = WORLD.cauldronBack;
    if (this.rearPotDistance(e) <= snapRadius && Math.hypot(vx, vy) < 900) {
      this.enterPot(e, x, rimY);
      return true;
    }
    return false;
  }

  /** Gentle steering so that a release close to the cauldron actually lands in it. */
  applyCauldronAssist(e: Enemy) {
    if (!this.ctx.owns('cauldron') || e.st !== 'air' || this.ctx.s.potBusy > 0) return;
    if (this.potAtBack) { this.steerAtRearPot(e); return; }
    const { x: cx, halfWidth } = WORLD.cauldron;
    const g = this.ctx.tuning.gravity;
    const ground = this.ctx.groundOf(e);
    const disc = e.vy * e.vy + 2 * g * Math.max(0, ground - e.y);
    const tLand = (-e.vy + Math.sqrt(disc)) / g;
    if (tLand <= 0.02) return;
    const landX = e.x + e.vx * tLand;
    if (Math.abs(landX - cx) > halfWidth + 95 || Math.abs(landX - cx) < halfWidth * 0.6) return;
    const wanted = (cx - e.x) / tLand;
    e.vx += clamp(wanted - e.vx, -280, 280);
  }

  /** A throw that is headed near the rear pot bends into it, because depth is hard to judge. */
  steerAtRearPot(e: Enemy) {
    const { x, rimY, assistRadius } = WORLD.cauldronBack;
    this.steerAt(e, x, rimY, e.y - ENEMIES[e.type].height * 0.45, assistRadius, WORLD.cauldronBack.headingCos);
  }

  /** Same for the hook: only a throw really headed for it, since gravity pulls long throws under it. */
  steerAtPerch(e: Enemy) {
    if (e.st !== 'air' || !this.ctx.owns('perch') || this.ctx.s.perchBusy > 0) return;
    if (e.type === 'siegeCart' || e.type === 'yeti') return;
    this.steerAt(e, perchX(this.ctx.s.meta.fieldW), WORLD.perch.hookY, e.y - ENEMIES[e.type].height * 0.3, WORLD.perch.assistRadius, WORLD.perch.headingCos);
  }

  /** Bends a throw into a target if it heads that way and passes near. bodyY is the height the target is measured at. */
  steerAt(e: Enemy, x: number, y: number, bodyY: number, radius: number, headingCos: number) {
    const g = this.ctx.tuning.gravity;
    const toX = x - e.x;
    const toY = y - bodyY;
    const speed = Math.hypot(e.vx, e.vy);
    const dist = Math.hypot(toX, toY);
    if (speed < 1 || dist < 1) return;
    // Only throws that really go towards it count, not whatever happens to fly past.
    if ((toX * e.vx + toY * e.vy) / (speed * dist) < headingCos) return;
    let best = Infinity;
    let bestT = 0;
    for (let t = 0.04; t <= 1; t += 0.04) {
      const d = Math.hypot(e.x + e.vx * t - x, bodyY + e.vy * t + 0.5 * g * t * t - y);
      if (d < best) { best = d; bestT = t; }
    }
    if (best > radius) return;
    e.vx = toX / bestT;
    e.vy = (toY - 0.5 * g * bestT * bestT) / bestT;
  }

  updateHooked(e: Enemy) {
    const before = e.t;
    e.t -= DT;
    e.rot = Math.sin(e.t * 9) * 0.25;
    if (before > PERCH.eatSeconds && e.t <= PERCH.eatSeconds) this.ctx.emit({ e: 'eagle', x: e.x, y: e.y, id: e.id });
    if (e.t <= 0) { this.ctx.s.perchBusy = 0; this.ctx.combat.kill(e, 'eagle', e.thrownBy); }
  }
}
