import { BEHAVIOUR, ENEMIES, type EnemyType } from '../config/enemies';
import { COOP, DAY, DIFFICULTIES } from '../config/waves';
import { DT } from '../config/world';
import { ECONOMY, WEAPONS } from '../config/shop';
import type { DeathCause, Enemy } from './types';
import type { SimContext } from './context';

/**
 * Damage and death: hurting raiders, blasts, fire on the ground, freezing, and damage to the gate.
 * A kill pays its gold and offerings here.
 */
export class Combat {
  constructor(private ctx: SimContext) {}

  freeze(e: Enemy, p: number) {
    if (e.st === 'float') {
      // Whatever kept it in the air is ice now: it drops and shatters.
      e.st = 'air';
      e.frozenHeld = true;
      e.vx = 0; e.vy = 0;
      e.thrownBy = p;
      return;
    }
    e.st = 'frozen';
    e.t = BEHAVIOUR.frozen.seconds;
    e.vx = 0; e.vy = 0;
    e.y = this.ctx.groundOf(e);
    e.shieldOn = false;
    e.hidden = false;
  }

  shatter(e: Enemy, p: number) {
    this.ctx.emit({ e: 'shatter', x: e.x, y: e.y - 30 });
    this.kill(e, 'shatter', p);
  }

  addFlame(x: number, halfWidth: number, dur: number) {
    this.ctx.s.flames.push({ id: this.ctx.s.nextId++, x, halfWidth, t: dur, dur });
    this.ctx.emit({ e: 'flame', x, halfWidth });
  }

  /** Area damage. p is the responsible player for score; -1 for none. */
  blast(x: number, y: number, radius: number, damage: number, p: number) {
    this.ctx.emit({ e: 'explosion', x, y, radius });
    for (const e of [...this.ctx.s.enemies]) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.5 - y);
      if (d <= radius + ENEMIES[e.type].radius) this.hurt(e, damage, 'blast', p);
    }
  }

  hurt(e: Enemy, amount: number, cause: DeathCause, p: number) {
    // What is on the hook or in the pot is already spoken for.
    if (e.dead || e.st === 'hooked' || e.st === 'cooking') return;
    e.hp -= amount;
    if (e.hp <= 1e-6) this.kill(e, cause, p);
  }

  kill(e: Enemy, cause: DeathCause, p: number) {
    if (e.dead) return;
    const s = this.ctx.s;
    e.dead = true;
    for (const q of e.heldBy) if (s.hands[q]) s.hands[q].holding = -1;
    e.heldBy = [];
    const def = ENEMIES[e.type];
    const diff = DIFFICULTIES[s.meta.difficulty];
    let gold = Math.round(def.gold * diff.gold * (s.hands.length > 1 ? COOP.goldFactor : 1));
    const score = Math.round(def.score * (1 + (s.day - 1) * 0.1));
    if (cause === 'cauldron' || cause === 'eagle') {
      gold += ECONOMY.offeringGold;
      s.offerings += 1;
      s.dayOfferings += 1;
    }
    s.gold += gold;
    s.dayGold += gold;
    s.dayKills += 1;
    s.dayScore += score;
    this.ctx.emit({ e: 'death', id: e.id, x: e.x, y: e.y, etype: e.type, cause, gold, p });
    if (e.type === 'bomber' && e.armed && (cause === 'impact' || cause === 'blast')) {
      const b = BEHAVIOUR.bomb;
      this.blast(e.x, e.y - 40, b.blastRadius, b.blastDamage, p);
    }
  }

  damageGate(amount: number, x: number, y: number, etype: EnemyType) {
    const s = this.ctx.s;
    if (s.gateHp <= 0) return;
    const scaled = amount * DIFFICULTIES[s.meta.difficulty].damage * (1 + (s.day - 1) * DAY.damageGrowth);
    s.gateHp = Math.max(0, s.gateHp - scaled);
    this.ctx.emit({ e: 'gateHit', x, y, amount: scaled, etype });
  }

  updateFlames() {
    const s = this.ctx.s;
    for (const f of s.flames) {
      f.t -= DT;
      for (const e of [...s.enemies]) {
        if (e.dead || !this.ctx.enemies.isGrounded(e)) continue;
        if (Math.abs(e.x - f.x) <= f.halfWidth) this.hurt(e, WEAPONS.flameDps * DT, 'fire', -1);
      }
    }
    s.flames = s.flames.filter((f) => f.t > 0);
  }
}
