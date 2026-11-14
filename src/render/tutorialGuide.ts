/**
 * The timing of the first minutes, without any drawing: when the King walks in and what he says,
 * when the prelude freezes for the gesture, when the first throw counts, the Rolling Wheel lesson
 * that follows it, and the one-time King hint a level can give in a wave (with an arrow to the pot).
 * `tutorialView.ts` draws what these classes decide.
 */
import { WORLD } from '../config/field';
import { GUIDE, POT_HINT } from '../config/tutorial';
import type { SimEvent } from '../sim/types';

/** The timing numbers live in src/config/tutorial.ts; re-exported here for the tests and older imports. */
export { GUIDE, POT_HINT };

export type GuideStage = 'intro' | 'show' | 'try' | 'praise' | 'wheel' | 'wheelDone' | 'done';

/** What the guide needs to know of a raider. */
export interface GuideEnemy { id: number; x: number; y: number; st: string; heldBy: number[]; hidden: boolean }

export interface GuideFrame {
  dt: number;
  /** The fight is on (not the level banner, not the end). */
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

/** True when my tap fired the weapon in this slot in this frame. */
export function firedSlot(events: SimEvent[], me: number, slot: number): boolean {
  return events.some((e) => e.e === 'fire' && e.p === me && e.slot === slot);
}

/** The King's lines of the prelude besides the intro: the praise of the throw and the wheel lesson. */
export interface PreludeTexts { grab: string; fling: string; wheel?: string; wheelDone?: string }

/**
 * The prelude: the King walks in and says his lines while the first raiders come, then the picture
 * freezes and a hand shows the gesture on one raider. The player's own grab lets the world run
 * again; the first real throw ends that lesson and the King praises it. Then he shows the Rolling
 * Wheel on the wall (C4, D4): a pointer waits for the tap on it, he praises the roll and walks off.
 * Without wheel texts the lesson ends with the praise of the throw.
 */
export class PreludeGuide {
  stage: GuideStage = 'intro';
  /** Seconds in the current stage. */
  t = 0;
  /** The raider the gesture is shown on, -1 for none. */
  target = -1;
  private waited = 0;

  constructor(
    private readonly lines: readonly string[], private readonly praise: string, private readonly hints: PreludeTexts,
    private readonly wheelSlot = 0,
  ) {}

  /** The simulation should stand still: the gesture is on show. */
  get hold(): boolean { return this.stage === 'show'; }

  private go(stage: GuideStage) { this.stage = stage; this.t = 0; }

  update(f: GuideFrame) {
    if (this.stage === 'done') return;
    if (!f.battle) {
      // The fight ended (or has not begun): nothing to teach any more once it has begun.
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
        if (this.hints.wheel) { if (this.t >= GUIDE.praiseSeconds) this.go('wheel'); }
        else if (this.t >= GUIDE.praiseSeconds + GUIDE.walk) this.go('done');
        break;
      case 'wheel':
        if (firedSlot(f.events, f.me, this.wheelSlot)) { this.go('wheelDone'); return; }
        if (this.t >= GUIDE.wheelMaxSeconds) this.go('done');
        break;
      case 'wheelDone':
        if (this.t >= GUIDE.wheelPraiseSeconds + GUIDE.walk) this.go('done');
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
    if (this.stage === 'wheel') return this.hints.wheel ?? null;
    if (this.stage === 'wheelDone' && this.t < GUIDE.wheelPraiseSeconds) return this.hints.wheelDone ?? null;
    return null;
  }

  /** How far the King has walked in, 0 to 1. */
  kingIn(): number {
    switch (this.stage) {
      case 'intro': return kingSlide(this.t, Infinity);
      case 'show': case 'try': case 'wheel': return 1;
      // With a wheel lesson to come, the King stays after the praise.
      case 'praise': return this.hints.wheel ? 1 : kingSlide(this.t + GUIDE.walk, GUIDE.praiseSeconds + GUIDE.walk);
      case 'wheelDone': return kingSlide(this.t + GUIDE.walk, GUIDE.wheelPraiseSeconds + GUIDE.walk);
      default: return 0;
    }
  }

  /** The short line next to the gesture, or null. */
  caption(): string | null {
    if (this.stage === 'show') return this.hints.grab;
    if (this.stage === 'try') return this.hints.fling;
    return null;
  }

  /** The pointer at the wheel is on show. */
  get pointWheel(): boolean { return this.stage === 'wheel'; }
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
 * A King hint of a level wave (`hints` of the level): the King says how the pot works, and an arrow
 * shows the way from a raider to the pot until the first raider lands in it or some seconds have
 * passed. Shown once per such wave.
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
