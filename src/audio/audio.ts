/**
 * Game audio. Everything is synthesised in code and runs through one limiter:
 *
 *   sfx voices, wind --> sfx gain   --\
 *                                      master (mute) --> limiter --> trim --> soft clip --> speakers
 *   music sessions   --> music gain --/
 *
 * The soft clip is what makes "never clips" true: measured in Chromium, the
 * compressor alone lets the first transient of a big stack reach about 1.2.
 *
 * The `zzfx` package is intentionally not imported: it runs `new AudioContext`
 * at module load, which throws wherever AudioContext is missing, and it wires
 * its output straight to the speakers, past the limiter.
 *
 * The AudioContext is only created by `resume()`, so nothing here touches
 * WebAudio before a user gesture. Without AudioContext every method is a no-op.
 */

import { MusicPlayer } from './music';
import type { MusicTrack } from './music';
import { renderWindNoise, SAMPLE_RATE, SFX_RECIPES } from './sfx';
import type { SfxName } from './sfx';

export type { MusicTrack } from './music';
export type { SfxName } from './sfx';

export interface PlayOptions {
  /** Multiplier on the sound's own level; defaults to 1. */
  volume?: number;
  /** Playback-rate multiplier. Omit for the default random +-10 percent. */
  pitch?: number;
}

const MAX_VOICES_PER_NAME = 4;
const MAX_VOICES = 24;
const PITCH_SPREAD = 0.1;
/** Volume 1 on the music slider, leaving room for effects on top. */
const MUSIC_HEADROOM = 0.6;
/** Keeps the compressor's automatic make-up gain clear of full scale. */
const OUTPUT_TRIM = 0.8;
const WIND_PEAK = 0.45;

interface Voice {
  name: SfxName;
  source: AudioBufferSourceNode;
  gain: GainNode;
  volume: number;
  startedAt: number;
  endsAt: number;
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  windGain: GainNode;
  windFilter: BiquadFilterNode;
  player: MusicPlayer;
}

type AudioContextCtor = new () => AudioContext;

function findAudioContext(): AudioContextCtor | null {
  const scope = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** Linear below 0.7 so normal levels are untouched, then saturating under 1. */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const knee = 0.7;
  const room = 0.28;
  const curve = new Float32Array(4097);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    const a = Math.abs(x);
    curve[i] = a <= knee ? x : Math.sign(x) * (knee + room * Math.tanh((a - knee) / room));
  }
  return curve;
}

export class AudioEngine {
  private graph: Graph | null = null;
  private unavailable = false;
  private musicVolume = 0.7;
  private sfxVolume = 1;
  private muted = false;
  private wind = 0;
  private track: MusicTrack | null = null;
  private voices: Voice[] = [];
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly lastVariant = new Map<SfxName, number>();

  /** Starts audio. Call from any user gesture; repeated calls are harmless. */
  resume(): void {
    if (!this.graph) this.build();
    this.withGraph(({ ctx }) => {
      if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => undefined);
    });
  }

  setMusicVolume(v: number): void {
    this.musicVolume = clamp01(v);
    this.withGraph((g) => this.fade(g, g.music.gain, this.musicVolume * MUSIC_HEADROOM));
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v);
    this.withGraph((g) => this.fade(g, g.sfx.gain, this.sfxVolume));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.withGraph((g) => this.fade(g, g.master.gain, muted ? 0 : 1));
  }

  play(name: SfxName, opts: PlayOptions = {}): void {
    this.withGraph((g) => {
      // A suspended clock would queue the sound and release it all at once on resume.
      if (g.ctx.state !== 'running') return;
      const volume = Math.max(0, opts.volume ?? 1);
      if (!Number.isFinite(volume) || volume === 0) return;
      const now = g.ctx.currentTime;
      this.voices = this.voices.filter((v) => v.endsAt > now);
      if (!this.makeRoom(name, volume, now)) return;

      const buffer = this.bufferFor(g.ctx, name, this.pickVariant(name));
      const rate = this.resolveRate(opts.pitch);
      const source = g.ctx.createBufferSource();
      const gain = g.ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(g.sfx);
      const voice: Voice = { name, source, gain, volume, startedAt: now, endsAt: now + buffer.duration / rate };
      source.onended = () => {
        gain.disconnect();
        this.voices = this.voices.filter((v) => v !== voice);
      };
      source.start(now);
      this.voices.push(voice);
    });
  }

  /** Continuous wind; call each frame with thrown-object speed in 0..1. 0 is silent. */
  whooshLevel(speed01: number): void {
    this.wind = clamp01(speed01);
    this.withGraph((g) => this.applyWind(g));
  }

  startMusic(track: MusicTrack): void {
    this.track = track;
    this.withGraph((g) => g.player.start(track));
  }

  stopMusic(): void {
    this.track = null;
    this.withGraph((g) => g.player.stop());
  }

  /** Audio is decoration: no failure in it may reach the game loop. */
  private withGraph(action: (g: Graph) => void): void {
    const g = this.graph;
    if (!g) return;
    try {
      action(g);
    } catch {
      // Deliberately silent; see above.
    }
  }

  private build(): void {
    if (this.unavailable) return;
    const Ctor = findAudioContext();
    if (!Ctor) {
      this.unavailable = true;
      return;
    }
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      const trim = ctx.createGain();

      master.gain.value = this.muted ? 0 : 1;
      music.gain.value = this.musicVolume * MUSIC_HEADROOM;
      sfx.gain.value = this.sfxVolume;
      limiter.threshold.value = -12;
      limiter.knee.value = 6;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      trim.gain.value = OUTPUT_TRIM;

      music.connect(master);
      sfx.connect(master);
      master.connect(limiter);
      limiter.connect(trim);
      const softClip = ctx.createWaveShaper();
      softClip.curve = softClipCurve();
      trim.connect(softClip);
      softClip.connect(ctx.destination);

      const noise = renderWindNoise();
      const windBuffer = ctx.createBuffer(1, noise.length, SAMPLE_RATE);
      windBuffer.getChannelData(0).set(noise);
      const windSource = ctx.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.Q.value = 0.8;
      windFilter.frequency.value = 300;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(sfx);
      windSource.start();

      const player = new MusicPlayer(ctx, music);
      this.graph = { ctx, master, music, sfx, windGain, windFilter, player };
      // Anything requested before the first gesture takes effect now.
      this.applyWind(this.graph);
      if (this.track) player.start(this.track);
    } catch {
      this.graph = null;
      this.unavailable = true;
    }
  }

  private fade(g: Graph, param: AudioParam, target: number): void {
    param.setTargetAtTime(target, g.ctx.currentTime, 0.015);
  }

  private applyWind(g: Graph): void {
    const now = g.ctx.currentTime;
    g.windGain.gain.setTargetAtTime(WIND_PEAK * this.wind ** 1.4, now, 0.06);
    g.windFilter.frequency.setTargetAtTime(300 + 2200 * this.wind, now, 0.06);
  }

  private resolveRate(pitch: number | undefined): number {
    if (pitch !== undefined && Number.isFinite(pitch) && pitch > 0) return Math.min(4, Math.max(0.25, pitch));
    return 1 - PITCH_SPREAD + Math.random() * 2 * PITCH_SPREAD;
  }

  /** Random variant, never the same one twice running. */
  private pickVariant(name: SfxName): number {
    const count = SFX_RECIPES[name].length;
    if (count === 1) return 0;
    const last = this.lastVariant.get(name);
    let pick = Math.floor(Math.random() * count);
    if (pick === last) pick = (pick + 1) % count;
    this.lastVariant.set(name, pick);
    return pick;
  }

  private bufferFor(ctx: AudioContext, name: SfxName, variant: number): AudioBuffer {
    const key = `${name}:${variant}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const samples = SFX_RECIPES[name][variant]();
      buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(key, buffer);
    }
    return buffer;
  }

  /** Applies both voice limits. Returns false when the new sound is the one to drop. */
  private makeRoom(name: SfxName, volume: number, now: number): boolean {
    const sameName = this.voices.filter((v) => v.name === name);
    if (sameName.length >= MAX_VOICES_PER_NAME && !this.evictQuietest(sameName, volume, now)) return false;
    if (this.voices.length >= MAX_VOICES && !this.evictQuietest(this.voices, volume, now)) return false;
    return true;
  }

  private evictQuietest(pool: readonly Voice[], volume: number, now: number): boolean {
    let quietest = pool[0];
    let lowest = this.loudness(quietest, now);
    for (const voice of pool) {
      const level = this.loudness(voice, now);
      if (level < lowest) {
        lowest = level;
        quietest = voice;
      }
    }
    if (volume < lowest) return false;
    quietest.gain.gain.setTargetAtTime(0, now, 0.008);
    quietest.source.stop(now + 0.04);
    this.voices = this.voices.filter((v) => v !== quietest);
    return true;
  }

  /** Current level estimate: nominal volume, tapering over the voice's life. */
  private loudness(voice: Voice, now: number): number {
    const progress = (now - voice.startedAt) / Math.max(voice.endsAt - voice.startedAt, 0.001);
    return voice.volume * Math.max(0, 1 - progress);
  }
}
