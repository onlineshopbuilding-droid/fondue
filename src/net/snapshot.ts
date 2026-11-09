import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../config/enemies';
import { WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import type { EnemyState, Flame, HandMode, Phase, ProjectileKind, SimState } from '../sim/types';

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
  armed: boolean;
  crow: boolean;
  fuse: boolean;
  frozen: boolean;
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
  charge: number;
}

export interface ViewHand {
  x: number;
  y: number;
  down: boolean;
  mode: HandMode;
  holding: number;
  holdingProj: number;
  connected: boolean;
}

export interface ViewState {
  tick: number;
  phase: Phase;
  paused: boolean;
  day: number;
  dayT: number;
  gold: number;
  offerings: number;
  gateHp: number;
  gateMax: number;
  cooldowns: Record<WeaponSlot, number>;
  cooldownMax: Record<WeaponSlot, number>;
  enemies: ViewEnemy[];
  projectiles: ViewProjectile[];
  flames: Flame[];
  hands: ViewHand[];
}

const STATES: EnemyState[] = ['walk', 'attack', 'hop', 'float', 'held', 'air', 'stun', 'frozen', 'hooked', 'flee'];
const KINDS: ProjectileKind[] = ['bomb', 'stone', 'bolt', 'wheel', 'comet', 'slab', 'roofBolt'];
const MODES: HandMode[] = ['none', 'stomper', 'comet', 'horn'];
const PHASES: Phase[] = ['banner', 'battle', 'victory', 'intermission', 'defeat', 'gameover'];

const F_HIDDEN = 1;
const F_SHIELD = 2;
const F_ARMED = 4;
const F_CROW = 8;
const F_FUSE = 16;
const F_FROZEN = 32;

/** Compact wire form: arrays of small numbers, so JSON stays short. */
export interface WireSnapshot {
  t: number;
  ph: number;
  pa: number;
  d: number;
  dt: number;
  g: number;
  o: number;
  hp: number;
  hm: number;
  cd: number[];
  cm: number[];
  e: number[][];
  q: number[][];
  f: number[][];
  h: number[][];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function encodeSnapshot(s: SimState): WireSnapshot {
  return {
    t: s.tick,
    ph: PHASES.indexOf(s.phase),
    pa: s.paused ? 1 : 0,
    d: s.day,
    dt: r2(s.dayT),
    g: s.gold,
    o: s.offerings,
    hp: Math.ceil(s.gateHp),
    hm: s.gateMax,
    cd: WEAPON_SLOTS.map((k) => r2(s.cooldowns[k])),
    cm: WEAPON_SLOTS.map((k) => r2(s.cooldownMax[k])),
    e: s.enemies.map((e) => {
      const flags = (e.hidden ? F_HIDDEN : 0) | (e.shieldOn ? F_SHIELD : 0) | (e.armed ? F_ARMED : 0)
        | (e.crow ? F_CROW : 0) | (e.kegFuse > 0 ? F_FUSE : 0) | (e.frozenHeld || e.st === 'frozen' ? F_FROZEN : 0);
      return [
        e.id, ENEMY_TYPES.indexOf(e.type), STATES.indexOf(e.st), r1(e.x), r1(e.y), r2(e.rot), Math.round(e.lane), flags,
        e.heldBy.length > 0 ? e.heldBy[0] : -1, e.heldBy.length > 1 ? e.heldBy[1] : -1,
        r2(e.hp / ENEMIES[e.type].hp),
      ];
    }),
    q: s.projectiles.map((q) => [q.id, KINDS.indexOf(q.kind), r1(q.x), r1(q.y), r2(q.rot), r1(q.size), q.heldBy, Math.round(q.charge)]),
    f: s.flames.map((f) => [f.id, r1(f.x), r1(f.halfWidth), r2(f.t), r2(f.dur)]),
    h: s.hands.map((h) => [r1(h.x), r1(h.y), h.down ? 1 : 0, MODES.indexOf(h.mode), h.holding, h.holdingProj, h.connected ? 1 : 0]),
  };
}

export function decodeSnapshot(w: WireSnapshot): ViewState {
  const toRecord = (a: number[]) =>
    Object.fromEntries(WEAPON_SLOTS.map((k, i) => [k, a[i]])) as Record<WeaponSlot, number>;
  return {
    tick: w.t,
    phase: PHASES[w.ph],
    paused: w.pa === 1,
    day: w.d,
    dayT: w.dt,
    gold: w.g,
    offerings: w.o,
    gateHp: w.hp,
    gateMax: w.hm,
    cooldowns: toRecord(w.cd),
    cooldownMax: toRecord(w.cm),
    enemies: w.e.map((a) => ({
      id: a[0], type: ENEMY_TYPES[a[1]], st: STATES[a[2]], x: a[3], y: a[4], rot: a[5], lane: a[6],
      hidden: (a[7] & F_HIDDEN) !== 0, shield: (a[7] & F_SHIELD) !== 0, armed: (a[7] & F_ARMED) !== 0,
      crow: (a[7] & F_CROW) !== 0, fuse: (a[7] & F_FUSE) !== 0, frozen: (a[7] & F_FROZEN) !== 0,
      heldBy: [a[8], a[9]].filter((p) => p >= 0), hpFrac: a[10],
    })),
    projectiles: w.q.map((a) => ({
      id: a[0], kind: KINDS[a[1]], x: a[2], y: a[3], rot: a[4], size: a[5], heldBy: a[6], charge: a[7],
    })),
    flames: w.f.map((a) => ({ id: a[0], x: a[1], halfWidth: a[2], t: a[3], dur: a[4] })),
    hands: w.h.map((a) => ({
      x: a[0], y: a[1], down: a[2] === 1, mode: MODES[a[3]], holding: a[4], holdingProj: a[5], connected: a[6] === 1,
    })),
  };
}

/** Linear interpolation between two views for smooth guest rendering. */
export function interpolateViews(a: ViewState, b: ViewState, f: number): ViewState {
  const lerp = (x: number, y: number) => x + (y - x) * f;
  const prevE = new Map(a.enemies.map((e) => [e.id, e]));
  const prevQ = new Map(a.projectiles.map((q) => [q.id, q]));
  return {
    ...b,
    dayT: lerp(a.dayT, b.dayT),
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
