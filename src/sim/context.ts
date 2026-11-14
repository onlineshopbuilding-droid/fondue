// What every part of the simulation shares: state, seeded random numbers, events and the links between the parts.
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { HANDS } from '../config/hand';
import { FIELD, WORLD, fieldEntry, fieldSpeedFactor, fieldWall } from '../config/field';
import type { WeaponDef } from '../config/weapons';
import { weaponById } from '../config/weapons';
import type { Combat } from './combat';
import type { WaveFlow } from './waveFlow';
import type { EnemyBehaviour } from './enemies';
import type { Flight } from './flight';
import type { Hands } from './hands';
import type { WavePlanner } from './plan';
import type { Projectiles } from './projectiles';
import type { Rng } from './rng';
import type { Spawner } from './spawner';
import type { RunStats } from './stats';
import type { Stations } from './stations';
import type { Enemy, SimEvent, SimState } from './types';
import type { WeaponSystem } from './weapons/system';
import type { Zones } from './zones';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * What all parts of the simulation share: the state, the seeded random numbers, the list of events,
 * and a few small helpers. Each part reaches the others through here (`ctx.combat`, `ctx.hands`, ...).
 */
export class SimContext {
  events: SimEvent[] = [];

  waves!: WaveFlow;
  spawner!: Spawner;
  hands!: Hands;
  stations!: Stations;
  weapons!: WeaponSystem;
  combat!: Combat;
  enemies!: EnemyBehaviour;
  flight!: Flight;
  projectiles!: Projectiles;
  zones!: Zones;
  stats!: RunStats;

  constructor(readonly s: SimState, readonly rng: Rng, readonly planner: WavePlanner) {}

  get tuning() { return this.s.meta.tuning; }
  get rules() { return this.s.meta.rules; }
  get loadout() { return this.s.meta.loadout; }

  /** Tells the session that the rarely changing data must be sent again. */
  touchMeta() { this.s.meta.rev++; }

  flag(id: string): string { return this.s.meta.flags[id]; }

  emit(ev: SimEvent) { this.events.push(ev); }

  hasStation(id: 'cauldron' | 'perch'): boolean { return this.loadout.stations[id]; }

  /** The weapon built into a slot, or null. */
  weaponIn(slot: number): WeaponDef | null {
    const id = this.loadout.slotWeapon[slot];
    return id ? weaponById(id) ?? null : null;
  }

  /** Tier of a weapon in this run, 1 to 7. */
  tierOf(weaponId: string): number { return this.loadout.weaponTier[weaponId] ?? 1; }

  /** The slot a weapon sits in, or -1. */
  slotOf(weaponId: string): number { return this.loadout.slotWeapon.indexOf(weaponId); }

  /** Right-hand wall of the field. */
  get wall() { return fieldWall(this.s.meta.fieldW); }

  /** Where raiders step onto the field: its right end, or the visible right edge when that is nearer (B3). */
  get entryX() { return Math.min(fieldEntry(this.s.meta.fieldW), this.s.meta.viewRight + FIELD.entryMargin); }

  groundOf(e: Enemy): number { return WORLD.groundY + e.lane; }

  /** Growth factor of a per-wave value in the current wave. */
  growth(perWave: number): number { return 1 + (this.s.wave - 1) * perWave; }

  /** A scaling factor of the run, held back in the first waves when the rules ease in. */
  eased(factor: number): number {
    const share = this.rules.scaling.easeIn?.[this.s.wave - 1] ?? 1;
    return 1 + (factor - 1) * share;
  }

  speedOf(e: Enemy): number {
    const sc = this.rules.scaling;
    return ENEMIES[e.type].speed * (e.big ? BEHAVIOUR.big.speed : 1) * this.tuning.walkSpeed * this.eased(sc.speed) * this.growth(sc.speedGrowth)
      * fieldSpeedFactor(this.s.meta.fieldW) * this.zones.slowAt(e);
  }

  /** How heavy a raider is to the hand. */
  massOf(e: Enemy): number {
    if (e.crow) return BEHAVIOUR.crowMass;
    return ENEMIES[e.type].mass * (e.big ? BEHAVIOUR.big.mass : 1);
  }

  /** Combined strength of the given players' hands. */
  strengthOf(players: number[]): number {
    let sum = 0;
    for (const p of players) sum += HANDS[(this.loadout.handTier[p] ?? 1) - 1].strength;
    return sum * this.weapons.gripStrength();
  }
}
