/**
 * Recognising a shake from the pointer's path (src/input/shake.ts): enough reversals, each stroke
 * long enough, all inside the time window. Uses its own rule so the test does not copy the table.
 */
import { describe, expect, it } from 'vitest';
import { ShakeDetector, countReversals, isShake, type ShakeRule, type ShakeSample } from '../../src/input/shake';

const RULE: ShakeRule = { reversals: 4, minTravel: 30, windowSeconds: 1 };

/** Back and forth along x: `strokes` strokes of `size` px, each taking `ms`, sampled every 10 ms. */
function wiggle(strokes: number, size: number, ms: number, t0 = 0, axis: 'x' | 'y' = 'x'): ShakeSample[] {
  const out: ShakeSample[] = [];
  const steps = Math.max(1, Math.round(ms / 10));
  let pos = 0;
  for (let s = 0; s < strokes; s++) {
    const dir = s % 2 === 0 ? 1 : -1;
    for (let i = 1; i <= steps; i++) {
      const v = pos + (dir * size * i) / steps;
      const t = t0 + (s * steps + i) * 10;
      out.push(axis === 'x' ? { t, x: v, y: 0 } : { t, x: 0, y: v });
    }
    pos += dir * size;
  }
  return out;
}

const feed = (d: ShakeDetector, samples: ShakeSample[]) => samples.map((s) => d.add(s.t, s.x, s.y));

describe('ShakeDetector', () => {
  it('fires exactly once when a quick, wide shake reaches the reversals', () => {
    const d = new ShakeDetector(RULE);
    const fired = feed(d, wiggle(6, 80, 100));
    expect(fired.filter(Boolean)).toHaveLength(1);
    expect(d.fired).toBe(true);
    expect(d.progress).toBe(1);
  });

  it('progress rises with every reversal before it fires', () => {
    const d = new ShakeDetector(RULE);
    const seen: number[] = [];
    for (const s of wiggle(4, 80, 100)) { d.add(s.t, s.x, s.y); seen.push(d.progress); }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(seen[seen.length - 1]).toBeGreaterThan(0);
    expect(d.fired).toBe(false);
  });

  it('trembling (strokes shorter than the least travel) never counts', () => {
    const d = new ShakeDetector(RULE);
    feed(d, wiggle(30, RULE.minTravel / 3, 40));
    expect(d.count).toBe(0);
    expect(d.fired).toBe(false);
  });

  it('a slow wave whose reversals do not fit into the window does not fire', () => {
    const d = new ShakeDetector(RULE);
    feed(d, wiggle(6, 80, 600));
    expect(d.fired).toBe(false);
  });

  it('works up and down as well as sideways', () => {
    const samples = wiggle(6, 80, 100, 0, 'y');
    expect(isShake(samples, samples[samples.length - 1].t, RULE)).toBe(true);
  });

  it('reset starts the count over and allows a new shake', () => {
    const d = new ShakeDetector(RULE);
    feed(d, wiggle(6, 80, 100));
    d.reset();
    expect(d.fired).toBe(false);
    expect(d.count).toBe(0);
    expect(feed(d, wiggle(6, 80, 100, 5000)).filter(Boolean)).toHaveLength(1);
  });

  it('a repeated identical sample changes nothing', () => {
    const d = new ShakeDetector(RULE);
    expect(d.add(10, 5, 5)).toBe(false);
    expect(d.add(10, 5, 5)).toBe(false);
    expect(countReversals([{ t: 10, x: 5, y: 5 }], 10, RULE)).toBe(0);
  });
});
