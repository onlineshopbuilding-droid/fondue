// Balance measurement with the bots (Etappe 4): the campaign played level by level by bots that spend between
// levels like players (src/bots/armoury.ts), farm endless when stuck, and endless runs with a keep a player has
// at level 20 and 60. Runs only with BALANCE=1 (`npm run balance`) and writes docs/balance-latest.md and .json.
// Every run also reports its longest stretch without a living raider (B2: at most 5 s).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Difficulty } from '../../src/config/waves';
import { levelOf } from '../../src/config/worlds';
import { weaponById } from '../../src/config/weapons';
import { SLOTS } from '../../src/config/slots';
import type { SpendStyle } from '../../src/bots/armoury';
import { CampaignRunner, type CampaignOptions, type CampaignRun } from '../../src/bots/campaignRunner';
import { mean, median, quantile, runGame } from '../../src/bots/harness';
import { ENDLESS, slotRole, weaponRole } from '../../src/modes';
import { MemoryProfileStore, Profile } from '../../src/profile';

/** Which part to run: 'endless', 'campaign' or both (endless needs the campaign's keeps, so it runs the Mid campaign too). */
const PART = process.env.BALANCE_PART ?? 'all';
/** Only campaign rows whose label contains this text (empty = all). */
const ROW_FILTER = process.env.BALANCE_ROWS ?? '';
const RUNS = Number(process.env.BALANCE_RUNS ?? 20);
const LEVELS = (() => {
  const m = /^(\d+)(?:-(\d+))?$/.exec(process.env.BALANCE_LEVELS ?? '1-100');
  return m ? { from: Number(m[1]), to: Number(m[2] ?? m[1]) } : { from: 1, to: 100 };
})();
const MAX_WAVE = Number(process.env.BALANCE_MAX_WAVE ?? 60);
const MAX_TRIES = Number(process.env.BALANCE_TRIES ?? 6);
/** B2: never more than this many seconds without a living raider. */
const QUIET_MAX = 5;
const FIELD_W = 1280;
const MD = 'docs/balance-latest.md';
const JSON_FILE = 'docs/balance-latest.json';
/** Keeps for the endless rows: the Mid player's profile after these levels. */
const KEEP_LEVELS = [20, 60];

interface CampaignRowDef { label: string; skills: string[]; style: SpendStyle; farm: CampaignOptions['farm']; farmDifficulty?: Difficulty }
const CAMPAIGN_ROWS: CampaignRowDef[] = [
  { label: 'Poor solo', skills: ['poor'], style: { personality: 1, upgrades: true }, farm: 'stuck', farmDifficulty: 'easy' },
  { label: 'Mid solo', skills: ['mid'], style: { personality: 1, upgrades: true }, farm: 'stuck' },
  { label: 'Mid solo B', skills: ['mid'], style: { personality: 2, upgrades: true }, farm: 'stuck' },
  { label: 'Mid solo C', skills: ['mid'], style: { personality: 6, upgrades: true }, farm: 'stuck' },
  { label: 'Great solo', skills: ['great'], style: { personality: 4, upgrades: true }, farm: 'stuck', farmDifficulty: 'hard' },
  { label: 'Mid ohne Ausbau', skills: ['mid'], style: { personality: 1, upgrades: false }, farm: 'never' },
  { label: 'Mid Farmer', skills: ['mid'], style: { personality: 1, upgrades: true }, farm: 'always' },
  { label: 'Mid zu zweit', skills: ['mid', 'mid'], style: { personality: 1, upgrades: true }, farm: 'stuck' },
];

interface EndlessRowDef { label: string; skill: string; players: number; difficulty: Difficulty; keep: number }
const ENDLESS_ROWS: EndlessRowDef[] = [
  ...KEEP_LEVELS.flatMap((keep) => (['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => ({ label: `Mid ${difficulty}, Burg L${keep}`, skill: 'mid', players: 1, difficulty, keep }))),
  { label: 'Poor medium, Burg L20', skill: 'poor', players: 1, difficulty: 'medium', keep: 20 },
  { label: 'Great medium, Burg L20', skill: 'great', players: 1, difficulty: 'medium', keep: 20 },
  { label: 'Great hard, Burg L60', skill: 'great', players: 1, difficulty: 'hard', keep: 60 },
  { label: 'Mid zu zweit medium, Burg L20', skill: 'mid', players: 2, difficulty: 'medium', keep: 20 },
];

/** Level groups of the plan (B1): early levels 1-2 min, the middle 3-5 min, boss and special levels 6-10 min. */
type LevelKind = 'early' | 'middle' | 'boss';
const kindOf = (level: number): LevelKind => {
  const def = levelOf('fondue', level)!;
  if (def.boss || def.twist) return 'boss';
  return level <= 10 ? 'early' : 'middle';
};
const KIND_RANGE: Record<LevelKind, [number, number]> = { early: [60, 120], middle: [180, 300], boss: [360, 600] };
const KIND_NAME: Record<LevelKind, string> = { early: 'früh (1–10)', middle: 'Mitte', boss: 'Boss und Sonder' };
const SECTIONS: [number, number][] = [[1, 25], [26, 50], [51, 75], [76, 100]];

interface CampaignSummary {
  label: string; skills: string[]; personality: number; upgrades: boolean; farm: string; seconds: number;
  firstTry: number; secondTry: number; later: number; never: number;
  /** First level not won within MAX_TRIES (null = all won). */
  firstStuck: number | null;
  /** Mean attempts per level by section, of boss levels and of the rest. */
  triesBySection: number[]; triesBoss: number; triesNormal: number;
  /** Endless runs played for gold, and their sim minutes. */
  farmRuns: number; farmMinutes: number;
  quietMax: number; quietOver: number;
  /** Gate left after the last attempt, median per section. */
  gateBySection: number[];
  /** Levels each weapon was worn in (last attempt). */
  worn: Record<string, number>;
  levels: CampaignRun['levels'];
}

interface EndlessRow {
  label: string; skill: string; players: number; difficulty: Difficulty; keep: number; runs: number;
  median: number; p10: number; p90: number; runSeconds: number;
  goldPerRun: number; goldPerMinute: number; crestsPerRun: number;
  quietMax: number; quietOver: number;
}

interface Report {
  date: string;
  campaign?: { from: number; to: number; maxTries: number; rows: CampaignSummary[] };
  endless?: { runs: number; maxWave: number; rows: EndlessRow[] };
}

const avg = (a: number[]) => (a.length ? +mean(a).toFixed(2) : 0);

async function campaign(rowDefs: CampaignRowDef[], keeps: Record<number, unknown>): Promise<CampaignSummary[]> {
  const rows: CampaignSummary[] = [];
  for (const row of rowDefs) {
    const run = await new CampaignRunner({
      skills: row.skills, from: LEVELS.from, to: LEVELS.to, maxTries: MAX_TRIES, forceThrough: true, seed: 1, fieldW: FIELD_W,
      style: row.style, farm: row.farm, farmDifficulty: row.farmDifficulty, snapshots: row.label === 'Mid solo' ? KEEP_LEVELS : [],
      onLevel: (l) => { if (l.level % 25 === 0 || l.level === LEVELS.to) console.log(`campaign ${row.label}: level ${l.level}, ${l.tries} tries${l.forced ? ' (forced)' : ''}`); },
    }).run();
    if (row.label === 'Mid solo') Object.assign(keeps, run.snapshots);
    const ls = run.levels;
    const quiet = ls.flatMap((l) => l.quietPerTry);
    const worn: Record<string, number> = {};
    for (const l of ls) for (const id of l.keep.slotWeapon) if (id) worn[id] = (worn[id] ?? 0) + 1;
    const r: CampaignSummary = {
      label: row.label, skills: row.skills, personality: row.style.personality, upgrades: row.style.upgrades, farm: row.farm ?? 'never', seconds: run.seconds,
      firstTry: ls.filter((l) => l.won && l.tries === 1).length,
      secondTry: ls.filter((l) => l.won && l.tries === 2).length,
      later: ls.filter((l) => l.won && l.tries > 2).length,
      never: ls.filter((l) => !l.won).length,
      firstStuck: ls.find((l) => !l.won)?.level ?? null,
      triesBySection: SECTIONS.map(([a, b]) => avg(ls.filter((l) => l.level >= a && l.level <= b).map((l) => l.tries))),
      triesBoss: avg(ls.filter((l) => l.boss).map((l) => l.tries)),
      triesNormal: avg(ls.filter((l) => !l.boss).map((l) => l.tries)),
      farmRuns: ls.reduce((n, l) => n + l.farm.length, 0),
      farmMinutes: Math.round(ls.reduce((n, l) => n + l.farm.reduce((m, f) => m + f.seconds, 0), 0) / 60),
      quietMax: +Math.max(0, ...quiet).toFixed(1), quietOver: quiet.filter((q) => q > QUIET_MAX).length,
      gateBySection: SECTIONS.map(([a, b]) => median(ls.filter((l) => l.level >= a && l.level <= b).map((l) => l.gatePct))),
      worn,
      levels: ls,
    };
    rows.push(r);
    console.log(`campaign ${r.label}: first stuck ${r.firstStuck}, first try ${r.firstTry}, never ${r.never}, tries by section ${r.triesBySection.join('/')}, boss ${r.triesBoss} vs ${r.triesNormal}, farm ${r.farmRuns} runs, ${run.seconds.toFixed(1)} s`);
  }
  return rows;
}

async function endless(keeps: Record<number, unknown>): Promise<EndlessRow[]> {
  const rows: EndlessRow[] = [];
  for (const row of ENDLESS_ROWS) {
    if (!keeps[row.keep]) continue;
    const names = row.players === 2 ? ['A', 'B'] : ['A'];
    const profile = await Profile.load(new MemoryProfileStore());
    profile.replace(keeps[row.keep]);
    const hand = profile.data.keep.handTier;
    const rs = Array.from({ length: RUNS }, (_, i) => {
      const seed = 1000 + i * 37;
      const setup = ENDLESS.buildRun(profile, { world: 'fondue', difficulty: row.difficulty }, { names, fieldW: FIELD_W, handTiers: names.map(() => hand), seed });
      return runGame(setup, names.map(() => row.skill), { botSeed: seed * 7 + 1, maxWaves: MAX_WAVE, targetSeconds: 6 * 3600 });
    });
    const waves = rs.map((r) => r.wave);
    const quiet = rs.map((r) => r.longestQuiet);
    const gold = mean(rs.map((r) => r.goldEnd));
    const minutes = mean(rs.map((r) => r.seconds)) / 60;
    const r: EndlessRow = {
      label: row.label, skill: row.skill, players: row.players, difficulty: row.difficulty, keep: row.keep, runs: RUNS,
      median: median(waves), p10: quantile(waves, 0.1), p90: quantile(waves, 0.9), runSeconds: Math.round(median(rs.map((x) => x.seconds))),
      goldPerRun: Math.round(gold), goldPerMinute: Math.round(gold / Math.max(0.01, minutes)), crestsPerRun: +mean(rs.map((x) => x.crestsEnd)).toFixed(1),
      quietMax: +Math.max(...quiet).toFixed(1), quietOver: quiet.filter((q) => q > QUIET_MAX).length,
    };
    rows.push(r);
    console.log(`endless ${r.label}: median wave ${r.median}, ${r.goldPerMinute} gold/min`);
  }
  return rows;
}

const ok = (b: boolean) => (b ? 'erfüllt' : '**nicht erfüllt**');

function goals(rep: Report): string[] {
  const rows = rep.campaign?.rows ?? [];
  const by = (label: string) => rows.find((r) => r.label === label);
  const out = ['## Ziele auf einen Blick', '', '| Ziel | Messwert | Soll | Ergebnis |', '|---|---|---|---|'];
  const noUp = by('Mid ohne Ausbau');
  const mid = by('Mid solo');
  const great = by('Great solo');
  const farmer = by('Mid Farmer');
  const duo = by('Mid zu zweit');
  if (noUp) out.push(`| B5 ohne Ausbau | Mid ohne Ausbau scheitert zuerst an Level ${noUp.firstStuck ?? '–'} | vor Level 30 | ${ok(noUp.firstStuck !== null && noUp.firstStuck < 30)} |`);
  if (mid && noUp) out.push(`| B5 mit Ausbau | Mid scheitert zuerst an Level ${mid.firstStuck ?? '– (nie)'}, nie geschafft: ${mid.never} | weiter als ohne Ausbau | ${ok((mid.firstStuck ?? 101) > (noUp.firstStuck ?? 101))} |`);
  if (great) out.push(`| B5/G1 Great spät mehr Versuche | Versuche je Level 1–25 / 26–50 / 51–75 / 76–100: ${great.triesBySection.join(' / ')}; Boss ${great.triesBoss}, sonst ${great.triesNormal} | spät und Boss spürbar mehr als früh | ${ok(great.triesBySection[3] >= great.triesBySection[0] + 0.3 && great.triesBoss >= great.triesNormal + 0.3)} |`);
  if (farmer) out.push(`| A3 Farmer | Farmer 76–100: ${farmer.triesBySection[3]} Versuche je Level, Tor im Median ${farmer.gateBySection[3]} %, nie geschafft ${farmer.never} | späte Kampagne nicht mühelos (mehr als 1,2 Versuche oder Tor unter 80 %) | ${ok(farmer.triesBySection[3] > 1.2 || farmer.gateBySection[3] < 80)} |`);
  if (duo && mid) {
    const s = (r: CampaignSummary) => avg(r.levels.map((l) => l.tries));
    out.push(`| E2 zu zweit | Mid zu zweit: ${s(duo)} Versuche je Level, ${duo.firstTry} im 1. Versuch; Mid allein: ${s(mid)}, ${mid.firstTry} | zu zweit nicht leichter | ${ok(s(duo) >= s(mid) - 0.05 && duo.firstTry <= mid.firstTry + 2)} |`);
  }
  if (mid) {
    const d = durations(mid);
    for (const k of ['early', 'middle', 'boss'] as LevelKind[]) out.push(`| B1 Länge ${KIND_NAME[k]} | Median ${d[k].median} s, ${d[k].inRange} von ${d[k].n} im Bereich | ${KIND_RANGE[k][0]}–${KIND_RANGE[k][1]} s | ${ok(d[k].median >= KIND_RANGE[k][0] && d[k].median <= KIND_RANGE[k][1])} |`);
  }
  if (rows.length) {
    const q = Math.max(...rows.map((r) => r.quietMax));
    out.push(`| B2 Pausen | längste Strecke ohne lebenden Räuber über alle Zeilen und Versuche: ${q} s | höchstens ${QUIET_MAX} s | ${ok(q <= QUIET_MAX)} |`);
    const use = weaponUse(rows);
    const worst = Math.min(...Object.values(use).map((u) => u.length));
    out.push(`| C3 Waffen je Slot | ${Object.entries(use).map(([slot, ids]) => `${slot} ${ids.length}`).join(', ')} | je Slot mindestens 3 | ${ok(worst >= 3)} |`);
  }
  if (rep.endless) {
    const e = rep.endless.rows.filter((r) => r.skill === 'mid' && r.players === 1);
    out.push(`| E1 Gold je Minute | ${e.map((r) => `${r.label}: ${r.goldPerMinute}`).join('; ')} | steigt mit der Schwierigkeit | ${ok(KEEP_LEVELS.every((k) => { const g = ['easy', 'medium', 'hard'].map((d) => e.find((r) => r.keep === k && r.difficulty === d)?.goldPerMinute ?? 0); return g[0] < g[1] && g[1] < g[2]; }))} |`);
  }
  out.push('| A4 Wappen-Grind | siehe Abschnitt „A4 Wappen-Grind“ in docs/balance.md | Median 20–30 Runden | noch nicht gemessen |', '');
  return out;
}

function durations(r: CampaignSummary): Record<LevelKind, { n: number; median: number; inRange: number }> {
  const out = {} as Record<LevelKind, { n: number; median: number; inRange: number }>;
  for (const k of ['early', 'middle', 'boss'] as LevelKind[]) {
    const secs = r.levels.filter((l) => l.won && kindOf(l.level) === k).map((l) => l.secondsPerTry[l.secondsPerTry.length - 1]);
    out[k] = { n: secs.length, median: Math.round(median(secs)), inRange: secs.filter((s) => s >= KIND_RANGE[k][0] && s <= KIND_RANGE[k][1]).length };
  }
  return out;
}

/** Weapons worn in at least 5 levels by any bot, per slot. */
function weaponUse(rows: CampaignSummary[]): Record<string, string[]> {
  const total: Record<string, number> = {};
  for (const r of rows) for (const [id, n] of Object.entries(r.worn)) total[id] = (total[id] ?? 0) + n;
  const out: Record<string, string[]> = {};
  SLOTS.forEach((_, i) => {
    const role = slotRole(i) ?? String(i);
    out[role] = Object.keys(total).filter((id) => { const d = weaponById(id); return d && weaponRole(d) === role && total[id] >= 5; });
  });
  return out;
}

function render(rep: Report): string {
  const out: string[] = ['# Letzter Balance-Lauf', '', `Automatisch erzeugt von \`npm run balance\` am ${rep.date}. Maschinenlesbar: \`${JSON_FILE}\`. Erklärung und Ziele: \`docs/balance.md\`.`, ''];
  out.push(...goals(rep));
  if (rep.campaign) {
    const c = rep.campaign;
    out.push('## Kampagne', '', `Level ${c.from} bis ${c.to} in Reihenfolge, ein Profil je Zeile, höchstens ${c.maxTries} Versuche je Level. Das Gold jedes Versuchs bleibt; der Bot kauft nach jedem Versuch (freischalten mit Käse, ausbauen mit Gold, anlegen). „Farm“: stuck = nach 2 verlorenen Versuchen Endlos-Läufe für Gold (sobald Endlos offen ist); always = vor jedem Level, solange Gold fehlt. Ein Level ohne Sieg gilt danach als geschafft (✗), damit die Messung weiterläuft.`, '');
    out.push('| Zeile | Geschmack | Ausbau | Farm | 1. Versuch | 2. Versuch | später | nie | zuerst gescheitert | Versuche 1–25 / 26–50 / 51–75 / 76–100 | Boss / sonst | Tor % (Median je Abschnitt) | Farm-Läufe (min) | Ruhe max | Laufzeit |');
    out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of c.rows) {
      out.push(`| ${r.label} | ${r.personality} | ${r.upgrades ? 'ja' : 'nein'} | ${r.farm} | ${r.firstTry} | ${r.secondTry} | ${r.later} | ${r.never} | ${r.firstStuck ?? '–'} | ${r.triesBySection.join(' / ')} | ${r.triesBoss} / ${r.triesNormal} | ${r.gateBySection.join(' / ')} | ${r.farmRuns} (${r.farmMinutes}) | ${r.quietMax} s | ${r.seconds.toFixed(0)} s |`);
    }
    const mid = c.rows.find((r) => r.label === 'Mid solo');
    if (mid) {
      const d = durations(mid);
      out.push('', '### Levellängen (Mid solo, letzter Versuch gewonnener Level)', '', '| Gruppe | Level | Median | im Bereich | Soll |', '|---|---|---|---|---|');
      for (const k of ['early', 'middle', 'boss'] as LevelKind[]) out.push(`| ${KIND_NAME[k]} | ${d[k].n} | ${d[k].median} s | ${d[k].inRange} | ${KIND_RANGE[k][0]}–${KIND_RANGE[k][1]} s |`);
    }
    out.push('', '### Waffen je Slot (C3)', '', 'Level, in denen eine Waffe angelegt war (letzter Versuch), über alle Zeilen. Gezählt als „genutzt“ ab 5 Leveln.', '', '| Slot | Waffen |', '|---|---|');
    const total: Record<string, number> = {};
    for (const r of c.rows) for (const [id, n] of Object.entries(r.worn)) total[id] = (total[id] ?? 0) + n;
    SLOTS.forEach((_, i) => {
      const role = slotRole(i) ?? String(i);
      const ids = Object.entries(total).filter(([id]) => { const d = weaponById(id); return d && weaponRole(d) === role; }).sort((a, b) => b[1] - a[1]);
      out.push(`| ${role} | ${ids.map(([id, n]) => `${id} ${n}`).join(', ') || '–'} |`);
    });
    out.push('', '### Je Level', '', 'Versuche (✗ = nie geschafft), Torleben am Ende des letzten Versuchs in Prozent und dessen Dauer in Sekunden.', '');
    const shown = c.rows.filter((r) => ['Poor solo', 'Mid solo', 'Great solo', 'Mid ohne Ausbau', 'Mid Farmer', 'Mid zu zweit'].includes(r.label));
    out.push(`| Level | Art | Soll s | ${shown.map((r) => `${r.label}: Versuche | Tor % | s`).join(' | ')} |`);
    out.push(`|---|---|---|${shown.map(() => '---|---|---').join('|')}|`);
    for (let lv = c.from; lv <= c.to; lv++) {
      const def = levelOf('fondue', lv);
      if (!def) continue;
      const cells = shown.flatMap((r) => {
        const l = r.levels.find((x) => x.level === lv);
        return l ? [l.won ? String(l.tries) : '✗', String(l.gatePct), String(Math.round(l.secondsPerTry[l.secondsPerTry.length - 1] ?? 0))] : ['–', '–', '–'];
      });
      out.push(`| ${lv} | ${def.boss ? 'Boss' : def.twist ? 'Sonder' : ''} | ${def.targetSeconds} | ${cells.join(' | ')} |`);
    }
    out.push('', '### Besitz am Ende', '', '| Zeile | Burg | Hand | angelegt | Käse übrig | Gold übrig | Wappen übrig |', '|---|---|---|---|---|---|---|');
    for (const r of c.rows) {
      const l = r.levels[r.levels.length - 1];
      if (l) out.push(`| ${r.label} | ${l.keep.gateTier + 1} | ${l.handTier} | ${l.keep.slotWeapon.map((id) => (id ? `${id} ${l.weaponTiers[id]}` : '–')).join(', ')} | ${l.cheeseLeft} | ${l.goldLeft} | ${l.crestsLeft} |`);
    }
    const stuck = c.rows.flatMap((r) => r.levels.filter((l) => l.stuck).map((l) => `- ${r.label}, Level ${l.level}: ${l.stuck}`));
    if (stuck.length) out.push('', '### Hängende Läufe', '', ...stuck);
    out.push('');
  }
  if (rep.endless) {
    const e = rep.endless;
    out.push('## Endlos', '', `${e.runs} Läufe je Zeile mit der Burg, die der Mid-Bot in der Kampagne nach Level 20 beziehungsweise 60 hatte. Abbruch nach Welle ${e.maxWave}. Gold je Minute = Gold eines Laufs durch seine Dauer.`, '');
    out.push('| Zeile | Median Welle | P10–P90 | Dauer (Median) | Gold je Lauf | Gold je Minute | Wappen je Lauf | Ruhe max / Läufe > 5 s |', '|---|---|---|---|---|---|---|---|');
    for (const r of e.rows) out.push(`| ${r.label} | ${r.median} | ${r.p10}–${r.p90} | ${r.runSeconds} s | ${r.goldPerRun} | ${r.goldPerMinute} | ${r.crestsPerRun} | ${r.quietMax} / ${r.quietOver} |`);
    out.push('');
  }
  return out.join('\n');
}

it('balance report', async () => {
  // A part run keeps the other part of the last report, if it has the same shape.
  let rep: Report = { date: '' };
  if (existsSync(JSON_FILE)) { try { rep = JSON.parse(readFileSync(JSON_FILE, 'utf8')); } catch { rep = { date: '' }; } }
  if (rep.campaign && rep.campaign.rows.some((r) => !('triesBySection' in r))) delete rep.campaign;
  if (rep.endless && rep.endless.rows.some((r) => !('goldPerMinute' in r))) delete rep.endless;
  rep.date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const keeps: Record<number, unknown> = {};
  const wanted = CAMPAIGN_ROWS.filter((r) => !ROW_FILTER || ROW_FILTER.split(',').some((f) => r.label.includes(f)));
  if (PART === 'all' || PART === 'campaign') {
    rep.campaign = { from: LEVELS.from, to: LEVELS.to, maxTries: MAX_TRIES, rows: await campaign(wanted, keeps) };
  } else {
    await campaign(CAMPAIGN_ROWS.filter((r) => r.label === 'Mid solo'), keeps);
  }
  if (PART === 'all' || PART === 'endless') rep.endless = { runs: RUNS, maxWave: MAX_WAVE, rows: await endless(keeps) };
  const md = render(rep);
  writeFileSync(MD, `${md}\n`);
  writeFileSync(JSON_FILE, `${JSON.stringify(rep, null, 1)}\n`);
}, 6 * 3600_000);
