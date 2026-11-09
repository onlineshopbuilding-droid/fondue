import { TUNING_DEFAULT } from '../../src/config/tuning';
import type { Difficulty } from '../../src/config/waves';
import { Bot, BOT_SKILLS } from '../../src/sim/bot';
import { Rng } from '../../src/sim/rng';
import { Sim } from '../../src/sim/sim';

export interface GameSetup {
  seed: number;
  skill: string;
  players: number;
  difficulty: Difficulty;
  fieldW?: number;
  cauldron?: 'front' | 'back';
  maxDay: number;
  /** Multiplies raider walk speed; only for experiments. */
  walkSpeed?: number;
}

export interface DayStat { kills: number; gold: number; offerings: number; gatePct: number; seconds: number; spawned: number; }

export interface GameResult {
  /** The day the run ended on: the first day that was lost, or maxDay + 1 if it got that far. */
  day: number;
  kills: number;
  owned: string[];
  /** Per finished day, index 0 is day 1. */
  days: DayStat[];
  /** What the run owned and carried when each day began. */
  snapshots: Record<number, { owned: string[]; gold: number; offerings: number }>;
  /** Gate damage per raider type on the last day played. */
  lastDayDamage: Record<string, number>;
  /** Kills by cause over the whole run. */
  causes: Record<string, number>;
  /** Raiders still alive when the run ended. */
  aliveAtEnd: Record<string, number>;
  /** Presses made per second of battle, and the share of field presses that caught something. */
  actionsPerSecond: number;
  grabRate: number;
  /** Times a pot or hook is used per day of the whole run. */
  potPerDay: number;
}

export function runGame(g: GameSetup): GameResult {
  const names = g.players === 2 ? ['A', 'B'] : ['A'];
  const sim = new Sim({
    seed: g.seed, difficulty: g.difficulty, names, tuning: { ...TUNING_DEFAULT, walkSpeed: g.walkSpeed ?? 1 }, fieldW: g.fieldW ?? 1280,
    flags: { cauldron: g.cauldron ?? 'front' },
  });
  const rng = new Rng(g.seed * 7 + 1);
  const bots = names.map((_, i) => new Bot(i, BOT_SKILLS[g.skill], () => rng.next()));
  const days: DayStat[] = [];
  const snapshots: GameResult['snapshots'] = {};
  const causes: Record<string, number> = {};
  let lastDayDamage: Record<string, number> = {};
  let lastStats = 0;
  let seenDay = 0;
  let battleTicks = 0;
  let spawned = 0;
  let presses = 0;
  let fieldPresses = 0;
  let grabs = 0;
  let totalBattleTicks = 0;
  const command = sim.command.bind(sim);
  sim.command = (c) => {
    if (c.k === 'press') { presses++; fieldPresses++; } else if (c.k === 'pressSlot') presses++;
    command(c);
  };
  // Enough for very long days; a stuck run ends here rather than hanging.
  for (let t = 0; t < 60 * 60 * 60 * 3; t++) {
    for (const b of bots) b.tick(sim);
    sim.step();
    if (sim.s.phase === 'battle') totalBattleTicks++;
    for (const ev of sim.drainEvents()) {
      if (ev.e === 'gateHit') lastDayDamage[ev.etype] = (lastDayDamage[ev.etype] ?? 0) + ev.amount;
      else if (ev.e === 'death') causes[ev.cause] = (causes[ev.cause] ?? 0) + 1;
      else if (ev.e === 'dayStart') lastDayDamage = {};
      else if (ev.e === 'grab' || ev.e === 'tapCart') grabs++;
    }
    const s = sim.s;
    if (s.day !== seenDay) {
      seenDay = s.day;
      battleTicks = 0;
      snapshots[s.day] = { owned: [...s.meta.owned], gold: s.gold, offerings: s.offerings };
    }
    if (s.phase === 'battle') { battleTicks++; spawned = s.spawned; }
    const last = s.meta.lastDay;
    if (last && last.day !== lastStats) {
      lastStats = last.day;
      days.push({ kills: last.kills, gold: last.goldEarned, offerings: last.offeringsEarned, gatePct: last.gatePct, seconds: battleTicks / 60, spawned });
    }
    if (s.phase === 'gameover' || s.day > g.maxDay) break;
  }
  const aliveAtEnd: Record<string, number> = {};
  for (const e of sim.s.enemies) aliveAtEnd[e.type] = (aliveAtEnd[e.type] ?? 0) + 1;
  const seconds = totalBattleTicks / 60;
  const pots = (causes.cauldron ?? 0) + (causes.eagle ?? 0);
  return {
    day: sim.s.day, kills: sim.s.meta.totalKills, owned: sim.s.meta.owned, days, snapshots, lastDayDamage, causes, aliveAtEnd,
    actionsPerSecond: presses / Math.max(1, seconds) / g.players, grabRate: grabs / Math.max(1, fieldPresses), potPerDay: pots / Math.max(1, days.length),
  };
}

export const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
