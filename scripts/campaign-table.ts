/**
 * Writes the readable table of all campaign levels into docs/KAMPAGNE-TABELLE.md, between the two
 * KAMPAGNE markers. The numbers come from the real level data (src/config/worlds), so the document
 * can never say something else than the game does.
 * Run it after changing the campaign, the waves, the challenges or the unlocks: `node scripts/campaign-table.ts`.
 * A unit test (tests/unit/campaignTable.test.ts) fails while the document is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnemyType } from '../src/config/enemies';
import type { LevelDef, TwistDef, UnlockDef } from '../src/config/worlds/types';

export const START = '<!-- KAMPAGNE:START (erzeugt von scripts/campaign-table.ts, nicht von Hand ändern) -->';
export const END = '<!-- KAMPAGNE:END -->';

/** The game modules the table is made from. Tests pass their own imports, the script loads them through Vite. */
export interface CampaignSources {
  worlds: typeof import('../src/config/worlds');
  campaign: typeof import('../src/config/worlds/fondue/campaign');
  enemies: typeof import('../src/config/enemies');
  weapons: typeof import('../src/config/weapons');
  keep: typeof import('../src/config/keep');
  slots: typeof import('../src/config/slots');
}

/** Everything the table needs, as plain data. */
export interface CampaignData {
  levels: LevelDef[];
  unlocks: UnlockDef[];
  curve: Record<string, number>;
  firstLevel: Record<EnemyType, number>;
  overrides: Record<number, string[]>;
  enemyNames: Record<string, string>;
  weaponNames: Record<string, string>;
  stationNames: Record<string, string>;
  gateNames: string[];
  slotNames: string[];
}

export function campaignData(s: CampaignSources, worldId = s.worlds.DEFAULT_WORLD): CampaignData {
  const world = s.worlds.worldById(worldId);
  const levels: LevelDef[] = [];
  for (let n = 1; n <= s.campaign.LEVEL_COUNT; n++) {
    const level = s.worlds.levelOf(worldId, n);
    if (level) levels.push(level);
  }
  const overrides: Record<number, string[]> = {};
  for (const [n, o] of Object.entries(s.campaign.LEVEL_OVERRIDES)) overrides[Number(n)] = Object.keys(o);
  return {
    levels,
    unlocks: world.unlocks,
    curve: Object.fromEntries(Object.entries(s.campaign.CURVE).filter(([, v]) => typeof v === 'number')) as Record<string, number>,
    firstLevel: { ...s.campaign.FIRST_LEVEL },
    overrides,
    enemyNames: Object.fromEntries(Object.entries(s.enemies.ENEMIES).map(([id, e]) => [id, e.name])),
    weaponNames: Object.fromEntries(s.weapons.WEAPONS.map((w) => [w.id, w.name])),
    stationNames: Object.fromEntries(Object.entries(s.keep.STATIONS).map(([id, st]) => [id, st.name])),
    gateNames: s.keep.CASTLE_TIERS.map((g) => g.name),
    slotNames: s.slots.SLOTS.map((sl) => sl.name),
  };
}

export const LANDSCAPE_DE: Record<string, string> = { meadow: 'Wiese', canyon: 'Schlucht', marsh: 'Sumpf', snowpine: 'Schneewald' };

/** German number with at most `digits` decimals. */
export const num = (v: number, digits = 2): string => {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', ',');
};

const cell = (s: string): string => s.replace(/\|/g, '\\|');

/** Raiders of one wave (or any count table). */
export function waveTotal(counts: Partial<Record<EnemyType, number>>): number {
  return Object.values(counts).reduce((a: number, b) => a + (b ?? 0), 0);
}
/** Older name, kept for the developer page. */
export const dayTotal = waveTotal;

/** Planned length as "m:ss". */
export const duration = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

export function unlockText(u: UnlockDef, d: CampaignData): string {
  switch (u.kind) {
    case 'slot': return `Slot ${u.slot + 1} (${d.slotNames[u.slot] ?? '?'})`;
    case 'weapon': return `Waffe ${d.weaponNames[u.weapon] ?? u.weapon}`;
    case 'station': return `Station ${d.stationNames[u.station] ?? u.station}`;
    case 'gate': return `Tor bis ${d.gateNames[u.tier] ?? `Stufe ${u.tier}`}`;
    case 'hand': return `Hand-Stufe ${u.tier}`;
  }
}

export function twistText(t: TwistDef | null, d: CampaignData): string {
  if (!t) return '';
  const names = (types: string[]) => types.map((x) => d.enemyNames[x] ?? x).join(', ');
  switch (t.kind) {
    case 'onlyTypes': return `${t.label} (nur ${names(t.types)})`;
    case 'night': return `${t.label} (Nacht)`;
    case 'flood': return `${t.label} (viele ${names([t.type])})`;
    case 'allTypes': return `${t.label} (alle bekannten Räuber, mehr von jeder Art)`;
  }
}

export function bossText(level: LevelDef, d: CampaignData): string {
  if (!level.boss) return '';
  const big = level.waves.find((w) => w.boss)?.big ?? {};
  const giants = Object.entries(big).filter(([, n]) => (n ?? 0) > 0).map(([t, n]) => `${n}× ${d.enemyNames[t] ?? t}`);
  return giants.length ? `${level.boss.name} (Riesen: ${giants.join(', ')})` : level.boss.name;
}

const CURVE_DE: Record<string, string> = {
  baseCount: 'v0.2-Kurve: Räuber an Tag 1 von Level 1',
  countPerLevel: 'v0.2-Kurve: zusätzliche Räuber je Level (Faktor vor der Potenz)',
  countPower: 'v0.2-Kurve: Potenz der Level-Zunahme',
  countPerDay: 'v0.2-Kurve: Anteil mehr Räuber je weiterem Tag',
  levelShareDay1: 'v0.2-Kurve: Anteil der Level-Zunahme an Tag 1',
  levelSharePerDay: 'v0.2-Kurve: Zunahme dieses Anteils je Tag',
  levelShareMax: 'v0.2-Kurve: höchster Anteil',
  countShare: 'v0.3: Anteil der v0.2-Räuberzahl je Level (B4)',
  powerPerLevel: 'Stärke der Räuber: Zunahme je Level (Level 1 = 1)',
  powerLateFrom: 'Ab diesem Level wächst die Stärke zusätzlich (mit dem Quadrat)',
  powerLate: 'Zusätzliche Stärke bei Level 100',
  bossPower: 'Boss-Level: Faktor für die Stärke',
  bossPowerLate: 'Boss-Level: Faktor wächst ab powerLateFrom zusätzlich bis Level 100 um so viel (mit dem Quadrat)',
  secondsFirst: 'Geplante Länge von Level 1 (s)',
  secondsPerEarlyLevel: 'Level 2 bis 5: Sekunden mehr je Level',
  secondsAt20: 'Geplante Länge um Level 20 (s)',
  secondsMiddleMin: 'Mitte: kürzeste geplante Länge (s)',
  secondsMiddleMax: 'Mitte: längste geplante Länge (s)',
  secondsBossMin: 'Boss-Level: kürzeste Länge (s)',
  secondsBossMax: 'Boss-Level: längste Länge (s)',
  secondsSpecialMin: 'Sonderlevel: kürzeste Länge (s)',
  secondsSpecialMax: 'Sonderlevel: längste Länge (s)',
  secondsPerWave: 'Sekunden je Welle im Mittel (bestimmt die Wellenzahl)',
  plannedShare: 'Anteil der Länge, der aus Ankunft und Pausen besteht',
  lastWave: 'Größe der letzten Welle (relativ)',
};

/** The Markdown part between the markers. */
export function campaignTable(d: CampaignData): string {
  const out: string[] = [];
  const waves = d.levels.reduce((a, l) => a + l.waves.length, 0);
  const bosses = d.levels.filter((l) => l.boss).length;
  const seconds = d.levels.reduce((a, l) => a + l.targetSeconds, 0);
  out.push(`Stand: ${d.levels.length} Level, ${waves} Wellen, ${bosses} Boss-Level, geplant zusammen ${Math.round(seconds / 60)} Minuten. Jedes Level bringt bis zu 5 Käse (Sieg, Tor über 50 %, Tor über 90 %, zwei Challenges).`);

  out.push('', '### Die Kurve (`CURVE`)', '', '| Wert | Bedeutung | Zahl |', '|---|---|---|');
  for (const [k, v] of Object.entries(d.curve)) out.push(`| \`${k}\` | ${CURVE_DE[k] ?? ''} | ${num(v)} |`);

  out.push('', '### Erster Auftritt der Räuber (`FIRST_LEVEL`)', '', '| Räuber | Level |', '|---|---|');
  for (const [t, n] of Object.entries(d.firstLevel).sort((a, b) => a[1] - b[1])) out.push(`| ${d.enemyNames[t] ?? t} | ${n} |`);

  const start = d.unlocks.filter((u) => u.level === 0).map((u) => unlockText(u, d));
  if (start.length) out.push('', `Von Anfang an da: ${start.join(', ')}.`);

  out.push('', '### Alle Level', '');
  out.push('Dauer: geplante Länge (m:ss). Räuber: alle Wellen zusammen, allein gespielt; dahinter die größte Welle. Stärke: Faktor auf Lebenspunkte (schwächer auch auf Torschaden und Tempo). ✎ = von Hand geändert (siehe unten).', '');
  out.push('| Level | Name | Landschaft | Dauer | Wellen | Räuber (größte Welle) | Neue Räuber | Besonderheit | Boss | Stärke | Challenges | Sieg schaltet frei |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const l of d.levels) {
    const unlocks = d.unlocks.filter((u) => u.level === l.id).map((u) => unlockText(u, d)).join(', ');
    const fresh = l.newEnemies.map((t) => d.enemyNames[t] ?? t).join(', ');
    const sizes = l.waves.map((w) => waveTotal(w.counts));
    const total = sizes.reduce((a, b) => a + b, 0);
    const challenges = l.challenges.map((c) => c.text).join('; ');
    const mark = d.overrides[l.id] ? ' ✎' : '';
    out.push(`| ${l.id}${mark} | ${cell(l.name)} | ${LANDSCAPE_DE[l.landscape] ?? l.landscape} | ${duration(l.targetSeconds)} | ${l.waves.length} | ${total} (${Math.max(...sizes)}) | ${cell(fresh)} | ${cell(twistText(l.twist, d))} | ${cell(bossText(l, d))} | ${num(l.power)} | ${cell(challenges)} | ${cell(unlocks)} |`);
  }

  out.push('', '### Von Hand geändert (`LEVEL_OVERRIDES`)', '');
  const changed = Object.entries(d.overrides);
  if (!changed.length) out.push('Keine Level sind von Hand geändert.');
  for (const [n, fields] of changed) out.push(`- Level ${n}: ${fields.map((f) => `\`${f}\``).join(', ')}`);
  return out.join('\n');
}

/** Replaces what stands between the two markers of the document. */
export function withTable(doc: string, table: string): string {
  const a = doc.indexOf(START);
  const b = doc.indexOf(END);
  if (a < 0 || b < a) throw new Error('KAMPAGNE markers not found in the document');
  return `${doc.slice(0, a + START.length)}\n${table}\n${doc.slice(b)}`;
}

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DOC = join(ROOT, 'docs', 'KAMPAGNE-TABELLE.md');

/** Loads the game modules with Vite's module resolution; nothing is served or built. */
export async function loadCampaignSources(load: (path: string) => Promise<unknown>): Promise<CampaignSources> {
  const [worlds, campaign, enemies, weapons, keep, slots] = await Promise.all([
    '/src/config/worlds/index.ts', '/src/config/worlds/fondue/campaign.ts', '/src/config/enemies.ts',
    '/src/config/weapons.ts', '/src/config/keep.ts', '/src/config/slots.ts',
  ].map(load));
  return { worlds, campaign, enemies, weapons, keep, slots } as CampaignSources;
}

async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const data = campaignData(await loadCampaignSources((p) => server.ssrLoadModule(p)));
    const before = readFileSync(DOC, 'utf8');
    const eol = before.includes('\r\n') ? '\r\n' : '\n';
    const after = withTable(before.replace(/\r\n/g, '\n'), campaignTable(data)).replace(/\n/g, eol);
    if (after !== before) writeFileSync(DOC, after);
    console.log(`${data.levels.length} levels, ${after === before ? 'document was up to date' : 'document updated'}`);
  } finally {
    await server.close();
  }
}

// Runs only when started as a script, not when a test or the developer page imports the helpers.
if (process.argv.some((a) => a.split('\\').join('/').endsWith('scripts/campaign-table.ts'))) {
  main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
}
