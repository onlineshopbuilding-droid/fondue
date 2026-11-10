/**
 * The castle in five build tiers, its night windows, ground shadow, landscape dressing, wall-mounted
 * weapons, the rear cauldron, and the great eagle's hook and neck.
 *
 * Keep art coordinates = world + (40, 20). World x=0 is the left screen edge, so everything left of
 * art x=40 is off-screen: walls simply continue past it. The light comes from the upper left.
 */
import type { Art } from './types';
import {
  INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, PLUM, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL,
  GLOW, WHITE, GOLD, GOLDD, RED, ink, r, c, e, p, l, n, hl, art, centred, starPoints,
  LIGHT, DUSK, litPath, litRect, litBall, rivets, grain,
  crescentFast as crescent, litFast as lit, tubeFast as litTube,
} from './draw';
import { tone, linear as lin, linearAbs, radial as rad, glint } from './shade';

// ---------------------------------------------------------------------------------------------
// Drawing kit
// ---------------------------------------------------------------------------------------------

const VOID = '#17110c';
const LEAF = '#5a8a4c';
const LEAFD = '#3f6b45';

function rand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fx = (v: number) => +v.toFixed(1);
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
let uid = 0;
const clip = (d: string, inner: string) => {
  const id = `c${++uid}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
};
/** A thick line with an ink outline: beams, chains, stilts. */
const beam = (d: string, col: string, w: number) => l(d, w + 5) + hl(d, col, w);
/** The same beam, rounded by light: lit upper-left side, shadowed lower-right side. */
const litTubeBeam = (d: string, col: string, w: number) => litTube(d, w, col, { outline: 2.5 });

/** Rope lashings binding a crossbeam to the posts. */
function ropeLashes(xs: number[], y: number): string {
  const d = xs.map((x) => `M${x - 5} ${y - 7}l4 14M${x - 1} ${y - 7}l4 14M${x + 3} ${y - 7}l4 14`).join('');
  return hl(d, INK, 4.6) + hl(d, '#d9c08a', 2.4) + hl(d.replace(/l4 14/g, 'l2 7'), '#f3e2b4', 1, 0.7);
}

const stops = (list: [number, string, number][]) =>
  list.map(([o, col, a]) => `<stop offset="${o}" stop-color="${col}" stop-opacity="${a}"/>`).join('');
const linear = (id: string, x2: number, y2: number, list: [number, string, number][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
const radial = (id: string, list: [number, string, number][]) => `<radialGradient id="${id}">${stops(list)}</radialGradient>`;

/** Gradients shared by the castle tiers. Shadows lean cool, like the rest of the game. */
const SHADOW = '#221a2c';
const SHADE_DEFS =
  `<defs>` +
  linear('sD', 0, 1, [[0, SHADOW, 0], [1, SHADOW, 0.62]]) +
  linear('sU', 0, 1, [[0, SHADOW, 0.6], [1, SHADOW, 0]]) +
  linear('sR', 1, 0, [[0, SHADOW, 0], [1, SHADOW, 0.55]]) +
  linear('sL', 1, 0, [[0, SHADOW, 0.45], [1, SHADOW, 0]]) +
  `</defs>`;

/**
 * Form shading for a whole wall or tower face: a warm lit band on the left edge, a cool shadow
 * towards the right. `round` turns it into a drum: the lit band moves inside and both edges fall off.
 */
function form(x: number, y: number, w: number, h: number, k = 1, round = false): string {
  const g = round
    ? linearAbs([[0, DUSK, 0.22 * k], [0.24, LIGHT, 0.2 * k], [0.42, LIGHT, 0], [0.66, DUSK, 0.12 * k], [1, DUSK, 0.6 * k]], x, 0, x + w, 0)
    : linearAbs([[0, LIGHT, 0.2 * k], [0.16, LIGHT, 0], [0.55, DUSK, 0], [1, DUSK, 0.48 * k]], x, 0, x + w, 0);
  return `<defs>${g.def}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${g.url}" stroke="none"/>`;
}

/** Light across a flat roof plane: bright at the upper left, falling into shade at the lower right. */
function gableLight(x0: number, y0: number, x1: number, y1: number): string {
  const g = linearAbs([[0, LIGHT, 0.3], [0.4, LIGHT, 0], [0.62, DUSK, 0], [1, DUSK, 0.45]], x0, y0, x1, y1);
  return `<defs>${g.def}</defs><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${g.url}" stroke="none"/>`;
}

/** Thin warm light along an upper or left edge, so a form feels round. */
const rim = (d: string, w = 2, o = 0.55) => hl(d, LIGHT, w, o);
const shade = (id: 'sD' | 'sU' | 'sR' | 'sL', x: number, y: number, w: number, h: number, o = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;

/** A blobby closed shape around a centre: boulders, bushes, moss. */
function lump(cx: number, cy: number, rx: number, ry: number, R: () => number, points = 8): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + R() * 0.3;
    const k = 0.84 + R() * 0.3;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const mid = (a: [number, number], b: [number, number]) => `${fx((a[0] + b[0]) / 2)} ${fx((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[points - 1], pts[0])}`;
  for (let i = 0; i < points; i++) d += `Q${fx(pts[i][0])} ${fx(pts[i][1])} ${mid(pts[i], pts[(i + 1) % points])}`;
  return `${d}Z`;
}

/** A shaded boulder: lit top left, shadow lower right, a facet edge and a hairline crack. */
function rock(cx: number, cy: number, rx: number, ry: number, f: string, hi: string, R: () => number): string {
  const d = lump(cx, cy, rx, ry, R);
  const big = rx > 11;
  return (
    `<path d="${d}" fill="${f}" stroke="none"/>` +
    crescent(d, fx(-rx * 0.3), fx(-ry * 0.42), tone(f, -0.32)) +
    crescent(d, fx(rx * 0.12), fx(ry * 0.16), hi, 0.75) +
    hl(`M${fx(cx - rx * 0.55)} ${fx(cy - ry * 0.05)}Q${fx(cx - rx * 0.1)} ${fx(cy - ry * 0.2)} ${fx(cx + rx * 0.2)} ${fx(cy - ry * 0.62)}`, tone(f, -0.22), 1.4, 0.6) +
    (big ? hl(`M${fx(cx + rx * 0.3)} ${fx(cy - ry * 0.1)}l${fx(rx * 0.12)} ${fx(ry * 0.3)}l${fx(-rx * 0.08)} ${fx(ry * 0.28)}`, tone(f, -0.42), 1.2, 0.7) : '') +
    `<path d="${d}" fill="none"/>`
  );
}

interface Stonework {
  h: number;
  base: string;
  fills: string[];
  line: string;
  hi: string;
  seed: number;
}

/**
 * Courses of slightly irregular stones filling a rectangle; clip it for any other outline.
 * Every stone is bevelled (lit top-left edge, dark lower-right edge) and casts a little shadow into
 * the deep mortar joint; some have chipped corners, pits or a hairline crack.
 */
function masonry(x0: number, y0: number, x1: number, y1: number, s: Stonework): string {
  const R = rand(s.seed);
  let under = '';
  let body = '';
  let lite = '';
  let dark = '';
  let chips = '';
  let pits = '';
  let cracks = '';
  let y = y0;
  for (let row = 0; y < y1; row++) {
    const h = s.h + Math.round(R() * 6 - 3);
    let x = x0 - (row % 2 ? s.h * 1.2 : 0) - R() * 8;
    while (x < x1) {
      const w = Math.round(s.h * (1.15 + R() * 1.5));
      const f = s.fills[Math.floor(R() * s.fills.length)];
      const sh = h - 2;
      const rx = fx(2.5 + R() * 3);
      under += `<rect x="${fx(x + 1.8)}" y="${y + 2}" width="${w}" height="${sh}" rx="${rx}"/>`;
      body += `<rect x="${fx(x)}" y="${y}" width="${w}" height="${sh}" rx="${rx}" fill="${f}"/>`;
      lite += `M${fx(x + 2.4)} ${y + sh - 4}V${y + 4}Q${fx(x + 2.4)} ${y + 2.4} ${fx(x + 4.5)} ${y + 2.4}H${fx(x + w - 4)}`;
      dark += `M${fx(x + 4)} ${fx(y + sh - 1.7)}H${fx(x + w - 3.6)}Q${fx(x + w - 1.7)} ${fx(y + sh - 1.7)} ${fx(x + w - 1.7)} ${fx(y + sh - 3.6)}V${y + 4}`;
      const k = R();
      const cw = fx(3 + R() * 5);
      const ch = fx(3 + R() * 4);
      if (k < 0.1) chips += `M${fx(x + w + 0.5)} ${y - 0.5}h${-cw}l${cw} ${ch}Z`;
      else if (k < 0.2) chips += `M${fx(x - 0.5)} ${fx(y + sh + 0.5)}h${cw}l${-cw} ${-ch}Z`;
      else if (k < 0.26) chips += `M${fx(x - 0.5)} ${y - 0.5}h${cw}l${-cw} ${ch}Z`;
      if (R() < 0.3) pits += `M${fx(x + 5 + R() * (w - 10))} ${fx(y + 5 + R() * (sh - 10))}h.01M${fx(x + 5 + R() * (w - 10))} ${fx(y + 5 + R() * (sh - 10))}h.01`;
      if (R() < 0.08) {
        const cx = x + w * (0.3 + R() * 0.4);
        cracks += `M${fx(cx)} ${y + 1}l${fx(2 + R() * 3)} ${fx(sh * 0.35)}l${fx(-3 - R() * 2)} ${fx(sh * 0.3)}`;
      }
      x += w + 2;
    }
    y += h;
  }
  return (
    n(rect(x0 - 40, y0, x1 - x0 + 80, y1 - y0 + 12), s.base) +
    `<g fill="${tone(s.base, -0.45)}" stroke="none" opacity=".8">${under}</g>` +
    `<g stroke="${s.line}" stroke-width="1.3">${body}</g>` +
    hl(lite, s.hi, 1.8, 0.75) +
    hl(dark, DUSK, 2.2, 0.3) +
    `<path d="${chips}" fill="${tone(s.base, -0.2)}" stroke="${s.line}" stroke-width="1" stroke-linejoin="round"/>` +
    hl(pits, DUSK, 2.4, 0.3) +
    hl(cracks, s.line, 1.3, 0.85)
  );
}

interface LogOpts {
  w?: number;
  fills?: string[];
  point?: boolean;
}

/** A row of upright logs from x0 to x1. */
function logs(x0: number, x1: number, top: (x: number, i: number) => number, bot: number, seed: number, o: LogOpts = {}): string {
  const R = rand(seed);
  const w0 = o.w ?? 22;
  const fills = o.fills ?? [WOOD, '#8b5e34', '#a5733f', WOOD];
  let b = '';
  let i = 0;
  for (let x = x0; x < x1; i++) {
    const w = Math.min(w0 + Math.round(R() * 6 - 3), x1 - x);
    if (w < 5) break;
    const t = top(x, i);
    const f = fills[Math.floor(R() * fills.length)];
    const d = o.point
      ? `M${x} ${bot}L${x + 1} ${t + 11}L${x + w / 2} ${t}L${x + w - 1} ${t + 11}L${x + w} ${bot}Z`
      : `M${x} ${bot}V${t + 4}Q${x} ${t} ${x + 4} ${t}H${x + w - 4}Q${x + w} ${t} ${x + w} ${t + 4}V${bot}Z`;
    // A round log: lit on the left, rolling into shadow on the right, bark grain along it.
    b +=
      `<path d="${d}" fill="${f}" stroke="none"/>` +
      crescent(d, fx(-w * 0.32), 0, tone(f, -0.34)) +
      crescent(d, fx(w * 0.16), 0, tone(f, 0.26), 0.9) +
      grain(x + 3, t + 14, x + w - 4, bot - 4, tone(f, -0.4), i * 31 + seed, 2) +
      (o.point
        ? n(`M${x + 1.5} ${t + 11}L${x + w / 2} ${t + 1}L${x + w / 2} ${t + 15}Z`, tone(f, 0.38), 0.85) +
          n(`M${x + w - 1.5} ${t + 11}L${x + w / 2} ${t + 1}L${x + w / 2} ${t + 15}Z`, tone(f, -0.3), 0.8)
        : '') +
      (R() < 0.35
        ? (() => {
            const ky = fx(t + 40 + R() * Math.max(10, bot - t - 70));
            return e(x + w / 2, ky, 2.6, 4.6, WOODD).replace('/>', ' stroke="none"/>') + hl(`M${x + w / 2 - 4} ${ky}a4 6.5 0 1 0 8 0a4 6.5 0 1 0 -8 0`, tone(f, -0.3), 1, 0.7);
          })()
        : '') +
      `<path d="${d}" fill="none"/>`;
    x += w;
  }
  return `<g stroke-width="2.5">${b}</g>`;
}

/** A board wall: boards of slightly different tone with grain, bevelled seams and iron nails. */
function boards(x: number, y: number, w: number, h: number, f: string, line: string, step: number, seed: number): string {
  const R = rand(seed);
  let seams = '';
  let bevel = '';
  let inner = '';
  const nails: [number, number][] = [];
  let bx = x;
  for (let sx = x + step; ; sx += step + Math.round(R() * 4 - 2)) {
    const end = Math.min(sx, x + w);
    inner += n(rect(bx, y, end - bx, h), tone(f, (R() - 0.5) * 0.16)) + grain(bx + 2, y + 3, end - 2, y + h - 3, tone(f, -0.35), seed * 7 + sx, 2);
    if (sx >= x + w - 3) break;
    seams += `M${sx} ${y + 2}v${h - 4}`;
    bevel += `M${sx + 1.6} ${y + 3}v${h - 6}`;
    if (R() < 0.7) nails.push([sx - 4, y + 6], [sx - 4, y + h - 6]);
    bx = sx;
  }
  const box = rect(x, y, w, h);
  return (
    n(box, f) +
    clip(box, inner + form(x, y, w, h, 0.7)) +
    hl(seams, line, 2) +
    hl(bevel, tone(f, 0.35), 1, 0.55) +
    r(x, y, w, h, 'none', 2) +
    rivets(nails, 1.7, IRON)
  );
}

/**
 * Roof shingles clipped to the outline d. Rows are laid from the eaves upwards, so each row
 * overlaps the one below and casts a soft shadow on it; every tile has its own tone and a lit lip.
 * `over` is painted on top inside the roof (form shading).
 */
function shingles(d: string, x0: number, y0: number, x1: number, y1: number, f: string, line: string, rowH = 12, scW = 14, over = ''): string {
  const R = rand(Math.round(x0 * 7 + y0 * 3 + scW));
  const rows: number[] = [];
  for (let y = y0 + rowH; y < y1 + rowH; y += rowH) rows.push(y);
  let tiles = '';
  for (let i = rows.length - 1; i >= 0; i--) {
    const yb = rows[i];
    const top = yb - rowH * 1.6;
    let shadow = '';
    let body = '';
    let lip = '';
    for (let x = x0 - (i % 2 ? scW / 2 : 0) - scW; x < x1 + scW; x += scW) {
      const tile = `M${fx(x)} ${fx(top)}H${fx(x + scW)}V${yb}Q${fx(x + scW / 2)} ${fx(yb + rowH * 0.7)} ${fx(x)} ${yb}Z`;
      shadow += tile;
      body += `<path d="${tile}" fill="${tone(f, (R() - 0.5) * 0.22)}"/>`;
      lip += `M${fx(x + 2)} ${yb + 0.5}Q${fx(x + scW * 0.28)} ${fx(yb + rowH * 0.3)} ${fx(x + scW * 0.55)} ${fx(yb + rowH * 0.32)}`;
    }
    tiles += `<path d="${shadow}" fill="${DUSK}" stroke="none" opacity=".35" transform="translate(1.5 3)"/>` + `<g stroke="${line}" stroke-width="1.6">${body}</g>` + hl(lip, LIGHT, 1.4, 0.4);
  }
  return clip(d, n(rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4), tone(f, -0.25)) + tiles + over) + l(d);
}

const spireD = (cx: number, baseY: number, half: number, tipY: number) => {
  const h = baseY - tipY;
  return `M${cx - half} ${baseY}Q${fx(cx - half * 0.32)} ${fx(baseY - h * 0.36)} ${cx} ${tipY}Q${fx(cx + half * 0.32)} ${fx(baseY - h * 0.36)} ${cx + half} ${baseY}Q${cx} ${baseY + 9} ${cx - half} ${baseY}Z`;
};

/** A witch-hat tower roof: tiles on a cone, lit on the left, shadowed on the right. */
function spire(cx: number, baseY: number, half: number, tipY: number, f: string, line: string, finial: string, rowH = 11): string {
  const h = baseY - tipY;
  const cone = form(cx - half, tipY - 2, half * 2, h + 12, 1.1, true);
  return (
    beam(`M${cx} ${tipY}v-12`, IRON, 2) +
    shingles(spireD(cx, baseY, half, tipY), cx - half, tipY, cx + half, baseY + 8, f, line, rowH, 13, cone) +
    rim(`M${cx - half + 5} ${baseY - 1}Q${fx(cx - half * 0.36)} ${fx(baseY - h * 0.4)} ${cx - 1.5} ${tipY + 5}`, 2, 0.5) +
    litBall(cx, tipY - 13, 5.5, finial)
  );
}

/** A flag on a pole, waving right: cloth with folds in light and shadow. */
function flag(x: number, base: number, top: number, len: number, f: string, trim: string): string {
  const d = `M${x + 1} ${top + 2}Q${x + len * 0.3} ${top - 7} ${x + len * 0.55} ${top + 4}T${x + len} ${top + 2}L${x + len - 9} ${top + 13}L${x + len} ${top + 26}Q${x + len * 0.55} ${top + 21} ${x + len * 0.3} ${top + 29}T${x + 1} ${top + 26}Z`;
  const folds =
    n(`M${fx(x + len * 0.22)} ${top - 6}Q${fx(x + len * 0.42)} ${top + 14} ${fx(x + len * 0.3)} ${top + 34}H${fx(x + len * 0.5)}Q${fx(x + len * 0.6)} ${top + 14} ${fx(x + len * 0.48)} ${top - 6}Z`, tone(f, -0.3), 0.75) +
    n(`M${fx(x + len * 0.72)} ${top - 6}Q${fx(x + len * 0.86)} ${top + 12} ${fx(x + len * 0.78)} ${top + 34}H${fx(x + len * 0.9)}Q${fx(x + len * 0.98)} ${top + 12} ${fx(x + len * 0.9)} ${top - 6}Z`, tone(f, -0.22), 0.6) +
    n(`M${fx(x + len * 0.05)} ${top - 6}Q${fx(x + len * 0.18)} ${top + 14} ${fx(x + len * 0.1)} ${top + 34}H${fx(x + len * 0.2)}Q${fx(x + len * 0.28)} ${top + 14} ${fx(x + len * 0.2)} ${top - 6}Z`, tone(f, 0.25), 0.55);
  return (
    beam(`M${x} ${base}V${top}`, WOODD, 2.5) +
    hl(`M${x - 0.6} ${base - 2}V${top + 2}`, WOODL, 0.9, 0.7) +
    `<path d="${d}" fill="${f}" stroke="none"/>` +
    clip(d, folds) +
    hl(`M${x + 6} ${top + 8}Q${x + len * 0.3} ${top + 3} ${x + len * 0.55} ${top + 10}`, trim, 2.5) +
    `<path d="${d}" fill="none"/>` +
    litBall(x, top - 3, 4.5, MUSTL)
  );
}

/** A cheese-wedge device: Fondue's own heraldry. */
function emblem(cx: number, cy: number, s: number): string {
  return (
    `<g transform="translate(${cx} ${cy})scale(${s})" stroke-width="${fx(2.2 / s)}">` +
    p('M-13 8L13-9L13 8Z', MUSTL) +
    p('M-13 8L13-9L8-11L-14 3Z', CREAM) +
    n('M4 3a2.4 2.4 0 1 0 .1 0ZM-3 5a1.8 1.8 0 1 0 .1 0ZM9-1a1.6 1.6 0 1 0 .1 0Z', GOLD) +
    `</g>`
  );
}

/** A hanging cloth banner with a swallowtail. */
function banner(x: number, y: number, w: number, h: number, f: string, dark: string, trim: string, device: string): string {
  const d = `M${x} ${y}H${x + w}V${y + h}L${x + w / 2} ${y + h - 16}L${x} ${y + h}Z`;
  // Cloth hangs in two soft folds; the right half falls into shadow.
  const folds =
    n(`M${fx(x + w * 0.55)} ${y}H${x + w + 2}V${y + h + 2}H${fx(x + w * 0.62)}Q${fx(x + w * 0.5)} ${fx(y + h * 0.5)} ${fx(x + w * 0.55)} ${y}Z`, tone(f, -0.28), 0.8) +
    n(`M${fx(x + w * 0.12)} ${y}H${fx(x + w * 0.3)}Q${fx(x + w * 0.22)} ${fx(y + h * 0.5)} ${fx(x + w * 0.3)} ${y + h}H${fx(x + w * 0.12)}Z`, tone(f, 0.22), 0.6);
  return (
    `<path d="${d}" fill="${f}" stroke="none"/>` +
    clip(d, folds + shade('sU', x, y, w, 10, 0.5)) +
    hl(`M${x + 5} ${y + 5}V${y + h - 9}M${x + w - 5} ${y + 5}V${y + h - 9}`, trim, 2.5) +
    hl(`M${x + 5} ${y + 5}V${y + h - 9}M${x + w - 5} ${y + 5}V${y + h - 9}`, dark, 0.9, 0.6) +
    hl(`M${x + w * 0.5} ${y + 8}V${y + h - 22}`, dark, 2, 0.25) +
    `<path d="${d}" fill="none"/>` +
    device +
    beam(`M${x - 6} ${y}H${x + w + 6}`, WOODD, 3) +
    hl(`M${x - 5} ${y - 0.8}H${x + w + 5}`, WOODL, 1, 0.7) +
    litBall(x - 7, y, 3.5, MUSTL, 2.5) +
    litBall(x + w + 7, y, 3.5, MUSTL, 2.5)
  );
}

/** Battlements: each merlon a block lit on its top-left, with a chipped corner now and then. */
function merlons(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0, i = 0; x < x1; x += w + gap, i++) {
    b += litRect(x, y, w, h, f, 2, { shadow: 3, light: 1.6 });
    if (i % 3 === 1) b += n(`M${x + w + 1} ${y - 1}h-5l5 4Z`, tone(f, -0.35));
  }
  return b;
}

function corbels(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0; x < x1; x += w + gap) b += litPath(`M${x} ${y}H${x + w}V${y + h * 0.5}Q${x + w} ${y + h} ${x + w / 2} ${y + h}Q${x} ${y + h} ${x} ${y + h * 0.5}Z`, f, { shadow: 2.5, light: 1.2 });
  return b;
}

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  arch?: boolean;
}

const winShape = ({ x, y, w, h, arch }: Win) =>
  arch ? `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z` : rect(x, y, w, h);

/**
 * Glazed windows in a deep reveal: the frame throws a shadow onto the glass at the top left, the
 * glass reflects a little sky, leaded cames divide the panes and a lit sill sits below.
 */
function windowsBody(list: Win[], frame: string): string {
  const glass = lin([[0, '#46486a'], [0.5, '#2c2a3c'], [1, '#1c1925']], 90);
  return (
    `<defs>${glass.def}</defs>` +
    list
      .map((v) => {
        const d = winShape(v);
        const cx = v.x + v.w / 2;
        const midY = v.y + v.h * 0.55;
        const big = v.w >= 20 && v.h >= 36;
        const lattice = big
          ? hl(`M${v.x} ${v.y + v.h * 0.25}L${v.x + v.w} ${v.y + v.h * 0.25 + v.w}M${v.x + v.w} ${v.y + v.h * 0.25}L${v.x} ${v.y + v.h * 0.25 + v.w}M${v.x} ${v.y + v.h * 0.6}L${v.x + v.w} ${v.y + v.h * 0.6 + v.w}M${v.x + v.w} ${v.y + v.h * 0.6}L${v.x} ${v.y + v.h * 0.6 + v.w}`, '#0e0c14', 1, 0.45)
          : '';
        return (
          `<path d="${d}" fill="none" stroke-width="10"/>` +
          hl(d, frame, 4.5) +
          `<path d="${d}" fill="${glass.url}" stroke-width="2"/>` +
          clip(
            d,
            // Reveal shadow at the top left, sky reflection streaks at the upper right.
            hl(`M${v.x - 1} ${v.y + v.h}V${v.y - 1}H${v.x + v.w + 1}`, SHADOW, 6, 0.55) +
              n(`M${fx(v.x + v.w * 0.55)} ${v.y}H${v.x + v.w}V${fx(v.y + v.w * 0.5)}Z`, '#9fb7d6', 0.35) +
              n(`M${fx(v.x + v.w * 0.2)} ${fx(v.y + v.h)}L${v.x + v.w} ${fx(v.y + v.h * 0.35)}V${fx(v.y + v.h * 0.5)}L${fx(v.x + v.w * 0.42)} ${fx(v.y + v.h)}Z`, '#8aa3c4', 0.18) +
              lattice,
          ) +
          hl(`M${cx} ${v.y + 2}V${v.y + v.h - 1}M${v.x + 1} ${midY}H${v.x + v.w - 1}`, INK, 1.8, 0.85) +
          glint(fx(v.x + v.w * 0.72), fx(v.y + v.h * 0.22), 1.1, '#fffaf0', 0.8) +
          rim(v.arch ? `M${v.x - 3} ${v.y + v.h}V${v.y + v.w / 2}A${v.w / 2 + 3} ${v.w / 2 + 3} 0 0 1 ${cx} ${v.y - 3}` : `M${v.x - 3} ${v.y + v.h}V${v.y - 3}H${v.x + v.w + 3}`, 1.4, 0.6) +
          litRect(v.x - 4, v.y + v.h + 1, v.w + 8, 4.5, frame, 1.5, { outline: 1.5, shadow: 1.5, light: 0.8 }) +
          shade('sU', v.x - 3, v.y + v.h + 6, v.w + 8, 5, 0.6)
        );
      })
      .join('')
  );
}

/**
 * Night glow of the same windows: warm lamplight that is brightest low in the pane, a candle
 * flame, dark cames, a lit sill and a spill of light down the wall.
 */
function windowsGlow(list: Win[]): string {
  const halo = rad([[0, '#ffb54a', 0.6], [0.55, '#ffa63a', 0.18], [1, '#ff9a30', 0]]);
  const pane = rad([[0, '#fff4c8'], [0.45, '#ffd06a'], [1, '#f08a2a']], 0.5, 0.75, 0.75);
  const spill = lin([[0, '#ffbf5a', 0.4], [1, '#ffbf5a', 0]], 90);
  const halos = list.map((v) => e(v.x + v.w / 2, v.y + v.h / 2, v.w * 2, v.h * 1.35, halo.url)).join('');
  const panes = list
    .map((v) => {
      const d = winShape(v);
      const cx = v.x + v.w / 2;
      const by = v.y + v.h;
      return (
        `<path d="M${v.x - 3} ${by + 6}H${v.x + v.w + 3}L${fx(v.x + v.w + v.w * 0.5)} ${fx(by + 6 + v.h * 0.9)}H${fx(v.x - v.w * 0.5)}Z" fill="${spill.url}" stroke="none"/>` +
        `<path d="${d}" fill="${pane.url}" stroke="none"/>` +
        // A small candle on the sill inside.
        n(`M${fx(cx - 1.6)} ${by}V${fx(by - v.h * 0.18)}H${fx(cx + 1.6)}V${by}Z`, '#fff8e0', 0.9) +
        n(`M${cx} ${fx(by - v.h * 0.34)}Q${fx(cx + 2.6)} ${fx(by - v.h * 0.24)} ${cx} ${fx(by - v.h * 0.19)}Q${fx(cx - 2.6)} ${fx(by - v.h * 0.24)} ${cx} ${fx(by - v.h * 0.34)}Z`, '#ffffff', 0.95) +
        hl(`M${cx} ${v.y}V${by}M${v.x} ${v.y + v.h * 0.55}H${v.x + v.w}`, '#6b3a1e', 1.8, 0.9) +
        hl(`M${v.x} ${by}V${v.y + 2}`, '#9a4a1e', 2.5, 0.35) +
        n(rect(v.x - 4, by + 1, v.w + 8, 2.2), '#ffd98a', 0.85)
      );
    })
    .join('');
  return `<defs>${halo.def}${pane.def}${spill.def}</defs>` + halos + panes;
}

/** A vine climbing from a foot point, with shaded leaves and little tendrils. */
function vine(x: number, y: number, height: number, sway: number, seed: number): string {
  const R = rand(seed);
  let d = `M${x} ${y}`;
  let cx = x;
  let cy = y;
  let leaves = '';
  let veins = '';
  let tendrils = '';
  const step = 26;
  for (let t = 0, dir = 1; t < height; t += step, dir = -dir) {
    const nx = cx + dir * sway * (0.5 + R() * 0.6);
    const ny = cy - step;
    d += `Q${fx(cx + dir * sway)} ${cy - step / 2} ${fx(nx)} ${ny}`;
    for (const k of [0.35, 0.8]) {
      const ly = fx(cy - step * k);
      const lx = cx + (nx - cx) * k;
      const side = R() < 0.5 ? -1 : 1;
      const tip = fx(lx + side * 12);
      const leaf = `M${fx(lx)} ${ly}Q${fx(lx + side * 5)} ${fx(ly - 6)} ${tip} ${fx(ly - 2)}Q${fx(lx + side * 7)} ${fx(ly + 4)} ${fx(lx)} ${ly}Z`;
      leaves += `<path d="${leaf}" fill="${R() < 0.5 ? LEAF : LEAFD}"/>`;
      veins += `M${fx(lx + side * 1.5)} ${ly}Q${fx(lx + side * 6)} ${fx(ly - 2.5)} ${fx(lx + side * 10)} ${fx(ly - 2)}`;
    }
    if (R() < 0.4) tendrils += `M${fx(nx)} ${ny}q${fx(-dir * 6)} -2 ${fx(-dir * 6)} -7q0 -3 3 -2`;
    cx = nx;
    cy = ny;
  }
  return beam(d, LEAFD, 2.5) + hl(tendrils, LEAFD, 1.2, 0.8) + `<g stroke-width="1.5">${leaves}</g>` + hl(veins, '#9ec27a', 1, 0.6);
}

function moss(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const R = rand(seed);
  let b = n(lump(cx, cy, rx, ry, R), LEAFD, 0.85) + n(lump(cx - rx * 0.1, cy - ry * 0.2, rx * 0.72, ry * 0.65, R), LEAF, 0.9);
  b += n(lump(cx - rx * 0.3, cy - ry * 0.45, rx * 0.35, ry * 0.25, R, 6), '#8fb86a', 0.7);
  for (let i = 0; i < 4; i++) b += n(lump(cx + (R() - 0.5) * rx * 1.6, cy + ry * 0.7, 5, 3, R, 6), LEAFD, 0.8);
  let dots = '';
  for (let i = 0; i < 5; i++) dots += `M${fx(cx + (R() - 0.5) * rx * 1.2)} ${fx(cy + (R() - 0.6) * ry)}h.01`;
  return b + hl(dots, '#b7d488', 1.6, 0.7);
}

// ---------------------------------------------------------------------------------------------
// Parts every tier shares: the gate opening, the foundation, the slot furniture.
// ---------------------------------------------------------------------------------------------

/** Dark opening plus depth inside it. The leaf (`gate0..4`) is drawn over art x 151..225, y 490..640. */
const gateVoid =
  r(151, 486, 74, 158, VOID, 0) +
  n(rect(151, 486, 74, 22), '#000', 0.4) +
  n(rect(151, 486, 12, 158), '#000', 0.3);

/**
 * The battered plinth the wall stands on. It flares out at the bottom and sinks into the earth,
 * with boulders half buried along its foot. The earth itself is repainted in each landscape's own
 * colours by `keepGround_*`, which also grows grass and moss over the lowest stones.
 */
function foundation(seed: number, s: Omit<Stonework, 'seed'>, fills: [string, string, string], hi: string): string {
  const R = rand(seed);
  const plinth = 'M-24 590H134L144 656H-24Z';
  const spur = 'M239 596H252L266 656H239Z';
  const apron = 'M-24 640Q6 630 32 640T86 636T146 646L150 664H-24Z' + 'M236 642Q254 636 270 646T302 648V664H236Z';
  let rocks = '';
  const big: [number, number, number, number, number][] = [
    [-6, 640, 30, 16, 0], [36, 648, 26, 12, 1], [118, 650, 24, 11, 2], [146, 652, 12, 8, 0],
    [246, 646, 15, 10, 1], [268, 652, 12, 7, 2], [285, 656, 7, 4.5, 0],
  ];
  for (const [x, y, rx, ry, k] of big) rocks += rock(x, y, rx, ry, fills[k], hi, R);
  return (
    clip(plinth + spur, masonry(-24, 588, 272, 660, { ...s, h: 21, seed }) + shade('sD', -24, 604, 300, 56, 0.85) + form(-24, 588, 170, 70, 0.8)) +
    `<path d="${plinth}" fill="none" stroke-width="3"/><path d="${spur}" fill="none" stroke-width="3"/>` +
    // Sloped coping on top of the plinth, catching the light.
    litPath('M-24 582H134L140 593H-24Z', fills[2], { shadow: 2.5, light: 1.4, outline: 3 }) +
    litPath('M237 588H252L256 598H237Z', fills[2], { shadow: 2, light: 1.2, outline: 3 }) +
    shade('sU', -24, 593, 164, 10, 0.55) +
    `<g stroke-width="3">${p(apron, '#5c4a3a')}</g>` +
    `<g stroke-width="2.8">${rocks}</g>`
  );
}

/** Soft darkening that seats the wall on its plinth. */
const footShade = shade('sD', -14, 540, 154, 44, 0.7) + shade('sD', 228, 560, 16, 30, 0.5);

/** The low hatch the wheel rolls out of: an arched frame, timber doors swung open, a threshold. */
function sallyPort(frame: string, frameD: string): string {
  const d = 'M58 640V584Q58 556 92 556Q126 556 126 584V640Z';
  const inside = lin([[0, '#0c0907'], [1, '#2a1f17']], 90);
  return (
    `<defs>${inside.def}</defs>` +
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    hl('M53 640V586Q53 551 92 551', LIGHT, 1.6, 0.45) +
    hl('M131 640V586Q131 562 112 554', frameD, 2.5, 0.6) +
    `<path d="${d}" fill="${inside.url}" stroke-width="2.5"/>` +
    // A grille of iron bars, lit from the left.
    hl('M72 562V640M92 558V640M112 562V640M60 590H124', '#3a2c20', 4.5) +
    hl('M71 564V638M91 560V638M111 564V638M62 588.8H122', '#6c5b4a', 1.2, 0.7) +
    rivets([[72, 590], [92, 590], [112, 590]], 2, IRON) +
    litRect(52, 636, 80, 8, frameD, 2, { shadow: 2, light: 1.2, outline: 2.5 })
  );
}

/** The alcove behind the shrine slot, so the empty slot looks intended. */
function alcove(frame: string, dark: string, line: string): string {
  const d = 'M46 346V292Q46 252 86 252Q126 252 126 292V346Z';
  const deep = lin([[0, tone(dark, -0.45)], [1, dark]], 90);
  return (
    `<defs>${deep.def}</defs>` +
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    hl('M41 346V292Q41 247 86 247', LIGHT, 1.6, 0.5) +
    hl('M131 346V292Q131 262 112 252', tone(frame, -0.35), 2.5, 0.7) +
    `<path d="${d}" fill="${deep.url}" stroke-width="2.5"/>` +
    clip(d, hl('M44 346V292Q44 250 86 250Q128 250 128 292', SHADOW, 10, 0.5)) +
    hl('M118 346V296Q118 266 98 262', line, 2.5, 0.5)
  );
}

/** The dark shaft the stomper drops through. */
function hoistBay(frame: string, line: string): string {
  return (
    litRect(52, 372, 68, 84, frame, 4, { shadow: 4, light: 2 }) +
    `<g stroke-width="2.5">${boards(60, 380, 52, 68, '#5a3e24', '#3f2b18', 13, 90)}</g>` +
    hl('M60 414H112', IRON, 5) +
    hl('M60 412.6H112', IRONL, 1.2, 0.7) +
    hl('M60 414H112', line, 1.5, 0.3) +
    shade('sU', 60, 380, 52, 28, 0.7)
  );
}

/** The ledge above the gate that carries the gate weapon. */
function gateBrow(f: string, hi: string, trim = ''): string {
  return (
    litRect(128, 452, 122, 15, f, 4, { shadow: 3.5, light: 1.6 }) +
    hl('M134 456.5H244', hi, 2.5, 0.85) +
    (trim ? hl('M132 464H246', trim, 2.5) : '') +
    corbels(132, 244, 467, 9, 12, 12, f) +
    shade('sU', 132, 467, 112, 14, 0.55)
  );
}

/** The walkway at art y=346 that carries the shrine and the crossbow. */
function deck(x1: number, f: string, hi: string, dark: string, trim = ''): string {
  return (
    litRect(-20, 346, x1 + 20, 13, f, 3, { shadow: 3.5, light: 1.6 }) +
    hl(`M-10 349.6H${x1 - 6}`, hi, 2.5, 0.9) +
    (trim ? hl(`M-10 357H${x1 - 6}`, trim, 2.5) : '') +
    corbels(-12, x1 - 12, 359, 12, 14, 18, dark) +
    shade('sU', -20, 359, x1 + 20, 16, 0.5)
  );
}

interface PlateStyle {
  f: string;
  hi: string;
  rivet: string;
  trim?: string;
}

function plate(x: number, y: number, w: number, h: number, s: PlateStyle): string {
  const inset = s.trim ? hl(rect(x + 4, y + 4, w - 8, h - 8), s.trim, 2) : '';
  return (
    litRect(x, y, w, h, s.f, 4, { shadow: 3, light: 1.5 }) +
    inset +
    hl(`M${x + 5} ${y + 3}H${x + w - 5}`, s.hi, 2, 0.8) +
    rivets([[x + 6, y + 7], [x + w - 6, y + 7], [x + 6, y + h - 6], [x + w - 6, y + h - 6]], 2.3, s.rivet)
  );
}

/** Backing plates in the tier's own material, so every mounted weapon is visibly fixed to this wall. */
function slotPlates(s: PlateStyle, shrinePlate: boolean): string {
  return (
    plate(150, 276, 48, 70, s) +
    plate(160, 394, 52, 58, s) +
    plate(30, 356, 112, 21, s) +
    (shrinePlate ? plate(42, 298, 88, 48, s) : '')
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 0: a plain wooden palisade fort with a watchtower.
// ---------------------------------------------------------------------------------------------

const WINS0: Win[] = [{ x: 74, y: 214, w: 20, h: 22 }];

function tier0(): string {
  const R = rand(100);
  const top = () => 258 + R() * 12;
  const thatch = 'M26 208Q50 182 82 150Q116 182 140 208Q134 214 126 210Q118 216 108 211Q98 216 88 211Q78 216 66 210Q56 216 46 211Q36 216 26 208Z';
  const straw = 'M82 156L52 200M82 156L66 204M82 156L82 206M82 156L98 204M82 156L112 200M56 182L46 204M108 182L120 204';
  return (
    SHADE_DEFS +
    ink(
      // Watchtower behind the palisade.
      litTubeBeam('M50 360L56 244', WOODD, 8) + litTubeBeam('M116 360L110 244', WOODD, 8) +
        litTubeBeam('M54 330L112 270M112 330L54 270', WOODD, 5) +
        flag(83, 158, 122, 30, RUST, MUSTL) +
        boards(46, 196, 74, 56, WOOD, WOODD, 15, 3) +
        windowsBody(WINS0, WOODL) +
        litTubeBeam('M40 252H126', WOODD, 5) +
        lit(thatch, '#b7924e', { shadow: 6, light: 3, shadowColor: '#7f6230', lightColor: '#e2c27f' }) +
        clip(thatch, hl(straw, '#8a6a34', 2.5) + hl(straw.replace(/M82 156/g, 'M83 158'), '#e7cc8a', 1, 0.6) + shade('sD', 26, 186, 116, 30, 0.45)) +
        hl('M34 203Q64 184 82 164', '#d9b873', 3, 0.8) +
        hl('M30 209Q36 213 46 211Q56 216 66 210Q78 216 88 211Q98 216 108 211Q118 216 126 210Q134 214 140 208', '#6d5226', 2, 0.6) +
        // Palisade above the walkway.
        logs(-22, 252, top, 352, 11, { point: true }) +
        shade('sD', -20, 310, 272, 36, 0.5) +
        litTubeBeam('M-20 296H250', WOODD, 4) +
        ropeLashes([4, 52, 100, 148, 196, 238], 296) +
        // Lower wall.
        logs(-22, 138, () => 352, 628, 12) +
        logs(136, 244, () => 352, 478, 13, { w: 20 }) +
        form(136, 352, 108, 126, 1) +
        form(-22, 352, 160, 276, 0.8) +
        shade('sU', -14, 359, 258, 26, 0.6) +
        litTubeBeam('M-20 418H136', WOODD, 5) +
        litTubeBeam('M-20 528H136', WOODD, 5) +
        ropeLashes([24, 112], 418) +
        ropeLashes([24], 528) +
        hoistBay(WOOD, WOODD) +
        footShade +
        foundation(21, ROUGH, ['#8d7d63', '#7a6c58', '#a29474'], '#bcae8c') +
        sallyPort(WOOD, WOODD) +
        moss(30, 584, 22, 7, 1) +
        moss(112, 586, 14, 5, 2) +
        vine(16, 590, 110, 7, 5) +
        // Gate frame: two huge posts and a lintel.
        gateVoid +
        litTubeBeam('M144 478V644', WOODD, 9) +
        litTubeBeam('M232 478V644', WOODD, 9) +
        litRect(128, 468, 120, 22, WOOD, 5, { shadow: 5, light: 2 }) +
        grain(134, 471, 242, 487, WOODD, 77, 2, false) +
        hl('M134 473H240', WOODL, 2, 0.8) +
        litPath('M122 479a8 11 0 1 0 16 0a8 11 0 1 0 -16 0Z', WOODL, { shadow: 2.5, light: 1.2 }) +
        litPath('M239 479a8 11 0 1 0 16 0a8 11 0 1 0 -16 0Z', WOODL, { shadow: 2.5, light: 1.2 }) +
        hl('M127 479a3 5 0 1 0 6 0a3 5 0 1 0 -6 0M244 479a3 5 0 1 0 6 0a3 5 0 1 0 -6 0', WOODD, 1.6, 0.8) +
        gateBrow(WOODD, WOOD) +
        deck(256, WOODL, '#d6ad78', WOOD) +
        slotPlates({ f: WOOD, hi: WOODL, rivet: WOODD }, true) +
        // Hand-made touches: a lantern on a bracket and a coil of rope.
        litTubeBeam('M124 500H136', WOODD, 3) +
        l('M124 503V510', 2) +
        litRect(118, 510, 12, 16, MUSTL, 3, { outline: 2.5, shadow: 2.5, light: 1, lightColor: '#fff3c0' }) +
        l('M124 510V526M118 518H130', 2) +
        glint(121, 514, 1, '#fffaf0') +
        lit(lump(44, 559, 13, 9, R), '#c9a66a', { outline: 3, shadow: 3, light: 1.4 }) +
        hl('M34 556Q44 550 54 556M34 561Q44 555 54 561M37 565Q44 561 51 565', '#8a6a34', 1.6),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 1: timber on a stone footing, bound with iron.
// ---------------------------------------------------------------------------------------------

const ROUGH: Omit<Stonework, 'seed'> = { h: 24, base: '#6a6458', fills: [STONE, STONED, '#8a8476', '#a59f8f'], line: '#4e4a41', hi: STONEL };

const WINS1: Win[] = [{ x: 58, y: 174, w: 20, h: 28 }, { x: 96, y: 174, w: 20, h: 28 }];

/** A forged iron strap: darker below, a bright upper edge, round rivets with glints, a few dents. */
function ironBand(x0: number, x1: number, y: number, h = 11): string {
  const heads: [number, number][] = [];
  let dents = '';
  for (let x = x0 + 12, i = 0; x < x1; x += 24, i++) {
    heads.push([x, y + h / 2]);
    if (i % 3 === 1) dents += `M${x + 9} ${fx(y + h * 0.4)}h4`;
  }
  return (
    litRect(x0, y, x1 - x0, h, IRON, 2, { shadow: fx(h * 0.32), light: 1, lightColor: IRONL }) +
    hl(`M${x0 + 3} ${y + 2.4}H${x1 - 3}`, '#a9b0b8', 1.2, 0.8) +
    hl(dents, '#2c2f35', 1.4, 0.6) +
    rivets(heads, 2.4, '#5a5f66', '#1d2024')
  );
}

/** Split-plank roof of the timber tower: seams with a lit bevel beside each. */
function boardRoof(): string {
  const seams = 'M40 158L84 126M56 166L92 128M72 166L104 134M90 166L118 140M108 166L130 150M40 152L60 166M56 140L90 166M70 132L112 166M92 128L136 164';
  return hl(seams, '#7f5530', 2.2) + `<g transform="translate(1.6 0.6)">${hl(seams, '#e6bf8a', 1, 0.55)}</g>`;
}

/** Stone jambs either side of the gate, as alternating quoin blocks. */
function jambs(light: string, mid: string): string {
  let b = '';
  for (const x of [137, 225]) {
    for (let i = 0, y = 480; i < 5; i++, y += 33) b += litRect(x, y, 14, i === 4 ? 644 - y : 33, i % 2 ? mid : light, 2.5, { shadow: 3, light: 1.4, outline: 2.8 });
  }
  return b + shade('sR', 225, 480, 14, 164, 0.4);
}

function tier1(): string {
  const crenel = (k: number) => 240 + (k % 2 ? 0 : 16);
  const top = (x: number) => crenel(Math.floor((x + 22) / 48));
  let caps = '';
  for (let k = 0, x = -22; x < 254; k++, x += 48) caps += r(x - 1, crenel(k) - 3, 50, 8, IRON, 2);
  const footingTop = 'M-20 506Q20 494 52 504T110 500T140 508V640H-20Z';
  const roofD = 'M24 158L84 120L144 158L137 166H31Z';
  return (
    SHADE_DEFS +
    ink(
      flag(84, 128, 96, 34, RUST, MUSTL) +
        // Square timber tower.
        boards(36, 152, 96, 110, '#8b5e34', WOODD, 16, 6) +
        form(36, 152, 96, 110, 0.8) +
        ironBand(36, 132, 212, 10) +
        litTube('M36 154V258M132 154V258', 4, IRON, { outline: 2.5, lightColor: IRONL }) +
        windowsBody(WINS1.slice(0, 2), WOODL) +
        lit(roofD, WOODL, { shadow: 5, light: 2 }) +
        clip(roofD, boardRoof() + shade('sD', 24, 140, 120, 28, 0.35) + n('M84 120L144 158H84Z', SHADOW, 0.22)) +
        hl('M30 160L84 126L138 160', '#d6ad78', 3) +
        hl('M32 159.5L84 127', LIGHT, 1.2, 0.6) +
        // Board parapet with iron caps.
        logs(-22, 254, top, 352, 24, { w: 24, fills: ['#8b5e34', WOOD, '#a5733f'] }) +
        caps +
        shade('sD', -20, 300, 274, 46, 0.5) +
        ironBand(-20, 254, 300, 11) +
        // Timber lower wall with bands.
        boards(-20, 352, 158, 170, WOOD, WOODD, 19, 7) +
        boards(136, 352, 108, 126, '#8b5e34', WOODD, 19, 8) +
        form(136, 352, 108, 126, 1) +
        shade('sU', -14, 359, 258, 28, 0.6) +
        ironBand(-20, 136, 380, 11) +
        ironBand(-20, 136, 470, 11) +
        ironBand(136, 244, 430, 11) +
        // Stone footing with an uneven top.
        clip(footingTop, masonry(-20, 494, 140, 640, { ...ROUGH, seed: 33 }) + shade('sU', -20, 494, 160, 18, 0.5)) +
        `<path d="${footingTop}" fill="none"/>` +
        hoistBay(WOODD, WOOD) +
        footShade +
        foundation(31, ROUGH, [STONED, STONE, '#837c6d'], STONEL) +
        sallyPort(STONEL, STONED) +
        moss(32, 584, 26, 8, 3) +
        moss(74, 503, 18, 7, 4) +
        vine(22, 592, 150, 7, 6) +
        vine(118, 595, 60, 5, 8) +
        gateVoid +
        // Stone jambs with timber lintel and iron straps.
        jambs(STONEL, STONE) +
        litRect(128, 468, 120, 22, WOODD, 4, { shadow: 5, light: 2 }) +
        grain(134, 471, 242, 487, '#4a2f19', 41, 2, false) +
        hl('M134 473H240', WOOD, 2, 0.9) +
        litRect(144, 466, 14, 26, IRON, 2, { shadow: 3, light: 1.2, lightColor: IRONL }) +
        litRect(218, 466, 14, 26, IRON, 2, { shadow: 3, light: 1.2, lightColor: IRONL }) +
        rivets([[151, 472], [151, 485], [225, 472], [225, 485]], 2.2, '#5a5f66', '#1d2024') +
        gateBrow(IRON, IRONL) +
        deck(256, WOODL, '#d6ad78', IRON) +
        slotPlates({ f: IRON, hi: IRONL, rivet: '#20242a' }, true),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 2: proper stone walls, shingled roofs, a banner.
// ---------------------------------------------------------------------------------------------

const ASHLAR: Omit<Stonework, 'seed'> = { h: 22, base: '#857f71', fills: [STONEL, '#aca696', STONE, '#b6b09f'], line: '#6a6559', hi: '#d6d0bd' };
const WINS2: Win[] = [
  { x: 52, y: 198, w: 22, h: 40, arch: true },
  { x: 120, y: 198, w: 22, h: 40, arch: true },
  { x: 212, y: 218, w: 16, h: 18, arch: true },
];

function tier2(): string {
  const bodyD = 'M-20 186H158V352H-20Z';
  const turretD = 'M190 212H250V352H190Z';
  const gableD = 'M-30 190Q14 156 64 112Q118 156 168 190Z';
  return (
    SHADE_DEFS +
    ink(
      // Rear curtain wall between keep and turret.
      clip(rect(150, 216, 42, 136), masonry(150, 216, 192, 352, { ...ASHLAR, seed: 45 }) + form(150, 216, 42, 136, 1.2) + shade('sU', 150, 216, 42, 20, 0.6)) +
      litRect(146, 210, 50, 9, STONEL, 3, { shadow: 2.5, light: 1.2 }) +
        // Main keep.
        clip(bodyD, masonry(-20, 186, 158, 352, { ...ASHLAR, seed: 41 }) + form(-20, 186, 178, 166, 1)) +
        `<path d="${bodyD}" fill="none"/>` +
        shade('sU', -20, 188, 178, 24, 0.65) +
        windowsBody(WINS2.slice(0, 2), STONEL) +
        flag(64, 116, 96, 36, RUST, MUSTL) +
        shingles(gableD, -30, 112, 168, 194, RUST, RUSTD, 12, 15, gableLight(-30, 112, 168, 194)) +
        hl('M-12 182Q18 156 62 120', '#e08a60', 2.5, 0.7) +
        litRect(-26, 186, 186, 9, WOODD, 3, { shadow: 2.5, light: 1.2 }) +
        banner(80, 197, 28, 52, TEAL, TEALD, MUSTL, emblem(94, 221, 0.72)) +
        alcove(STONEL, '#7b7566', '#6a6559') +
        // Right turret: a round drum.
        clip(turretD, masonry(190, 208, 250, 352, { ...ASHLAR, seed: 42 }) + form(190, 208, 60, 144, 1.1, true)) +
        `<path d="${turretD}" fill="none"/>` +
        windowsBody(WINS2.slice(2, 3), STONEL) +
        spire(220, 208, 42, 128, RUST, RUSTD, MUSTL) +
        litRect(184, 206, 72, 9, WOODD, 3, { shadow: 2.5, light: 1.2 }) +
        shade('sU', 190, 215, 60, 14, 0.6) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...ASHLAR, seed: 43 }) + form(-20, 352, 158, 276, 0.8)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...ASHLAR, seed: 44 }) + form(136, 352, 108, 126, 1)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 28, 0.6) +
        hoistBay(STONED, STONEL) +
        footShade +
        foundation(51, ROUGH, [STONED, STONE, '#837c6d'], STONEL) +
        sallyPort(STONEL, STONED) +
        moss(26, 584, 26, 8, 5) +
        moss(70, 588, 18, 6, 6) +
        moss(130, 470, 12, 6, 7) +
        vine(12, 594, 200, 7, 9) +
        vine(128, 596, 70, 5, 10) +
        gateVoid +
        // Stone gate arch.
        archGate(STONEL, STONE, STONED, RUST) +
        gateBrow(STONE, STONEL) +
        deck(256, STONEL, '#d6d0bd', STONE) +
        slotPlates({ f: STONED, hi: STONEL, rivet: IRON }, false),
    )
  );
}

/** Segmental voussoir arch and jamb quoins over the opening. */
function archGate(light: string, mid: string, dark: string, stoneKey: string): string {
  const jamb = (x: number) =>
    [0, 1, 2, 3, 4].map((i) => litRect(x, 494 + i * 30, 14, i === 4 ? 30 : 30, i % 2 ? mid : light, 3, { shadow: 3, light: 1.4, outline: 3 })).join('');
  // Tympanum, carved panel between arch and the rectangular opening.
  const tymp = 'M151 490Q188 462 225 490Z';
  // Voussoirs.
  const outer = (a: number): [number, number] => [188 + Math.cos(a) * 62, 496 + Math.sin(a) * 36];
  const inner = (a: number): [number, number] => [188 + Math.cos(a) * 44, 496 + Math.sin(a) * 24];
  let stones = '';
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a0 = Math.PI + (i / count) * Math.PI;
    const a1 = Math.PI + ((i + 1) / count) * Math.PI;
    const pts = [outer(a0), outer(a1), inner(a1), inner(a0)].map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L');
    stones += litPath(`M${pts}Z`, i === 4 ? stoneKey : i % 2 ? mid : light, { outline: 2.5, shadow: 2.5, light: 1.2 });
  }
  return (
    jamb(137) +
    jamb(225) +
    shade('sR', 225, 494, 14, 150, 0.4) +
    litPath(tymp, dark, { outline: 2.5, shadow: 0, light: 0 }) +
    clip(tymp, shade('sU', 151, 470, 74, 20, 0.7) + hl('M164 489Q188 474 212 489', tone(dark, 0.3), 1.4, 0.6) + hl('M188 488V478M180 486L184 479M196 486L192 479', tone(dark, -0.4), 1.6, 0.8)) +
    stones +
    litRect(133, 490, 22, 8, light, 2, { shadow: 2, light: 1, outline: 3 }) +
    litRect(221, 490, 22, 8, light, 2, { shadow: 2, light: 1, outline: 3 })
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 3: a taller slate keep, an extra tower, runes and more banners.
// ---------------------------------------------------------------------------------------------

const SLATE: Omit<Stonework, 'seed'> = { h: 22, base: '#5b6271', fills: ['#8d95a3', '#7c8493', '#9aa2af', '#868e9c'], line: '#4a5160', hi: '#bcc3cd' };
const WINS3: Win[] = [
  { x: 66, y: 120, w: 16, h: 22, arch: true },
  { x: 90, y: 120, w: 16, h: 22, arch: true },
  { x: 52, y: 176, w: 22, h: 46, arch: true },
  { x: 118, y: 176, w: 22, h: 46, arch: true },
  { x: 207, y: 186, w: 20, h: 40, arch: true },
];

/** Runes cut into the stone with a dull verdigris inlay. */
const runeLine = (d: string) =>
  hl(d, '#3f4756', 5.5, 0.9) + hl(d, '#7fae9f', 2.2) + `<g transform="translate(-0.6 -0.6)">${hl(d, '#c8eadf', 0.8, 0.7)}</g>`;

function tier3(): string {
  const keepD = 'M-20 146H166V352H-20Z';
  const upperD = 'M44 110H128V150H44Z';
  const towerD = 'M180 174H255V352H180Z';
  return (
    SHADE_DEFS +
    ink(
      // Solid rear wall: nothing behind the crossbow but stone.
      clip(rect(158, 196, 60, 156), masonry(158, 196, 218, 352, { ...SLATE, seed: 66 }) + form(158, 196, 60, 156, 1.2) + shade('sU', 158, 196, 60, 20, 0.6)) +
      litRect(154, 190, 68, 9, '#9aa2af', 3, { shadow: 2.5, light: 1.2 }) +
        // Crenellated top storey carrying the flag.
        clip(upperD, masonry(44, 110, 128, 154, { ...SLATE, seed: 61 }) + form(44, 110, 84, 44, 1)) +
        `<path d="${upperD}" fill="none"/>` +
        shade('sU', 44, 112, 84, 10, 0.5) +
        windowsBody(WINS3.slice(0, 2), '#bcc3cd') +
        merlons(42, 128, 98, 15, 15, 9, '#9aa2af') +
        flag(50, 110, 96, 30, TEAL, MUSTL) +
        // Main keep.
        clip(keepD, masonry(-20, 146, 166, 352, { ...SLATE, seed: 62 }) + form(-20, 146, 186, 206, 1)) +
        `<path d="${keepD}" fill="none"/>` +
        merlons(-20, 164, 128, 20, 15, 10, '#9aa2af') +
        shade('sU', -20, 148, 186, 16, 0.55) +
        windowsBody(WINS3.slice(2, 4), '#bcc3cd') +
        banner(80, 160, 30, 80, RUST, RUSTD, MUSTL, emblem(95, 196, 0.9)) +
        runeLine('M46 300V330M38 310L54 322M54 310L38 322') +
        alcove('#bcc3cd', '#5b6271', '#4a5160') +
        runeLine('M70 262L86 256L102 262') +
        // The extra tower: a straight drum standing on the walkway, its plinth on the stonework.
        clip(towerD, masonry(176, 170, 259, 356, { ...SLATE, seed: 63 }) + form(180, 170, 75, 186, 1.2, true)) +
        `<path d="${towerD}" fill="none"/>` +
        litRect(174, 332, 86, 14, '#9aa2af', 3, { shadow: 3, light: 1.4 }) +
        hl('M180 336H254', '#c6ccd5', 2, 0.8) +
        windowsBody(WINS3.slice(4, 5), '#bcc3cd') +
        merlons(176, 256, 158, 18, 12, 7, '#9aa2af') +
        spire(217, 158, 46, 108, TEALD, '#163f42', MUSTL) +
        banner(186, 186, 14, 40, TEAL, TEALD, MUSTL, emblem(193, 202, 0.4)) +
        banner(234, 186, 14, 40, RUST, RUSTD, MUSTL, emblem(241, 202, 0.4)) +
        flag(217, 122, 96, 34, RUST, MUSTL) +
        runeLine('M246 296V322M238 304L254 314M254 304L238 314') +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...SLATE, seed: 64 }) + form(-20, 352, 158, 276, 0.8)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...SLATE, seed: 65 }) + form(136, 352, 108, 126, 1)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 28, 0.6) +
        runeLine('M130 400V440M122 412L138 424') +
        hoistBay('#7c8493', '#bcc3cd') +
        footShade +
        foundation(71, { ...SLATE, base: '#4d5462', fills: ['#6f7787', '#7c8493', '#5f6878'] }, ['#6f7787', '#7c8493', '#5f6878'], '#bcc3cd') +
        sallyPort('#bcc3cd', '#7c8493') +
        moss(30, 584, 26, 8, 11) +
        moss(66, 588, 14, 5, 12) +
        vine(20, 594, 240, 6, 13) +
        gateVoid +
        archGate('#bcc3cd', '#9aa2af', '#6f7787', TEAL) +
        runeLine('M188 470V486M180 478H196') +
        gateBrow('#7c8493', '#bcc3cd', MUST) +
        deck(256, '#9aa2af', '#c6ccd5', '#7c8493', MUST) +
        slotPlates({ f: '#6f7787', hi: '#bcc3cd', rivet: GOLD, trim: GOLD }, false),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 4: a magnificent white-and-gold fortress.
// ---------------------------------------------------------------------------------------------

const MARBLE: Omit<Stonework, 'seed'> = { h: 24, base: '#d1c9b6', fills: ['#f6f1e6', '#ece6d6', '#f2ecdd', '#e4ddcb'], line: '#bdb29a', hi: WHITE };
const WINS4: Win[] = [
  { x: 72, y: 156, w: 28, h: 54, arch: true },
  { x: 140, y: 160, w: 18, h: 40, arch: true },
  { x: 207, y: 182, w: 20, h: 40, arch: true },
];
const GOLDEN = MUST;

/** Polished gold: bright upper edge, deep lower edge. */
const GILT = lin([[0, '#ffe39a'], [0.35, MUSTL], [0.7, GOLDEN], [1, GOLDD]], 90);

/** Gold string course with little studs. */
function goldBand(x0: number, x1: number, y: number): string {
  const studs: [number, number][] = [];
  for (let x = x0 + 10; x < x1; x += 20) studs.push([x, y + 4]);
  return (
    `<defs>${GILT.def}</defs>` +
    r(x0, y, x1 - x0, 8, GILT.url, 2) +
    hl(`M${x0 + 3} ${y + 2}H${x1 - 3}`, '#fff1c0', 1.2, 0.8) +
    rivets(studs, 1.6, GOLD, GOLDD)
  );
}

/** A fluted marble pilaster with gilded capital and base. */
function pilaster(x: number, y0: number, y1: number): string {
  return (
    litRect(x, y0, 12, y1 - y0, '#f6f1e6', 2, { shadow: 3, light: 1.2 }) +
    hl(`M${x + 4} ${y0 + 6}V${y1 - 6}M${x + 8} ${y0 + 6}V${y1 - 6}`, '#cfc5ae', 1.4, 0.9) +
    hl(`M${x + 5} ${y0 + 6}V${y1 - 6}`, WHITE, 0.8, 0.9) +
    `<defs>${GILT.def}</defs>` +
    r(x - 3, y0 - 6, 18, 7, GILT.url, 2) +
    r(x - 3, y1 - 1, 18, 7, GILT.url, 2) +
    glint(x, y0 - 4, 0.9) +
    glint(x, y1 + 1, 0.9)
  );
}

/** A recessed stone panel carrying solid carved medallions in gold. */
function carvedPanel(x: number, y: number, w: number, h: number, count: number): string {
  let medals = '';
  for (let i = 0; i < count; i++) {
    const cx = fx(x + ((i + 0.5) * w) / count);
    const cy = y + h / 2;
    medals +=
      litPath(`M${fx(cx - h * 0.36)} ${cy}a${fx(h * 0.36)} ${fx(h * 0.36)} 0 1 0 ${fx(h * 0.72)} 0a${fx(h * 0.36)} ${fx(h * 0.36)} 0 1 0 ${fx(-h * 0.72)} 0Z`, '#f6f1e6', { outline: 2.5, shadow: 2.5, light: 1.2 }) +
      litPath(starPoints(cx, cy, h * 0.27, h * 0.12, 8), GOLDEN, { outline: 2.2, shadow: 1.5, light: 0.8, lightColor: '#ffe39a' }) +
      glint(fx(cx - 2.5), cy - 3, 1);
  }
  return (
    litRect(x, y, w, h, '#c8bea6', 3, { shadow: 0, light: 0 }) +
    shade('sU', x, y, w, 12, 0.6) +
    shade('sL', x, y, 10, h, 0.4) +
    hl(rect(x + 3.5, y + 3.5, w - 7, h - 7), GOLDEN, 2.5) +
    medals
  );
}

function goldStuds(x0: number, x1: number, y: number, step: number): string {
  const pts: [number, number][] = [];
  for (let x = x0; x < x1; x += step) pts.push([x, y]);
  return rivets(pts, 2.6, MUSTL, GOLDD);
}

/** A small corner turret standing on the keep's crown. */
function bartizan(cx: number): string {
  const d = rect(cx - 16, 122, 32, 28);
  return (
    `<path d="${d}" fill="#f6f1e6"/>` +
    clip(d, form(cx - 16, 122, 32, 28, 1.2, true)) +
    `<path d="${d}" fill="none"/>` +
    hl(`M${cx} 128v14`, INK, 4) +
    goldBand(cx - 19, cx + 19, 146) +
    spire(cx, 124, 22, 108, TEAL, TEALD, MUSTL, 8)
  );
}

function tier4(): string {
  const keepD = 'M-20 146H176V352H-20Z';
  const towerD = 'M180 168H255V352H180Z';
  return (
    SHADE_DEFS +
    ink(
      // Solid rear gallery: nothing behind the crossbow but carved stone.
      clip(rect(168, 190, 44, 162), masonry(168, 190, 212, 352, { ...MARBLE, seed: 81 }) + form(168, 190, 44, 162, 1) + shade('sU', 168, 190, 44, 18, 0.5)) +
      `<defs>${GILT.def}</defs>` +
      r(164, 184, 52, 9, GILT.url, 3) +
        // Broad main roof behind the keep crown.
        spire(100, 142, 66, 110, TEAL, TEALD, MUSTL, 10) +
        // Main keep body.
        clip(keepD, masonry(-20, 146, 176, 352, { ...MARBLE, seed: 82 }) + form(-20, 146, 196, 206, 0.8)) +
        `<path d="${keepD}" fill="none"/>` +
        shade('sU', -20, 150, 196, 14, 0.4) +
        goldBand(-20, 176, 142) +
        merlons(-20, 174, 124, 18, 15, 9, '#f6f1e6') +
        goldStuds(-12, 170, 121, 24) +
        bartizan(52) +
        bartizan(150) +
        flag(52, 110, 96, 30, RUST, MUSTL) +
        flag(150, 110, 96, 30, TEAL, MUSTL) +
        // Great arched window with gold tracery and banners either side.
        windowsBody(WINS4.slice(0, 2), GOLDEN) +
        litPath(starPoints(86, 225, 11, 5.5, 8), MUSTL, { shadow: 2, light: 1, lightColor: '#fff1c0' }) +
        glint(83, 221, 1.1) +
        banner(46, 158, 16, 66, RUST, RUSTD, MUSTL, emblem(54, 184, 0.5)) +
        banner(110, 158, 16, 66, RUST, RUSTD, MUSTL, emblem(118, 184, 0.5)) +
        goldBand(-20, 176, 236) +
        pilaster(160, 152, 340) +
        alcove('#f6f1e6', '#d9d1bf', '#bdb29a') +
        hl('M46 296Q46 252 86 252Q126 252 126 296', GOLDEN, 3) +
        // The tall tower: a straight drum standing on the walkway, its plinth on the stonework.
        clip(towerD, masonry(176, 164, 259, 356, { ...MARBLE, seed: 83 }) + form(180, 164, 75, 192, 1, true)) +
        `<path d="${towerD}" fill="none"/>` +
        goldBand(178, 257, 164) +
        merlons(176, 258, 146, 18, 13, 7, '#f6f1e6') +
        goldStuds(182, 256, 143, 20) +
        spire(217, 148, 48, 108, TEAL, TEALD, MUSTL) +
        windowsBody(WINS4.slice(2, 3), GOLDEN) +
        banner(186, 182, 14, 40, RUST, RUSTD, MUSTL, emblem(193, 198, 0.38)) +
        banner(234, 182, 14, 40, RUST, RUSTD, MUSTL, emblem(241, 198, 0.38)) +
        goldBand(178, 257, 236) +
        pilaster(240, 246, 326) +
        flag(217, 122, 96, 34, RUST, MUSTL) +
        litRect(174, 330, 86, 16, '#f6f1e6', 3, { shadow: 3, light: 1.4 }) +
        goldBand(176, 258, 336) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...MARBLE, h: 30, line: '#a89c82', fills: ['#efe8d8', '#e4ddcb', '#f6f1e6', '#d9d1bf'], seed: 84 }) + form(-20, 352, 158, 276, 0.7)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...MARBLE, seed: 85 }) + form(136, 352, 108, 126, 0.8)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 26, 0.45) +
        goldBand(-20, 136, 470) +
        pilaster(14, 376, 462) +
        pilaster(124, 376, 462) +
        carvedPanel(30, 486, 104, 48, 3) +
        hoistBay('#ece6d6', GOLDEN) +
        footShade +
        foundation(91, { ...MARBLE, base: '#a99f8a', line: '#9c917b', fills: ['#d9d1bf', '#c5bca7', '#e4ddcb'] }, ['#d9d1bf', '#c5bca7', '#ece6d6'], WHITE) +
        sallyPort(GOLDEN, GOLDD) +
        moss(30, 586, 22, 6, 21) +
        vine(16, 594, 120, 6, 22) +
        gateVoid +
        archGate('#f6f1e6', MUSTL, '#c5bca7', RUST) +
        litBall(188, 478, 7, MUSTL, 3) +
        gateBrow(GOLDEN, MUSTL, GOLDD) +
        deck(256, '#f6f1e6', WHITE, GOLDEN, GOLDEN) +
        slotPlates({ f: GOLDEN, hi: MUSTL, rivet: GOLDD, trim: GOLDD }, false),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Ground shadow
// ---------------------------------------------------------------------------------------------

const keepShadow = art(
  560,
  110,
  0,
  110,
  // Placed at world (-40, 558): art x = keep art x, art y = keep art y - 578.
  // The sun stands upper left, so the keep throws its shadow down-right across the road, soft at its
  // far end, with a dark contact line where the wall meets the ground.
  (() => {
    const fade = linearAbs([[0, '#1a1226', 0.75], [0.5, '#1a1226', 0.65], [0.8, '#1a1226', 0.3], [1, '#1a1226', 0]], 0, 0, 392, 0);
    const contact = rad([[0, '#140d07', 0.7], [0.6, '#140d07', 0.35], [1, '#140d07', 0]]);
    const body = (k: number) =>
      `M-10 ${54 - k}L150 ${56 - k}L266 ${60 - k}Q${330 + k * 2} ${72 - k * 0.4} ${380 + k * 2} ${94 + k * 0.6}Q${330 + k} ${103 + k * 0.4} ${236 - k} ${102 + k * 0.5}L-10 ${101 + k * 0.5}Z`;
    return (
      `<defs>${fade.def}${contact.def}</defs>` +
      [7, 3.5, 0].map((k) => `<path d="${body(k)}" fill="${fade.url}" opacity=".5"/>`).join('') +
      `<ellipse cx="206" cy="68" rx="90" ry="12" fill="${contact.url}"/>` +
      `<ellipse cx="60" cy="66" rx="90" ry="12" fill="${contact.url}"/>`
    );
  })(),
);

// ---------------------------------------------------------------------------------------------
// Ground at the wall foot, behind the raiders: the keep grows out of each landscape.
// Art 340x130 in keep coordinates y 560..690, placed bottom-left at world (-40, 670).
// ---------------------------------------------------------------------------------------------

interface GroundStyle {
  grass: string;
  grassD: string;
  grassL: string;
  earth: string;
  road: string;
  line: string;
  /** Paving stones at the gate. */
  cobble: string;
  extra: string;
  /** Height of the grass blades; snow keeps them short. */
  blade?: number;
}

/** A strip whose top edge is a fringe of grass blades between x0 and x1. */
function fringe(x0: number, x1: number, y: number, depth: number, R: () => number, blade = 7): string {
  let d = `M${x0} ${y + depth}V${y}`;
  for (let x = x0; x < x1; ) {
    const w = 3 + R() * 4;
    const h = blade * (0.4 + R() * 0.9);
    d += `L${fx(x + w * 0.5)} ${fx(y - h)}L${fx(x + w)} ${fx(y + R() * 2 - 1)}`;
    x += w;
  }
  return `${d}V${y + depth}Z`;
}

/** Grass blades standing up from a line, for the edge of a bank. */
function blades(x0: number, x1: number, y: (x: number) => number, R: () => number, h: number, col: string, dark: string, line = INK): string {
  let d = '';
  for (let x = x0; x < x1; x += 4 + R() * 7) {
    const by = fx(y(x));
    const lean = (R() - 0.4) * 6;
    const hh = fx(h * (0.5 + R() * 0.7));
    d += `M${fx(x)} ${by}q${fx(lean * 0.3)} ${fx(-hh * 0.6)} ${fx(lean)} ${-hh}`;
  }
  return hl(d, line, 3.6) + hl(d, col, 1.8) + hl(d, dark, 0.8, 0.5);
}

/** Cobbles leading up to the gate: the road turns into paving as it reaches the keep. */
function paving(f: string, line: string, R: () => number): string {
  // Worn flat setts, half sunk in the dirt; they thin out as the road takes over.
  let b = '';
  const rows: [number, number, number][] = [[643, 150, 232], [651, 146, 246], [660, 152, 258]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0 + R() * 4; x < x1; ) {
      const w = 10 + R() * 6;
      if (R() < (x > x1 - 34 ? 0.45 : 0.85))
        b += litRect(fx(x), fx(y + R() * 1.5), fx(w), fx(5 + R() * 1.5), tone(f, (R() - 0.6) * 0.16), 2.5, { outline: 1.2, ink: tone(line, 0.25), shadow: 1.4, light: 0.8 });
      x += w + 2.5;
    }
  }
  return `<g opacity=".85">${b}</g>`;
}

function keepGround(s: GroundStyle, seed: number): string {
  const R = rand(seed);
  const bankL = 'M-24 646Q2 634 30 640T86 636T150 648L154 690H-24Z';
  // Right of the gate the spur stands in the road: only a low drift of dirt and a few tufts.
  const bankR = 'M234 662V648Q244 640 256 646Q266 652 270 659Q256 664 234 662Z';
  const edgeL = (x: number) => 641 + Math.sin(x * 0.11) * 3 + (x > 120 ? (x - 120) * 0.2 : 0);
  return (
    // Contact shadow where the plinth disappears into the ground.
    shade('sD', -24, 616, 176, 30, 0.7) +
    shade('sD', 236, 626, 34, 26, 0.6) +
    // Earth showing between grass, then the grass bank with a fringe of blades.
    `<g stroke="${s.line}" stroke-width="2.5" stroke-linejoin="round">` +
    p(bankL, s.earth) +
    `</g>` +
    n(bankR, tone(s.road, -0.15)) +
    hl('M240 650Q252 643 264 649', tone(s.road, 0.3), 1.4, 0.7) +
    n(fringe(-24, 150, 644, 46, R, (s.blade ?? 13) * 0.55), s.grass) +
    n('M-24 652Q30 646 80 650T150 656L152 664Q90 658 40 662T-24 662Z', s.grassL, 0.45) +
    shade('sD', -24, 656, 180, 34, 0.35) +
    paving(tone(s.cobble, -0.12), tone(s.road, -0.55), R) +
    blades(-20, 148, edgeL, R, s.blade ?? 13, s.grass, s.grassD, s.line) +
    blades(238, 262, (x) => 650 + (x - 238) * 0.06, R, (s.blade ?? 13) * 0.6, s.grass, s.grassD, s.line) +
    s.extra
  );
}

const ground = (s: GroundStyle, seed: number): Art => art(340, 130, 0, 130, SHADE_DEFS + ink(`<g transform="translate(0 -560)">${keepGround(s, seed)}</g>`));

/** Little meadow flowers: cream, mustard and rust heads on short stems. */
function flowers(list: [number, number, string][]): string {
  const stems = list.map(([x, y]) => `M${x} ${y + 7}V${y + 1}`).join('');
  return hl(stems, '#3f6b45', 1.4) + `<g stroke-width="1.6">${list.map(([x, y, f]) => c(x, y, 2.8, f)).join('')}</g>` + hl(list.map(([x, y]) => `M${x - 0.8} ${y - 0.8}h.01`).join(''), '#fffaf0', 1.2, 0.8);
}

const groundMeadow = ground(
  {
    grass: '#6f9a4a', grassD: '#3f6b45', grassL: '#a9c86e', earth: '#6b5038', road: '#b08a5a', line: INK, cobble: '#c9b08a',
    extra:
      moss(12, 628, 14, 6, 801) + moss(104, 632, 12, 5, 802) + moss(250, 640, 9, 4, 803) +
      flowers([[8, 640, CREAM], [42, 636, MUSTL], [70, 642, CREAM], [126, 646, RUST]]),
  },
  811,
);

const groundCanyon = ground(
  {
    grass: '#a39a4a', grassD: '#6b6424', grassL: '#d9c27a', earth: '#9a5136', road: '#dcae78', line: INK, cobble: '#e8c79a',
    extra:
      // Sand blown against the plinth, with ripples.
      `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">${p('M-24 640Q20 618 60 632Q90 622 120 638Q100 648 40 648Z', '#d8a878')}${p('M236 646Q252 632 268 646Z', '#d8a878')}</g>` +
      hl('M-14 636Q16 626 40 634M58 634Q84 628 108 638', '#b98857', 1.4, 0.8) +
      hl('M-10 632Q14 622 36 628', '#f0d2a3', 1.4, 0.8) +
      hl('M20 668l6 6l-3 6M100 672l-5 5l4 6', '#6e2f1f', 1.4, 0.7),
  },
  812,
);

const groundMarsh = ground(
  {
    grass: '#55703f', grassD: '#2a3f28', grassL: '#86a35e', earth: '#3f3a2a', road: '#7b6a4c', line: INK, cobble: '#9b8c6c',
    extra:
      // Damp stain creeping up the plinth and a dark puddle with sky in it.
      `<path d="M-24 596Q20 606 50 600T120 606T150 600V640H-24Z" fill="#23403a" stroke="none" opacity=".25"/>` +
      `<g stroke="${INK}" stroke-width="2.2">${p('M262 664Q280 656 306 660Q322 666 300 672Q276 674 262 664Z', '#3f6660')}</g>` +
      n('M270 663Q284 659 300 662Q286 664 272 665Z', '#9fc0bc', 0.7) +
      moss(30, 632, 22, 7, 821) + moss(110, 636, 16, 6, 822) + moss(248, 642, 10, 5, 823),
  },
  813,
);

const groundSnow = ground(
  {
    grass: '#eef3fa', grassD: '#9fb1c9', grassL: WHITE, earth: '#c9d6e8', road: '#9fb1c9', line: '#1a2740', cobble: '#c5d2e4', blade: 4,
    extra:
      // Snow heaped against the plinth, blue in its shadow, and dry stalks poking through.
      `<g stroke="#1a2740" stroke-width="2.4" stroke-linejoin="round">${p('M-24 642Q10 614 50 628Q84 612 124 632Q140 640 150 650L-24 652Z', '#f1f6fc')}${p('M236 650Q250 634 268 650Z', '#f1f6fc')}</g>` +
      n('M60 640Q90 628 124 636Q138 642 148 650Q110 644 60 646Z', '#c9d6e8', 0.85) +
      n('M-10 632Q14 620 40 628Q20 626 -4 636Z', WHITE) +
      hl('M30 636l-2 -12M34 636l3 -10M96 638l-3 -11M100 638l2 -9', '#5a4630', 1.4, 0.9),
  },
  814,
);

// ---------------------------------------------------------------------------------------------
// Landscape dressing in front of the castle's foot
// ---------------------------------------------------------------------------------------------

/** Foot art is 460x130, placed bottom-left at world (-40, 690), so world = art + (-40, 560). */
const EDGE_D = 'C150 78 168 94 200 104C232 113 262 115 292 116';
const BANK_D = `M-8 34Q20 54 46 52T100 58T150 60${EDGE_D}L300 136H-8Z`;
const BANK_LINE = `M-8 34Q20 54 46 52T100 58T150 60${EDGE_D}`;

interface FootStyle {
  base: string;
  /** Sunlit top of the bank. */
  lit: string;
  edge: string;
  extra: string;
}

/** The bank in the very front: a sunlit lip along its top, darker as it comes towards the viewer. */
function footBase(s: FootStyle): string {
  const g = linearAbs([[0, SHADOW, 0], [1, SHADOW, 0.4]], 0, 40, 0, 132);
  return (
    `<defs>${g.def}</defs>` +
    n(BANK_D, s.base) +
    clip(BANK_D, `<rect x="-8" y="30" width="310" height="106" fill="${g.url}" stroke="none"/>` + hl(BANK_LINE, s.lit, 10, 0.6)) +
    hl(BANK_LINE, s.edge, 3.5) +
    s.extra
  );
}

/**
 * Rocks and tufts against the left gate post only. The threshold itself is paving in the ground
 * layer behind the raiders, so nothing in front hides a raider at the gate.
 */
function gateFooting(f: string, hi: string, dark: string, tuft: string, tuftD: string, R: () => number): string {
  return (
    `<g stroke-width="2.8">` +
    rock(128, 64, 15, 10, f, hi, R) +
    rock(146, 73, 10, 6, dark, hi, R) +
    `</g>` +
    tufts([[138, 60, 14], [150, 68, 10]], tuft, tuftD)
  );
}

/** Leaf marks on foliage: short lit arcs on the upper left of a clump, dark ones below. */
function leafMarks(cx: number, cy: number, rx: number, ry: number, hi: string, dark: string, R: () => number): string {
  let lite = '';
  let dk = '';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1 + R() * 0.9);
    const k = 0.35 + R() * 0.5;
    const x = fx(cx + Math.cos(a) * rx * k);
    const y = fx(cy + Math.sin(a) * ry * k);
    lite += `M${x} ${y}q3 -3 6 0`;
    const b = R() * Math.PI * 0.8;
    dk += `M${fx(cx + Math.cos(b) * rx * k)} ${fx(cy + Math.sin(b) * ry * k)}q3 2 6 0`;
  }
  return hl(lite, hi, 1.6, 0.8) + hl(dk, dark, 1.4, 0.45);
}

/** Big dark shapes in the very corner, so something large overlaps the frame. Stays left of and below the wheel. */
function foregroundMass(f: string, hi: string, seed: number, topping = ''): string {
  const R = rand(seed);
  const piece = (cx: number, cy: number, rx: number, ry: number) => {
    const d = lump(cx, cy, rx, ry, R, 11);
    return (
      `<path d="${d}" fill="${f}" stroke="none"/>` +
      crescent(d, fx(-rx * 0.2), fx(-ry * 0.18), tone(f, -0.35)) +
      n(lump(cx - rx * 0.25, cy - ry * 0.4, rx * 0.5, ry * 0.3, R, 7), hi, 0.85) +
      leafMarks(cx, cy, rx, ry, tone(hi, 0.25), tone(f, -0.4), R) +
      `<path d="${d}" fill="none"/>`
    );
  };
  return piece(12, 88, 48, 80) + piece(80, 130, 46, 42) + piece(124, 138, 30, 24) + topping;
}

function bladeTuft(x: number, y: number, h: number): string {
  return `M${x} ${y}q-3 ${-h * 0.6} -8 ${-h * 0.9}M${x} ${y}v${-h}M${x} ${y}q3 ${-h * 0.6} 8 ${-h * 0.9}`;
}

function tufts(list: [number, number, number][], col: string, dark: string): string {
  const d = list.map(([x, y, h]) => bladeTuft(x, y, h)).join('');
  return (
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>` +
    `<g transform="translate(-0.7 -0.4)">${hl(d, tone(col, 0.4), 1, 0.6)}</g>` +
    hl(d, dark, 1, 0.3)
  );
}

/** A shrub: a dark back clump, a lit front clump, leaf marks. */
function bush(cx: number, cy: number, rx: number, ry: number, f: string, hi: string, seed: number): string {
  const R = rand(seed);
  const d = lump(cx, cy, rx, ry, R, 9);
  return (
    `<path d="${d}" fill="${f}" stroke="none"/>` +
    crescent(d, fx(-rx * 0.22), fx(-ry * 0.25), tone(f, -0.32)) +
    n(lump(cx - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.5, R, 7), hi, 0.9) +
    n(lump(cx - rx * 0.32, cy - ry * 0.42, rx * 0.22, ry * 0.18, R, 6), tone(hi, 0.3), 0.8) +
    leafMarks(cx, cy, rx * 0.9, ry * 0.9, tone(hi, 0.35), tone(f, -0.4), R) +
    `<path d="${d}" fill="none"/>`
  );
}

const footMeadow = art(
  460,
  130,
  0,
  130,
  ink(
    (() => {
      const R = rand(301);
      return (
        footBase({ base: '#7fa352', lit: '#b6d276', edge: INK, extra: '' }) +
        gateFooting(STONE, STONEL, STONED, '#4f7f4e', '#2f5a3a', R) +
        bush(14, 58, 32, 26, '#4f7f4e', '#6f9e5c', 1) +
        bush(62, 72, 26, 20, '#5a8a4c', '#7bab62', 2) +
        `<g stroke-width="2.8">` +
        rock(104, 68, 20, 12, STONE, STONEL, R) +
        rock(138, 78, 15, 9, STONED, STONEL, R) +
        rock(166, 96, 13, 7, STONE, STONEL, R) +
        rock(208, 112, 11, 6, STONED, STONEL, R) +
        rock(34, 100, 20, 11, STONE, STONEL, R) +
        `</g>` +
        tufts([[16, 100, 26], [52, 112, 22], [84, 100, 18], [122, 66, 13], [116, 104, 16], [150, 92, 14], [96, 124, 18], [186, 108, 12], [236, 122, 14], [270, 126, 12], [318, 129, 10]], '#4f7f4e', '#2f5a3a') +
        `<g stroke-width="2">` +
        [[30, 82, CREAM], [74, 104, MUSTL], [106, 112, CREAM], [46, 118, RUST], [136, 96, MUSTL], [8, 114, CREAM], [168, 116, CREAM], [226, 118, MUSTL]]
          .map(([x, y, f]) => c(x as number, y as number, 3.6, f as string))
          .join('') +
        `</g>` +
        foregroundMass('#2c5238', '#487a52', 311, tufts([[38, 40, 18], [62, 96, 14]], '#3f6b45', '#20402c'))
      );
    })(),
  ),
);

const footCanyon = art(
  460,
  130,
  0,
  130,
  ink(
    (() => {
      const R = rand(302);
      return (
        footBase({ base: '#c97d4e', lit: '#e8ad7a', edge: INK, extra: hl('M20 92Q60 82 90 96M50 120Q80 110 120 114M150 112Q180 106 214 118', '#a35a38', 3, 0.7) }) +
        gateFooting('#a04e33', '#d99a70', '#8d4630', '#8a8236', '#55511f', R) +
        `<g stroke-width="2.8">` +
        rock(10, 62, 34, 26, '#a04e33', '#c47a55', R) +
        rock(58, 76, 24, 18, '#8d4630', '#c47a55', R) +
        rock(102, 72, 18, 12, '#b0603f', '#d99a70', R) +
        rock(138, 82, 15, 9, '#8d4630', '#c47a55', R) +
        rock(30, 106, 18, 11, '#9a5136', '#c47a55', R) +
        rock(78, 112, 13, 8, '#b0603f', '#d99a70', R) +
        rock(164, 100, 11, 6, '#9a5136', '#c47a55', R) +
        rock(204, 112, 9, 5, '#8d4630', '#c47a55', R) +
        rock(292, 123, 8, 4, '#8d4630', '#c47a55', R) +
        `</g>` +
        tufts([[36, 62, 20], [120, 70, 15], [106, 104, 14], [18, 120, 15], [150, 112, 12], [232, 124, 12]], '#8a8236', '#55511f') +
        foregroundMass('#5e2c20', '#8d4630', 312, hl('M8 40L22 62L12 84M70 106L84 118', INK, 3, 0.7) + tufts([[44, 46, 14]], '#8a8236', '#55511f'))
      );
    })(),
  ),
);

const reedStalks = (x: number, y: number, h: number, flip: number) => {
  const a = `M${x} ${y}Q${x - 2 * flip} ${y - h * 0.55} ${x - 8 * flip} ${y - h}`;
  const b = `M${x + 7} ${y}Q${x + 8} ${y - h * 0.6} ${x + 12 * flip} ${y - h * 1.2}`;
  return (
    `<path d="${a}${b}" fill="none" stroke="${INK}" stroke-width="6.5"/>` +
    `<path d="${a}${b}" fill="none" stroke="#6d8a4e" stroke-width="3"/>` +
    `<g stroke-width="2.2">` +
    r(x - 8 * flip - 4, y - h - 16, 8, 20, WOODD, 3.5) +
    r(x + 12 * flip - 4, y - h * 1.2 - 16, 8, 20, WOODD, 3.5) +
    `</g>`
  );
};

const footMarsh = art(
  460,
  130,
  0,
  130,
  ink(
    (() => {
      const R = rand(303);
      return (
        footBase({ base: '#5d6a43', lit: '#8a9a62', edge: INK, extra: '' }) +
        gateFooting('#6e7560', '#98a086', '#565d49', '#46633e', '#2a3f28', R) +
        `<g stroke-width="2.8">` +
        p(lump(64, 108, 42, 12, R, 8), '#3f6660') +
        p(lump(134, 100, 22, 8, R, 8), '#3f6660') +
        p(lump(214, 116, 22, 5, R, 7), '#3f6660') +
        `</g>` +
        n(lump(54, 105, 20, 4, R, 6), '#7aa3a0', 0.8) +
        n(lump(126, 97, 10, 2.6, R, 6), '#7aa3a0', 0.8) +
        reedStalks(14, 80, 30, 1) +
        reedStalks(42, 74, 24, -1) +
        reedStalks(110, 78, 18, 1) +
        reedStalks(18, 120, 26, -1) +
        `<g stroke-width="2.8">` +
        rock(84, 72, 20, 11, '#6e7560', '#98a086', R) +
        rock(146, 80, 13, 8, '#6e7560', '#98a086', R) +
        `</g>` +
        moss(90, 66, 16, 5, 31) +
        moss(46, 84, 22, 7, 32) +
        tufts([[66, 78, 12], [128, 76, 11], [170, 110, 12], [240, 124, 13]], '#46633e', '#2a3f28') +
        `<g stroke-width="2">${e(106, 118, 14, 4, '#4f7f55')}</g>` +
        foregroundMass('#2e3a2c', '#4c5c44', 313, reedStalks(30, 66, 36, 1) + moss(10, 30, 26, 8, 33))
      );
    })(),
  ),
);

const footSnow = art(
  460,
  130,
  0,
  130,
  (() => {
    const R = rand(304);
    const line = `M-8 22Q20 40 56 42Q100 44 150 58${EDGE_D}`;
    return ink(
      n(`${line}L300 136H-8Z`, '#dde7f4') +
        n('M0 28Q40 44 96 50Q130 54 150 66Q112 58 60 56Q24 54 0 44Z', WHITE, 0.95) +
        hl(line, '#1a2740', 3.5) +
        gateFooting('#8ea7c7', '#dbe7f6', '#7a8fac', '#22405f', '#142a42', R) +
        n('M0 72Q40 62 80 76Q60 98 30 102Q10 98 0 86Z', '#c9d6e8', 0.9) +
        n('M60 112Q90 102 118 108Q104 126 74 126Z', '#c9d6e8', 0.9) +
        `<g stroke="#1a2740" stroke-width="2.8">` +
        rock(72, 62, 20, 12, '#8ea7c7', '#dbe7f6', R) +
        rock(112, 76, 15, 9, '#7a8fac', '#dbe7f6', R) +
        rock(26, 104, 16, 9, '#8ea7c7', '#dbe7f6', R) +
        rock(168, 98, 10, 5, '#8ea7c7', '#dbe7f6', R) +
        `</g>` +
        n('M56 56q16-10 34-2q-10 8-34 2ZM100 70q10-7 24-1q-8 6-24 1ZM14 96q10-6 24 0q-8 5-24 0Z', WHITE) +
        `<g stroke="#1a2740" stroke-width="2.6">` +
        p('M10 74L4 62L14 66L18 52L26 68L34 60L32 76Z', '#22405f') +
        `</g>` +
        hl('M4 66q8-6 16 0q6-5 14-1', WHITE, 4) +
        tufts([[140, 72, 10], [214, 116, 10], [268, 124, 9]], '#22405f', '#142a42') +
        foregroundMass('#1e3650', '#3a5a7c', 314, n('M-8 26Q10 4 32 14Q54 18 60 44Q38 34 24 42Q8 34 -8 44ZM40 96Q74 82 118 100Q92 96 78 104Q60 98 40 106Z', WHITE)),
    );
  })(),
);

// ---------------------------------------------------------------------------------------------
// Mounted weapons, 120x120 art centred on their slots
// ---------------------------------------------------------------------------------------------

const haloDefs = (id: string, col: string, inner: number) => `<defs>${radial(id, [[0, col, inner], [0.5, col, inner * 0.45], [1, col, 0]])}</defs>`;

/** Shading options for small iron parts. */
const IRONO = { shadow: 2.5, light: 1, lightColor: IRONL } as const;

/** Timber plank bolted to the wall, with two iron straps. */
function plank(y: number): string {
  return (
    litRect(26, y, 68, 11, WOOD, 3, { shadow: 3, light: 1.4 }) +
    grain(29, y + 2, 91, y + 9, WOODD, y, 2, false, 0.6) +
    litRect(38, y - 4, 9, 19, IRON, 2, IRONO) +
    litRect(73, y - 4, 9, 19, IRON, 2, IRONO) +
    rivets([[42.5, y], [42.5, y + 11], [77.5, y], [77.5, y + 11]], 1.8, '#5a5f66', '#1d2024')
  );
}

function bolter(ready: boolean): string {
  const stringD = ready ? 'M72 12L38 49L72 86' : 'M72 12Q84 34 80 50Q74 66 72 86';
  const limb = 'M72 12Q102 48 72 86';
  const stock = 'M26 44H96Q102 49 96 55H26Q22 49 26 44Z';
  const wood = ready ? WOOD : '#7f5b37';
  return ink(
    litTubeBeam('M58 100V58', WOODD, 8) +
      plank(102) +
      litBall(58, 58, 8, IRONL, 3.5) +
      litPath(stock, wood, { shadow: 3, light: 1.4 }) +
      grain(30, 46, 94, 53, tone(wood, -0.42), 7, 2, false, 0.6) +
      hl('M32 47H90', ready ? WOODL : '#9a7a53', 1.4, 0.8) +
      litTube(limb, 6.5, ready ? WOODL : '#8c6b45', { outline: 2.75 }) +
      hl('M76 22Q90 40 88 50', ready ? '#ecc48c' : '#a88a62', 1, 0.7) +
      litRect(66, 6, 12, 12, IRON, 3, IRONO) +
      litRect(66, 80, 12, 12, IRON, 3, IRONO) +
      glint(69.5, 9.5, 1) +
      glint(69.5, 83.5, 1) +
      (ready ? hl(stringD, INK, 5) + hl(stringD, CREAM, 2.5) : hl(stringD, INK, 4.5) + hl(stringD, '#8f8672', 2)) +
      (ready
        ? litRect(34, 45, 68, 8, WOODL, 2, { shadow: 2.2, light: 1 }) +
          litPath('M102 40L119 49L102 58Z', IRONL, { shadow: 2.5, light: 1, lightColor: '#d6dbe0' }) +
          hl('M104 44L114 49', WHITE, 1.6) +
          glint(106, 45, 1) +
          litPath('M44 41L32 49L44 57Z', RUST, { shadow: 2, light: 1 }) +
          hl('M41 44L36 49M41 54L36 49', RUSTD, 1, 0.8)
        : hl('M42 49H70', INK, 2.5, 0.5)),
  );
}

function mortar(ready: boolean): string {
  const metal = ready ? IRON : '#5d6066';
  const light = ready ? IRONL : '#8a8d92';
  const defs = ready ? haloDefs('h', '#ff9a30', 0.9) : '';
  const barrel = 'M36 92L30 40Q30 30 60 30Q90 30 90 40L84 92Q60 100 36 92Z';
  const iron = lin([[0, tone(metal, 0.28)], [0.45, metal], [1, tone(metal, -0.5)]], 0);
  const wheel = (x: number) =>
    litPath(`M${x - 9} 96a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z`, WOODD, { shadow: 2.5, light: 1.2 }) +
    hl(`M${x - 6} 96H${x + 6}M${x} 90V102`, tone(WOODD, -0.35), 1.6, 0.8) +
    rivets([[x, 96]], 2.6, IRON);
  return (
    defs +
    `<defs>${iron.def}</defs>` +
    ink(
      (ready ? `<ellipse cx="74" cy="34" rx="32" ry="28" fill="url(#h)" stroke="none"/>` : '') +
        litPath('M16 76H104L110 96H10Z', WOOD, { shadow: 3.5, light: 1.6 }) +
        grain(20, 79, 104, 93, WOODD, 13, 2, false, 0.55) +
        hl('M18 80H102', WOODL, 1.6, 0.8) +
        wheel(30) +
        wheel(90) +
        `<g transform="rotate(-38 60 62)">` +
        `<path d="${barrel}" fill="${iron.url}"/>` +
        hl('M38 84L34 42', light, 2.5, 0.9) +
        hl('M44 60h3M70 74h4M52 82h3', tone(metal, -0.45), 1.3, 0.6) +
        glint(37, 50, 1.4) +
        litPath('M24 40Q60 22 96 40Q96 48 90 48Q60 38 30 48Q24 48 24 40Z', light, { shadow: 2.5, light: 1.2, lightColor: '#d6dbe0' }) +
        litRect(30, 66, 60, 8, RUST, 2, { shadow: 2.5, light: 1 }) +
        rivets([[40, 70], [60, 70], [80, 70]], 1.6, MUSTL) +
        (ready
          ? `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#ffb347" stroke-width="2.5"/><ellipse cx="60" cy="35" rx="16" ry="4.5" fill="#fff0bd" stroke="none"/>`
          : `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#2d2a2a" stroke-width="2.5"/><ellipse cx="62" cy="37" rx="20" ry="5" fill="#141212" stroke="none"/>`) +
        `</g>` +
        plank(101) +
        (ready
          ? `<g stroke-width="1.6">${c(92, 18, 3.5, MUSTL)}${c(104, 30, 2.5, '#ff9a30')}${c(78, 10, 2.5, '#ff9a30')}</g>` + glint(91, 17, 0.9)
          : puffs([[88, 18, 8], [100, 12, 6], [76, 10, 5]])),
    )
  );
}

function frost(ready: boolean): string {
  const horn = ready ? CREAM : '#b8ad93';
  const band = ready ? MUST : '#8a7b55';
  const defs = ready ? haloDefs('h', GLOW, 0.95) : '';
  const hornD = 'M8 26C24 60 56 78 104 78L110 34C80 40 40 36 8 26Z';
  // Growth rings across the horn, darker towards its shaded underside.
  const rings = 'M24 31Q30 50 44 62M60 38Q64 56 72 74M88 38Q90 56 94 77M100 36Q101 56 103 78';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="92" cy="56" rx="28" ry="42" fill="url(#h)" stroke="none"/>` : '') +
        litTubeBeam('M60 88V70', WOODD, 8) +
        plank(92) +
        litPath(hornD, horn, { shadow: 5, light: 2, shadowK: -0.3 }) +
        clip(hornD, hl(rings, tone(horn, -0.3), 1.4, 0.7)) +
        hl('M18 38C36 58 64 70 100 70', ready ? WHITE : '#d0c7ae', 2.5, 0.75) +
        litPath('M40 46L58 54L54 76L34 66Z', band, { shadow: 2.5, light: 1.2, lightColor: '#ffe39a' }) +
        litPath('M72 50L88 50L88 77L72 76Z', band, { shadow: 2.5, light: 1.2, lightColor: '#ffe39a' }) +
        (ready ? glint(43, 52, 1.1) + glint(75, 54, 1.1) : '') +
        (ready
          ? `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#c8faf2" stroke-width="3"/><ellipse cx="108" cy="56" rx="4" ry="15" fill="${WHITE}" stroke="none"/>`
          : `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#3b4250" stroke-width="3"/><ellipse cx="109" cy="58" rx="5" ry="15" fill="#22262e" stroke="none"/>`) +
        (ready
          ? hl('M100 10v18M92 15l16 9M108 15l-16 9', INK, 5) +
            hl('M100 10v18M92 15l16 9M108 15l-16 9', GLOW, 2.5) +
            hl('M114 88v10M109 91l10 5M119 91l-10 5', INK, 3.5) +
            hl('M114 88v10M109 91l10 5M119 91l-10 5', GLOW, 1.8)
          : ''),
    )
  );
}

/** Cold grey smoke, as soft round puffs. */
function puffs(list: [number, number, number][]): string {
  return list.map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="#b9b6ae" stroke="none" opacity=".55"/>`).join('');
}

function bellows(ready: boolean): string {
  const leather = ready ? '#8a5a3a' : '#6f5140';
  const head = ready ? RUST : '#7d4e3f';
  const headD = ready ? RUSTD : '#5e3a30';
  const defs = ready ? haloDefs('h', '#ff8a2a', 0.95) : '';
  const upper = 'M56 42Q68 28 88 30Q104 30 116 44Q120 54 112 56L96 52L72 62Z';
  const lower = 'M60 72Q74 80 100 76Q112 74 114 66L96 60L74 64Z';
  const body = ready ? 'M8 30H56L62 46V66L56 82H8Q2 56 8 30Z' : 'M8 46H56L62 52V62L56 72H8Q4 58 8 46Z';
  const scales = 'M66 50q4 -3 8 0M76 46q4 -3 8 0M70 56q4 -3 8 0M86 52q4 -3 8 0';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="94" cy="58" rx="26" ry="30" fill="url(#h)" stroke="none"/>` : '') +
        litTubeBeam('M52 88V72', WOODD, 8) +
        plank(92) +
        // Bellows body: leather pleats between two boards.
        litPath(body, leather, { shadow: 4, light: 1.6 }) +
        hl(ready ? 'M20 32V80M34 32V80M46 34V78' : 'M20 47V71M34 47V71M46 48V70', INK, 2.2, 0.75) +
        hl(ready ? 'M22 32V80M36 32V80M48 34V78' : 'M22 47V71M36 47V71M48 48V70', tone(leather, 0.35), 1, 0.6) +
        litRect(4, ready ? 26 : 42, 8, ready ? 60 : 34, WOODD, 2, { shadow: 2.5, light: 1 }) +
        rivets(ready ? [[8, 34], [8, 78]] : [[8, 48], [8, 70]], 1.6, IRONL) +
        // Dragon head pointing right.
        litPath('M70 34Q64 14 48 12Q58 22 60 38Z', ready ? MUSTL : '#a89a72', { shadow: 2.5, light: 1, lightColor: '#fff1c0' }) +
        litPath(lower, headD, { shadow: 2.5, light: 1 }) +
        (ready
          ? `<ellipse cx="96" cy="60" rx="16" ry="7" fill="#ffcf6b" stroke-width="2"/><ellipse cx="96" cy="60" rx="8" ry="3" fill="#fff0bd" stroke="none"/>`
          : `<ellipse cx="96" cy="60" rx="16" ry="6" fill="#231d1d" stroke-width="2"/>`) +
        litPath(upper, head, { shadow: 4, light: 1.6 }) +
        n('M64 44Q76 34 92 35Q78 40 70 50Z', ready ? '#d97a52' : '#96624f') +
        hl(scales, tone(head, -0.35), 1.2, 0.7) +
        c(84, 42, 6, ready ? MUSTL : '#c9c1aa') +
        c(85, 42, 2.4, INK) +
        glint(82, 40, 1) +
        hl('M76 36L92 33', INK, 3) +
        hl('M109 42h.01', INK, 3.5) +
        p('M100 53l3 7 3-5ZM108 55l3 6 2-5Z', CREAM) +
        p('M88 73l3-7 3 6ZM98 74l3-7 3 5Z', CREAM) +
        (ready ? `<g stroke-width="1.6">${c(114, 40, 3, MUSTL)}${c(112, 78, 2.5, '#ff9a30')}${c(118, 70, 2, MUSTL)}</g>` : puffs([[112, 38, 6], [104, 30, 4]])),
    )
  );
}

function stomper(ready: boolean): string {
  const chainY = ready ? 54 : 84;
  const links = (y0: number, y1: number) => {
    let flat = '';
    let ring = '';
    for (let y = y0, i = 0; y < y1; y += 12, i++) {
      if (i % 2) flat += `M60 ${y}v7`;
      else ring += `M57 ${y}a3 4.5 0 1 0 6 0a3 4.5 0 1 0 -6 0`;
    }
    return l(flat, 7) + hl(flat, IRONL, 3.5) + hl(flat.replace(/M60/g, 'M59'), '#d6dbe0', 1, 0.7) + `<path d="${ring}" fill="none" stroke="${INK}" stroke-width="5.5"/>` + hl(ring, IRONL, 2.2);
  };
  const weight = 'M30 58H90L100 104Q100 112 92 112H28Q20 112 20 104Z';
  const hookD = `M60 ${chainY}C72 ${chainY + 2} 72 ${chainY + 18} 60 ${chainY + 18}C52 ${chainY + 18} 49 ${chainY + 12} 50 ${chainY + 9}`;
  return ink(
    litRect(10, 8, 100, 15, WOOD, 3, { shadow: 3.5, light: 1.5 }) +
      grain(14, 10, 106, 21, WOODD, 17, 2, false, 0.6) +
      litRect(20, 4, 11, 23, IRON, 2, IRONO) +
      litRect(89, 4, 11, 23, IRON, 2, IRONO) +
      rivets([[25.5, 10], [25.5, 21], [94.5, 10], [94.5, 21]], 1.8, '#5a5f66', '#1d2024') +
      // Winch drum with rope wound round it, and its crank.
      litRect(36, 24, 48, 22, WOODD, 6, { shadow: 4, light: 1.6 }) +
      hl('M44 26Q46 35 44 44M52 26Q54 35 52 44M60 26Q62 35 60 44M68 26Q70 35 68 44M76 26Q78 35 76 44', '#c9a66a', 2.2, 0.85) +
      hl('M44 26Q46 35 44 44M60 26Q62 35 60 44M76 26Q78 35 76 44', '#7f6230', 0.9, 0.7) +
      litBall(36, 35, 7, IRONL, 3.5) +
      litTube('M36 35L22 48', 4, IRON, { outline: 2.5, lightColor: IRONL }) +
      litBall(21, 49, 4.5, MUSTL, 3) +
      links(44, chainY) +
      (ready
        ? l('M52 56a8 8 0 1 1 16 0', 9) +
          hl('M52 56a8 8 0 1 1 16 0', IRONL, 4) +
          litPath(weight, STONED, { shadow: 5, light: 2, lightColor: STONEL }) +
          n('M33 62H45L36 108H27Z', STONE, 0.9) +
          hl('M52 76L49 88M72 84L76 92M84 64l-4 6', INK, 1.6, 0.4) +
          n('M90 58l-6 0 5 6Z', tone(STONED, -0.4)) +
          litRect(25, 68, 70, 10, IRON, 2, IRONO) +
          hl('M29 71H91', '#a9b0b8', 1.2, 0.8) +
          litRect(21, 96, 78, 10, IRON, 2, IRONO) +
          hl('M25 99H95', '#a9b0b8', 1.2, 0.8) +
          rivets([[34, 73], [60, 73], [86, 73], [30, 101], [60, 101], [90, 101]], 2.2, '#5a5f66', '#1d2024') +
          litPath('M34 112l4 7 4-7ZM54 112l4 7 4-7ZM76 112l4 7 4-7Z', IRON, { shadow: 1.2, light: 0.6, lightColor: IRONL })
        : l(hookD, 9) + hl(hookD, IRONL, 4) + hl(`M62 ${chainY + 2}C69 ${chainY + 4} 69 ${chainY + 12} 64 ${chainY + 15}`, '#d6dbe0', 1.2, 0.8)),
  );
}

function shrine(ready: boolean): string {
  const col = ready ? STONEL : '#928c7c';
  const roof = ready ? RUST : '#73493a';
  const defs = ready ? haloDefs('h', '#ffb347', 0.95) : '';
  const inside = lin(ready ? [[0, '#241a30'], [1, '#3a2a45']] : [[0, '#17151c'], [1, '#2a2730']], 90);
  const roofD = 'M24 46L60 14L96 46Q60 38 24 46Z';
  return (
    defs +
    `<defs>${inside.def}</defs>` +
    ink(
      (ready ? `<circle cx="60" cy="64" r="46" fill="url(#h)" stroke="none"/>` : '') +
        litRect(14, 92, 92, 12, STONE, 3, { shadow: 3, light: 1.4, lightColor: STONEL }) +
        hl('M20 95.5H100', STONEL, 1.6, 0.9) +
        n('M100 92l-5 0 5 4Z', STONED) +
        r(38, 46, 44, 46, inside.url, 2) +
        litRect(26, 44, 12, 50, col, 2, { shadow: 3, light: 1.2 }) +
        litRect(82, 44, 12, 50, col, 2, { shadow: 3, light: 1.2 }) +
        hl('M30 50V88M86 50V88', tone(col, -0.25), 1.2, 0.8) +
        litPath(roofD, roof, { shadow: 3.5, light: 1.5 }) +
        clip(roofD, hl('M34 44L60 24L86 44M42 46L60 32L78 46', tone(roof, -0.3), 1.2, 0.7)) +
        hl('M34 42L60 22', ready ? '#e08a60' : '#90604e', 2) +
        litBall(60, 11, 4.5, ready ? MUSTL : '#b9a97a', 3) +
        (ready
          ? litPath('M50 56C38 66 40 80 52 84C64 90 78 84 80 70C80 60 76 54 88 40C74 46 72 40 66 48C60 42 58 52 50 56Z', RUST, { shadow: 3, light: 1.2, lightColor: '#ff9a6a' }) +
            `<g stroke-width="2">${p('M58 62C52 68 52 78 60 82C70 84 76 76 74 68C72 62 72 58 80 50C72 54 70 50 66 56C62 54 62 60 58 62Z', MUST)}</g>` +
            n('M62 66C58 72 60 78 64 80C70 80 72 74 70 70Z', '#fff0bd', 0.85) +
            litBall(58, 72, 11, PLUM, 3) +
            n('M51 69a8 8 0 0 1 8-6l-1 3a5 5 0 0 0-5 4Z', '#b98aa8') +
            hl('M52 75L57 72L55 67M57 72L63 71', MUSTL, 2) +
            hl('M18 34l5 5M100 34l-5 5M60 2v4', MUSTL, 2.5)
          : `<ellipse cx="60" cy="86" rx="16" ry="5" fill="#4a4a4a" stroke-width="2"/>` +
            hl('M46 60q10-8 20 0', '#5a5a64', 2, 0.5) +
            hl('M56 76h6M50 80h4', '#5a5a64', 2, 0.5)),
    )
  );
}

/** Wheel centre: art (64, 52), i.e. offset (+4, -8) from the centre of the 120x120 art. */
function wheelRamp(ready: boolean): string {
  const cx = 64;
  const cy = 52;
  return ink(
    // Wall brace, cradle legs and base plank with a short rolling lip.
    litRect(16, 58, 9, 22, IRON, 2, IRONO) +
      rivets([[20.5, 63], [20.5, 75]], 1.8, '#5a5f66', '#1d2024') +
      litTubeBeam('M24 69H56', WOOD, 6) +
      litTubeBeam('M42 92L60 56', WOODD, 8) +
      litTubeBeam('M88 92L68 56', WOODD, 8) +
      litPath('M100 86L117 96V104L100 98Z', WOOD, { shadow: 2, light: 1 }) +
      litRect(28, 86, 76, 12, WOOD, 3, { shadow: 3, light: 1.4 }) +
      grain(31, 88, 101, 96, WOODD, 23, 2, false, 0.6) +
      litRect(38, 82, 9, 20, IRON, 2, IRONO) +
      litRect(83, 82, 9, 20, IRON, 2, IRONO) +
      rivets([[42.5, 86], [42.5, 98], [87.5, 86], [87.5, 98]], 1.8, '#5a5f66', '#1d2024') +
      // The axle itself, with its iron cap; the waiting wheel sits on it.
      litRect(cx - 13, cy - 5, 26, 10, IRON, 3, IRONO) +
      (ready
        ? `<g transform="translate(${cx} ${cy})scale(${fx(30 / 46)})translate(-50 -50)">${stoneWheel()}</g>`
        : litBall(cx, cy, 8, IRONL, 3.5) + c(cx, cy, 3, INK)),
  );
}

/**
 * The same stone wheel as the rolling `wheel` projectile in props.ts (100x100, radius 46), so the
 * wheel that rolls out looks like the one waiting on the wall. Outlines are a little heavier,
 * because the mount draws it at about two thirds of the size.
 */
function stoneWheel(): string {
  const R = rand(7);
  const at = (rr: number, a: number) => `${fx(50 + Math.cos(a) * rr)} ${fx(50 + Math.sin(a) * rr)}`;
  const arc = (rr: number, a0: number, a1: number) => `M${at(rr, a0)}A${rr} ${rr} 0 0 1 ${at(rr, a1)}`;
  const circ = (rr: number) => `M${50 - rr} 50a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`;
  const rim = rad([[0, STONEL], [0.6, STONE], [1, STONED]], 0.4, 0.38, 0.66);
  const disc = rad([[0, '#d6d0bc'], [0.7, STONEL], [1, STONE]], 0.42, 0.4, 0.62);
  const hub = rad([[0, '#959ba2'], [0.55, IRON], [1, '#2c2f34']], 0.36, 0.34, 0.7);
  let blocks = '';
  let joints = '';
  for (let i = 0; i < 12; i++) {
    const a0 = (i * Math.PI) / 6;
    const a1 = a0 + Math.PI / 6;
    joints += `M${at(33, a0)}L${at(46, a0)}`;
    const k = R() - 0.5;
    blocks += n(`M${at(46, a0)}A46 46 0 0 1 ${at(46, a1)}L${at(33, a1)}A33 33 0 0 0 ${at(33, a0)}Z`, k < 0 ? STONED : STONEL, fx(Math.abs(k) * 0.5 + 0.05));
    const pa = a0 + 0.18 + R() * 0.17;
    const pr = 37 + R() * 5;
    const px = 50 + Math.cos(pa) * pr;
    const py = 50 + Math.sin(pa) * pr;
    blocks +=
      `<circle cx="${fx(px + 0.7)}" cy="${fx(py + 0.7)}" r="1.8" fill="${CREAM}" stroke="none" opacity=".45"/>` +
      `<circle cx="${fx(px)}" cy="${fx(py)}" r="${fx(1.4 + R() * 0.8)}" fill="#5f5a50" stroke="none" opacity=".75"/>` +
      hl(arc(43.4, a0 + 0.08, a0 + 0.3 + R() * 0.1), CREAM, 1.8, 0.45);
  }
  let chisel = '';
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2;
    const rr = 15 + R() * 14;
    chisel += `M${at(rr, a)}l${fx(2.5 + R() * 2)} ${fx(1 + R())}`;
  }
  const CROSS = 'M50 19V81M19 50H81';
  const rivet = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2.4" fill="${IRONL}" stroke="${INK}" stroke-width="1.4"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="1" fill="${WHITE}" stroke="none" opacity=".85"/>`;
  return (
    `<defs>${rim.def}${disc.def}${hub.def}</defs>` +
    `<path d="${circ(46)}" fill="${rim.url}" stroke="none"/>` +
    blocks +
    hl(arc(43.5, 3.5, 4.4), WHITE, 2.8, 0.35) +
    hl(joints, INK, 3.4) +
    `<path d="${circ(33)}" fill="${disc.url}" stroke="none"/>` +
    clip(circ(33), hl(chisel, STONED, 1.4, 0.5) + hl(circ(33), STONED, 6, 0.35)) +
    hl(CROSS, STONED, 8) +
    hl(CROSS, '#5c574d', 3.2, 0.85) +
    hl('M53 21V47M53 53V79M21 53H47M53 53H79', CREAM, 1.5, 0.45) +
    `<path d="${circ(33)}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<path d="${circ(12.5)}" fill="${hub.url}" stroke="${INK}" stroke-width="4"/>` +
    rivet(56, 44) + rivet(56, 56) + rivet(44, 56) + rivet(44, 44) +
    `<circle cx="50" cy="50" r="3.8" fill="${INK}" stroke="none"/>` +
    glint(46.5, 45.5, 1.6, WHITE, 0.7) +
    `<path d="${circ(46)}" fill="none" stroke="${INK}" stroke-width="5.4"/>`
  );
}

// ---------------------------------------------------------------------------------------------
// Great Cauldron, rear position: 2.5D, behind the road, bolted to the castle
// ---------------------------------------------------------------------------------------------

/** Forged knee under the slab, bolted to its front face. */
const ledgeKnee = (x: number) =>
  litPath(`M${x} 170H${x + 34}V180L${x + 12} 198H${x}Z`, IRON, { shadow: 3, light: 1.2, lightColor: IRONL }) +
  hl(`M${x + 4} 174H${x + 30}`, IRONL, 2) +
  rivets([[x + 7, 177], [x + 26, 177], [x + 7, 191]], 1.9, '#5a5f66', '#1d2024');

const potLedge = art(
  240,
  200,
  0,
  200,
  `<defs><radialGradient id="p">${stops([[0, '#1a120a', 0.6], [0.6, '#1a120a', 0.4], [1, '#1a120a', 0]])}</radialGradient></defs>` +
    SHADE_DEFS +
    ink(
      (() => {
        const top = 'M-10 132H176L198 160H-10Z';
        const front = 'M-10 160H198V176H-10Z';
        return (
          // A flat forged strap from a bolted wall plate out to a post on the slab's outer edge.
          litTubeBeam('M20 40L188 62', IRON, 6) +
          hl('M24 38L184 59', IRONL, 1.8) +
          litTubeBeam('M188 58V146', IRON, 6) +
          hl('M186 66V142', IRONL, 1.8) +
          // Wall plate with four bolts, left end tucked behind the keep.
          litRect(-2, 20, 34, 42, IRON, 3, { shadow: 3.5, light: 1.2, lightColor: IRONL }) +
          hl('M2 24H28', IRONL, 2) +
          rivets([[7, 30], [24, 30], [7, 52], [24, 52]], 2.5, '#5a5f66', '#1d2024') +
          litRect(177, 52, 22, 20, IRON, 3, { shadow: 3, light: 1, lightColor: IRONL }) +
          rivets([[183, 58], [193, 58], [183, 66], [193, 66]], 1.8, '#5a5f66', '#1d2024') +
          // Corbel course, forged knees and a shadow under the slab.
          r(-10, 176, 170, 12, STONED, 2) +
          r(-10, 188, 110, 12, STONED, 2) +
          hl('M-4 180H150M-4 192H90', STONE, 2.5, 0.8) +
          shade('sU', -10, 176, 180, 24, 1) +
          clip(front, masonry(-10, 158, 200, 178, { h: 14, base: '#7f7969', fills: [STONE, '#aca696', '#8e8878'], line: '#6a6559', hi: '#d6d0bd', seed: 77 })) +
          `<path d="${front}" fill="none"/>` +
          ledgeKnee(26) +
          ledgeKnee(124) +
          litPath(top, STONEL, { shadow: 3, light: 1.5, lightColor: '#e2dccb' }) +
          n('M-6 136H168L176 146H-6Z', '#d6d0bd', 0.75) +
          hl('M24 136L18 160M70 136L66 160M116 136L118 160M156 136L164 158M-6 148H192', '#8e8878', 2, 0.7) +
          // The pot's contact shadow on the slab.
          `<ellipse cx="97" cy="152" rx="76" ry="11" fill="url(#p)" stroke="none"/>` +
          litRect(177, 142, 22, 12, IRON, 3, { shadow: 2.5, light: 1, lightColor: IRONL }) +
          rivets([[182, 148], [194, 148]], 1.8, '#5a5f66', '#1d2024')
        );
      })(),
    ),
);

// ---------------------------------------------------------------------------------------------
// The Great Cauldron, drawn once for the road (150x90) and scaled for the rear ledge.
// Figures are drawn between the back piece and the front piece.
// ---------------------------------------------------------------------------------------------

/** Back half of the rim, the inside wall lit by the cheese, and the bubbling cheese itself. */
function potBack(w = 3.5): string {
  const melt = rad([[0, '#ffe896'], [0.5, MUSTL], [1, MUST]], 0.42, 0.35, 0.65);
  const bubble = (x: number, y: number, rr: number) =>
    litPath(`M${x - rr} ${y}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`, MUSTL, { outline: 2.2, shadow: fx(rr * 0.35), light: 0, shadowColor: MUST }) +
    hl(`M${fx(x - rr * 0.6)} ${fx(y - rr * 0.1)}a${fx(rr * 0.6)} ${fx(rr * 0.6)} 0 0 1 ${fx(rr * 0.5)} ${fx(-rr * 0.5)}`, '#fffbe6', fx(Math.max(1, rr * 0.25)), 0.95);
  return (
    `<defs>${melt.def}</defs>` +
    ink(
      litPath('M4 38a71 25 0 1 1 142 0a71 25 0 1 1 -142 0Z', IRON, { outline: 4, shadow: 0, light: 2.5, lightColor: IRONL }) +
        e(75, 42, 62, 18, '#1d1712') +
        // The far inner wall catches the warm light of the melt.
        n('M13 42a62 18 0 0 1 124 0Q75 26 13 42Z', '#6a4524', 0.8) +
        `<path d="M16 46C34 32 116 32 134 46C118 62 34 62 16 46Z" fill="${melt.url}"/>` +
        n('M34 44C54 37 96 37 116 44C96 49 54 49 34 44Z', '#fff2b8', 0.55) +
        hl('M24 47C40 54 64 56 80 55', GOLD, 1.6, 0.6) +
        hl('M30 41a6 2 0 0 1 10 0M106 46a5 1.8 0 0 1 9 0', MUST, 1.4, 0.8) +
        bubble(52, 44, 7) + bubble(96, 42, 10) + bubble(74, 50, 5) + bubble(116, 47, 3.5) +
        bubble(82, 12, 4) + bubble(58, 22, 3) +
        hl('M10 33Q75 8 140 33', '#a9b0b8', 1.4, 0.7) +
        glint(36, 19, 1.4),
      w,
    )
  );
}

/** Front of the pot: hammered iron with dents and glints, soot towards the bottom, cheese drips. */
function potFront(stand: 'stones' | 'legs', w = 3.5): string {
  const R = rand(stand === 'stones' ? 41 : 42);
  const belly = 'M8 44C6 66 22 80 42 84H108C128 80 144 66 142 44C118 74 32 74 8 44Z';
  const rimD = 'M4 40C24 72 126 72 146 40C150 50 148 56 142 58C118 84 32 84 8 58C2 56 0 50 4 40Z';
  const iron = lin([[0, '#6d737a'], [0.45, IRON], [1, '#24262a']], 70);
  const soot = lin([[0, '#141210', 0], [1, '#141210', 0.7]], 90);
  let dentsL = '';
  let dentsD = '';
  for (let i = 0; i < 16; i++) {
    const x = 18 + R() * 114;
    const y = 64 + R() * 18;
    const rr = 3 + R() * 3;
    dentsL += `M${fx(x - rr)} ${fx(y)}a${fx(rr)} ${fx(rr * 0.6)} 0 0 1 ${fx(rr * 1.4)} ${fx(-rr * 0.5)}`;
    dentsD += `M${fx(x - rr * 0.3)} ${fx(y + rr * 0.55)}a${fx(rr)} ${fx(rr * 0.6)} 0 0 0 ${fx(rr * 1.3)} ${fx(-rr * 0.6)}`;
  }
  const drip = (d: string, hx: number, hy: number) => litPath(d, MUST, { outline: w, shadow: 2, light: 1, lightColor: '#ffe896' }) + glint(hx, hy, 1.1);
  const base =
    stand === 'stones'
      ? (() => {
          const glow = rad([[0, '#ffb347', 0.85], [0.5, '#ff8a2a', 0.35], [1, '#ff8a2a', 0]]);
          return (
            `<defs>${glow.def}</defs>` +
            [[45, 84], [75, 85], [105, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="5" fill="${glow.url}" stroke="none"/>`).join('') +
            `<g stroke-width="2.8">` +
            rock(14, 75, 12, 7, STONE, STONEL, R) +
            rock(136, 75, 12, 7, STONED, STONEL, R) +
            rock(31, 81, 16, 7, STONED, STONEL, R) +
            rock(59, 82, 16, 6, STONE, STONEL, R) +
            rock(92, 82, 16, 6, STONED, STONEL, R) +
            rock(120, 81, 16, 7, STONE, STONEL, R) +
            `</g>` +
            hl('M44 86h.01M76 87h.01M106 86h.01', '#ffe08a', 2.2, 0.95)
          );
        })()
      : litRect(24, 78, 14, 9, IRON, 2, { outline: w, shadow: 2, light: 1, lightColor: IRONL }) +
        litRect(112, 78, 14, 9, IRON, 2, { outline: w, shadow: 2, light: 1, lightColor: IRONL }) +
        litPath('M22 83a20 4.5 0 1 0 40 0a20 4.5 0 1 0 -40 0Z', STONED, { outline: w, shadow: 1.5, light: 0.8 }) +
        litPath('M88 83a20 4.5 0 1 0 40 0a20 4.5 0 1 0 -40 0Z', STONED, { outline: w, shadow: 1.5, light: 0.8 });
  return (
    `<defs>${iron.def}${soot.def}</defs>` +
    ink(
      (stand === 'legs' ? base : '') +
        `<path d="${belly}" fill="${iron.url}"/>` +
        clip(belly, hl(dentsL, '#9aa1a9', 1.3, 0.55) + hl(dentsD, '#1b1d20', 1.3, 0.5) + `<rect x="0" y="66" width="150" height="20" fill="${soot.url}" stroke="none"/>`) +
        `<path d="${belly}" fill="none"/>` +
        hl('M24 70C44 80 62 81 76 81', '#9aa1a9', 2.5, 0.8) +
        glint(30, 72, 1.5) +
        litPath(rimD, IRONL, { outline: w, shadow: 3, light: 1.4, lightColor: '#b8bfc6' }) +
        hl('M10 47C32 68 118 68 140 47', '#d6dbe0', 1.2, 0.6) +
        glint(22, 55, 1.6) +
        glint(118, 66, 1) +
        drip('M34 66C34 76 38 84 42 84C46 84 46 74 50 72Z', 38, 74) +
        drip('M100 70C102 78 106 80 108 80C112 80 112 72 116 64Z', 106, 72) +
        (stand === 'stones' ? base : ''),
      w,
    )
  );
}

const cauldronShadow =
  `<defs><radialGradient id="cs"><stop offset="0" stop-color="#1a120a" stop-opacity=".55"/><stop offset=".7" stop-color="#1a120a" stop-opacity=".3"/><stop offset="1" stop-color="#1a120a" stop-opacity="0"/></radialGradient></defs>` +
  `<ellipse cx="78" cy="81" rx="68" ry="8" fill="url(#cs)"/>`;

const potRearBack = art(150, 100, 75, 100, `<g transform="translate(75 100)scale(.8)translate(-75 -90)">${potBack(4)}</g>`);
const potRearFront = art(150, 100, 75, 100, `<g transform="translate(75 100)scale(.8)translate(-75 -90)">${potFront('legs', 4)}</g>`);

// ---------------------------------------------------------------------------------------------
// Gate leaves (74x150, they fill the gate frame) and the crack overlays drawn over them.
// ---------------------------------------------------------------------------------------------

const LEAF_D = 'M6 2H68Q72 2 72 6V148H2V6Q2 2 6 2Z';

/** Vertical planks across a box, each with its own tone, grain, a knot now and then, bevelled seams. */
function gatePlanks(x0: number, y0: number, x1: number, y1: number, count: number, f: string, seed: number): string {
  const R = rand(seed);
  const w = (x1 - x0) / count;
  let b = '';
  let seams = '';
  let bevel = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + i * w;
    b += n(rect(fx(x), y0, fx(w), y1 - y0), tone(f, (R() - 0.5) * 0.2)) + grain(x + 1.5, y0 + 2, x + w - 1.5, y1 - 2, tone(f, -0.42), seed + i * 13, 2, true, 0.6);
    if (R() < 0.4) {
      const ky = fx(y0 + 20 + R() * (y1 - y0 - 40));
      b += e(fx(x + w / 2), ky, 1.8, 3.2, tone(f, -0.45)).replace('/>', ' stroke="none"/>') + hl(`M${fx(x + w / 2 - 3.5)} ${ky}a3.5 5.5 0 1 0 7 0a3.5 5.5 0 1 0 -7 0`, tone(f, -0.3), 0.9, 0.7);
    }
    if (i) {
      seams += `M${fx(x)} ${y0}V${y1}`;
      bevel += `M${fx(x + 1.4)} ${y0}V${y1}`;
    }
  }
  return b + hl(seams, tone(f, -0.55), 1.8) + hl(bevel, tone(f, 0.35), 0.9, 0.6);
}

/** A recessed panel: the frame shades its upper left, its lower right catches light. */
function recess(d: string, f: string, w = 2.5): string {
  return `<path d="${d}" fill="${f}" stroke="none"/>` + crescent(d, 3, 3.3, tone(f, -0.32)) + crescent(d, -1.5, -1.6, tone(f, 0.3), 0.8) + `<path d="${d}" fill="none" stroke-width="${w}"/>`;
}

/** Light over a whole leaf: lit left edge, shadowed right side, shade under the lintel. */
const leafLight = () => form(2, 2, 70, 146, 1) + shade('sU', 2, 2, 70, 18, 0.75);

/** An iron ring pull on a riveted plate. */
const ringPull = (x: number, y: number) =>
  litRect(x - 5, y - 9, 10, 9, IRON, 2, { outline: 2.2, shadow: 2, light: 0.8, lightColor: IRONL }) +
  `<circle cx="${x}" cy="${y + 4}" r="6" fill="none" stroke="${INK}" stroke-width="4.6"/><circle cx="${x}" cy="${y + 4}" r="6" fill="none" stroke="${IRONL}" stroke-width="2"/>` +
  hl(`M${x - 5} ${y + 2}a6 6 0 0 1 4 -4`, '#e8ecf0', 1, 0.8) +
  rivets([[x, y - 5]], 1.8, '#5a5f66');

function gate0(): string {
  return (
    SHADE_DEFS +
    ink(
      `<path d="${LEAF_D}" fill="${WOOD}"/>` +
        clip(LEAF_D, gatePlanks(2, 2, 72, 148, 5, WOOD, 501) + leafLight()) +
        `<path d="${LEAF_D}" fill="none"/>` +
        litPath('M5 34H19L69 116H55Z', WOODL, { shadow: 3, light: 1.4 }) +
        grain(10, 40, 62, 112, tone(WOODL, -0.4), 503, 1, false, 0.5) +
        litRect(2, 20, 70, 15, WOODL, 3, { shadow: 3.5, light: 1.5 }) +
        grain(4, 22, 70, 33, tone(WOODL, -0.4), 504, 2, false) +
        litRect(2, 115, 70, 15, WOODL, 3, { shadow: 3.5, light: 1.5 }) +
        grain(4, 117, 70, 128, tone(WOODL, -0.4), 505, 2, false) +
        rivets([[9, 27], [37, 27], [65, 27], [9, 122], [37, 122], [65, 122]], 2.3) +
        ringPull(58, 70),
    )
  );
}

function gate1(): string {
  const band = (y: number) =>
    litRect(2, y, 70, 18, IRON, 2, { shadow: 5, light: 1.6, lightColor: IRONL }) +
    hl(`M6 ${y + 3}H68`, '#a9b0b8', 1.2, 0.8) +
    hl(`M20 ${y + 9}h4M50 ${y + 11}h3`, '#2c2f35', 1.3, 0.6) +
    rivets([[10, y + 9], [28, y + 9], [46, y + 9], [64, y + 9]], 2.6, '#5a5f66', '#1d2024');
  const corner = (d: string) => litPath(d, IRON, { shadow: 2.5, light: 1.2, lightColor: IRONL });
  return (
    SHADE_DEFS +
    ink(
      `<path d="${LEAF_D}" fill="${WOODD}"/>` +
        clip(LEAF_D, gatePlanks(2, 2, 72, 148, 4, WOODD, 511) + leafLight()) +
        `<path d="${LEAF_D}" fill="none"/>` +
        band(14) +
        band(66) +
        band(118) +
        corner('M2 2H24L2 24Z') +
        corner('M72 2H50L72 24Z') +
        corner('M2 148H24L2 126Z') +
        corner('M72 148H50L72 126Z') +
        ringPull(56, 94),
    )
  );
}

function gate2(): string {
  const inner = 'M11 8H63Q66 8 66 11V139Q66 142 63 142H11Q8 142 8 139V11Q8 8 11 8Z';
  const star = starPoints(37, 75, 27, 16, 12);
  return (
    SHADE_DEFS +
    ink(
      `<path d="${LEAF_D}" fill="${RUSTD}"/>` +
        clip(LEAF_D, gatePlanks(2, 2, 72, 148, 1, RUSTD, 521) + leafLight()) +
        `<path d="${LEAF_D}" fill="none"/>` +
        // Worn paint: bare wood shows where hands and boots have rubbed.
        n('M3 60q2 -5 4 0q1 6 -2 8ZM68 98q2 -4 3 1q0 5 -3 4ZM30 145q4 -3 8 0Z', WOODL, 0.8) +
        recess(inner, MUST) +
        clip(inner, gatePlanks(8, 8, 66, 142, 4, MUST, 522) + form(8, 8, 58, 134, 0.9) + `<g opacity=".35">${crescent(inner, 3, 3.3, SHADOW)}</g>`) +
        `<path d="${inner}" fill="none" stroke-width="2.5"/>` +
        litPath(star, MUSTL, { outline: 3, shadow: 3, light: 1.4, lightColor: '#fff1c0' }) +
        litPath('M24 75a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z', RUST, { shadow: 3.5, light: 1.5 }) +
        n('M27 73a10 10 0 0 1 8 -9q-6 4 -6 11Z', '#e08a60', 0.8) +
        hl('M31 72h.01M43 72h.01', INK, 3) +
        hl('M31 80q6 5 12 0', CREAM, 2.5) +
        n('M27 79a3 2 0 1 0 .1 0ZM46 79a3 2 0 1 0 .1 0Z', '#e07a5a', 0.7) +
        litTube('M14 22H60M14 128H60', 3.5, IRON, { outline: 2, lightColor: IRONL }) +
        rivets([[14, 14], [60, 14], [14, 136], [60, 136]], 2.6, MUSTL, INK),
    )
  );
}

const RUNES = 'M37 14V44M37 20L48 30M37 30L26 40M26 62L48 62L26 88L48 88M37 106V136M26 106L37 118L48 106M28 136H46';

function gate3(): string {
  const inner = 'M10 8H64Q66 8 66 10V140Q66 142 64 142H10Q8 142 8 140V10Q8 8 10 8Z';
  const gold = lin([[0, '#ffe39a'], [0.5, MUST], [1, GOLDD]], 45);
  const halo = rad([[0, '#9ff5ea', 0.45], [1, '#9ff5ea', 0]]);
  return (
    SHADE_DEFS +
    `<defs>${gold.def}${halo.def}</defs>` +
    ink(
      `<path d="${LEAF_D}" fill="#3b3347"/>` +
        clip(LEAF_D, gatePlanks(2, 2, 72, 148, 3, '#3b3347', 531) + leafLight()) +
        `<path d="${LEAF_D}" fill="none"/>` +
        recess(inner, '#4c4359') +
        clip(inner, gatePlanks(8, 8, 66, 142, 3, '#4c4359', 532) + `<g opacity=".4">${crescent(inner, 3, 3.3, SHADOW)}</g>`) +
        `<path d="${inner}" fill="none" stroke-width="2.5"/>` +
        litTube('M8 52H66M8 98H66', 2.5, '#5d5470', { outline: 2.5 }) +
        `<path d="M5 5H69V145H5Z" fill="none" stroke="${gold.url}" stroke-width="3"/>` +
        rivets([[5, 5], [69, 5], [5, 145], [69, 145], [37, 5], [37, 145]], 2.8, MUST, INK) +
        `<ellipse cx="37" cy="75" rx="30" ry="70" fill="${halo.url}" stroke="none"/>` +
        hl(RUNES, INK, 6, 0.6) +
        hl(RUNES, '#7fae9f', 3) +
        `<g transform="translate(-0.6 -0.6)">${hl(RUNES, '#d8fff6', 1, 0.75)}</g>`,
    )
  );
}

function gate4(): string {
  const panel = 'M12 10H62Q64 10 64 12V138Q64 140 62 140H12Q10 140 10 138V12Q10 10 12 10Z';
  const shield = 'M37 42L60 51V84Q60 104 37 116Q14 104 14 84V51Z';
  const field = 'M37 54L50 59V83Q50 95 37 104Q24 95 24 83V59Z';
  return (
    SHADE_DEFS +
    `<defs>${GILT.def}</defs>` +
    ink(
      `<path d="${LEAF_D}" fill="${GILT.url}"/>` +
        clip(LEAF_D, form(2, 2, 70, 146, 0.8) + shade('sU', 2, 2, 70, 14, 0.6)) +
        `<path d="${LEAF_D}" fill="none"/>` +
        hl('M6 6H68V144H6Z', '#fff1c0', 1.6, 0.8) +
        recess(panel, TEALD, 2) +
        clip(panel, hl('M10 40L37 10L64 40M10 110L37 140L64 110M10 40L64 110M64 40L10 110M10 75H16M58 75H64', MUST, 2.5) + `<g opacity=".4">${crescent(panel, 3, 3.3, SHADOW)}</g>`) +
        `<path d="${panel}" fill="none" stroke-width="2"/>` +
        litPath(shield, MUST, { shadow: 4, light: 1.6, lightColor: '#ffe39a' }) +
        hl('M37 48L55 55V83Q55 100 37 110Q19 100 19 83V55Z', MUSTL, 2) +
        litPath(field, RUST, { outline: 2.5, shadow: 3, light: 1.2 }) +
        litPath(starPoints(37, 78, 13, 6, 8), MUSTL, { outline: 2.5, shadow: 1.5, light: 0.8, lightColor: '#fff1c0' }) +
        litBall(37, 78, 4, RED, 2.2) +
        glint(28, 52, 1.4) +
        litPath('M2 22H26L20 30H2ZM72 22H48L54 30H72ZM2 128H26L20 120H2ZM72 128H48L54 120H72Z', MUSTL, { outline: 3, shadow: 1.5, light: 0.8 }) +
        rivets([[10, 26], [64, 26], [10, 124], [64, 124], [37, 14], [37, 136]], 2.2, GOLD, GOLDD),
    )
  );
}

/** Points of every "M..L.." run in a path, for turning crack lines into split shapes. */
function runs(d: string): [number, number][][] {
  return d
    .split('M')
    .filter(Boolean)
    .map((seg) => {
      const v = seg.split(/[L\s]+/).filter(Boolean).map(Number);
      const pts: [number, number][] = [];
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
      return pts;
    });
}

/**
 * A real split: a dark wedge that is widest where the blow landed and tapers to a hairline, a
 * light lip on its upper-left edge where the wood is raised, and a few splinters.
 */
function split(d: string, w0: number): string {
  let out = '';
  for (const pts of runs(d)) {
    const n0 = pts.length;
    const left: string[] = [];
    const right: string[] = [];
    pts.forEach(([x, y], i) => {
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(n0 - 1, i + 1)];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      const w = (w0 * (1 - i / (n0 - 1 || 1))) / 2 + 0.3;
      left.push(`${fx(x + nx * w)} ${fx(y + ny * w)}`);
      right.unshift(`${fx(x - nx * w)} ${fx(y - ny * w)}`);
    });
    const wedge = `M${left.join('L')}L${right.join('L')}Z`;
    out +=
      `<path d="${wedge}" fill="#140d08" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M${left.join('L')}" fill="none" stroke="${CREAM}" stroke-width="1.1" stroke-linecap="round" opacity=".6" transform="translate(-0.9 -0.9)"/>`;
    // Splinters at the bends.
    for (let i = 1; i < n0 - 1; i += 2) {
      const [x, y] = pts[i];
      out += `<path d="M${x} ${y}l${-3 + (i % 3)} -4l2 1Z" fill="${WOODL}" stroke="${INK}" stroke-width="1"/>`;
    }
  }
  return out;
}

const CRACK_A = 'M72 22L56 32L62 46L46 58L52 74M56 32L44 24M46 58L34 52';
const CRACK_B = 'M2 112L18 104L14 90L30 82L26 66M18 104L30 112M30 82L42 88M72 96L60 100L64 116L52 124L56 146M60 100L48 96';
const CRACK_C = 'M36 2L30 18L40 28L28 40M2 30L14 38L10 52L22 56M2 74L14 70M74 62L62 68';
const HOLE = 'M22 62L34 54L42 62L54 58L60 74L50 80L56 92L42 90L36 100L28 88L16 88L22 76Z';

const crack1 = split(CRACK_A, 5);
const crack2 = crack1 + split(CRACK_B, 5);
/** The worst stage: a hole smashed through, splintered board ends around it, chips flying off. */
const crack3 =
  crack2 +
  split(CRACK_C, 4.5) +
  (() => {
    const depth = rad([[0, '#000000'], [0.7, '#140d08'], [1, '#2a1c12']], 0.4, 0.4, 0.7);
    return (
      `<defs>${depth.def}</defs>` +
      ink(
        `<path d="${HOLE}" fill="${depth.url}"/>` +
          // Splintered board ends pointing into the hole, lit on top.
          litPath('M22 62L30 64L26 70Z', WOODL, { outline: 1.8, shadow: 1, light: 0 }) +
          litPath('M42 62L46 70L40 68Z', WOODL, { outline: 1.8, shadow: 1, light: 0 }) +
          litPath('M60 74L52 76L56 70Z', WOODL, { outline: 1.8, shadow: 1, light: 0 }) +
          litPath('M36 100L38 92L42 96Z', WOOD, { outline: 1.8, shadow: 1, light: 0 }) +
          litPath('M16 88L22 84L24 88Z', WOOD, { outline: 1.8, shadow: 1, light: 0 }) +
          hl('M23 63L34 55L42 63L54 59', CREAM, 1.2, 0.6) +
          litPath('M14 92L26 86L24 100Z', CREAM, { outline: 2.5, shadow: 1.5, light: 0 }) +
          litPath('M56 54L66 46L62 62Z', CREAM, { outline: 2.5, shadow: 1.5, light: 0 }) +
          litPath('M38 104L46 96L50 110Z', WOODL, { outline: 2.5, shadow: 1.5, light: 0 }) +
          litPath('M12 58L20 62L14 70Z', WOODL, { outline: 2.5, shadow: 1.5, light: 0 }),
        2.5,
      )
    );
  })();

/**
 * Gate leaf and crack bodies (each fills a 74x150 canvas) and the road cauldron. props.ts registers
 * them in `PROPS` under their old names.
 */
export const KEEP_PROPS = {
  gate0: gate0(),
  gate1: gate1(),
  gate2: gate2(),
  gate3: gate3(),
  gate4: gate4(),
  // Splits stay on the leaf; they never spill over its edge.
  crack1Body: clip(LEAF_D, crack1),
  crack2Body: clip(LEAF_D, crack2),
  crack3Body: clip(LEAF_D, crack3),
  // A hair smaller than the canvas, so the rim's outline never touches its edge.
  cauldronBack: art(150, 90, 75, 90, `<g transform="translate(75 88)scale(.96)translate(-75 -88)">${potBack()}</g>`),
  cauldronFront: art(150, 90, 75, 90, cauldronShadow + `<g transform="translate(75 88)scale(.96)translate(-75 -88)">${potFront('stones')}</g>`),
};

const cheese = centred(
  70,
  60,
  ink(
    p('M32 8C12 8 5 14 5 20V42C5 50 18 56 32 56C40 56 46 55 50 52V36L32 20L58 18C57 12 48 8 32 8Z', MUSTL) +
      p('M32 8C12 8 5 14 5 20C5 25 18 32 32 32V20L58 18C57 12 48 8 32 8Z', CREAM) +
      p('M32 20L50 36V52L32 44Z', MUST) +
      n('M47 41a3.2 3 0 1 0 .1 0Z', GOLDD, 0.5) +
      n('M12 26a2.6 2 0 1 0 .1 0ZM44 13a2.4 1.8 0 1 0 .1 0ZM24 12a2 1.4 0 1 0 .1 0Z', MUSTL) +
      c(17, 38, 2, INK) +
      c(29, 40, 2, INK) +
      hl('M15 45q8 7 16 2', INK, 2.2) +
      n('M9 46a2 1.6 0 1 0 .1 0Z', GOLD, 0.7),
    3,
  ),
);

const steam = centred(
  60,
  60,
  `<defs>${radial('s', [[0, WHITE, 0.85], [0.55, WHITE, 0.45], [1, WHITE, 0]])}</defs>` +
    `<circle cx="22" cy="36" r="17" fill="url(#s)"/><circle cx="36" cy="24" r="20" fill="url(#s)"/><circle cx="40" cy="40" r="15" fill="url(#s)"/>`,
);

// ---------------------------------------------------------------------------------------------
// Eagle Perch, new form: a hook on a chain and the great eagle's head and neck
// ---------------------------------------------------------------------------------------------

/** Period 120: oval links at 30 and 90, edge-on links across the seam at 0, 60 and 120. */
const hookChain = art(
  34,
  120,
  17,
  0,
  ink(
    [0, 60, 120].map((y) => r(13, y - 21, 8, 42, IRON, 4)).join('') +
      hl('M15 -12V12M15 48V72M15 108V132', '#a9b0b8', 1.6) +
      hl('M19.5 -14V14M19.5 46V74M19.5 106V134', '#25282c', 1.4, 0.8) +
      [30, 90]
        .map(
          (y) =>
            `<ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke-width="10"/><ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke="${IRONL}" stroke-width="5"/>` +
            // Upper-left of each ring catches the light, lower-right rolls into shade.
            hl(`M7 ${y + 4}C6 ${y - 12} 12 ${y - 22} 19 ${y - 22}`, '#e3e8ec', 1.6, 0.85) +
            hl(`M27 ${y - 4}C28 ${y + 12} 22 ${y + 22} 15 ${y + 22}`, '#3d4147', 1.8, 0.8) +
            glint(9, y - 8, 1),
        )
        .join(''),
    2.5,
  ),
);

const perchHook = art(
  110,
  130,
  55,
  0,
  ink(
    litPath('M30 2H80L74 22H36Z', WOOD, { shadow: 3.5, light: 1.5 }) +
      grain(36, 8, 74, 18, WOODD, 61, 2, false, 0.6) +
      litRect(44, 0, 22, 14, IRON, 2, { shadow: 3, light: 1, lightColor: IRONL }) +
      rivets([[49, 7], [61, 7]], 1.8, '#5a5f66', '#1d2024') +
      litRect(49, 18, 12, 16, IRON, 3, { shadow: 3, light: 1, lightColor: IRONL }) +
      litTube('M55 32C78 38 88 62 80 86C72 112 42 118 26 104C18 96 18 84 24 78', 9.5, IRON, { outline: 2.75, lightColor: IRONL }) +
      hl('M63 38C78 46 82 66 76 84', '#c4cad0', 2.2, 0.9) +
      hl('M30 98C40 108 58 108 68 98', '#2c2f35', 1.5, 0.7) +
      glint(70, 50, 1.6) +
      litPath('M15 76L33 72L26 94Z', IRONL, { shadow: 2.5, light: 1, lightColor: '#d6dbe0' }) +
      glint(21, 78, 1),
    3.5,
  ),
);

/** Eagle head and neck facing left. Beak anchor at art (20, 120). */
function eagleHead(open: boolean): string {
  const PALE = '#f2ead6';
  const PALED = '#c9bb9b';
  const CROWN = '#5a3a1e';
  const BEAK = '#f0d67a';
  const BEAKD = '#c9a24a';
  // Everything but the beak sits 34px further left than it is drawn here.
  const neck =
    'M196 44C290 26 410 34 620 14V210L590 200L576 214L548 202L534 216L512 196L500 210L470 198L456 214L428 200L412 216L382 200L368 214L338 198L324 212L294 196L280 208L250 192L232 200L196 180Z';
  const ruffRear =
    'M250 34L276 46L304 30L308 58L340 50L330 80L362 84L338 104L366 122L336 130L352 156L320 154L324 186L294 172L280 200L256 176L224 188Z';
  const ruffBack =
    'M214 36L242 46L272 36L276 62L306 58L296 86L324 92L300 110L328 128L298 134L316 158L284 156L288 186L258 170L244 196L224 172L196 186Z';
  const ruffFront =
    'M176 38L204 46L226 36L232 60L258 58L246 84L272 92L248 108L272 124L246 130L260 154L232 150L234 178L208 164L194 186L176 168Z';
  const head = 'M118 72C136 42 186 34 214 52L206 66L226 76L210 92L230 104L212 118L228 134L208 142L214 160L192 156L188 176C166 180 138 170 122 142Z';
  const crown = 'M118 72C136 42 186 34 214 52L206 66L190 60L184 76L168 66L158 82L146 70L136 86L124 76Z';
  const body = neck + ruffRear + ruffBack + ruffFront + head;
  let plumes = '';
  for (let k = 0, x = 340; x < 600; k++, x += 38) {
    for (const row of [0, 1, 2]) {
      const y = 62 + row * 44 + (k % 2) * 16;
      plumes += `M${x} ${y}q18 6 26 22q-20 2 -26 -22Z`;
    }
  }
  const featherLines = 'M178 96l22 6M186 118l22 2M170 138l22 8M152 148l14 8M226 62l20 16M238 100l22 2M232 134l18 14M270 70l22 12M286 118l26 2M274 150l18 16';
  const upperShut = 'M94 86C76 78 56 80 44 92C32 104 23 116 22 132C28 121 36 115 46 113L94 108Z';
  const lowerShut = 'M46 115Q70 111 94 109L92 120Q68 126 52 122Z';
  const upperOpen = 'M94 80C76 70 56 72 44 84C32 98 23 110 22 126C28 114 36 107 46 105L94 99Z';
  const lowerOpen = 'M40 146Q62 134 94 119L92 132Q68 156 50 156Q40 152 40 146Z';
  return (
    `<defs>${linear('es', 0, 1, [[0, SHADOW, 0], [1, SHADOW, 0.62]])}</defs>` +
    ink(
      `<g transform="translate(-34 0)">` +
        p(neck, WOODD) +
        n('M210 50C300 32 410 42 620 22V44C410 62 300 54 210 72Z', GOLD, 0.8) +
        `<g stroke-width="2.5">${n(plumes, GOLDD)}<path d="${plumes}" fill="none" stroke="#4a2f19"/></g>` +
        hl(plumes.replace(/q18 6 26 22q-20 2 -26 -22Z/g, 'q12 4 18 12'), '#e0a64a', 1.6, 0.6) +
        litPath(ruffRear, GOLDD, { outline: 5, shadow: 6, light: 2.5, lightColor: '#c98a2b' }) +
        litPath(ruffBack, GOLD, { outline: 5, shadow: 6, light: 2.5, lightColor: '#e8ae52' }) +
        litPath(ruffFront, PALED, { outline: 5, shadow: 6, light: 2.5, lightColor: '#e8dcc0' }) +
        litPath(head, PALE, { outline: 5, shadow: 8, light: 3, lightColor: WHITE }) +
        hl(featherLines, GOLDD, 3.5, 0.75) +
        hl(featherLines.replace(/M(\d+) (\d+)/g, (_, x: string, y: string) => `M${Number(x) - 1} ${Number(y) - 1.5}`), '#fff8e8', 1.2, 0.55) +
        p(crown, CROWN) +
        n('M132 62C150 46 182 44 200 54L186 58L176 68L164 60L152 72L142 64Z', '#8e5a22', 0.9) +
        // The strong shadow side: everything below the middle falls off into shade.
        clip(body, n(rect(100, 104, 560, 120), 'url(#es)')) +
        `</g>` +
        (open
          ? p('M46 105L94 99L94 119Q62 134 40 146Q42 124 46 105Z', '#6b1f22') + hl('M48 128Q66 120 86 112', '#b3282d', 5) + p(lowerOpen, BEAKD)
          : '') +
        litPath(open ? upperOpen : upperShut, BEAK, { outline: 5, shadow: 5, light: 0, shadowColor: BEAKD }) +
        n(open ? 'M38 94Q52 76 80 76Q58 84 44 102Z' : 'M36 110Q50 84 80 82Q60 94 46 114Z', '#fbeeb8', 0.9) +
        glint(open ? 56 : 54, open ? 82 : 88, 1.8) +
        // Dark hooked tip.
        n(open ? 'M22 126C23 112 30 101 38 93L46 105C36 107 28 114 22 126Z' : 'M22 132C23 118 30 106 38 99L46 113C36 115 28 121 22 132Z', '#5a3312') +
        (open ? '' : p(lowerShut, BEAKD)) +
        // Cere at the base of the beak.
        p(open ? 'M80 74Q92 74 100 84L97 100L80 100Z' : 'M80 80Q92 80 100 90L98 109L80 109Z', '#d9a93f') +
        hl(open ? 'M88 84h.01' : 'M88 92h.01', INK, 4) +
        // Fierce eye under a heavy, overhanging brow.
        c(116, 98, 10, '#f0a92c') +
        n('M108 101a9 9 0 0 0 16 3a10 10 0 0 1 -16 -3Z', '#b8641a', 0.8) +
        c(114, 99, 5, INK) +
        glint(111, 95, 1.8) +
        p('M78 100L108 72L156 62L160 82L120 92Z', '#4a2f19') +
        n('M104 78L152 68L153 74L112 84Z', '#8e5a22', 0.9),
      5,
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Weather overlays, drawn over the keep: 300x660, same anchor as the keep.
// ---------------------------------------------------------------------------------------------

const SNOW = '#f1f6fc';
const SNOWD = '#c9d6e8';
const SNOWLINE = '#1a2740';

/** A lumpy strip lying on top of a ledge. */
function drift(x0: number, x1: number, y: number, seed: number, f = SNOW, line = SNOWLINE, rise = 8): string {
  const R = rand(seed);
  let d = `M${x0} ${y + 3}`;
  for (let x = x0; x < x1; ) {
    const nx = Math.min(x + 14 + R() * 16, x1);
    d += `Q${fx((x + nx) / 2)} ${fx(y - rise * (0.7 + R()))} ${fx(nx)} ${fx(y + 1 - R() * 2)}`;
    x = nx;
  }
  return `<path d="${d}V${y + 3}Z" fill="${f}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function icicles(x0: number, x1: number, y: number, seed: number): string {
  const R = rand(seed);
  let d = '';
  for (let x = x0; x < x1; x += 18 + R() * 26) d += `M${fx(x)} ${y}l3.5 ${fx(7 + R() * 9)}l3.5 ${fx(-7 - R() * 2)}Z`;
  return `<path d="${d}" fill="${SNOWD}" stroke="${SNOWLINE}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/** Snow over the upper part of a roof, with a scalloped lower edge. */
function snowCap(d: string, x0: number, x1: number, y0: number, y1: number, seed: number): string {
  const R = rand(seed);
  let wave = `M${x0} ${y0}H${x1}V${y1}`;
  for (let x = x1; x > x0; ) {
    const nx = Math.max(x - 16 - R() * 14, x0);
    wave += `Q${fx((x + nx) / 2)} ${fx(y1 + (R() < 0.5 ? 12 : -6) + R() * 8)} ${fx(nx)} ${fx(y1 + R() * 6 - 3)}`;
    x = nx;
  }
  wave += 'Z';
  return clip(d, n(wave, SNOW) + hl(wave, SNOWD, 2.5)) + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
}

function snowMerlons(x0: number, x1: number, y: number, w: number, gap: number, seed: number): string {
  let b = '';
  for (let x = x0, i = 0; x < x1; x += w + gap, i++) b += drift(x - 1, x + w + 1, y, seed + i, SNOW, SNOWLINE, 6);
  return b;
}

/** Ledges every tier shares: walkway and gate brow. */
const snowLedges = (seed: number) =>
  drift(-20, 256, 346, seed) + drift(128, 250, 452, seed + 1) + icicles(-6, 250, 359, seed + 2) + icicles(136, 246, 467, seed + 3);

const SNOW_TIERS: string[] = [
  snowCap('M26 208Q50 182 82 150Q116 182 140 208Q134 214 126 210Q118 216 108 211Q98 216 88 211Q78 216 66 210Q56 216 46 211Q36 216 26 208Z', 20, 146, 148, 184, 501) +
    drift(40, 126, 252, 502) + drift(-20, 250, 296, 503, SNOW, SNOWLINE, 5) + snowLedges(504),
  snowCap('M24 158L84 120L144 158L137 166H31Z', 20, 150, 118, 146, 511) +
    [0, 1, 2, 3, 4, 5].map((k) => drift(-22 + k * 48, 26 + k * 48, 240 + (k % 2 ? 0 : 16) - 3, 512 + k)).join('') + snowLedges(520),
  snowCap('M-30 190Q14 156 64 112Q118 156 168 190Z', -30, 168, 110, 154, 521) +
    snowCap(spireD(220, 208, 42, 128), 176, 264, 126, 172, 522) +
    drift(-26, 160, 186, 523) + drift(184, 256, 206, 524) + drift(146, 196, 210, 525) + snowLedges(530),
  snowCap(spireD(217, 158, 46, 108), 168, 266, 106, 132, 532) +
    snowMerlons(42, 128, 98, 15, 9, 526) + snowMerlons(-20, 164, 128, 15, 10, 533) + snowMerlons(176, 256, 158, 12, 7, 540) + drift(154, 222, 190, 546) + snowLedges(551),
  snowCap(spireD(100, 142, 66, 110), 30, 170, 108, 126, 561) +
    snowCap(spireD(217, 148, 48, 108), 166, 268, 106, 126, 562) +
    snowCap(spireD(52, 124, 22, 108), 28, 76, 106, 115, 564) + snowCap(spireD(150, 124, 22, 108), 126, 174, 106, 115, 565) +
    snowMerlons(-20, 174, 124, 15, 9, 566) + snowMerlons(176, 258, 146, 13, 7, 570) + drift(164, 216, 184, 576) + snowLedges(581),
];

/** Sand blown against the wall foot and settled on the ledges. Tier-independent: only the shared lower wall. */
function canyonWeather(): string {
  const R = rand(601);
  const SAND = '#d8a878';
  const grit = `M${[18, 44, 70, 96, 122, 236].map((x) => `${x} 356q-4 60 2 ${90 + (x % 7) * 8}`).join('M')}`;
  let piles = '';
  for (const [x, y, rx, ry] of [[-6, 624, 40, 18], [40, 632, 34, 12], [92, 634, 36, 11], [132, 632, 18, 9], [244, 632, 20, 8]]) piles += p(lump(x, y, rx, ry, R, 8), SAND);
  return (
    `<defs>${linear('d', 0, 1, [[0, SAND, 0], [1, SAND, 0.72]])}</defs>` +
    `<rect x="-20" y="510" width="160" height="134" fill="url(#d)" stroke="none"/>` +
    `<rect x="226" y="540" width="20" height="104" fill="url(#d)" stroke="none"/>` +
    hl(grit, SAND, 9, 0.28) +
    `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">${piles}</g>` +
    drift(-20, 256, 346, 602, SAND, '#8d4630', 5) +
    drift(128, 250, 452, 603, SAND, '#8d4630', 5)
  );
}

/** Damp stains, heavy moss and hanging weed. Tier-independent: only the shared lower wall. */
function marshWeather(): string {
  const R = rand(701);
  let hanging = '';
  for (let x = -8; x < 250; x += 20 + R() * 24) {
    const h = 9 + R() * 16;
    hanging += `M${fx(x)} 358q${fx(2 + R() * 2)} ${fx(h)} 5 ${fx(h)}q3 0 5 ${fx(-h)}Z`;
  }
  return (
    `<defs>${linear('w', 0, 1, [[0, '#23403a', 0], [1, '#23403a', 0.62]])}</defs>` +
    `<rect x="-20" y="480" width="158" height="164" fill="url(#w)" stroke="none"/>` +
    `<rect x="226" y="520" width="16" height="124" fill="url(#w)" stroke="none"/>` +
    hl('M20 362V470M64 362V440M118 362V480M196 478V444M238 364V450', '#23403a', 7, 0.26) +
    moss(34, 552, 36, 12, 702) + moss(104, 530, 26, 10, 703) + moss(60, 486, 20, 8, 704) +
    moss(22, 430, 18, 7, 705) + moss(128, 410, 12, 6, 706) + moss(236, 560, 9, 14, 707) +
    `<path d="${hanging}" fill="${LEAFD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    drift(-20, 256, 346, 708, LEAF, INK, 4) +
    drift(128, 250, 452, 709, LEAF, INK, 4)
  );
}

// ---------------------------------------------------------------------------------------------

const keep = (b: string): Art => art(300, 660, 0, 660, b);
const glow = (list: Win[]): Art => art(300, 660, 0, 660, windowsGlow(list));
/** Soft shadow of the weapon's own silhouette, cast down-right onto the wall behind it. */
const WALL_SHADOW =
  '<defs><filter id="ws" x="-15%" y="-15%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>' +
  '<feOffset in="b" dx="5" dy="6" result="o"/><feComponentTransfer in="o" result="a"><feFuncA type="linear" slope=".5"/></feComponentTransfer>' +
  '<feMerge><feMergeNode in="a"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
/** Drawn on a 120 grid, placed on a 140 canvas with the same centre so the cast shadow has room. */
const mount = (b: string): Art => centred(140, 140, `${WALL_SHADOW}<g transform="translate(10 10)" filter="url(#ws)">${b}</g>`);
const weather = (b: string): Art => art(300, 660, 0, 660, ink(b));
const eagle = (open: boolean): Art => art(520, 240, 20, 120, eagleHead(open));

export const CASTLE_ART: Record<string, Art> = {
  keep0: keep(tier0()),
  keep1: keep(tier1()),
  keep2: keep(tier2()),
  keep3: keep(tier3()),
  keep4: keep(tier4()),
  keepGlow0: glow(WINS0),
  keepGlow1: glow(WINS1),
  keepGlow2: glow(WINS2),
  keepGlow3: glow(WINS3),
  keepGlow4: glow(WINS4),
  keepShadow,
  keepWeather_snowpine_0: weather(SNOW_TIERS[0]),
  keepWeather_snowpine_1: weather(SNOW_TIERS[1]),
  keepWeather_snowpine_2: weather(SNOW_TIERS[2]),
  keepWeather_snowpine_3: weather(SNOW_TIERS[3]),
  keepWeather_snowpine_4: weather(SNOW_TIERS[4]),
  keepWeather_canyon: weather(canyonWeather()),
  keepWeather_marsh: weather(marshWeather()),
  keepGround_meadow: groundMeadow,
  keepGround_canyon: groundCanyon,
  keepGround_marsh: groundMarsh,
  keepGround_snowpine: groundSnow,
  foot_meadow: footMeadow,
  foot_canyon: footCanyon,
  foot_marsh: footMarsh,
  foot_snowpine: footSnow,
  mountBolterReady: mount(bolter(true)),
  mountBolterEmpty: mount(bolter(false)),
  mountMortarReady: mount(mortar(true)),
  mountMortarEmpty: mount(mortar(false)),
  mountFrostReady: mount(frost(true)),
  mountFrostEmpty: mount(frost(false)),
  mountBellowsReady: mount(bellows(true)),
  mountBellowsEmpty: mount(bellows(false)),
  mountStomperReady: mount(stomper(true)),
  mountStomperEmpty: mount(stomper(false)),
  mountCometReady: mount(shrine(true)),
  mountCometEmpty: mount(shrine(false)),
  mountWheelReady: mount(wheelRamp(true)),
  mountWheelEmpty: mount(wheelRamp(false)),
  potLedge,
  potRearBack,
  potRearFront,
  cheese,
  steam,
  hookChain,
  perchHook,
  eagleHeadOpen: eagle(true),
  eagleHeadShut: eagle(false),
};
