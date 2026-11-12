import { describe, expect, it } from 'vitest';
import { perchX } from '../../src/config/field';
import { SLOTS } from '../../src/config/slots';
import { WEST_X } from '../../src/art/castle/westWing';
import { camAt, fightRect, hookAt, MARKET_LEFT, marketRect, MARKET_ZOOM, stepMarket } from '../../src/render/marketCamera';
import { computeView } from '../../src/render/viewport';

const SCREENS: [number, number][] = [[852, 393], [915, 412], [1280, 720]];

describe('market camera', () => {
  it('leaves the fight view untouched: the keep stays at the left edge', () => {
    for (const [w, h] of SCREENS) {
      const v = computeView(w, h);
      expect(camAt(v, 0)).toEqual(fightRect(v));
      expect(camAt(v, 0).x).toBe(0);
    }
  });

  it('comes closer to the keep and also shows its west wing', () => {
    for (const [w, h] of SCREENS) {
      const v = computeView(w, h);
      const m = marketRect(v);
      expect(m.w).toBeCloseTo(v.width / MARKET_ZOOM);
      expect(MARKET_ZOOM).toBeGreaterThan(1);
      expect(m.x).toBeLessThan(0);
      // The whole west wing and every slot are in sight, and the market view stays inside the drawn world.
      expect(m.x).toBeLessThanOrEqual(WEST_X + 20);
      expect(m.x).toBeGreaterThanOrEqual(MARKET_LEFT);
      for (const s of SLOTS) {
        expect(s.x).toBeGreaterThan(m.x);
        expect(s.x).toBeLessThan(m.x + m.w);
        expect(s.y).toBeGreaterThan(m.y);
        expect(s.y).toBeLessThan(m.y + m.h);
      }
    }
  });

  it('moves smoothly both ways in a short time', () => {
    const v = computeView(852, 393);
    let k = 0;
    let last = camAt(v, 0);
    let steps = 0;
    while (k < 1) {
      k = stepMarket(k, true, 1 / 60);
      const now = camAt(v, k);
      // No jump bigger than a few world units per frame.
      expect(Math.abs(now.x - last.x)).toBeLessThan(20);
      last = now;
      steps++;
    }
    expect(steps).toBeLessThan(60);
    expect(camAt(v, 1)).toEqual(marketRect(v));
    while (k > 0) k = stepMarket(k, false, 1 / 60);
    expect(camAt(v, k)).toEqual(fightRect(v));
  });

  it('hangs the eagle hook over the field in the fight and inside the market view in the market', () => {
    const v = computeView(852, 393);
    expect(hookAt(v, v.fieldW, 0).x).toBe(perchX(v.fieldW));
    const m = marketRect(v);
    const h = hookAt(v, v.fieldW, 1);
    expect(h.x).toBeGreaterThan(m.x + m.w / 2);
    expect(h.x).toBeLessThan(m.x + m.w);
    expect(h.top).toBeGreaterThan(m.y);
  });
});
