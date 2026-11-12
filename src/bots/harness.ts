// Plays one run headless with a bot per player and counts what happened: days, gold, purchases, the result.
// Bots draw from their own seeded random stream, so the same setup and seed always give the same run.
import { Rng } from '../sim/rng';
import type { Loadout, RunResult, RunSetup } from '../sim/rules';
import { Sim } from '../sim/sim';
import { Bot } from './bot';
import { skillOf, type BotSkill } from './skills';

export interface RunOptions {
  /** Start of the bots' own random stream. */
  botSeed: number;
  /** Stop once this day is won (endless); the result then says `day = maxDays + 1`. */
  maxDays?: number;
  /** A day whose fight lasts this much longer than planned counts as stuck and ends the run. */
  stuckSeconds?: number;
}

export interface DayStat { day: number; kills: number; gold: number; offerings: number; gatePct: number; seconds: number; spawned: number }

export interface GameResult {
  /** The day the run ended on: the day that was lost, the last day of a won level, or maxDays + 1. */
  day: number;
  won: boolean;
  /** Stopped at maxDays without being decided. */
  capped: boolean;
  /** A fight that would not end; see `stuckInfo`. */
  stuck: boolean;
  stuckInfo: string | null;
  /** Gate hit points left at the end, in percent. */
  gatePct: number;
  /** Gold and offerings held when each day began (index 0 is day 1) and at the end. */
  goldAtDayStart: number[];
  goldEnd: number;
  offeringsEnd: number;
  /** Per finished day, index 0 is day 1. */
  days: DayStat[];
  /** Every purchase, as market item names, in order. */
  bought: string[];
  loadout: Loadout;
  kills: number;
  /** Kills by cause over the whole run. */
  causes: Record<string, number>;
  /** Gate damage per raider type over the run. */
  gateDamage: Record<string, number>;
  /** Presses and weapon taps per second of battle per hand, and the share of field presses that caught something. */
  actionsPerSecond: number;
  grabRate: number;
  /** Raiders given to the pot or the eagle per finished day. */
  offeringsPerDay: number;
  kegsShaken: number;
  weaponShots: Record<string, number>;
  /** Simulation result, null when the run was stopped early. */
  result: RunResult | null;
  ticks: number;
}

/** Plays the run to its end, or to `maxDays`, with one bot of the given skill per player. */
export function runGame(setup: RunSetup, skills: (string | BotSkill)[], opts: RunOptions): GameResult {
  const sim = new Sim(setup);
  const players = setup.names.length;
  const rng = new Rng(opts.botSeed);
  const rand = () => rng.next();
  const bots = Array.from({ length: players }, (_, i) => new Bot(i, skillOf(skills[i] ?? skills[0]), rand));
  const maxDays = opts.maxDays ?? Infinity;
  const stuckSeconds = opts.stuckSeconds ?? 300;

  const days: DayStat[] = [];
  const goldAtDayStart: number[] = [];
  const causes: Record<string, number> = {};
  const gateDamage: Record<string, number> = {};
  let seenDay = 0;
  let battleTicks = 0;
  let totalBattleTicks = 0;
  let presses = 0;
  let fieldPresses = 0;
  let grabs = 0;
  let stuckInfo: string | null = null;
  const command = sim.command.bind(sim);
  sim.command = (c) => {
    if (c.k === 'press') { presses++; fieldPresses++; } else if (c.k === 'fireSlot') presses++;
    command(c);
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
    if (s.day !== seenDay) {
      seenDay = s.day;
      battleTicks = 0;
      goldAtDayStart[s.day - 1] = s.gold;
    }
    if (s.phase === 'battle') {
      battleTicks++;
      totalBattleTicks++;
      if (battleTicks / 60 > s.meta.today.seconds + stuckSeconds) {
        const left = s.enemies.map((e) => `${e.type}${e.big ? '(big)' : ''}:${e.st}@${Math.round(e.x)},${Math.round(e.y)}`).join(' ');
        stuckInfo = `day ${s.day} still fighting after ${Math.round(battleTicks / 60)} s; seed ${setup.seed}, bot seed ${opts.botSeed}; left: ${left}`;
        break;
      }
    }
    const last = s.meta.lastDay;
    if (last && last.day > days.length) {
      days.push({ day: last.day, kills: last.kills, gold: last.goldEarned, offerings: last.offeringsEarned, gatePct: last.gatePct, seconds: battleTicks / 60, spawned: s.spawned });
    }
    if (s.meta.result || s.day > maxDays) break;
  }
  const s = sim.s;
  const result = s.meta.result;
  const capped = !result && s.day > maxDays;
  const seconds = totalBattleTicks / 60;
  const stats = s.stats;
  return {
    day: result ? result.day : capped ? maxDays + 1 : s.day,
    won: !!result?.won,
    capped,
    stuck: !!stuckInfo || (!result && !capped),
    stuckInfo: stuckInfo ?? (!result && !capped ? `run not finished after ${t} ticks; seed ${setup.seed}, bot seed ${opts.botSeed}` : null),
    gatePct: s.gateMax > 0 ? Math.max(0, Math.round((100 * s.gateHp) / s.gateMax)) : 0,
    goldAtDayStart,
    goldEnd: s.gold,
    offeringsEnd: s.offerings,
    days,
    bought: bots.flatMap((b) => b.shopper.bought),
    loadout: JSON.parse(JSON.stringify(s.meta.loadout)),
    kills: stats.kills,
    causes,
    gateDamage,
    actionsPerSecond: presses / Math.max(1, seconds) / players,
    grabRate: grabs / Math.max(1, fieldPresses),
    offeringsPerDay: stats.offerings / Math.max(1, days.length),
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
