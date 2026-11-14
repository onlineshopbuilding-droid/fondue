// The game as one player's machine sees it: solo, the co-op host that runs the simulation, or the guest that follows it.
// Rendering and UI only talk to a Session; the network messages stay in here.
import { ENEMIES } from '../config/enemies';
import { DT, WORLD, fieldWall } from '../config/field';
import type { ClientCommand, NetMessage } from '../net/protocol';
import { PlayoutBuffer } from '../net/interp';
import { decodeSnapshot, encodeSnapshot, type ViewEnemy, type ViewState } from '../net/snapshot';
import type { Transport } from '../net/transport';
import { secondHandSimulated } from '../config/flags';
import { followFactor, grabBonus, handIndex, handStrength, hasPermanentSecondHand, launchVelocity, liftFlat, massOfType, springStep, throwFactor } from '../sim/physics';
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
  /** `hand` 1 is this player's second hand (C9); without it the first hand. */
  setHand(x: number, y: number, hand?: number): void;
  /** Called by the input layer for instant local feedback. */
  localPress(x: number, y: number, hand?: number): void;
  localRelease(vx: number, vy: number, hand?: number): void;
  /** This player may grab with a second finger right now (hand tier 7, Helping Hand, or the laptop switch). */
  secondHandReady(): boolean;
  /** Index of this player's hand in `view().hands`: 0 = first, 1 = second hand. */
  handSlot(hand: number): number;
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
  private lastSnapStep = 0;

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
    }
    if (steps === MAX_CATCHUP_TICKS) this.acc = 0;
    this.collect();
    // One snapshot per frame at most: a slow frame that ran several steps sends only the newest state,
    // not a bunch of pictures that arrive together (the guest places them on the host clock anyway).
    if (this.link && this.stepCounter - this.lastSnapStep >= SNAPSHOT_EVERY_STEPS) {
      this.lastSnapStep = this.stepCounter;
      this.broadcast();
    }
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
  }

  private second = { x: 0, y: 0 };

  setHand(x: number, y: number, hand = 0) {
    if (hand === 0) { this.sim.setHand(0, x, y); return; }
    this.second = { x, y };
    this.sim.command({ k: 'move', p: 0, hand, x, y });
  }
  localPress(x: number, y: number, hand = 0) { this.send(hand === 0 ? { k: 'press', x, y } : { k: 'press', x, y, hand }); }
  localRelease(vx: number, vy: number, hand = 0) {
    const h = this.sim.s.hands[this.sim.handOf(0, hand)] ?? (hand === 0 ? undefined : this.second);
    if (!h) return;
    this.send(hand === 0 ? { k: 'release', x: h.x, y: h.y, vx, vy } : { k: 'release', x: h.x, y: h.y, vx, vy, hand });
  }
  secondHandReady(): boolean { return this.sim.ctx.hands.secondHandReady(0); }
  handSlot(hand: number): number { return this.sim.handOf(0, hand); }

  connection(): ConnectionState {
    if (this.role === 'solo') return 'none';
    return this.link ? 'connected' : this.linkLost ? 'lost' : 'none';
  }
  pingMs() { return this.ping; }
  dispose() { this.link?.close(); this.link = null; }
}

// The guest draws on the host's clock a self-adjusting delay behind it (src/net/interp.ts, PlayoutBuffer).

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

/** Events are heard as late as the picture runs behind (the playout delay), so they land together with it. */


/** Shows what the host sends and adds local prediction so that throwing feels immediate. */
export class GuestSession implements Session {
  readonly role = 'guest' as const;
  readonly me = 1;
  private buffer: Timed[] = [];
  private playout = new PlayoutBuffer();
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
  /** Where this player's hands are (index 0 = first hand, 1 = second hand, C9), and whether each is down. */
  private hx = [WORLD.width / 2, -200];
  private hy = [WORLD.height / 2, -200];
  private down = [false, false];
  /** Bumped when Helping Hand lends a second hand: until then (ms) a second finger may grab. */
  private helperUntil = 0;
  private latest: ViewState | null = null;
  /** The raider each hand is predicted to hold. */
  private preds: (Prediction | null)[] = [null, null];
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
        this.playout.push(view, performance.now());
        break;
      }
      case 'ev': {
        const at = performance.now() + this.playout.delayMs;
        for (const ev of m.l) this.events.push({ at, ev });
        break;
      }
      case 'm': this.curMeta = m.m; break;
      case 'start':
        this.buffer = [];
        this.playout.reset();
        this.curMeta = null;
        this.preds = [null, null];
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
      this.link.send({ k: 'h', x: Math.round(this.hx[0] * 10) / 10, y: Math.round(this.hy[0] * 10) / 10 });
      // The second hand travels as a command, only while its finger is down.
      if (this.down[1]) this.send({ k: 'move', hand: 1, x: Math.round(this.hx[1] * 10) / 10, y: Math.round(this.hy[1] * 10) / 10 });
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
    return this.playout.sample(performance.now());
  }

  private tuning() { return this.curMeta?.tuning; }

  private wall() { return fieldWall(this.curMeta?.fieldW ?? WORLD.width); }

  /** Number of a hand of mine in the host's numbering (see `handIndex`). */
  handSlot(hand: number): number { return handIndex(this.me, hand, this.curMeta?.names.length ?? 2); }

  private stepPrediction(dt: number) {
    const t = this.tuning();
    if (!t) return;
    const newest = this.buffer[this.buffer.length - 1]?.view;
    for (let i = 0; i < this.preds.length; i++) {
      const p = this.preds[i];
      const mine = this.handSlot(i);
      if (p && newest) {
        const auth = newest.enemies.find((e) => e.id === p.id);
        if (auth && auth.heldBy.includes(mine)) p.confirmed = true;
        // The host said no, someone else has it, or the enemy died in the meantime.
        const giveUp = performance.now() - p.pressedAt > 450 + this.ping;
        const takenByOther = !!auth && auth.heldBy.length > 0 && !auth.heldBy.includes(mine);
        if (!auth || takenByOther || (!p.confirmed && giveUp) || (p.confirmed && !auth.heldBy.includes(mine))) this.preds[i] = null;
      }
      const q = this.preds[i];
      if (!q) continue;
      // Fixed steps like the host's: a spring integrated with long frames blows up.
      q.acc += Math.min(dt, 0.1);
      while (q.acc >= DT) {
        q.acc -= DT;
        springStep(q, this.hx[i] + q.offX, this.hy[i] + q.offY, t.holdSpring * followFactor(q.mass, this.strength(i)), DT);
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
    const slots = [this.handSlot(0), this.handSlot(1)];
    const hands = v.hands.map((h, i) => {
      const k = slots.indexOf(i);
      return k >= 0 ? { ...h, x: this.hx[k], y: this.hy[k] } : h;
    });
    const override = new Map<number, { p: Prediction; hand: number }>();
    this.preds.forEach((p, k) => { if (p) override.set(p.id, { p, hand: slots[k] }); });
    for (const b of this.thrown) override.set(b.id, { p: b, hand: -1 });
    const enemies = override.size === 0 ? v.enemies : v.enemies.map((e) => {
      const o = override.get(e.id);
      if (!o) return e;
      const p = o.p;
      // Keep every other holder the host reports (up to four hands), and add my predicted one.
      const heldBy = p.thrown ? [] : e.heldBy.includes(o.hand) ? e.heldBy : [...e.heldBy, o.hand];
      return { ...e, x: p.x, y: p.y, st: p.thrown ? 'air' as const : 'held' as const, heldBy, rot: e.rot };
    });
    const justLetGo = performance.now() - this.projReleasedAt < 500;
    const projectiles = v.projectiles.map((q) => {
      const k = slots.indexOf(q.heldBy);
      return k >= 0 && !justLetGo ? { ...q, x: this.hx[k], y: this.hy[k] } : q;
    });
    return { ...v, hands, enemies, projectiles };
  }

  meta() { return this.curMeta; }
  drainEvents() {
    const now = performance.now();
    let n = 0;
    while (n < this.events.length && this.events[n].at <= now) n++;
    const out = this.events.splice(0, n).map((q) => q.ev);
    for (const ev of out) if (ev.e === 'extraHand') this.helperUntil = now + ev.seconds * 1000;
    return out;
  }

  send(c: ClientCommand) { this.link.send({ k: 'c', c }); }

  private myTier(): number { return this.curMeta?.loadout.handTier[this.me] ?? 1; }

  /** Strength of one of this player's hands, as the host's rules give it (a lent hand counts as a full one here). */
  private strength(_hand = 0): number { return handStrength(this.myTier()); }

  secondHandReady(): boolean {
    return hasPermanentSecondHand(this.myTier()) || secondHandSimulated(this.curMeta?.flags) || performance.now() < this.helperUntil;
  }

  setHand(x: number, y: number, hand = 0) { this.hx[hand] = x; this.hy[hand] = y; }

  localPress(x: number, y: number, hand = 0) {
    if (hand > 0 && !this.secondHandReady()) return;
    this.down[hand] = true;
    this.hx[hand] = x; this.hy[hand] = y;
    if (hand > 0) this.send({ k: 'move', hand, x, y });
    this.send(hand === 0 ? { k: 'press', x, y } : { k: 'press', x, y, hand });
    const v = this.latest;
    if (!v || v.phase !== 'battle') return;
    // Same order as the host: a bomb within reach is taken before any enemy.
    const pad = (this.tuning()?.grabRadius ?? 30) * 0.5 + 44;
    if (v.projectiles.some((q) => q.kind === 'bomb' && q.heldBy < 0 && Math.hypot(q.x - x, q.y - y) < pad)) return;
    const other = this.preds[1 - hand]?.id ?? -1;
    const target = this.pickEnemy(v.enemies.filter((e) => e.id !== other), x, y);
    if (!target) return;
    const def = ENEMIES[target.type];
    this.preds[hand] = {
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
      if (d <= pad + grabBonus(e.type, e.st) && score < bestD) { bestD = score; best = e; }
    }
    return best;
  }

  localRelease(vx: number, vy: number, hand = 0) {
    if (hand > 0 && !this.down[hand]) return;
    this.down[hand] = false;
    const hx = this.hx[hand];
    const hy = this.hy[hand];
    this.send(hand === 0 ? { k: 'release', x: hx, y: hy, vx, vy } : { k: 'release', x: hx, y: hy, vx, vy, hand });
    this.projReleasedAt = performance.now();
    const t = this.tuning();
    const p = this.preds[hand];
    this.preds[hand] = null;
    if (!p || !t) return;
    // The host starts the throw from hand plus grip offset, not from where the spring lagged to.
    p.x = Math.max(WORLD.gateX + 10, Math.min(this.wall() - 10, hx + p.offX));
    p.y = Math.min(hy + p.offY, WORLD.groundY + p.lane);
    // The same functions the host uses, so the prediction flies the same arc.
    const v = launchVelocity(vx, vy, t, throwFactor(p.mass, this.strength(hand)));
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
