import { describe, expect, it } from 'vitest';
import { PointerTracker } from '../../src/input/pointer';

function flick(rateHz: number, pxPerSec: number, ms: number) {
  const t = new PointerTracker();
  const step = 1000 / rateHz;
  let now = 0;
  for (let time = 0; time <= ms; time += step) {
    now = time;
    t.add(time, 500, 500 - (pxPerSec * time) / 1000);
  }
  // The release event reports the same point as the last move.
  t.addRelease(now + 1, 500, 500 - (pxPerSec * now) / 1000);
  return t.velocity(now + 1, 80);
}

describe('release velocity', () => {
  for (const hz of [60, 125, 1000]) {
    it(`keeps the speed of a flick at ${hz} Hz`, () => {
      const v = flick(hz, 3000, 100);
      expect(Math.abs(v.vy)).toBeGreaterThan(3000 * 0.97);
      expect(Math.abs(v.vy)).toBeLessThan(3000 * 1.03);
    });
  }

  it('is zero when the pointer rested before release', () => {
    const t = new PointerTracker();
    t.add(0, 100, 100);
    t.add(10, 200, 100);
    expect(t.velocity(300, 80)).toEqual({ vx: 0, vy: 0 });
  });
});
