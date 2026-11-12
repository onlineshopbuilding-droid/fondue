/**
 * The timing of the first minutes, without any drawing: when the King walks in and what he says,
 * when the prelude freezes for the gesture, when the first throw counts, and the one-time hint for
 * throwing into the pot on day 2 of level 1. `tutorialView.ts` draws what these classes decide.
 */
import { WORLD } from '../config/field';
import type { SimEvent } from '../sim/types';

export const GUIDE = {
  /** Seconds the King takes to walk in or out. */
  walk: 0.9,
  /** Seconds each prelude line stays in the bubble. */
  lineSeconds: 2.1,
  /** A release at least this fast counts as a throw (world units per second). */
  flingSpeed: 550,
  /** A raider let go at least this far above the road counts as well: the fall does the rest. */
  liftHeight: 150,
  /** Seconds the King praises the first throw before he walks off. */
  praiseSeconds: 2.4,
  /** The raider for the gesture walks between these x: past the gate, and on screen. */
  targetMinX: WORLD.gateX + 240,
  targetInsetRight: 320,
  /** Without any raider in reach the freeze waits this long before giving up on it. */
  maxWaitSeconds: 14,
} as const;

export const POT_HINT = {
  /** The King's sentence stays this long. */
  lineSeconds: 4.6,
  /** The arrow to the pot stays at most this long, or until a raider lands in the pot. */
  arrowSeconds: 14,
} as const;

export type GuideStage = 'intro' | 'show' | 'try' | 'praise' | 'done';

/** What the guide needs to know of a raider. */
export interface GuideEnemy { id: number; x: number; y: number; st: string; heldBy: number[]; hidden: boolean }

export interface GuideFrame {
  dt: number;
  /** The fight is on (not the day banner, not the end). */
  battle: boolean;
  enemies: GuideEnemy[];
  /** Simulation events of this frame. */
  events: SimEvent[];
  /** My player index. */
  me: number;
  fieldW: number;
}

/** How far the King has walked in: 0 off screen, 1 at his place; for a timeline of in, stay, out. */
export function kingSlide(t: number, stayUntil: number, walk: number = GUIDE.walk): number {
  if (t < 0) return 0;
  if (t < walk) return t / walk;
  if (t < stayUntil) return 1;
  return Math.max(0, 1 - (t - stayUntil) / walk);
}

/**
 * True when my hand did what the lesson asks: let a raider go fast, or high enough that the fall
 * does the rest, or one of my throws just landed hard.
 */
export function threwThisFrame(events: SimEvent[], me: number): boolean {
  return events.some((e) =>
    (e.e === 'release' && e.p === me && (e.speed >= GUIDE.flingSpeed || e.y <= WORLD.groundY - GUIDE.liftHeight)) ||
    (e.e === 'death' && e.p === me && e.cause === 'impact'));
}

/**
 * The prelude: the King walks in and says his lines while the first raiders come, then the picture
 * freezes and a hand shows the gesture on one raider. The player's own grab lets the world run
 * again; the first real throw ends the lesson, and the King praises it and walks off.
 */
export class PreludeGuide {
  stage: GuideStage = 'intro';
  /** Seconds in the current stage. */
  t = 0;
  /** The raider the gesture is shown on, -1 for none. */
  target = -1;
  private waited = 0;

  constructor(private readonly lines: readonly string[], private readonly praise: string, private readonly hints: { grab: string; fling: string }) {}

  /** The simulation should stand still: the gesture is on show. */
  get hold(): boolean { return this.stage === 'show'; }

  private go(stage: GuideStage) { this.stage = stage; this.t = 0; }

  update(f: GuideFrame) {
    if (this.stage === 'done') return;
    if (!f.battle) {
      // The day ended (or has not begun): nothing to teach any more once it has begun.
      if (this.stage !== 'intro') this.go('done');
      return;
    }
    this.t += f.dt;
    const threw = threwThisFrame(f.events, f.me);
    const grabbed = f.events.some((e) => e.e === 'grab' && e.p === f.me);
    switch (this.stage) {
      case 'intro':
        if (threw) { this.go('praise'); return; }
        if (grabbed) { this.go('try'); return; }
        if (this.t >= this.introSeconds()) this.showOn(f);
        break;
      case 'show':
        if (grabbed) { this.go('try'); return; }
        if (threw) { this.go('praise'); return; }
        // Frozen raiders do not move, but a raider can still be gone (a weapon, a blast).
        if (!f.enemies.some((e) => e.id === this.target)) this.showOn(f);
        break;
      case 'try': {
        if (threw) { this.go('praise'); return; }
        const holding = f.enemies.some((e) => e.heldBy.includes(f.me));
        // Let go without a real throw: show the gesture once more.
        if (!holding && f.events.some((e) => e.e === 'release' && e.p === f.me)) this.showOn(f);
        break;
      }
      case 'praise':
        if (this.t >= GUIDE.praiseSeconds + GUIDE.walk) this.go('done');
        break;
    }
  }

  /** Picks the raider for the gesture and freezes; without one in reach it waits, then lets the player be. */
  private showOn(f: GuideFrame) {
    const id = pickTarget(f.enemies, f.fieldW);
    if (id >= 0) {
      this.target = id;
      this.waited = 0;
      if (this.stage !== 'show') this.go('show');
      return;
    }
    this.waited += f.dt;
    if (this.stage === 'show') this.go('try');
    if (this.waited > GUIDE.maxWaitSeconds) this.go('done');
  }

  introSeconds(): number { return GUIDE.walk + this.lines.length * GUIDE.lineSeconds; }

  /** What the King says right now, or null for no bubble. */
  kingLine(): string | null {
    if (this.stage === 'intro') {
      if (this.t < GUIDE.walk * 0.6) return null;
      const i = Math.min(this.lines.length - 1, Math.floor((this.t - GUIDE.walk * 0.6) / GUIDE.lineSeconds));
      return this.lines[i] ?? null;
    }
    if (this.stage === 'praise' && this.t < GUIDE.praiseSeconds) return this.praise;
    return null;
  }

  /** How far the King has walked in, 0 to 1. */
  kingIn(): number {
    switch (this.stage) {
      case 'intro': return kingSlide(this.t, Infinity);
      case 'show': case 'try': return 1;
      case 'praise': return kingSlide(this.t + GUIDE.walk, GUIDE.praiseSeconds + GUIDE.walk);
      default: return 0;
    }
  }

  /** The short line next to the gesture, or null. */
  caption(): string | null {
    if (this.stage === 'show') return this.hints.grab;
    if (this.stage === 'try') return this.hints.fling;
    return null;
  }
}

/** The raider closest to the gate that walks on screen, free and visible; -1 if there is none. */
export function pickTarget(enemies: GuideEnemy[], fieldW: number): number {
  let best = -1;
  let bestX = Infinity;
  for (const e of enemies) {
    if (e.hidden || e.heldBy.length > 0 || (e.st !== 'walk' && e.st !== 'attack')) continue;
    if (e.x < GUIDE.targetMinX || e.x > fieldW - GUIDE.targetInsetRight) continue;
    if (e.x < bestX) { bestX = e.x; best = e.id; }
  }
  return best;
}

/**
 * Day 2 of level 1: the King says how the pot works, and an arrow shows the way from a raider to
 * the pot until the first raider lands in it or some seconds have passed. Shown once per day.
 */
export class PotHint {
  t = 0;
  landed = false;

  constructor(readonly text: string) {}

  update(dt: number, events: SimEvent[]) {
    this.t += dt;
    if (events.some((e) => e.e === 'splash' || (e.e === 'death' && e.cause === 'cauldron'))) this.landed = true;
  }

  get arrow(): boolean { return !this.landed && this.t < POT_HINT.arrowSeconds; }
  kingLine(): string | null { return this.t >= GUIDE.walk * 0.6 && this.t < POT_HINT.lineSeconds ? this.text : null; }
  kingIn(): number { return kingSlide(this.t, POT_HINT.lineSeconds); }
  get over(): boolean { return !this.arrow && this.t > POT_HINT.lineSeconds + GUIDE.walk; }
}
