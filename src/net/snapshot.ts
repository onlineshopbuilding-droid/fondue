/**
 * The picture of one frame (`ViewState`) and its compact form for the network.
 * Host and guest both draw from a decoded snapshot, so what is missing here is missing for everyone.
 */
import { ENEMY_TYPES, type EnemyType } from '../config/enemies';
import type { EnemyState, Phase, ProjectileKind, SimState, Zone } from '../sim/types';

/** What the renderer needs to draw one frame. The host and the guest both produce this. */
export interface ViewEnemy {
  id: number;
  type: EnemyType;
  st: EnemyState;
  x: number;
  y: number;
  rot: number;
  lane: number;
  hidden: boolean;
  shield: boolean;
  /** A Keg Hauler that still carries its keg. */
  armed: boolean;
  crow: boolean;
  frozen: boolean;
  /** An oversized raider of a boss wave. */
  big: boolean;
  /** Who holds it: empty for nobody. */
  heldBy: number[];
  hpFrac: number;
}

export interface ViewProjectile {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  rot: number;
  size: number;
  heldBy: number;
}

export interface ViewHand {
  x: number;
  y: number;
  down: boolean;
  holding: number;
  holdingProj: number;
  connected: boolean;
}

export type ViewZone = Pick<Zone, 'id' | 'kind' | 'x' | 'halfWidth' | 't' | 'dur'>;

export interface ViewState {
  tick: number;
  phase: Phase;
  paused: boolean;
  /** Everything stands still for the tutorial's gesture. */
  hold: boolean;
  /** Current wave, seconds since it began, seconds since the level started. */
  wave: number;
  waveT: number;
  runT: number;
  /** Gold and Raider Crests earned in this run. */
  gold: number;
  crests: number;
  gateHp: number;
  gateMax: number;
  /** Per slot: seconds until ready, and the full reload time of the last shot. */
  cooldowns: number[];
  cooldownMax: number[];
  /** Seconds until the eagle hook is free. */
  perchBusy: number;
  /** Seconds until the cauldron is free, and the length of this melt. */
  potBusy: number;
  potMax: number;
  /** Seconds the Golden Fondue and the Ember Beacon still last. */
  goldRushT: number;
  beaconT: number;
  enemies: ViewEnemy[];
  projectiles: ViewProjectile[];
  zones: ViewZone[];
  hands: ViewHand[];
}

const STATES: EnemyState[] = ['walk', 'attack', 'hop', 'float', 'held', 'air', 'stun', 'frozen', 'hooked', 'cooking', 'flee'];
const KINDS: ProjectileKind[] = ['bomb', 'stone', 'bolt', 'wheel', 'comet', 'slab', 'roofBolt', 'shell', 'frostShell', 'fireShell', 'snowball', 'pinecone', 'hornet'];
const PHASES: Phase[] = ['banner', 'battle', 'defeat', 'gameover', 'runWon'];
const ZONES: Zone['kind'][] = ['fire', 'cheese', 'snow', 'hotCheese'];

const F_HIDDEN = 1;
const F_SHIELD = 2;
const F_ARMED = 4;
const F_CROW = 8;
const F_BIG = 16;
const F_FROZEN = 32;

/** Compact wire form: arrays of small numbers, so JSON stays short. */
export interface WireSnapshot {
  t: number;
  ph: number;
  pa: number;
  w: number;
  wt: number;
  rt: number;
  g: number;
  c: number;
  hp: number;
  hm: number;
  cd: number[];
  cm: number[];
  pb: number;
  pt: number;
  pm: number;
  gr: number;
  bt: number;
  e: number[][];
  q: number[][];
  z: number[][];
  h: number[][];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function encodeSnapshot(s: SimState): WireSnapshot {
  return {
    t: s.tick,
    ph: PHASES.indexOf(s.phase),
    pa: (s.paused ? 1 : 0) | (s.hold ? 2 : 0),
    w: s.wave,
    wt: r2(s.waveT),
    rt: r1(s.runT),
    g: s.gold,
    c: s.crests,
    hp: Math.ceil(s.gateHp),
    hm: s.gateMax,
    cd: s.cooldowns.map(r2),
    cm: s.cooldownMax.map(r2),
    pb: r2(s.perchBusy),
    pt: r2(s.potBusy),
    pm: r2(s.potMax),
    gr: r1(s.goldRushT),
    bt: r1(s.beaconT),
    e: s.enemies.map((e) => {
      const flags = (e.hidden ? F_HIDDEN : 0) | (e.shieldOn ? F_SHIELD : 0) | (e.armed ? F_ARMED : 0)
        | (e.crow ? F_CROW : 0) | (e.big ? F_BIG : 0) | (e.frozenHeld || e.st === 'frozen' ? F_FROZEN : 0);
      // Holders go last and take as many entries as there are: two players with two hands each
      // can all hold the same raider, so the list must not be cut to a fixed length.
      return [
        e.id, ENEMY_TYPES.indexOf(e.type), STATES.indexOf(e.st), r1(e.x), r1(e.y), r2(e.rot), Math.round(e.lane), flags,
        r2(e.hp / e.maxHp), ...e.heldBy,
      ];
    }),
    q: s.projectiles.map((q) => [q.id, KINDS.indexOf(q.kind), r1(q.x), r1(q.y), r2(q.rot), r1(q.size), q.heldBy]),
    z: s.zones.map((z) => [z.id, ZONES.indexOf(z.kind), r1(z.x), r1(z.halfWidth), r2(z.t), r2(z.dur)]),
    h: s.hands.map((h) => [r1(h.x), r1(h.y), h.down ? 1 : 0, h.holding, h.holdingProj, h.connected ? 1 : 0]),
  };
}

export function decodeSnapshot(w: WireSnapshot): ViewState {
  return {
    tick: w.t,
    phase: PHASES[w.ph],
    paused: (w.pa & 1) !== 0,
    hold: (w.pa & 2) !== 0,
    wave: w.w,
    waveT: w.wt,
    runT: w.rt,
    gold: w.g,
    crests: w.c,
    gateHp: w.hp,
    gateMax: w.hm,
    cooldowns: w.cd,
    cooldownMax: w.cm,
    perchBusy: w.pb,
    potBusy: w.pt,
    potMax: w.pm,
    goldRushT: w.gr,
    beaconT: w.bt,
    enemies: w.e.map((a) => ({
      id: a[0], type: ENEMY_TYPES[a[1]], st: STATES[a[2]], x: a[3], y: a[4], rot: a[5], lane: a[6],
      hidden: (a[7] & F_HIDDEN) !== 0, shield: (a[7] & F_SHIELD) !== 0, armed: (a[7] & F_ARMED) !== 0,
      crow: (a[7] & F_CROW) !== 0, big: (a[7] & F_BIG) !== 0, frozen: (a[7] & F_FROZEN) !== 0,
      hpFrac: a[8], heldBy: a.slice(9),
    })),
    projectiles: w.q.map((a) => ({
      id: a[0], kind: KINDS[a[1]], x: a[2], y: a[3], rot: a[4], size: a[5], heldBy: a[6],
    })),
    zones: w.z.map((a) => ({ id: a[0], kind: ZONES[a[1]], x: a[2], halfWidth: a[3], t: a[4], dur: a[5] })),
    hands: w.h.map((a) => ({ x: a[0], y: a[1], down: a[2] === 1, holding: a[3], holdingProj: a[4], connected: a[5] === 1 })),
  };
}

/** Linear interpolation between two views for smooth guest rendering. */
export function interpolateViews(a: ViewState, b: ViewState, f: number): ViewState {
  const lerp = (x: number, y: number) => x + (y - x) * f;
  const prevE = new Map(a.enemies.map((e) => [e.id, e]));
  const prevQ = new Map(a.projectiles.map((q) => [q.id, q]));
  return {
    ...b,
    waveT: lerp(a.waveT, b.waveT),
    runT: lerp(a.runT, b.runT),
    enemies: b.enemies.map((e) => {
      const p = prevE.get(e.id);
      if (!p) return e;
      return { ...e, x: lerp(p.x, e.x), y: lerp(p.y, e.y), rot: lerp(p.rot, e.rot) };
    }),
    projectiles: b.projectiles.map((q) => {
      const p = prevQ.get(q.id);
      if (!p) return q;
      return { ...q, x: lerp(p.x, q.x), y: lerp(p.y, q.y), rot: lerp(p.rot, q.rot) };
    }),
    hands: b.hands.map((h, i) => (a.hands[i] ? { ...h, x: lerp(a.hands[i].x, h.x), y: lerp(a.hands[i].y, h.y) } : h)),
  };
}
