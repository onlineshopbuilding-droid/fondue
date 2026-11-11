import { BEHAVIOUR, ENEMIES, type EnemyType } from '../config/enemies';
import { ECONOMY } from '../config/economy';
import { COOP } from '../config/waves';
import type { DeathCause, Enemy } from './types';
import type { SimContext } from './context';

/**
 * Damage and death: hurting raiders, blasts, freezing, and damage to the gate.
 * A kill pays its gold and offerings here and is counted for the statistics.
 */
export class Combat {
  /** True while a keg blast is being resolved, so its kills are counted as such. */
  private kegBlast = false;

  constructor(private ctx: SimContext) {}

  freeze(e: Enemy, p: number, seconds: number = BEHAVIOUR.frozen.seconds) {
    if (e.st === 'float') {
      // Whatever kept it in the air is ice now: it drops and shatters.
      e.st = 'air';
      e.frozenHeld = true;
      e.vx = 0; e.vy = 0;
      e.thrownBy = p;
      return;
    }
    e.st = 'frozen';
    e.t = seconds;
    e.vx = 0; e.vy = 0;
    e.y = this.ctx.groundOf(e);
    e.shieldOn = false;
    e.hidden = false;
  }

  /** Breaks a frozen raider. With a spread, frozen neighbours within that distance break too. */
  shatter(e: Enemy, p: number, spread = 0) {
    this.ctx.emit({ e: 'shatter', x: e.x, y: e.y - 30 });
    const x = e.x;
    this.kill(e, 'shatter', p);
    if (spread <= 0) return;
    for (const o of [...this.ctx.s.enemies]) {
      if (o.dead || o.st !== 'frozen' || Math.abs(o.x - x) > spread) continue;
      this.ctx.emit({ e: 'shatter', x: o.x, y: o.y - 30 });
      this.kill(o, 'shatter', p);
    }
  }

  /** Dazes a raider on the ground for a while: it neither walks nor strikes. */
  stun(e: Enemy, seconds: number) {
    if (e.dead || seconds <= 0) return;
    if (e.st !== 'walk' && e.st !== 'attack' && e.st !== 'stun' && e.st !== 'hop') return;
    if (e.type === 'siegeCart') return;
    e.st = 'stun';
    e.t = Math.max(e.t, seconds);
    e.vx = 0; e.vy = 0;
    e.y = this.ctx.groundOf(e);
  }

  /** Area damage. p is the responsible player for score; -1 for none. */
  blast(x: number, y: number, radius: number, damage: number, p: number, keg = false) {
    this.ctx.emit({ e: 'explosion', x, y, radius });
    const outer = this.kegBlast;
    this.kegBlast = outer || keg;
    for (const e of [...this.ctx.s.enemies]) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.5 - y);
      if (d <= radius + ENEMIES[e.type].radius) this.hurt(e, damage, 'blast', p);
    }
    this.kegBlast = outer;
  }

  hurt(e: Enemy, amount: number, cause: DeathCause, p: number) {
    // What is on the hook or in the pot is already spoken for.
    if (e.dead || e.st === 'hooked' || e.st === 'cooking') return;
    e.hp -= amount;
    if (e.hp <= 1e-6) this.kill(e, cause, p);
  }

  /** Gold a kill pays right now, with co-op share, Golden Fondue and boss bonus. */
  goldFor(e: Enemy): number {
    const s = this.ctx.s;
    const rules = this.ctx.rules;
    let gold = ENEMIES[e.type].gold * rules.scaling.gold * (rules.players > 1 ? COOP.goldFactor : 1);
    if (e.big) gold *= BEHAVIOUR.big.gold;
    if (s.goldRushT > 0) gold *= s.goldRushFactor;
    return Math.round(gold);
  }

  kill(e: Enemy, cause: DeathCause, p: number) {
    if (e.dead) return;
    const s = this.ctx.s;
    e.dead = true;
    for (const q of e.heldBy) if (s.hands[q]) s.hands[q].holding = -1;
    e.heldBy = [];
    const def = ENEMIES[e.type];
    let gold = this.goldFor(e);
    const score = Math.round(def.score * (e.big ? BEHAVIOUR.big.gold : 1) * (1 + (s.day - 1) * 0.1));
    if (cause === 'cauldron' || cause === 'eagle') {
      gold += ECONOMY.offeringGold;
      s.offerings += 1;
      s.dayOfferings += 1;
    }
    s.gold += gold;
    s.dayGold += gold;
    s.dayKills += 1;
    s.dayScore += score;
    this.ctx.stats.kill(e.type, cause, this.kegBlast);
    this.ctx.stats.gold(gold);
    this.ctx.emit({ e: 'death', id: e.id, x: e.x, y: e.y, etype: e.type, cause, gold, p });
    // A Keg Hauler that dies with its keg on its back goes up with it, weaker than a loose keg.
    if (e.type === 'bomber' && e.armed && (cause === 'impact' || cause === 'blast')) {
      const b = BEHAVIOUR.bomb;
      const c = BEHAVIOUR.carrierBlast;
      this.blast(e.x, e.y - 40, b.blastRadius * c.radius, b.blastDamage * c.damage, p, true);
    }
  }

  damageGate(amount: number, x: number, y: number, etype: EnemyType, attacker: Enemy | null = null) {
    const s = this.ctx.s;
    if (s.gateHp <= 0) return;
    const sc = this.ctx.rules.scaling;
    const scaled = amount * sc.damage * this.ctx.growth(sc.damageGrowth);
    const floor = this.ctx.rules.gateCannotFall ? 1 : 0;
    const before = s.gateHp;
    s.gateHp = Math.max(floor, s.gateHp - scaled);
    this.ctx.stats.gateDamaged(before - s.gateHp);
    this.ctx.emit({ e: 'gateHit', x, y, amount: scaled, etype });
    if (attacker) this.ctx.weapons.onGateStruck(attacker);
  }
}
