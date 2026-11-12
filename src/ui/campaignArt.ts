// Drawings and layout of the campaign map: where each station sits on the winding path, the landscape
// bands, and the small scenery pieces. Everything is plain SVG and CSS built as strings, so the map
// needs no images and stays light with 100 stations. The screen itself lives in screens/campaign.ts.
import type { Landscape } from '../config/waves';

/** Horizontal distance between two stations, in CSS pixels. */
export const STEP = 96;
/** Space left of the first station (the keep stands there) and right of the last (the raider camp). */
const START = 250;
const END_PAD = 260;

/** Left edge of station `id` (1-based) in map pixels. */
export const stationX = (id: number) => START + (id - 1) * STEP;
/** Height of station `id` in percent of the map height: a gentle, uneven meander. */
export const stationY = (id: number) => 52 + 23 * Math.sin(id * 0.55) + 8 * Math.sin(id * 0.17 + 0.8);
export const mapWidth = (count: number) => stationX(count) + END_PAD;

/** Where the path starts (at the keep's gate) and ends (at the camp). */
const KEEP_X = 120;
const KEEP_Y = 66;
const campX = (count: number) => stationX(count) + 150;
const CAMP_Y = 56;

/** A fixed pseudo-random number between 0 and 1, so the scenery looks the same every time. */
function rnd(a: number, b: number): number {
  let h = Math.imul(a + 17, 374761393) ^ Math.imul(b + 5, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Pt = [number, number];

/** Catmull-Rom through the points, as cubic Bezier pieces. Piece i runs from point i to point i + 1. */
function curvePieces(pts: Pt[]): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    pieces.push(`C${c1[0].toFixed(1)} ${c1[1].toFixed(2)} ${c2[0].toFixed(1)} ${c2[1].toFixed(2)} ${p2[0].toFixed(1)} ${p2[1].toFixed(2)}`);
  }
  return pieces;
}

/**
 * The path as one SVG over the whole map: a sandy road, a cheese-gold trail up to the current
 * station, dots beyond it. `reached` is the number of the current station.
 */
export function pathSvg(count: number, reached: number): string {
  const pts: Pt[] = [[KEEP_X, KEEP_Y]];
  for (let id = 1; id <= count; id++) pts.push([stationX(id), stationY(id)]);
  pts.push([campX(count), CAMP_Y]);
  const pieces = curvePieces(pts);
  const start = `M${KEEP_X} ${KEEP_Y}`;
  const all = start + pieces.join('');
  // Piece i ends at station i (the keep is point 0), so the trail is the first `reached` pieces.
  const trail = start + pieces.slice(0, reached).join('');
  const w = mapWidth(count);
  return `<svg class="cm-path" width="${w}" viewBox="0 0 ${w} 100" preserveAspectRatio="none" aria-hidden="true">
    <path d="${all}" class="cm-road-edge"/><path d="${all}" class="cm-road"/>
    <path d="${all}" class="cm-dots"/><path d="${trail}" class="cm-trail"/></svg>`;
}

/** Colours of each landscape: far land, near ground, mountains, and whether peaks carry snow. */
const LAND_LOOK: Record<Landscape, { far: string; ground: string; hills: string; snow: boolean }> = {
  meadow: { far: '#d6edb4', ground: '#9ccc6a', hills: '#7fa894', snow: true },
  canyon: { far: '#f6d6a2', ground: '#e0a165', hills: '#c06f45', snow: false },
  marsh: { far: '#c4d6bb', ground: '#7fa386', hills: '#5f8478', snow: false },
  snowpine: { far: '#dce9f2', ground: '#f1f6f9', hills: '#93abc2', snow: true },
};

/** Scenery each landscape scatters along the path, with their drawn size in pixels. */
const LAND_DECO: Record<Landscape, [string, number, number][]> = {
  meadow: [['tree', 40, 56], ['tree', 34, 48], ['bush', 36, 22], ['flowers', 30, 16], ['chalet', 54, 46], ['bush', 30, 18]],
  canyon: [['rock', 40, 28], ['mesa', 92, 50], ['shrub', 30, 20], ['rock', 30, 21], ['cactus', 26, 40]],
  marsh: [['reeds', 30, 40], ['pond', 70, 24], ['deadtree', 36, 56], ['reeds', 24, 32], ['shrub', 30, 20]],
  snowpine: [['pine', 36, 64], ['pine', 30, 52], ['snowrock', 44, 26], ['pine', 26, 44], ['snowman', 28, 38]],
};

/** Name of a landscape on its signpost. */
export const landName = (l: Landscape) => l.charAt(0).toUpperCase() + l.slice(1);

export interface Band { land: Landscape; from: number; to: number }

/** Splits the levels into runs of the same landscape. `lands[i]` is the landscape of level i + 1. */
export function bandsOf(lands: Landscape[]): Band[] {
  const bands: Band[] = [];
  lands.forEach((land, i) => {
    const last = bands[bands.length - 1];
    if (last && last.land === land) last.to = i + 1;
    else bands.push({ land, from: i + 1, to: i + 1 });
  });
  return bands;
}

/** Height of the path (percent) at map position x, from the two stations around it. */
function pathYAt(x: number, count: number): number {
  const f = (x - START) / STEP + 1;
  if (f <= 1) return stationY(1);
  if (f >= count) return stationY(count);
  const a = Math.floor(f);
  const t = f - a;
  return stationY(a) * (1 - t) + stationY(a + 1) * t;
}

/** Overlap of two neighbouring bands, where one fades into the next. */
const FADE = 90;

/**
 * The landscape bands with their far mountains, scenery and signpost. Stations listed in `labelled`
 * carry a name tag (boss levels), so no scenery stands right around them.
 */
export function landscapeHtml(bands: Band[], count: number, labelled: number[] = []): string {
  const total = mapWidth(count);
  return bands.map((b, bi) => {
    const look = LAND_LOOK[b.land];
    const x0 = bi === 0 ? 0 : stationX(b.from) - STEP / 2;
    const x1 = bi === bands.length - 1 ? total : stationX(b.to) + STEP / 2;
    const w = x1 - x0 + (bi === bands.length - 1 ? 0 : FADE);
    // Far mountains: a jagged line across the band, drawn stretched to the band.
    const peaks = Math.max(3, Math.round(w / 160));
    let poly = '0,100 ';
    const caps: string[] = [];
    for (let i = 0; i <= peaks * 2; i++) {
      const px = (i / (peaks * 2)) * 100;
      const top = i % 2 === 1;
      const py = top ? 18 + rnd(bi, i) * 34 : 62 + rnd(i, bi) * 20;
      poly += `${px.toFixed(1)},${py.toFixed(1)} `;
      if (top && look.snow) caps.push(`${(px - 2.2).toFixed(1)},${(py + 12).toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)} ${(px + 2.2).toFixed(1)},${(py + 12).toFixed(1)}`);
    }
    poly += '100,100';
    const hills = `<svg class="cm-hills" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${poly}" fill="${look.hills}"/>${caps.map((c) => `<polygon points="${c}" fill="#fbfdff"/>`).join('')}</svg>`;
    // Scenery: roughly one piece every 64 px, always away from the path.
    const kinds = LAND_DECO[b.land];
    let deco = '';
    for (let x = x0 + 20, k = 0; x < x1 - 10; x += 52 + rnd(bi, k) * 30, k++) {
      if (bi === 0 && x < 230) continue; // the keep stands there
      if (bi === bands.length - 1 && x > total - 240) continue; // and there the camp
      const [kind, dw, dh] = kinds[Math.floor(rnd(k, bi + 7) * kinds.length)];
      if (labelled.some((id) => Math.abs(stationX(id) - x) < 70)) continue;
      const py = pathYAt(x, count);
      // A piece stands on its foot and grows upwards, so below the path it needs room for its height
      // (about 3.3 px per percent on a phone in landscape).
      const above: [number, number] = [42, py - 15];
      const below: [number, number] = [py + 12 + dh / 3.3, 97];
      const span = (r: [number, number]) => r[1] - r[0];
      const pick = span(above) > 6 && (span(below) < 6 || rnd(x, k) < 0.45) ? above : below;
      if (span(pick) < 4) continue;
      const y = pick[0] + rnd(k, x) * span(pick);
      deco += `<svg class="cm-deco" style="left:${(x - x0).toFixed(0)}px;top:${y.toFixed(1)}%;width:${dw}px;height:${dh}px" viewBox="0 0 ${dw} ${dh}" aria-hidden="true"><use href="#cm-${kind}"/></svg>`;
    }
    const sign = `<span class="cm-sign" style="left:${bi === 0 ? 210 : STEP / 2 + 6}px">${landName(b.land)}</span>`;
    return `<div class="cm-band land-${b.land} ${bi === bands.length - 1 ? 'last' : ''}" style="left:${x0}px;width:${w}px;z-index:${bands.length - bi};--far:${look.far};--ground:${look.ground}">${hills}${deco}${sign}</div>`;
  }).join('');
}

/** The keep at the start and the raider camp at the end of the path. */
export function endsHtml(count: number): string {
  return `<svg class="cm-keep" style="left:${KEEP_X - 75}px;top:${KEEP_Y + 4}%" viewBox="0 -14 150 144" aria-hidden="true"><use href="#cm-keep"/></svg>
    <svg class="cm-camp" style="left:${campX(count) - 70}px;top:${CAMP_Y + 4}%" viewBox="0 0 140 100" aria-hidden="true"><use href="#cm-camp"/></svg>`;
}

const INK = '#2b2118';

/** Every drawing the map uses, defined once and placed with <use>. */
export const MAP_SYMBOLS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="cm-tree" viewBox="0 0 40 56"><rect x="17" y="34" width="6" height="21" rx="2" fill="#7a4b2a" stroke="${INK}" stroke-width="2"/>
    <circle cx="20" cy="22" r="16" fill="#5f9e45" stroke="${INK}" stroke-width="2.5"/><circle cx="14" cy="16" r="5" fill="#8cc760"/></symbol>
  <symbol id="cm-bush" viewBox="0 0 36 22"><ellipse cx="18" cy="13" rx="16" ry="8" fill="#6caa4a" stroke="${INK}" stroke-width="2"/><ellipse cx="13" cy="10" rx="5" ry="2.5" fill="#94cd68"/></symbol>
  <symbol id="cm-flowers" viewBox="0 0 30 16"><path d="M6 16V8M15 16V5M24 16V9" stroke="#3f7a35" stroke-width="2"/>
    <circle cx="6" cy="7" r="3.5" fill="#f2d24b" stroke="${INK}" stroke-width="1.5"/><circle cx="15" cy="4" r="3.5" fill="#e86a8a" stroke="${INK}" stroke-width="1.5"/><circle cx="24" cy="8" r="3.5" fill="#fff" stroke="${INK}" stroke-width="1.5"/></symbol>
  <symbol id="cm-chalet" viewBox="0 0 54 46"><rect x="9" y="20" width="36" height="24" fill="#c98b4d" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="3,23 27,5 51,23" fill="#9a4a2e" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="22" y="28" width="10" height="9" fill="#f6dd8a" stroke="${INK}" stroke-width="2"/></symbol>
  <symbol id="cm-rock" viewBox="0 0 40 28"><polygon points="2,26 8,10 18,3 30,8 38,26" fill="#b8794e" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="10,12 18,6 22,12" fill="#d79a6b"/></symbol>
  <symbol id="cm-mesa" viewBox="0 0 92 50"><polygon points="3,48 16,10 76,10 89,48" fill="#c9774c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 24H80M8 36H84" stroke="#a65a37" stroke-width="3"/><rect x="16" y="9" width="60" height="5" fill="#e0956a"/></symbol>
  <symbol id="cm-shrub" viewBox="0 0 30 20"><ellipse cx="15" cy="12" rx="13" ry="7" fill="#9a9b4a" stroke="${INK}" stroke-width="2"/></symbol>
  <symbol id="cm-cactus" viewBox="0 0 26 40"><path d="M13 39V6M13 22H5V13M13 18H21V10" stroke="${INK}" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M13 39V6M13 22H5V13M13 18H21V10" stroke="#6f9a4a" stroke-width="4.5" stroke-linecap="round" fill="none"/></symbol>
  <symbol id="cm-reeds" viewBox="0 0 30 40"><path d="M6 40Q7 22 4 10M15 40V6M24 40Q23 24 27 12" stroke="#5f7a3a" stroke-width="2.5" fill="none"/>
    <rect x="1.5" y="6" width="5" height="11" rx="2.5" fill="#7a4b2a" stroke="${INK}" stroke-width="1.5"/><rect x="12.5" y="2" width="5" height="12" rx="2.5" fill="#7a4b2a" stroke="${INK}" stroke-width="1.5"/></symbol>
  <symbol id="cm-pond" viewBox="0 0 70 24"><ellipse cx="35" cy="12" rx="33" ry="10" fill="#5f8f9a" stroke="${INK}" stroke-width="2.5"/><path d="M18 10H32M40 15H52" stroke="#a9d3d6" stroke-width="2.5" stroke-linecap="round"/></symbol>
  <symbol id="cm-deadtree" viewBox="0 0 36 56"><path d="M18 56V24L9 12M18 30L28 16L32 18M18 22V8" stroke="${INK}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M18 56V24L9 12M18 30L28 16L32 18M18 22V8" stroke="#6a5844" stroke-width="3.5" stroke-linecap="round" fill="none"/></symbol>
  <symbol id="cm-pine" viewBox="0 0 36 64"><rect x="15" y="50" width="6" height="13" fill="#6a4529" stroke="${INK}" stroke-width="2"/>
    <polygon points="18,2 31,24 5,24" fill="#2f6b55" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <polygon points="18,14 34,39 2,39" fill="#2f6b55" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <polygon points="18,28 35,52 1,52" fill="#2f6b55" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 12L18 4L24 12M8 31L18 17L28 31M5 45L18 31L31 45" stroke="#fbfdff" stroke-width="3" fill="none" stroke-linejoin="round"/></symbol>
  <symbol id="cm-snowrock" viewBox="0 0 44 26"><polygon points="2,25 9,9 21,3 34,8 42,25" fill="#8e98a6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="10,10 21,4 33,9 26,12 18,9" fill="#fbfdff"/></symbol>
  <symbol id="cm-snowman" viewBox="0 0 28 38"><circle cx="14" cy="27" r="10" fill="#fbfdff" stroke="${INK}" stroke-width="2.5"/><circle cx="14" cy="11" r="7" fill="#fbfdff" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="14,11 22,13 14,14" fill="#e9893a"/><rect x="8" y="1" width="12" height="5" fill="${INK}"/></symbol>
  <symbol id="cm-keep" viewBox="0 -14 150 144">
    <polygon points="0,130 30,40 60,70 95,20 150,130" fill="#a9bccb" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="85,36 95,20 106,40 98,36 92,42" fill="#fbfdff"/>
    <rect x="22" y="58" width="106" height="66" fill="#d9c7a3" stroke="${INK}" stroke-width="3.5"/>
    <path d="M22 58v-10h12v10M46 58v-10h12v10M70 58v-10h12v10M94 58v-10h12v10M116 58v-10h12v10" fill="#d9c7a3" stroke="${INK}" stroke-width="3.5"/>
    <rect x="14" y="30" width="28" height="94" fill="#cbb48b" stroke="${INK}" stroke-width="3.5"/><polygon points="10,32 28,6 46,32" fill="#c8553d" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="108" y="36" width="28" height="88" fill="#cbb48b" stroke="${INK}" stroke-width="3.5"/><polygon points="104,38 122,12 140,38" fill="#c8553d" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M28 6V-10" stroke="${INK}" stroke-width="3"/><polygon points="29,-10 46,-4 29,2" fill="#e9b44c" stroke="${INK}" stroke-width="2.5"/>
    <path d="M60 124V96a15 15 0 0 1 30 0v28z" fill="#8a5a33" stroke="${INK}" stroke-width="3.5"/><path d="M75 82V124" stroke="${INK}" stroke-width="2.5"/>
    <rect x="22" y="70" width="12" height="16" rx="6" fill="#2b2118"/><rect x="116" y="70" width="12" height="16" rx="6" fill="#2b2118"/></symbol>
  <symbol id="cm-camp" viewBox="0 0 140 100">
    <polygon points="6,96 40,36 74,96" fill="#7d4c82" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><polygon points="40,36 32,96 48,96" fill="#2b2118"/>
    <polygon points="62,96 98,28 134,96" fill="#5e3b20" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M80 62H116M72 80H124" stroke="#8a5a33" stroke-width="4"/>
    <polygon points="98,28 90,96 106,96" fill="#2b2118"/>
    <path d="M98 28V4" stroke="${INK}" stroke-width="3"/><polygon points="99,4 122,10 99,17" fill="#2b2118" stroke="${INK}" stroke-width="2"/>
    <circle cx="108" cy="11" r="2.5" fill="#e9b44c"/></symbol>
  <symbol id="cm-mouse" viewBox="0 0 44 40">
    <circle cx="10" cy="12" r="9" fill="#a8a2ad" stroke="${INK}" stroke-width="2.5"/><circle cx="10" cy="12" r="4.5" fill="#f0a7b4"/>
    <circle cx="34" cy="12" r="9" fill="#a8a2ad" stroke="${INK}" stroke-width="2.5"/><circle cx="34" cy="12" r="4.5" fill="#f0a7b4"/>
    <ellipse cx="22" cy="24" rx="14" ry="13" fill="#bdb7c2" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="16.5" cy="22" r="2.3" fill="${INK}"/><circle cx="27.5" cy="22" r="2.3" fill="${INK}"/>
    <ellipse cx="22" cy="30" rx="3.2" ry="2.4" fill="#e66f86" stroke="${INK}" stroke-width="1.5"/>
    <path d="M12 29H4M12 32L5 35M32 29H40M32 32L39 35" stroke="${INK}" stroke-width="1.5"/></symbol>
  <symbol id="cm-pothelm" viewBox="0 0 44 30">
    <path d="M24 9Q30 -2 40 3Q33 4 30 11z" fill="#c8553d" stroke="${INK}" stroke-width="2"/>
    <path d="M5 26a17 17 0 0 1 34 0z" fill="#6f747d" stroke="${INK}" stroke-width="2.5"/><rect x="2" y="24" width="40" height="5" rx="2.5" fill="#545861" stroke="${INK}" stroke-width="2.5"/>
    <path d="M12 16a10 10 0 0 1 8-6" stroke="#b6bbc4" stroke-width="2.5" fill="none" stroke-linecap="round"/></symbol>
</defs></svg>`;
