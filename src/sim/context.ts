import { ENEMIES } from '../config/enemies';
import { DAY, DIFFICULTIES } from '../config/waves';
import { WORLD, fieldSpeedFactor, fieldWall } from '../config/world';
import type { Combat } from './combat';
import type { DayFlow } from './dayFlow';
import type { Economy } from './economy';
import type { EnemyBehaviour } from './enemies';
import type { Flight } from './flight';
import type { Hands } from './hands';
import type { Projectiles } from './projectiles';
import type { Rng } from './rng';
import type { Spawner } from './spawner';
import type { Stations } from './stations';
import type { Enemy, SimEvent, SimState } from './types';
import type { WeaponSystem } from './weapons';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * What all parts of the simulation share: the state, the seeded random numbers, the list of events,
 * and a few small helpers. Each part reaches the others through here (`ctx.combat`, `ctx.hands`, ...).
 */
export class SimContext {
  events: SimEvent[] = [];

  day!: DayFlow;
  spawner!: Spawner;
  hands!: Hands;
  stations!: Stations;
  weapons!: WeaponSystem;
  combat!: Combat;
  economy!: Economy;
  enemies!: EnemyBehaviour;
  flight!: Flight;
  projectiles!: Projectiles;

  constructor(readonly s: SimState, readonly rng: Rng) {}

  get tuning() { return this.s.meta.tuning; }

  /** Tells the session that the rarely changing data must be sent again. */
  touchMeta() { this.s.meta.rev++; }

  flag(id: string): string { return this.s.meta.flags[id]; }

  emit(ev: SimEvent) { this.events.push(ev); }

  owns(id: string): boolean { return this.s.meta.owned.includes(id); }

  /** Right-hand wall of the field. */
  get wall() { return fieldWall(this.s.meta.fieldW); }

  groundOf(e: Enemy): number { return WORLD.groundY + e.lane; }

  speedOf(e: Enemy): number {
    const s = this.s;
    return ENEMIES[e.type].speed * this.tuning.walkSpeed * DIFFICULTIES[s.meta.difficulty].speed * (1 + (s.day - 1) * DAY.speedGrowth)
      * fieldSpeedFactor(s.meta.fieldW);
  }
}
