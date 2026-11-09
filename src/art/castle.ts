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
  GLOW, WHITE, GOLD, GOLDD, ink, r, c, e, p, l, n, hl, art, centred, starPoints,
} from './draw';

// ---------------------------------------------------------------------------------------------
// Drawing kit
// ---------------------------------------------------------------------------------------------

const VOID = '#17110c';
const WINDOW = '#2a2733';
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

const stops = (list: [number, string, number][]) =>
  list.map(([o, col, a]) => `<stop offset="${o}" stop-color="${col}" stop-opacity="${a}"/>`).join('');
const linear = (id: string, x2: number, y2: number, list: [number, string, number][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
const radial = (id: string, list: [number, string, number][]) => `<radialGradient id="${id}">${stops(list)}</radialGradient>`;

/** Gradients shared by the castle tiers. */
const SHADE_DEFS =
  `<defs>` +
  linear('sD', 0, 1, [[0, INK, 0], [1, INK, 0.6]]) +
  linear('sU', 0, 1, [[0, INK, 0.55], [1, INK, 0]]) +
  linear('sR', 1, 0, [[0, INK, 0], [1, INK, 0.5]]) +
  linear('sL', 1, 0, [[0, INK, 0.45], [1, INK, 0]]) +
  `</defs>`;
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

function rock(cx: number, cy: number, rx: number, ry: number, f: string, hi: string, R: () => number): string {
  return p(lump(cx, cy, rx, ry, R), f) + hl(`M${fx(cx - rx * 0.6)} ${fx(cy - ry * 0.25)}Q${fx(cx - rx * 0.2)} ${fx(cy - ry * 0.75)} ${fx(cx + rx * 0.3)} ${fx(cy - ry * 0.6)}`, hi, 2.5, 0.8);
}

interface Stonework {
  h: number;
  base: string;
  fills: string[];
  line: string;
  hi: string;
  seed: number;
}

/** Courses of slightly irregular stones filling a rectangle; clip it for any other outline. */
function masonry(x0: number, y0: number, x1: number, y1: number, s: Stonework): string {
  const R = rand(s.seed);
  let body = '';
  let hi = '';
  let dk = '';
  let y = y0;
  for (let row = 0; y < y1; row++) {
    const h = s.h + Math.round(R() * 6 - 3);
    let x = x0 - (row % 2 ? s.h * 1.2 : 0) - R() * 8;
    while (x < x1) {
      const w = Math.round(s.h * (1.15 + R() * 1.5));
      const f = s.fills[Math.floor(R() * s.fills.length)];
      body += `<rect x="${fx(x)}" y="${y}" width="${w}" height="${h - 1}" rx="${fx(3 + R() * 3)}" fill="${f}"/>`;
      if (R() < 0.4) hi += `M${fx(x + 4)} ${y + 3}h${w - 10}`;
      if (R() < 0.35) dk += `M${fx(x + w - 3)} ${y + 5}v${h - 10}`;
      x += w + 1;
    }
    y += h;
  }
  return (
    n(rect(x0 - 40, y0, x1 - x0 + 80, y1 - y0 + 12), s.base) +
    `<g stroke="${s.line}" stroke-width="1.8">${body}</g>` +
    hl(hi, s.hi, 2, 0.75) +
    hl(dk, s.line, 2, 0.35)
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
  let hi = '';
  let dk = '';
  let knots = '';
  let i = 0;
  for (let x = x0; x < x1; i++) {
    const w = Math.min(w0 + Math.round(R() * 6 - 3), x1 - x);
    if (w < 5) break;
    const t = top(x, i);
    const f = fills[Math.floor(R() * fills.length)];
    b += o.point
      ? p(`M${x} ${bot}L${x + 1} ${t + 11}L${x + w / 2} ${t}L${x + w - 1} ${t + 11}L${x + w} ${bot}Z`, f)
      : r(x, t, w, bot - t, f, 4);
    hi += `M${x + 5} ${t + 16}v${fx(16 + R() * 34)}`;
    dk += `M${x + w - 6} ${fx(t + 22 + R() * 30)}v${fx(14 + R() * 30)}`;
    if (R() < 0.35) knots += e(x + w / 2, fx(t + 40 + R() * Math.max(10, bot - t - 70)), 2.5, 4.5, WOODD);
    x += w;
  }
  return `<g stroke-width="2.5">${b}</g>` + hl(hi, WOODL, 2.5, 0.7) + hl(dk, WOODD, 2.5, 0.6) + `<g stroke="none">${knots}</g>`;
}

/** A board wall: flat fill with seams and nails. */
function boards(x: number, y: number, w: number, h: number, f: string, line: string, step: number, seed: number): string {
  const R = rand(seed);
  let seams = '';
  let nails = '';
  for (let sx = x + step; sx < x + w - 3; sx += step + Math.round(R() * 4 - 2)) {
    seams += `M${sx} ${y + 2}v${h - 4}`;
    if (R() < 0.7) nails += `M${sx - 4} ${y + 6}h.01M${sx - 4} ${y + h - 6}h.01`;
  }
  return r(x, y, w, h, f, 2) + hl(seams, line, 2) + hl(nails, INK, 2.5, 0.8);
}

/** Roof shingles clipped to the outline d. */
function shingles(d: string, x0: number, y0: number, x1: number, y1: number, f: string, line: string, rowH = 12, scW = 14): string {
  let rows = '';
  for (let y = y0 + rowH, i = 0; y < y1 + rowH; y += rowH, i++) {
    let m = `M${x0 - (i % 2 ? scW / 2 : 0)} ${y}`;
    for (let j = 0, cnt = Math.ceil((x1 - x0) / scW) + 2; j < cnt; j++) m += `q${scW / 2} ${fx(rowH * 0.7)} ${scW} 0`;
    rows += m;
  }
  return clip(d, n(rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4), f) + hl(rows, line, 2)) + l(d);
}

/** A witch-hat tower roof. */
function spire(cx: number, baseY: number, half: number, tipY: number, f: string, line: string, finial: string, rowH = 11): string {
  const h = baseY - tipY;
  const d = `M${cx - half} ${baseY}Q${fx(cx - half * 0.32)} ${fx(baseY - h * 0.36)} ${cx} ${tipY}Q${fx(cx + half * 0.32)} ${fx(baseY - h * 0.36)} ${cx + half} ${baseY}Q${cx} ${baseY + 9} ${cx - half} ${baseY}Z`;
  return (
    l(`M${cx} ${tipY}v-12`, 4) +
    shingles(d, cx - half, tipY, cx + half, baseY + 8, f, line, rowH, 13) +
    n(`M${cx - half + 7} ${baseY - 2}Q${fx(cx - half * 0.4)} ${fx(baseY - h * 0.4)} ${cx - 2} ${tipY + 8}Q${fx(cx - half * 0.25)} ${fx(baseY - h * 0.36)} ${cx - half * 0.35} ${baseY + 1}Z`, WHITE, 0.13) +
    c(cx, tipY - 13, 5.5, finial)
  );
}

/** A flag on a pole, waving right. */
function flag(x: number, base: number, top: number, len: number, f: string, trim: string): string {
  return (
    beam(`M${x} ${base}V${top}`, WOODD, 2.5) +
    c(x, top - 3, 4.5, MUSTL) +
    p(`M${x + 1} ${top + 2}Q${x + len * 0.3} ${top - 7} ${x + len * 0.55} ${top + 4}T${x + len} ${top + 2}L${x + len - 9} ${top + 13}L${x + len} ${top + 26}Q${x + len * 0.55} ${top + 21} ${x + len * 0.3} ${top + 29}T${x + 1} ${top + 26}Z`, f) +
    hl(`M${x + 6} ${top + 8}Q${x + len * 0.3} ${top + 3} ${x + len * 0.55} ${top + 10}`, trim, 2.5)
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
  return (
    beam(`M${x - 6} ${y}H${x + w + 6}`, WOODD, 3) +
    c(x - 7, y, 3.5, MUSTL) +
    c(x + w + 7, y, 3.5, MUSTL) +
    p(`M${x} ${y}H${x + w}V${y + h}L${x + w / 2} ${y + h - 16}L${x} ${y + h}Z`, f) +
    hl(`M${x + 5} ${y + 5}V${y + h - 9}M${x + w - 5} ${y + 5}V${y + h - 9}`, trim, 2.5) +
    hl(`M${x + w * 0.5} ${y + 8}V${y + h - 22}`, dark, 2.5, 0.35) +
    device
  );
}

function merlons(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0; x < x1; x += w + gap) b += r(x, y, w, h, f, 2);
  return b;
}

function corbels(x0: number, x1: number, y: number, h: number, w: number, gap: number, f: string): string {
  let b = '';
  for (let x = x0; x < x1; x += w + gap) b += p(`M${x} ${y}H${x + w}V${y + h * 0.5}Q${x + w} ${y + h} ${x + w / 2} ${y + h}Q${x} ${y + h} ${x} ${y + h * 0.5}Z`, f);
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

function windowsBody(list: Win[], frame: string): string {
  return list
    .map((v) => {
      const d = winShape(v);
      const cx = v.x + v.w / 2;
      const midY = v.y + v.h * 0.55;
      return (
        `<path d="${d}" fill="none" stroke-width="10"/>` +
        hl(d, frame, 4.5) +
        `<path d="${d}" fill="${WINDOW}" stroke-width="2"/>` +
        hl(`M${cx} ${v.y + 2}V${v.y + v.h - 1}M${v.x + 1} ${midY}H${v.x + v.w - 1}`, INK, 1.8, 0.85) +
        r(v.x - 4, v.y + v.h + 1, v.w + 8, 4.5, frame, 1.5)
      );
    })
    .join('');
}

function windowsGlow(list: Win[]): string {
  const defs = `<defs>${radial('g', [[0, '#ffb54a', 0.65], [0.55, '#ffa63a', 0.2], [1, '#ff9a30', 0]])}</defs>`;
  const halos = list.map((v) => e(v.x + v.w / 2, v.y + v.h / 2, v.w * 1.9, v.h * 1.3, 'url(#g)')).join('');
  const panes = list
    .map((v) => {
      const d = winShape(v);
      const cx = v.x + v.w / 2;
      return (
        n(d, '#ffc95c') +
        n(`M${cx - v.w * 0.28} ${v.y + v.h}C${cx - v.w * 0.3} ${v.y + v.h * 0.55} ${cx} ${v.y + v.h * 0.55} ${cx} ${v.y + v.h * 0.25}C${cx + 1} ${v.y + v.h * 0.55} ${cx + v.w * 0.3} ${v.y + v.h * 0.55} ${cx + v.w * 0.28} ${v.y + v.h}Z`, '#fff0bd') +
        hl(`M${cx} ${v.y}V${v.y + v.h}M${v.x} ${v.y + v.h * 0.55}H${v.x + v.w}`, '#6b3a1e', 1.8, 0.9)
      );
    })
    .join('');
  return defs + halos + panes;
}

/** A vine climbing from a foot point, with leaves. */
function vine(x: number, y: number, height: number, sway: number, seed: number): string {
  const R = rand(seed);
  let d = `M${x} ${y}`;
  let cx = x;
  let cy = y;
  let leaves = '';
  const step = 26;
  for (let t = 0, dir = 1; t < height; t += step, dir = -dir) {
    const nx = cx + dir * sway * (0.5 + R() * 0.6);
    const ny = cy - step;
    d += `Q${fx(cx + dir * sway)} ${cy - step / 2} ${fx(nx)} ${ny}`;
    for (const k of [0.35, 0.8]) {
      const ly = cy - step * k;
      const lx = cx + (nx - cx) * k;
      const side = R() < 0.5 ? -1 : 1;
      leaves += e(fx(lx + side * 6), fx(ly), 5.2, 3.4, R() < 0.5 ? LEAF : LEAFD);
    }
    cx = nx;
    cy = ny;
  }
  return beam(d, LEAFD, 2.5) + `<g stroke-width="1.6">${leaves}</g>`;
}

function moss(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const R = rand(seed);
  let b = n(lump(cx, cy, rx, ry, R), LEAFD, 0.85) + n(lump(cx - rx * 0.1, cy - ry * 0.2, rx * 0.72, ry * 0.65, R), LEAF, 0.9);
  for (let i = 0; i < 4; i++) b += n(lump(cx + (R() - 0.5) * rx * 1.6, cy + ry * 0.7, 5, 3, R, 6), LEAFD, 0.8);
  return b;
}

// ---------------------------------------------------------------------------------------------
// Parts every tier shares: the gate opening, the foundation, the slot furniture.
// ---------------------------------------------------------------------------------------------

/** Dark opening plus depth inside it. The leaf (`gate0..4`) is drawn over art x 151..225, y 490..640. */
const gateVoid =
  r(151, 486, 74, 158, VOID, 0) +
  n(rect(151, 486, 74, 22), '#000', 0.4) +
  n(rect(151, 486, 12, 158), '#000', 0.3);

/** The earthen and bouldered foot of the wall. Its lower edge never runs straight. */
function foundation(seed: number, fills: [string, string, string], hi: string, earth: string, earthD: string): string {
  const R = rand(seed);
  const apron =
    'M-20 590Q10 574 40 586T90 584T137 594L140 640Q118 648 100 638T60 642T20 636T-20 644Z' +
    'M239 592Q250 608 264 620Q276 634 288 640Q266 648 250 640T232 644L228 600Z';
  let rocks = '';
  const big: [number, number, number, number, number][] = [
    [-8, 612, 34, 22, 0], [40, 626, 30, 15, 1], [78, 620, 24, 16, 2], [118, 628, 28, 14, 0], [18, 596, 20, 11, 2],
    [64, 598, 17, 10, 1], [108, 600, 16, 10, 0], [132, 606, 10, 9, 2], [242, 618, 16, 12, 1], [262, 632, 14, 9, 2], [282, 639, 8, 5, 0],
  ];
  for (const [x, y, rx, ry, k] of big) rocks += rock(x, y, rx, ry, fills[k], hi, R);
  return (
    `<g stroke-width="3">${p(apron, earth)}</g>` +
    clip(apron, shade('sD', -20, 590, 320, 56, 0.55) + hl('M-10 604Q40 596 80 606T140 606M236 610Q256 620 276 636', earthD, 3, 0.55)) +
    `<g stroke-width="2.8">${rocks}</g>`
  );
}

/** Soft darkening that seats the wall on its foundation. */
const footShade = shade('sD', -14, 548, 154, 50, 0.75) + shade('sD', 228, 560, 16, 40, 0.5);

/** The low hatch the wheel rolls out of. */
function sallyPort(frame: string, frameD: string): string {
  const d = 'M58 628V584Q58 556 92 556Q126 556 126 584V628Z';
  return (
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    hl('M52 596Q52 552 92 551', frameD, 2.5, 0.45) +
    `<path d="${d}" fill="${VOID}" stroke-width="2.5"/>` +
    hl('M72 562V628M92 558V628M112 562V628', '#3a2c20', 4) +
    hl('M60 590H124', '#3a2c20', 4)
  );
}

/** The alcove behind the shrine slot, so the empty slot looks intended. */
function alcove(frame: string, dark: string, line: string): string {
  const d = 'M46 346V292Q46 252 86 252Q126 252 126 292V346Z';
  return (
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    `<path d="${d}" fill="${dark}" stroke-width="2.5"/>` +
    shade('sD', 46, 290, 80, 56, 0.6) +
    hl('M56 346V296Q56 264 86 262', line, 2.5, 0.5)
  );
}

/** The dark shaft the stomper drops through. */
function hoistBay(frame: string, line: string): string {
  return (
    r(52, 372, 68, 84, frame, 4) +
    `<g stroke-width="2.5">${boards(60, 380, 52, 68, '#5a3e24', '#3f2b18', 13, 90)}</g>` +
    hl('M60 414H112', IRON, 5) +
    hl('M60 414H112', line, 1.5, 0.5) +
    shade('sU', 60, 380, 52, 28, 0.6)
  );
}

/** The ledge above the gate that carries the gate weapon. */
function gateBrow(f: string, hi: string, trim = ''): string {
  return (
    r(128, 452, 122, 15, f, 4) +
    hl('M134 457H244', hi, 3) +
    (trim ? hl('M132 464H246', trim, 2.5) : '') +
    corbels(132, 244, 467, 9, 12, 12, f)
  );
}

/** The walkway at art y=346 that carries the shrine and the crossbow. */
function deck(x1: number, f: string, hi: string, dark: string, trim = ''): string {
  return (
    r(-20, 346, x1 + 20, 13, f, 3) +
    hl(`M-10 350H${x1 - 6}`, hi, 3) +
    (trim ? hl(`M-10 357H${x1 - 6}`, trim, 2.5) : '') +
    corbels(-12, x1 - 12, 359, 12, 14, 18, dark)
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
      beam('M50 360L56 244', WOODD, 8) + beam('M116 360L110 244', WOODD, 8) +
        flag(83, 158, 122, 30, RUST, MUSTL) +
        boards(46, 196, 74, 56, WOOD, WOODD, 15, 3) +
        shade('sR', 88, 196, 32, 56, 0.6) +
        windowsBody(WINS0, WOODL) +
        beam('M40 252H126', WOODD, 5) +
        p(thatch, '#b7924e') +
        hl(straw, '#8a6a34', 2.5) +
        hl('M34 203Q64 184 82 164', '#d9b873', 3, 0.8) +
        // Palisade above the walkway.
        logs(-22, 252, top, 352, 11, { point: true }) +
        shade('sD', -20, 310, 272, 36, 0.5) +
        beam('M-20 296H250', WOODD, 4) +
        // Lower wall.
        logs(-22, 138, () => 352, 628, 12) +
        logs(136, 244, () => 352, 478, 13, { w: 20 }) +
        shade('sR', 190, 360, 54, 112, 0.5) +
        shade('sU', -14, 359, 258, 26, 0.6) +
        beam('M-20 418H136', WOODD, 5) +
        beam('M-20 528H136', WOODD, 5) +
        l('M20 410V428M24 410V428M28 410V428M108 410V428M112 410V428M116 410V428M20 520V538M24 520V538M28 520V538M108 520V538M112 520V538', 3, CREAM) +
        hoistBay(WOOD, WOODD) +
        sallyPort(WOOD, WOODD) +
        footShade +
        foundation(21, ['#8d7d63', '#7a6c58', '#a29474'], '#bcae8c', '#7b6245', '#5a4630') +
        moss(30, 588, 22, 9, 1) +
        moss(112, 592, 14, 6, 2) +
        vine(16, 590, 110, 7, 5) +
        // Gate frame: two huge posts and a lintel.
        gateVoid +
        beam('M144 478V640', WOODD, 9) +
        beam('M232 478V640', WOODD, 9) +
        hl('M141 490V632M229 490V632', WOODL, 2.5, 0.7) +
        r(128, 468, 120, 22, WOOD, 5) +
        hl('M134 474H240', WOODL, 3) +
        hl('M136 484H200', WOODD, 2.5, 0.7) +
        e(130, 479, 8, 11, WOODL) +
        e(247, 479, 8, 11, WOODL) +
        hl('M127 479a3 5 0 1 0 6 0M244 479a3 5 0 1 0 6 0', WOODD, 2) +
        gateBrow(WOODD, WOOD) +
        deck(256, WOODL, '#d6ad78', WOOD) +
        // Hand-made touches: a lantern and a rope coil.
        beam('M124 500H136', WOODD, 3) +
        l('M124 503V510', 2) +
        r(118, 510, 12, 16, MUSTL, 3) +
        l('M124 510V526M118 518H130', 2) +
        p(lump(44, 559, 13, 9, R), '#c9a66a') +
        hl('M34 556Q44 550 54 556M34 561Q44 555 54 561', '#8a6a34', 2),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 1: timber on a stone footing, bound with iron.
// ---------------------------------------------------------------------------------------------

const ROUGH: Omit<Stonework, 'seed'> = { h: 24, base: '#6a6458', fills: [STONE, STONED, '#8a8476', '#a59f8f'], line: '#4e4a41', hi: STONEL };

const WINS1: Win[] = [{ x: 58, y: 174, w: 20, h: 28 }, { x: 96, y: 174, w: 20, h: 28 }];

function ironBand(x0: number, x1: number, y: number, h = 11): string {
  let rivets = '';
  for (let x = x0 + 12; x < x1; x += 24) rivets += `M${x} ${y + h / 2}h.01`;
  return r(x0, y, x1 - x0, h, IRON, 2) + hl(`M${x0 + 3} ${y + 3}H${x1 - 3}`, IRONL, 2, 0.9) + hl(rivets, '#20242a', 4);
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
      flag(84, 128, 90, 34, RUST, MUSTL) +
        // Square timber tower.
        boards(36, 152, 96, 110, '#8b5e34', WOODD, 16, 6) +
        shade('sR', 92, 152, 40, 110, 0.55) +
        ironBand(36, 132, 212, 10) +
        l('M36 154V258M132 154V258', 9) +
        hl('M36 154V258M132 154V258', IRON, 4) +
        windowsBody(WINS1.slice(0, 2), WOODL) +
        p(roofD, WOODL) +
        clip(roofD, hl('M40 158L84 126M56 166L92 128M72 166L104 134M90 166L118 140M108 166L130 150M40 152L60 166M56 140L90 166M70 132L112 166M92 128L136 164', WOOD, 2.5)) +
        hl('M30 160L84 126L138 160', '#d6ad78', 3) +
        // Board parapet with iron caps.
        logs(-22, 254, top, 352, 24, { w: 24, fills: ['#8b5e34', WOOD, '#a5733f'] }) +
        caps +
        shade('sD', -20, 300, 274, 46, 0.5) +
        ironBand(-20, 254, 300, 11) +
        // Timber lower wall with bands.
        boards(-20, 352, 158, 170, WOOD, WOODD, 19, 7) +
        boards(136, 352, 108, 126, '#8b5e34', WOODD, 19, 8) +
        shade('sR', 196, 360, 48, 112, 0.5) +
        shade('sU', -14, 359, 258, 28, 0.6) +
        ironBand(-20, 136, 380, 11) +
        ironBand(-20, 136, 470, 11) +
        ironBand(136, 244, 430, 11) +
        // Stone footing with an uneven top.
        clip(footingTop, masonry(-20, 494, 140, 640, { ...ROUGH, seed: 33 })) +
        `<path d="${footingTop}" fill="none"/>` +
        hoistBay(WOODD, WOOD) +
        sallyPort(STONEL, STONED) +
        footShade +
        foundation(31, [STONED, STONE, '#837c6d'], STONEL, '#7a6c58', '#5a4f40') +
        moss(32, 590, 26, 10, 3) +
        moss(74, 503, 18, 7, 4) +
        vine(22, 592, 150, 7, 6) +
        vine(118, 595, 60, 5, 8) +
        gateVoid +
        // Stone jambs with timber lintel and iron straps.
        r(137, 480, 14, 164, STONEL, 3) +
        r(225, 480, 14, 164, STONE, 3) +
        l('M137 512H151M137 546H151M137 582H151M137 616H151M225 512H239M225 546H239M225 582H239M225 616H239', 2.5) +
        r(128, 468, 120, 22, WOODD, 4) +
        hl('M134 474H240', WOOD, 3) +
        r(144, 466, 14, 26, IRON, 2) +
        r(218, 466, 14, 26, IRON, 2) +
        hl('M151 472h.01M151 485h.01M225 472h.01M225 485h.01', '#20242a', 4) +
        gateBrow(IRON, IRONL) +
        deck(256, WOODL, '#d6ad78', IRON),
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
  { x: 209, y: 238, w: 18, h: 30, arch: true },
];

function tier2(): string {
  const bodyD = 'M-20 186H158V352H-20Z';
  const turretD = 'M190 212H250V352H190Z';
  const gableD = 'M-30 190Q14 152 64 100Q118 152 168 190Z';
  return (
    SHADE_DEFS +
    ink(
      // Rear curtain wall between keep and turret.
      r(150, 266, 42, 86, STONE, 2) +
      merlons(152, 186, 252, 16, 11, 7, STONEL) +
        // Main keep.
        clip(bodyD, masonry(-20, 186, 158, 352, { ...ASHLAR, seed: 41 })) +
        `<path d="${bodyD}" fill="none"/>` +
        shade('sR', 118, 188, 40, 164, 0.45) +
        shade('sU', -20, 188, 178, 22, 0.6) +
        windowsBody(WINS2.slice(0, 2), STONEL) +
        flag(64, 104, 66, 36, RUST, MUSTL) +
        shingles(gableD, -30, 100, 168, 194, RUST, RUSTD, 12, 15) +
        hl('M-12 182Q18 152 62 110', '#d97a52', 3.5, 0.8) +
        r(-26, 186, 186, 9, WOODD, 3) +
        banner(80, 197, 28, 52, TEAL, TEALD, MUSTL, emblem(94, 221, 0.72)) +
        alcove(STONEL, '#7b7566', '#6a6559') +
        // Right turret.
        clip(turretD, masonry(190, 208, 250, 352, { ...ASHLAR, seed: 42 })) +
        `<path d="${turretD}" fill="none"/>` +
        shade('sR', 224, 212, 26, 140, 0.6) +
        windowsBody(WINS2.slice(2, 3), STONEL) +
        spire(220, 208, 42, 128, RUST, RUSTD, MUSTL) +
        r(184, 206, 72, 9, WOODD, 3) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...ASHLAR, seed: 43 })) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...ASHLAR, seed: 44 })) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sR', 200, 360, 44, 112, 0.5) +
        shade('sU', -14, 359, 258, 28, 0.6) +
        hoistBay(STONED, STONEL) +
        sallyPort(STONEL, STONED) +
        footShade +
        foundation(51, [STONED, STONE, '#837c6d'], STONEL, '#756a58', '#574d40') +
        moss(26, 590, 26, 10, 5) +
        moss(70, 596, 18, 7, 6) +
        moss(130, 470, 12, 6, 7) +
        vine(12, 594, 200, 7, 9) +
        vine(128, 596, 70, 5, 10) +
        gateVoid +
        // Stone gate arch.
        archGate(STONEL, STONE, STONED, RUST) +
        gateBrow(STONE, STONEL) +
        deck(256, STONEL, '#d6d0bd', STONE),
    )
  );
}

/** Segmental voussoir arch and jamb quoins over the opening. */
function archGate(light: string, mid: string, dark: string, stoneKey: string): string {
  const jamb = (x: number) =>
    [0, 1, 2, 3, 4].map((i) => r(x, 494 + i * 30, 14, 30, i % 2 ? mid : light, 3)).join('');
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
    stones += p(`M${pts}Z`, i === 4 ? stoneKey : i % 2 ? mid : light);
  }
  return (
    jamb(137) +
    jamb(225) +
    `<g stroke-width="2.5">${p(tymp, dark)}</g>` +
    `<g stroke-width="2.5">${stones}</g>` +
    r(133, 490, 22, 8, light, 2) +
    r(221, 490, 22, 8, light, 2)
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 3: a taller slate keep, an extra tower, runes and more banners.
// ---------------------------------------------------------------------------------------------

const SLATE: Omit<Stonework, 'seed'> = { h: 22, base: '#5b6271', fills: ['#8d95a3', '#7c8493', '#9aa2af', '#868e9c'], line: '#4a5160', hi: '#bcc3cd' };
const RUNE = '#3fd6c4';
const WINS3: Win[] = [
  { x: 62, y: 106, w: 20, h: 28, arch: true },
  { x: 92, y: 106, w: 20, h: 28, arch: true },
  { x: 52, y: 176, w: 22, h: 46, arch: true },
  { x: 118, y: 176, w: 22, h: 46, arch: true },
  { x: 240, y: 206, w: 22, h: 40, arch: true },
  { x: 240, y: 324, w: 22, h: 40, arch: true },
];

const runeLine = (d: string) => hl(d, RUNE, 8, 0.25) + hl(d, RUNE, 3.5, 0.75) + hl(d, GLOW, 1.8);

function tier3(): string {
  const keepD = 'M-20 146H166V352H-20Z';
  const upperD = 'M34 92H138V150H34Z';
  const towerD = 'M212 174H288V440Q270 470 250 474Q226 470 212 440Z';
  return (
    SHADE_DEFS +
    ink(
      // Rear curtain wall.
      r(158, 262, 60, 90, '#7c8493', 2) +
      merlons(160, 212, 247, 17, 11, 7, '#9aa2af') +
        // Keep top storey.
        flag(86, 64, 30, 40, TEAL, MUSTL) +
        clip(upperD, masonry(34, 92, 138, 154, { ...SLATE, seed: 61 })) +
        `<path d="${upperD}" fill="none"/>` +
        shade('sR', 106, 94, 32, 56, 0.45) +
        windowsBody(WINS3.slice(0, 2), '#bcc3cd') +
        spire(86, 92, 60, 58, TEALD, '#163f42', MUSTL, 10) +
        // Main keep.
        clip(keepD, masonry(-20, 146, 166, 352, { ...SLATE, seed: 62 })) +
        `<path d="${keepD}" fill="none"/>` +
        shade('sR', 128, 148, 38, 204, 0.45) +
        merlons(-20, 164, 128, 20, 15, 10, '#9aa2af') +
        shade('sU', -20, 148, 186, 16, 0.55) +
        windowsBody(WINS3.slice(2, 4), '#bcc3cd') +
        banner(80, 160, 30, 80, RUST, RUSTD, MUSTL, emblem(95, 196, 0.9)) +
        runeLine('M46 300V330M38 310L54 322M54 310L38 322') +
        alcove('#bcc3cd', '#5b6271', '#4a5160') +
        runeLine('M70 262L86 256L102 262') +
        // The extra tower, corbelled out over the road.
        clip(towerD, masonry(208, 170, 292, 476, { ...SLATE, seed: 63 })) +
        `<path d="${towerD}" fill="none"/>` +
        clip(towerD, shade('sR', 258, 176, 30, 300, 0.55) + shade('sD', 212, 410, 76, 64, 0.7)) +
        r(213, 412, 74, 10, '#9aa2af', 2) +
        corbels(214, 280, 422, 10, 12, 12, '#7c8493') +
        windowsBody(WINS3.slice(4, 6), '#bcc3cd') +
        merlons(206, 288, 158, 18, 12, 7, '#9aa2af') +
        spire(250, 158, 50, 96, TEALD, '#163f42', MUSTL) +
        banner(226, 262, 20, 50, TEAL, TEALD, MUSTL, emblem(236, 284, 0.55)) +
        banner(236, 376, 24, 54, RUST, RUSTD, MUSTL, emblem(248, 398, 0.62)) +
        flag(250, 86, 54, 34, RUST, MUSTL) +
        runeLine('M224 214V240M216 222L232 234M232 222L216 234') +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...SLATE, seed: 64 })) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...SLATE, seed: 65 })) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sR', 200, 360, 44, 112, 0.5) +
        shade('sU', -14, 359, 258, 28, 0.6) +
        runeLine('M130 400V440M122 412L138 424') +
        hoistBay('#7c8493', '#bcc3cd') +
        sallyPort('#bcc3cd', '#7c8493') +
        footShade +
        foundation(71, ['#6f7787', '#7c8493', '#5f6878'], '#bcc3cd', '#6b6a68', '#4d4e50') +
        moss(30, 590, 26, 10, 11) +
        moss(66, 594, 14, 6, 12) +
        vine(20, 594, 240, 6, 13) +
        gateVoid +
        archGate('#bcc3cd', '#9aa2af', '#6f7787', TEAL) +
        runeLine('M188 470V486M180 478H196') +
        gateBrow('#7c8493', '#bcc3cd', MUST) +
        deck(256, '#9aa2af', '#c6ccd5', '#7c8493', MUST),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 4: a magnificent white-and-gold fortress.
// ---------------------------------------------------------------------------------------------

const MARBLE: Omit<Stonework, 'seed'> = { h: 24, base: '#d1c9b6', fills: ['#f6f1e6', '#ece6d6', '#f2ecdd', '#e4ddcb'], line: '#bdb29a', hi: WHITE };
const WINS4: Win[] = [
  { x: 72, y: 136, w: 28, h: 62, arch: true },
  { x: 140, y: 150, w: 18, h: 46, arch: true },
  { x: 239, y: 160, w: 22, h: 46, arch: true },
  { x: 239, y: 292, w: 22, h: 46, arch: true },
];
const GOLDEN = MUST;

/** Gold string course with little studs. */
function goldBand(x0: number, x1: number, y: number): string {
  let studs = '';
  for (let x = x0 + 10; x < x1; x += 20) studs += `M${x} ${y + 4}h.01`;
  return r(x0, y, x1 - x0, 8, GOLDEN, 2) + hl(`M${x0 + 3} ${y + 2.5}H${x1 - 3}`, MUSTL, 2) + hl(studs, GOLDD, 3);
}

function pilaster(x: number, y0: number, y1: number): string {
  return r(x, y0, 12, y1 - y0, '#f6f1e6', 2) + hl(`M${x + 4} ${y0 + 6}V${y1 - 6}`, '#cfc5ae', 2) + r(x - 3, y0 - 6, 18, 7, GOLDEN, 2) + r(x - 3, y1 - 1, 18, 7, GOLDEN, 2);
}

/** A carved relief of small blind arches. */
function arcade(x0: number, x1: number, y0: number, y1: number): string {
  let d = '';
  const w = 17;
  for (let x = x0; x + w <= x1; x += w + 4) d += `M${x} ${y1}V${y0 + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y0 + w / 2}V${y1}`;
  return hl(d, '#b9ae96', 4.5) + hl(d, '#fffaf0', 2) + hl(`M${x0 - 3} ${y1 + 1}H${x1 + 3}`, GOLDEN, 3);
}

function goldStuds(x0: number, x1: number, y: number, step: number): string {
  let d = '';
  for (let x = x0; x < x1; x += step) d += `M${x} ${y}h.01`;
  return hl(d, GOLDD, 7) + hl(d, MUSTL, 4.5);
}

function tier4(): string {
  const keepD = 'M-20 118H176V352H-20Z';
  const towerD = 'M206 138H294V438Q274 472 250 476Q226 472 206 438Z';
  return (
    SHADE_DEFS +
    ink(
      // Rear gallery with a slim back spire.
      r(168, 252, 44, 100, '#e4ddcb', 2) +
      merlons(170, 208, 238, 16, 10, 6, '#f6f1e6') +
        spire(192, 240, 19, 148, TEAL, TEALD, MUSTL, 9) +
        // Main spire behind the keep crown.
        flag(100, 46, 16, 36, RUST, MUSTL) +
        spire(100, 112, 74, 46, TEAL, TEALD, MUSTL) +
        // Main keep body.
        clip(keepD, masonry(-20, 118, 176, 352, { ...MARBLE, seed: 82 })) +
        `<path d="${keepD}" fill="none"/>` +
        shade('sR', 140, 120, 36, 232, 0.28) +
        shade('sU', -20, 122, 196, 14, 0.4) +
        goldBand(-20, 176, 114) +
        merlons(-20, 174, 96, 18, 15, 9, '#f6f1e6') +
        goldStuds(-12, 170, 93, 24) +
        // Great arched window with gold tracery and banners either side.
        windowsBody(WINS4.slice(0, 2), GOLDEN) +
        p(starPoints(86, 217, 12, 6, 8), MUSTL) +
        banner(46, 142, 16, 84, RUST, RUSTD, MUSTL, emblem(54, 174, 0.5)) +
        banner(110, 142, 16, 84, RUST, RUSTD, MUSTL, emblem(118, 174, 0.5)) +
        goldBand(-20, 176, 236) +
        pilaster(160, 128, 340) +
        alcove('#f6f1e6', '#d9d1bf', '#bdb29a') +
        hl('M46 296Q46 252 86 252Q126 252 126 296', GOLDEN, 3) +
        // The tall tower, corbelled out above the gate.
        clip(towerD, masonry(204, 134, 296, 478, { ...MARBLE, seed: 83 })) +
        `<path d="${towerD}" fill="none"/>` +
        clip(towerD, shade('sR', 262, 138, 32, 340, 0.3) + shade('sD', 206, 400, 88, 76, 0.5)) +
        goldBand(204, 296, 134) +
        merlons(202, 292, 116, 18, 13, 7, '#f6f1e6') +
        goldStuds(208, 292, 113, 20) +
        spire(250, 118, 54, 56, TEAL, TEALD, MUSTL) +
        windowsBody(WINS4.slice(2, 4), GOLDEN) +
        goldBand(204, 296, 256) +
        banner(222, 214, 16, 36, RUST, RUSTD, MUSTL, emblem(230, 232, 0.4)) +
        banner(262, 214, 16, 36, RUST, RUSTD, MUSTL, emblem(270, 232, 0.4)) +
        flag(250, 62, 30, 34, TEAL, MUSTL) +
        arcade(214, 288, 354, 392) +
        c(250, 422, 13, GOLDEN) +
        hl('M250 411V433M239 422H261', GOLDD, 2.5) +
        goldBand(204, 296, 410) +
        corbels(212, 284, 418, 12, 12, 12, '#ece6d6') +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...MARBLE, seed: 84 })) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...MARBLE, seed: 85 })) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sR', 200, 360, 44, 112, 0.28) +
        shade('sU', -14, 359, 258, 26, 0.45) +
        goldBand(-20, 136, 470) +
        pilaster(14, 376, 462) +
        pilaster(124, 376, 462) +
        arcade(-8, 12, 480, 540) +
        arcade(32, 134, 482, 540) +
        hoistBay('#ece6d6', GOLDEN) +
        sallyPort(GOLDEN, GOLDD) +
        footShade +
        foundation(91, ['#d9d1bf', '#c5bca7', '#ece6d6'], WHITE, '#857a66', '#5e5647') +
        moss(30, 592, 22, 8, 21) +
        vine(16, 594, 120, 6, 22) +
        gateVoid +
        archGate('#f6f1e6', MUSTL, '#c5bca7', RUST) +
        c(188, 478, 7, MUSTL) +
        gateBrow(GOLDEN, MUSTL, GOLDD) +
        deck(256, '#f6f1e6', WHITE, GOLDEN, GOLDEN),
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
  `<defs><radialGradient id="a" cx=".5" cy=".5" r=".5">${stops([[0, '#1a120a', 0.5], [0.6, '#1a120a', 0.3], [1, '#1a120a', 0]])}</radialGradient>` +
    linear('b', 1, 0, [[0, '#1a120a', 0.5], [0.55, '#1a120a', 0.35], [1, '#1a120a', 0]]) +
    `</defs>` +
    `<ellipse cx="160" cy="76" rx="200" ry="34" fill="url(#a)"/>` +
    `<path d="M0 44Q200 34 400 58Q500 70 556 82Q470 106 330 106Q120 106 0 100Z" fill="url(#b)"/>`,
);

// ---------------------------------------------------------------------------------------------
// Landscape dressing in front of the castle's foot
// ---------------------------------------------------------------------------------------------

/** Foot art is 460x130, placed bottom-left at world (-40, 690), so world = art + (-40, 560). */
const EDGE_D = 'C150 76 162 90 188 100C220 112 268 114 320 122C350 126 384 127 402 131';
const BANK_D = `M-8 34Q20 54 46 52T100 58T150 60${EDGE_D}V136H-8Z`;
const BANK_LINE = `M-8 34Q20 54 46 52T100 58T150 60${EDGE_D}`;

interface FootStyle {
  base: string;
  edge: string;
  extra: string;
}

function footBase(s: FootStyle): string {
  return n(BANK_D, s.base) + hl(BANK_LINE, s.edge, 3.5) + s.extra;
}

function bladeTuft(x: number, y: number, h: number): string {
  return `M${x} ${y}q-3 ${-h * 0.6} -8 ${-h * 0.9}M${x} ${y}v${-h}M${x} ${y}q3 ${-h * 0.6} 8 ${-h * 0.9}`;
}

function tufts(list: [number, number, number][], col: string, dark: string): string {
  const d = list.map(([x, y, h]) => bladeTuft(x, y, h)).join('');
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` + `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>` + hl(d, dark, 1, 0.3);
}

function bush(cx: number, cy: number, rx: number, ry: number, f: string, hi: string, seed: number): string {
  const R = rand(seed);
  return p(lump(cx, cy, rx, ry, R, 9), f) + n(lump(cx - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.5, R, 7), hi, 0.9);
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
        footBase({ base: '#7fa352', edge: INK, extra: '' }) +
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
        tufts([[232, 40, 8], [258, 44, 9]], '#4f7f4e', '#2f5a3a') +
        `<g stroke-width="2">` +
        [[30, 82, CREAM], [74, 104, MUSTL], [106, 112, CREAM], [46, 118, RUST], [136, 96, MUSTL], [8, 114, CREAM], [168, 116, CREAM], [226, 118, MUSTL]]
          .map(([x, y, f]) => c(x as number, y as number, 3.6, f as string))
          .join('') +
        `</g>`
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
        footBase({ base: '#c97d4e', edge: INK, extra: hl('M20 92Q60 82 90 96M50 120Q80 110 120 114M150 112Q180 106 214 118', '#a35a38', 3, 0.7) }) +
        `<g stroke-width="2.8">` +
        rock(10, 62, 34, 26, '#a04e33', '#c47a55', R) +
        rock(58, 76, 24, 18, '#8d4630', '#c47a55', R) +
        rock(102, 72, 18, 12, '#b0603f', '#d99a70', R) +
        rock(138, 82, 15, 9, '#8d4630', '#c47a55', R) +
        rock(30, 106, 18, 11, '#9a5136', '#c47a55', R) +
        rock(78, 112, 13, 8, '#b0603f', '#d99a70', R) +
        rock(164, 100, 11, 6, '#9a5136', '#c47a55', R) +
        rock(204, 112, 9, 5, '#8d4630', '#c47a55', R) +
        rock(248, 41, 9, 4, '#9a5136', '#c47a55', R) +
        rock(292, 123, 8, 4, '#8d4630', '#c47a55', R) +
        `</g>` +
        tufts([[36, 62, 20], [120, 70, 15], [106, 104, 14], [18, 120, 15], [150, 112, 12], [232, 124, 12]], '#8a8236', '#55511f')
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
        footBase({ base: '#5d6a43', edge: INK, extra: '' }) +
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
        tufts([[236, 42, 7], [262, 44, 8]], '#46633e', '#2a3f28') +
        `<g stroke-width="2">${e(106, 118, 14, 4, '#4f7f55')}</g>`
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
      n(`${line}V136H-8Z`, '#dde7f4') +
        n('M0 28Q40 44 96 50Q130 54 150 66Q112 58 60 56Q24 54 0 44Z', WHITE, 0.95) +
        hl(line, '#1a2740', 3.5) +
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
        tufts([[140, 72, 10], [214, 116, 10], [268, 124, 9]], '#22405f', '#142a42'),
    );
  })(),
);

// ---------------------------------------------------------------------------------------------
// Mounted weapons, 120x120 art centred on their slots
// ---------------------------------------------------------------------------------------------

const haloDefs = (id: string, col: string, inner: number) => `<defs>${radial(id, [[0, col, inner], [0.5, col, inner * 0.45], [1, col, 0]])}</defs>`;

/** Timber plank bolted to the wall, with two iron straps. */
function plank(y: number): string {
  return (
    r(26, y, 68, 11, WOOD, 3) +
    hl(`M31 ${y + 3}H89`, WOODL, 2) +
    r(38, y - 4, 9, 19, IRON, 2) +
    r(73, y - 4, 9, 19, IRON, 2) +
    hl(`M42.5 ${y}h.01M42.5 ${y + 11}h.01M77.5 ${y}h.01M77.5 ${y + 11}h.01`, '#20242a', 3.5)
  );
}

function bolter(ready: boolean): string {
  const stringD = ready ? 'M72 12L38 49L72 86' : 'M72 12Q84 34 80 50Q74 66 72 86';
  return ink(
    beam('M58 100V58', WOODD, 8) +
      plank(102) +
      c(58, 58, 8, IRONL) +
      p('M26 44H96Q102 49 96 55H26Q22 49 26 44Z', ready ? WOOD : '#7f5b37') +
      hl('M32 47H90', ready ? WOODL : '#9a7a53', 2.5) +
      l('M72 12Q102 48 72 86', 12) +
      hl('M72 12Q102 48 72 86', ready ? WOODL : '#8c6b45', 6.5) +
      r(66, 6, 12, 12, IRON, 3) +
      r(66, 80, 12, 12, IRON, 3) +
      (ready
        ? hl(stringD, INK, 5) + hl(stringD, CREAM, 2.5)
        : hl(stringD, INK, 4.5) + hl(stringD, '#8f8672', 2)) +
      (ready
        ? r(34, 45, 68, 8, WOODL, 2) +
          p('M102 40L119 49L102 58Z', IRONL) +
          hl('M104 44L114 49', WHITE, 2) +
          p('M44 41L32 49L44 57Z', RUST)
        : hl('M42 49H70', INK, 2.5, 0.5)),
  );
}

function mortar(ready: boolean): string {
  const metal = ready ? IRON : '#5d6066';
  const light = ready ? IRONL : '#8a8d92';
  const defs = ready ? haloDefs('h', '#ff9a30', 0.9) : '';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="74" cy="32" rx="40" ry="34" fill="url(#h)" stroke="none"/>` : '') +
        p('M16 76H104L110 96H10Z', WOOD) +
        hl('M18 80H102', WOODL, 2.5) +
        c(30, 96, 9, WOODD) +
        c(90, 96, 9, WOODD) +
        hl('M30 96h.01M90 96h.01', IRON, 5) +
        `<g transform="rotate(-38 60 62)">` +
        p('M36 92L30 40Q30 30 60 30Q90 30 90 40L84 92Q60 100 36 92Z', metal) +
        hl('M38 84L34 42', light, 3) +
        p('M24 40Q60 22 96 40Q96 48 90 48Q60 38 30 48Q24 48 24 40Z', light) +
        r(30, 66, 60, 8, RUST, 2) +
        (ready
          ? `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#ffb347" stroke-width="2.5"/><ellipse cx="60" cy="35" rx="16" ry="4.5" fill="#fff0bd" stroke="none"/>`
          : `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#2d2a2a" stroke-width="2.5"/>`) +
        `</g>` +
        plank(101) +
        (ready
          ? `<g stroke-width="1.6">${c(92, 18, 3.5, MUSTL)}${c(104, 30, 2.5, '#ff9a30')}${c(78, 10, 2.5, '#ff9a30')}</g>`
          : puffs([[88, 18, 8], [100, 12, 6], [76, 10, 5]])),
    )
  );
}

function frost(ready: boolean): string {
  const horn = ready ? CREAM : '#b8ad93';
  const defs = ready ? haloDefs('h', GLOW, 0.95) : '';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="92" cy="56" rx="28" ry="42" fill="url(#h)" stroke="none"/>` : '') +
        beam('M60 88V70', WOODD, 8) +
        plank(92) +
        p('M8 26C24 60 56 78 104 78L110 34C80 40 40 36 8 26Z', horn) +
        hl('M18 38C36 58 64 70 100 70', ready ? WHITE : '#d0c7ae', 3, 0.8) +
        p('M40 46L58 54L54 76L34 66Z', ready ? MUST : '#8a7b55') +
        p('M72 50L88 50L88 77L72 76Z', ready ? MUST : '#8a7b55') +
        (ready
          ? `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#c8faf2" stroke-width="3"/><ellipse cx="108" cy="56" rx="4" ry="15" fill="${WHITE}" stroke="none"/>`
          : `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#3b4250" stroke-width="3"/>`) +
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
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="94" cy="58" rx="26" ry="30" fill="url(#h)" stroke="none"/>` : '') +
        beam('M52 88V72', WOODD, 8) +
        plank(92) +
        // Bellows body.
        (ready ? p('M8 30H56L62 46V66L56 82H8Q2 56 8 30Z', leather) : p('M8 46H56L62 52V62L56 72H8Q4 58 8 46Z', leather)) +
        hl(ready ? 'M20 32V80M34 32V80M46 34V78' : 'M20 47V71M34 47V71M46 48V70', INK, 2.2, 0.75) +
        r(4, ready ? 26 : 42, 8, ready ? 60 : 34, WOODD, 2) +
        // Dragon head pointing right.
        p('M70 34Q64 14 48 12Q58 22 60 38Z', ready ? MUSTL : '#a89a72') +
        p(lower, headD) +
        (ready ? `<ellipse cx="96" cy="60" rx="16" ry="7" fill="#ffcf6b" stroke-width="2"/><ellipse cx="96" cy="60" rx="8" ry="3" fill="#fff0bd" stroke="none"/>` : `<ellipse cx="96" cy="60" rx="16" ry="6" fill="#231d1d" stroke-width="2"/>`) +
        p(upper, head) +
        n('M64 44Q76 34 92 35Q78 40 70 50Z', ready ? '#d97a52' : '#96624f') +
        c(84, 42, 6, ready ? MUSTL : '#c9c1aa') +
        c(85, 42, 2.4, INK) +
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
    let d = '';
    for (let y = y0; y < y1; y += 12) d += `M60 ${y}v7`;
    return l(d, 7) + hl(d, IRONL, 3.5);
  };
  return ink(
    r(10, 8, 100, 15, WOOD, 3) +
      hl('M15 12H104', WOODL, 2.5) +
      r(20, 4, 11, 23, IRON, 2) +
      r(89, 4, 11, 23, IRON, 2) +
      hl('M25.5 10h.01M25.5 21h.01M94.5 10h.01M94.5 21h.01', '#20242a', 3.5) +
      // Winch drum and crank.
      r(36, 24, 48, 22, WOODD, 6) +
      hl('M36 30H84M36 38H84', WOOD, 2.5) +
      c(36, 35, 7, IRONL) +
      beam('M36 35L22 48', IRON, 4) +
      c(21, 49, 4.5, MUSTL) +
      links(44, chainY) +
      (ready
        ? p('M26 58Q26 54 32 54H88Q94 54 94 58L98 104Q98 112 90 112H30Q22 112 22 104Z', STONE) +
          n('M30 60H42L36 108H26Z', STONEL) +
          hl('M38 66H86L90 100H34Z', STONED, 3) +
          `<g stroke-width="2.5">${p('M60 70L74 88H46Z', MUSTL)}</g>` +
          hl('M60 92V100', INK, 3)
        : p(`M56 ${chainY}L64 ${chainY}L68 ${chainY + 6}Q70 ${chainY + 16} 60 ${chainY + 16}Q52 ${chainY + 16} 50 ${chainY + 9}`, 'none') +
          l(`M60 ${chainY}C72 ${chainY + 2} 72 ${chainY + 18} 60 ${chainY + 18}C52 ${chainY + 18} 49 ${chainY + 12} 50 ${chainY + 9}`, 9) +
          hl(`M60 ${chainY}C72 ${chainY + 2} 72 ${chainY + 18} 60 ${chainY + 18}C52 ${chainY + 18} 49 ${chainY + 12} 50 ${chainY + 9}`, IRONL, 4)),
  );
}

function shrine(ready: boolean): string {
  const col = ready ? STONEL : '#928c7c';
  const roof = ready ? RUST : '#73493a';
  const defs = ready ? haloDefs('h', '#ffb347', 0.95) : '';
  return (
    defs +
    ink(
      (ready ? `<circle cx="60" cy="64" r="46" fill="url(#h)" stroke="none"/>` : '') +
        r(14, 92, 92, 12, STONE, 3) +
        hl('M20 96H100', STONEL, 2.5) +
        r(26, 44, 12, 50, col, 2) +
        r(82, 44, 12, 50, col, 2) +
        p('M24 46L60 14L96 46Q60 38 24 46Z', roof) +
        hl('M34 42L60 22', ready ? '#e08a60' : '#90604e', 2.5) +
        c(60, 11, 4.5, ready ? MUSTL : '#b9a97a') +
        r(38, 46, 44, 46, ready ? '#3a2a45' : '#2a2730', 2) +
        (ready
          ? p('M50 56C38 66 40 80 52 84C64 90 78 84 80 70C80 60 76 54 88 40C74 46 72 40 66 48C60 42 58 52 50 56Z', RUST) +
            `<g stroke-width="2">${p('M58 62C52 68 52 78 60 82C70 84 76 76 74 68C72 62 72 58 80 50C72 54 70 50 66 56C62 54 62 60 58 62Z', MUST)}</g>` +
            c(58, 72, 11, PLUM) +
            n('M51 69a8 8 0 0 1 8-6l-1 3a5 5 0 0 0-5 4Z', '#b98aa8') +
            hl('M52 75L57 72L55 67M57 72L63 71', MUSTL, 2) +
            hl('M18 34l5 5M100 34l-5 5M60 2v4', MUSTL, 2.5)
          : `<ellipse cx="60" cy="86" rx="16" ry="5" fill="#4a4a4a" stroke-width="2"/>` +
            hl('M46 60q10-8 20 0', '#5a5a64', 2, 0.5) +
            hl('M56 76h6M50 80h4', '#5a5a64', 2, 0.5)),
    )
  );
}

function wheelRamp(ready: boolean): string {
  const ticks = (cx: number, cy: number, r0: number, r1: number) => {
    let d = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      d += `M${fx(cx + Math.cos(a) * r0)} ${fx(cy + Math.sin(a) * r0)}L${fx(cx + Math.cos(a) * r1)} ${fx(cy + Math.sin(a) * r1)}`;
    }
    return d;
  };
  const cx = 42;
  const cy = 40;
  return ink(
    r(10, 30, 16, 66, WOODD, 3) +
      r(4, 22, 40, 12, WOOD, 3) +
      hl('M8 25H40', WOODL, 2.5) +
      r(16, 18, 8, 20, IRON, 2) +
      p('M4 46L112 88L108 102L0 58Z', WOOD) +
      hl('M8 50L108 90', WOODL, 2.5) +
      hl('M22 62l-1 6M50 74l-1 6M80 86l-1 6', WOODD, 2.5) +
      beam('M60 90V104', WOODD, 7) +
      p('M100 84L114 92L110 104L98 96Z', STONE) +
      (ready
        ? c(cx, cy, 30, STONE) +
          n(`M${cx - 26} ${cy - 8}A28 28 0 0 1 ${cx + 2} ${cy - 27}L${cx + 2} ${cy - 21}A22 22 0 0 0 ${cx - 20} ${cy - 6}Z`, STONEL) +
          l(ticks(cx, cy, 22, 29), 3) +
          `<circle cx="${cx}" cy="${cy}" r="21" fill="${STONEL}" stroke-width="2.5"/>` +
          l(`M${cx} ${cy - 19}V${cy + 19}M${cx - 19} ${cy}H${cx + 19}`, 3.5, STONED) +
          c(cx, cy, 8, STONED) +
          c(cx, cy, 3, INK)
        : ''),
  );
}

// ---------------------------------------------------------------------------------------------
// Great Cauldron, rear position: 2.5D, behind the road, bolted to the castle
// ---------------------------------------------------------------------------------------------

const potLedge = art(
  240,
  200,
  0,
  200,
  ink(
    (() => {
      const top = 'M-10 132H176L198 160H-10Z';
      const front = 'M-10 160H198V184H-10Z';
      return (
        beam('M6 20L176 140', IRON, 3.5) +
        beam('M6 56L116 134', IRON, 3.5) +
        // Stepped corbels carrying the slab back into the wall.
        r(-10, 192, 92, 9, STONED, 2) +
        r(-10, 184, 148, 9, STONED, 2) +
        hl('M0 195H70M0 187H126', STONE, 2.5, 0.8) +
        clip(front, masonry(-10, 158, 200, 186, { h: 14, base: '#7f7969', fills: [STONE, '#aca696', '#8e8878'], line: '#6a6559', hi: '#d6d0bd', seed: 77 })) +
        `<path d="${front}" fill="none"/>` +
        p(top, STONEL) +
        n('M-6 136H168L176 146H-6Z', '#d6d0bd', 0.75) +
        hl('M24 136L18 160M70 136L66 160M116 136L118 160M156 136L164 158M-6 148H192', '#8e8878', 2, 0.7) +
        r(-4, 10, 14, 24, IRON, 2) +
        r(-4, 46, 14, 24, IRON, 2) +
        hl('M3 16h.01M3 28h.01M3 52h.01M3 64h.01', '#20242a', 3.5)
      );
    })(),
  ),
);

const potRearBack = art(
  150,
  100,
  75,
  100,
  `<g transform="translate(75 100)scale(.8)translate(-75 -90)">` +
    ink(
      e(75, 38, 71, 25, IRON) +
        e(75, 42, 62, 18, '#1d1712') +
        p('M16 46C34 32 116 32 134 46C118 62 34 62 16 46Z', MUST) +
        n('M34 44C54 37 96 37 116 44C96 49 54 49 34 44Z', MUSTL) +
        `<g stroke-width="2.5">${c(52, 44, 7, MUSTL)}${c(96, 42, 10, MUSTL)}${c(74, 50, 5, MUSTL)}${c(82, 12, 4, MUSTL)}${c(58, 22, 3, MUSTL)}</g>` +
        n('M92 37a4 3 0 0 1 6 0Z', CREAM),
      4,
    ) +
    `</g>`,
);

const potRearFront = art(
  150,
  100,
  75,
  100,
  `<g transform="translate(75 100)scale(.8)translate(-75 -90)">` +
    ink(
      p('M8 44C6 66 22 80 42 84H108C128 80 144 66 142 44C118 74 32 74 8 44Z', IRON) +
        hl('M24 70C44 80 62 81 76 81', IRONL, 3) +
        p('M4 40C24 72 126 72 146 40C150 50 148 56 142 58C118 84 32 84 8 58C2 56 0 50 4 40Z', IRONL) +
        p('M34 66C34 76 38 84 42 84C46 84 46 74 50 72Z', MUST) +
        p('M100 70C102 78 106 80 108 80C112 80 112 72 116 64Z', MUST) +
        r(24, 80, 14, 12, IRON, 2) +
        r(112, 80, 14, 12, IRON, 2) +
        `<ellipse cx="42" cy="89" rx="20" ry="5" fill="${STONED}"/>` +
        `<ellipse cx="108" cy="89" rx="20" ry="5" fill="${STONED}"/>`,
      4,
    ) +
    `</g>`,
);

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
      hl('M15 -12V12M15 48V72M15 108V132', IRONL, 2) +
      [30, 90]
        .map((y) => `<ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke-width="10"/><ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke="${IRONL}" stroke-width="5"/>`)
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
    p('M30 2H80L74 22H36Z', WOOD) +
      hl('M36 7H74', WOODL, 2.5) +
      r(44, 0, 22, 14, IRON, 2) +
      r(49, 18, 12, 16, IRON, 3) +
      l('M55 32C78 38 88 62 80 86C72 112 42 118 26 104C18 96 18 84 24 78', 15) +
      hl('M55 32C78 38 88 62 80 86C72 112 42 118 26 104C18 96 18 84 24 78', IRON, 9.5) +
      hl('M63 38C78 46 82 66 76 84', IRONL, 3) +
      p('M15 76L33 72L26 94Z', IRONL),
    3.5,
  ),
);

/** Eagle head and neck facing left. Beak anchor at art (20, 120). */
function eagleHead(open: boolean): string {
  const neck = 'M110 62C150 40 200 40 244 50C330 66 420 40 540 30V190C430 200 330 174 254 178C200 180 150 174 122 146Z';
  // Pale hood with a jagged trailing edge over the darker neck.
  const hood = 'M108 64C140 40 190 42 216 54L198 66L222 78L200 90L224 104L200 112L222 128L196 134L208 152L178 150L186 170C158 168 134 160 122 146Z';
  let plumes = '';
  for (let k = 0, x = 256; x < 540; k++, x += 34) {
    plumes += `M${x} ${84 + (k % 2) * 8}l14 12-14 12`;
    plumes += `M${x + 14} ${132 + (k % 2) * 8}l14 12-14 12`;
  }
  const upperShut = 'M112 74C88 64 58 68 40 88C28 100 20 110 20 124C32 114 46 112 62 114L124 110Z';
  const lowerShut = 'M48 120Q84 112 124 112L122 132Q88 142 58 136Z';
  const upperOpen = 'M112 70C88 58 56 58 38 72C26 82 20 92 20 104C32 96 46 94 62 96L124 96Z';
  const lowerOpen = 'M30 140Q68 128 124 120L118 146Q88 164 52 158Q36 154 30 140Z';
  const brow = 'M92 70C110 64 126 70 136 84';
  return ink(
    p(neck, GOLD) +
      n('M150 46C210 40 330 70 420 48C460 40 510 38 540 36V58C500 62 450 62 420 70C340 92 220 62 150 66Z', MUSTL, 0.7) +
      hl(plumes, GOLDD, 4) +
      hl('M250 178C330 172 430 196 540 186', GOLDD, 3) +
      (open ? p(lowerOpen, GOLD) + n('M40 142Q72 130 118 126Q92 152 58 152Q44 150 40 142Z', '#b3282d') : '') +
      n(hood, MUSTL) +
      hl('M216 54L198 66L222 78L200 90L224 104L200 112L222 128L196 134L208 152L178 150L186 170', INK, 3.5) +
      l('M108 64C140 40 190 42 216 54') +
      hl('M136 122L164 128M140 100L170 96M132 146L156 152', GOLDD, 3.5) +
      p(open ? upperOpen : upperShut, MUST) +
      n(open ? 'M36 82Q56 64 96 66Q66 76 46 90Z' : 'M34 104Q50 80 96 74Q66 88 46 110Z', CREAM, 0.7) +
      (open ? '' : p(lowerShut, GOLD)) +
      hl(open ? 'M22 104Q70 94 124 96' : 'M22 124Q70 112 124 110', INK, 3) +
      hl(open ? 'M78 80h.01' : 'M80 88h.01', INK, 4) +
      // Eye.
      c(116, 94, 12, WHITE) +
      c(113, 94, 7.5, INK) +
      n('M110 90a2.6 2.6 0 1 0 .1 0Z', WHITE) +
      l(brow, 7) +
      hl(brow, GOLDD, 2),
    3.5,
  );
}

// ---------------------------------------------------------------------------------------------

const keep = (b: string): Art => art(300, 660, 0, 660, b);
const glow = (list: Win[]): Art => art(300, 660, 0, 660, windowsGlow(list));
const mount = (b: string): Art => centred(120, 120, b);
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
