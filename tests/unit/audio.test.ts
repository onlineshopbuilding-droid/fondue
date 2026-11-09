import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AudioEngine } from '../../src/audio/audio';
import { BAR_STEPS, SONG_BARS } from '../../src/audio/music';
import { SFX_RECIPES } from '../../src/audio/sfx';
import type { SfxName } from '../../src/audio/sfx';

const NAMES = Object.keys(SFX_RECIPES) as SfxName[];

describe('AudioEngine without AudioContext', () => {
  const scope = globalThis as { AudioContext?: unknown; webkitAudioContext?: unknown };
  let saved: unknown;

  beforeEach(() => {
    saved = scope.AudioContext;
    delete scope.AudioContext;
    delete scope.webkitAudioContext;
  });

  afterEach(() => {
    if (saved !== undefined) scope.AudioContext = saved;
  });

  it('is a silent no-op on every method', () => {
    const engine = new AudioEngine();
    expect(() => {
      engine.resume();
      engine.resume();
      engine.setMusicVolume(0.5);
      engine.setSfxVolume(0.5);
      engine.setMuted(true);
      for (const name of NAMES) engine.play(name, { volume: 0.5, pitch: 1.2 });
      engine.whooshLevel(0.8);
      engine.whooshLevel(0);
      engine.startMusic('menu');
      engine.startMusic('battle');
      engine.stopMusic();
    }).not.toThrow();
  });
});

describe('audio content', () => {
  it('renders every variant to finite, audible, unclipped samples', () => {
    for (const name of NAMES) {
      for (const recipe of SFX_RECIPES[name]) {
        const samples = recipe();
        let peak = 0;
        for (const s of samples) {
          expect(Number.isFinite(s)).toBe(true);
          peak = Math.max(peak, Math.abs(s));
        }
        expect(peak, name).toBeGreaterThan(0.1);
        expect(peak, name).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has the required variant counts', () => {
    expect(SFX_RECIPES.scream.length).toBeGreaterThanOrEqual(5);
    expect(SFX_RECIPES.impactClang.length).toBeGreaterThanOrEqual(3);
    expect(SFX_RECIPES.impactSplat.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps every bar of the march the right length', () => {
    for (const bar of SONG_BARS) {
      expect(bar.notes.reduce((sum, n) => sum + n.steps, 0)).toBe(BAR_STEPS);
    }
  });
});
