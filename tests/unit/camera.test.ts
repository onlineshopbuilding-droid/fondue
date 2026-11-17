import { describe, expect, it } from 'vitest';
import { WORLD, perchX } from '../../src/config/field';
import { SLOTS } from '../../src/config/slots';
import { ease, fightRect, hookAt } from '../../src/render/camera';
import { computeView } from '../../src/render/viewport';

const SCREENS: [number, number][] = [[852, 393], [915, 412], [1280, 720]];

// Replaces marketCamera.test.ts: the market view at the keep is gone with v0.3 (no market in a
// level); what stays is the fight view and the eagle hook over the far end of the field.
describe('fight camera', () => {
  it('keeps the keep at the left edge with every slot in sight', () => {
    for (const [w, h] of SCREENS) {
      const v = computeView(w, h);
      const r = fightRect(v);
      expect(r.x).toBe(0);
      expect(r.w).toBe(v.width);
      expect(r.h).toBe(v.height);
      for (const s of SLOTS) {
        expect(s.x).toBeGreaterThan(r.x);
        expect(s.x).toBeLessThan(r.x + r.w);
        expect(s.y).toBeGreaterThan(r.y);
        expect(s.y).toBeLessThan(r.y + r.h);
      }
    }
  });

  it('hangs the eagle hook over the far end of the field', () => {
    for (const [w, h] of SCREENS) {
      const v = computeView(w, h);
      const hook = hookAt(v.fieldW);
      expect(hook.x).toBe(perchX(v.fieldW));
      expect(hook.top).toBe(WORLD.perch.hookY - 112);
    }
  });

  it('eases from 0 to 1 without overshooting', () => {
    expect(ease(-1)).toBe(0);
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(1)).toBe(1);
    expect(ease(2)).toBe(1);
  });
});
