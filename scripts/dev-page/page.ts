/**
 * The developer overview of v0.3 (/fondue/next/dev/): one self-contained HTML page built from the
 * game's configuration, so it never goes out of date. Loaded through Vite by scripts/dev-page.ts;
 * `readDevInput` collects the data, `renderDevPage` turns it into HTML without touching the disk.
 *
 * Shows: weapons (slot, unlock level, cheese price, seven tiers and what each tier changes = A5),
 * tier prices (gold, crests, caps), castle and hand tiers, stations, enemies, levels and waves,
 * unlocks, the cheese sum (must be 500), the interactive decision list (answers become GitHub
 * issues), the roadmap to v1.0 and the v0.3 acceptance list.
 * Level fields are read defensively: whatever the level table has is shown.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CURRENCIES } from '../../src/config/currencies';
import { DECISIONS_V3, LEGACY_DECISIONS, ROADMAP, type Decision } from '../../src/config/decisions';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { GAME_NAME, GAME_VERSION } from '../../src/config/game';
import { HAND_RULES, HANDS } from '../../src/config/hand';
import { CASTLE_TIERS, STATIONS, STATION_IDS } from '../../src/config/keep';
import { SLOTS } from '../../src/config/slots';
import { CREST_COST, TIER_CAP_BY_LEVEL, WEAPON_TIER_GOLD, tierCrests, weaponTierGold } from '../../src/config/tiers';
import { MAX_TIER, WEAPONS, type WeaponDef } from '../../src/config/weapons';
import { buildIssueUrls } from './issues';
import { esc, inline, markdown } from './markdown';

export const NEXT_URL = 'https://onlineshopbuilding-droid.github.io/fondue/next/';
export const LIVE_URL = 'https://onlineshopbuilding-droid.github.io/fondue/';
export const CLASSIC_URL = 'https://onlineshopbuilding-droid.github.io/fondue/classic/';
export const ISSUE_URL = 'https://github.com/onlineshopbuilding-droid/fondue/issues/new';
/** Upper bound of one issue address. */
export const ISSUE_MAX = 7000;
/** Browser storage of the decision drafts (only this key, prefix fondue.v3.). */
export const DRAFT_KEY = 'fondue.v3.dev.decisions';

interface AcceptanceItem { id: string; titel: string; pruefung: string; status: string; beleg?: string }

/** One campaign level as far as the page can read it. */
export interface LevelRow {
  id: number;
  name: string;
  boss: boolean;
  waves: number | null;
  days: number | null;
  raiders: number | null;
  targetSeconds: number | null;
  challenges: string[];
  landscape: string;
}

export interface UnlockRow { level: number; text: string }

export interface DevInput {
  levels: LevelRow[] | null;
  levelError: string;
  unlocks: UnlockRow[];
  balanceMd: string;
  balanceDate: string;
  acceptance: AcceptanceItem[];
  weaponArt: Record<string, string>;
  fonts: { display?: string; body?: string; bodyBold?: string };
  version: string;
  generated: string;
}

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const font = (root: string, file: string): string | undefined => {
  const p = join(root, 'node_modules', '@fontsource', file);
  return existsSync(p) ? readFileSync(p).toString('base64') : undefined;
};
const numOf = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const countsSum = (counts: unknown): number => {
  if (!counts || typeof counts !== 'object') return 0;
  return Object.values(counts as Record<string, unknown>).reduce<number>((a, v) => a + (numOf(v) ?? 0), 0);
};

/** Reads one level of whatever shape the level table has right now. */
export function levelRow(raw: unknown): LevelRow {
  const l = (raw ?? {}) as Record<string, unknown>;
  const waves = Array.isArray(l.waves) ? (l.waves as Record<string, unknown>[]) : null;
  const days = Array.isArray(l.days) ? (l.days as Record<string, unknown>[]) : null;
  const groups = waves ?? days;
  const raiders = groups ? groups.reduce((a, g) => a + countsSum(g.counts) + countsSum(g.big), 0) : null;
  const challenges = Array.isArray(l.challenges)
    ? (l.challenges as unknown[]).map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return String(o.text ?? o.label ?? o.title ?? o.id ?? '');
    }).filter(Boolean)
    : [];
  const minutes = numOf(l.targetMinutes);
  return {
    id: numOf(l.id) ?? 0,
    name: typeof l.name === 'string' ? l.name : '',
    boss: !!l.boss,
    waves: waves ? waves.length : null,
    days: days ? days.length : null,
    raiders,
    targetSeconds: numOf(l.targetSeconds) ?? (minutes !== null ? minutes * 60 : null),
    challenges,
    landscape: typeof l.landscape === 'string' ? l.landscape : '',
  };
}

function unlockText(u: Record<string, unknown>): string {
  switch (u.kind) {
    case 'slot': { const s = SLOTS[Number(u.slot)]; return `Slot ${s ? s.name : u.slot}`; }
    case 'weapon': { const w = WEAPONS.find((x) => x.id === u.weapon); return `Waffe ${w ? w.name : u.weapon}${w ? ` (${w.cheesePrice} Käse)` : ''}`; }
    case 'station': { const s = STATIONS[u.station as keyof typeof STATIONS]; return `${s ? s.name : u.station}${s ? ` (${s.cheesePrice} Käse)` : ''}`; }
    case 'gate': return `Tor-Stufe ${u.tier}`;
    case 'hand': return `Hand-Stufe ${u.tier}`;
    default: return String(u.kind);
  }
}

/** Collects everything the page shows. */
export async function readDevInput(root: string, version: string): Promise<DevInput> {
  const weaponArt: Record<string, string> = {};
  try {
    const reg = await import('../../src/art/registry');
    const art = await import('../../src/art/weapons');
    for (const w of WEAPONS) {
      const svg = reg.ASSETS[art.weaponKey(w.id, 1)]?.art.svg;
      if (svg) weaponArt[w.id] = svg;
    }
  } catch (e) {
    console.warn('weapon art not available:', (e as Error).message);
  }
  // The level table is being rebuilt; whatever fails here leaves the rest of the page intact.
  let levels: LevelRow[] | null = null;
  let levelError = '';
  try {
    const worlds = await import('../../src/config/worlds');
    levels = worlds.worldById(worlds.DEFAULT_WORLD).campaign.map(levelRow);
  } catch (e) {
    levelError = (e as Error).message;
    console.warn('level table not available:', levelError);
  }
  let unlocks: UnlockRow[] = [];
  try {
    const u = await import('../../src/config/worlds/fondue/unlocks');
    unlocks = (u.UNLOCKS as unknown as Record<string, unknown>[]).map((x) => ({ level: Number(x.level) || 0, text: unlockText(x) }));
  } catch (e) {
    console.warn('unlock table not available:', (e as Error).message);
  }
  let balanceDate = '';
  try { balanceDate = JSON.parse(read(join(root, 'docs', 'balance-latest.json')) || '{}').date ?? ''; } catch { /* no date */ }
  let acceptance: AcceptanceItem[] = [];
  try { acceptance = JSON.parse(read(join(root, 'docs', 'v0.3', 'abnahme.json')) || '[]'); } catch { /* none */ }
  return {
    levels, levelError, unlocks,
    balanceMd: read(join(root, 'docs', 'balance-latest.md')),
    balanceDate,
    acceptance: Array.isArray(acceptance) ? acceptance : [],
    weaponArt,
    fonts: {
      display: font(root, 'lilita-one/files/lilita-one-latin-400-normal.woff2'),
      body: font(root, 'nunito/files/nunito-latin-400-normal.woff2'),
      bodyBold: font(root, 'nunito/files/nunito-latin-800-normal.woff2'),
    },
    version,
    generated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
  };
}

// ---------- small helpers ----------

const SLOT_DE: Record<string, string> = { damage: 'Damage (links unten)', slow: 'Slow (links Mitte)', support: 'Support (links oben)', passive: 'Passive (rechts oben)', gate: 'Gate (über dem Tor)' };
const TARGET_DE: Record<string, string> = { none: 'zielt nicht', front: 'vorderster Räuber', crowd: 'dichteste Gruppe', tough: 'zähster Räuber' };

export const num = (v: number, digits = 2): string => {
  const r = Number(v.toFixed(digits));
  return String(r).replace('.', ',');
};
const fmtVal = (v: unknown): string => typeof v === 'number' ? num(v) : typeof v === 'boolean' ? (v ? 'ja' : 'nein') : esc(String(v));
const table = (head: string[], rows: string[][], cls = ''): string =>
  `<div class="scroll"><table${cls ? ` class="${cls}"` : ''}><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
  + rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
const enemyName = (t: string): string => esc(ENEMIES[t as EnemyType]?.name ?? t);
const seconds = (s: number | null): string => (s === null ? '–' : s >= 60 ? `${num(s / 60, 1)} min` : `${num(s, 0)} s`);

/** What changes from the tier before: switches and numbers with their change in per cent. */
export function tierChanges(def: WeaponDef, tier: number): string {
  if (tier <= 1) return 'Start';
  const now = def.tiers[tier - 1] as unknown as Record<string, unknown>;
  const before = def.tiers[tier - 2] as unknown as Record<string, unknown>;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(now)) {
    if (k === 'note') continue;
    const b = before[k];
    if (v === b) continue;
    if (typeof v === 'number' && typeof b === 'number') {
      const pct = b === 0 ? '' : ` (${v > b ? '+' : ''}${num(((v - b) / Math.abs(b)) * 100, 0)} %)`;
      parts.push(`${k} ${num(b)} → ${num(v)}${pct}`);
    } else parts.push(`${k} ${fmtVal(b)} → ${fmtVal(v)}`);
  }
  return parts.join(' · ') || '–';
}

/** Cheese of everything that costs cheese: all weapons plus the stations. Must be 500. */
export function cheeseSum(): { weapons: number; stations: number; total: number } {
  const weapons = WEAPONS.filter((w) => w.enabled).reduce((a, w) => a + w.cheesePrice, 0);
  const stations = STATION_IDS.reduce((a, id) => a + STATIONS[id].cheesePrice, 0);
  return { weapons, stations, total: weapons + stations };
}

// ---------- sections ----------

function weaponSection(art: Record<string, string>): string {
  const overview = SLOTS.map((s) => {
    const list = WEAPONS.filter((w) => w.slot === s.role);
    return list.map((w) => [esc(SLOT_DE[s.role] ?? s.role), `<a href="#waffe-${w.id}">${esc(w.name)}</a>`, w.kind, String(w.unlockLevel || 'Start'), String(w.cheesePrice), `× ${num(w.goldScale)}`, w.enabled ? 'ja' : '<strong>nein</strong>']);
  }).flat();
  const cards = WEAPONS.map((w) => {
    const rows = (w.tiers as unknown as Record<string, unknown>[]).map((tier, i) => {
      const t = i + 1;
      const stats = Object.entries(tier).filter(([k]) => k !== 'note').map(([k, v]) => `${k} ${fmtVal(v)}`).join(' · ');
      const price = t === 1 ? `${w.cheesePrice} Käse` : `${weaponTierGold(t, w.goldScale)} Gold${tierCrests(t) ? ` + ${tierCrests(t)} Wappen` : ''}`;
      return [String(t), esc(String(tier.note ?? '')), `<span class="small">${tierChanges(w, t)}</span>`, `<span class="small">${stats}</span>`, price];
    });
    const img = art[w.id] ? `<img class="wart" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(art[w.id])}">` : '';
    return `<article class="card weapon${w.enabled ? '' : ' off'}" id="waffe-${w.id}">
<header>${img}<div><h3>${esc(w.name)} <code>${w.id}</code></h3>
<p class="small">Slot: ${esc(SLOT_DE[w.slot] ?? w.slot)} · Art: ${w.kind} · Ziel: ${TARGET_DE[w.target] ?? w.target} · ${w.unlockLevel ? `kaufbar ab Sieg in Level ${w.unlockLevel}` : 'von Anfang an'} · ${w.cheesePrice} Käse · Preisfaktor ${num(w.goldScale)}</p>
<p>${esc(w.desc)}</p></div></header>
${table(['Stufe', 'Was die Stufe bringt', 'Änderung zur Stufe davor', 'Alle Werte', 'Preis'], rows, 'compact wtiers')}</article>`;
  }).join('\n');
  return `<section id="waffen"><h2>Waffen</h2>
<p>Alle ${WEAPONS.length} Waffen aus <code>src/config/weapons.ts</code>, je ${MAX_TIER} Stufen. Stufe 1 wird mit Käse freigeschaltet, Stufen 2 bis 7 kosten Gold, Stufe 7 zusätzlich Wappen. Werte ausprobieren: Entwickler-Menü im Spiel, „Weapon editor“.</p>
${table(['Slot', 'Waffe', 'Art', 'Freischalt-Level', 'Käse', 'Goldfaktor', 'aktiv'], overview)}
${cards}</section>`;
}

function tierSection(): string {
  const gold = WEAPON_TIER_GOLD.map((g, i) => [String(i + 1), i === 0 ? 'Käse (Freischalten)' : `${g} Gold × Goldfaktor`, i + 1 === MAX_TIER ? `${CREST_COST} ${CURRENCIES.crests.name}` : '–']);
  const caps = TIER_CAP_BY_LEVEL.map((c) => [c.afterLevel === 0 ? 'Start' : `nach Level ${c.afterLevel}`, `Stufe ${c.cap}`]);
  caps.push(['mit dem Eagle Perch', `Stufe ${MAX_TIER}`]);
  const castle = CASTLE_TIERS.map((c, i) => [String(i + 1), esc(c.name), String(c.hp), `${c.gold} Gold${c.crests ? ` + ${c.crests} Wappen` : ''}`, `<span class="small">${esc(c.desc)}</span>`]);
  const hands = HANDS.map((h, i) => [String(i + 1), num(h.strength), `${h.gold} Gold${h.crests ? ` + ${h.crests} Wappen` : ''}`, `<span class="small">${esc(h.note)}</span>`]);
  const stations = STATION_IDS.map((id) => {
    const s = STATIONS[id];
    return [esc(s.name), `Level ${s.unlockLevel}`, `${s.cheesePrice} Käse`, s.tiers.map((t, i) => `${i + 1}: ${t.gold} Gold – ${esc(t.note)}`).join('<br>'), `<span class="small">${esc(s.desc)}</span>`];
  });
  return `<section id="stufen"><h2>Stufen, Preise, Burg und Hand</h2>
<h3>Waffenstufen (<code>src/config/tiers.ts</code>)</h3>
${table(['Stufe', 'Gold', 'Wappen'], gold)}
<h3>Stufen-Deckel je Kampagnen-Abschnitt</h3>
<p class="small">Höchste kaufbare Stufe für Waffen, Burg und Hand. So kann Endlos-Gold die Kampagne nicht überrollen.</p>
${table(['ab', 'höchste Stufe'], caps)}
<h3>Burg (Tor)</h3>
${table(['Stufe', 'Name', 'Torleben', 'Preis', 'Beschreibung'], castle)}
<h3>Hand</h3>
<p class="small">Ein Yeti braucht zusammen eine Stärke von ${num(HAND_RULES.yetiLift)}; mehrere Hände zählen zusammen.</p>
${table(['Stufe', 'Stärke', 'Preis', 'Beschreibung'], hands)}
<h3>Stationen</h3>
${table(['Station', 'kaufbar ab', 'Freischalten', 'Stufen', 'Beschreibung'], stations)}</section>`;
}

function enemySection(): string {
  const rows = ENEMY_TYPES.map((t) => {
    const e = ENEMIES[t] as unknown as Record<string, unknown>;
    const v = (k: string) => (k in e ? fmtVal(e[k]) : '–');
    return [`<strong>${enemyName(t)}</strong><br><code>${t}</code>`, v('hp'), v('speed'), `${v('strike')} / ${v('strikeEvery')} s`, v('range'), v('mass'), v('gold'), v('grabbable'), `<span class="small">${esc(String(e.tip ?? ''))}</span>`];
  });
  return `<section id="gegner"><h2>Gegner</h2>
<p>Aus <code>src/config/enemies.ts</code>. Gewicht 1 = Pothelm; Lebenspunkte zählen nur gegen Waffen, ein tödlicher Wurf ignoriert sie.</p>
${table(['Räuber', 'Leben', 'Tempo', 'Schlag / alle', 'Reichweite', 'Gewicht', 'Gold', 'greifbar', 'Tipp im Spiel'], rows, 'compact')}</section>`;
}

function levelSection(input: DevInput): string {
  const byLevel = new Map<number, string[]>();
  for (const u of input.unlocks) byLevel.set(u.level, [...(byLevel.get(u.level) ?? []), u.text]);
  const unlockRows = [...byLevel.entries()].sort(([a], [b]) => a - b).map(([l, list]) => [l === 0 ? 'Start' : String(l), esc(list.join(', '))]);
  let levels = `<p>Die Level-Tabelle ist gerade nicht lesbar${input.levelError ? ` (<code>${esc(input.levelError)}</code>)` : ''}.</p>`;
  if (input.levels) {
    const L = input.levels;
    const total = L.reduce((a, l) => a + (l.targetSeconds ?? 0), 0);
    const hasWaves = L.some((l) => l.waves !== null);
    const rows = L.map((l) => [String(l.id), `${esc(l.name)}${l.boss ? ' <span class="tag boss">Boss</span>' : ''}`,
      hasWaves ? String(l.waves ?? '–') : String(l.days ?? '–'), l.raiders === null ? '–' : String(l.raiders), seconds(l.targetSeconds),
      `<span class="small">${esc(l.challenges.join(' · ') || '–')}</span>`, esc((byLevel.get(l.id) ?? []).join(', '))]);
    levels = `<p>${L.length} Level, geplante Dauer zusammen ${seconds(total)}. „Nach dem Sieg frei“ gilt ab dem Sieg in diesem Level.</p>
${table(['Level', 'Name', hasWaves ? 'Wellen' : 'Tage', 'Räuber allein', 'geplante Dauer', 'Challenges', 'nach dem Sieg frei'], rows, 'compact')}`;
  }
  return `<section id="level"><h2>Level und Wellen</h2>
<p>Aus <code>src/config/worlds/fondue/campaign.ts</code>. Die Werte werden beim Bau der Seite gelesen.</p>
${levels}
<h3>Freischaltungen</h3>
<p class="small">Aus <code>src/config/worlds/fondue/unlocks.ts</code>, <code>slots.ts</code>, <code>weapons.ts</code> und <code>keep.ts</code>.</p>
${table(['nach Level', 'Freischaltung'], unlockRows)}</section>`;
}

function cheeseSection(levelCount: number | null): string {
  const c = cheeseSum();
  const ok = c.total === 500;
  return `<section id="kaese"><h2>Käse-Summe</h2>
<p class="big ${ok ? 'good' : 'bad'}" id="cheeseSum">${c.total} Käse ${ok ? '✓' : '✗ (muss 500 sein)'}</p>
${table(['Posten', 'Käse'], [['Alle Waffen', String(c.weapons)], ['Great Cauldron und Eagle Perch', String(c.stations)], ['<strong>Zusammen</strong>', `<strong>${c.total}</strong>`],
    ['In der Kampagne zu verdienen', levelCount === null ? '–' : `${levelCount} Level × 5 = ${levelCount * 5}`]])}</section>`;
}

function decisionCard(d: Decision): string {
  const options = d.options.map((o) => `<label class="opt"><input type="radio" name="dec-${d.id}" value="${esc(o.id)}" data-label="${esc(o.label)}"> ${esc(o.label)}${o.id === d.choice ? ' <span class="tag unlock">gebaut</span>' : ''}</label>`).join('');
  return `<fieldset class="card decision" data-decision="${d.id}" data-title="${esc(d.title)}">
<legend><strong>${d.id}</strong> ${esc(d.title)}${d.from ? ` <span class="small">(früher ${d.from})</span>` : ''}${d.choice === null ? ' <span class="tag boss">offen</span>' : ''}</legend>
<p>${esc(d.question)}</p>
<p class="small">Wahl der Leitung: ${d.choice === null ? 'noch offen' : esc(d.options.find((o) => o.id === d.choice)?.label ?? d.choice)}. ${inline(d.reason)}</p>
<div class="opts">${options}</div>
<textarea class="note" data-note="${d.id}" rows="2" placeholder="Eure Notiz (frei)"></textarea></fieldset>`;
}

function decisionSection(): string {
  const legacy = LEGACY_DECISIONS.map((l) => [l.id, esc(l.title), l.verdict === 'kept' ? 'gilt weiter' : l.verdict === 'decided' ? 'entschieden' : 'hinfällig', esc(l.why), l.to ? `<a href="#dec-${l.to}">${l.to}</a>` : '–']);
  return `<section id="entscheidungen"><h2>Entscheidungen</h2>
<p>Wählt je Entscheidung eine Möglichkeit und schreibt bei Bedarf eine Notiz. „Issue erstellen“ öffnet ein vorausgefülltes GitHub-Issue mit dem Titel-Präfix <code>[Entscheidungen]</code>; lange Antworten werden auf mehrere Issues verteilt. Künftige Aufträge lesen diese Issues. Entwürfe bleiben in diesem Browser gespeichert. Die Liste steht auch in <code>docs/OFFENE-ENTSCHEIDUNGEN.md</code> und kommt aus <code>src/config/decisions.ts</code>.</p>
<form id="decisions" onsubmit="return false">
${DECISIONS_V3.map((d) => `<div id="dec-${d.id}">${decisionCard(d)}</div>`).join('\n')}
<div class="row"><button type="button" id="makeIssues">Issue erstellen</button> <button type="button" id="clearDrafts" class="secondary">Entwurf leeren</button> <span id="draftState" class="small"></span></div>
<div id="issueLinks"></div>
</form>
<h3>Was aus D-01 bis D-21 wurde</h3>
${table(['Nr', 'Eintrag', 'Stand', 'Warum', 'jetzt'], legacy, 'compact')}</section>`;
}

function roadmapSection(): string {
  const now = `<div class="card"><h3>v${esc(GAME_VERSION)} – dieses Update</h3><p>Dauerhafte Burg, Käse, Gold und Wappen, Wellen statt Tage, 25 Waffen mit 7 Stufen, Shop statt Markt, Entwickler-Werkzeuge. Läuft unter <a href="${NEXT_URL}">/fondue/next/</a>.</p></div>`;
  return `<section id="fahrplan"><h2>Fahrplan bis v1.0</h2>
<p>v0.1 Classic (<a href="${CLASSIC_URL}">/fondue/classic/</a>), v0.2 heutiger Live-Stand (<a href="${LIVE_URL}">/fondue/</a>), v0.3 dieses Update. v1.0 ist der Store-Start.</p>
${now}
${ROADMAP.map((r) => `<div class="card"><h3>${esc(r.version)} – ${esc(r.title)}</h3><ul>${r.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('\n')}</section>`;
}

function acceptanceSection(a: AcceptanceItem[]): string {
  if (a.length === 0) return '';
  const done = a.filter((p) => p.status === 'erledigt').length;
  const rows = a.map((p) => [`<code>${esc(p.id)}</code>`, esc(p.titel), esc(p.status), `<span class="small">${inline(p.pruefung)}</span>`, p.beleg ? `<span class="small">${inline(p.beleg)}</span>` : '']);
  return `<section id="abnahme"><h2>Abnahmeliste v0.3</h2>
<p>Aus <code>docs/v0.3/abnahme.json</code>. ${done} von ${a.length} erledigt; ein Punkt gilt nur mit echtem Beleg.</p>
${table(['Nr', 'Punkt', 'Stand', 'Prüfung', 'Beleg'], rows, 'compact')}</section>`;
}

function css(f: DevInput['fonts']): string {
  const face = (name: string, data: string | undefined, weight: number) => data ? `@font-face{font-family:"${name}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-display:swap}` : '';
  return `${face('Lilita One', f.display, 400)}${face('Nunito', f.body, 400)}${face('Nunito', f.bodyBold, 800)}
:root{--bg:#fbeed0;--card:#fff6df;--ink:#2b2118;--muted:#6b5a48;--line:#e2cfa6;--accent:#2f7f7a;--gold:#e9b44c;--rust:#c8553d;--wood:#8a5a33;--wood-dark:#5e3b20;--hi:#fbe3a0;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1d1712;--card:#2a211a;--ink:#f6ecd8;--muted:#bba88f;--line:#4a3a2b;--accent:#5cb8b0;--gold:#e9b44c;--rust:#e88068;--wood:#6b4527;--wood-dark:#3e2715;--hi:#5a4720;color-scheme:dark}}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:56px}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Nunito,system-ui,-apple-system,"Segoe UI",sans-serif}
h1,h2,h3{font-family:"Lilita One",Nunito,system-ui,sans-serif;font-weight:400;line-height:1.2}
h2{font-size:1.8rem;margin:2.2rem 0 .6rem;color:var(--accent)}h3{font-size:1.25rem;margin:1.4rem 0 .5rem}
a{color:var(--accent)}code{font-family:ui-monospace,Consolas,monospace;font-size:.85em;background:color-mix(in srgb,var(--line) 55%,transparent);padding:.05em .3em;border-radius:4px}
header.top{background:linear-gradient(var(--wood),var(--wood-dark));color:#fff6df;padding:20px 16px 18px}
header.top h1{margin:0;font-size:2rem}header.top p{margin:.3rem 0 0;opacity:.9}
.version{display:inline-block;background:var(--gold);color:#2b2118;font-weight:800;border-radius:999px;padding:2px 10px}
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.links a{background:var(--gold);color:#2b2118;text-decoration:none;font-weight:800;padding:8px 14px;border-radius:999px}
nav{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:2px solid var(--line);display:flex;gap:4px;overflow-x:auto;padding:6px 10px}
nav a{white-space:nowrap;text-decoration:none;color:var(--ink);font-weight:800;font-size:.9rem;padding:6px 10px;border-radius:8px}nav a:hover{background:var(--line)}
main{max-width:1100px;margin:0 auto;padding:0 16px 48px}
.small{font-size:.85rem;color:var(--muted)}.big{font-size:1.4rem;font-weight:800;margin:.4rem 0}.good{color:var(--accent)}.bad{color:var(--rust)}
.scroll{overflow-x:auto;margin:.6rem 0;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{padding:6px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:color-mix(in srgb,var(--line) 60%,var(--card));font-weight:800;white-space:nowrap}tr:last-child td{border-bottom:0}
table.compact td,table.compact th{padding:4px 7px}.wtiers td:nth-child(2){min-width:12em}.wtiers td:nth-child(3){min-width:14em}.wtiers td:nth-child(5){white-space:nowrap}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}.stat b{display:block;font-family:"Lilita One",sans-serif;font-weight:400;font-size:1.7rem;color:var(--accent)}
.tag{display:inline-block;font-size:.75rem;font-weight:800;padding:1px 7px;border-radius:999px;background:var(--line);color:var(--ink)}.tag.boss{background:var(--rust);color:#fff}.tag.unlock{background:var(--gold);color:#2b2118}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:12px 0}.card.off{opacity:.6}
.weapon header{display:flex;gap:12px;align-items:flex-start}.weapon h3{margin:0 0 .2rem}.weapon p{margin:.2rem 0}.wart{width:72px;height:72px;object-fit:contain;flex:none;background:var(--bg);border-radius:12px;padding:4px}
fieldset.decision{min-width:0}fieldset.decision legend{padding:0 6px}.opts{display:flex;flex-direction:column;gap:4px;margin:6px 0}.opt{display:flex;gap:6px;align-items:flex-start;cursor:pointer}
textarea{width:100%;font:inherit;padding:8px;border-radius:8px;border:2px solid var(--line);background:var(--bg);color:var(--ink)}
button{font:inherit;font-weight:800;padding:10px 16px;border-radius:999px;border:0;background:var(--accent);color:#fff;cursor:pointer}button.secondary{background:var(--line);color:var(--ink)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}#issueLinks a{display:block;margin:4px 0;font-weight:800;word-break:break-all}
.md table{font-size:.85rem}footer{text-align:center;color:var(--muted);font-size:.8rem;padding:24px 16px}`;
}

/** The browser part: drafts in localStorage, issue links from the answers. */
function script(): string {
  return `(function(){
var buildIssueUrls = ${buildIssueUrls.toString()};
var KEY=${JSON.stringify(DRAFT_KEY)}, BASE=${JSON.stringify(ISSUE_URL)}, MAX=${ISSUE_MAX}, VERSION=${JSON.stringify(`v${GAME_VERSION}`)};
var cards=[].slice.call(document.querySelectorAll('[data-decision]'));
var state=document.getElementById('draftState');
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
function save(){var d={};cards.forEach(function(c){var id=c.dataset.decision;var r=c.querySelector('input[type=radio]:checked');var n=c.querySelector('textarea').value;if(r||n)d[id]={choice:r?r.value:'',note:n};});try{localStorage.setItem(KEY,JSON.stringify(d));state.textContent='Entwurf gespeichert';}catch(e){state.textContent='Entwurf kann hier nicht gespeichert werden';}}
var draft=load();cards.forEach(function(c){var v=draft[c.dataset.decision];if(!v)return;if(v.choice){var r=c.querySelector('input[value="'+CSS.escape(v.choice)+'"]');if(r)r.checked=true;}c.querySelector('textarea').value=v.note||'';});
document.getElementById('decisions').addEventListener('input',save);document.getElementById('decisions').addEventListener('change',save);
document.getElementById('clearDrafts').addEventListener('click',function(){try{localStorage.removeItem(KEY);}catch(e){}cards.forEach(function(c){c.querySelectorAll('input[type=radio]').forEach(function(r){r.checked=false;});c.querySelector('textarea').value='';});state.textContent='Entwurf geleert';document.getElementById('issueLinks').innerHTML='';});
document.getElementById('makeIssues').addEventListener('click',function(){
  var answers=[];cards.forEach(function(c){var r=c.querySelector('input[type=radio]:checked');var n=c.querySelector('textarea').value.trim();if(!r&&!n)return;answers.push({id:c.dataset.decision,title:c.dataset.title,choice:r?r.dataset.label:'',note:n});});
  var out=document.getElementById('issueLinks');out.innerHTML='';
  if(!answers.length){out.textContent='Noch keine Antwort ausgefüllt.';return;}
  var urls=buildIssueUrls(answers,{base:BASE,version:VERSION,maxLength:MAX});
  urls.forEach(function(u,i){var a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';a.className='issue-link';a.textContent=urls.length>1?'Issue '+(i+1)+' von '+urls.length+' öffnen':'Issue öffnen';out.appendChild(a);});
  if(urls.length===1)window.open(urls[0],'_blank','noopener');
});
})();`;
}

/** The whole page. Pure: the same input gives the same HTML. */
export function renderDevPage(input: DevInput): string {
  const c = cheeseSum();
  const open = DECISIONS_V3.filter((d) => d.choice === null).length;
  const stats = [
    [input.levels ? String(input.levels.length) : '–', 'Level'], [String(WEAPONS.filter((w) => w.enabled).length), 'Waffen'],
    [String(ENEMY_TYPES.length), 'Räuberarten'], [`${c.total}`, 'Käse-Summe (Soll 500)'], [`${DECISIONS_V3.length} / ${open} offen`, 'Entscheidungen'],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b>${l}</div>`).join('');
  const nav = [['start', 'Start'], ['waffen', 'Waffen'], ['stufen', 'Stufen & Preise'], ['gegner', 'Gegner'], ['level', 'Level & Wellen'], ['kaese', 'Käse'], ['entscheidungen', 'Entscheidungen'], ['fahrplan', 'Fahrplan'], ['balance', 'Balance'], ['abnahme', 'Abnahme']]
    .map(([id, t]) => `<a href="#${id}">${t}</a>`).join('');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(GAME_NAME)} v${esc(GAME_VERSION)} – Entwickler-Übersicht</title>
<style>${css(input.fonts)}</style></head><body>
<header class="top" id="start"><h1>${esc(GAME_NAME)} – Entwickler-Übersicht <span class="version" id="gameVersion">v${esc(GAME_VERSION)}</span></h1>
<p>Automatisch erzeugt aus den Konfigurationsdateien am ${esc(input.generated)}, Stand <code>${esc(input.version)}</code>. Nicht von Hand ändern: <code>node scripts/dev-page.ts &lt;Ordner&gt;</code>.</p>
<div class="links"><a href="${NEXT_URL}">v${esc(GAME_VERSION)} spielen</a><a href="${LIVE_URL}">Live-Stand</a><a href="${CLASSIC_URL}">Classic</a></div></header>
<nav>${nav}</nav>
<main>
<div class="cards" style="margin-top:16px">${stats}</div>
${weaponSection(input.weaponArt)}
${tierSection()}
${enemySection()}
${levelSection(input)}
${cheeseSection(input.levels ? input.levels.length : null)}
${decisionSection()}
${roadmapSection()}
<section id="balance" class="md"><h2>Balance</h2>
<p>Neueste Ergebnisse der Bots${input.balanceDate ? ` vom ${esc(input.balanceDate)}` : ''} (aus <code>docs/balance-latest.md</code>).</p>
${input.balanceMd ? markdown(input.balanceMd, 2) : '<p>Noch kein Balance-Lauf.</p>'}</section>
${acceptanceSection(input.acceptance)}
</main>
<footer>${esc(GAME_NAME)} v${esc(GAME_VERSION)} · erzeugt von <code>scripts/dev-page.ts</code></footer>
<script>${script()}</script>
</body></html>
`;
}
