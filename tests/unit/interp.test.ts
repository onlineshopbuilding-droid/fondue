import { describe, expect, it } from 'vitest';
import { EXTRAPOLATE_MAX_MS, PLAYOUT_MAX_MS, PlayoutBuffer } from '../../src/net/interp';
import type { ViewState } from '../../src/net/snapshot';

/** A picture with one raider walking left at `speed` px/s, at host tick `tick`. */
function view(tick: number, speed = 250, extra: Partial<ViewState> = {}): ViewState {
  const x = 1200 - (speed * tick) / 60;
  return {
    tick, phase: 'battle', paused: false, hold: false, wave: 1, waveT: tick / 60, runT: tick / 60, gold: 0, crests: 0,
    gateHp: 100, gateMax: 100, cooldowns: [], cooldownMax: [], perchBusy: 0, potBusy: 0, potMax: 0, goldRushT: 0, beaconT: 0,
    enemies: [{ id: 1, type: 'grunt', st: 'walk', x, y: 600, rot: 0, lane: 0, hidden: false, shield: false, armed: false, crow: false, frozen: false, big: false, heldBy: [], hpFrac: 1 }],
    projectiles: [], zones: [], hands: [],
    ...extra,
  };
}

/** A fixed pseudo-random sequence, so the test is the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

/**
 * Plays a link: the host makes a snapshot every 2 ticks (30 Hz), each takes 60 ms plus up to `jitter`
 * ms, now and then one is held up 120 ms and holds up the ones behind it (a reliable channel). The
 * guest draws at 60 Hz. Returns the raider's step per guest frame once the buffer has settled.
 */
function play(jitter: number, loss: number, frames = 600) {
  const rand = rng(7);
  const buf = new PlayoutBuffer();
  const arrivals: { at: number; v: ViewState }[] = [];
  let last = 0;
  for (let tick = 0; tick < frames * 1.2; tick += 2) {
    let d = 60 + rand() * jitter;
    if (rand() < loss) d += 120;
    last = Math.max(last, (tick * 1000) / 60 + d);
    arrivals.push({ at: last, v: view(tick) });
  }
  const steps: number[] = [];
  let prev: number | null = null;
  for (let f = 0; f < frames; f++) {
    const now = (f * 1000) / 60;
    while (arrivals.length && arrivals[0].at <= now) { const a = arrivals.shift()!; buf.push(a.v, a.at); }
    const v = buf.sample(now);
    const x = v?.enemies[0]?.x;
    if (x !== undefined && prev !== null && f > 120) steps.push(prev - x);
    prev = x ?? null;
  }
  return { steps, delay: buf.delayMs };
}

describe('guest playout buffer', () => {
  it('a walking raider moves the same distance every frame despite jitter', () => {
    const { steps, delay } = play(25, 0);
    const expected = 250 / 60;
    expect(steps.length).toBeGreaterThan(400);
    for (const s of steps) expect(Math.abs(s - expected)).toBeLessThan(expected * 0.35);
    expect(delay).toBeLessThanOrEqual(PLAYOUT_MAX_MS);
  });

  it('a late snapshot is bridged without a stall or a jump', () => {
    const { steps } = play(25, 0.05);
    const expected = 250 / 60;
    const bad = steps.filter((s) => Math.abs(s - expected) > expected * 0.5).length;
    // Only the rare long hold-up may show at all, and it never jumps backwards.
    expect(bad / steps.length).toBeLessThan(0.03);
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0);
  });

  it('a pause holds the picture and play resumes without moving backwards', () => {
    const buf = new PlayoutBuffer();
    let now = 0;
    const xs: number[] = [];
    const frame = () => { const v = buf.sample(now); if (v) xs.push(v.enemies[0].x); now += 1000 / 60; };
    let tick = 0;
    for (; tick < 120; tick += 2) { buf.push(view(tick), now + 60); frame(); frame(); }
    // Paused: the same tick again and again for two seconds.
    for (let i = 0; i < 60; i++) { buf.push(view(tick, 250, { paused: true }), now + 60); frame(); frame(); }
    expect(buf.sample(now)!.paused).toBe(true);
    for (; tick < 300; tick += 2) { buf.push(view(tick), now + 60); frame(); frame(); }
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + 1e-6);
    // It is moving again at the end.
    expect(xs[xs.length - 1]).toBeLessThan(xs[xs.length - 30]);
  });

  it('never carries a raider further than the extrapolation limit past the last snapshot', () => {
    const buf = new PlayoutBuffer();
    let now = 0;
    for (let tick = 0; tick < 60; tick += 2) { buf.push(view(tick), now); buf.sample(now); now += 1000 / 30; }
    const lastX = view(58).enemies[0].x;
    for (let i = 0; i < 60; i++) { buf.sample(now); now += 1000 / 60; }
    const x = buf.sample(now)!.enemies[0].x;
    expect(lastX - x).toBeLessThanOrEqual((250 * EXTRAPOLATE_MAX_MS) / 1000 + 0.5);
  });

  it('a new run starting at tick 0 starts the buffer over', () => {
    const buf = new PlayoutBuffer();
    for (let tick = 100; tick < 200; tick += 2) { buf.push(view(tick), tick * 16.7); buf.sample(tick * 16.7); }
    buf.push(view(0), 200 * 16.7);
    expect(buf.sample(200 * 16.7)!.tick).toBe(0);
  });
});
