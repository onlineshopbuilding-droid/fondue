// The game as one player's machine sees it: solo, the co-op host that runs the simulation, or the guest that follows it.
// Rendering and UI only talk to a Session; the network messages stay in here.
import { ENEMIES } from '../config/enemies';
import { DT, WORLD, fieldWall } from '../config/field';
import type { ClientCommand, NetMessage } from '../net/protocol';
import { decodeSnapshot, encodeSnapshot, interpolateViews, type ViewEnemy, type ViewState } from '../net/snapshot';
import type { Transport } from '../net/transport';
import { followFactor, handStrength, launchVelocity, liftFlat, massOfType, springStep, throwFactor } from '../sim/physics';
import type { RunSetup } from '../sim/rules';
import { Sim } from '../sim/sim';
import type { Command, Meta, SimEvent } from '../sim/types';

export type ConnectionState = 'none' | 'connected' | 'lost';

/** The game seen from one player's machine. Rendering and UI only talk to this. */
export interface Session {
  readonly role: 'solo' | 'host' | 'guest';
  readonly me: number;
  /** Advances the game by the given real time. */
  update(dtMs: number): void;
  view(): ViewState | null;
  meta(): Meta | null;
  drainEvents(): SimEvent[];
  send(c: ClientCommand): void;
  setHand(x: number, y: number): void;
  /** Called by the input layer for instant local feedback. */
  localPress(x: number, y: number): void;
  localRelease(vx: number, vy: number): void;
  connection(): ConnectionState;
  pingMs(): number;
  dispose(): void;
}

const SNAPSHOT_EVERY_STEPS = 2; // 30 Hz
const MAX_CATCHUP_TICKS = 6;
/** No message from the other side for this long means the link is gone. */
const SILENCE_LIMIT_MS = 4000;
/** A frame later than this means this tab itself was frozen, so it could not have heard anything. */
const OWN_STALL_MS = 500;

/**
 * Silence only counts while this tab is running. After a freeze (art loading in the background, a
 * slow phone, a busy machine) the other side's messages are still queued behind the frame that runs
 * first, so the frozen time is added to the last-heard time instead of ending the link.
 */
function excuseOwnStall(lastHeard: number, lastUpdate: number, now: number): number {
  return lastUpdate > 0 && now - lastUpdate > OWN_STALL_MS ? lastHeard + (now - lastUpdate) : lastHeard;
}
/** Long event lists are split so that no message exceeds the data channel limit. */
const MAX_EVENTS_PER_MESSAGE = 60;

/** Runs the simulation: single player, or the host of a co-op game. */
export class HostSession implements Session {
  readonly role: 'solo' | 'host';
  readonly me = 0;
  readonly sim: Sim;
  private acc = 0;
  private events: SimEvent[] = [];
  private link: Transport | null = null;
  private linkLost = false;
  private lastMetaRev = -1;
  private netEvents: SimEvent[] = [];
  private ping = 0;
  private pingTimer = 0;
  private lastHeard = 0;
  private lastUpdate = 0;
  /** Counts steps even while paused, so that a paused game keeps sending its state. */
  private stepCounter = 0;

  constructor(setup: RunSetup, coop: boolean) {
    this.role = coop ? 'host' : 'solo';
    this.sim = new Sim(setup);
  }

  /** Attaches the guest connection. Works mid-game for reconnects. */
  attach(link: Transport) {
    if (this.link && this.link !== link) {
      const old = this.link;
      this.link = null;
      old.onClose = () => {};
      old.onMessage = () => {};
      old.close();
    }
    this.link = link;
    this.linkLost = false;
    this.lastMetaRev = -1;
    this.lastHeard = performance.now();
    this.sim.setConnected(1, true);
    if (this.sim.s.paused && this.sim.s.meta.pausedBy === 'Connection lost') {
      this.sim.s.paused = false;
      this.sim.s.meta.pausedBy = null;
    }
    link.onMessage = (m) => { if (this.link === link) this.onNet(m); };
    link.onClose = () => { if (this.link === link) this.onLinkLost(); };
  }

  private onLinkLost() {
    const dead = this.link;
    if (dead) { dead.onClose = () => {}; dead.onMessage = () => {}; dead.close(); }
    this.link = null;
    this.linkLost = true;
    this.sim.setConnected(1, false);
    this.sim.pauseForDisconnect('Connection lost');
  }

  /** The host decides to carry on without the guest. */
  continueAlone() {
    this.sim.s.paused = false;
    this.sim.s.meta.pausedBy = null;
    this.sim.s.meta.rev++;
    this.linkLost = false;
  }

  private onNet(m: NetMessage) {
    this.lastHeard = performance.now();
    switch (m.k) {
      case 'c': this.sim.command({ ...m.c, p: 1 } as Command); break;
      case 'h': this.sim.setHand(1, m.x, m.y); break;
      case 'ping': this.link?.send({ k: 'pong', t: m.t }); break;
      case 'pong': this.ping = performance.now() - m.t; break;
      default: break;
    }
  }

  update(dtMs: number) {
    this.acc += dtMs / 1000;
    let steps = 0;
    while (this.acc >= DT && steps < MAX_CATCHUP_TICKS) {
      this.sim.step();
      this.collect();
      this.acc -= DT;
      steps++;
      this.stepCounter++;
      if (this.link && this.stepCounter % SNAPSHOT_EVERY_STEPS === 0) this.broadcast();
    }
    if (steps === MAX_CATCHUP_TICKS) this.acc = 0;
    this.collect();
    if (this.link) {
      if (this.netEvents.length > 0) this.broadcast();
      this.pingTimer += dtMs;
      if (this.pingTimer > 1000) { this.pingTimer = 0; this.link.send({ k: 'ping', t: performance.now() }); }
      const now = performance.now();
      this.lastHeard = excuseOwnStall(this.lastHeard, this.lastUpdate, now);
      this.lastUpdate = now;
      if (now - this.lastHeard > SILENCE_LIMIT_MS) this.onLinkLost();
    } else {
      this.lastUpdate = 0;
    }
  }

  private collect() {
    const evs = this.sim.drainEvents();
    if (evs.length === 0) return;
    this.events.push(...evs);
    if (this.link) this.netEvents.push(...evs);
  }

  private broadcast() {
    if (!this.link) return;
    if (this.lastMetaRev !== this.sim.s.meta.rev) {
      this.lastMetaRev = this.sim.s.meta.rev;
      this.link.send({ k: 'm', m: this.sim.s.meta });
    }
    while (this.netEvents.length > 0) {
      this.link.send({ k: 'ev', l: this.netEvents.splice(0, MAX_EVENTS_PER_MESSAGE) });
    }
    if (!this.link.congested?.()) this.link.send({ k: 's', s: encodeSnapshot(this.sim.s) });
  }

  view(): ViewState { return decodeSnapshot(encodeSnapshot(this.sim.s)); }
  meta(): Meta { return this.sim.s.meta; }
  drainEvents(): SimEvent[] { const e = this.events; this.events = []; return e; }

  send(c: ClientCommand) {
    this.sim.command({ ...c, p: 0 } as Command);
    this.collect();
    // Purchases and ready flags should reach the guest without waiting for the next snapshot.
    if (this.link && this.sim.s.phase === 'intermission') this.broadcast();
  }

  setHand(x: number, y: number) { this.sim.setHand(0, x, y); }
  localPress(x: number, y: number) { this.send({ k: 'press', x, y }); }
  localRelease(vx: number, vy: number) {
    const h = this.sim.s.hands[0];
    this.send({ k: 'release', x: h.x, y: h.y, vx, vy });
  }

  connection(): ConnectionState {
    if (this.role === 'solo') return 'none';
    return this.link ? 'connected' : this.linkLost ? 'lost' : 'none';
  }
  pingMs() { return this.ping; }
  dispose() { this.link?.close(); this.link = null; }
}

const INTERP_DELAY_MS = 100;

interface Timed { at: number; view: ViewState; }

interface Prediction {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  offX: number;
  offY: number;
  /** Weight of the raider, which decides how it follows the hand and how far it flies. */
  mass: number;
  pressedAt: number;
  thrown: boolean;
  lane: number;
  confirmed: boolean;
  /** Fractional time left over from the last fixed-step update. */
  acc: number;
}

/** Events are heard this late on the guest, so they land together with the delayed picture. */
const EVENT_DELAY_MS = 100;


/** Shows what the host sends and adds local prediction so that throwing feels immediate. */
export class GuestSession implements Session {
  readonly role = 'guest' as const;
  readonly me = 1;
  private buffer: Timed[] = [];
  private curMeta: Meta | null = null;
  private events: { at: number; ev: SimEvent }[] = [];
  private lost = false;
  /** The host left on purpose, so rejoining makes no sense. */
  hostLeft = false;
  private lastHeard = performance.now();
  private lastUpdate = 0;
  private projReleasedAt = -Infinity;
  private ping = 0;
  private pingTimer = 0;
  private handTimer = 0;
  private handX = WORLD.width / 2;
  private handY = WORLD.height / 2;
  private latest: ViewState | null = null;
  private pred: Prediction | null = null;
  private thrown: Prediction[] = [];

  onDisconnect: () => void = () => {};
  onRestart: () => void = () => {};

  constructor(private link: Transport) {
    link.onMessage = (m) => this.onNet(m);
    link.onClose = () => { this.lost = true; this.onDisconnect(); };
  }

  private onNet(m: NetMessage) {
    this.lastHeard = performance.now();
    switch (m.k) {
      case 's': {
        const view = decodeSnapshot(m.s);
        this.buffer.push({ at: performance.now(), view });
        if (this.buffer.length > 40) this.buffer.shift();
        break;
      }
      case 'ev': {
        const at = performance.now() + EVENT_DELAY_MS;
        for (const ev of m.l) this.events.push({ at, ev });
        break;
      }
      case 'm': this.curMeta = m.m; break;
      case 'start':
        this.buffer = [];
        this.curMeta = null;
        this.pred = null;
        this.thrown = [];
        this.latest = null;
        this.onRestart();
        break;
      case 'leftGame':
        this.lost = true;
        this.hostLeft = true;
        this.onDisconnect();
        break;
      case 'ping': this.link.send({ k: 'pong', t: m.t }); break;
      case 'pong': this.ping = performance.now() - m.t; break;
      default: break;
    }
  }

  update(dtMs: number) {
    this.handTimer += dtMs;
    if (this.handTimer >= 16) {
      this.handTimer = 0;
      this.link.send({ k: 'h', x: Math.round(this.handX * 10) / 10, y: Math.round(this.handY * 10) / 10 });
    }
    this.pingTimer += dtMs;
    if (this.pingTimer > 1000) { this.pingTimer = 0; this.link.send({ k: 'ping', t: performance.now() }); }

    const now = performance.now();
    this.lastHeard = excuseOwnStall(this.lastHeard, this.lastUpdate, now);
    this.lastUpdate = now;
    if (!this.lost && now - this.lastHeard > SILENCE_LIMIT_MS) {
      this.lost = true;
      this.onDisconnect();
    }

    this.latest = this.computeView();
    this.stepPrediction(dtMs / 1000);
  }

  private computeView(): ViewState | null {
    if (this.buffer.length === 0) return null;
    const renderAt = performance.now() - INTERP_DELAY_MS;
    let a = this.buffer[0];
    let b = this.buffer[0];
    for (let i = 0; i < this.buffer.length; i++) {
      b = this.buffer[i];
      if (b.at >= renderAt) break;
      a = b;
    }
    if (a === b || b.at === a.at) return b.view;
    const f = Math.max(0, Math.min(1, (renderAt - a.at) / (b.at - a.at)));
    return interpolateViews(a.view, b.view, f);
  }

  private tuning() { return this.curMeta?.tuning; }

  private wall() { return fieldWall(this.curMeta?.fieldW ?? WORLD.width); }

  private stepPrediction(dt: number) {
    const t = this.tuning();
    if (!t) return;
    const newest = this.buffer[this.buffer.length - 1]?.view;
    const p = this.pred;
    if (p && newest) {
      const auth = newest.enemies.find((e) => e.id === p.id);
      if (auth && auth.heldBy.includes(this.me)) p.confirmed = true;
      // The host said no, someone else has it, or the enemy died in the meantime.
      const giveUp = performance.now() - p.pressedAt > 450 + this.ping;
      const takenByOther = !!auth && auth.heldBy.length > 0 && !auth.heldBy.includes(this.me);
      if (!auth || takenByOther || (!p.confirmed && giveUp) || (p.confirmed && !auth.heldBy.includes(this.me))) this.pred = null;
    }
    if (this.pred) {
      // Fixed steps like the host's: a spring integrated with long frames blows up.
      const q = this.pred;
      q.acc += Math.min(dt, 0.1);
      while (q.acc >= DT) {
        q.acc -= DT;
        springStep(q, this.handX + q.offX, this.handY + q.offY, t.holdSpring * followFactor(q.mass, this.strength()), DT);
        const ground = WORLD.groundY + q.lane;
        if (q.y > ground) { q.y = ground; q.vy = Math.min(0, q.vy); }
      }
    }
    for (const b of this.thrown) {
      b.vy += t.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < WORLD.gateX + 10) { b.x = WORLD.gateX + 10; b.vx = Math.abs(b.vx) * 0.35; }
      if (b.x > this.wall()) { b.x = this.wall(); b.vx = -Math.abs(b.vx) * 0.4; }
      const ground = WORLD.groundY + b.lane;
      if (b.y > ground) { b.y = ground; b.vy = 0; b.vx = 0; }
    }
    if (this.thrown.length > 0 && newest) {
      this.thrown = this.thrown.filter((b) => {
        const auth = newest.enemies.find((e) => e.id === b.id);
        if (auth?.st === 'air') b.confirmed = true;
        const age = performance.now() - b.pressedAt;
        // Until the host has seen the release its snapshots still say "held": keep flying.
        if (!b.confirmed) return age < 1000 + this.ping;
        return auth?.st === 'air' && age < 6000;
      });
    }
  }

  view(): ViewState | null {
    const v = this.latest;
    if (!v) return null;
    const hands = v.hands.map((h, i) => (i === this.me ? { ...h, x: this.handX, y: this.handY } : h));
    const override = new Map<number, Prediction>();
    if (this.pred) override.set(this.pred.id, this.pred);
    for (const b of this.thrown) override.set(b.id, b);
    const enemies = override.size === 0 ? v.enemies : v.enemies.map((e) => {
      const p = override.get(e.id);
      if (!p) return e;
      return { ...e, x: p.x, y: p.y, st: p.thrown ? 'air' as const : 'held' as const, heldBy: p.thrown ? [] : [this.me], rot: e.rot };
    });
    const justLetGo = performance.now() - this.projReleasedAt < 500;
    const projectiles = v.projectiles.map((q) => (q.heldBy === this.me && !justLetGo ? { ...q, x: this.handX, y: this.handY } : q));
    return { ...v, hands, enemies, projectiles };
  }

  meta() { return this.curMeta; }
  drainEvents() {
    const now = performance.now();
    let n = 0;
    while (n < this.events.length && this.events[n].at <= now) n++;
    return this.events.splice(0, n).map((q) => q.ev);
  }

  send(c: ClientCommand) { this.link.send({ k: 'c', c }); }

  /** Strength of this player's hand, as the host's rules give it. */
  private strength(): number { return handStrength(this.curMeta?.loadout.handTier[this.me] ?? 1); }
  setHand(x: number, y: number) { this.handX = x; this.handY = y; }

  localPress(x: number, y: number) {
    this.send({ k: 'press', x, y });
    const v = this.latest;
    if (!v || v.phase !== 'battle') return;
    // Same order as the host: a bomb within reach is taken before any enemy.
    const pad = (this.tuning()?.grabRadius ?? 30) * 0.5 + 44;
    if (v.projectiles.some((q) => q.kind === 'bomb' && q.heldBy < 0 && Math.hypot(q.x - x, q.y - y) < pad)) return;
    const target = this.pickEnemy(v.enemies, x, y);
    if (!target) return;
    const def = ENEMIES[target.type];
    this.pred = {
      id: target.id, x: target.x, y: target.y, vx: 0, vy: 0,
      offX: Math.max(-def.radius, Math.min(def.radius, target.x - x)),
      offY: Math.max(0, Math.min(def.height, target.y - y)),
      mass: massOfType(target.type, target.big, target.crow),
      pressedAt: performance.now(), thrown: false, lane: target.lane, confirmed: false, acc: 0,
    };
  }

  private pickEnemy(list: ViewEnemy[], x: number, y: number): ViewEnemy | null {
    const pad = this.tuning()?.grabRadius ?? 30;
    let best: ViewEnemy | null = null;
    let bestD = Infinity;
    for (const e of list) {
      const def = ENEMIES[e.type];
      if (e.hidden || e.shield || !def.grabbable || e.type === 'yeti' || e.big || e.heldBy.length > 0 || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      const top = e.y - (e.crow ? 40 : def.height);
      const dx = Math.max(0, Math.abs(x - e.x) - def.radius);
      const dy = y < top ? top - y : y > e.y ? y - e.y : 0;
      const d = Math.hypot(dx, dy);
      const score = d + Math.abs(x - e.x) * 0.02; // same preference as the host
      if (d <= pad && score < bestD) { bestD = score; best = e; }
    }
    return best;
  }

  localRelease(vx: number, vy: number) {
    this.send({ k: 'release', x: this.handX, y: this.handY, vx, vy });
    this.projReleasedAt = performance.now();
    const t = this.tuning();
    const p = this.pred;
    this.pred = null;
    if (!p || !t) return;
    // The host starts the throw from hand plus grip offset, not from where the spring lagged to.
    p.x = Math.max(WORLD.gateX + 10, Math.min(this.wall() - 10, this.handX + p.offX));
    p.y = Math.min(this.handY + p.offY, WORLD.groundY + p.lane);
    // The same functions the host uses, so the prediction flies the same arc.
    const v = launchVelocity(vx, vy, t, throwFactor(p.mass, this.strength()));
    p.vx = v.vx; p.vy = v.vy;
    const lift = liftFlat(p.y, WORLD.groundY + p.lane, p.vx, p.vy);
    if (lift) { p.y = lift.y; p.vy = lift.vy; }
    p.thrown = true;
    p.confirmed = false;
    p.pressedAt = performance.now();
    this.thrown.push(p);
  }

  connection(): ConnectionState { return this.lost ? 'lost' : 'connected'; }
  pingMs() { return this.ping; }
  dispose() { this.link.close(); }
}
