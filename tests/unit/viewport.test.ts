import { describe, expect, it } from 'vitest';
import { WORLD } from '../../src/config/world';
import { computeView, MAX_ASPECT } from '../../src/render/viewport';

describe('computeView', () => {
  it('leaves a 16:9 screen exactly as the world is', () => {
    const v = computeView(1280, 720);
    expect(v).toMatchObject({ width: WORLD.width, height: WORLD.height, offsetX: 0, offsetY: 0, cssPerUnit: 1, hudScale: 1, topScale: 1 });
  });

  it('shows more land on the left of a wide phone and keeps the right edge', () => {
    const v = computeView(852, 393);
    expect(v.height).toBe(WORLD.height);
    expect(v.width).toBeGreaterThan(WORLD.width);
    expect(v.offsetX).toBe(WORLD.width - v.width);
    expect(v.offsetY).toBe(0);
  });

  it('shows more sky above on a squarer tablet and keeps the bottom edge', () => {
    const v = computeView(1024, 768);
    expect(v.width).toBe(WORLD.width);
    expect(v.height).toBe(960);
    expect(v.offsetY).toBe(WORLD.height - 960);
    expect(v.offsetX).toBe(0);
  });

  it('never reveals more than the art covers on extreme shapes', () => {
    expect(computeView(5000, 500).width).toBeLessThanOrEqual(Math.ceil(720 * MAX_ASPECT));
    expect(computeView(393, 852).height).toBeLessThanOrEqual(960);
  });

  it('fills the screen exactly within the supported range', () => {
    for (const [w, h] of [[640, 360], [667, 375], [852, 393], [932, 430], [960, 400], [1024, 768]]) {
      const v = computeView(w, h);
      expect(v.width * v.cssPerUnit).toBeCloseTo(w, 0);
      expect(v.height * v.cssPerUnit).toBeCloseTo(h, 0);
    }
  });

  it('grows the weapon row until a finger can hit it', () => {
    for (const [w, h] of [[640, 320], [640, 360], [852, 393], [932, 430]]) {
      const v = computeView(w, h);
      expect(64 * v.hudScale * v.cssPerUnit).toBeGreaterThanOrEqual(44);
    }
    expect(computeView(1920, 1080).hudScale).toBe(1);
  });

  it('turns the safe area of a notch into world units', () => {
    const v = computeView(852, 393, { left: 59, right: 59, top: 0, bottom: 21 });
    expect(v.safeLeft).toBeCloseTo(59 / v.cssPerUnit, 5);
    expect(v.safeBottom).toBeCloseTo(21 / v.cssPerUnit, 5);
  });
});
