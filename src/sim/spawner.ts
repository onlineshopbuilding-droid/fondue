import { BEHAVIOUR, ENEMIES, type EnemyType } from '../config/enemies';
import { DAY } from '../config/waves';
import { FIELD, WORLD, fieldEntry } from '../config/field';
import type { Enemy } from './types';
import type { SimContext } from './context';

/**
 * Brings the raiders of the day plan onto the field at their times.
 * It also creates a single raider with its starting state.
 */
export class Spawner {
  constructor(private ctx: SimContext) {}

  spawn() {
    const s = this.ctx.s;
    // Nightfall: whoever has not arrived yet stays home.
    if (s.dayT >= s.meta.today.seconds) return;
    let alive = s.enemies.length;
    while (s.spawned < s.spawnQueue.length && s.spawnQueue[s.spawned].t <= s.dayT && alive < DAY.maxAlive) {
      const entry = s.spawnQueue[s.spawned];
      this.spawnEnemy(entry.type, undefined, entry.big ?? false);
      s.spawned++;
      alive++;
    }
  }

  spawnEnemy(type: EnemyType, x = fieldEntry(this.ctx.s.meta.fieldW) + FIELD.offstageRun + this.ctx.rng.range(0, 30), big = false): Enemy {
    const s = this.ctx.s;
    const def = ENEMIES[type];
    const sc = this.ctx.rules.scaling;
    const lane = this.ctx.rng.range(WORLD.laneMin, WORLD.laneMax);
    const hp = def.hp * sc.hp * this.ctx.growth(sc.hpGrowth) * (big ? BEHAVIOUR.big.hp : 1);
    const e: Enemy = {
      id: s.nextId++, type, st: 'walk', x, y: WORLD.groundY + lane, vx: 0, vy: 0, rot: 0, rotV: 0, lane,
      hp, maxHp: hp, tugLimit: 0, t: 0, strikeT: def.strikeEvery * this.ctx.rng.range(0.3, 1), heldBy: [], grabOffX: 0, grabOffY: 0,
      shieldOn: false, cycleT: this.ctx.rng.range(0.3, 2.5), hidden: false, armed: type === 'bomber', crow: false,
      altitude: 0, thrownBy: -1, dead: false, frozenHeld: false, big,
    };
    if (type === 'balloonist') {
      e.st = 'float';
      e.altitude = this.ctx.rng.range(BEHAVIOUR.balloon.altitudeMin, BEHAVIOUR.balloon.altitudeMax);
      e.y = this.ctx.groundOf(e) - e.altitude;
      e.strikeT = BEHAVIOUR.balloon.dropEvery;
    }
    if (type === 'pogo') {
      e.st = 'hop';
      e.vy = -this.ctx.rng.range(0.8, 1.05) * BEHAVIOUR.pogo.hopSpeed;
    }
    s.enemies.push(e);
    return e;
  }
}
