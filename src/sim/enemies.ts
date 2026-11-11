import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, FIELD, WORLD, fieldEntry } from '../config/field';
import type { Enemy, Projectile, ProjectileKind } from './types';
import type { SimContext } from './context';

/**
 * How raiders act on their own: walking, attacking, hopping, floating, and recovering.
 * Being held or thrown is handled by Hands and Flight.
 */
export class EnemyBehaviour {
  constructor(private ctx: SimContext) {}

  makeFlee(e: Enemy) {
    if (e.dead) return;
    e.shieldOn = false;
    e.hidden = false;
    if (e.st === 'air' || e.st === 'hooked' || e.st === 'held') return;
    e.st = 'flee';
    if (!e.crow && e.type !== 'balloonist') e.y = this.ctx.groundOf(e);
  }

  updateCycles(e: Enemy) {
    if (e.type !== 'hexer' && e.type !== 'shade') return;
    e.cycleT -= DT;
    if (e.cycleT > 0) return;
    if (e.type === 'hexer') {
      e.shieldOn = !e.shieldOn;
      e.cycleT = e.shieldOn ? BEHAVIOUR.hexerShield.on : BEHAVIOUR.hexerShield.off;
      if (e.shieldOn) this.ctx.emit({ e: 'shieldUp', x: e.x, y: e.y - 40 });
    } else {
      e.hidden = !e.hidden;
      e.cycleT = e.hidden ? BEHAVIOUR.shade.hidden : BEHAVIOUR.shade.visible;
    }
  }

  updateEnemy(e: Enemy) {
    // Out of sight beyond the field's edge, raiders hurry to their starting line.
    const entry = fieldEntry(this.ctx.s.meta.fieldW);
    if (e.x > entry && (e.st === 'walk' || e.st === 'hop' || e.st === 'float')) {
      e.x = Math.max(entry, e.x - FIELD.offstageSpeed * DT);
      return;
    }
    switch (e.st) {
      case 'walk': this.updateWalk(e); break;
      case 'attack': this.updateAttack(e); break;
      case 'hop': this.updateHop(e); break;
      case 'float': this.updateFloat(e); break;
      case 'held': this.ctx.hands.updateHeld(e); break;
      case 'air': this.ctx.flight.updateAir(e); break;
      case 'stun':
        e.t -= DT;
        this.updateCycles(e);
        if (e.t <= 0) this.afterStun(e);
        break;
      case 'frozen':
        e.t -= DT;
        if (e.t <= 0) this.afterStun(e);
        break;
      case 'hooked':
        this.ctx.stations.updateHooked(e);
        break;
      case 'cooking':
        this.ctx.stations.updateCooking(e);
        break;
      case 'flee':
        e.x += this.ctx.speedOf(e) * BEHAVIOUR.fleeSpeed * DT;
        break;
    }
    if (e.type === 'yeti' && e.heldBy.length > 0 && e.st !== 'held') this.ctx.hands.updateTug(e);
  }

  afterStun(e: Enemy) {
    e.rot = 0;
    e.t = 0;
    e.frozenHeld = false;
    e.y = this.ctx.groundOf(e);
    if (e.type === 'pogo') { e.st = 'hop'; e.vy = -BEHAVIOUR.pogo.hopSpeed; return; }
    if (e.crow) { e.st = 'float'; return; }
    e.st = 'walk';
  }

  updateWalk(e: Enemy) {
    this.updateCycles(e);
    const def = ENEMIES[e.type];
    let v = this.ctx.speedOf(e);
    if (e.type === 'yeti' && e.heldBy.length > 0) v *= BEHAVIOUR.yeti.slowWhileHeld;
    e.x -= v * DT;
    const range = e.armed || e.type !== 'bomber' ? def.range : 24;
    if (e.x <= WORLD.gateX + range) {
      e.x = WORLD.gateX + range;
      e.st = 'attack';
    }
  }

  updateAttack(e: Enemy) {
    this.updateCycles(e);
    e.strikeT -= DT;
    if (e.strikeT > 0) return;
    const def = ENEMIES[e.type];
    e.strikeT = def.strikeEvery;
    const gx = WORLD.gateX + 6;
    const gy = e.y - 50;
    switch (e.type) {
      case 'bomber':
        if (e.armed) { this.lobBomb(e); return; }
        break;
      case 'slinger': {
        this.lob('stone', e, def.strike, 0.85);
        return;
      }
      case 'siegeCart': {
        const q = this.ctx.projectiles.spawnProjectile('bolt', e.x - 40, e.y - 58, -760, 0);
        q.damage = def.strike;
        this.ctx.emit({ e: 'shoot', x: q.x, y: q.y, kind: 'bolt' });
        return;
      }
    }
    this.ctx.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
    this.ctx.combat.damageGate(e.crow ? BEHAVIOUR.crow.strike : def.strike * (e.big ? BEHAVIOUR.big.strike : 1), gx, gy, e.type, e);
  }

  lobBomb(e: Enemy) {
    const q = this.lob('bomb', e, BEHAVIOUR.bomb.gateDamage, 1.05);
    q.t = BEHAVIOUR.bomb.fuse;
    this.ctx.emit({ e: 'throwKeg', x: q.x, y: q.y });
  }

  /** Throws a ballistic projectile that lands at the gate after `flight` seconds. */
  lob(kind: ProjectileKind, e: Enemy, damage: number, flight: number): Projectile {
    const g = this.ctx.tuning.gravity;
    const sx = e.x - 12;
    const sy = e.y - 70;
    const tx = WORLD.gateX + 8;
    const ty = e.y - 60;
    const q = this.ctx.projectiles.spawnProjectile(kind, sx, sy, (tx - sx) / flight, (ty - sy - 0.5 * g * flight * flight) / flight);
    q.damage = damage;
    q.size = kind === 'bomb' ? 16 : 7;
    if (kind === 'stone') this.ctx.emit({ e: 'shoot', x: sx, y: sy, kind });
    return q;
  }

  updateHop(e: Enemy) {
    const def = ENEMIES.pogo;
    if (e.t > 0) {
      // Catching its breath at the gate: the easiest moment to grab it.
      e.t -= DT;
      e.y = this.ctx.groundOf(e);
      e.rot = 0;
      if (e.t <= 0) e.vy = -BEHAVIOUR.pogo.hopSpeed * this.ctx.rng.range(0.85, 1.05);
      return;
    }
    e.vy += this.ctx.tuning.gravity * DT;
    e.y += e.vy * DT;
    e.x -= this.ctx.speedOf(e) * DT;
    e.rot = Math.sin(e.y * 0.02) * 0.12;
    const ground = this.ctx.groundOf(e);
    if (e.x <= WORLD.gateX + def.range + 34) e.x = WORLD.gateX + def.range + 34;
    if (e.y < ground || e.vy < 0) return;
    e.y = ground;
    if (e.x <= WORLD.gateX + def.range + 34) {
      this.ctx.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
      this.ctx.combat.damageGate(def.strike, WORLD.gateX + 6, e.y - 50, e.type, e);
      e.t = BEHAVIOUR.pogo.restAtGate;
      e.vy = 0;
      return;
    }
    e.vy = -BEHAVIOUR.pogo.hopSpeed * this.ctx.rng.range(0.85, 1.05);
  }

  updateFloat(e: Enemy) {
    const s = this.ctx.s;
    // The Cuckoo Clock has stopped time for fliers.
    if (s.airStopT > 0) return;
    if (e.crow) {
      const targetY = this.ctx.groundOf(e) - BEHAVIOUR.crow.altitude + Math.sin(s.tick * 0.14 + e.id) * 16;
      e.y += (targetY - e.y) * 0.08;
      const tx = WORLD.gateX + 26;
      if (e.x > tx) e.x -= BEHAVIOUR.crow.speed * DT;
      else this.strikeFloating(e, 1.0, BEHAVIOUR.crow.strike);
      return;
    }
    const def = ENEMIES.balloonist;
    e.y = this.ctx.groundOf(e) - e.altitude + Math.sin(s.tick * 0.03 + e.id) * 10;
    if (e.x > WORLD.gateX + def.range) { e.x -= this.ctx.speedOf(e) * DT; return; }
    e.strikeT -= DT;
    if (e.strikeT <= 0) {
      e.strikeT = BEHAVIOUR.balloon.dropEvery;
      const q = this.ctx.projectiles.spawnProjectile('bomb', e.x, e.y + 30, -30, 60);
      q.t = BEHAVIOUR.bomb.fuse + 2;
      q.size = 14;
      q.damage = def.strike;
      this.ctx.emit({ e: 'throwKeg', x: q.x, y: q.y });
    }
  }

  strikeFloating(e: Enemy, every: number, dmg: number) {
    e.strikeT -= DT;
    if (e.strikeT > 0) return;
    e.strikeT = every;
    this.ctx.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
    this.ctx.combat.damageGate(dmg, WORLD.gateX + 6, e.y, e.type);
  }

  isGrounded(e: Enemy): boolean {
    return e.st === 'walk' || e.st === 'attack' || e.st === 'stun' || e.st === 'frozen' || e.st === 'flee'
      || (e.st === 'hop' && e.y > this.ctx.groundOf(e) - 120);
  }
}
