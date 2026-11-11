/**
 * Drawing kit of the keep: stonework, logs, boards, shingles, flags, windows and plants.
 * Every other file in this folder builds its pieces from these helpers; the light comes from the upper left.
 */
import { INK, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, GOLD, r, e, p, l, n, hl, LIGHT, DUSK, litPath, litRect, litBall, rivets, grain, crescentFast as crescent, tubeFast as litTube } from '../draw';
import { tone, linear as lin, linearAbs, radial as rad, glint } from '../shade';

// ---------------------------------------------------------------------------------------------
// Drawing kit
// ---------------------------------------------------------------------------------------------

export const VOID = '#17110c';
export const LEAF = '#5a8a4c';
export const LEAFD = '#3f6b45';

export function rand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fx = (v: number) => +v.toFixed(1);
export const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
let uid = 0;
export const clip = (d: string, inner: string) => {
  const id = `c${++uid}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
};
/** A thick line with an ink outline: beams, chains, stilts. */
const beam = (d: string, col: string, w: number) => l(d, w + 5) + hl(d, col, w);
/** The same beam, rounded by light: lit upper-left side, shadowed lower-right side. */
export const litTubeBeam = (d: string, col: string, w: number) => litTube(d, w, col, { outline: 2.5 });

/** Rope lashings binding a crossbeam to the posts. */
export function ropeLashes(xs: number[], y: number): string {
  const d = xs.map((x) => `M${x - 5} ${y - 7}l4 14M${x - 1} ${y - 7}l4 14M${x + 3} ${y - 7}l4 14`).join('');
  return hl(d, INK, 4.6) + hl(d, '#d9c08a', 2.4) + hl(d.replace(/l4 14/g, 'l2 7'), '#f3e2b4', 1, 0.7);
}

export const stops = (list: [number, string, number][]) =>
  list.map(([o, col, a]) => `<stop offset="${o}" stop-color="${col}" stop-opacity="${a}"/>`).join('');
export const linear = (id: string, x2: number, y2: number, list: [number, string, number][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
export const radial = (id: string, list: [number, string, number][]) => `<radialGradient id="${id}">${stops(list)}</radialGradient>`;

/** Gradients shared by the castle tiers. Shadows lean cool, like the rest of the game. */
export const SHADOW = '#221a2c';
export const SHADE_DEFS =
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
export function form(x: number, y: number, w: number, h: number, k = 1, round = false): string {
  const g = round
    ? linearAbs([[0, DUSK, 0.22 * k], [0.24, LIGHT, 0.2 * k], [0.42, LIGHT, 0], [0.66, DUSK, 0.12 * k], [1, DUSK, 0.6 * k]], x, 0, x + w, 0)
    : linearAbs([[0, LIGHT, 0.2 * k], [0.16, LIGHT, 0], [0.55, DUSK, 0], [1, DUSK, 0.48 * k]], x, 0, x + w, 0);
  return `<defs>${g.def}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${g.url}" stroke="none"/>`;
}

/** Light across a flat roof plane: bright at the upper left, falling into shade at the lower right. */
export function gableLight(x0: number, y0: number, x1: number, y1: number): string {
  const g = linearAbs([[0, LIGHT, 0.3], [0.4, LIGHT, 0], [0.62, DUSK, 0], [1, DUSK, 0.45]], x0, y0, x1, y1);
  return `<defs>${g.def}</defs><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${g.url}" stroke="none"/>`;
}

/** Thin warm light along an upper or left edge, so a form feels round. */
export const rim = (d: string, w = 2, o = 0.55) => hl(d, LIGHT, w, o);
export const shade = (id: 'sD' | 'sU' | 'sR' | 'sL', x: number, y: number, w: number, h: number, o = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;

/** A blobby closed shape around a centre: boulders, bushes, moss. */
export function lump(cx: number, cy: number, rx: number, ry: number, R: () => number, points = 8): string {
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
export function rock(cx: number, cy: number, rx: number, ry: number, f: string, hi: string, R: () => number): string {
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

export interface Stonework {
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
export function masonry(x0: number, y0: number, x1: number, y1: number, s: Stonework): string {
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
export function logs(x0: number, x1: number, top: (x: number, i: number) => number, bot: number, seed: number, o: LogOpts = {}): string {
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
export function boards(x: number, y: number, w: number, h: number, f: string, line: string, step: number, seed: number): string {
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
export function shingles(d: string, x0: number, y0: number, x1: number, y1: number, f: string, line: string, rowH = 12, scW = 14, over = ''): string {
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

export const spireD = (cx: number, baseY: number, half: number, tipY: number) => {
  const h = baseY - tipY;
  return `M${cx - half} ${baseY}Q${fx(cx - half * 0.32)} ${fx(baseY - h * 0.36)} ${cx} ${tipY}Q${fx(cx + half * 0.32)} ${fx(baseY - h * 0.36)} ${cx + half} ${baseY}Q${cx} ${baseY + 9} ${cx - half} ${baseY}Z`;
};

/** A witch-hat tower roof: tiles on a cone, lit on the left, shadowed on the right. */
export function spire(cx: number, baseY: number, half: number, tipY: number, f: string, line: string, finial: string, rowH = 11): string {
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
export function flag(x: number, base: number, top: number, len: number, f: string, trim: string): string {
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
export function emblem(cx: number, cy: number, s: number): string {
  return (
    `<g transform="translate(${cx} ${cy})scale(${s})" stroke-width="${fx(2.2 / s)}">` +
    p('M-13 8L13-9L13 8Z', MUSTL) +
    p('M-13 8L13-9L8-11L-14 3Z', CREAM) +
    n('M4 3a2.4 2.4 0 1 0 .1 0ZM-3 5a1.8 1.8 0 1 0 .1 0ZM9-1a1.6 1.6 0 1 0 .1 0Z', GOLD) +
    `</g>`
  );
}

/** A hanging cloth banner with a swallowtail. */
export function banner(x: number, y: number, w: number, h: number, f: string, dark: string, trim: string, device: string): string {
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
export function merlons(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0, i = 0; x < x1; x += w + gap, i++) {
    b += litRect(x, y, w, h, f, 2, { shadow: 3, light: 1.6 });
    if (i % 3 === 1) b += n(`M${x + w + 1} ${y - 1}h-5l5 4Z`, tone(f, -0.35));
  }
  return b;
}

export function corbels(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0; x < x1; x += w + gap) b += litPath(`M${x} ${y}H${x + w}V${y + h * 0.5}Q${x + w} ${y + h} ${x + w / 2} ${y + h}Q${x} ${y + h} ${x} ${y + h * 0.5}Z`, f, { shadow: 2.5, light: 1.2 });
  return b;
}

export interface Win {
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
export function windowsBody(list: Win[], frame: string): string {
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
export function windowsGlow(list: Win[]): string {
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
export function vine(x: number, y: number, height: number, sway: number, seed: number): string {
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

export function moss(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const R = rand(seed);
  let b = n(lump(cx, cy, rx, ry, R), LEAFD, 0.85) + n(lump(cx - rx * 0.1, cy - ry * 0.2, rx * 0.72, ry * 0.65, R), LEAF, 0.9);
  b += n(lump(cx - rx * 0.3, cy - ry * 0.45, rx * 0.35, ry * 0.25, R, 6), '#8fb86a', 0.7);
  for (let i = 0; i < 4; i++) b += n(lump(cx + (R() - 0.5) * rx * 1.6, cy + ry * 0.7, 5, 3, R, 6), LEAFD, 0.8);
  let dots = '';
  for (let i = 0; i < 5; i++) dots += `M${fx(cx + (R() - 0.5) * rx * 1.2)} ${fx(cy + (R() - 0.6) * ry)}h.01`;
  return b + hl(dots, '#b7d488', 1.6, 0.7);
}
