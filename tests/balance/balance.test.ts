import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import type { Difficulty } from '../../src/config/waves';
import { Bot, BOT_SKILLS } from '../../src/sim/bot';
import { Rng } from '../../src/sim/rng';
import { Sim } from '../../src/sim/sim';

const MAX_DAY = 40;
const SEEDS = 10;

interface Result { day: number; kills: number; goldPerDay: number[]; owned: number; offerings: number; }

function run(seed: number, skill: string, players: number, difficulty: Difficulty): Result {
  const names = players === 2 ? ['A', 'B'] : ['A'];
  const sim = new Sim({ seed, difficulty, names, tuning: { ...TUNING_DEFAULT } });
  const rng = new Rng(seed * 7 + 1);
  const bots = names.map((_, i) => new Bot(i, BOT_SKILLS[skill], () => rng.next()));
  const goldPerDay: number[] = [];
  let totalOfferings = 0;
  let lastDay = 1;
  let lastStats = 0;
  for (let t = 0; t < 60 * 60 * 60; t++) {
    for (const b of bots) b.tick(sim);
    sim.step();
    sim.drainEvents();
    if (sim.s.meta.lastDay && sim.s.meta.lastDay.day !== lastStats) {
      lastStats = sim.s.meta.lastDay.day;
      goldPerDay.push(sim.s.meta.lastDay.goldEarned);
      totalOfferings += sim.s.meta.lastDay.offeringsEarned;
    }
    lastDay = sim.s.day;
    if (sim.s.phase === 'gameover' || sim.s.day > MAX_DAY) break;
  }
  return { day: lastDay, kills: sim.s.meta.totalKills, goldPerDay, owned: sim.s.meta.owned.length, offerings: totalOfferings };
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

it('balance report', () => {
  const lines: string[] = [];
  lines.push('| Bot | Spieler | Stufe | Tag erreicht (Mittel, min-max) | Kills | Upgrades | Offerings gesamt | Gold Tag 1/3/7 |');
  lines.push('|---|---|---|---|---|---|---|---|');
  const table: [string, number, Difficulty][] = [
    ['beginner', 1, 'medium'], ['average', 1, 'medium'], ['pro', 1, 'medium'],
    ['beginner', 2, 'medium'], ['average', 2, 'medium'], ['pro', 2, 'medium'],
    ['average', 1, 'easy'], ['average', 1, 'hard'],
  ];
  for (const [skill, players, diff] of table) {
    const rs = Array.from({ length: SEEDS }, (_, i) => run(1000 + i * 37, skill, players, diff));
    const days = rs.map((r) => r.day);
    const g = (d: number) => Math.round(avg(rs.map((r) => r.goldPerDay[d - 1] ?? 0)));
    lines.push(`| ${BOT_SKILLS[skill].name} | ${players} | ${diff} | ${avg(days).toFixed(1)} (${Math.min(...days)}-${Math.max(...days)}) | ${Math.round(avg(rs.map((r) => r.kills)))} | ${avg(rs.map((r) => r.owned)).toFixed(1)}/22 | ${Math.round(avg(rs.map((r) => r.offerings)))} | ${g(1)}/${g(3)}/${g(7)} |`);
  }
  const report = lines.join('\n');
  console.log(`\n${report}\n`);
  writeFileSync('docs/balance-latest.md', `${report}\n`);
}, 600_000);
