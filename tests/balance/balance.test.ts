// Balance measurement with the bots: endless waves reached and the campaign played level by level.
// Runs only with BALANCE=1 (`npm run balance`) and writes docs/balance-latest.md and docs/balance-latest.json.
// F2 (waves): nothing is bought during a run. Endless plays with the keep of a fresh profile; the campaign
// profile earns gold and cheese level by level and the bot spends them between attempts (src/bots/armoury.ts).
// Every run also reports its longest stretch without a living raider (B2: at most 5 s).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Difficulty } from '../../src/config/waves';
import { CampaignRunner, type CampaignRun } from '../../src/bots/campaignRunner';
import { mean, median, quantile, runGame, type GameResult } from '../../src/bots/harness';
import { BOT_SKILLS } from '../../src/bots/skills';
import { ENDLESS, completeTutorial } from '../../src/modes';
import { MemoryProfileStore, Profile } from '../../src/profile';

/** Which part to run: 'endless', 'campaign' or both. */
const PART = process.env.BALANCE_PART ?? 'all';
const RUNS = Number(process.env.BALANCE_RUNS ?? 30);
const LEVELS = (() => {
  const m = /^(\d+)(?:-(\d+))?$/.exec(process.env.BALANCE_LEVELS ?? '1-100');
  return m ? { from: Number(m[1]), to: Number(m[2] ?? m[1]) } : { from: 1, to: 100 };
})();
const MAX_WAVE = Number(process.env.BALANCE_MAX_WAVE ?? 70);
const MAX_TRIES = Number(process.env.BALANCE_TRIES ?? 6);
/** B2: never more than this many seconds without a living raider. */
const QUIET_MAX = 5;
const FIELD_W = 1280;
const MD = 'docs/balance-latest.md';
const JSON_FILE = 'docs/balance-latest.json';

interface Row { label: string; skill: string; players: number; difficulty: Difficulty }

const TIERS = ['poor', 'mid', 'great'];
const ENDLESS_ROWS: Row[] = [
  ...TIERS.map((skill) => ({ label: `${BOT_SKILLS[skill].name} solo`, skill, players: 1, difficulty: 'medium' as Difficulty })),
  ...TIERS.map((skill) => ({ label: `${BOT_SKILLS[skill].name} zu zweit`, skill, players: 2, difficulty: 'medium' as Difficulty })),
  { label: 'Mid solo Easy', skill: 'mid', players: 1, difficulty: 'easy' },
  { label: 'Mid solo Hard', skill: 'mid', players: 1, difficulty: 'hard' },
];
const CAMPAIGN_ROWS = [
  { label: 'Poor solo', skills: ['poor'] },
  { label: 'Mid solo', skills: ['mid'] },
  { label: 'Great solo', skills: ['great'] },
  { label: 'Mid zu zweit', skills: ['mid', 'mid'] },
];

interface EndlessRow {
  label: string; skill: string; players: number; difficulty: Difficulty; runs: number;
  median: number; p10: number; p90: number; min: number; max: number; waves: number[];
  /** Median sim seconds of a run. */
  runSeconds: number;
  /** Longest stretch without a living raider: worst run, median run, and runs over QUIET_MAX. */
  quietMax: number; quietMedian: number; quietOver: number;
  /** Gold earned in waves 1, 3, 5, 10, 20, 30, mean over runs that played that wave. */
  goldPerWave: Record<string, number>;
  /** Gate left in percent at the end of waves 1, 2, 3, 5. */
  gatePct: Record<string, number>;
  actionsPerSecond: number; grabRate: number; crestsPerRun: number; kegsShaken: number;
  weaponShots: Record<string, number>;
  stuck: string[];
  seconds: number;
}

interface CampaignSummary {
  label: string; skills: string[]; seconds: number; stoppedAt: number | null; firstTry: number; secondTry: number; later: number; never: number;
  /** Over all attempts: worst quiet stretch and attempts over QUIET_MAX; won levels whose last attempt was within ±50 % of targetSeconds. */
  quietMax: number; quietOver: number; nearTarget: number;
  levels: CampaignRun['levels'];
}

interface Report {
  date: string;
  endless?: { runs: number; maxWave: number; rows: EndlessRow[] };
  campaign?: { from: number; to: number; maxTries: number; rows: CampaignSummary[] };
}

/** Mean over runs that still played this wave. */
const onWave = (rs: GameResult[], w: number, f: (s: GameResult['waves'][number]) => number) => {
  const a = rs.filter((r) => r.waves[w - 1]).map((r) => f(r.waves[w - 1]));
  return a.length ? Math.round(mean(a)) : null;
};

async function endless(): Promise<NonNullable<Report['endless']>> {
  const profile = await Profile.load(new MemoryProfileStore());
  completeTutorial(profile, 'fondue');
  const rows: EndlessRow[] = [];
  for (const row of ENDLESS_ROWS) {
    const t0 = Date.now();
    const names = row.players === 2 ? ['A', 'B'] : ['A'];
    const rs = Array.from({ length: RUNS }, (_, i) => {
      const seed = 1000 + i * 37;
      const setup = ENDLESS.buildRun(profile, { world: 'fondue', difficulty: row.difficulty }, { names, fieldW: FIELD_W, handTiers: names.map(() => 1), seed });
      return runGame(setup, names.map(() => row.skill), { botSeed: seed * 7 + 1, maxWaves: MAX_WAVE, targetSeconds: 6 * 3600 });
    });
    const waves = rs.map((r) => r.wave).sort((a, b) => a - b);
    const quiet = rs.map((r) => r.longestQuiet);
    const shots: Record<string, number> = {};
    for (const r of rs) for (const [w, n] of Object.entries(r.weaponShots)) shots[w] = (shots[w] ?? 0) + n / RUNS;
    const goldPerWave: Record<string, number> = {};
    for (const w of [1, 3, 5, 10, 20, 30]) { const v = onWave(rs, w, (s) => s.gold); if (v !== null) goldPerWave[w] = v; }
    const gatePct: Record<string, number> = {};
    for (const w of [1, 2, 3, 5]) { const v = onWave(rs, w, (s) => s.gatePct); if (v !== null) gatePct[w] = v; }
    const r: EndlessRow = {
      label: row.label, skill: row.skill, players: row.players, difficulty: row.difficulty, runs: RUNS,
      median: median(waves), p10: quantile(waves, 0.1), p90: quantile(waves, 0.9), min: waves[0], max: waves[waves.length - 1], waves,
      runSeconds: Math.round(median(rs.map((x) => x.seconds))),
      quietMax: +Math.max(...quiet).toFixed(1), quietMedian: +median(quiet).toFixed(1), quietOver: quiet.filter((q) => q > QUIET_MAX).length,
      goldPerWave, gatePct,
      actionsPerSecond: +mean(rs.map((x) => x.actionsPerSecond)).toFixed(2),
      grabRate: +mean(rs.map((x) => x.grabRate)).toFixed(2),
      crestsPerRun: +mean(rs.map((x) => x.crestsEnd)).toFixed(1),
      kegsShaken: +mean(rs.map((x) => x.kegsShaken)).toFixed(1),
      weaponShots: Object.fromEntries(Object.entries(shots).map(([w, n]) => [w, +n.toFixed(1)])),
      stuck: rs.filter((x) => x.stuck).map((x) => x.stuckInfo ?? ''),
      seconds: (Date.now() - t0) / 1000,
    };
    rows.push(r);
    console.log(`endless ${r.label}: median wave ${r.median} (${r.p10}-${r.p90}), run ${r.runSeconds} s, quiet max ${r.quietMax} s (${r.quietOver} runs over ${QUIET_MAX} s), ${r.seconds.toFixed(1)} s`);
  }
  return { runs: RUNS, maxWave: MAX_WAVE, rows };
}

async function campaign(): Promise<NonNullable<Report['campaign']>> {
  const rows: CampaignSummary[] = [];
  for (const row of CAMPAIGN_ROWS) {
    const run = await new CampaignRunner({
      skills: row.skills, from: LEVELS.from, to: LEVELS.to, maxTries: MAX_TRIES, forceThrough: true, seed: 1, fieldW: FIELD_W,
      onLevel: (l) => { if (l.level % 10 === 0 || l.level === LEVELS.to) console.log(`campaign ${row.label}: level ${l.level}, ${l.tries} tries${l.forced ? ' (forced)' : ''}`); },
    }).run();
    const ls = run.levels;
    const quiet = ls.flatMap((l) => l.quietPerTry);
    const r: CampaignSummary = {
      label: row.label, skills: row.skills, seconds: run.seconds, stoppedAt: run.stoppedAt,
      firstTry: ls.filter((l) => l.won && l.tries === 1).length,
      secondTry: ls.filter((l) => l.won && l.tries === 2).length,
      later: ls.filter((l) => l.won && l.tries > 2).length,
      never: ls.filter((l) => !l.won).length,
      quietMax: +Math.max(0, ...quiet).toFixed(1), quietOver: quiet.filter((q) => q > QUIET_MAX).length,
      nearTarget: ls.filter((l) => l.won && Math.abs(l.secondsPerTry[l.secondsPerTry.length - 1] / l.targetSeconds - 1) <= 0.5).length,
      levels: ls,
    };
    rows.push(r);
    console.log(`campaign ${row.label}: won ${ls.length - r.never}/${ls.length} (first try ${r.firstTry}), near target ${r.nearTarget}, quiet max ${r.quietMax} s (${r.quietOver} attempts over ${QUIET_MAX} s), ${run.seconds.toFixed(1)} s`);
  }
  return { from: LEVELS.from, to: LEVELS.to, maxTries: MAX_TRIES, rows };
}

const pct = (v: number) => `${Math.round(100 * v)} %`;
const line = (rec: Record<string, number>, keys: number[]) => keys.map((k) => rec[k] ?? '–').join(' / ');

function render(rep: Report): string {
  const out: string[] = ['# Letzter Balance-Lauf', '', `Automatisch erzeugt von \`npm run balance\` am ${rep.date}. Maschinenlesbar: \`${JSON_FILE}\`.`, ''];
  if (rep.endless) {
    const e = rep.endless;
    out.push('## Endlos', '', `${e.runs} Läufe je Zeile mit der Burg eines frischen Profils nach dem Tutorial (nur das Rollrad), Abbruch nach Welle ${e.maxWave}. Medium, soweit nicht anders angegeben. Feldbreite ${FIELD_W}. „Ruhe“ = längste Strecke ohne lebenden Räuber (B2: höchstens ${QUIET_MAX} s).`, '');
    out.push('| Zeile | Median Welle | P10–P90 | Min–Max | Dauer (Median) | Ruhe max / Median / Läufe > 5 s | Gold je Welle (W1/3/5/10/20/30) | Tor % Welle 1/2/3/5 | Aktionen/s je Hand | Trefferquote Griff | Wappen je Lauf | Fässer geschüttelt | Laufzeit |');
    out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of e.rows) {
      out.push(`| ${r.label} | ${r.median} | ${r.p10}–${r.p90} | ${r.min}–${r.max} | ${r.runSeconds} s | ${r.quietMax} / ${r.quietMedian} / ${r.quietOver} | ${line(r.goldPerWave, [1, 3, 5, 10, 20, 30])} | ${line(r.gatePct, [1, 2, 3, 5])} | ${r.actionsPerSecond} | ${pct(r.grabRate)} | ${r.crestsPerRun} | ${r.kegsShaken} | ${r.seconds.toFixed(0)} s |`);
    }
    out.push('', '### Waffenschüsse je Lauf', '', '| Zeile | Schüsse |', '|---|---|');
    for (const r of e.rows) out.push(`| ${r.label} | ${Object.entries(r.weaponShots).map(([w, n]) => `${w} ${n}`).join(', ') || '–'} |`);
    const stuck = e.rows.flatMap((r) => r.stuck.map((s) => `- ${r.label}: ${s}`));
    if (stuck.length) out.push('', '### Hängende Läufe', '', ...stuck);
    out.push('');
  }
  if (rep.campaign) {
    const c = rep.campaign;
    out.push('## Kampagne', '', `Level ${c.from} bis ${c.to} in Reihenfolge mit einem Profil je Zeile, höchstens ${c.maxTries} Versuche je Level. Gold jedes Versuchs geht ins Profil; der Bot kauft nach jedem Versuch. Ein Level ohne Sieg gilt danach als geschafft (✗), damit die Messung weiterläuft.`, '');
    out.push('### Zusammenfassung', '', `„Nahe Soll“ = gewonnene Level, deren letzter Versuch höchstens 50 % von der geplanten Dauer abweicht. „Ruhe“ = längste Strecke ohne lebenden Räuber über alle Versuche (B2: höchstens ${QUIET_MAX} s).`, '');
    out.push('| Zeile | 1. Versuch | 2. Versuch | später | nie | nahe Soll | Ruhe max | Versuche > 5 s | Laufzeit |', '|---|---|---|---|---|---|---|---|---|');
    for (const r of c.rows) out.push(`| ${r.label} | ${r.firstTry} | ${r.secondTry} | ${r.later} | ${r.never} | ${r.nearTarget} | ${r.quietMax} s | ${r.quietOver} | ${r.seconds.toFixed(0)} s |`);
    out.push('', '### Je Level', '', 'Versuche (✗ = nie geschafft), Torleben am Ende des letzten Versuchs in Prozent und dessen Dauer in Sekunden.', '');
    out.push(`| Level | Boss | Wellen | Soll s | ${c.rows.map((r) => `${r.label}: Versuche | Tor % | s`).join(' | ')} |`);
    out.push(`|---|---|---|---|${c.rows.map(() => '---|---|---').join('|')}|`);
    const levels = new Set(c.rows.flatMap((r) => r.levels.map((l) => l.level)));
    for (const lv of [...levels].sort((a, b) => a - b)) {
      const cells: string[] = [];
      let boss = '';
      let waves = 0;
      let target = 0;
      for (const r of c.rows) {
        const l = r.levels.find((x) => x.level === lv);
        if (!l) { cells.push('–', '–', '–'); continue; }
        boss = l.boss ? 'ja' : '';
        waves = l.waves;
        target = l.targetSeconds;
        cells.push(l.won ? String(l.tries) : '✗', String(l.gatePct), String(Math.round(l.secondsPerTry[l.secondsPerTry.length - 1] ?? 0)));
      }
      out.push(`| ${lv} | ${boss} | ${waves} | ${target} | ${cells.join(' | ')} |`);
    }
    out.push('', '### Besitz am Ende', '', '| Zeile | Hand | Waffenstufen | Käse übrig | Gold übrig | Wappen übrig |', '|---|---|---|---|---|---|');
    for (const r of c.rows) {
      const l = r.levels[r.levels.length - 1];
      if (l) out.push(`| ${r.label} | ${l.handTier} | ${Object.entries(l.weaponTiers).map(([w, t]) => `${w} ${t}`).join(', ') || '–'} | ${l.cheeseLeft} | ${l.goldLeft} | ${l.crestsLeft} |`);
    }
    const stuck = c.rows.flatMap((r) => r.levels.filter((l) => l.stuck).map((l) => `- ${r.label}, Level ${l.level}: ${l.stuck}`));
    if (stuck.length) out.push('', '### Hängende Läufe', '', ...stuck);
    out.push('');
  }
  return out.join('\n');
}

it('balance report', async () => {
  // A part run keeps the other part of the last report.
  let rep: Report = { date: '' };
  if (existsSync(JSON_FILE)) { try { rep = JSON.parse(readFileSync(JSON_FILE, 'utf8')); } catch { rep = { date: '' }; } }
  // A report from before the waves (days, offerings) has another shape; it is not carried over.
  if (rep.endless && !('maxWave' in rep.endless)) delete rep.endless;
  if (rep.campaign && rep.campaign.rows.some((r) => !('quietMax' in r))) delete rep.campaign;
  rep.date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  if (PART === 'all' || PART === 'endless') rep.endless = await endless();
  if (PART === 'all' || PART === 'campaign') rep.campaign = await campaign();
  const md = render(rep);
  console.log(`\n${md}\n`);
  writeFileSync(MD, `${md}\n`);
  writeFileSync(JSON_FILE, `${JSON.stringify(rep, null, 1)}\n`);
}, 6 * 3600_000);
