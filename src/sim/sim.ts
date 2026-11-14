// The simulation's front door: commands go in, state and events come out, the same every time for the same input.
import { cleanFlags } from '../config/flags';
import type { EnemyType } from '../config/enemies';
import { FIELD, WORLD, fieldWall, perchX } from '../config/field';
import { Combat } from './combat';
import { SimContext } from './context';
import { EnemyBehaviour } from './enemies';
import { Flight } from './flight';
import { Hands } from './hands';
import { handIndex } from './physics';
import { Projectiles } from './projectiles';
import { Rng } from './rng';
import type { RunSetup, RunStart } from './rules';
import { Spawner } from './spawner';
import { RunStats } from './stats';
import { Stations } from './stations';
import type { Command, DeathCause, Enemy, Hand, Projectile, ProjectileKind, SimEvent, SimState } from './types';
import { WeaponSystem } from './weapons/system';
import { WaveFlow } from './waveFlow';
import { Zones } from './zones';

function newHand(): Hand {
  return { x: 640, y: 300, down: false, holding: -1, holdingProj: -1, pressX: 0, pressY: 0, pressTick: 0, connected: true };
}

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * The game rules behind one door: commands go in, state and events come out. No rendering, no
 * timers, no Math.random: given the same setup and the same commands it produces the same result,
 * which is what makes it testable and able to run headless. It knows nothing about campaign or
 * endless: a game mode hands it the rules of the run and a planner for its waves (`RunSetup`).
 * The rules themselves live in the parts (`WaveFlow`, `Hands`, `Combat`, ...), which share one `SimContext`.
 */
export class Sim {
  readonly s: SimState;
  readonly ctx: SimContext;

  constructor(setup: RunSetup) {
    const n = setup.names.length;
    const start = setup.start;
    const fieldW = Math.max(FIELD.min, Math.min(FIELD.max, setup.fieldW ?? FIELD.min));
    this.s = {
      tick: 0, phase: 'banner', phaseT: 0, wave: 0, waveT: 0, runT: 0, waveDone: false, pauseT: 0, emptyT: 0, pauseAfter: 0, wavesFrozen: false,
      gold: start.gold, crests: start.stats.crestsEarned ?? 0,
      gateHp: 0, gateMax: 0, enemies: [], projectiles: [], zones: [],
      hands: Array.from({ length: n }, newHand),
      cooldowns: [0, 0, 0, 0, 0], cooldownMax: [0, 0, 0, 0, 0], delayed: [],
      goldRushT: 0, goldRushFactor: 1, beaconT: 0, airStopT: 0, sentryT: 1, sentryBurst: 0,
      extraHandT: new Array(n).fill(0), extraHandStrength: 0, gripT: 0, gripStrength: 1, gripLethal: 1, mendT: 0, mendRate: 0,
      spawnQueue: [], spawned: 0, perchBusy: 0, potBusy: 0, potMax: 0, hold: false,
      nextId: 1, seed: setup.seed, rngState: setup.seed,
      paused: false,
      seenTypes: [...start.seenTypes], stats: copy(start.stats),
      meta: {
        rev: 1, names: setup.names,
        totalScore: start.totalScore, totalKills: start.totalKills, pausedBy: null, tuning: { ...setup.tuning },
        flags: cleanFlags(setup.flags), fieldW,
        viewRight: Math.max(WORLD.gateX + 200, Math.min(fieldW, setup.viewRight ?? fieldW)),
        rules: copy(setup.rules), loadout: copy(start.loadout),
        wave: { landscape: 'meadow', night: false, boss: null, newTypes: [], wave: 0, lastWave: setup.rules.lastWave },
        devRun: setup.devRun ?? false, result: null,
      },
    };
    const ctx = new SimContext(this.s, new Rng(setup.seed), setup.planner);
    ctx.stats = new RunStats(ctx);
    ctx.waves = new WaveFlow(ctx);
    ctx.spawner = new Spawner(ctx);
    ctx.hands = new Hands(ctx);
    ctx.stations = new Stations(ctx);
    ctx.weapons = new WeaponSystem(ctx);
    ctx.combat = new Combat(ctx);
    ctx.enemies = new EnemyBehaviour(ctx);
    ctx.flight = new Flight(ctx);
    ctx.projectiles = new Projectiles(ctx);
    ctx.zones = new Zones(ctx);
    this.ctx = ctx;
    ctx.waves.startLevel(Math.max(1, start.wave), start.gateHp);
  }

  get tuning() { return this.ctx.tuning; }
  get rules() { return this.ctx.rules; }
  get loadout() { return this.ctx.loadout; }

  /** Replaces the tuning values (developer menu). From then on the run no longer counts. */
  setTuning(t: SimState['meta']['tuning']) { this.s.meta.tuning = { ...t }; this.markDevRun(); }

  flag(id: string): string { return this.ctx.flag(id); }

  /** Replaces the experiment switches (developer menu). From then on the run no longer counts. */
  setFlags(f: Record<string, string>) { this.s.meta.flags = cleanFlags(f); this.markDevRun(); }

  /** A developer tool touched this run: it reaches neither the scores nor the rewards. */
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

  spawnEnemy(type: EnemyType, x?: number, big = false): Enemy { return this.ctx.spawner.spawnEnemy(type, x, big); }

  /**
   * Stops the wave clock: nothing arrives any more and no wave follows, while the fight goes on with
   * whoever is on the field (tests and developer tools).
   */
  freezeWaves() { this.s.wavesFrozen = true; this.s.spawnQueue = []; this.s.spawned = 0; }

  /** Freezes or releases everything without a pause window. The tutorial waits like this for the first throw. */
  setHold(hold: boolean) { this.ctx.waves.setHold(hold); }

  /** Pause caused by a lost connection rather than a player. */
  pauseForDisconnect(reason: string) { this.ctx.waves.pauseForDisconnect(reason); }

  /**
   * The values needed to start this run again at the beginning of the current wave (resuming a
   * level after the app was closed). Taken when a wave starts.
   */
  waveStartSave(): RunStart {
    const s = this.s;
    return copy({
      wave: s.wave, gold: s.gold, gateHp: s.gateHp, loadout: s.meta.loadout, stats: s.stats,
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
      const second = this.s.hands[this.handOf(p, 1)];
      if (second) { this.ctx.hands.dropHeld(this.handOf(p, 1)); second.down = false; }
    }
    this.ctx.touchMeta();
  }

  /** Sets a player's hand tier, for a guest who joins or returns with a different hand. */
  setHandTier(p: number, tier: number) {
    if (this.s.meta.loadout.handTier[p] === undefined) return;
    this.s.meta.loadout.handTier[p] = tier;
    this.ctx.touchMeta();
  }

  /** Number of a player's first (0) or second (1) hand, see `handIndex`. */
  handOf(p: number, which = 0): number { return handIndex(p, which, this.s.meta.names.length); }

  command(c: Command) {
    const x = this.ctx;
    switch (c.k) {
      case 'press': x.hands.press(this.handOf(c.p, c.hand), c.x, c.y); break;
      case 'release': x.hands.release(this.handOf(c.p, c.hand), c.x, c.y, c.vx, c.vy); break;
      case 'move': x.hands.move(this.handOf(c.p, c.hand), c.x, c.y); break;
      case 'fireSlot': x.weapons.fireSlot(c.p, c.slot); break;
      case 'shake': x.hands.shake(this.handOf(c.p, c.hand)); break;
      case 'pause': x.waves.setPaused(c.p, c.paused); break;
    }
  }

  /** Advances the game by one tick of 1/60 s. */
  step() { this.ctx.waves.step(); }
}
