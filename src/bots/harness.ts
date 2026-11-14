// Plays one run headless with a bot per player and counts what happened: waves, gold, crests, quiet stretches, the result.
// Bots draw from their own seeded random stream, so the same setup and seed always give the same run.
// Nothing is bought during a run (F2: waves); the keep comes from the profile the run was built from.
import { Rng } from '../sim/rng';
import type { Loadout, RunResult, RunSetup } from '../sim/rules';
import { Sim } from '../sim/sim';
import { Bot } from './bot';
import { skillOf, type BotSkill } from './skills';

export interface RunOptions {
  /** Start of the bots' own random stream. */
  botSeed: number;
  /** Stop once this wave is cleared (endless); the result then says `wave = maxWaves + 1`. */
  maxWaves?: number;
  /** A run that lasts this many seconds longer than `targetSeconds` (or 30 min without one) counts as stuck. */
  stuckSeconds?: number;
  /** Planned length of the run in seconds, for the stuck check. */
  targetSeconds?: number;
}

export interface WaveStat { wave: number; kills: number; gold: number; crests: number; gatePct: number; seconds: number; spawned: number }

export interface GameResult {
  /** The wave the run ended on: the wave that was lost, the last wave of a won level, or maxWaves + 1. */
  wave: number;
  won: boolean;
  /** Stopped at maxWaves without being decided. */
  capped: boolean;
  /** A run that would not end; see `stuckInfo`. */
  stuck: boolean;
  stuckInfo: string | null;
  /** Gate hit points left at the end, in percent. */
  gatePct: number;
  /** Seconds of the run in the simulation (banner and waves, `s.runT`). */
  seconds: number;
  /** Longest stretch in seconds during the fight with no living raider on the field (B2: at most 5 s). */
  longestQuiet: number;
  /** Wave in which that stretch ended. */
  longestQuietWave: number;
  /** Gold and crests earned in this run. */
  goldEnd: number;
  crestsEnd: number;
  /** Per started wave, index 0 is wave 1 (the last entry may be unfinished). */
  waves: WaveStat[];
  loadout: Loadout;
  kills: number;
  /** Kills by cause over the whole run. */
  causes: Record<string, number>;
  /** Gate damage per raider type over the run. */
  gateDamage: Record<string, number>;
  /** Presses and weapon taps per second of battle per hand, and the share of field presses that caught something. */
  actionsPerSecond: number;
  grabRate: number;
  kegsShaken: number;
  weaponShots: Record<string, number>;
  /** Simulation result, null when the run was stopped early. */
  result: RunResult | null;
  ticks: number;
}

/** Plays the run to its end, or to `maxWaves`, with one bot of the given skill per player. */
export function runGame(setup: RunSetup, skills: (string | BotSkill)[], opts: RunOptions): GameResult {
  const sim = new Sim(setup);
  const players = setup.names.length;
  const rng = new Rng(opts.botSeed);
  const rand = () => rng.next();
  const bots = Array.from({ length: players }, (_, i) => new Bot(i, skillOf(skills[i] ?? skills[0]), rand));
  const maxWaves = opts.maxWaves ?? Infinity;
  const stuckAfter = (opts.targetSeconds ?? 1500) + (opts.stuckSeconds ?? 300);

  const waves: WaveStat[] = [];
  const causes: Record<string, number> = {};
  const gateDamage: Record<string, number> = {};
  let totalBattleTicks = 0;
  let presses = 0;
  let fieldPresses = 0;
  let grabs = 0;
  let quiet = 0;
  let longestQuiet = 0;
  let longestQuietWave = 0;
  let stuckInfo: string | null = null;
  // Counts at the start of the current wave, to report per wave.
  let mark = { kills: 0, gold: 0, crests: 0, runT: 0, wave: 0 };
  // Arrivals of the wave as of the tick before; a new wave resets the count.
  let lastSpawned = 0;
  const command = sim.command.bind(sim);
  sim.command = (c) => {
    if (c.k === 'press') { presses++; fieldPresses++; } else if (c.k === 'fireSlot') presses++;
    command(c);
  };
  const closeWave = () => {
    const s = sim.s;
    if (mark.wave === 0) return;
    waves[mark.wave - 1] = {
      wave: mark.wave, kills: s.stats.kills - mark.kills, gold: s.gold - mark.gold, crests: s.crests - mark.crests,
      gatePct: s.gateMax > 0 ? Math.max(0, Math.round((100 * s.gateHp) / s.gateMax)) : 0,
      seconds: s.runT - mark.runT, spawned: s.wave === mark.wave ? s.spawned : lastSpawned,
    };
  };

  // Enough for very long runs; a run that never ends stops here rather than hanging.
  const tickCap = 60 * 60 * 60 * 6;
  let t = 0;
  for (; t < tickCap; t++) {
    for (const b of bots) b.tick(sim);
    sim.step();
    const s = sim.s;
    for (const ev of sim.drainEvents()) {
      if (ev.e === 'gateHit') gateDamage[ev.etype] = (gateDamage[ev.etype] ?? 0) + ev.amount;
      else if (ev.e === 'death') causes[ev.cause] = (causes[ev.cause] ?? 0) + 1;
      else if (ev.e === 'grab' || ev.e === 'tapCart') grabs++;
    }
    if (s.wave !== mark.wave) {
      closeWave();
      mark = { kills: s.stats.kills, gold: s.gold, crests: s.crests, runT: s.runT, wave: s.wave };
    }
    lastSpawned = s.spawned;
    if (s.phase === 'battle' || s.phase === 'banner') {
      if (s.phase === 'battle') totalBattleTicks++;
      // A raider counts as living while it is in the run at all (on the road, in a hand, in the pot, on the hook).
      const alive = s.enemies.some((e) => !e.dead);
      if (alive) quiet = 0;
      else {
        quiet += 1 / 60;
        if (quiet > longestQuiet) { longestQuiet = quiet; longestQuietWave = s.wave; }
      }
      if (s.runT > stuckAfter) {
        const left = s.enemies.map((e) => `${e.type}${e.big ? '(big)' : ''}:${e.st}@${Math.round(e.x)},${Math.round(e.y)}`).join(' ');
        stuckInfo = `wave ${s.wave} still fighting after ${Math.round(s.runT)} s; seed ${setup.seed}, bot seed ${opts.botSeed}; left: ${left}`;
        break;
      }
    }
    if (s.phase === 'runWon' || s.phase === 'gameover') break;
    if (s.wave > maxWaves) break;
  }
  const s = sim.s;
  closeWave();
  const result = s.meta.result;
  const capped = !result && s.wave > maxWaves;
  if (capped) waves.length = Math.min(waves.length, maxWaves);
  const stats = s.stats;
  return {
    wave: result ? result.wave : capped ? maxWaves + 1 : s.wave,
    won: !!result?.won,
    capped,
    stuck: !!stuckInfo || (!result && !capped),
    stuckInfo: stuckInfo ?? (!result && !capped ? `run not finished after ${t} ticks; seed ${setup.seed}, bot seed ${opts.botSeed}` : null),
    gatePct: s.gateMax > 0 ? Math.max(0, Math.round((100 * s.gateHp) / s.gateMax)) : 0,
    seconds: s.runT,
    longestQuiet: +longestQuiet.toFixed(2),
    longestQuietWave,
    goldEnd: s.gold,
    crestsEnd: s.crests,
    waves,
    loadout: JSON.parse(JSON.stringify(s.meta.loadout)),
    kills: stats.kills,
    causes,
    gateDamage,
    actionsPerSecond: presses / Math.max(1, totalBattleTicks / 60) / players,
    grabRate: grabs / Math.max(1, fieldPresses),
    kegsShaken: stats.kegsShaken,
    weaponShots: { ...stats.weaponShots },
    result,
    ticks: t,
  };
}

export const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
/** Value at a share of a sorted copy, nearest rank below. */
export const quantile = (a: number[], q: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length === 0 ? 0 : s[Math.floor(q * (s.length - 1))];
};
