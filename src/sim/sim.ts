// The simulation's front door: commands go in, state and events come out, the same every time for the same input.
import { cleanFlags } from '../config/flags';
import type { EnemyType } from '../config/enemies';
import { FIELD, fieldWall, perchX } from '../config/field';
import { Combat } from './combat';
import { SimContext } from './context';
import { DayFlow } from './dayFlow';
import { EnemyBehaviour } from './enemies';
import { Flight } from './flight';
import { Hands } from './hands';
import { Projectiles } from './projectiles';
import { Rng } from './rng';
import type { RunSetup, RunStart } from './rules';
import { Shop, type Quote } from './shop';
import { Spawner } from './spawner';
import { RunStats } from './stats';
import { Stations } from './stations';
import type { Command, DeathCause, Enemy, Hand, Projectile, ProjectileKind, SimEvent, SimState } from './types';
import { WeaponSystem } from './weapons/system';
import { Zones } from './zones';

function newHand(): Hand {
  return { x: 640, y: 300, down: false, holding: -1, holdingProj: -1, pressX: 0, pressY: 0, pressTick: 0, connected: true };
}

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * The game rules behind one door: commands go in, state and events come out. No rendering, no
 * timers, no Math.random: given the same setup and the same commands it produces the same result,
 * which is what makes it testable and able to run headless. It knows nothing about campaign or
 * endless: a game mode hands it the rules of the run and a planner for its days (`RunSetup`).
 * The rules themselves live in the parts (`DayFlow`, `Hands`, `Combat`, ...), which share one `SimContext`.
 */
export class Sim {
  readonly s: SimState;
  readonly ctx: SimContext;

  constructor(setup: RunSetup) {
    const n = setup.names.length;
    const start = setup.start;
    this.s = {
      tick: 0, phase: 'banner', phaseT: 0, day: 0, dayT: 0, gold: start.gold, offerings: start.offerings,
      gateHp: 0, gateMax: 0, enemies: [], projectiles: [], zones: [],
      hands: Array.from({ length: n }, newHand),
      cooldowns: [0, 0, 0, 0, 0], cooldownMax: [0, 0, 0, 0, 0], delayed: [],
      goldRushT: 0, goldRushFactor: 1, beaconT: 0, airStopT: 0, sentryT: 1, sentryBurst: 0,
      extraHandT: new Array(n).fill(0), extraHandStrength: 0, gripT: 0, gripStrength: 1, gripLethal: 1, mendT: 0, mendRate: 0,
      spawnQueue: [], spawned: 0, perchBusy: 0, potBusy: 0, potMax: 0, nightfall: false, hold: false,
      nextId: 1, seed: setup.seed, rngState: setup.seed,
      dayKills: 0, dayGold: 0, dayOfferings: 0, dayScore: 0, paused: false,
      seenTypes: [...start.seenTypes], stats: copy(start.stats),
      meta: {
        rev: 1, names: setup.names, ready: new Array(n).fill(false), lastDay: null,
        totalScore: start.totalScore, totalKills: start.totalKills, pausedBy: null, tuning: { ...setup.tuning },
        flags: cleanFlags(setup.flags), fieldW: Math.max(FIELD.min, Math.min(FIELD.max, setup.fieldW ?? FIELD.min)),
        rules: copy(setup.rules), loadout: copy(start.loadout),
        today: { landscape: 'meadow', night: false, boss: null, newTypes: [], seconds: 0 },
        devRun: setup.devRun ?? false, result: null,
      },
    };
    const ctx = new SimContext(this.s, new Rng(setup.seed), setup.planner);
    ctx.stats = new RunStats(ctx);
    ctx.day = new DayFlow(ctx);
    ctx.spawner = new Spawner(ctx);
    ctx.hands = new Hands(ctx);
    ctx.stations = new Stations(ctx);
    ctx.weapons = new WeaponSystem(ctx);
    ctx.combat = new Combat(ctx);
    ctx.shop = new Shop(ctx);
    ctx.enemies = new EnemyBehaviour(ctx);
    ctx.flight = new Flight(ctx);
    ctx.projectiles = new Projectiles(ctx);
    ctx.zones = new Zones(ctx);
    this.ctx = ctx;
    ctx.day.startDay(start.day);
  }

  get tuning() { return this.ctx.tuning; }
  get rules() { return this.ctx.rules; }
  get loadout() { return this.ctx.loadout; }

  /** Replaces the tuning values (developer menu). From then on the run no longer counts. */
  setTuning(t: SimState['meta']['tuning']) { this.s.meta.tuning = { ...t }; this.markDevRun(); }

  flag(id: string): string { return this.ctx.flag(id); }

  /** Replaces the experiment switches (developer menu). From then on the run no longer counts. */
  setFlags(f: Record<string, string>) { this.s.meta.flags = cleanFlags(f); this.markDevRun(); }

  /** A developer tool touched this run: it reaches neither the scores nor the stars. */
  markDevRun() { this.s.meta.devRun = true; this.ctx.touchMeta(); }

  get fieldW() { return this.s.meta.fieldW; }

  /** Solo only: follows a rotated phone or resized window. Whoever stands outside walks back in. */
  setFieldWidth(w: number) {
    const v = Math.max(FIELD.min, Math.min(FIELD.max, Math.round(w)));
    if (v === this.s.meta.fieldW) return;
    this.s.meta.fieldW = v;
    const wall = fieldWall(v);
    for (const e of this.s.enemies) {
      if (e.st === 'air' || e.st === 'held' || e.st === 'hooked') e.x = Math.min(e.x, wall - 10);
      if (e.st === 'hooked') e.x = perchX(v);
    }
    this.ctx.touchMeta();
  }

  drainEvents(): SimEvent[] {
    const out = this.ctx.events;
    this.ctx.events = [];
    return out;
  }

  /** What the market says about an item right now; see `quote` in shop.ts for the item names. */
  quote(item: string): Quote { return this.ctx.shop.quote(item); }
  canBuy(item: string): boolean { return this.ctx.shop.canBuy(item); }

  spawnEnemy(type: EnemyType, x?: number, big = false): Enemy { return this.ctx.spawner.spawnEnemy(type, x, big); }

  /** Freezes or releases everything without a pause window. The tutorial waits like this for the first throw. */
  setHold(hold: boolean) { this.ctx.day.setHold(hold); }

  /** Pause caused by a lost connection rather than a player. */
  pauseForDisconnect(reason: string) { this.ctx.day.pauseForDisconnect(reason); }

  /**
   * The values needed to start this run again at the beginning of a day (resuming a level after the
   * app was closed). Only meaningful at the start of a day or in the market.
   */
  dayStartSave(day = this.s.day): RunStart {
    const s = this.s;
    return copy({
      day, gold: s.gold, offerings: s.offerings, loadout: s.meta.loadout, stats: s.stats,
      totalScore: s.meta.totalScore, totalKills: s.meta.totalKills, seenTypes: s.seenTypes,
    });
  }

  // Short cuts into the parts, used by tests and developer tools that set up a situation directly.
  blast(x: number, y: number, radius: number, damage: number, p: number) { this.ctx.combat.blast(x, y, radius, damage, p); }
  hurt(e: Enemy, amount: number, cause: DeathCause, p: number) { this.ctx.combat.hurt(e, amount, cause, p); }
  spawnProjectile(kind: ProjectileKind, x: number, y: number, vx: number, vy: number): Projectile { return this.ctx.projectiles.spawnProjectile(kind, x, y, vx, vy); }
  enterPot(e: Enemy) { this.ctx.stations.enterPot(e); }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  setHand(p: number, x: number, y: number) {
    const h = this.s.hands[p];
    if (h) { h.x = x; h.y = y; }
  }

  setConnected(p: number, connected: boolean) {
    const h = this.s.hands[p];
    if (!h) return;
    h.connected = connected;
    if (!connected) {
      this.ctx.hands.dropHeld(p);
      h.down = false;
      this.s.meta.ready[p] = false;
    }
    this.ctx.touchMeta();
    if (!connected) this.ctx.day.startDayIfAllReady();
  }

  /** Sets a player's hand tier, for a guest who joins or returns with a different hand. */
  setHandTier(p: number, tier: number) {
    if (this.s.meta.loadout.handTier[p] === undefined) return;
    this.s.meta.loadout.handTier[p] = tier;
    this.ctx.touchMeta();
  }

  command(c: Command) {
    const x = this.ctx;
    switch (c.k) {
      case 'press': x.hands.press(c.p, c.x, c.y); break;
      case 'release': x.hands.release(c.p, c.x, c.y, c.vx, c.vy); break;
      case 'fireSlot': x.weapons.fireSlot(c.p, c.slot); break;
      case 'shake': x.hands.shake(c.p); break;
      case 'buy': x.shop.buy(c.p, c.item); break;
      case 'ready': x.day.setReady(c.p, c.ready); break;
      case 'forceStart': if (c.p === 0 && this.s.phase === 'intermission') x.day.startDay(this.s.day + 1); break;
      case 'pause': x.day.setPaused(c.p, c.paused); break;
    }
  }

  /** Advances the game by one tick of 1/60 s. */
  step() { this.ctx.day.step(); }
}
