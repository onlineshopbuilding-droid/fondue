import { ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/world';
import type { Tuning } from '../config/tuning';
import type { Difficulty } from '../config/waves';
import type { ClientCommand, NetMessage } from '../net/protocol';
import { decodeSnapshot, encodeSnapshot, interpolateViews, type ViewEnemy, type ViewState } from '../net/snapshot';
import type { Transport } from '../net/transport';
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

const SNAPSHOT_EVERY_TICKS = 2; // 30 Hz
const MAX_CATCHUP_TICKS = 6;

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

  constructor(opts: { seed: number; difficulty: Difficulty; names: string[]; tuning: Tuning; coop: boolean }) {
    this.role = opts.coop ? 'host' : 'solo';
    this.sim = new Sim(opts);
  }

  /** Attaches the guest connection. Works mid-game for reconnects. */
  attach(link: Transport) {
    this.link = link;
    this.linkLost = false;
    this.lastMetaRev = -1;
    this.sim.setConnected(1, true);
    if (this.sim.s.paused && this.sim.s.meta.pausedBy === 'Connection lost') {
      this.sim.s.paused = false;
      this.sim.s.meta.pausedBy = null;
    }
    link.onMessage = (m) => this.onNet(m);
    link.onClose = () => this.onLinkLost();
  }

  private onLinkLost() {
    this.link = null;
    this.linkLost = true;
    this.sim.setConnected(1, false);
    this.sim.pauseForDisconnect('Connection lost');
  }

  /** The host decides to carry on without the guest. */
  continueAlone() {
    if (this.sim.s.meta.pausedBy === 'Connection lost') {
      this.sim.s.paused = false;
      this.sim.s.meta.pausedBy = null;
    }
    this.linkLost = false;
  }

  private onNet(m: NetMessage) {
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
      if (this.link && this.sim.s.tick % SNAPSHOT_EVERY_TICKS === 0) this.broadcast();
    }
    if (steps === MAX_CATCHUP_TICKS) this.acc = 0;
    this.collect();
    if (this.link) {
      if (this.netEvents.length > 0) this.broadcast();
      this.pingTimer += dtMs;
      if (this.pingTimer > 1000) { this.pingTimer = 0; this.link.send({ k: 'ping', t: performance.now() }); }
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
    if (this.netEvents.length > 0) {
      this.link.send({ k: 'ev', l: this.netEvents });
      this.netEvents = [];
    }
    this.link.send({ k: 's', s: encodeSnapshot(this.sim.s) });
  }

  view(): ViewState { return decodeSnapshot(encodeSnapshot(this.sim.s)); }
  meta(): Meta { return this.sim.s.meta; }
  drainEvents(): SimEvent[] { const e = this.events; this.events = []; return e; }

  send(c: ClientCommand) {
    this.sim.command({ ...c, p: 0 } as Command);
    this.collect();
    // Purchases and ready flags reach the guest even while the sim is idle.
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
  pressedAt: number;
  thrown: boolean;
  lane: number;
  confirmed: boolean;
}

/** Shows what the host sends and adds local prediction so that throwing feels immediate. */
export class GuestSession implements Session {
  readonly role = 'guest' as const;
  readonly me = 1;
  private buffer: Timed[] = [];
  private curMeta: Meta | null = null;
  private events: SimEvent[] = [];
  private lost = false;
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
    switch (m.k) {
      case 's': {
        const view = decodeSnapshot(m.s);
        this.buffer.push({ at: performance.now(), view });
        if (this.buffer.length > 40) this.buffer.shift();
        break;
      }
      case 'ev': this.events.push(...m.l); break;
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

  private stepPrediction(dt: number) {
    const t = this.tuning();
    if (!t) return;
    const newest = this.buffer[this.buffer.length - 1]?.view;
    const p = this.pred;
    if (p && newest) {
      const auth = newest.enemies.find((e) => e.id === p.id);
      if (auth && auth.heldBy.includes(this.me)) p.confirmed = true;
      // The host said no, or the enemy died in the meantime.
      const giveUp = performance.now() - p.pressedAt > 450 + this.ping;
      if (!auth || (!p.confirmed && giveUp) || (p.confirmed && !auth.heldBy.includes(this.me))) this.pred = null;
    }
    if (this.pred) {
      const q = this.pred;
      const k = t.holdSpring;
      const c = 2 * Math.sqrt(k) * 0.72;
      q.vx += (k * (this.handX + q.offX - q.x) - c * q.vx) * dt;
      q.vy += (k * (this.handY + q.offY - q.y) - c * q.vy) * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const ground = WORLD.groundY + q.lane;
      if (q.y > ground) { q.y = ground; q.vy = Math.min(0, q.vy); }
    }
    for (const b of this.thrown) {
      b.vy += t.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const ground = WORLD.groundY + b.lane;
      if (b.y > ground) { b.y = ground; b.vy = 0; b.vx = 0; }
    }
    if (this.thrown.length > 0 && newest) {
      this.thrown = this.thrown.filter((b) => {
        const auth = newest.enemies.find((e) => e.id === b.id);
        return auth?.st === 'air' && performance.now() - b.pressedAt < 6000;
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
    const projectiles = v.projectiles.map((q) => (q.heldBy === this.me ? { ...q, x: this.handX, y: this.handY } : q));
    return { ...v, hands, enemies, projectiles };
  }

  meta() { return this.curMeta; }
  drainEvents() { const e = this.events; this.events = []; return e; }
  send(c: ClientCommand) { this.link.send({ k: 'c', c }); }
  setHand(x: number, y: number) { this.handX = x; this.handY = y; }

  localPress(x: number, y: number) {
    this.send({ k: 'press', x, y });
    const v = this.latest;
    if (!v || v.phase !== 'battle') return;
    const me = v.hands[this.me];
    if (me && me.mode !== 'none') return;
    const target = this.pickEnemy(v.enemies, x, y);
    if (!target) return;
    const def = ENEMIES[target.type];
    this.pred = {
      id: target.id, x: target.x, y: target.y, vx: 0, vy: 0,
      offX: Math.max(-def.radius, Math.min(def.radius, target.x - x)),
      offY: Math.max(0, Math.min(def.height, target.y - y)),
      pressedAt: performance.now(), thrown: false, lane: target.lane, confirmed: false,
    };
  }

  private pickEnemy(list: ViewEnemy[], x: number, y: number): ViewEnemy | null {
    const pad = this.tuning()?.grabRadius ?? 30;
    let best: ViewEnemy | null = null;
    let bestD = Infinity;
    for (const e of list) {
      const def = ENEMIES[e.type];
      if (e.hidden || e.shield || !def.grabbable || e.type === 'yeti' || e.heldBy.length > 0 || e.st === 'hooked' || e.st === 'flee') continue;
      const top = e.y - (e.crow ? 40 : def.height);
      const dx = Math.max(0, Math.abs(x - e.x) - def.radius);
      const dy = y < top ? top - y : y > e.y ? y - e.y : 0;
      const d = Math.hypot(dx, dy);
      if (d <= pad && d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  localRelease(vx: number, vy: number) {
    this.send({ k: 'release', x: this.handX, y: this.handY, vx, vy });
    const t = this.tuning();
    const p = this.pred;
    this.pred = null;
    if (!p || !t) return;
    // Mirrors the host's throw clamp so the prediction flies the same arc.
    let ax = vx * t.throwMult;
    let ay = vy * t.throwMult;
    const sp = Math.hypot(ax, ay);
    if (sp > t.maxThrow) { ax *= t.maxThrow / sp; ay *= t.maxThrow / sp; }
    p.vx = ax; p.vy = ay;
    // Same low arc the host gives a flat throw from road height.
    const groundY = WORLD.groundY + p.lane;
    const flat = Math.abs(ax);
    if (groundY - p.y < 20 && flat > 250 && ay <= flat * 0.5 && ay >= -flat * 0.25) { p.y = groundY - 22; p.vy = -flat * 0.25; }
    p.thrown = true;
    p.pressedAt = performance.now();
    this.thrown.push(p);
  }

  connection(): ConnectionState { return this.lost ? 'lost' : 'connected'; }
  pingMs() { return this.ping; }
  dispose() { this.link.close(); }
}
