// Recognises shaking from the pointer's path: enough reversals of direction, far enough apart, in a short time.
// Pure and free of Phaser and the DOM, so it can be unit tested; numbers come from BEHAVIOUR.kegShake.
import { BEHAVIOUR } from '../config/enemies';

export interface ShakeRule {
  /** Reversals of direction needed. */
  reversals: number;
  /** World pixels the pointer must travel between two reversals. */
  minTravel: number;
  /** All reversals must fall within this many seconds. */
  windowSeconds: number;
}

export interface ShakeSample { t: number; x: number; y: number }

/**
 * Counts the reversals of direction along one axis within the samples, oldest first, `t` in
 * milliseconds. A reversal only counts once the pointer has travelled `minTravel` in the old direction
 * since the last one, so trembling does not shake anything loose. Returns the times of the reversals.
 */
function reversalsOnAxis(samples: readonly ShakeSample[], axis: 'x' | 'y', minTravel: number): number[] {
  const out: number[] = [];
  if (samples.length < 2) return out;
  let dir = 0;
  // The turning point of the current stroke, and the furthest point reached in its direction.
  let anchor = samples[0][axis];
  let extreme = anchor;
  let extremeT = samples[0].t;
  for (let i = 1; i < samples.length; i++) {
    const v = samples[i][axis];
    const t = samples[i].t;
    if (dir === 0) {
      if (Math.abs(v - anchor) >= minTravel) { dir = Math.sign(v - anchor); extreme = v; extremeT = t; }
      continue;
    }
    if ((v - extreme) * dir > 0) { extreme = v; extremeT = t; continue; }
    // Moving back: a reversal once the stroke was long enough and the way back has begun for real.
    if (Math.abs(extreme - anchor) >= minTravel && Math.abs(v - extreme) >= minTravel) {
      out.push(extremeT);
      anchor = extreme;
      dir = -dir;
      extreme = v;
      extremeT = t;
    }
  }
  return out;
}

/** Most reversals on either axis that fit in the last `windowSeconds` before `now` (ms). */
export function countReversals(samples: readonly ShakeSample[], now: number, rule: ShakeRule = BEHAVIOUR.kegShake): number {
  const from = now - rule.windowSeconds * 1000;
  const recent = samples.filter((s) => s.t >= from);
  const x = reversalsOnAxis(recent, 'x', rule.minTravel).length;
  const y = reversalsOnAxis(recent, 'y', rule.minTravel).length;
  return Math.max(x, y);
}

/** True when the samples show a shake strong enough to loosen a keg. */
export function isShake(samples: readonly ShakeSample[], now: number, rule: ShakeRule = BEHAVIOUR.kegShake): boolean {
  return countReversals(samples, now, rule) >= rule.reversals;
}

/**
 * Follows one held raider: feed it pointer samples while the hand holds a keg, read `progress` for
 * the feedback, and `fired` tells once per hold that the shake is complete.
 */
export class ShakeDetector {
  private samples: ShakeSample[] = [];
  private done = false;
  /** Reversals counted so far in the window. */
  count = 0;

  constructor(private rule: ShakeRule = BEHAVIOUR.kegShake) {}

  /** Starts over, e.g. when a new raider is grabbed or let go. */
  reset() { this.samples = []; this.done = false; this.count = 0; }

  /** Adds a sample (`t` in ms). Returns true exactly once, the moment the shake is complete. */
  add(t: number, x: number, y: number): boolean {
    const last = this.samples[this.samples.length - 1];
    if (last && last.t === t && last.x === x && last.y === y) return false;
    this.samples.push({ t, x, y });
    const from = t - this.rule.windowSeconds * 1000;
    while (this.samples.length > 0 && this.samples[0].t < from) this.samples.shift();
    this.count = countReversals(this.samples, t, this.rule);
    if (!this.done && this.count >= this.rule.reversals) { this.done = true; return true; }
    return false;
  }

  /** 0 to 1: how close the shake is to loosening the keg. */
  get progress() { return Math.min(1, this.count / this.rule.reversals); }

  get fired() { return this.done; }
}
