/**
 * Shared set-up for the unit tests: builds a run the way the game does (endless rules from
 * `ENDLESS.buildRun` with a fresh profile) and lets a test change what it needs before the Sim starts.
 */
import { ENEMIES, type EnemyType } from '../../src/config/enemies';
import type { Flags } from '../../src/config/flags';
import { SLOTS } from '../../src/config/slots';
import { TUNING_DEFAULT, type Tuning } from '../../src/config/tuning';
import type { Difficulty, Landscape } from '../../src/config/waves';
import { weaponById } from '../../src/config/weapons';
import { ENDLESS as ENDLESS_MODE } from '../../src/modes';
import { MemoryProfileStore, Profile } from '../../src/profile';
import { FixedPlanner, type DayPlanner, type DaySpec } from '../../src/sim/plan';
import type { Loadout, RunRules, RunSetup, RunStart } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import type { Enemy, SimEvent } from '../../src/sim/types';

/** A brand new profile in memory. */
export const newProfile = (): Promise<Profile> => Profile.load(new MemoryProfileStore());

/** One fresh profile for set-ups that only read it (endless rules do not change the profile). */
export const PROFILE = await newProfile();

export interface SimOpts {
  names?: string[];
  difficulty?: Difficulty;
  seed?: number;
  /** Replaces single tuning values. */
  tuning?: Partial<Tuning>;
  flags?: Flags;
  fieldW?: number;
  handTiers?: number[];
  /** Start values on top of a fresh start. */
  day?: number;
  gold?: number;
  offerings?: number;
  loadout?: Partial<Loadout>;
  seenTypes?: EnemyType[];
  /** Replaces single rules of the run. */
  rules?: Partial<RunRules>;
  /** Fixed days instead of the endless planner. */
  days?: DaySpec[];
  landscape?: Landscape;
  coopCount?: number;
  planner?: DayPlanner;
  devRun?: boolean;
  profile?: Profile;
}

/** The run set-up a test plays: endless rules unless the options say otherwise. */
export function makeSetup(o: SimOpts = {}): RunSetup {
  const names = o.names ?? ['A'];
  const setup = ENDLESS_MODE.buildRun(o.profile ?? PROFILE, { world: 'fondue', difficulty: o.difficulty ?? 'medium' }, {
    names, fieldW: o.fieldW ?? 1280, handTiers: o.handTiers ?? names.map(() => 1), seed: o.seed ?? 42,
    tuning: { ...TUNING_DEFAULT, ...o.tuning }, flags: o.flags,
  });
  const rules: RunRules = { ...setup.rules, ...o.rules };
  const base: RunStart = setup.start;
  const loadout: Loadout = { ...base.loadout, ...o.loadout };
  if (o.handTiers && !o.loadout?.handTier) loadout.handTier = [...o.handTiers];
  const start: RunStart = {
    ...base, loadout, day: o.day ?? base.day, gold: o.gold ?? base.gold, offerings: o.offerings ?? base.offerings,
    seenTypes: o.seenTypes ?? base.seenTypes,
  };
  let planner = o.planner ?? setup.planner;
  if (o.days) planner = new FixedPlanner(o.days, o.landscape ?? 'meadow', () => o.coopCount ?? 1);
  return { ...setup, rules, start, planner, devRun: o.devRun ?? setup.devRun };
}

export function makeSim(o: SimOpts = {}): Sim {
  return new Sim(makeSetup(o));
}

/** A run already in the fight, with an empty arrival list, so the test places its own raiders. */
export function battleSim(o: SimOpts = {}): Sim {
  const sim = makeSim(o);
  toBattle(sim);
  sim.s.spawnQueue = [];
  sim.drainEvents();
  return sim;
}

/** Steps through the banner. */
export function toBattle(sim: Sim) {
  for (let i = 0; i < 1000 && sim.s.phase === 'banner'; i++) sim.step();
}

export function place(sim: Sim, type: EnemyType, x = 700): Enemy {
  return sim.spawnEnemy(type, x);
}

/** Steps until the condition holds or the ticks run out; returns every event on the way. */
export function runUntil(sim: Sim, cond: () => boolean, maxTicks = 2000): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < maxTicks && !cond(); i++) {
    sim.step();
    all.push(...sim.drainEvents());
  }
  return all;
}

/** Simulates n seconds and returns the events. */
export function runFor(sim: Sim, seconds: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    sim.step();
    all.push(...sim.drainEvents());
  }
  return all;
}

/** Ends the fight of the current day with an empty field and steps into the market. */
export function skipToMarket(sim: Sim) {
  toBattle(sim);
  sim.s.spawnQueue = [];
  sim.s.enemies = [];
  sim.s.dayT = sim.s.meta.today.seconds;
  runUntil(sim, () => sim.s.phase !== 'battle' && sim.s.phase !== 'victory', 1000);
}

/** The first slot that takes this weapon. */
export function slotFor(weapon: string): number {
  const def = weaponById(weapon);
  if (!def) throw new Error(`unknown weapon ${weapon}`);
  return SLOTS.findIndex((s) => s.role === def.slot);
}

/** Puts a weapon at a tier into its slot (or the given one) and returns the slot. */
export function arm(sim: Sim, weapon: string, tier = 1, slot = slotFor(weapon)): number {
  sim.loadout.slotWeapon[slot] = weapon;
  sim.loadout.weaponTier[weapon] = tier;
  return slot;
}

/** Grabs a raider in the middle of its body. */
export function grabAt(sim: Sim, p: number, e: Enemy) {
  const y = e.y - ENEMIES[e.type].height * 0.5;
  sim.setHand(p, e.x, y);
  sim.command({ k: 'press', p, x: e.x, y });
}

/** Grabs, holds for a moment and lets go straight up at this speed. */
export function flingUp(sim: Sim, e: Enemy, speed: number, p = 0) {
  grabAt(sim, p, e);
  for (let i = 0; i < 6; i++) sim.step();
  sim.command({ k: 'release', p, x: e.x, y: e.y - 40, vx: 0, vy: -speed });
}

/** Grabs a raider, moves the hand there for one tick and lets go with this swipe. */
export function carryTo(sim: Sim, e: Enemy, x: number, y: number, vx = 0, vy = 0, p = 0) {
  const gy = e.y - ENEMIES[e.type].height * 0.5;
  sim.setHand(p, e.x, gy);
  sim.command({ k: 'press', p, x: e.x, y: gy });
  sim.setHand(p, x, y);
  sim.step();
  sim.command({ k: 'release', p, x, y, vx, vy });
}

export function fire(sim: Sim, slot: number, p = 0): SimEvent[] {
  sim.command({ k: 'fireSlot', p, slot });
  return sim.drainEvents();
}

export const firedOk = (ev: SimEvent[]) => ev.some((e) => e.e === 'fire');
export const denied = (ev: SimEvent[]) => ev.some((e) => e.e === 'denied');

export function eventsOf<K extends SimEvent['e']>(ev: SimEvent[], kind: K): Extract<SimEvent, { e: K }>[] {
  return ev.filter((e) => e.e === kind) as Extract<SimEvent, { e: K }>[];
}
