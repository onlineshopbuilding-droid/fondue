import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { enemyCountForDay } from '../../src/sim/spawn';
import { BOT_SKILLS } from '../../src/sim/bot';
import type { Difficulty } from '../../src/config/waves';
import { mean, median, runGame, type GameResult } from './harness';

const MAX_DAY = 70;
const SEEDS = 30;

interface Row { label: string; skill: string; players: number; difficulty: Difficulty; fieldW?: number; cauldron?: 'front' | 'back' }

const TIERS = ['poor', 'mid', 'great'];
const ROWS: Row[] = [
  ...TIERS.map((skill) => ({ label: `${BOT_SKILLS[skill].name} solo`, skill, players: 1, difficulty: 'medium' as Difficulty })),
  ...TIERS.map((skill) => ({ label: `${BOT_SKILLS[skill].name} zu zweit`, skill, players: 2, difficulty: 'medium' as Difficulty })),
  { label: 'Mid solo Easy', skill: 'mid', players: 1, difficulty: 'easy' },
  { label: 'Mid solo Hard', skill: 'mid', players: 1, difficulty: 'hard' },
  { label: 'Mid solo Feld 1560', skill: 'mid', players: 1, difficulty: 'medium', fieldW: 1560 },
  { label: 'Great solo Feld 1560', skill: 'great', players: 1, difficulty: 'medium', fieldW: 1560 },
  { label: 'Mid solo Feld 1760', skill: 'mid', players: 1, difficulty: 'medium', fieldW: 1760 },
  { label: 'Great solo Feld 1760', skill: 'great', players: 1, difficulty: 'medium', fieldW: 1760 },
  { label: 'Mid solo Kessel hinten', skill: 'mid', players: 1, difficulty: 'medium', cauldron: 'back' },
  { label: 'Great solo Kessel hinten', skill: 'great', players: 1, difficulty: 'medium', cauldron: 'back' },
];

function runRow(r: Row): GameResult[] {
  return Array.from({ length: SEEDS }, (_, i) => runGame({ seed: 1000 + i * 37, skill: r.skill, players: r.players, difficulty: r.difficulty, fieldW: r.fieldW, cauldron: r.cauldron, maxDay: MAX_DAY }));
}

const stat = (rs: GameResult[]) => {
  const days = rs.map((r) => r.day).sort((a, b) => a - b);
  const q = (p: number) => days[Math.floor(p * (days.length - 1))];
  return { med: median(days), p10: q(0.1), p90: q(0.9), min: days[0], max: days[days.length - 1] };
};

/** Mean over runs that still played this day. */
const onDay = (rs: GameResult[], d: number, f: (r: GameResult) => number) => {
  const a = rs.filter((r) => r.days[d - 1]).map(f);
  return a.length ? mean(a) : 0;
};

function goldLine(rs: GameResult[]) {
  return [1, 3, 5, 10, 20, 30].map((d) => Math.round(onDay(rs, d, (r) => r.days[d - 1].gold))).join(' / ');
}

function pressure(rs: GameResult[]) {
  return [1, 2, 3, 5].map((d) => Math.round(onDay(rs, d, (r) => r.days[d - 1].gatePct))).join(' / ');
}

it('balance report', () => {
  const out: string[] = [];
  out.push('# Letzter Balance-Lauf');
  out.push('');
  out.push(`Automatisch erzeugt von \`npm run balance\`: ${SEEDS} Läufe je Zeile, Abbruch nach Tag ${MAX_DAY}. Medium, soweit nicht anders angegeben.`);
  out.push('');
  out.push('| Zeile | Median | P10–P90 | Min–Max | Upgrades | Gold pro Tag (T1/3/5/10/20/30) | Gate % Tag 1/2/3/5 | Griffe/s je Hand | Trefferquote Grab | Opfer je Tag |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  const results: Record<string, GameResult[]> = {};
  for (const row of ROWS) {
    const rs = runRow(row);
    results[row.label] = rs;
    const s = stat(rs);
    out.push(`| ${row.label} | ${s.med} | ${s.p10}–${s.p90} | ${s.min}–${s.max} | ${mean(rs.map((r) => r.owned.length)).toFixed(1)}/22 | ${goldLine(rs)} | ${pressure(rs)} | ${mean(rs.map((r) => r.actionsPerSecond)).toFixed(2)} | ${Math.round(100 * mean(rs.map((r) => r.grabRate)))} % | ${mean(rs.map((r) => r.potPerDay)).toFixed(1)} |`);
  }
  out.push('');
  out.push('## Raider pro Sekunde auf den ersten Tagen (Medium)');
  out.push('');
  out.push('| Tag | solo: Raider / Tag | solo: pro s | zu zweit: Raider / Tag | zu zweit: pro s | je Hand zu zweit |');
  out.push('|---|---|---|---|---|---|');
  for (const d of [1, 2, 3, 4, 5, 7]) {
    const a = enemyCountForDay(d, 'medium', 1, 1);
    const b = enemyCountForDay(d, 'medium', 2, 1);
    out.push(`| ${d} | ${a} | ${(a / 50).toFixed(2)} | ${b} | ${(b / 50).toFixed(2)} | ${(b / 100).toFixed(2)} |`);
  }
  const report = out.join('\n');
  console.log(`\n${report}\n`);
  writeFileSync('docs/balance-latest.md', `${report}\n`);
}, 900_000);
