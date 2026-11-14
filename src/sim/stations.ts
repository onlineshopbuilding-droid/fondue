// Part of the simulation: the Great Cauldron and the Eagle Perch, and the steering that lands a throw there.
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD, perchX } from '../config/field';
import { CRESTS } from '../config/crests';
import { CAULDRON_SECONDS, PERCH } from '../config/keep';
import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import type { RunStatsData } from './rules';
import type { Enemy } from './types';
import type { SimContext } from './context';

/**
 * Melting time of the Great Cauldron at a tier (C5): the tier table, scaled by the developer
 * slider `cauldronSeconds` (1 at its default).
 */
export function meltSeconds(tier: number, tuning: Pick<Tuning, 'cauldronSeconds'>): number {
  const base = CAULDRON_SECONDS[Math.max(1, Math.min(CAULDRON_SECONDS.length, Math.round(tier || 1))) - 1];
  return base * (tuning.cauldronSeconds / TUNING_DEFAULT.cauldronSeconds);
}

/**
 * Share of throws at the Eagle Perch that landed on the hook (C6), 0 to 1, or null without a try.
 * Balance bots read this from the run statistics.
 */
export function perchHitRate(stats: Pick<RunStatsData, 'perchTries' | 'perchHits'>): number | null {
  const tries = stats.perchTries ?? 0;
  return tries > 0 ? Math.min(1, (stats.perchHits ?? 0) / tries) : null;
}

/** Raiders the eagle takes: everything a hand can throw. The Yeti and bosses leave the most crests. */
const perchable = (e: Enemy) => e.type !== 'siegeCart';

/**
 * The two stations: the Great Cauldron behind the road and the Eagle Perch.
 * Includes the gentle steering that lets a throw aimed at them actually land there.
 */
export class Stations {
  constructor(private ctx: SimContext) {}

  /** Distance from a raider's collar to the hook. */
  perchDistance(e: Enemy): number {
    return Math.hypot(e.x - perchX(this.ctx.s.meta.fieldW), e.y - WORLD.perch.hookY - ENEMIES[e.type].height * 0.3);
  }

  /**
   * A thrown raider in flight lands on the hook only from close by and at speed: an aimed throw,
   * not one carried up and let go (C6). Throws that pass near count as tries for the hit rate.
   */
  tryPerch(e: Enemy, radius: number = CRESTS.hookRadius): boolean {
    const s = this.ctx.s;
    if (!this.ctx.hasStation('perch') || e.thrownBy < 0 || !perchable(e)) return false;
    const d = this.perchDistance(e);
    if (!e.perchTry && d <= CRESTS.tryRadius) { e.perchTry = true; this.ctx.stats.perchTry(); }
    if (s.perchBusy > 0 || d > radius || Math.hypot(e.vx, e.vy) < CRESTS.minSpeed) return false;
    this.ctx.stats.perchHit();
    e.st = 'hooked';
    e.x = perchX(s.meta.fieldW);
    e.y = WORLD.perch.hookY + ENEMIES[e.type].height * PERCH.hangDrop;
    e.vx = 0; e.vy = 0;
    e.rot = 0;
    e.t = PERCH.hangSeconds + PERCH.eatSeconds;
    e.heldBy = [];
    s.perchBusy = e.t;
    // The jolt of the hook shakes a keg loose: it drops and bursts on the road below.
    if (e.type === 'bomber' && e.armed) this.dropKeg(e, e.thrownBy);
    return true;
  }

  /** The keg leaves its carrier, falls straight down and bursts where it lands. */
  dropKeg(e: Enemy, p: number) {
    e.armed = false;
    const q = this.ctx.projectiles.spawnProjectile('bomb', e.x, e.y - ENEMIES.bomber.height * 0.55, 0, 40);
    q.t = BEHAVIOUR.bomb.fuse + 4;
    q.size = 16;
    q.damage = BEHAVIOUR.bomb.gateDamage;
    q.byPlayer = true;
    q.burstOnLand = true;
    q.owner = p;
    this.ctx.stats.kegShaken();
    this.ctx.emit({ e: 'kegLoose', x: q.x, y: q.y, p });
  }

  canPot(e: Enemy) { return this.ctx.hasStation('cauldron') && this.ctx.s.potBusy <= 0 && e.type !== 'siegeCart' && !e.big; }

  /** Starts melting a raider. The pot is taken until that is done and pays out at the end. */
  enterPot(e: Enemy) {
    const s = this.ctx.s;
    const { x, rimY } = WORLD.cauldron;
    const seconds = meltSeconds(this.ctx.loadout.stationTier?.cauldron ?? 1, this.ctx.tuning);
    e.st = 'cooking';
    e.t = seconds;
    e.x = x; e.y = rimY;
    e.vx = 0; e.vy = 0; e.rotV = 0;
    e.heldBy = [];
    s.potBusy = seconds;
    s.potMax = seconds;
    this.ctx.emit({ e: 'splash', x, y: rimY, etype: e.type });
  }

  /** Distance from the middle of a raider's body to the rim of the pot. */
  potDistance(e: Enemy): number {
    const { x, rimY } = WORLD.cauldron;
    return Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.45 - rimY);
  }

  /** Carried to the pot and let go: it goes in. */
  tryPotOnRelease(e: Enemy, vx: number, vy: number): boolean {
    if (!this.canPot(e)) return false;
    if (this.potDistance(e) <= WORLD.cauldron.snapRadius && Math.hypot(vx, vy) < 900) {
      this.enterPot(e);
      return true;
    }
    return false;
  }

  /** A thrown raider that flies into the rim goes in. Only what was thrown: nobody walks into the pot. */
  tryPotInFlight(e: Enemy): boolean {
    if (!this.canPot(e) || e.thrownBy < 0) return false;
    const { x, rimY, snapRadius } = WORLD.cauldron;
    const bodyY = e.y - ENEMIES[e.type].height * 0.45;
    if (this.potDistance(e) > snapRadius || (x - e.x) * e.vx + (rimY - bodyY) * e.vy <= 0) return false;
    this.enterPot(e);
    return true;
  }

  /** A throw that is headed near the pot bends into it, because depth is hard to judge. */
  steerAtPot(e: Enemy) {
    if (e.st !== 'air' || !this.canPot(e)) return;
    const { x, rimY, assistRadius, headingCos } = WORLD.cauldron;
    this.steerAt(e, x, rimY, e.y - ENEMIES[e.type].height * 0.45, assistRadius, headingCos);
  }

  /**
   * A fresh throw at the hook: much less help than the pot gets, only for a throw that already heads
   * almost straight at it and will pass close (CRESTS.assistRadius, headingCos).
   */
  throwAtPerch(e: Enemy) {
    if (e.st !== 'air' || !this.ctx.hasStation('perch') || this.ctx.s.perchBusy > 0 || !perchable(e)) return;
    if (Math.hypot(e.vx, e.vy) < CRESTS.minSpeed) return;
    this.steerAt(e, perchX(this.ctx.s.meta.fieldW), WORLD.perch.hookY, e.y - ENEMIES[e.type].height * 0.3, CRESTS.assistRadius, CRESTS.headingCos);
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

  updateCooking(e: Enemy) {
    e.t -= DT;
    if (e.t > 0) return;
    this.ctx.s.potBusy = 0;
    this.ctx.emit({ e: 'cheese', x: e.x, y: e.y, etype: e.type });
    this.ctx.combat.kill(e, 'cauldron', e.thrownBy);
  }

  tick() {
    const s = this.ctx.s;
    if (s.perchBusy > 0) s.perchBusy = Math.max(0, s.perchBusy - DT);
    if (s.potBusy > 0) s.potBusy = Math.max(0, s.potBusy - DT);
  }
}
