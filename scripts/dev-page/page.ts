/**
 * The developer overview (/fondue/dev/): one self-contained HTML page built from the game's
 * configuration and the generated documents, so it never goes out of date.
 * Loaded through Vite by scripts/dev-page.ts; `readDevInput` collects the data, `renderDevPage`
 * turns it into HTML without touching the disk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as enemies from '../../src/config/enemies';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { GAME_NAME } from '../../src/config/game';
import { HAND_RULES, HANDS } from '../../src/config/hand';
import * as keep from '../../src/config/keep';
import * as slots from '../../src/config/slots';
import { STARS, weaponTierPrice } from '../../src/config/stars';
import { DIFFICULTIES, type Difficulty } from '../../src/config/waves';
import * as weapons from '../../src/config/weapons';
import { MAX_TIER, upgradePrice, WEAPONS, type WeaponDef } from '../../src/config/weapons';
import * as worlds from '../../src/config/worlds';
import * as campaign from '../../src/config/worlds/fondue/campaign';
import type { EndlessDef } from '../../src/config/worlds/types';
import { EndlessPlanner } from '../../src/modes/endlessPlanner';
import { daySeed } from '../../src/sim/plan';
import { Rng } from '../../src/sim/rng';
import { enemyCountForDay } from '../../src/sim/spawn';
import { bossText, campaignData, dayTotal, LANDSCAPE_DE, num, twistText, unlockText, type CampaignData } from '../campaign-table';
import { esc, inline, markdown } from './markdown';

export const LIVE_URL = 'https://onlineshopbuilding-droid.github.io/fondue/';
export const CLASSIC_URL = 'https://onlineshopbuilding-droid.github.io/fondue/classic/';

interface Acceptance { punkte: { id: string; abschnitt: string; text: string; erledigt: boolean; beleg?: string }[] }

export interface DevInput {
  campaign: CampaignData;
  endless: EndlessDef;
  balanceMd: string;
  balanceDate: string;
  decisionsMd: string;
  acceptance: Acceptance;
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
    // The pictures are a bonus: the page is still useful without them.
    console.warn('weapon art not available:', (e as Error).message);
  }
  let balanceDate = '';
  try { balanceDate = JSON.parse(read(join(root, 'docs', 'balance-latest.json')) || '{}').date ?? ''; } catch { /* no date */ }
  return {
    campaign: campaignData({ worlds, campaign, enemies, weapons, keep, slots }),
    endless: worlds.worldById(worlds.DEFAULT_WORLD).endless,
    balanceMd: read(join(root, 'docs', 'balance-latest.md')),
    balanceDate,
    decisionsMd: read(join(root, 'docs', 'OFFENE-ENTSCHEIDUNGEN.md')),
    acceptance: JSON.parse(read(join(root, 'docs', 'abnahme-grosses-update.json')) || '{"punkte":[]}'),
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

const SLOT_DE: Record<string, string> = { foot: 'Mauerfuß', wall: 'Mauer', gate: 'Torarm', shrine: 'Schrein', tower: 'Turmdach' };
const TARGET_DE: Record<string, string> = { none: 'zielt nicht', front: 'vorderster Räuber', crowd: 'dichteste Gruppe', tough: 'zähster Räuber' };
const DIFF_DE: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

const table = (head: string[], rows: string[][], cls = ''): string =>
  `<div class="scroll"><table${cls ? ` class="${cls}"` : ''}><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
  + rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';

const enemyName = (t: string): string => esc(ENEMIES[t as EnemyType]?.name ?? t);
const pct = (v: number): string => `${num(v * 100, 0)} %`;

// ---------- sections ----------

function campaignSection(d: CampaignData): string {
  const cards = d.levels.map((l) => {
    const unlocks = d.unlocks.filter((u) => u.level === l.id).map((u) => unlockText(u, d));
    const types = ENEMY_TYPES.filter((t) => l.days.some((day) => (day.counts[t] ?? 0) > 0 || (day.big[t] ?? 0) > 0));
    const rows = types.map((t) => [enemyName(t) + (l.newEnemies.includes(t) ? ' <span class="tag new">neu</span>' : ''),
      ...l.days.map((day) => {
        const n = day.counts[t] ?? 0;
        const big = day.big[t] ?? 0;
        return `${n || ''}${big ? ` <span class="tag boss">+${big} Riese</span>` : ''}`;
      })]);
    rows.push(['<strong>Zusammen</strong>', ...l.days.map((day) => `<strong>${dayTotal(day.counts)}</strong>`)]);
    const head = ['Räuber', ...l.days.map((day, i) => `Tag ${i + 1}${day.night ? ' 🌙' : ''}`)];
    const badges = [
      l.boss ? `<span class="tag boss">Boss</span>` : '',
      l.newEnemies.length ? `<span class="tag new">neu: ${l.newEnemies.map(enemyName).join(', ')}</span>` : '',
      l.twist ? `<span class="tag twist">${esc(l.twist.label)}</span>` : '',
      unlocks.length ? `<span class="tag unlock">🔓 ${esc(unlocks.join(', '))}</span>` : '',
    ].join(' ');
    const search = [l.id, l.name, LANDSCAPE_DE[l.landscape], l.boss?.name ?? '', twistText(l.twist, d), unlocks.join(' '), l.newEnemies.map((t) => ENEMIES[t].name).join(' ')].join(' ').toLowerCase();
    const kinds = [l.boss ? 'boss' : '', l.newEnemies.length ? 'new' : '', l.twist ? 'twist' : '', unlocks.length ? 'unlock' : ''].join(' ');
    const extra = [
      `Landschaft: ${esc(LANDSCAPE_DE[l.landscape] ?? l.landscape)}`,
      `Stärke ×${num(l.power)}`,
      `${l.stars} ★ beim ersten Sieg`,
      l.startGold ? `Startgold ${l.startGold}` : '',
      l.marketOnly ? `Markt nur: ${esc(l.marketOnly.join(', '))}` : '',
      d.overrides[l.id] ? `✎ von Hand geändert: ${esc(d.overrides[l.id].join(', '))}` : '',
    ].filter(Boolean).join(' · ');
    return `<details class="lvl" id="level-${l.id}" data-search="${esc(search)}" data-kinds="${kinds}">
<summary><span class="num">${l.id}</span><span class="lname">${esc(l.name)}</span><span class="meta">${esc(LANDSCAPE_DE[l.landscape] ?? '')} · ${l.days.length} Tage · ${l.stars} ★</span> ${badges}</summary>
<div class="body">${l.boss ? `<p><strong>Boss: ${esc(bossText(l, d))}</strong> – <em>${esc(l.boss.line)}</em></p>` : ''}
${l.twist ? `<p>Besonderheit: ${esc(twistText(l.twist, d))}</p>` : ''}
<p class="small">${extra}</p>
${l.story ? `<p class="story">„${esc(l.story)}“</p>` : ''}
${table(head, rows, 'compact days')}</div></details>`;
  }).join('\n');
  const curve = table(['Wert', 'Zahl'], Object.entries(d.curve).map(([k, v]) => [`<code>${k}</code>`, num(v)]));
  return `<section id="kampagne"><h2>Kampagne</h2>
<p>Alle 100 Level mit allen Räubern je Tag (allein gespielt; zu zweit kommen mehr). Antippen klappt ein Level auf. Dasselbe als Tabelle: <code>docs/KAMPAGNE-TABELLE.md</code>. Ein Level ändern: <code>LEVEL_OVERRIDES</code> in <code>src/config/worlds/fondue/campaign.ts</code>.</p>
<div class="filter"><label>Suchen oder Level-Nummer <input id="q" type="search" inputmode="search" placeholder="z. B. 40, Boss-Name, Sumpf"></label>
<label>Zeigen <select id="kind"><option value="">alle Level</option><option value="boss">nur Boss-Level</option><option value="new">nur mit neuen Räubern</option><option value="twist">nur mit Besonderheit</option><option value="unlock">nur mit Freischaltung</option></select></label>
<span id="count" class="small"></span></div>
<div id="levels">${cards}</div>
<details class="box"><summary>Die Kurve (<code>CURVE</code>)</summary>${curve}</details></section>`;
}

/** Endless numbers: the count span per day and difficulty, and how often each raider shows up. */
function endlessSection(e: EndlessDef): string {
  const maxDay = 40;
  const s = e.countSpread;
  const countRows: string[][] = [];
  for (let day = 1; day <= maxDay; day++) {
    const row = [String(day)];
    for (const diff of DIFFS) {
      const base = enemyCountForDay(day, DIFFICULTIES[diff].count, 1);
      row.push(`${Math.round(base * (1 - s))}–${Math.round(base * (1 + s))}`);
    }
    const coop = enemyCountForDay(day, DIFFICULTIES.medium.count, 2);
    row.push(`${Math.round(coop * (1 - s))}–${Math.round(coop * (1 + s))}`);
    countRows.push(row);
  }

  // How often each type comes: many runs with fixed seeds, so the page is the same every time.
  const runs = 300;
  const planner = new EndlessPlanner(e, DIFFICULTIES.medium.count);
  const share: number[][] = Array.from({ length: maxDay }, () => ENEMY_TYPES.map(() => 0));
  const present: number[][] = Array.from({ length: maxDay }, () => ENEMY_TYPES.map(() => 0));
  for (let seed = 1; seed <= runs; seed++) {
    for (let day = 1; day <= maxDay; day++) {
      const plan = planner.plan(day, { seed, players: 1 }, new Rng(daySeed(seed, day)));
      const counts = ENEMY_TYPES.map(() => 0);
      for (const entry of plan.entries) counts[ENEMY_TYPES.indexOf(entry.type)]++;
      const total = plan.entries.length || 1;
      counts.forEach((n, i) => { share[day - 1][i] += n / total; if (n > 0) present[day - 1][i]++; });
    }
  }
  const typeRows = share.map((row, d) => [String(d + 1), ...row.map((v, i) => {
    const p = present[d][i] / runs;
    if (p === 0) return '';
    const [lo, hi] = e.types[ENEMY_TYPES[i]].firstDay;
    const first = d + 1 >= lo && d + 1 <= hi ? ' first' : '';
    return `<span class="sh${first}">${num((v / runs) * 100, 1)} %${p < 0.995 ? `<small> in ${pct(p)}</small>` : ''}</span>`;
  })]);
  const firstRows = ENEMY_TYPES.map((t) => {
    const def = e.types[t];
    return [enemyName(t), `${def.firstDay[0]}–${def.firstDay[1]}`, String(def.firstCount), pct(def.extraChance), num(def.weight), String(def.maxPerDay)];
  });
  const miles = DIFFS.map((diff) => [DIFF_DE[diff], e.milestones[diff].map((m) => `Tag ${m.day}: ${m.stars} ★`).join(' · '), String(e.milestones[diff].reduce((a, m) => a + m.stars, 0))]);
  return `<section id="endlos"><h2>Endlos</h2>
<p>Die Zahlen kommen aus <code>src/config/worlds/fondue/endless.ts</code> und <code>src/config/waves.ts</code>. Die Räuberzahl eines Tages schwankt um ±${pct(s)}. Endlos nutzt ${e.onlyUnlockedWeapons ? 'nur freigeschaltete Waffen' : 'alle Waffen und alle fünf Slots, egal wie weit die Kampagne ist'}${e.availableFromLevel ? ` und öffnet nach Level ${e.availableFromLevel}` : ' und ist von Anfang an offen'}.</p>
<h3>Erstauftritte</h3>
<p class="small">Jeder Lauf würfelt einmal, an welchem Tag ein Räuber zum ersten Mal kommt. An diesem Tag kommen „Anzahl“ Stück, mit der Chance „eins mehr“ einer mehr.</p>
${table(['Räuber', 'Erster Tag', 'Anzahl', 'eins mehr', 'Gewicht', 'höchstens je Tag'], firstRows)}
<h3>Räuber je Tag</h3>
${table(['Tag', 'Easy', 'Medium', 'Hard', 'Medium zu zweit'], countRows)}
<h3>Anteil jedes Räubers (Medium, allein)</h3>
<p class="small">Durchschnittlicher Anteil an allen Räubern des Tages aus ${runs} Läufen. „in 40 %“: Der Räuber ist nur in so vielen Läufen an diesem Tag schon da. Gelb: Tag liegt in der Spanne seines Erstauftritts.</p>
${table(['Tag', ...ENEMY_TYPES.map(enemyName)], typeRows, 'compact shares')}
<h3>Sterne im Endlos-Modus</h3>
<p class="small">Einmalig je Schwierigkeit, wenn der Tag zum ersten Mal erreicht wird.</p>
${table(['Schwierigkeit', 'Meilensteine', 'zusammen'], miles)}</section>`;
}

function weaponSection(unlocks: CampaignData, art: Record<string, string>): string {
  const unlockLevel = (id: string) => unlocks.unlocks.find((u) => u.kind === 'weapon' && u.weapon === id)?.level;
  const cards = WEAPONS.map((w: WeaponDef) => {
    const rows = (w.tiers as unknown as Record<string, unknown>[]).map((tier, i) => {
      const stats = Object.entries(tier).filter(([k]) => k !== 'cooldown' && k !== 'note')
        .map(([k, v]) => `${k} ${typeof v === 'number' ? num(v) : typeof v === 'boolean' ? (v ? 'ja' : 'nein') : esc(String(v))}`).join(' · ');
      const price = i === 0 ? `${w.buyGold} Gold${w.buyOfferings ? ` + ${w.buyOfferings} Offerings` : ''}` : (() => { const p = upgradePrice(w, i + 1); return `${p.gold} Gold${p.offerings ? ` + ${p.offerings} Offerings` : ''}`; })();
      return [String(i + 1), `${num(Number(tier.cooldown))} s`, `<span class="small">${stats}</span>`, esc(String(tier.note)), price, i === 0 ? (STARS.weaponUnlock ? `${STARS.weaponUnlock} ★` : 'frei') : `${weaponTierPrice(i + 1)} ★`];
    });
    const lvl = unlockLevel(w.id);
    const img = art[w.id] ? `<img class="wart" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(art[w.id])}">` : '';
    return `<article class="card weapon${w.enabled ? '' : ' off'}" id="waffe-${w.id}">
<header>${img}<div><h3>${esc(w.name)} <code>${w.id}</code>${w.enabled ? '' : ' <span class="tag boss">abgeschaltet</span>'}</h3>
<p class="small">Slot: ${SLOT_DE[w.slotType] ?? w.slotType} · Art: ${w.kind} · Ziel: ${TARGET_DE[w.target] ?? w.target} · ${lvl === undefined ? 'nicht in der Freischalt-Tabelle' : lvl === 0 ? 'von Anfang an' : `frei nach Level ${lvl}`}</p>
<p>${esc(w.desc)}</p></div></header>
${table(['Stufe', 'Abklingen', 'Werte', 'Was die Stufe bringt', 'Preis im Endlos-Lauf', 'Sterne im Arsenal'], rows, 'compact wtiers')}</article>`;
  }).join('\n');
  return `<section id="waffen"><h2>Waffen</h2>
<p>Alle ${WEAPONS.length} Waffen aus <code>src/config/weapons.ts</code> mit allen ${MAX_TIER} Stufen. In der Kampagne kauft man eine Waffe im Level einmal für Gold (Preis bei Stufe 1) und sie hat ihre dauerhafte Stufe; Stufen kosten dort Sterne. Im Endlos-Lauf kosten Stufen Gold und Offerings.</p>
${cards}</section>`;
}

function enemySection(firstLevel: Record<string, number>): string {
  const rows = ENEMY_TYPES.map((t) => {
    const e = ENEMIES[t];
    return [`<strong>${esc(e.name)}</strong><br><code>${t}</code>`, String(firstLevel[t] ?? '–'), String(e.hp), String(e.speed), `${e.strike} / ${num(e.strikeEvery)} s`, String(e.range), num(e.mass), String(e.gold), String(e.score), e.grabbable ? 'ja' : 'nein', `<span class="small">${esc(e.tip)}</span>`];
  });
  return `<section id="gegner"><h2>Gegner</h2>
<p>Aus <code>src/config/enemies.ts</code>. Gewicht: 1 = Pothelm; schwerere Räuber fliegen beim gleichen Wisch kürzer. Lebenspunkte zählen nur gegen Waffen; ein Wurf ignoriert sie.</p>
${table(['Räuber', 'Erstes Level', 'Leben', 'Tempo', 'Schlag / alle', 'Reichweite', 'Gewicht', 'Gold', 'Punkte', 'greifbar', 'Tipp im Spiel'], rows, 'compact')}</section>`;
}

function unlockSection(d: CampaignData): string {
  let stars = 0;
  const starsBy: number[] = [0];
  for (const l of d.levels) { stars += l.stars; starsBy[l.id] = stars; }
  const rows = [...d.unlocks].sort((a, b) => a.level - b.level).map((u) => [u.level === 0 ? 'Start' : String(u.level), esc(unlockText(u, d)), u.level === 0 ? '0' : String(starsBy[u.level] ?? '')]);
  const enabled = WEAPONS.filter((w) => w.enabled).length;
  const tierSum = STARS.weaponTier.reduce((a, b) => a + b, 0);
  const handSum = HANDS.reduce((a, h) => a + h.stars, 0);
  const cost = enabled * (tierSum + STARS.weaponUnlock) + handSum;
  const pace = d.levels.filter((l) => l.id % 10 === 0).map((l) => [String(l.id), String(starsBy[l.id])]);
  const hands = HANDS.map((h, i) => [String(i + 1), num(h.strength), `${h.stars} ★`, `${h.gold} Gold + ${h.offerings} Offerings`, esc(h.note)]);
  const gates = keep.GATES.map((g, i) => [String(i), esc(g.name), String(g.hp), `${g.gold} Gold${g.offerings ? ` + ${g.offerings} Offerings` : ''}`]);
  return `<section id="freischalten"><h2>Freischaltungen und Sterne</h2>
<p>Die Freischalt-Tabelle steht in <code>src/config/worlds/fondue/unlocks.ts</code>: Der Sieg im genannten Level schaltet frei. Die Spalte rechts zeigt, wie viele Sterne man bis dahin höchstens gesammelt hat.</p>
${table(['Level', 'Freischaltung', 'Sterne bis dahin'], rows)}
<h3>Stern-Wirtschaft</h3>
<ul>
<li>Erster Sieg: ${STARS.level.normal} ★ normal, ${STARS.level.special} ★ für Level mit etwas Neuem oder einer Besonderheit, ${STARS.level.boss} ★ für Boss-Level. Zusammen ${stars} ★.</li>
<li>Wiederholung: ${pct(STARS.replayShare)} der Sterne. Koop-Gast: ${pct(STARS.guestShare)}, einmal je Level, aufgerundet.</li>
<li>Waffenstufen 2 bis 5 kosten ${STARS.weaponTier.slice(1).join(' / ')} ★ (zusammen ${tierSum} ★ je Waffe); das erste Freischalten kostet ${STARS.weaponUnlock ? `${STARS.weaponUnlock} ★` : 'nichts'}.</li>
<li>Alles auf höchster Stufe (${enabled} Waffen und die Hand): ${cost} ★, die Kampagne bringt ${stars} ★, dazu Endlos-Meilensteine.</li>
<li>Yeti: zwei Hände heben ihn gemeinsam ab einer Stärke von zusammen ${num(HAND_RULES.yetiLift)}.</li>
</ul>
<div class="two">${table(['nach Level', 'Sterne bis dahin'], pace)}
${table(['Hand', 'Stärke', 'Arsenal', 'Endlos-Lauf', 'Beschreibung'], hands)}</div>
<h3>Tore</h3>
${table(['Stufe', 'Tor', 'Leben', 'Preis im Level'], gates)}</section>`;
}

function acceptanceSection(a: Acceptance): string {
  const all = a.punkte ?? [];
  const done = all.filter((p) => p.erledigt).length;
  const groups = new Map<string, typeof all>();
  for (const p of all) { if (!groups.has(p.abschnitt)) groups.set(p.abschnitt, []); groups.get(p.abschnitt)!.push(p); }
  const rows = [...groups.entries()].map(([g, list]) => {
    const n = list.filter((p) => p.erledigt).length;
    return [esc(g), `${n} / ${list.length}`, `<span class="bar"><span style="width:${list.length ? Math.round((n / list.length) * 100) : 0}%"></span></span>`];
  });
  const lists = [...groups.entries()].map(([g, list]) => `<details class="box"><summary>Abschnitt ${esc(g)} (${list.filter((p) => p.erledigt).length} / ${list.length})</summary><ul class="checks">`
    + list.map((p) => `<li class="${p.erledigt ? 'done' : ''}"><span class="mark">${p.erledigt ? '✓' : '○'}</span> <code>${esc(p.id)}</code> ${inline(p.text)}${p.beleg ? `<br><span class="small">Beleg: ${inline(p.beleg)}</span>` : ''}</li>`).join('')
    + '</ul></details>').join('\n');
  return `<section id="abnahme"><h2>Abnahmeliste</h2>
<p>Aus <code>docs/abnahme-grosses-update.json</code>. Ein Punkt gilt nur mit echtem Beleg als erledigt.</p>
<p class="big">${done} von ${all.length} erledigt</p>
<span class="bar wide"><span style="width:${all.length ? Math.round((done / all.length) * 100) : 0}%"></span></span>
${table(['Abschnitt', 'erledigt', ''], rows)}
${lists}</section>`;
}

function css(f: DevInput['fonts']): string {
  const face = (name: string, data: string | undefined, weight: number) => data ? `@font-face{font-family:"${name}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-display:swap}` : '';
  return `${face('Lilita One', f.display, 400)}${face('Nunito', f.body, 400)}${face('Nunito', f.bodyBold, 800)}
:root{--bg:#fbeed0;--card:#fff6df;--ink:#2b2118;--muted:#6b5a48;--line:#e2cfa6;--accent:#2f7f7a;--gold:#e9b44c;--rust:#c8553d;--wood:#8a5a33;--wood-dark:#5e3b20;--plum:#6a3d6e;--hi:#fbe3a0;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1d1712;--card:#2a211a;--ink:#f6ecd8;--muted:#bba88f;--line:#4a3a2b;--accent:#5cb8b0;--gold:#e9b44c;--rust:#e88068;--wood:#6b4527;--wood-dark:#3e2715;--plum:#b07ab5;--hi:#5a4720;color-scheme:dark}}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:56px}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Nunito,system-ui,-apple-system,"Segoe UI",sans-serif}
h1,h2,h3,h4{font-family:"Lilita One",Nunito,system-ui,sans-serif;font-weight:400;line-height:1.2;letter-spacing:.01em}
h2{font-size:1.8rem;margin:2.2rem 0 .6rem;color:var(--accent)}h3{font-size:1.25rem;margin:1.6rem 0 .5rem}h4{font-size:1.05rem;margin:1.2rem 0 .4rem}
a{color:var(--accent)}code{font-family:ui-monospace,Consolas,monospace;font-size:.85em;background:color-mix(in srgb,var(--line) 55%,transparent);padding:.05em .3em;border-radius:4px}
header.top{background:linear-gradient(var(--wood),var(--wood-dark));color:#fff6df;padding:20px 16px 18px}
header.top h1{margin:0;font-size:2rem;text-shadow:0 2px 0 rgba(0,0,0,.25)}header.top p{margin:.3rem 0 0;opacity:.9}
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.links a{background:var(--gold);color:#2b2118;text-decoration:none;font-weight:800;padding:8px 14px;border-radius:999px;box-shadow:0 2px 0 rgba(0,0,0,.25)}
nav{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:2px solid var(--line);display:flex;gap:4px;overflow-x:auto;padding:6px 10px;scrollbar-width:none}
nav a{white-space:nowrap;text-decoration:none;color:var(--ink);font-weight:800;font-size:.9rem;padding:6px 10px;border-radius:8px}nav a:hover{background:var(--line)}
main{max-width:1100px;margin:0 auto;padding:0 16px 48px}
.small{font-size:.85rem;color:var(--muted)}.big{font-size:1.4rem;font-weight:800;margin:.4rem 0}
.scroll{overflow-x:auto;margin:.6rem 0;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{padding:6px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{position:sticky;top:0;background:color-mix(in srgb,var(--line) 60%,var(--card));font-weight:800;white-space:nowrap}tr:last-child td{border-bottom:0}
table.compact td,table.compact th{padding:4px 7px}table.days td{white-space:nowrap}.wtiers td:nth-child(3){min-width:15em}.wtiers td:nth-child(4){min-width:13em}.wtiers td:nth-child(5){white-space:nowrap}table.shares td{white-space:nowrap}.sh.first{background:var(--hi);border-radius:4px;padding:0 3px}.sh small{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}.stat b{display:block;font-family:"Lilita One",sans-serif;font-weight:400;font-size:1.7rem;color:var(--accent)}
.filter{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:.6rem 0}.filter label{display:flex;flex-direction:column;font-size:.85rem;font-weight:800;gap:3px}
input,select{font:inherit;padding:8px 10px;border-radius:8px;border:2px solid var(--line);background:var(--card);color:var(--ink);min-width:min(260px,80vw)}
details.lvl{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:6px 0}details.lvl[open]{border-color:var(--accent)}
details.lvl summary{cursor:pointer;padding:9px 12px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;list-style:none}details summary::-webkit-details-marker{display:none}
.num{font-family:"Lilita One",sans-serif;font-size:1.25rem;min-width:2.2em;color:var(--accent)}.lname{font-weight:800}.meta{font-size:.85rem;color:var(--muted)}
details.lvl .body{padding:0 12px 10px}.story{font-style:italic;color:var(--muted)}
.tag{display:inline-block;font-size:.75rem;font-weight:800;padding:1px 7px;border-radius:999px;background:var(--line);color:var(--ink)}
.tag.boss{background:var(--rust);color:#fff}.tag.new{background:var(--accent);color:#fff}.tag.twist{background:var(--plum);color:#fff}.tag.unlock{background:var(--gold);color:#2b2118}
details.box{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:8px 0;padding:0 12px}details.box summary{cursor:pointer;padding:9px 0;font-weight:800}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:12px 0}.card.off{opacity:.6}
.weapon header{display:flex;gap:12px;align-items:flex-start}.weapon h3{margin:0 0 .2rem}.weapon p{margin:.2rem 0}.wart{width:72px;height:72px;object-fit:contain;flex:none;background:var(--bg);border-radius:12px;padding:4px}
.two{display:grid;grid-template-columns:1fr;gap:10px}@media (min-width:760px){.two{grid-template-columns:1fr 2fr}}
.bar{display:inline-block;width:120px;height:10px;border-radius:5px;background:var(--line);overflow:hidden;vertical-align:middle}.bar span{display:block;height:100%;background:var(--accent)}.bar.wide{width:100%;height:14px;border-radius:7px}
ul.checks{list-style:none;padding:0}ul.checks li{padding:5px 0;border-bottom:1px solid var(--line)}ul.checks li.done .mark{color:var(--accent);font-weight:800}ul.checks .mark{color:var(--muted)}
.md table{font-size:.85rem}.md td:first-child{white-space:nowrap}footer{text-align:center;color:var(--muted);font-size:.8rem;padding:24px 16px}`;
}

const SCRIPT = `(function(){var q=document.getElementById('q'),k=document.getElementById('kind'),c=document.getElementById('count');var cards=[].slice.call(document.querySelectorAll('details.lvl'));
function run(){var t=(q.value||'').trim().toLowerCase(),kind=k.value,n=0;var only=/^\\d+$/.test(t)?Number(t):0;cards.forEach(function(d){var ok=(!kind||d.dataset.kinds.indexOf(kind)>=0)&&(only?d.id==='level-'+only:d.dataset.search.indexOf(t)>=0);d.hidden=!ok;if(ok)n++;});c.textContent=n+' von '+cards.length+' Level';if(only){var el=document.getElementById('level-'+only);if(el){el.open=true;}}}
q.addEventListener('input',run);k.addEventListener('change',run);run();
function hash(){var m=/^#level-(\\d+)$/.exec(location.hash);if(m){var el=document.getElementById('level-'+m[1]);if(el){el.open=true;el.scrollIntoView();}}}window.addEventListener('hashchange',hash);hash();})();`;

/** The whole page. Pure: the same input gives the same HTML. */
export function renderDevPage(input: DevInput): string {
  const d = input.campaign;
  const bosses = d.levels.filter((l) => l.boss).length;
  const totalStars = d.levels.reduce((a, l) => a + l.stars, 0);
  const done = input.acceptance.punkte.filter((p) => p.erledigt).length;
  const stats = [
    [String(d.levels.length), 'Level'], [String(bosses), 'Boss-Level'], [String(WEAPONS.filter((w) => w.enabled).length), 'Waffen'],
    [String(ENEMY_TYPES.length), 'Räuberarten'], [String(totalStars), 'Sterne in der Kampagne'], [`${done}/${input.acceptance.punkte.length}`, 'Abnahme erledigt'],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b>${l}</div>`).join('');
  const nav = [['start', 'Start'], ['kampagne', 'Kampagne'], ['endlos', 'Endlos'], ['waffen', 'Waffen'], ['gegner', 'Gegner'], ['freischalten', 'Freischalten & Sterne'], ['balance', 'Balance'], ['entscheidungen', 'Entscheidungen'], ['abnahme', 'Abnahme']]
    .map(([id, t]) => `<a href="#${id}">${t}</a>`).join('');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(GAME_NAME)} – Entwickler-Übersicht</title>
<style>${css(input.fonts)}</style></head><body>
<header class="top" id="start"><h1>${esc(GAME_NAME)} – Entwickler-Übersicht</h1>
<p>Automatisch erzeugt aus den Konfigurationsdateien am ${esc(input.generated)}, Stand <code>${esc(input.version)}</code>. Nicht von Hand ändern: <code>npm run dev-page</code>.</p>
<div class="links"><a href="${LIVE_URL}">Spiel öffnen</a><a href="${CLASSIC_URL}">Classic-Version</a></div></header>
<nav>${nav}</nav>
<main>
<div class="cards" style="margin-top:16px">${stats}</div>
${campaignSection(d)}
${endlessSection(input.endless)}
${weaponSection(d, input.weaponArt)}
${enemySection(d.firstLevel)}
${unlockSection(d)}
<section id="balance" class="md"><h2>Balance</h2>
<p>Neueste Ergebnisse der Bots${input.balanceDate ? ` vom ${esc(input.balanceDate)}` : ''} (<code>npm run balance</code>, aus <code>docs/balance-latest.md</code>).</p>
${input.balanceMd ? markdown(input.balanceMd, 2) : '<p>Noch kein Balance-Lauf.</p>'}</section>
<section id="entscheidungen" class="md"><h2>Offene Entscheidungen</h2>
${input.decisionsMd ? markdown(input.decisionsMd, 2) : '<p>Die Liste fehlt noch.</p>'}</section>
${acceptanceSection(input.acceptance)}
</main>
<footer>${esc(GAME_NAME)} · erzeugt von <code>scripts/dev-page.ts</code></footer>
<script>${SCRIPT}</script>
</body></html>
`;
}
