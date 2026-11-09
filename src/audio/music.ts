/**
 * The Fondue alpine march: an original tune, sequenced with a lookahead timer.
 *
 * 16 sixteenth-note steps per bar, 4/4, arranged A A B B (32 bars). The B
 * section moves to the subdominant, as a march trio does.
 */

import { midiHz, midiOf, renderSnare, SAMPLE_RATE } from './sfx';

export type MusicTrack = 'menu' | 'battle';

interface Chord {
  root: number;
  fifth: number;
  tones: readonly number[];
}

const CHORDS: Record<string, Chord> = {
  G: { root: 43, fifth: 50, tones: [55, 59, 62] },
  C: { root: 48, fifth: 43, tones: [55, 60, 64] },
  D7: { root: 50, fifth: 45, tones: [54, 60, 62] },
  F: { root: 41, fifth: 48, tones: [53, 57, 60] },
};

/** [chord of first half, chord of second half if it changes, melody as note:sixteenths] */
type BarSpec = readonly [string, string | null, string];

const SECTION_A: readonly BarSpec[] = [
  ['G', null, 'G4:2 B4:2 E5:3 D5:1 B4:2 D5:2 G5:4'],
  ['G', 'D7', 'F#5:2 E5:2 D5:2 B4:2 C5:3 B4:1 A4:4'],
  ['D7', null, 'F#4:2 A4:2 D5:3 C5:1 A4:2 C5:2 F#5:4'],
  ['D7', 'G', 'E5:2 D5:2 C5:2 A4:2 B4:4 R:2 D5:2'],
  ['G', null, 'G4:2 B4:2 E5:3 D5:1 B4:2 D5:2 G5:4'],
  ['C', null, 'A5:2 G5:2 E5:2 C5:2 G5:3 E5:1 C5:4'],
  ['G', 'D7', 'B4:2 D5:2 G5:2 B4:2 A4:3 B4:1 C5:2 F#4:2'],
  ['G', null, 'G4:4 B4:2 D5:2 G5:4 R:4'],
];

const SECTION_B: readonly BarSpec[] = [
  ['C', null, 'E5:6 G5:2 C6:4 B5:2 G5:2'],
  ['C', null, 'A5:3 G5:1 E5:4 C5:4 E5:4'],
  ['G', null, 'D5:6 F5:2 B5:4 A5:2 F5:2'],
  ['C', null, 'G5:3 F5:1 E5:4 C5:4 R:2 G4:2'],
  ['F', null, 'A4:2 C5:2 F5:3 E5:1 D5:2 C5:2 A5:4'],
  ['C', null, 'G5:2 E5:2 C5:2 E5:2 G5:3 A5:1 G5:4'],
  ['D7', null, 'F#5:2 A5:2 D6:3 C6:1 A5:2 F#5:2 D5:2 E5:1 F#5:1'],
  ['G', 'D7', 'G5:4 D5:2 B4:2 A4:2 B4:2 A4:2 F#4:2'],
];

interface Bar {
  chords: readonly [Chord, Chord | null];
  /** Doubles the lead an octave down, for the repeat of a section. */
  doubled: boolean;
  notes: ReadonlyArray<{ midi: number | null; steps: number }>;
}

function compileBar(spec: BarSpec, doubled: boolean): Bar {
  return {
    chords: [CHORDS[spec[0]], spec[1] ? CHORDS[spec[1]] : null],
    doubled,
    notes: spec[2].split(' ').map((token) => {
      const [name, steps] = token.split(':');
      return { midi: name === 'R' ? null : midiOf(name), steps: Number(steps) };
    }),
  };
}

const compileSection = (section: readonly BarSpec[], doubled: boolean): Bar[] =>
  section.map((spec) => compileBar(spec, doubled));

/** The whole loop; exported so tests can check that every bar adds up. */
export const SONG_BARS: readonly Bar[] = [
  ...compileSection(SECTION_A, false),
  ...compileSection(SECTION_A, true),
  ...compileSection(SECTION_B, false),
  ...compileSection(SECTION_B, true),
];

export const BAR_STEPS = 16;

const TOTAL_STEPS = SONG_BARS.length * BAR_STEPS;

/** Melody onsets indexed by song step. */
const LEAD_AT = new Map<number, { midi: number; steps: number }>();
SONG_BARS.forEach((bar, index) => {
  let step = index * BAR_STEPS;
  for (const note of bar.notes) {
    if (note.midi !== null) LEAD_AT.set(step, { midi: note.midi, steps: note.steps });
    step += note.steps;
  }
});

interface Style {
  bpm: number;
  /** Delay of the off-eighth, as a fraction of one sixteenth. */
  swing: number;
  /** Note length as a fraction of its written length. */
  gate: number;
  lead: number;
  cutoff: number;
  chord: number;
  bass: number;
  /** Bass length in sixteenths. */
  bassSteps: number;
  snare: number;
  /** Snare fill at the end of every eighth bar. */
  roll: boolean;
}

const STYLES: Record<MusicTrack, Style> = {
  battle: {
    bpm: 120,
    swing: 0,
    gate: 0.92,
    lead: 0.15,
    cutoff: 3000,
    chord: 0.05,
    bass: 0.26,
    bassSteps: 2.4,
    snare: 0.15,
    roll: true,
  },
  menu: {
    bpm: 104,
    swing: 0.5,
    gate: 0.55,
    lead: 0.1,
    cutoff: 1700,
    chord: 0.035,
    bass: 0.2,
    bassSteps: 1.4,
    snare: 0.05,
    roll: false,
  },
};

const REED_DETUNE_CENTS = 9;
const TIMER_MS = 40;

export class MusicPlayer {
  private track: MusicTrack | null = null;
  private style: Style = STYLES.battle;
  private bus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private snare: AudioBuffer | null = null;
  /** Seconds of music queued ahead of the audio clock while the tab is visible. */
  private ahead = 0.2;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  start(track: MusicTrack): void {
    if (this.track === track) return;
    this.stop();
    const { ctx } = this;
    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.15);
    bus.connect(this.out);
    this.bus = bus;
    this.track = track;
    this.style = STYLES[track];
    this.step = 0;
    this.nextTime = now + 0.08;
    this.timer = setInterval(() => this.tick(), TIMER_MS);
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    const bus = this.bus;
    this.bus = null;
    if (!bus) return;
    // Notes already queued keep running into a faded bus, so stopping cannot click.
    bus.gain.cancelScheduledValues(this.ctx.currentTime);
    bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    setTimeout(() => bus.disconnect(), 400);
  }

  private tick(): void {
    const now = this.ctx.currentTime;
    // Hidden tabs throttle timers to about 1 Hz, so queue further ahead there.
    const hidden = typeof document !== 'undefined' && document.hidden;
    const horizon = now + (hidden ? Math.max(this.ahead, 1.5) : this.ahead);
    // After a stall, rejoin the clock rather than bursting the missed notes.
    if (this.nextTime < now - 0.05) this.nextTime = now + 0.05;
    const stepDur = 60 / this.style.bpm / 4;
    while (this.nextTime < horizon) {
      const position = this.step % 4;
      const swing = position === 2 ? 1 : position === 0 ? 0 : 0.5;
      this.scheduleStep(this.step, this.nextTime + this.style.swing * swing * stepDur, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % TOTAL_STEPS;
    }
  }

  private scheduleStep(step: number, t: number, stepDur: number): void {
    const s = this.style;
    const inBar = step % BAR_STEPS;
    const barIndex = Math.floor(step / BAR_STEPS);
    const bar = SONG_BARS[barIndex];

    const lead = LEAD_AT.get(step);
    if (lead) {
      const dur = lead.steps * stepDur * s.gate;
      this.reed(t, dur, lead.midi, s.lead, s.cutoff);
      if (bar.doubled) this.reed(t, dur, lead.midi - 12, s.lead * 0.5, s.cutoff * 0.7);
    }

    const [first, second] = bar.chords;
    const chord = inBar < 8 ? first : (second ?? first);
    if (inBar === 0 || inBar === 8) {
      // Without a chord change, the second "oom" walks to the fifth.
      const midi = inBar === 8 && !second ? chord.fifth : chord.root;
      this.bass(t, s.bassSteps * stepDur, midi, s.bass);
    }
    if (inBar === 4 || inBar === 12) {
      for (const midi of chord.tones) this.reed(t, stepDur * 1.5, midi, s.chord, 1500);
      this.hit(t, s.snare);
    }
    if (s.roll && barIndex % 8 === 7 && inBar >= 10) {
      this.hit(t, s.snare * (0.5 + ((inBar - 10) / 5) * 0.5));
    }
  }

  /** Accordion-like voice: two detuned saws into a low-pass with a bellows envelope. */
  private reed(t: number, dur: number, midi: number, level: number, cutoff: number): void {
    const bus = this.bus;
    if (!bus) return;
    const { ctx } = this;
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.7;
    filter.connect(amp);
    amp.connect(bus);

    const attack = Math.min(0.012, dur * 0.3);
    const settle = Math.min(attack + 0.06, dur * 0.7);
    const end = t + dur;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + attack);
    amp.gain.linearRampToValueAtTime(level * 0.78, t + settle);
    amp.gain.setValueAtTime(level * 0.78, end);
    amp.gain.linearRampToValueAtTime(0, end + 0.04);

    for (const detune of [-REED_DETUNE_CENTS, REED_DETUNE_CENTS]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiHz(midi);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(end + 0.06);
      osc.onended = () => amp.disconnect();
    }
  }

  /** The tuba: a triangle with a sine an octave down for weight. */
  private bass(t: number, dur: number, midi: number, level: number): void {
    const bus = this.bus;
    if (!bus) return;
    const { ctx } = this;
    const amp = ctx.createGain();
    amp.connect(bus);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(level * 0.35, t + dur);
    amp.gain.linearRampToValueAtTime(0, t + dur + 0.03);

    const voices: ReadonlyArray<readonly [OscillatorType, number]> = [
      ['triangle', midiHz(midi)],
      ['sine', midiHz(midi - 12)],
    ];
    for (const [type, frequency] of voices) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      osc.connect(amp);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      osc.onended = () => amp.disconnect();
    }
  }

  private hit(t: number, level: number): void {
    const bus = this.bus;
    if (!bus || level <= 0) return;
    const { ctx } = this;
    if (!this.snare) {
      const samples = renderSnare();
      this.snare = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      this.snare.getChannelData(0).set(samples);
    }
    const source = ctx.createBufferSource();
    const amp = ctx.createGain();
    source.buffer = this.snare;
    amp.gain.value = level;
    source.connect(amp);
    amp.connect(bus);
    source.onended = () => amp.disconnect();
    source.start(t);
  }
}
