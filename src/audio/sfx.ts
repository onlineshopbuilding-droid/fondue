/**
 * Procedural sound effects, rendered to sample arrays on first use.
 *
 * Deliberately pure (no WebAudio here): every recipe returns a Float32Array
 * that the engine copies into an AudioBuffer and caches.
 */

export type SfxName =
  | 'grab'
  | 'scream'
  | 'whoosh'
  | 'impactClang'
  | 'impactSplat'
  | 'softBounce'
  | 'coin'
  | 'crest'
  | 'explosion'
  | 'cannon'
  | 'bolter'
  | 'freeze'
  | 'shatter'
  | 'fire'
  | 'slam'
  | 'wheelRoll'
  | 'eagleScreech'
  | 'cauldronSplash'
  | 'gateHit'
  | 'shield'
  | 'tapCart'
  | 'uiClick'
  | 'uiDenied'
  | 'buy'
  | 'waveStart'
  | 'victory'
  | 'defeat'
  | 'weaponReady'
  | 'crow'
  | 'cuckoo'
  | 'thunder'
  | 'horn'
  | 'spikes'
  | 'goldRush'
  | 'ignite'
  | 'cheer'
  | 'squelch'
  | 'thorns'
  | 'sentry'
  | 'kegLoose';

export const SAMPLE_RATE = 44100;

const TAU = Math.PI * 2;

type Curve = number | ((t: number) => number);
type Wave = 'sine' | 'tri' | 'saw' | 'square';
type Point = readonly [number, number];

interface Filter {
  type: 'lp' | 'bp' | 'hp';
  freq: Curve;
  q?: number;
}

interface Layer {
  start?: number;
  dur: number;
  amp?: Curve;
  filter?: Filter;
}

interface ToneLayer extends Layer {
  freq: Curve;
  wave?: Wave;
}

const read = (c: Curve, t: number): number => (typeof c === 'number' ? c : c(t));

/** Instant-ish attack, exponential decay. `decay` is the time constant in seconds. */
const perc =
  (attack: number, decay: number, gain = 1) =>
  (t: number): number =>
    gain * (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

const adsr =
  (a: number, d: number, s: number, r: number, total: number, gain = 1) =>
  (t: number): number => {
    if (t < a) return (gain * t) / a;
    if (t < a + d) return gain * (1 - ((1 - s) * (t - a)) / d);
    if (t < total - r) return gain * s;
    return Math.max(0, (gain * s * (total - t)) / r);
  };

/** Exponential interpolation through [time, value] points; suits frequencies. */
function glide(...points: Point[]): (t: number) => number {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return v0 * (v1 / v0) ** ((t - t0) / (t1 - t0));
      }
    }
    return points[points.length - 1][1];
  };
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Topology-preserving state variable filter; stable under fast cutoff sweeps. */
class Svf {
  lp = 0;
  bp = 0;
  hp = 0;
  private ic1 = 0;
  private ic2 = 0;

  run(x: number, cutoff: number, q: number): void {
    const g = Math.tan((Math.PI * Math.min(cutoff, SAMPLE_RATE * 0.45)) / SAMPLE_RATE);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = x - k * v1 - v2;
  }
}

class Mix {
  readonly rand: () => number;
  private readonly data: Float32Array;

  constructor(seconds: number, seed = 1) {
    this.data = new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
    this.rand = mulberry(seed * 7919 + 13);
  }

  private layer(o: Layer, source: (t: number) => number): void {
    const offset = Math.floor((o.start ?? 0) * SAMPLE_RATE);
    const count = Math.min(Math.ceil(o.dur * SAMPLE_RATE), this.data.length - offset);
    const amp = o.amp ?? 1;
    const f = o.filter;
    const svf = f ? new Svf() : null;
    for (let i = 0; i < count; i++) {
      const t = i / SAMPLE_RATE;
      let x = source(t);
      if (f && svf) {
        svf.run(x, read(f.freq, t), f.q ?? 0.8);
        x = f.type === 'lp' ? svf.lp : f.type === 'bp' ? svf.bp : svf.hp;
      }
      this.data[offset + i] += x * read(amp, t);
    }
  }

  tone(o: ToneLayer): this {
    const wave = o.wave ?? 'sine';
    let phase = 0;
    this.layer(o, (t) => {
      phase = (phase + read(o.freq, t) / SAMPLE_RATE) % 1;
      if (wave === 'sine') return Math.sin(TAU * phase);
      if (wave === 'tri') return 4 * Math.abs(phase - 0.5) - 1;
      if (wave === 'saw') return 2 * phase - 1;
      return phase < 0.5 ? 1 : -1;
    });
    return this;
  }

  noise(o: Layer): this {
    this.layer(o, () => this.rand() * 2 - 1);
    return this;
  }

  /** A random sprinkle of very short filtered noise ticks. */
  crackle(count: number, from: number, to: number, level: number, cutoff = 2500): this {
    for (let i = 0; i < count; i++) {
      this.noise({
        start: from + this.rand() * (to - from),
        dur: 0.03,
        amp: perc(0.0005, 0.006, level * (0.4 + this.rand() * 0.6)),
        filter: { type: 'hp', freq: cutoff },
      });
    }
    return this;
  }

  /** Saturate for punch, normalise to `peak`, remove the tail click. */
  finish(peak: number, drive = 0): Float32Array {
    const d = this.data;
    let max = 0;
    for (let i = 0; i < d.length; i++) {
      if (drive > 0) d[i] = Math.tanh(d[i] * drive);
      max = Math.max(max, Math.abs(d[i]));
    }
    const scale = max > 0 ? peak / max : 0;
    const fade = Math.min(d.length, Math.floor(SAMPLE_RATE * 0.006));
    for (let i = 0; i < d.length; i++) {
      d[i] *= scale;
      const left = d.length - i;
      if (left < fade) d[i] *= left / fade;
    }
    return d;
  }
}

const NOTE_OFFSET: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'F#5' to a MIDI note number. */
export function midiOf(note: string): number {
  const letter = note[0];
  const sharp = note[1] === '#';
  const octave = Number(note.slice(sharp ? 2 : 1));
  return 12 * (octave + 1) + NOTE_OFFSET[letter] + (sharp ? 1 : 0);
}

export const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const hz = (note: string): number => midiHz(midiOf(note));

// ---- character voices -------------------------------------------------------

interface Squawk {
  dur: number;
  pitch: Point[];
  vibrato: number;
  depth: number;
  f1: number;
  f2: number;
  /** Amplitude flutter in Hz; makes the voice gargle. */
  rattle?: number;
  /** Chops the sound into this many separate squawks. */
  bursts?: number;
}

function squawk(p: Squawk, seed: number, peak: number): Float32Array {
  const m = new Mix(p.dur, seed);
  const contour = glide(...p.pitch);
  const freq = (t: number): number => contour(t) * (1 + p.depth * Math.sin(TAU * p.vibrato * t));
  const shape = adsr(0.012, 0.04, 0.85, 0.05, p.dur);
  const amp = (t: number): number => {
    let a = shape(t);
    if (p.rattle) a *= 0.62 + 0.38 * Math.sin(TAU * p.rattle * t);
    if (p.bursts) a *= Math.max(0, Math.sin((Math.PI * t * p.bursts) / p.dur)) ** 0.4;
    return a;
  };
  m.tone({ dur: p.dur, freq, wave: 'saw', amp, filter: { type: 'bp', freq: p.f1, q: 5 } });
  m.tone({
    dur: p.dur,
    freq,
    wave: 'saw',
    amp: (t) => amp(t) * 0.7,
    filter: { type: 'bp', freq: p.f2, q: 7 },
  });
  m.tone({ dur: p.dur, freq, wave: 'saw', amp: (t) => amp(t) * 0.1 });
  return m.finish(peak, 1.3);
}

const SCREAMS: Squawk[] = [
  // "Waaah!" tips over and falls away.
  { dur: 0.55, pitch: [[0, 620], [0.12, 900], [0.55, 340]], vibrato: 14, depth: 0.05, f1: 850, f2: 1500 },
  // "Yipe!"
  { dur: 0.26, pitch: [[0, 900], [0.08, 1500], [0.26, 700]], vibrato: 0, depth: 0, f1: 1000, f2: 2400 },
  // Wobbly "ooh-ooh-ooh".
  {
    dur: 0.7,
    pitch: [[0, 400], [0.18, 620], [0.35, 380], [0.5, 560], [0.7, 320]],
    vibrato: 9,
    depth: 0.09,
    f1: 480,
    f2: 1000,
  },
  // Choked "aaack".
  { dur: 0.3, pitch: [[0, 780], [0.1, 820], [0.3, 600]], vibrato: 0, depth: 0, f1: 900, f2: 1700, rattle: 62 },
  // Delighted-sounding "wheee" going up.
  { dur: 0.5, pitch: [[0, 500], [0.5, 1500]], vibrato: 7, depth: 0.03, f1: 620, f2: 2600 },
  // Panicked "gah-gah-gah".
  { dur: 0.48, pitch: [[0, 700], [0.48, 480]], vibrato: 0, depth: 0, f1: 780, f2: 1400, rattle: 38, bursts: 3 },
];

// ---- impacts ----------------------------------------------------------------

function clang(base: number, seed: number): Float32Array {
  const m = new Mix(0.55, seed);
  const modes: ReadonlyArray<readonly [number, number, number]> = [
    [1, 0.16, 1],
    [2.41, 0.12, 0.7],
    [3.77, 0.09, 0.6],
    [5.63, 0.06, 0.4],
    [8.2, 0.035, 0.3],
  ];
  for (const [ratio, decay, gain] of modes) {
    m.tone({ dur: 0.55, freq: base * ratio * (1 + m.rand() * 0.012), wave: 'tri', amp: perc(0.0005, decay, gain) });
  }
  m.tone({ dur: 0.14, freq: glide([0, 190], [0.1, 70]), amp: perc(0.001, 0.04, 1.1) });
  m.noise({ dur: 0.03, amp: perc(0.0004, 0.006, 1), filter: { type: 'hp', freq: 2200 } });
  return m.finish(0.85, 1.6);
}

function splat(seed: number, bright: number): Float32Array {
  const m = new Mix(0.5, seed);
  m.tone({ dur: 0.2, freq: glide([0, 170], [0.14, 45]), amp: perc(0.001, 0.07, 1.2) });
  m.noise({
    dur: 0.32,
    amp: perc(0.001, 0.08, 1),
    filter: { type: 'bp', freq: glide([0, bright], [0.3, 300]), q: 1.2 },
  });
  for (let i = 0; i < 7; i++) {
    m.noise({
      start: 0.02 + m.rand() * 0.2,
      dur: 0.06,
      amp: perc(0.001, 0.014, 0.3 + m.rand() * 0.4),
      filter: { type: 'bp', freq: 700 + m.rand() * 2000, q: 4 },
    });
  }
  for (let i = 0; i < 3; i++) {
    const f = 500 + m.rand() * 500;
    m.tone({
      start: 0.08 + m.rand() * 0.28,
      dur: 0.05,
      freq: glide([0, f], [0.04, f * 2.2]),
      amp: perc(0.001, 0.012, 0.28),
    });
  }
  return m.finish(0.85, 1.7);
}

function explosion(seed: number): Float32Array {
  const m = new Mix(1.3, seed);
  m.noise({
    dur: 1.3,
    amp: perc(0.001, 0.32),
    filter: { type: 'lp', freq: glide([0, 7000], [0.08, 2400], [1.2, 90]) },
  });
  m.tone({ dur: 1.3, freq: glide([0, 130], [0.25, 38], [1.2, 28]), amp: perc(0.002, 0.34, 1.3) });
  m.noise({ dur: 0.08, amp: perc(0.0004, 0.012, 1.2), filter: { type: 'hp', freq: 1500 } });
  m.crackle(14, 0.1, 0.95, 0.35);
  return m.finish(0.98, 2.2);
}

function cannon(): Float32Array {
  const m = new Mix(0.8, 3);
  m.noise({ dur: 0.1, amp: perc(0.0005, 0.02, 1.2), filter: { type: 'bp', freq: 1800, q: 0.5 } });
  m.noise({ dur: 0.7, amp: perc(0.001, 0.12), filter: { type: 'lp', freq: glide([0, 3000], [0.6, 150]) } });
  m.tone({ dur: 0.7, freq: glide([0, 150], [0.4, 42]), amp: perc(0.001, 0.16, 1.3) });
  return m.finish(0.92, 2.4);
}

function slam(): Float32Array {
  const m = new Mix(0.6, 4);
  m.tone({ dur: 0.6, freq: glide([0, 130], [0.35, 34]), amp: perc(0.001, 0.13, 1.3) });
  m.noise({ dur: 0.25, amp: perc(0.001, 0.05), filter: { type: 'lp', freq: glide([0, 2400], [0.2, 200]) } });
  m.tone({ dur: 0.2, freq: 210, wave: 'tri', amp: perc(0.001, 0.04, 0.5) });
  return m.finish(0.95, 2.4);
}

function gateHit(): Float32Array {
  const m = new Mix(0.45, 5);
  const modes: ReadonlyArray<readonly [number, number, number]> = [
    [96, 0.11, 1],
    [212, 0.07, 0.7],
    [387, 0.05, 0.5],
    [640, 0.03, 0.3],
  ];
  for (const [freq, decay, gain] of modes) m.tone({ dur: 0.45, freq, wave: 'tri', amp: perc(0.001, decay, gain) });
  m.noise({ dur: 0.08, amp: perc(0.0005, 0.018, 0.8), filter: { type: 'lp', freq: 1500 } });
  return m.finish(0.85, 1.8);
}

// ---- weapons and world ------------------------------------------------------

function whoosh(): Float32Array {
  const m = new Mix(0.42, 6);
  m.noise({
    dur: 0.42,
    amp: (t) => Math.sin((Math.PI * t) / 0.42) ** 2,
    filter: { type: 'bp', freq: glide([0, 350], [0.16, 2000], [0.42, 420]), q: 1.2 },
  });
  return m.finish(0.55);
}

function bolter(): Float32Array {
  const m = new Mix(0.24, 7);
  m.tone({ dur: 0.12, freq: glide([0, 1100], [0.1, 240]), wave: 'tri', amp: perc(0.001, 0.03) });
  m.noise({ dur: 0.06, amp: perc(0.0005, 0.012, 0.8), filter: { type: 'bp', freq: 3500, q: 2 } });
  m.noise({
    start: 0.02,
    dur: 0.2,
    amp: perc(0.01, 0.06, 0.4),
    filter: { type: 'bp', freq: glide([0, 2600], [0.18, 900]), q: 1.5 },
  });
  return m.finish(0.6, 1.2);
}

function freeze(): Float32Array {
  const m = new Mix(0.85, 8);
  [2093, 2637, 3136, 3951, 4699, 5274].forEach((freq, i) => {
    m.tone({ start: i * 0.045, dur: 0.6, freq, amp: perc(0.002, 0.18, 0.28) });
  });
  m.noise({ dur: 0.8, amp: adsr(0.08, 0.1, 0.5, 0.4, 0.8, 0.35), filter: { type: 'hp', freq: 5000 } });
  m.tone({ dur: 0.5, freq: glide([0, 820], [0.45, 300]), amp: perc(0.002, 0.14, 0.4) });
  m.crackle(6, 0, 0.25, 0.4, 4000);
  return m.finish(0.65, 1.1);
}

function shatter(): Float32Array {
  const m = new Mix(0.6, 9);
  m.noise({ dur: 0.3, amp: perc(0.0005, 0.05, 0.9), filter: { type: 'hp', freq: glide([0, 3000], [0.25, 6000]) } });
  for (let i = 0; i < 16; i++) {
    m.tone({
      start: m.rand() * 0.22,
      dur: 0.14,
      freq: 2200 + m.rand() * 6000,
      amp: perc(0.0005, 0.02 + m.rand() * 0.04, 0.35),
    });
  }
  m.tone({ dur: 0.15, freq: glide([0, 300], [0.12, 120]), amp: perc(0.001, 0.03, 0.6) });
  return m.finish(0.8, 1.3);
}

function fire(): Float32Array {
  const m = new Mix(0.95, 10);
  const shape = adsr(0.06, 0.1, 0.7, 0.45, 0.95);
  m.noise({ dur: 0.95, amp: shape, filter: { type: 'bp', freq: glide([0, 300], [0.3, 1100], [0.9, 500]), q: 0.6 } });
  m.noise({ dur: 0.95, amp: (t) => shape(t) * 0.9, filter: { type: 'lp', freq: 300 } });
  m.crackle(14, 0.05, 0.85, 0.55);
  return m.finish(0.75, 1.4);
}

function wheelRoll(): Float32Array {
  const m = new Mix(1.1, 11);
  m.noise({ dur: 1.1, amp: adsr(0.05, 0.1, 0.8, 0.25, 1.1), filter: { type: 'lp', freq: 260 } });
  for (let i = 0; i < 10; i++) {
    m.tone({ start: i * 0.105, dur: 0.07, freq: glide([0, 120], [0.06, 70]), amp: perc(0.001, 0.018, 0.65) });
  }
  m.crackle(8, 0.05, 1, 0.12, 1500);
  return m.finish(0.6, 1.3);
}

function eagleScreech(): Float32Array {
  const m = new Mix(0.85, 12);
  const contour = glide([0, 2600], [0.12, 3100], [0.85, 1500]);
  const freq = (t: number): number => contour(t) * (1 + 0.02 * Math.sin(TAU * 28 * t));
  const amp = adsr(0.03, 0.08, 0.75, 0.3, 0.85);
  m.tone({ dur: 0.85, freq, wave: 'saw', amp, filter: { type: 'bp', freq: 2800, q: 3 } });
  m.noise({ dur: 0.85, amp: (t) => amp(t) * 0.2, filter: { type: 'bp', freq: 3000, q: 2 } });
  return m.finish(0.7, 1.4);
}

function cauldronSplash(): Float32Array {
  const m = new Mix(0.95, 13);
  m.tone({ dur: 0.2, freq: glide([0, 180], [0.14, 55]), amp: perc(0.001, 0.05, 1) });
  m.noise({
    dur: 0.6,
    amp: perc(0.001, 0.16, 0.9),
    filter: { type: 'bp', freq: glide([0, 2400], [0.5, 500]), q: 0.7 },
  });
  for (let i = 0; i < 10; i++) {
    const f = 220 + m.rand() * 400;
    m.tone({
      start: 0.15 + m.rand() * 0.65,
      dur: 0.08,
      freq: glide([0, f], [0.06, f * 2.2]),
      amp: perc(0.002, 0.02, 0.32),
    });
  }
  return m.finish(0.85, 1.4);
}

function shield(): Float32Array {
  const m = new Mix(0.55, 14);
  m.noise({
    dur: 0.4,
    amp: adsr(0.04, 0.06, 0.5, 0.2, 0.4, 0.8),
    filter: { type: 'bp', freq: glide([0, 1800], [0.35, 6500]), q: 6 },
  });
  for (const freq of [1720, 2510, 3640]) m.tone({ start: 0.02, dur: 0.5, freq, amp: perc(0.002, 0.12, 0.4) });
  return m.finish(0.6);
}

function tapCart(): Float32Array {
  const m = new Mix(0.3, 15);
  m.tone({ dur: 0.1, freq: 420, wave: 'tri', amp: perc(0.001, 0.018, 0.9) });
  m.tone({ dur: 0.14, freq: 180, amp: perc(0.001, 0.035, 0.6) });
  for (const start of [0.08, 0.16]) {
    m.tone({ start, dur: 0.09, freq: glide([0, 190], [0.07, 340]), amp: perc(0.003, 0.03, 0.4) });
  }
  return m.finish(0.55);
}

function grab(): Float32Array {
  const m = new Mix(0.13, 16);
  m.tone({ dur: 0.13, freq: glide([0, 260], [0.1, 560]), wave: 'tri', amp: perc(0.002, 0.05, 0.8) });
  m.noise({ dur: 0.03, amp: perc(0.001, 0.008, 0.4), filter: { type: 'bp', freq: 1200 } });
  return m.finish(0.5);
}

function softBounce(): Float32Array {
  const m = new Mix(0.26, 17);
  const freq = glide([0, 105], [0.04, 210], [0.26, 92]);
  m.tone({ dur: 0.26, freq, amp: perc(0.004, 0.08) });
  m.tone({ dur: 0.26, freq: (t) => freq(t) * 2, wave: 'tri', amp: perc(0.004, 0.04, 0.2) });
  return m.finish(0.5);
}

// ---- pickups, UI, stingers --------------------------------------------------

function coin(): Float32Array {
  const m = new Mix(0.32, 18);
  m.tone({ dur: 0.08, freq: 1319, wave: 'tri', amp: perc(0.001, 0.04) });
  m.tone({ start: 0.06, dur: 0.26, freq: 1760, wave: 'tri', amp: perc(0.001, 0.08) });
  m.tone({ start: 0.06, dur: 0.26, freq: 3520, amp: perc(0.001, 0.05, 0.25) });
  return m.finish(0.42);
}

function crest(): Float32Array {
  const m = new Mix(1.05, 19);
  ['E5', 'A5', 'B5', 'E6'].forEach((note, i) => {
    const freq = hz(note);
    m.tone({ start: i * 0.08, dur: 0.75, freq, amp: perc(0.002, 0.22) });
    m.tone({ start: i * 0.08, dur: 0.4, freq: freq * 2.76, amp: perc(0.002, 0.07, 0.3) });
  });
  m.noise({ dur: 0.9, amp: adsr(0.2, 0.2, 0.5, 0.4, 0.9, 0.08), filter: { type: 'hp', freq: 7000 } });
  return m.finish(0.5);
}

function buy(): Float32Array {
  const m = new Mix(0.42, 20);
  m.noise({ dur: 0.04, amp: perc(0.0005, 0.01, 0.6), filter: { type: 'bp', freq: 4200, q: 3 } });
  [1047, 1319, 1760].forEach((freq, i) => {
    m.tone({ start: i * 0.065, dur: 0.28, freq, wave: 'tri', amp: perc(0.001, 0.07) });
  });
  return m.finish(0.5);
}

function uiClick(): Float32Array {
  const m = new Mix(0.05, 21);
  m.tone({ dur: 0.05, freq: glide([0, 1100], [0.04, 700]), amp: perc(0.0005, 0.012) });
  return m.finish(0.3);
}

function uiDenied(): Float32Array {
  const m = new Mix(0.26, 22);
  ([[0, 190], [0.12, 165]] as const).forEach(([start, freq]) => {
    m.tone({
      start,
      dur: 0.11,
      freq,
      wave: 'square',
      amp: adsr(0.003, 0.02, 0.8, 0.03, 0.11),
      filter: { type: 'lp', freq: 1200 },
    });
  });
  return m.finish(0.35);
}

function weaponReady(): Float32Array {
  const m = new Mix(0.3, 23);
  m.tone({ dur: 0.12, freq: 1319, wave: 'tri', amp: perc(0.001, 0.05) });
  m.tone({ start: 0.08, dur: 0.22, freq: 1976, wave: 'tri', amp: perc(0.001, 0.08) });
  return m.finish(0.4);
}

/** Bright two-saw brass note for the stingers. */
function brass(m: Mix, note: string, start: number, dur: number, gain = 1, cutoff = 3200): void {
  const freq = hz(note);
  const amp = adsr(0.012, 0.05, 0.75, 0.06, dur, gain);
  const filter: Filter = { type: 'lp', freq: glide([0, 900], [0.05, cutoff], [dur, cutoff * 0.6]) };
  m.tone({ start, dur, freq: freq * 0.997, wave: 'saw', amp, filter });
  m.tone({ start, dur, freq: freq * 1.003, wave: 'saw', amp, filter });
}

type NoteSpec = readonly [string, number, number];

function waveStart(): Float32Array {
  const m = new Mix(0.98, 24);
  const line: NoteSpec[] = [['G4', 0, 0.12], ['C5', 0.12, 0.12], ['E5', 0.24, 0.12], ['G5', 0.36, 0.58]];
  for (const [note, start, dur] of line) brass(m, note, start, dur);
  brass(m, 'E5', 0.36, 0.58, 0.6);
  brass(m, 'C5', 0.36, 0.58, 0.5);
  m.tone({ start: 0.36, dur: 0.58, freq: hz('C3'), wave: 'tri', amp: perc(0.002, 0.25, 1.1) });
  return m.finish(0.6, 1.1);
}

function victory(): Float32Array {
  const m = new Mix(2.25, 25);
  const line: NoteSpec[] = [
    ['G4', 0, 0.14],
    ['C5', 0.16, 0.14],
    ['E5', 0.32, 0.14],
    ['G5', 0.48, 0.3],
    ['E5', 0.8, 0.14],
    ['G5', 0.96, 0.14],
    ['A5', 1.12, 0.14],
    ['C6', 1.28, 0.9],
  ];
  for (const [note, start, dur] of line) brass(m, note, start, dur);
  brass(m, 'G5', 1.28, 0.9, 0.6);
  brass(m, 'E5', 1.28, 0.9, 0.55);
  for (const start of [0.48, 1.28]) {
    m.tone({ start, dur: 0.7, freq: hz('C3'), wave: 'tri', amp: perc(0.002, 0.3, 1.1) });
  }
  m.noise({ start: 1.28, dur: 0.95, amp: perc(0.001, 0.32, 0.3), filter: { type: 'hp', freq: 5000 } });
  return m.finish(0.7, 1.1);
}

function defeat(): Float32Array {
  const m = new Mix(2.05, 26);
  const line: NoteSpec[] = [['A4', 0, 0.3], ['F4', 0.32, 0.3], ['D4', 0.64, 0.3], ['C#4', 0.96, 0.24]];
  for (const [note, start, dur] of line) brass(m, note, start, dur, 1, 1100);
  const low = hz('D4');
  const wobble = (t: number): number => low * (1 + 0.012 * Math.sin(TAU * 5 * t));
  const shape = adsr(0.02, 0.1, 0.8, 0.45, 0.82);
  m.tone({ start: 1.2, dur: 0.82, freq: wobble, wave: 'saw', amp: shape, filter: { type: 'lp', freq: 1100 } });
  m.tone({ start: 1.2, dur: 0.82, freq: hz('D3'), wave: 'tri', amp: (t) => shape(t) * 1.1 });
  return m.finish(0.6, 1.1);
}

// ---- weapons of the big update ----------------------------------------------

/** Tick-tock of a clockwork, then a two-note "cuckoo". */
function cuckoo(): Float32Array {
  const m = new Mix(1.0, 101);
  for (let i = 0; i < 4; i++) {
    m.tone({ start: i * 0.09, dur: 0.04, freq: i % 2 ? 2400 : 3000, wave: 'tri', amp: perc(0.0005, 0.008, 0.6) });
  }
  for (const [start, note] of [[0.42, 'E6'], [0.66, 'C6']] as const) {
    const f = hz(note);
    m.tone({ start, dur: 0.22, freq: f, amp: adsr(0.01, 0.03, 0.7, 0.08, 0.22) });
    m.tone({ start, dur: 0.22, freq: f * 2, wave: 'tri', amp: adsr(0.01, 0.03, 0.7, 0.08, 0.22, 0.15) });
  }
  return m.finish(0.55);
}

/** A crack of lightning with a short rumble behind it. */
function thunder(): Float32Array {
  const m = new Mix(1.1, 102);
  m.noise({ dur: 0.08, amp: perc(0.0003, 0.015, 1.3), filter: { type: 'hp', freq: 2500 } });
  m.crackle(18, 0, 0.25, 0.6, 5000);
  m.noise({ start: 0.05, dur: 1.0, amp: perc(0.02, 0.32, 0.8), filter: { type: 'lp', freq: glide([0, 900], [1, 80]) } });
  m.tone({ start: 0.04, dur: 0.8, freq: glide([0, 70], [0.8, 32]), amp: perc(0.01, 0.25, 0.7) });
  return m.finish(0.9, 1.8);
}

/** The long, round note of an alphorn. */
function horn(): Float32Array {
  const m = new Mix(1.1, 103);
  const f = hz('A2');
  const amp = adsr(0.08, 0.15, 0.8, 0.35, 1.1);
  const filter: Filter = { type: 'lp', freq: glide([0, 400], [0.15, 1400], [1.1, 700]) };
  m.tone({ dur: 1.1, freq: (t) => f * (1 + 0.004 * Math.sin(TAU * 5 * t)), wave: 'saw', amp, filter });
  m.tone({ dur: 1.1, freq: f * 1.5, wave: 'saw', amp: (t) => amp(t) * 0.35, filter });
  m.noise({ dur: 0.15, amp: perc(0.01, 0.05, 0.25), filter: { type: 'bp', freq: 600, q: 1 } });
  return m.finish(0.8, 1.2);
}

/** Forks bursting out of the earth: a thud and three metal pings. */
function spikes(): Float32Array {
  const m = new Mix(0.5, 104);
  m.tone({ dur: 0.16, freq: glide([0, 140], [0.12, 50]), amp: perc(0.001, 0.05, 1) });
  m.noise({ dur: 0.12, amp: perc(0.001, 0.03, 0.6), filter: { type: 'lp', freq: 1800 } });
  [0, 0.04, 0.08].forEach((start, i) => m.tone({ start, dur: 0.3, freq: 1900 + i * 420, wave: 'tri', amp: perc(0.0005, 0.06, 0.35) }));
  return m.finish(0.75, 1.3);
}

/** A cascade of bright coins for the Golden Fondue. */
function goldRush(): Float32Array {
  const m = new Mix(0.9, 105);
  ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((note, i) => {
    m.tone({ start: i * 0.07, dur: 0.4, freq: hz(note), wave: 'tri', amp: perc(0.001, 0.12, 0.8) });
  });
  for (let i = 0; i < 10; i++) m.tone({ start: 0.1 + m.rand() * 0.6, dur: 0.1, freq: 2600 + m.rand() * 2400, amp: perc(0.001, 0.03, 0.25) });
  return m.finish(0.5);
}

/** Embers catching: a soft whump and crackling. */
function ignite(): Float32Array {
  const m = new Mix(0.8, 106);
  m.noise({ dur: 0.5, amp: adsr(0.03, 0.1, 0.5, 0.3, 0.5), filter: { type: 'lp', freq: glide([0, 300], [0.15, 1600], [0.5, 500]) } });
  m.tone({ dur: 0.25, freq: glide([0, 90], [0.2, 50]), amp: perc(0.01, 0.08, 0.8) });
  m.crackle(12, 0.05, 0.75, 0.5);
  return m.finish(0.65, 1.3);
}

/** A little crowd cheering, with a bright fanfare note on top. */
function cheer(): Float32Array {
  const m = new Mix(1.4, 107);
  m.noise({ dur: 1.4, amp: adsr(0.08, 0.2, 0.7, 0.6, 1.4), filter: { type: 'bp', freq: glide([0, 900], [0.4, 1500], [1.4, 1100]), q: 0.8 } });
  for (let i = 0; i < 6; i++) {
    const f = 500 + m.rand() * 500;
    m.tone({ start: m.rand() * 0.5, dur: 0.35, freq: glide([0, f], [0.35, f * 1.5]), wave: 'saw', amp: adsr(0.02, 0.05, 0.5, 0.1, 0.35, 0.12), filter: { type: 'bp', freq: 1100, q: 3 } });
  }
  brass(m, 'C5', 0.1, 0.5, 0.5);
  brass(m, 'G5', 0.1, 0.5, 0.4);
  return m.finish(0.6, 1.1);
}

/** Thick cheese landing on the road. */
function squelch(): Float32Array {
  const m = new Mix(0.5, 108);
  m.noise({ dur: 0.35, amp: perc(0.005, 0.1, 0.9), filter: { type: 'bp', freq: glide([0, 300], [0.3, 900]), q: 2 } });
  for (let i = 0; i < 4; i++) {
    const f = 180 + m.rand() * 160;
    m.tone({ start: 0.08 + i * 0.07, dur: 0.08, freq: glide([0, f], [0.07, f * 2.4]), amp: perc(0.002, 0.025, 0.4) });
  }
  return m.finish(0.6, 1.2);
}

/** Spikes snapping out of the gate. */
function thorns(): Float32Array {
  const m = new Mix(0.4, 109);
  for (let i = 0; i < 6; i++) {
    m.noise({ start: i * 0.025, dur: 0.05, amp: perc(0.0005, 0.012, 0.7), filter: { type: 'bp', freq: 2800 + i * 300, q: 3 } });
  }
  m.tone({ dur: 0.2, freq: glide([0, 400], [0.18, 180]), wave: 'tri', amp: perc(0.001, 0.05, 0.6) });
  return m.finish(0.6, 1.3);
}

/** The marmot's small crossbow: a short twang. */
function sentry(): Float32Array {
  const m = new Mix(0.16, 110);
  m.tone({ dur: 0.1, freq: glide([0, 1500], [0.08, 500]), wave: 'tri', amp: perc(0.0005, 0.025, 0.8) });
  m.noise({ dur: 0.05, amp: perc(0.0005, 0.01, 0.5), filter: { type: 'bp', freq: 4200, q: 2 } });
  return m.finish(0.45);
}

/** A keg's strap snapping: a creak and a wooden knock. */
function kegLoose(): Float32Array {
  const m = new Mix(0.35, 111);
  m.tone({ dur: 0.14, freq: glide([0, 300], [0.12, 520]), wave: 'saw', amp: perc(0.005, 0.04, 0.4), filter: { type: 'bp', freq: 900, q: 4 } });
  m.tone({ start: 0.12, dur: 0.18, freq: glide([0, 210], [0.15, 120]), wave: 'tri', amp: perc(0.001, 0.05, 0.9) });
  m.noise({ start: 0.12, dur: 0.05, amp: perc(0.0005, 0.012, 0.5), filter: { type: 'lp', freq: 1800 } });
  return m.finish(0.6, 1.2);
}

export type Recipe = () => Float32Array;

/** Every sound and its variants; the engine picks a variant at random. */
export const SFX_RECIPES: Record<SfxName, Recipe[]> = {
  grab: [grab],
  scream: SCREAMS.map((p, i) => () => squawk(p, 30 + i, 0.62)),
  whoosh: [whoosh],
  impactClang: [() => clang(320, 40), () => clang(415, 41), () => clang(255, 42)],
  impactSplat: [() => splat(50, 1400), () => splat(51, 2100), () => splat(52, 950)],
  softBounce: [softBounce],
  coin: [coin],
  crest: [crest],
  explosion: [() => explosion(60), () => explosion(61)],
  cannon: [cannon],
  bolter: [bolter],
  freeze: [freeze],
  shatter: [shatter],
  fire: [fire],
  slam: [slam],
  wheelRoll: [wheelRoll],
  eagleScreech: [eagleScreech],
  cauldronSplash: [cauldronSplash],
  gateHit: [gateHit],
  shield: [shield],
  tapCart: [tapCart],
  uiClick: [uiClick],
  uiDenied: [uiDenied],
  buy: [buy],
  waveStart: [waveStart],
  victory: [victory],
  defeat: [defeat],
  weaponReady: [weaponReady],
  crow: [
    () =>
      squawk(
        { dur: 0.46, pitch: [[0, 620], [0.46, 420]], vibrato: 0, depth: 0, f1: 1100, f2: 1900, rattle: 70, bursts: 2 },
        70,
        0.5,
      ),
  ],
  cuckoo: [cuckoo],
  thunder: [thunder],
  horn: [horn],
  spikes: [spikes],
  goldRush: [goldRush],
  ignite: [ignite],
  cheer: [cheer],
  squelch: [squelch],
  thorns: [thorns],
  sentry: [sentry],
  kegLoose: [kegLoose],
};

/** One march snare hit: noise plus a short drum-head tone. */
export function renderSnare(): Float32Array {
  const m = new Mix(0.16, 80);
  m.noise({ dur: 0.16, amp: perc(0.0008, 0.035), filter: { type: 'hp', freq: 1400 } });
  m.tone({ dur: 0.08, freq: glide([0, 240], [0.06, 170]), wave: 'tri', amp: perc(0.0008, 0.02, 0.8) });
  return m.finish(0.9, 1.3);
}

/** Two seconds of white noise for the wind loop. */
export function renderWindNoise(): Float32Array {
  const m = new Mix(2, 90);
  m.noise({ dur: 2 });
  return m.finish(0.9);
}
