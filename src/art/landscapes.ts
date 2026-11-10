/**
 * Parallax landscapes and clouds.
 *
 * Each landscape has far, mid and near strips (1600 x 320, anchored bottom-left on the ground line)
 * and a ground strip with the road (1280 x 130). background.ts continues every strip with a mirrored
 * copy to the right, so skylines are mirrored at both edges (they meet their copy flat) and
 * landmarks stay clear of the edges. Only strip x 400..1600 is ever seen: the keep hides the rest,
 * and x 1480..1600 also shows up mirrored on wide screens, so nothing unique lives there.
 *
 * Depth: far layers are light, hazy and bluish with hairline outlines; nearer layers get richer
 * colour and firmer lines, but always less than the figures. Light comes from the upper left:
 * west-facing slopes are lit, east-facing slopes and cliff walls fall into cool shade.
 * The road (ground strip, 16..90 px from its top) carries the raiders and stays low in contrast.
 */
import { svg, type Art } from './types';
import { crescent, linearAbs, paint, r1, rng, stroke, tone, within } from './shade';

const W = 1600;
const H = 320;
const BOTTOM = 340;

type P = [number, number];
type Rand = () => number;
type Puff = [number, number, number];

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------

/** Skyline points mirrored about x = 0 and x = w, so a curve through them meets its mirror flat. */
function ext(pts: P[], w = W): P[] {
  const l = pts.filter((p) => p[0] > 0).slice(0, 3).reverse().map(([x, y]): P => [-x, y]);
  const r = pts.filter((p) => p[0] < w).slice(-3).reverse().map(([x, y]): P => [2 * w - x, y]);
  return [...l, ...pts, ...r];
}

const mid2 = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;

/** Open smooth line through the midpoints of a mirrored skyline. */
function curve(pts: P[], w = W): string {
  const e = ext(pts, w);
  let d = `M${pt(e[0])}L${pt(mid2(e[0], e[1]))}`;
  for (let i = 1; i < e.length - 1; i++) d += `Q${pt(e[i])} ${pt(mid2(e[i], e[i + 1]))}`;
  return `${d}L${pt(e[e.length - 1])}`;
}
/** Closed shape under a smooth skyline. */
const hill = (pts: P[], bottom = BOTTOM, w = W) => `${curve(pts, w)}V${bottom}H${r1(ext(pts, w)[0][0])}Z`;
/** Straight-edged skyline, open and closed. */
const jagLine = (pts: P[]) => `M${ext(pts).map(pt).join('L')}`;
const jag = (pts: P[]) => `${jagLine(pts)}V${BOTTOM}H${r1(ext(pts)[0][0])}Z`;

/** Height of the smooth skyline at x, for planting things on a ridge. */
function curveAt(pts: P[], x: number, w = W): number {
  const e = ext(pts, w);
  for (let i = 1; i < e.length - 1; i++) {
    const a = mid2(e[i - 1], e[i]);
    const c = e[i];
    const b = mid2(e[i], e[i + 1]);
    if (x < a[0] || x > b[0]) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 24; k++) {
      const t = (lo + hi) / 2;
      const xt = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
      if (xt < x) lo = t; else hi = t;
    }
    const t = (lo + hi) / 2;
    return (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
  }
  return pts[0][1];
}
/** Height of a straight-edged skyline at x. */
function lineAt(pts: P[], x: number): number {
  const e = ext(pts);
  for (let i = 0; i < e.length - 1; i++) {
    const [ax, ay] = e[i];
    const [bx, by] = e[i + 1];
    if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax);
  }
  return pts[0][1];
}

const circle = (cx: number, cy: number, r: number) =>
  `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${r1(cx - rx)} ${r1(cy)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0Z`;
const poly = (pts: P[]) => `M${pts.map(pt).join('L')}Z`;
const opa = (o: number) => (o < 1 ? ` opacity="${o}"` : '');

/** Many round dots in one path, drawn by the stroke's round cap. */
const dots = (pts: P[], col: string, w: number, o = 1) =>
  pts.length ? `<path d="${pts.map((p) => `M${pt(p)}h.01`).join('')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${opa(o)}/>` : '';
/** A silhouette with an outline of width w all round: ink underneath, fill on top. */
const inked = (d: string, ink: string, w: number) =>
  w > 0 ? `<path d="${d}" fill="${ink}" stroke="${ink}" stroke-width="${2 * w}" stroke-linejoin="round"/>` : '';
const strip = (body: string): Art => ({ svg: svg(W, H, body), w: W, h: H, px: 0, py: H });

/** A vertical wash, transparent at y0 and `o` opaque from y1 down. */
function wash(col: string, y0: number, y1: number, o: number, x0 = -10, x1 = W + 10, bottom = BOTTOM): string {
  const g = linearAbs([[0, col, 0], [1, col, o]], 0, y0, 0, y1);
  return `<defs>${g.def}</defs><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${bottom - y0}" fill="${g.url}"/>`;
}

/** Grass blades: a few short strokes per root, in one path. */
function blades(roots: P[], h: number, R: Rand): string {
  return roots
    .map(([x, y]) => {
      const a = h * (0.6 + R() * 0.5);
      return `M${r1(x)} ${r1(y)}q${r1(-1 - R() * 2)} ${r1(-a * 0.5)} ${r1(-3 - R() * 2)} ${r1(-a)}M${r1(x + 1)} ${r1(y)}q${r1(R() * 2 - 1)} ${r1(-a * 0.6)} ${r1(R() * 3 - 1)} ${r1(-a * 1.2)}M${r1(x + 2)} ${r1(y)}q${r1(1 + R() * 2)} ${r1(-a * 0.45)} ${r1(4 + R() * 2)} ${r1(-a * 0.85)}`;
    })
    .join('');
}

/** Scatter n points along a skyline, between x0 and x1, from dy0 to dy1 below it. */
function scatter(R: Rand, n: number, x0: number, x1: number, at: (x: number) => number, dy0: number, dy1: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0);
    out.push([x, at(x) + dy0 + R() * (dy1 - dy0)]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Masses: mountain ranges, mesas and hills
// ---------------------------------------------------------------------------------------------

interface RangeStyle {
  top: string;
  base: string;
  shade: string;
  shadeO: number;
  light: string;
  ink: string;
  inkW: number;
  snow?: string;
  snowLine?: number;
}

/**
 * A faceted mountain range: every peak has a lit west face and a shaded east face split by a
 * wandering spine, fine ridge lines, snow caps above the snow line and a thin lit rim.
 */
function range(pts: P[], s: RangeStyle, seed: number): string {
  const R = rng(seed);
  const d = jag(pts);
  const top = Math.min(...pts.map((p) => p[1]));
  const g = linearAbs([[0, s.top], [1, s.base]], 0, top, 0, 300);
  const e = ext(pts);
  let caps = '';
  let faces = '';
  let ridgesDark = '';
  let ridgesLight = '';
  for (let i = 1; i < e.length - 1; i++) {
    const [px, py] = e[i];
    if (!(py < e[i - 1][1] && py < e[i + 1][1])) continue;
    let j = i + 1;
    while (j < e.length - 1 && e[j + 1][1] > e[j][1]) j++;
    const v = e[j];
    const spine: P[] = [[px, py]];
    let sx = px;
    let sy = py;
    while (sy < 330) {
      sy += 18 + R() * 16;
      sx = Math.max(px - 6, Math.min(v[0] - 6, sx + (R() - 0.3) * 12));
      spine.push([sx, Math.min(sy, 336)]);
    }
    faces += poly([...e.slice(i, j + 1), [v[0], 336], ...spine.slice(1).reverse()]);
    // Side ridges branch off the spine: shaded creases on the lit face, lit ribs on the shaded one.
    for (let k = 1; k < spine.length - 1; k += 2) {
      const [qx, qy] = spine[k];
      if (R() < 0.7) ridgesDark += `M${r1(qx - 2)} ${r1(qy)}q${r1(-8 - R() * 6)} ${r1(8 + R() * 6)} ${r1(-14 - R() * 12)} ${r1(20 + R() * 12)}`;
      if (R() < 0.6) ridgesLight += `M${r1(qx + 3)} ${r1(qy)}q${r1(6 + R() * 6)} ${r1(8 + R() * 6)} ${r1(10 + R() * 10)} ${r1(18 + R() * 12)}`;
    }
    if (s.snow && s.snowLine !== undefined && py < s.snowLine) {
      // A ragged snow line at roughly one altitude, with streaks running down the gullies.
      const depth = (s.snowLine - py) * 0.6 + 6;
      const c: P[] = [];
      let y = py + depth;
      for (let x = px - 170; x <= px + 170; x += 8) {
        y = Math.max(py + depth * 0.6, Math.min(py + depth * 1.35, y + (R() - 0.5) * depth * 0.35));
        c.push([x, y]);
        if (R() < 0.2) {
          // A snow-filled gully: a rounded tongue running down the slope.
          const g = depth * (0.3 + R() * 0.35);
          c.push([x + 5, y + g * 0.7], [x + 9, y + g], [x + 13, y + g * 0.6], [x + 18, y]);
          x += 18;
        }
      }
      // The cap rises to its top line at both ends, so it never leaves a straight cut on a neighbour.
      const top = py - 30;
      for (const p of c) {
        const t = Math.max(0, Math.min(1, Math.min(p[0] - (px - 170), px + 170 - p[0]) / 70));
        p[1] = top + (p[1] - top) * t * t * (3 - 2 * t);
      }
      // Smooth lower edge through the midpoints, then straight back over the top.
      let edge = `M${pt(c[0])}`;
      for (let k = 1; k < c.length - 1; k++) edge += `Q${pt(c[k])} ${pt(mid2(c[k], c[k + 1]))}`;
      caps += `${edge}L${pt(c[c.length - 1])}L${px + 170} ${py - 30}L${px - 170} ${py - 30}Z`;
    }
  }
  return (
    `<defs>${g.def}</defs><path d="${d}" fill="${g.url}"/>` +
    within(
      d,
      (caps ? paint(caps, s.snow ?? '#fff') : '') +
        paint(faces, s.shade, s.shadeO) +
        stroke(ridgesDark, s.shade, 1.1, s.shadeO * 0.55) +
        stroke(ridgesLight, s.light, 1.1, 0.35),
    ) +
    crescent(d, 1.2, 2, s.light, 0.8) +
    stroke(jagLine(pts), s.ink, s.inkW)
  );
}

interface MassStyle {
  top: string;
  base: string;
  shade: string;
  light: string;
  ink: string;
  inkW: number;
  /** Horizontal reach of the east-face shade and its opacity. */
  shadeW?: number;
  shadeO?: number;
  lightW?: number;
}

/** A smooth or straight-edged mass with a gradient body, shaded east faces and a lit rim. */
function mass(d: string, line: string, s: MassStyle, y0: number, y1: number, inner = ''): string {
  const g = linearAbs([[0, s.top], [1, s.base]], 0, y0, 0, y1);
  const sw = s.shadeW ?? 16;
  const lw = s.lightW ?? 3;
  return (
    `<defs>${g.def}</defs><path d="${d}" fill="${g.url}"/>` +
    inner +
    crescent(d, -sw, -sw * 0.35, s.shade, s.shadeO ?? 0.7) +
    crescent(d, lw * 0.6, lw, s.light, 0.85) +
    stroke(line, s.ink, s.inkW)
  );
}

// ---------------------------------------------------------------------------------------------
// Plants, rocks and buildings
// ---------------------------------------------------------------------------------------------

interface Leaf {
  base: string;
  dark: string;
  light: string;
  trunk: string;
  ink: string;
}

const OAK: Puff[] = [[-11, -2, 10], [11, -1, 10], [-5, -12, 11], [6, -13, 10], [0, -4, 13], [-15, 6, 7.5], [15, 6, 7.5], [0, 7, 9]];
const BUSH: Puff[] = [[-11, -5, 7], [0, -9, 9], [10, -6, 7.5], [-4, -3, 7], [7, -2, 6]];

/** Clumps of round leaf masses: dark base, lit middle shifted up-left, warm highlights. */
function clump(ps: Puff[], cx: number, c: Leaf): string {
  const all = ps.map(([a, b, r]) => circle(a, b, r)).join('');
  const mids = ps.map(([a, b, r]) => circle(a - r * 0.13, b - r * 0.17, r * 0.78)).join('');
  const lights = ps.filter(([a]) => a <= cx + 3).map(([a, b, r]) => circle(a - r * 0.32, b - r * 0.38, r * 0.4)).join('');
  return paint(all, c.dark) + paint(mids, c.base) + paint(lights, c.light, 0.85);
}

/** A broadleaf tree; `narrow` < 1 gives a poplar. */
function tree(x: number, y: number, s: number, c: Leaf, R: Rand, ow = 2, narrow = 1, tall = 1): string {
  const cy = y - 30 * s * tall;
  const ps = OAK.map(([dx, dy, r]): Puff => [x + (dx + (R() - 0.5) * 3) * s * narrow, cy + (dy * tall + (R() - 0.5) * 3) * s, r * s * (0.9 + R() * 0.2) * (narrow < 1 ? 0.75 : 1)]);
  const trunk = poly([[x - 2.6 * s, y + 1], [x - 1.5 * s, cy + 6 * s], [x + 1.5 * s, cy + 6 * s], [x + 2.6 * s, y + 1]]);
  const trunkShade = poly([[x + 0.3 * s, y + 1], [x + 0.3 * s, cy + 6 * s], [x + 1.5 * s, cy + 6 * s], [x + 2.6 * s, y + 1]]);
  return (
    paint(ellipse(x + 7 * s, y + 1, 13 * s * narrow, 2.4 * s), tone(c.dark, -0.3), 0.3) +
    inked(ps.map(([a, b, r]) => circle(a, b, r)).join('') + trunk, c.ink, ow) +
    paint(trunk, c.trunk) +
    paint(trunkShade, tone(c.trunk, -0.3)) +
    clump(ps, x, c)
  );
}

function bush(x: number, y: number, s: number, c: Leaf, R: Rand, ow = 2, berry?: string): string {
  const ps = BUSH.map(([dx, dy, r]): Puff => [x + (dx + (R() - 0.5) * 2) * s, y + dy * s, r * s * (0.9 + R() * 0.2)]);
  const b = berry ? dots(ps.slice(0, 4).map(([a, bb, r]): P => [a + (R() - 0.5) * r, bb + (R() - 0.2) * r * 0.6]), berry, 2.6 * s) : '';
  return inked(ps.map(([a, bb, r]) => circle(a, bb, r)).join(''), c.ink, ow) + clump(ps, x, c) + b;
}

interface Needle {
  base: string;
  dark: string;
  light: string;
  trunk: string;
  ink: string;
  snow?: string;
  snowShade?: string;
}

const tier = (x: number, t: number, b: number, w: number) => {
  const cy = b - (b - t) * 0.3;
  return `M${r1(x)} ${r1(t)}Q${r1(x + w * 0.22)} ${r1(cy)} ${r1(x + w)} ${r1(b)}L${r1(x + w * 0.5)} ${r1(b - 2.2)}L${r1(x)} ${r1(b + 0.8)}L${r1(x - w * 0.5)} ${r1(b - 2.2)}L${r1(x - w)} ${r1(b)}Q${r1(x - w * 0.22)} ${r1(cy)} ${r1(x)} ${r1(t)}Z`;
};
const tierEast = (x: number, t: number, b: number, w: number) => {
  const cy = b - (b - t) * 0.3;
  return `M${r1(x + 0.5)} ${r1(t)}Q${r1(x + w * 0.22)} ${r1(cy)} ${r1(x + w)} ${r1(b)}L${r1(x + w * 0.5)} ${r1(b - 2.2)}L${r1(x + w * 0.08)} ${r1(b + 0.6)}Z`;
};

/** A fir in tiers: lit west half, shaded east half, optional snow on every tier. */
function pine(x: number, y: number, h: number, c: Needle, ow = 2, n = 4): string {
  const top = y - h;
  const bot = y - h * 0.14;
  const step = (bot - top) / n;
  const trunk = poly([[x - h * 0.035, y + 1], [x - h * 0.03, bot - 3], [x + h * 0.03, bot - 3], [x + h * 0.035, y + 1]]);
  let sil = trunk;
  let body = paint(trunk, c.trunk);
  let edges = '';
  for (let i = n - 1; i >= 0; i--) {
    const b = top + (i + 1) * step;
    const t = i === 0 ? top : b - step * 1.6;
    const w = h * (0.07 + (0.17 * (i + 1)) / n);
    sil += tier(x, t, b, w);
    body += paint(tier(x, t, b, w), c.base) + paint(tierEast(x, t, b, w), c.dark);
    body += stroke(`M${r1(x - 0.5)} ${r1(t + 2)}Q${r1(x - w * 0.22)} ${r1(b - (b - t) * 0.3)} ${r1(x - w + 1.5)} ${r1(b - 1)}`, c.light, Math.max(1, h * 0.02), 0.7);
    if (c.snow) {
      const sb = t + (b - t) * 0.58;
      const sw = w * 0.6;
      body += paint(tier(x, t - 0.8, sb, sw), c.snow) + paint(tierEast(x, t - 0.8, sb, sw), c.snowShade ?? c.snow);
      body += paint(ellipse(x - w * 0.86, b - 1.6, w * 0.2, Math.max(1.4, h * 0.022)), c.snow) + paint(ellipse(x + w * 0.86, b - 1.6, w * 0.2, Math.max(1.4, h * 0.022)), c.snowShade ?? c.snow);
    }
    if (i > 0) edges += `M${r1(x - w * 0.9)} ${r1(b - 0.6)}L${r1(x - w * 0.5)} ${r1(b - 2.6)}L${r1(x)} ${r1(b + 0.4)}L${r1(x + w * 0.5)} ${r1(b - 2.6)}L${r1(x + w * 0.9)} ${r1(b - 0.6)}`;
  }
  return paint(ellipse(x + h * 0.12, y + 1, h * 0.2, h * 0.035), tone(c.dark, -0.3), 0.3) + inked(sil, c.ink, ow) + body + stroke(edges, c.ink, Math.max(0.8, ow * 0.45), 0.45);
}

/** A lit boulder with an optional snow or moss cap. */
function boulder(x: number, y: number, w: number, h: number, base: string, ink: string, ow: number, R: Rand, cap?: [string, string]): string {
  const j = () => (R() - 0.5) * w * 0.1;
  // Irregular and a little flat-topped: a shoulder on the left, a slab face on the right.
  const d =
    `M${r1(x - w / 2)} ${r1(y + 1)}C${r1(x - w * 0.56 + j())} ${r1(y - h * 0.4)} ${r1(x - w * 0.42)} ${r1(y - h * 0.8)} ${r1(x - w * 0.22 + j())} ${r1(y - h * 0.92)}` +
    `C${r1(x - w * 0.08)} ${r1(y - h * 1.04)} ${r1(x + w * 0.16 + j())} ${r1(y - h * 1.02)} ${r1(x + w * 0.28)} ${r1(y - h * 0.86)}` +
    `L${r1(x + w * 0.44 + j())} ${r1(y - h * 0.5)}C${r1(x + w * 0.52)} ${r1(y - h * 0.3)} ${r1(x + w * 0.52)} ${r1(y - h * 0.1)} ${r1(x + w / 2)} ${r1(y + 1)}Z`;
  const facet = stroke(`M${r1(x + w * 0.05)} ${r1(y - h * 0.9)}q${r1(w * 0.12)} ${r1(h * 0.35)} ${r1(w * 0.05)} ${r1(h * 0.8)}`, tone(base, -0.3), Math.max(1, ow * 0.5), 0.5);
  const capD = cap ? ellipse(x - w * 0.08, y - h * 0.98, w * 0.5, h * 0.36) : '';
  return (
    paint(ellipse(x + w * 0.2, y + 1, w * 0.6, h * 0.12), tone(base, -0.5), 0.3) +
    paint(d, base) +
    crescent(d, -w * 0.16, -h * 0.18, tone(base, -0.26)) +
    crescent(d, w * 0.05, h * 0.06, tone(base, 0.28)) +
    within(d, facet + (cap ? paint(capD, cap[0]) + paint(ellipse(x + w * 0.16, y - h * 0.86, w * 0.26, h * 0.18), cap[1], 0.8) : '')) +
    stroke(d, ink, ow)
  );
}

// ---------------------------------------------------------------------------------------------
// Meadow: blue snowy ranges, patchwork hills with a windmill and a farm, oaks and a fence
// ---------------------------------------------------------------------------------------------

/** A small broken tower for distant ridges. */
function ruin(x: number, y: number, s: number, col: string, shade: string, ink: string): string {
  const d = `M${x - 7 * s} ${y}V${y - 22 * s}h${2.4 * s}v${-4 * s}h${2.6 * s}v${3 * s}h${2.2 * s}v${-6 * s}h${2.6 * s}v${5 * s}l${2.6 * s} ${3 * s}V${y}Z`;
  const wall = `M${x + 9 * s} ${y}V${y - 9 * s}l${5 * s} ${2 * s}l${3 * s} ${-2 * s}V${y}Z`;
  return (
    paint(wall, col) + paint(d, col) +
    paint(`M${x + 1 * s} ${y}V${y - 26 * s}h${2.6 * s}v${5 * s}l${2.6 * s} ${3 * s}V${y}Z`, shade, 0.6) +
    paint(`M${x - 2 * s} ${y - 14 * s}h${2 * s}v${-4 * s}a${1} ${1} 0 0 0-${2 * s} 0Z`, shade) +
    stroke(d + wall, ink, 0.9, 0.8)
  );
}

/** Tiny conifer silhouettes for distant forests, in one path. */
function forest(R: Rand, n: number, x0: number, x1: number, at: (x: number) => number, dy0: number, dy1: number, size: number): string {
  return scatter(R, n, x0, x1, at, dy0, dy1)
    .map(([x, y]) => {
      const h = size * (0.7 + R() * 0.6);
      return `M${r1(x - h * 0.3)} ${r1(y)}L${r1(x)} ${r1(y - h)}L${r1(x + h * 0.3)} ${r1(y)}Z`;
    })
    .join('');
}

const birds = (list: [number, number, number][], col: string) =>
  stroke(list.map(([x, y, s]) => `M${x - 4 * s} ${y - 1.5 * s}q${2 * s} ${-1.2 * s} ${4 * s} ${1.5 * s}q${2 * s} ${-2.7 * s} ${4 * s} ${-1.5 * s}`).join(''), col, 1.1, 0.7);

const MEADOW_SKY_HAZE = '#dce9de';

const meadowBack: P[] = [[0, 168], [90, 120], [150, 134], [230, 84], [300, 122], [350, 106], [430, 150], [520, 92], [590, 124], [660, 64], [760, 142], [840, 108], [900, 126], [990, 72], [1080, 140], [1160, 100], [1220, 118], [1300, 82], [1380, 138], [1460, 100], [1540, 128], [1600, 140]];
const meadowFoot: P[] = [[0, 214], [80, 184], [170, 156], [260, 198], [360, 162], [420, 174], [500, 146], [600, 200], [700, 166], [776, 134], [812, 132], [880, 190], [980, 158], [1060, 176], [1150, 138], [1260, 196], [1350, 162], [1440, 182], [1520, 158], [1600, 170]];

function meadowFarArt(): Art {
  const R = rng(11);
  const forestD = forest(R, 230, 380, 1580, (x) => lineAt(meadowFoot, x), 8, 46, 7);
  // A slender waterfall dropping from a hanging valley, with spray at its foot.
  const fall = `M641 112q-1 14 0 26t1 22`;
  const fallArt = paint('M637 113l4-5 4 5Z', '#6a7fa8', 0.6) + stroke(fall, '#e6eef0', 3.2, 0.75) + stroke(fall, '#ffffff', 1.1, 0.9) +
    paint(ellipse(642, 161, 7, 3), '#f4f8f6', 0.7) + paint(ellipse(646, 158, 4, 2.4), '#ffffff', 0.5);
  return strip(
    range(meadowBack, { top: '#9fb3c8', base: '#a9bfcb', shade: '#6a7fa8', shadeO: 0.42, light: '#f4f2e8', ink: '#8299b2', inkW: 1.1, snow: '#f7f6f0', snowLine: 106 }, 3) +
      fallArt +
      wash(MEADOW_SKY_HAZE, 110, 210, 0.55) +
      range(meadowFoot, { top: '#88a6ad', base: '#9ab3b0', shade: '#5b7393', shadeO: 0.4, light: '#d9e6dc', ink: '#6f8ea0', inkW: 1.2 }, 5) +
      paint(forestD, '#67868d', 0.55) +
      ruin(792, lineAt(meadowFoot, 792) + 3, 1, '#7d969f', '#5b7393', '#5f7c8c') +
      wash(MEADOW_SKY_HAZE, 170, 300, 0.85) +
      birds([[560, 40, 1], [578, 34, 0.8], [592, 44, 0.9], [1120, 30, 1], [1134, 38, 0.8]], '#5c6d80'),
  );
}

const meadowMidBack: P[] = [[0, 204], [150, 186], [330, 206], [480, 182], [650, 204], [820, 186], [980, 200], [1150, 176], [1320, 202], [1480, 188], [1600, 196]];
const meadowMidFront: P[] = [[0, 240], [180, 218], [380, 242], [560, 214], [760, 240], [960, 216], [1150, 242], [1350, 220], [1520, 236], [1600, 230]];

/** A windmill with lattice sails, lit from the left. */
function windmill(x: number, y: number, s: number, ink: string): string {
  const tower = poly([[x - 9 * s, y], [x - 5.5 * s, y - 36 * s], [x + 5.5 * s, y - 36 * s], [x + 9 * s, y]]);
  const towerShade = poly([[x + 1.5 * s, y], [x + 1 * s, y - 36 * s], [x + 5.5 * s, y - 36 * s], [x + 9 * s, y]]);
  const cap = `M${x - 7.5 * s} ${y - 35 * s}Q${x} ${y - 47 * s} ${x + 7.5 * s} ${y - 35 * s}Z`;
  const hubX = x;
  const hubY = y - 39 * s;
  let sails = '';
  let frames = '';
  for (const a of [22, 112, 202, 292]) {
    const t = `rotate(${a} ${hubX} ${hubY})`;
    sails += `<path d="M${hubX} ${hubY}h${30 * s}" stroke="${ink}" stroke-width="${2 * s}" transform="${t}"/>`;
    frames += `<g transform="${t}"><rect x="${hubX + 7 * s}" y="${hubY - 7 * s}" width="${23 * s}" height="${6.5 * s}" fill="#efe6d2" fill-opacity="0.55" stroke="${ink}" stroke-width="${1 * s}"/><path d="M${hubX + 13 * s} ${hubY - 7 * s}v${6.5 * s}M${hubX + 19 * s} ${hubY - 7 * s}v${6.5 * s}M${hubX + 25 * s} ${hubY - 7 * s}v${6.5 * s}" stroke="${ink}" stroke-width="${0.7 * s}" opacity="0.7"/></g>`;
  }
  return (
    inked(tower + cap, ink, 1.4) +
    paint(tower, '#ece0c4') + paint(towerShade, '#c7b9a2') +
    paint(`M${x - 2.6 * s} ${y}v${-6 * s}a${2.6 * s} ${2.6 * s} 0 0 1 ${5.2 * s} 0v${6 * s}Z`, '#6c5040') +
    paint(circle(x - 1 * s, y - 22 * s, 1.5 * s), '#6c5040') +
    paint(cap, '#a65a3e') + paint(`M${x} ${y - 46 * s}Q${x + 6 * s} ${y - 43 * s} ${x + 7.5 * s} ${y - 35 * s}H${x}Z`, '#7f4232') +
    frames + sails +
    paint(circle(hubX, hubY, 2.2 * s), '#5c4a3a')
  );
}

/** A farmhouse, a barn and a haystack. */
function farm(x: number, y: number, ink: string): string {
  const house = `M${x - 14} ${y}V${y - 14}H${x + 12}V${y}Z`;
  const roof = `M${x - 17} ${y - 13}L${x - 1} ${y - 27}L${x + 15} ${y - 13}Z`;
  const barn = `M${x + 20} ${y + 1}V${y - 16}L${x + 31} ${y - 25}L${x + 42} ${y - 16}V${y + 1}Z`;
  const hay = `M${x - 34} ${y + 1}Q${x - 34} ${y - 15} ${x - 25} ${y - 15}Q${x - 16} ${y - 15} ${x - 16} ${y + 1}Z`;
  return (
    inked(house + roof + barn + hay, ink, 1.3) +
    paint(house, '#eee0c2') + paint(`M${x + 1} ${y}V${y - 14}H${x + 12}V${y}Z`, '#cbb99c') +
    paint(roof, '#b45b3f') + paint(`M${x - 1} ${y - 27}L${x + 15} ${y - 13}H${x - 1}Z`, '#8a4232') +
    paint(`M${x + 6} ${y - 24}h3.5v-6h-3.5Z`, '#8f7a68') +
    stroke(`M${x + 7.5} ${y - 31}q-3 -5 1 -9t0 -9`, '#eef0ee', 2, 0.5) +
    paint(`M${x - 10} ${y - 9}h4v4h-4ZM${x + 4} ${y - 9}h4v4h-4Z`, '#f0c66c') +
    paint(`M${x - 3} ${y}v-7h4v7Z`, '#6c5040') +
    paint(barn, '#a84a3c') + paint(`M${x + 31} ${y - 25}L${x + 42} ${y - 16}V${y + 1}H${x + 31}Z`, '#82392f') +
    stroke(`M${x + 26} ${y}v-9h10v9M${x + 26} ${y - 9}l10 9M${x + 36} ${y - 9}l-10 9`, '#f1e4cc', 1.1, 0.85) +
    paint(hay, '#dcb662') + paint(`M${x - 25} ${y - 15}Q${x - 16} ${y - 15} ${x - 16} ${y + 1}H${x - 25}Z`, '#b58e48') +
    stroke(`M${x - 31} ${y - 5}q6 -3 12 0M${x - 30} ${y - 10}q5 -3 10 0`, '#9c7a3c', 0.8, 0.7)
  );
}

function meadowMidArt(): Art {
  const R = rng(21);
  const leafBack: Leaf = { base: '#6f9a62', dark: '#55805a', light: '#94b97a', trunk: '#7d6450', ink: '#4c6d4f' };
  const leafFront: Leaf = { base: '#5f9058', dark: '#46744e', light: '#88b46c', trunk: '#6e5444', ink: '#3e5f43' };
  const firBack: Needle = { base: '#4f7f62', dark: '#3d6553', light: '#7aa47c', trunk: '#6e5444', ink: '#3f5f4c' };
  const firFront: Needle = { base: '#40735a', dark: '#305a49', light: '#6c9c74', trunk: '#5e4636', ink: '#2f5040' };
  const atB = (x: number) => curveAt(meadowMidBack, x);
  const atF = (x: number) => curveAt(meadowMidFront, x);

  // Patchwork fields on the back hills, cut by hedgerows.
  const fieldCols = ['#c9c27c', '#a3c47f', '#b8b46c', '#93b875', '#d0b770'];
  let fields = '';
  let hedges = '';
  for (let x = 330, k = 0; x < 1640; x += 58 + R() * 40, k++) {
    const w = 58 + R() * 30;
    fields += paint(poly([[x, 160], [x + w, 160], [x + w - 46, 330], [x - 46, 330]]), fieldCols[k % fieldCols.length], 0.55);
    hedges += `M${r1(x)} 160L${r1(x - 46)} 330`;
  }
  const rows = [14, 30].map((dy) => curve(meadowMidBack.map(([x, y]): P => [x, y + dy]))).join('');
  const sheep = [[700, 6], [716, 9], [728, 5], [744, 10], [760, 7]].map(([x, dy]): P => [x, atB(x) + dy]);

  let backTrees = '';
  for (const [x, s, kind] of [[420, 0.5, 0], [446, 0.42, 1], [600, 0.55, 0], [890, 0.5, 2], [910, 0.6, 0], [1010, 0.48, 1], [1270, 0.5, 0], [1290, 0.4, 2], [1420, 0.55, 0]] as const) {
    backTrees += kind === 1 ? pine(x, atB(x) + 3, 30 * s * 1.8, firBack, 1.2) : tree(x, atB(x) + 3, s, leafBack, R, 1.2, kind === 2 ? 0.55 : 1, kind === 2 ? 1.5 : 1);
  }
  let frontTrees = '';
  for (const [x, s, kind] of [[430, 0.75, 0], [470, 0.62, 1], [700, 0.7, 0], [736, 0.6, 2], [830, 0.8, 1], [868, 0.66, 0], [1040, 0.72, 0], [1076, 0.82, 1], [1110, 0.6, 1], [1230, 0.7, 2], [1400, 0.78, 0], [1440, 0.64, 1], [1520, 0.7, 0]] as const) {
    frontTrees += kind === 1 ? pine(x, atF(x) + 4, 30 * s * 1.9, firFront, 1.5) : tree(x, atF(x) + 4, s, leafFront, R, 1.5, kind === 2 ? 0.55 : 1, kind === 2 ? 1.6 : 1);
  }
  const lane = `M${520} ${r1(atF(560) + 2)}q30 10 10 22t30 30`;

  return strip(
    mass(hill(meadowMidBack), curve(meadowMidBack), { top: '#9cbf80', base: '#8db376', shade: '#6d9468', light: '#c0d896', ink: '#668b62', inkW: 1.3, shadeW: 18, shadeO: 0.55 }, 176, 260,
      within(hill(meadowMidBack), fields + stroke(hedges, '#5c8656', 2.2, 0.5) + stroke(rows, '#5c8656', 1.8, 0.35))) +
      dots(sheep, '#5a5048', 3.4) + dots(sheep.map(([x, y]): P => [x - 2.2, y - 0.6]), '#f6f2e6', 4.2) +
      windmill(1150, atB(1150) + 4, 1, '#4f5e48') +
      backTrees +
      wash('#e2ecdc', 190, 250, 0.4) +
      mass(hill(meadowMidFront), curve(meadowMidFront), { top: '#80a962', base: '#76a05a', shade: '#567f4d', light: '#a8c97a', ink: '#45694a', inkW: 1.7, shadeW: 20, shadeO: 0.6 }, 210, 280,
        within(hill(meadowMidFront), stroke(curve(meadowMidFront.map(([x, y]): P => [x, y + 16])), '#6a9658', 6, 0.35))) +
      stroke(lane, '#cdb688', 3, 0.7) +
      farm(560, atF(560) + 4, '#4a4a3c') +
      frontTrees,
  );
}

const meadowNearHill: P[] = [[0, 278], [160, 262], [360, 284], [560, 264], [760, 286], [960, 262], [1160, 284], [1360, 266], [1520, 280], [1600, 276]];

/** A split-rail fence along a slope, with shaded wood. */
function fence(xs: number[], at: (x: number) => number, ink: string): string {
  const posts = xs.map((x) => `M${x} ${r1(at(x) - 22)}V${r1(at(x) + 4)}`).join('');
  const rails = [8, 16].map((dy) => `M${xs[0] - 4} ${r1(at(xs[0]) - dy)}${xs.slice(1).map((x) => `L${x + (x === xs[xs.length - 1] ? 4 : 0)} ${r1(at(x) - dy)}`).join('')}`).join('');
  return (
    stroke(rails + posts, ink, 6.5) +
    stroke(rails, '#a87c4e', 3.2) + stroke(posts, '#9a6e44', 3.6) +
    stroke(rails.replace(/M(\S+) (\S+)/g, (_m, a, b) => `M${a} ${Number(b) - 0.9}`), '#d6ae7c', 1, 0.6)
  );
}

function meadowNearArt(): Art {
  const R = rng(31);
  const at = (x: number) => curveAt(meadowNearHill, x);
  const oak: Leaf = { base: '#5a8f4e', dark: '#3f7046', light: '#8cbb68', trunk: '#7a5a42', ink: '#2f4a32' };
  const shrub: Leaf = { base: '#6a9a50', dark: '#4c7a45', light: '#98c272', trunk: '#6e5040', ink: '#2f4a32' };
  const fir: Needle = { base: '#3d7258', dark: '#2c5845', light: '#69a07a', trunk: '#5e4434', ink: '#26402f' };
  const grass = blades(scatter(R, 80, 380, 1580, at, 3, 22), 8, R);
  const flowers = scatter(R, 60, 400, 1570, at, 6, 30);
  return strip(
    mass(hill(meadowNearHill), curve(meadowNearHill), { top: '#8ab35c', base: '#7ca552', shade: '#5c8846', light: '#b2d276', ink: '#34522f', inkW: 2.1, shadeW: 26, shadeO: 0.55 }, 258, 310) +
      stroke(grass, '#5f8f46', 1.3, 0.55) +
      dots(flowers.slice(0, 22), '#f6eed6', 3.4) + dots(flowers.slice(22, 40), '#efbf3e', 3.4) + dots(flowers.slice(40), '#c9603c', 3.2) +
      tree(640, at(640) + 6, 1.55, oak, R, 2.2) +
      bush(700, at(700) + 4, 1.2, shrub, R, 2, '#c8463a') +
      fence([790, 840, 890, 940, 990], at, '#2f2a22') +
      boulder(1080, at(1080) + 5, 34, 18, '#a6a294', '#33322c', 2, R, ['#7fa056', '#a6c272']) +
      pine(1110, at(1110) + 6, 96, fir, 2.2, 5) +
      tree(1200, at(1200) + 6, 1.75, oak, R, 2.2) +
      tree(1262, at(1262) + 6, 1.15, oak, R, 2.2) +
      bush(1330, at(1330) + 4, 1.4, shrub, R, 2) +
      bush(470, at(470) + 4, 1.1, shrub, R, 2, '#efbf3e') +
      boulder(520, at(520) + 4, 22, 12, '#a6a294', '#33322c', 1.8, R) +
      bush(1470, at(1470) + 4, 1.05, shrub, R, 2),
  );
}

// ---------------------------------------------------------------------------------------------
// Canyon: layered mesas with a stone arch, a waterfall, a cliff village, hoodoos and scrub
// ---------------------------------------------------------------------------------------------

/** Wavy horizontal rock strata, to be clipped to a mass. */
function strata(R: Rand, ys: [number, number, string, number][]): string {
  return ys
    .map(([y, w, col, o]) => stroke(`M-20 ${y}Q${200 + R() * 200} ${y - 4 + R() * 8} 800 ${y + (R() - 0.5) * 6}T1620 ${y}`, col, w, o, 'butt'))
    .join('');
}

const canyonFarPts: P[] = [[0, 214], [60, 204], [90, 122], [200, 116], [230, 128], [300, 126], [330, 206], [420, 214], [450, 150], [520, 146], [548, 208], [640, 214], [672, 88], [800, 84], [830, 98], [900, 96], [932, 202], [1040, 214], [1070, 132], [1180, 128], [1212, 206], [1320, 214], [1350, 162], [1440, 158], [1470, 208], [1600, 214]];

function canyonFarArt(): Art {
  const R = rng(41);
  const d = jag(canyonFarPts);
  // A natural stone arch over the valley between two buttes.
  const arch = `M556 216L560 182Q562 156 590 150H624Q650 152 654 180L658 216H642L638 190Q634 170 607 170Q580 172 576 192L572 216Z`;
  const grooves = scatter(R, 40, 420, 1580, (x) => lineAt(canyonFarPts, x), 10, 40).map(([x, y]) => `M${r1(x)} ${r1(y)}v${r1(10 + R() * 18)}`).join('');
  return strip(
    mass(d, jagLine(canyonFarPts), { top: '#e6c0a8', base: '#ddb39c', shade: '#a77f99', light: '#f6dcc6', ink: '#b88f88', inkW: 1.1, shadeW: 26, shadeO: 0.5, lightW: 2.2 }, 84, 240,
      within(d, strata(R, [[112, 6, '#efd0b8', 0.6], [128, 3, '#c99a8a', 0.5], [150, 8, '#d3a08c', 0.45], [172, 4, '#f0d2bc', 0.5], [190, 7, '#c4958a', 0.4]]) + stroke(grooves, '#b98a86', 1, 0.35))) +
      mass(arch, arch, { top: '#dcae98', base: '#d3a48f', shade: '#9a7490', light: '#f2d8c4', ink: '#b08480', inkW: 1.1, shadeW: 8, shadeO: 0.5, lightW: 2 }, 150, 216,
        within(arch, strata(R, [[162, 3, '#c99a8a', 0.5], [186, 5, '#ebcbb4', 0.5], [204, 3, '#c99a8a', 0.4]]))) +
      wash('#f4dfc6', 150, 290, 0.85) +
      birds([[600, 50, 1.2], [620, 42, 0.9], [1250, 62, 1]], '#7a5a60'),
  );
}

const canyonMidPts: P[] = [[0, 252], [80, 246], [110, 180], [240, 174], [268, 252], [360, 258], [392, 152], [470, 148], [500, 182], [530, 180], [556, 258], [660, 262], [690, 194], [850, 190], [882, 258], [990, 262], [1020, 160], [1110, 156], [1142, 254], [1260, 260], [1290, 202], [1420, 198], [1452, 254], [1600, 258]];

function hoodoo(x: number, base: number, h: number, R: Rand): string {
  const col = '#b8643e';
  const body = `M${x - 10} ${base}C${x - 8} ${base - h * 0.4} ${x - 4} ${base - h * 0.55} ${x - 6} ${base - h * 0.75}C${x - 8} ${base - h * 0.9} ${x - 3} ${base - h} ${x} ${base - h}C${x + 4} ${base - h} ${x + 8} ${base - h * 0.9} ${x + 6} ${base - h * 0.72}C${x + 4} ${base - h * 0.55} ${x + 9} ${base - h * 0.4} ${x + 11} ${base}Z`;
  const capD = ellipse(x + 1, base - h - 3, 13, 6.5);
  return (
    paint(body, col) + crescent(body, -6, -2, '#7d4a58', 0.75) + crescent(body, 1.2, 2, '#e09a6c') +
    within(body, strata(R, [[base - h * 0.3, 3, '#9a4e36', 0.5], [base - h * 0.6, 2, '#d88a5e', 0.6]])) +
    stroke(body, '#6e3a2e', 1.5) +
    paint(capD, '#8c5b54') + crescent(capD, -4, -3, '#5e3e4a', 0.8) + crescent(capD, 1, 1.4, '#b88478') + stroke(capD, '#6e3a2e', 1.5)
  );
}

function canyonMidArt(): Art {
  const R = rng(51);
  const d = jag(canyonMidPts);
  const groove = scatter(R, 60, 380, 1580, (x) => lineAt(canyonMidPts, x), 8, 50).map(([x, y]) => `M${r1(x)} ${r1(y)}q${r1(R() * 4 - 2)} 8 0 ${r1(12 + R() * 20)}`).join('');
  // Dark desert varnish runs down from the rims; light scree fans lie at the feet of the walls.
  const varnish = scatter(R, 46, 380, 1580, (x) => lineAt(canyonMidPts, x), 1, 3).map(([x, y]) => `M${r1(x)} ${r1(y)}v${r1(10 + R() * 26)}`).join('');
  const scree = canyonMidPts
    .filter(([, y], i, a) => i > 0 && y < a[i - 1][1] - 30)
    .map(([x]) => `M${x - 46} 262Q${x - 30} 236 ${x - 12} 232Q${x} 244 ${x + 6} 262Z`)
    .join('');
  // A waterfall spilling from a notch in the tall butte, with a pool and spray at its foot.
  const notch = 'M1046 157L1052 166H1062L1068 157Z';
  const fall = 'M1050 164C1050 190 1047 220 1049 256H1064C1063 220 1062 190 1064 164Z';
  const pool = ellipse(1056, 259, 26, 4.5);
  // A cliff village tucked into an overhang.
  const cave = `M712 224Q716 208 770 208Q824 208 828 224Z`;
  const huts = 'M724 224v-9h12v9ZM742 224v-13h14v13ZM762 224v-8h11v8ZM780 224v-11h13v11ZM800 224v-7h12v7Z';
  return strip(
    hoodoo(600, 266, 44, R) + hoodoo(940, 268, 52, R) + hoodoo(1210, 266, 40, R) +
      mass(d, jagLine(canyonMidPts), { top: '#d48a5c', base: '#c4744a', shade: '#7f4a5e', light: '#f0b282', ink: '#6e3a2c', inkW: 1.7, shadeW: 30, shadeO: 0.6, lightW: 2.6 }, 150, 270,
        within(d, strata(R, [[166, 7, '#e3a272', 0.55], [184, 3, '#9c5038', 0.55], [204, 10, '#b5603e', 0.45], [226, 4, '#e3a272', 0.5], [244, 8, '#a6553a', 0.45]]) +
          stroke(groove, '#8e4632', 1.2, 0.4) + stroke(varnish, '#6e3a30', 2.6, 0.22) + paint(scree, '#dc9a6c', 0.55))) +
      paint(cave, '#7a4446') + paint(`M712 224Q716 208 770 208Q824 208 828 224H818Q812 214 770 214Q728 214 722 224Z`, '#5e3436', 0.6) +
      paint(huts, '#dca578') + paint('M736 224V215H730ZM756 224V211H749ZM773 224V216H768ZM793 224V213H786ZM812 224V217H806Z', '#b5805a') +
      paint('M728 224v-5h3v5ZM746 224v-6h3v6ZM765 224v-5h3v5ZM784 224v-6h3v6ZM803 224v-4h3v4Z', '#4a2c2c') +
      stroke('M712 224H828', '#6e3a2c', 1.3) +
      paint(notch, '#7d4a5e', 0.8) +
      paint(fall, '#a8d2da') + paint('M1056 164C1056 190 1054 220 1056 256H1064C1063 220 1062 190 1064 164Z', '#86b4c6') +
      stroke('M1053 168c-1 26 0 56-1 84M1059 170c0 24-1 52 0 80', '#ffffff', 1.1, 0.75) + stroke(fall, '#5e7c8c', 1, 0.6) +
      paint(pool, '#8fbcc6') + paint(ellipse(1054, 255, 18, 5.5), '#f4fbfa', 0.75) + paint(ellipse(1066, 251, 9, 4), '#ffffff', 0.5) +
      wash('#f2d8bc', 200, 300, 0.55),
  );
}

const canyonNearHill: P[] = [[0, 290], [200, 276], [420, 296], [640, 278], [860, 298], [1080, 276], [1300, 296], [1500, 282], [1600, 286]];

function agave(x: number, y: number, s: number, ink: string): string {
  const leaves = [-62, -38, -16, 0, 18, 40, 64].map((a) => {
    const r = ((a * Math.PI) / 180) * 0.9;
    const L = (22 - Math.abs(a) * 0.12) * s;
    const tx = x + Math.sin(r) * L;
    const ty = y - Math.cos(r) * L;
    return `M${r1(x - 3 * s)} ${y}Q${r1((x + tx) / 2 - 2 * s)} ${r1((y + ty) / 2)} ${r1(tx)} ${r1(ty)}Q${r1((x + tx) / 2 + 2 * s)} ${r1((y + ty) / 2 + 1)} ${r1(x + 3 * s)} ${y}Z`;
  });
  return inked(leaves.join(''), ink, 1.6) + paint(leaves.join(''), '#7f9f86') + paint(leaves.slice(4).join(''), '#5e7e6e') + paint(leaves.slice(0, 3).join(''), '#a2c0a2', 0.5);
}

function cactusPads(x: number, y: number, ink: string): string {
  const pads = ellipse(x, y - 12, 9, 12) + ellipse(x - 12, y - 26, 7, 9) + ellipse(x + 10, y - 28, 7.5, 10) + ellipse(x + 2, y - 38, 6, 8);
  const shade = ellipse(x + 4, y - 9, 6, 10) + ellipse(x + 14, y - 25, 4.5, 8);
  const spines = dots([[x - 3, y - 16], [x + 3, y - 8], [x - 12, y - 28], [x + 9, y - 32], [x + 2, y - 40], [x - 4, y - 6], [x + 12, y - 22]], '#f4e8c4', 1.6);
  return inked(pads, ink, 1.8) + paint(pads, '#7e9c56') + paint(shade, '#5e7a48', 0.8) + paint(ellipse(x - 4, y - 16, 3, 5) + ellipse(x - 14, y - 29, 2.4, 3.5), '#a8c47a', 0.7) + spines + dots([[x + 6, y - 47], [x - 15, y - 35]], '#d0506a', 4);
}

function wagonWheel(x: number, y: number, r: number, ink: string): string {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + 0.2;
    return `M${x} ${y}l${r1(Math.cos(a) * r * 0.9)} ${r1(Math.sin(a) * r * 0.45)}`;
  }).join('');
  const rim = ellipse(x, y, r, r * 0.5);
  return (
    stroke(rim, ink, 6) + stroke(spokes, ink, 4) + stroke(spokes, '#a07c58', 1.8) + stroke(rim, '#b08660', 3) +
    stroke(`M${x - r * 0.9} ${y - r * 0.15}A${r} ${r * 0.5} 0 0 1 ${x + r * 0.4} ${y - r * 0.46}`, '#d8b48a', 1, 0.8) +
    paint(ellipse(x, y, 3, 2), '#6a4e3a')
  );
}

function canyonNearArt(): Art {
  const R = rng(61);
  const at = (x: number) => curveAt(canyonNearHill, x);
  const scrub: Leaf = { base: '#8e9248', dark: '#6c7038', light: '#b6b86a', trunk: '#6e5040', ink: '#3b3420' };
  const dry = blades(scatter(R, 70, 400, 1580, at, 2, 20), 8, R);
  const pebbles = scatter(R, 40, 400, 1580, at, 4, 26);
  return strip(
    boulder(520, at(520) + 6, 70, 40, '#a8553a', '#3e231c', 2, R) +
      boulder(1180, at(1180) + 6, 84, 46, '#9a4c34', '#3e231c', 2, R) +
      mass(hill(canyonNearHill), curve(canyonNearHill), { top: '#d89562', base: '#cb8456', shade: '#9a5a4c', light: '#f0c08e', ink: '#4a2a1e', inkW: 2.1, shadeW: 26, shadeO: 0.55 }, 270, 310) +
      stroke(dry, '#a88a50', 1.3, 0.75) +
      dots(pebbles, '#a35a3a', 3, 0.6) + dots(pebbles.map(([x, y]): P => [x - 0.6, y - 0.8]), '#ecbc90', 1.4, 0.7) +
      bush(450, at(450) + 3, 1.1, scrub, R, 1.8) +
      agave(600, at(600) + 4, 1.1, '#2f3a2c') +
      wagonWheel(760, at(760) - 2, 15, '#3e2a1e') +
      boulder(790, at(790) + 4, 30, 16, '#b0603e', '#3e231c', 1.8, R) +
      cactusPads(920, at(920) + 4, '#2f3a24') +
      bush(1010, at(1010) + 3, 1.3, scrub, R, 1.8) +
      stroke(`M1090 ${r1(at(1090) + 2)}c-2-20 6-34 2-52M1092 ${r1(at(1090) - 26)}l14-14m-12-4l-12-10`, '#3e2a1e', 4.5) +
      stroke(`M1090 ${r1(at(1090) + 2)}c-2-20 6-34 2-52M1092 ${r1(at(1090) - 26)}l14-14m-12-4l-12-10`, '#b0957a', 2) +
      agave(1300, at(1300) + 4, 0.9, '#2f3a2c') +
      bush(1400, at(1400) + 3, 1, scrub, R, 1.8) +
      boulder(1460, at(1460) + 4, 26, 14, '#b0603e', '#3e231c', 1.8, R),
  );
}

// ---------------------------------------------------------------------------------------------
// Marsh: misty hills with a ruined tower, willows and a stilt hut, reeds and lily pads
// ---------------------------------------------------------------------------------------------

/** A drifting fog bank with a soft top edge (three thin layers) that thins out below. */
const fogBand = (y: number, o: number, col = '#e6e8d6', seed = 1) => {
  const R = rng(seed);
  const pts: P[] = [];
  for (let x = 0; x <= W; x += 160) pts.push([x, y + (R() - 0.5) * 18]);
  pts[pts.length - 1] = [W, y];
  return [-12, -6, 0]
    .map((dy, i) => paint(`${curve(pts.map(([x, yy]): P => [x, yy + dy]))}L${W + 300} ${y + 16 + i * 4}Q${W / 2} ${y + 26} -300 ${y + 16 + i * 4}Z`, col, o * (0.3 + i * 0.12)))
    .join('');
};

const marshFarBack: P[] = [[0, 186], [200, 150], [400, 176], [620, 126], [860, 180], [1080, 140], [1320, 174], [1500, 152], [1600, 160]];
const marshFarFront: P[] = [[0, 222], [240, 196], [500, 222], [760, 188], [1020, 226], [1280, 194], [1500, 220], [1600, 212]];

function marshFarArt(): Art {
  const R = rng(71);
  const atF = (x: number) => curveAt(marshFarFront, x);
  const reedsFar = scatter(R, 140, 380, 1580, atF, 4, 30).map(([x, y]) => `M${r1(x)} ${r1(y)}v-${r1(4 + R() * 5)}`).join('');
  // Distant groves: rounded crowns on the back hills, misty and flat.
  const atB = (x: number) => curveAt(marshFarBack, x);
  let groves = '';
  let trunks = '';
  for (const [x0, n] of [[470, 6], [760, 4], [960, 7], [1220, 5], [1440, 4]]) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 11 + R() * 5;
      const r = 3.5 + R() * 3.5;
      const top = atB(x) + 2 - r * 2.2;
      groves += ellipse(x, top, r, r * 1.15);
      trunks += `M${r1(x)} ${r1(top + r)}V${r1(atB(x) + 4)}`;
    }
  }
  return strip(
    mass(hill(marshFarBack), curve(marshFarBack), { top: '#b0c1ba', base: '#b0c0b6', shade: '#8a9aaa', light: '#e6ece0', ink: '#97aaa4', inkW: 1, shadeW: 24, shadeO: 0.5 }, 126, 240) +
      stroke(trunks, '#7f918c', 1.2) + paint(groves, '#94ab9a') + paint(groves.replace(/M(\S+) (\S+)a/g, (_m, a, b) => `M${Number(a) + 1.6} ${Number(b) + 1.4}a`), '#7f978e', 0.7) +
      ruin(628, atB(628) + 4, 1.6, '#90a19c', '#76879a', '#7a8c8a') +
      fogBand(176, 0.55, '#e8eadb', 3) +
      mass(hill(marshFarFront), curve(marshFarFront), { top: '#93a89c', base: '#9fb2a6', shade: '#718597', light: '#d6e0d2', ink: '#7e958d', inkW: 1.1, shadeW: 24, shadeO: 0.5 }, 188, 260) +
      stroke(reedsFar, '#7f9488', 1, 0.6) +
      birds([[900, 70, 1.3], [918, 62, 1], [1350, 80, 1.1]], '#5d6c68') +
      fogBand(224, 0.55, '#e6e8d6', 5) +
      wash('#e3e6d4', 210, 300, 0.7),
  );
}

const marshMidHill: P[] = [[0, 246], [180, 228], [380, 250], [600, 226], [820, 252], [1040, 230], [1260, 250], [1460, 232], [1600, 240]];

function willow(x: number, y: number, s: number, R: Rand): string {
  const ink = '#33463c';
  const crown: Puff[] = [[-14, -40, 13], [0, -48, 15], [14, -40, 13], [-22, -30, 9], [22, -30, 9]].map(([dx, dy, r]): Puff => [x + dx * s, y + dy * s, r * s]);
  const curtain = `M${x - 30 * s} ${y - 30 * s}Q${x - 34 * s} ${y - 10 * s} ${x - 26 * s} ${y - 4 * s}L${x + 26 * s} ${y - 4 * s}Q${x + 34 * s} ${y - 10 * s} ${x + 30 * s} ${y - 30 * s}Z`;
  const trunk = `M${x - 3 * s} ${y}Q${x - 2 * s} ${y - 20 * s} ${x - 6 * s} ${y - 34 * s}L${x + 2 * s} ${y - 34 * s}Q${x + 3 * s} ${y - 18 * s} ${x + 4 * s} ${y}Z`;
  let strands = '';
  for (let i = 0; i < 16; i++) {
    const sx = x + (-28 + i * 3.7) * s;
    strands += `M${r1(sx)} ${r1(y - (30 + R() * 10) * s)}q${r1((R() - 0.5) * 3)} ${r1(14 * s)} ${r1((R() - 0.3) * 2)} ${r1((22 + R() * 6) * s)}`;
  }
  const c: Leaf = { base: '#7f9a62', dark: '#5c7652', light: '#a8bf80', trunk: '#5e5444', ink };
  return (
    inked(crown.map(([a, b, r]) => circle(a, b, r)).join('') + curtain + trunk, ink, 1.4) +
    paint(trunk, c.trunk) + paint(curtain, c.dark) +
    clump(crown, x, c) +
    stroke(strands, '#9db67a', 1.4, 0.8) + stroke(strands.replace(/M(\S+)/g, (_m, a) => `M${Number(a) + 1.4}`), '#4f6848', 1, 0.6)
  );
}

function deadTree(x: number, y: number, s: number): string {
  const d = `M${x} ${y}c-2-30 4-50-2-90M${x - 1} ${y - 48}l-25-26m0 0l-18-4m18 4l-4-22M${x + 1} ${y - 66}l25-26m0 0l18-4m-18 4l-2-20M${x - 2} ${y - 90}l-10-24m10 24l12-26`;
  const g = `<g transform="translate(${x} ${y})scale(${s})translate(${-x} ${-y})">`;
  return g + stroke(d, '#33403a', 8) + stroke(d, '#6e6a58', 3.6) + stroke(d.replace(/M(\S+) (\S+)/g, (_m, a, b) => `M${Number(a) - 1} ${b}`), '#9c9478', 1.2, 0.6) + '</g>';
}

function stiltHut(x: number, y: number): string {
  const ink = '#33362c';
  const walls = `M${x - 18} ${y - 22}V${y - 42}H${x + 18}V${y - 22}Z`;
  const roof = `M${x - 26} ${y - 40}Q${x - 6} ${y - 66} ${x} ${y - 68}Q${x + 6} ${y - 66} ${x + 26} ${y - 40}Z`;
  const deck = `M${x - 24} ${y - 22}h48v4h-48Z`;
  const poles = `M${x - 18} ${y - 18}V${y + 2}M${x - 4} ${y - 18}V${y + 3}M${x + 10} ${y - 18}V${y + 2}M${x + 20} ${y - 18}V${y + 3}`;
  return (
    stroke(poles, ink, 5) + stroke(poles, '#6c5c44', 2.4) +
    inked(walls + roof + deck, ink, 1.5) +
    paint(walls, '#9c8a64') + paint(`M${x + 3} ${y - 22}V${y - 42}H${x + 18}V${y - 22}Z`, '#77684e') +
    stroke(`M${x - 18} ${y - 28}H${x + 18}M${x - 18} ${y - 34}H${x + 18}`, '#6b5c44', 0.8, 0.6) +
    paint(`M${x - 11} ${y - 22}v-12h8v12Z`, '#4a3c2c') + paint(`M${x + 7} ${y - 36}h6v5h-6Z`, '#f0c870') +
    paint(roof, '#b5a06a') + paint(`M${x} ${y - 68}Q${x + 6} ${y - 66} ${x + 26} ${y - 40}H${x}Z`, '#8c7a50') +
    stroke(`M${x - 18} ${y - 46}l6-10M${x - 8} ${y - 46}l4-14M${x + 4} ${y - 46}l-2-16M${x + 14} ${y - 46}l-4-10`, '#7e6c46', 0.9, 0.7) +
    paint(deck, '#7a6648') +
    stroke(`M${x + 26} ${y - 18}l6 20M${x + 32} ${y - 18}l6 20M${x + 27} ${y - 12}h7M${x + 29} ${y - 5}h7`, '#5c4c38', 1.4)
  );
}

function marshMidArt(): Art {
  const R = rng(81);
  const at = (x: number) => curveAt(marshMidHill, x);
  const water = `M-20 252H${W + 20}V${BOTTOM}H-20Z`;
  const shimmer = Array.from({ length: 26 }, () => {
    const x = 380 + R() * 1200;
    const y = 258 + R() * 40;
    return `M${r1(x)} ${r1(y)}h${r1(8 + R() * 22)}`;
  }).join('');
  const reedsMid = scatter(R, 90, 380, 1580, at, 6, 14).map(([x, y]) => `M${r1(x)} ${r1(y)}q${r1(R() * 2 - 1)} -6 ${r1(R() * 4 - 2)} -${r1(10 + R() * 8)}`).join('');
  return strip(
    `<path d="${water}" fill="#93aba3"/>` +
      stroke(shimmer, '#d6e2d6', 1.4, 0.7) +
      mass(hill(marshMidHill), curve(marshMidHill), { top: '#7a947c', base: '#6a8470', shade: '#4d6460', light: '#a2b896', ink: '#3f5648', inkW: 1.5, shadeW: 20, shadeO: 0.6 }, 224, 270) +
      stroke(reedsMid, '#56704e', 1.4, 0.8) +
      willow(470, at(470) + 4, 0.9, R) +
      deadTree(640, at(640) + 4, 0.75) +
      willow(1080, at(1080) + 4, 1.05, R) +
      deadTree(1300, at(1300) + 4, 0.62) +
      willow(1420, at(1420) + 4, 0.8, R) +
      stiltHut(880, 262) +
      paint(`M858 266h46v10h-46Z`, '#6c7c70', 0.3) +
      stroke('M864 270h34M868 276h24', '#e6eee2', 1, 0.5) +
      fogBand(254, 0.42, '#e6e8d6', 9),
  );
}

const marshNearBank: P[] = [[0, 300], [160, 280], [340, 304], [540, 278], [760, 306], [980, 282], [1200, 306], [1420, 282], [1600, 294]];

function cattails(x: number, y: number, s: number, R: Rand): string {
  let stems = '';
  let heads = '';
  let leaves = '';
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 6 * s + (R() - 0.5) * 3;
    const h = (54 + R() * 34) * s;
    const lean = (R() - 0.5) * 10 * s;
    stems += `M${r1(x + dx)} ${y}q${r1(lean * 0.3)} ${r1(-h * 0.5)} ${r1(lean)} ${r1(-h)}`;
    if (i % 2 === 0) heads += `M${r1(x + dx + lean)} ${r1(y - h + 4)}v${r1(14 * s)}`;
    leaves += `M${r1(x + dx)} ${y}q${r1((i - 2) * 6 * s)} ${r1(-h * 0.35)} ${r1((i - 2) * 12 * s + lean)} ${r1(-h * 0.6)}`;
  }
  return (
    stroke(leaves, '#2c3a26', 4.4) + stroke(leaves, '#6f8a46', 2.2) +
    stroke(stems, '#2c3a26', 3.6) + stroke(stems, '#8a9a5a', 1.5) +
    stroke(heads, '#2c2418', 8.4) + stroke(heads, '#7a4e2c', 5.6) + stroke(heads.replace(/M(\S+)/g, (_m, a) => `M${Number(a) - 1.2}`), '#a87448', 1.6, 0.8)
  );
}

function lilyPad(x: number, y: number, s: number, flower: boolean): string {
  const pad = `M${x} ${y}L${x + 6 * s} ${y - 6 * s}A${16 * s} ${6 * s} 0 1 0 ${x + 12 * s} ${y - 3 * s}Z`;
  return (
    paint(ellipse(x, y + 1.5, 17 * s, 5 * s), '#2c4a46', 0.5) +
    inked(pad, '#26402e', 1.4) + paint(pad, '#5e8e58') + paint(ellipse(x - 4 * s, y - 2 * s, 9 * s, 2.6 * s), '#86b070', 0.7) +
    (flower ? paint(`M${x - 6} ${y - 3}l2-8 3 5 2-7 3 7 3-5 2 8Z`, '#f0b8c4') + paint(`M${x - 3} ${y - 3}l2-5 2 4 2-4 2 5Z`, '#fbe2e8') + dots([[x, y - 4]], '#f0c850', 2.4) : '')
  );
}

function mossyLog(x: number, y: number, len: number): string {
  const log = `M${x} ${y - 12}H${x + len}A6 6 0 0 1 ${x + len} ${y}H${x}Z`;
  const end = ellipse(x, y - 6, 4.5, 6);
  return (
    inked(log + end, '#2a2a20', 1.8) +
    paint(log, '#7a6248') + paint(`M${x} ${y - 5}H${x + len + 4}V${y}H${x}Z`, '#5a4636', 0.8) +
    paint(`M${x + 6} ${y - 12}q${len * 0.3} -5 ${len * 0.6} -1q${len * 0.2} 2 ${len * 0.34} 0v4H${x + 6}Z`, '#7c9a4a') +
    paint(end, '#c09a6a') + stroke(ellipse(x, y - 6, 2.4, 3.4), '#8a6a48', 0.9) +
    dots([[x + len * 0.3, y - 13.5], [x + len * 0.55, y - 14], [x + len * 0.8, y - 13]], '#a8c46c', 3)
  );
}

function marshNearArt(): Art {
  const R = rng(91);
  const at = (x: number) => curveAt(marshNearBank, x);
  const water = `M-20 278H${W + 20}V${BOTTOM}H-20Z`;
  const g = linearAbs([[0, '#6f8f88'], [1, '#4c6e68']], 0, 278, 0, 320);
  const glints = Array.from({ length: 30 }, () => `M${r1(380 + R() * 1200)} ${r1(282 + R() * 30)}h${r1(6 + R() * 16)}`).join('');
  const moss = blades(scatter(R, 90, 380, 1580, at, 2, 16), 7, R);
  return strip(
    `<defs>${g.def}</defs><path d="${water}" fill="${g.url}"/>` +
      stroke(glints, '#c4d6cc', 1.3, 0.6) +
      lilyPad(452, 296, 1, false) + lilyPad(800, 292, 1.1, true) + lilyPad(842, 300, 0.8, false) + lilyPad(1250, 298, 1, true) +
      mass(hill(marshNearBank), curve(marshNearBank), { top: '#6c7a46', base: '#5e6c3e', shade: '#3f5040', light: '#94a462', ink: '#2c3324', inkW: 2, shadeW: 22, shadeO: 0.6 }, 276, 312) +
      stroke(moss, '#7e9250', 1.4, 0.8) +
      cattails(560, at(560) + 4, 1, R) +
      mossyLog(640, at(640) + 6, 52) +
      boulder(990, at(990) + 5, 30, 16, '#8a8c7a', '#2c3324', 1.8, R, ['#6e8a44', '#9ab45e']) +
      cattails(1030, at(1030) + 4, 1.1, R) +
      cattails(1440, at(1440) + 4, 0.9, R) +
      bush(1150, at(1150) + 3, 1, { base: '#6e8a4c', dark: '#4e6a40', light: '#94ae68', trunk: '#5e4e3a', ink: '#2c3324' }, R, 1.8),
  );
}

// ---------------------------------------------------------------------------------------------
// Snowy pines: glittering peaks, snow-laden forests, a cabin, a frozen fall and a frozen pond
// ---------------------------------------------------------------------------------------------

const snowFarPts: P[] = [[0, 178], [70, 120], [120, 140], [190, 72], [250, 112], [300, 98], [370, 150], [440, 60], [520, 120], [570, 104], [640, 158], [720, 82], [790, 126], [860, 50], [960, 150], [1030, 100], [1080, 118], [1160, 64], [1250, 150], [1320, 98], [1380, 120], [1450, 76], [1600, 146]];
const snowFoot: P[] = [[0, 220], [120, 190], [260, 212], [400, 178], [560, 214], [700, 184], [860, 216], [1010, 186], [1160, 214], [1300, 182], [1460, 210], [1600, 198]];

function snowFarArt(): Art {
  const R = rng(101);
  const forestD = forest(R, 260, 380, 1580, (x) => curveAt(snowFoot, x), 6, 40, 8);
  return strip(
    range(snowFarPts, { top: '#8c9cc0', base: '#b4c1dc', shade: '#55669f', shadeO: 0.42, light: '#ffffff', ink: '#8496bd', inkW: 1.1, snow: '#f6f8fd', snowLine: 165 }, 7) +
      wash('#e8eef7', 120, 230, 0.5) +
      mass(hill(snowFoot), curve(snowFoot), { top: '#dfe7f3', base: '#d3ddee', shade: '#97a8cc', light: '#ffffff', ink: '#9aaccc', inkW: 1.1, shadeW: 22, shadeO: 0.55 }, 178, 260) +
      paint(forestD, '#6c7ea8', 0.6) +
      wash('#e8eef7', 190, 300, 0.85),
  );
}

const snowMidHill: P[] = [[0, 232], [160, 208], [340, 240], [540, 202], [740, 240], [940, 210], [1140, 242], [1340, 206], [1500, 234], [1600, 222]];

function cabin(x: number, y: number): string {
  const ink = '#2a2a3a';
  const walls = `M${x - 16} ${y}V${y - 16}H${x + 16}V${y}Z`;
  const roof = `M${x - 21} ${y - 14}L${x} ${y - 30}L${x + 21} ${y - 14}Z`;
  const snowRoof = `M${x - 23} ${y - 13}Q${x - 20} ${y - 17} ${x - 18} ${y - 17}L${x} ${y - 32}L${x + 18} ${y - 17}Q${x + 22} ${y - 17} ${x + 23} ${y - 13}Q${x + 14} ${y - 15} ${x + 10} ${y - 14}Q${x} ${y - 18} ${x - 8} ${y - 14}Q${x - 16} ${y - 16} ${x - 23} ${y - 13}Z`;
  return (
    inked(walls + roof + `M${x + 7} ${y - 22}h5v-10h-5Z`, ink, 1.4) +
    paint(walls, '#8a5e40') + paint(`M${x + 2} ${y}V${y - 16}H${x + 16}V${y}Z`, '#66452e') +
    stroke(`M${x - 16} ${y - 5}H${x + 16}M${x - 16} ${y - 10}H${x + 16}`, '#4e3424', 0.8, 0.7) +
    paint(`M${x - 11} ${y - 11}h6v6h-6Z`, '#f6c860') + paint(`M${x - 11} ${y - 11}h6v6h-6Z`, '#fff0b0', 0.3) +
    paint(`M${x + 5} ${y}v-10h6v10Z`, '#4a3020') +
    paint(roof, '#5c4a52') + paint(`M${x + 7} ${y - 22}h5v-10h-5Z`, '#7a6a6a') +
    paint(snowRoof, '#f6f9fe') + paint(`M${x} ${y - 32}L${x + 18} ${y - 17}Q${x + 22} ${y - 17} ${x + 23} ${y - 13}Q${x + 14} ${y - 15} ${x + 10} ${y - 14}Q${x + 4} ${y - 16} ${x} ${y - 16}Z`, '#c8d4ea') +
    paint(`M${x + 6} ${y - 32}h7v-2h-7Z`, '#f6f9fe') +
    stroke(`M${x + 9.5} ${y - 36}q-4-6 0-11t1-12q-2-5 4-9`, '#eef2f8', 2.6, 0.45) +
    paint(ellipse(x, y + 1, 24, 3), '#f2f6fc')
  );
}

/** Split logs stacked by the cabin wall, with snow on top. */
function woodpile(x: number, y: number): string {
  const logs: P[] = [[x, y - 3], [x + 6, y - 3], [x + 12, y - 3], [x + 3, y - 8.5], [x + 9, y - 8.5]];
  return (
    paint(`M${x - 3.5} ${y}h19v-12h-19Z`, '#4a3428') +
    dots(logs, '#2e2a30', 6.4) + dots(logs, '#c49a6a', 4.6) + dots(logs.map(([a, b]): P => [a - 0.6, b - 0.6]), '#e2c294', 1.6) +
    paint(`M${x - 4} ${y - 11}q4-4 10-2q5-3 10 0q3 0 4 2Z`, '#f6f9fe')
  );
}

function snowMidArt(): Art {
  const R = rng(111);
  const at = (x: number) => curveAt(snowMidHill, x);
  const pineCol: Needle = { base: '#2f5670', dark: '#22405a', light: '#5a809a', trunk: '#4a3a38', ink: '#1d2c44', snow: '#f4f7fc', snowShade: '#b8c8e4' };
  const xs = [400, 432, 470, 520, 556, 610, 650, 800, 836, 880, 930, 975, 1015, 1060, 1100, 1150, 1196, 1236, 1380, 1430, 1470, 1520, 1556];
  const pines = xs.map((x, i) => pine(x + (R() - 0.5) * 14, at(x) + 4, 26 + ((i * 7) % 5) * 7 + R() * 14, pineCol, 1.3, 4)).join('');
  const drift = curve(snowMidHill.map(([x, y]): P => [x, y + 18]));
  return strip(
    mass(hill(snowMidHill), curve(snowMidHill), { top: '#f0f4fb', base: '#e2e9f5', shade: '#a6b6d8', light: '#ffffff', ink: '#8496bc', inkW: 1.4, shadeW: 24, shadeO: 0.7 }, 200, 270,
      stroke(drift, '#c4d0e8', 5, 0.4)) +
      boulder(1296, at(1296) + 5, 46, 24, '#7f88a2', '#2e3650', 1.3, R, ['#f4f7fc', '#c4d0e8']) +
      boulder(1330, at(1330) + 5, 28, 14, '#7f88a2', '#2e3650', 1.3, R, ['#f4f7fc', '#c4d0e8']) +
      cabin(720, at(720) + 4) +
      woodpile(752, at(752) + 4) +
      pines +
      wash('#eef3fa', 236, 300, 0.45),
  );
}

const snowNearHill: P[] = [[0, 282], [200, 266], [420, 296], [640, 268], [860, 294], [1080, 266], [1300, 294], [1480, 272], [1600, 280]];

function frozenPond(x: number, y: number, rx: number, ry: number): string {
  const d = ellipse(x, y, rx, ry);
  const g = linearAbs([[0, '#9fc2dc'], [1, '#d8e8f4']], 0, y - ry, 0, y + ry);
  return (
    `<defs>${g.def}</defs>` + paint(ellipse(x, y - 1.5, rx + 4, ry + 2.5), '#ffffff') +
    `<path d="${d}" fill="${g.url}"/>` +
    within(d, stroke(`M${x - rx * 0.6} ${y - 1}l${rx * 0.5} -3M${x - rx * 0.1} ${y + 2}l${rx * 0.4} -3M${x + rx * 0.35} ${y - 2}l${rx * 0.3} -2`, '#ffffff', 1.6, 0.8) +
      stroke(`M${x - rx * 0.4} ${y + 3}q${rx * 0.4} -6 ${rx * 0.9} -2`, '#7a9cc0', 0.8, 0.5)) +
    stroke(d, '#5e7aa6', 1.4, 0.8)
  );
}

function snowNearArt(): Art {
  const R = rng(121);
  const at = (x: number) => curveAt(snowNearHill, x);
  const pineCol: Needle = { base: '#2a4f68', dark: '#1d3a52', light: '#527a96', trunk: '#4a3834', ink: '#16233a', snow: '#f6f9fe', snowShade: '#b4c4e2' };
  const twigs = scatter(R, 30, 400, 1580, at, 6, 24).map(([x, y]) => `M${r1(x)} ${r1(y)}l-3-7m3 7l3-8m-3 8v-10`).join('');
  const sparkle = scatter(R, 40, 400, 1580, at, 3, 28);
  return strip(
    mass(hill(snowNearHill), curve(snowNearHill), { top: '#f6f9fe', base: '#e6edf8', shade: '#a4b4d6', light: '#ffffff', ink: '#2a3a5a', inkW: 2, shadeW: 30, shadeO: 0.7 }, 262, 310) +
      stroke(twigs, '#5a4a48', 1.3, 0.7) +
      dots(sparkle, '#ffffff', 2.2, 0.9) +
      pine(470, at(470) + 6, 112, pineCol, 2.2, 5) +
      boulder(540, at(540) + 5, 30, 16, '#8a92aa', '#232a40', 1.8, R, ['#f6f9fe', '#c4d0e8']) +
      frozenPond(860, at(860) + 2, 70, 7) +
      pine(1060, at(1060) + 6, 128, pineCol, 2.2, 5) +
      pine(1128, at(1128) + 6, 86, pineCol, 2, 4) +
      boulder(1240, at(1240) + 5, 40, 20, '#8a92aa', '#232a40', 1.8, R, ['#f6f9fe', '#c4d0e8']) +
      pine(1400, at(1400) + 6, 104, pineCol, 2.2, 5) +
      bush(640, at(640) + 3, 1, { base: '#5a6a7a', dark: '#44505e', light: '#7c8ca0', trunk: '#4a3834', ink: '#232a40' }, R, 1.6, '#c8463a') +
      paint(ellipse(640, at(640) - 6, 14, 4), '#f6f9fe'),
  );
}

// ---------------------------------------------------------------------------------------------
// Ground strips: the road carries the depth lanes, 20 to 64 px below the strip's top edge.
// ---------------------------------------------------------------------------------------------

const GW = 1280;
const GH = 130;
const VERGE_TOP: P[] = [[0, 4], [200, 2.5], [430, 5], [700, 3], [960, 5], [1280, 3.5]];
const ROAD_TOP: P[] = [[0, 16], [240, 12.5], [520, 17], [800, 13], [1060, 17], [1280, 14.5]];
const ROAD_BOT: P[] = [[0, 90], [300, 86.5], [620, 91], [940, 87], [1280, 89.5]];

interface GroundStyle {
  seed: number;
  grass: string;
  grassDark: string;
  grassLight: string;
  blade: string;
  road: string;
  roadDark: string;
  roadLight: string;
  edge: string;
  pebble: string;
  /** How much grass grows along the verges, 1 for a meadow. */
  tufts?: number;
  /** Drawn on the road, clipped to it. */
  road2?: (R: Rand) => string;
  /** Drawn on the front verge. */
  front?: (R: Rand) => string;
  /** Drawn on the back verge. */
  back?: (R: Rand) => string;
}

function ground(s: GroundStyle): Art {
  const R = rng(s.seed);
  const at = (pts: P[]) => (x: number) => curveAt(pts, x, GW);
  const grassG = linearAbs([[0, s.grassLight], [1, s.grass]], 0, 0, 0, 18);
  const frontG = linearAbs([[0, s.grassLight], [0.35, s.grass], [1, s.grassDark]], 0, 86, 0, 130);
  const roadG = linearAbs([[0, s.roadDark], [0.12, s.road], [0.5, s.roadLight], [1, s.road]], 0, 12, 0, 92);
  const roadD = hill(ROAD_TOP, 140, GW);
  const frontD = hill(ROAD_BOT, 140, GW);

  // Packed earth: specks and pebbles, all faint.
  const specks: P[] = [];
  const specksL: P[] = [];
  for (let i = 0; i < 260; i++) specks.push([R() * GW, 16 + R() * 74]);
  for (let i = 0; i < 160; i++) specksL.push([R() * GW, 16 + R() * 74]);
  const peb: P[] = [];
  for (let i = 0; i < 46; i++) peb.push([20 + R() * (GW - 40), 20 + R() * 66]);
  const ruts = [32, 68].map((y) => curve([[0, y], [320, y - 3], [640, y + 1], [960, y - 2], [1280, y]], GW)).join('');
  const ridges = [37, 73].map((y) => curve([[0, y], [320, y - 3], [640, y + 1], [960, y - 2], [1280, y]], GW)).join('');
  const tufts = s.tufts ?? 1;
  const backBlades = blades(scatter(R, Math.round(110 * tufts), 0, GW, at(ROAD_TOP), -1, 0), 6, R);
  const frontBlades = blades(scatter(R, Math.round(140 * tufts), 0, GW, at(ROAD_BOT), 1, 3), 8, R);
  const lowBlades = blades(scatter(R, Math.round(70 * tufts), 0, GW, () => 104, 0, 26), 9, R);

  const body =
    `<defs>${grassG.def}${frontG.def}${roadG.def}</defs>` +
    `<path d="${hill(VERGE_TOP, 140, GW)}" fill="${grassG.url}"/>` +
    (s.back ? s.back(R) : '') +
    `<path d="${roadD}" fill="${roadG.url}"/>` +
    within(
      roadD,
      stroke(ruts, s.roadDark, 7, 0.32) +
        stroke(ridges, s.roadLight, 2.2, 0.45) +
        dots(specks, s.roadDark, 1.6, 0.3) +
        dots(specksL, s.roadLight, 1.4, 0.45) +
        dots(peb.map(([x, y]): P => [x + 0.8, y + 0.9]), s.roadDark, 4.6, 0.45) +
        dots(peb, s.pebble, 3.6, 0.85) +
        dots(peb.map(([x, y]): P => [x - 0.7, y - 0.8]), '#fff8e8', 1.2, 0.5) +
        (s.road2 ? s.road2(R) : '') +
        stroke(curve(ROAD_TOP.map(([x, y]): P => [x, y + 2.5]), GW), s.roadDark, 5, 0.35),
    ) +
    stroke(curve(ROAD_TOP, GW), s.edge, 2.4) +
    stroke(backBlades, s.blade, 1.3, 0.85) +
    `<path d="${frontD}" fill="${frontG.url}"/>` +
    stroke(curve(ROAD_BOT, GW), s.edge, 2.4) +
    stroke(frontBlades, s.blade, 1.5, 0.9) +
    stroke(lowBlades, s.grassDark, 1.5, 0.6) +
    (s.front ? s.front(R) : '') +
    stroke(curve(VERGE_TOP, GW), s.edge, 1.8, 0.55);
  return { svg: svg(GW, GH, body), w: GW, h: GH, px: 0, py: 0 };
}

const flowersAt = (R: Rand, n: number, y0: number, y1: number): P[] => Array.from({ length: n }, (): P => [20 + R() * (GW - 40), y0 + R() * (y1 - y0)]);

const meadowGround = ground({
  seed: 201, grass: '#7aa250', grassDark: '#628a44', grassLight: '#8fb35c', blade: '#4f7d40',
  road: '#bb9768', roadDark: '#94704a', roadLight: '#d0b07e', edge: '#3a2c1e', pebble: '#ddc59a',
  road2: (R) => stroke(blades(Array.from({ length: 30 }, (): P => [R() * GW, 50 + R() * 6]), 4, R), '#8a9a5a', 1.1, 0.4),
  front: (R) => {
    const f = flowersAt(R, 46, 100, 126);
    return dots(f.slice(0, 18), '#f6eed6', 4.4) + dots(f.slice(0, 18), '#f0c84a', 1.6) + dots(f.slice(18, 32), '#f0c040', 4) + dots(f.slice(32), '#cf5a3a', 4) + dots(f.slice(32), '#f6b07a', 1.4);
  },
  back: (R) => dots(flowersAt(R, 12, 6, 12), '#f6eed6', 2.6, 0.8),
});

const canyonGround = ground({
  seed: 202, grass: '#cc8656', grassDark: '#b06c44', grassLight: '#dc9c68', blade: '#9a8248',
  road: '#e0b583', roadDark: '#c08e5e', roadLight: '#efcd9e', edge: '#4a2c1e', pebble: '#f4dcb2', tufts: 0.35,
  road2: (R) => {
    let cracks = '';
    for (let i = 0; i < 18; i++) {
      const x = R() * GW;
      const y = 22 + R() * 60;
      cracks += `M${r1(x)} ${r1(y)}l${r1(6 + R() * 8)} ${r1(R() * 4 - 2)}l${r1(4 + R() * 6)} ${r1(R() * 6 - 3)}m${r1(-6)} 0l${r1(2)} ${r1(4 + R() * 3)}`;
    }
    return stroke(cracks, '#b07e52', 1, 0.45);
  },
  front: (R) => {
    const st = flowersAt(R, 12, 104, 124);
    const grit = flowersAt(R, 80, 96, 128);
    return dots(grit, '#b8704a', 2, 0.5) +
      dots(st.map(([x, y]): P => [x + 1.5, y + 1.5]), '#7a3a26', 10, 0.45) + dots(st, '#b0603e', 9) + dots(st.map(([x, y]): P => [x - 2, y - 2]), '#e09a70', 3.4, 0.8);
  },
});

const marshGround = ground({
  seed: 203, grass: '#62703f', grassDark: '#4e5c36', grassLight: '#76844c', blade: '#3e5232',
  road: '#8c785a', roadDark: '#6c5a42', roadLight: '#a08c6a', edge: '#2c2a1e', pebble: '#a8987a',
  road2: (R) => {
    let out = '';
    for (const [x, y, rx] of [[420, 46, 44], [760, 66, 36], [1040, 40, 50], [1200, 72, 28], [300, 74, 26]] as const) {
      const w = rx + R() * 6;
      out += paint(ellipse(x, y, w + 3, 6.5), '#5e4c38', 0.4) + paint(ellipse(x, y + 0.6, w, 5.2), '#6f817c', 0.55) +
        stroke(`M${x - w * 0.6} ${y - 1}h${w * 0.5}M${x + w * 0.1} ${y + 1.5}h${w * 0.35}`, '#c6d4c8', 1.4, 0.5);
    }
    return out;
  },
  front: (R) => {
    const pools = paint(ellipse(240, 114, 58, 7.5), '#3c5a58') + paint(ellipse(236, 112, 44, 4), '#6f8c88', 0.6) +
      paint(ellipse(880, 118, 66, 7.5), '#3c5a58') + paint(ellipse(874, 116, 50, 4), '#6f8c88', 0.6);
    const f = flowersAt(R, 14, 102, 126);
    return pools + stroke(ellipse(240, 114, 58, 7.5) + ellipse(880, 118, 66, 7.5), '#2c2a1e', 1.6, 0.7) + dots(f, '#e8d880', 3.4, 0.9);
  },
});

const snowGround = ground({
  seed: 204, grass: '#e6edf8', grassDark: '#cdd8ea', grassLight: '#f6f9fe', blade: '#8a96ae',
  road: '#b7c5da', roadDark: '#94a5c0', roadLight: '#cdd8e8', edge: '#28324c', pebble: '#e6edf8', tufts: 0.12,
  road2: (R) => {
    const tracks = [26, 30, 58, 62].map((y) => curve([[0, y], [400, y - 2], [800, y + 1.5], [1280, y]], GW)).join('');
    const prints: P[] = [];
    for (let x = 10; x < GW; x += 16 + R() * 4) prints.push([x, 46 + (prints.length % 2 ? 3 : -3)]);
    return stroke(tracks, '#8496b4', 2.2, 0.45) + stroke(tracks.replace(/M(\S+) (\S+)/g, (_m, a, b) => `M${a} ${Number(b) + 1.6}`), '#e6edf8', 1, 0.6) +
      dots(prints, '#8a9cba', 4, 0.35);
  },
  front: (R) => {
    const drifts = flowersAt(R, 10, 104, 120);
    return drifts.map(([x, y]) => paint(ellipse(x, y, 26, 5), '#ffffff', 0.7) + paint(ellipse(x + 6, y + 3, 20, 2.5), '#b9c7de', 0.5)).join('') + dots(flowersAt(R, 30, 98, 126), '#ffffff', 2, 0.9);
  },
});

// ---------------------------------------------------------------------------------------------

/** Sky colours from the zenith down to the glow behind the horizon: [zenith, upper, horizon, glow]. */
export type SkyStops = [string, string, string, string];

export const LANDSCAPE_ART: Record<
  'meadow' | 'canyon' | 'marsh' | 'snowpine',
  { far: Art; mid: Art; near: Art; ground: Art; tint: { day: SkyStops; dusk: SkyStops; night: SkyStops } }
> = {
  meadow: {
    far: meadowFarArt(),
    mid: meadowMidArt(),
    near: meadowNearArt(),
    ground: meadowGround,
    tint: {
      day: ['#4f98c8', '#86bedb', '#cfe6e2', '#f2f0d6'],
      dusk: ['#3d3f74', '#8a5c88', '#e88f68', '#f8c27a'],
      night: ['#0d1532', '#18264c', '#2e416a', '#43567e'],
    },
  },
  canyon: {
    far: canyonFarArt(),
    mid: canyonMidArt(),
    near: canyonNearArt(),
    ground: canyonGround,
    tint: {
      day: ['#4a90c0', '#82b8d4', '#eed4ae', '#f8e2bc'],
      dusk: ['#4a2a56', '#9a4a64', '#ee7e48', '#f8b45e'],
      night: ['#150f2c', '#251a40', '#4c3352', '#5e4258'],
    },
  },
  marsh: {
    far: marshFarArt(),
    mid: marshMidArt(),
    near: marshNearArt(),
    ground: marshGround,
    tint: {
      day: ['#7f9fa2', '#a2bab4', '#d4dac4', '#e4e4cc'],
      dusk: ['#3e4458', '#74667a', '#c4967a', '#d8b086'],
      night: ['#0e181e', '#182830', '#2e423e', '#3c544a'],
    },
  },
  snowpine: {
    far: snowFarArt(),
    mid: snowMidArt(),
    near: snowNearArt(),
    ground: snowGround,
    tint: {
      day: ['#5f92cc', '#97badf', '#d8e6f2', '#f0f4f6'],
      dusk: ['#29306a', '#6a5890', '#d48ca2', '#f2b8a6'],
      night: ['#080f2a', '#12204a', '#283c6c', '#3a4e80'],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Clouds: soft cumulus puffs, lit from the upper left with a cool, flat underside.
// ---------------------------------------------------------------------------------------------

function cloud(w: number, h: number, puffs: Puff[], baseY: number): Art {
  const xs = puffs.map(([x, , r]) => [x - r, x + r]).flat();
  const x0 = Math.min(...xs) + 8;
  const x1 = Math.max(...xs) - 8;
  // The flat base runs the same way round as the puffs (counter-clockwise), so the union has no holes.
  const sil = puffs.map(([x, y, r]) => circle(x, y, r)).join('') + `M${x0} ${baseY - 14}a7 7 0 0 0 0 14h${x1 - x0}a7 7 0 0 0 0-14Z` + ellipse((x0 + x1) / 2, baseY - 18, (x1 - x0) / 2 - 6, 16);
  const sorted = [...puffs].sort((a, b) => a[1] - b[1]);
  const shade = '#c9c7dc';
  const base = '#f6f3ec';
  const under = linearAbs([[0, shade, 0], [1, '#aeadc8', 0.95]], 0, baseY - 26, 0, baseY + 2);
  const inner =
    sorted.map(([x, y, r]) => paint(circle(x + r * 0.12, y + r * 0.16, r), shade) + paint(circle(x - r * 0.05, y - r * 0.07, r * 0.93), base)).join('') +
    paint(sorted.map(([x, y, r]) => circle(x - r * 0.28, y - r * 0.32, r * 0.55)).join(''), '#fffdf7', 0.6) +
    `<defs>${under.def}</defs><rect x="0" y="${baseY - 26}" width="${w}" height="${30}" fill="${under.url}"/>`;
  return {
    svg: svg(w, h, `<path d="${sil}" fill="${base}" stroke="${base}" stroke-width="7" stroke-linejoin="round" opacity="0.3"/>` + paint(sil, base) + within(sil, inner)),
    w,
    h,
    px: w / 2,
    py: h / 2,
  };
}

export const CLOUDS: Art[] = [
  cloud(220, 100, [[50, 66, 24], [86, 46, 30], [128, 52, 28], [166, 66, 20], [108, 70, 22]], 84),
  cloud(250, 110, [[44, 78, 20], [78, 60, 26], [120, 46, 34], [164, 62, 27], [200, 78, 17], [140, 78, 22]], 94),
  cloud(200, 90, [[42, 58, 20], [76, 42, 26], [114, 48, 24], [148, 60, 17], [96, 62, 18]], 74),
  cloud(150, 64, [[34, 42, 14], [60, 32, 19], [92, 36, 16], [118, 44, 12]], 54),
];
