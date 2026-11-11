import { STARTING_ITEMS, type WeaponSlot } from '../config/shop';
import { cleanFlags } from '../config/flags';
import { quickStartFor } from '../config/quickstart';
import type { EnemyType } from '../config/enemies';
import { FIELD, fieldWall, perchX } from '../config/world';
import { Combat } from './combat';
import { SimContext } from './context';
import { DayFlow } from './dayFlow';
import { Economy } from './economy';
import { EnemyBehaviour } from './enemies';
import { Flight } from './flight';
import { Hands } from './hands';
import { Projectiles } from './projectiles';
import { Rng } from './rng';
import { Spawner } from './spawner';
import { Stations } from './stations';
import type { Command, DeathCause, Enemy, Hand, Projectile, ProjectileKind, SimEvent, SimOptions, SimState } from './types';
import { WeaponSystem } from './weapons';

function newHand(): Hand {
  return { x: 640, y: 300, down: false, mode: 'none', holding: -1, holdingProj: -1, pressX: 0, pressY: 0, pressTick: 0, modePress: false, connected: true };
}

/**
 * The game rules behind one door: commands go in, state and events come out. No rendering, no
 * timers, no Math.random: given the same seed and the same commands it produces the same result,
 * which is what makes it testable and able to run headless. The rules themselves live in the parts
 * (`DayFlow`, `Hands`, `Combat`, ...), which share one `SimContext`.
 */
export class Sim {
  readonly s: SimState;
  readonly ctx: SimContext;

  constructor(opts: SimOptions) {
    const n = opts.names.length;
    const zero = () => ({ wheel: 0, stomper: 0, comet: 0, horn: 0, bolter: 0 });
    this.s = {
      tick: 0, phase: 'banner', phaseT: 0, day: 0, dayT: 0, gold: 0, offerings: 0,
      gateHp: 0, gateMax: 0, enemies: [], projectiles: [], flames: [],
      hands: Array.from({ length: n }, newHand),
      cooldowns: zero(), cooldownMax: zero(),
      spawnQueue: [], spawned: 0, perchBusy: 0, potBusy: 0, potMax: 0, nightfall: false, nextId: 1, rngState: opts.seed,
      dayKills: 0, dayGold: 0, dayOfferings: 0, dayScore: 0, paused: false, seenTypes: [],
      meta: {
        rev: 1, difficulty: opts.difficulty, owned: [...STARTING_ITEMS], hornEquipped: null,
        names: opts.names, ready: new Array(n).fill(false), lastDay: null, totalScore: 0, totalKills: 0,
        newTipTypes: [], pausedBy: null, tuning: { ...opts.tuning },
        flags: cleanFlags(opts.flags), fieldW: Math.max(FIELD.min, Math.min(FIELD.max, opts.fieldW ?? FIELD.min)), quickStart: 0,
      },
    };
    const ctx = new SimContext(this.s, new Rng(opts.seed));
    ctx.day = new DayFlow(ctx);
    ctx.spawner = new Spawner(ctx);
    ctx.hands = new Hands(ctx);
    ctx.stations = new Stations(ctx);
    ctx.weapons = new WeaponSystem(ctx);
    ctx.combat = new Combat(ctx);
    ctx.economy = new Economy(ctx);
    ctx.enemies = new EnemyBehaviour(ctx);
    ctx.flight = new Flight(ctx);
    ctx.projectiles = new Projectiles(ctx);
    this.ctx = ctx;

    const quick = opts.quickStart ? quickStartFor(opts.quickStart) : null;
    if (quick) ctx.day.applyQuickStart(quick);
    ctx.day.startDay(quick ? quick.day : 1);
  }

  get tuning() { return this.ctx.tuning; }

  /** Replaces the tuning values (host panel). */
  setTuning(t: SimState['meta']['tuning']) { this.s.meta.tuning = { ...t }; this.ctx.touchMeta(); }

  flag(id: string): string { return this.ctx.flag(id); }

  /** Replaces the experiment switches (host panel). */
  setFlags(f: Record<string, string>) { this.s.meta.flags = cleanFlags(f); this.ctx.touchMeta(); }

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

  owns(id: string): boolean { return this.ctx.owns(id); }

  canBuy(id: string): boolean { return this.ctx.economy.canBuy(id); }

  /** Highest owned item of a slot, or null. */
  tierOf(slot: WeaponSlot): string | null { return this.ctx.weapons.tierOf(slot); }

  spawnEnemy(type: EnemyType, x?: number): Enemy { return this.ctx.spawner.spawnEnemy(type, x); }

  // Short cuts into the parts, used by tests that set up a situation directly.
  blast(x: number, y: number, radius: number, damage: number, p: number) { this.ctx.combat.blast(x, y, radius, damage, p); }
  hurt(e: Enemy, amount: number, cause: DeathCause, p: number) { this.ctx.combat.hurt(e, amount, cause, p); }
  spawnProjectile(kind: ProjectileKind, x: number, y: number, vx: number, vy: number): Projectile { return this.ctx.projectiles.spawnProjectile(kind, x, y, vx, vy); }
  enterPot(e: Enemy, x: number, y: number) { this.ctx.stations.enterPot(e, x, y); }

  /** Pause caused by a lost connection rather than a player. */
  pauseForDisconnect(reason: string) { this.ctx.day.pauseForDisconnect(reason); }

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
      h.mode = 'none';
      this.s.meta.ready[p] = false;
    }
    this.ctx.touchMeta();
    if (!connected) this.ctx.day.startDayIfAllReady();
  }

  command(c: Command) {
    const x = this.ctx;
    switch (c.k) {
      case 'press': x.hands.press(c.p, c.x, c.y); break;
      case 'release': x.hands.release(c.p, c.x, c.y, c.vx, c.vy); break;
      case 'activate': x.weapons.activate(c.p, c.slot); break;
      case 'pressSlot': x.hands.pressSlot(c.p, c.slot, c.x, c.y); break;
      case 'cancelMode': x.hands.cancelMode(c.p); break;
      case 'buy': x.economy.buy(c.p, c.item); break;
      case 'equip': x.economy.equip(c.item); break;
      case 'ready': x.day.setReady(c.p, c.ready); break;
      case 'forceStart': if (c.p === 0 && this.s.phase === 'intermission') x.day.startDay(this.s.day + 1); break;
      case 'pause': x.day.setPaused(c.p, c.paused); break;
    }
  }

  /** Advances the game by one tick of 1/60 s. */
  step() { this.ctx.day.step(); }
}
