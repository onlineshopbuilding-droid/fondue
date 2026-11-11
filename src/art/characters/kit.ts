import { svg } from '../types';
import type { Anim, RigPart } from '../types';
import { crescent, glint, linear, lit, litTube, paint, stroke, tone, within } from '../shade';
import type { LitOptions } from '../shade';

/**
 * Shared drawing kit for the felt-puppet characters. Every part body is written in joint-local
 * coordinates: (0,0) is the pivot, x to the right, y down. `part` turns that into an Art.
 */
export const INK = '#2b2118';
export const OUTLINE = 3.5;

export const PAL = {
  teal: '#3e8585',
  tealD: '#2b6064',
  tealL: '#74b0a6',
  rust: '#b4552d',
  rustD: '#873c22',
  copper: '#c9773c',
  copperL: '#e6a468',
  mustard: '#d9a83f',
  mustardD: '#a97d2a',
  cream: '#efe3c6',
  creamD: '#d0bf97',
  forest: '#4a7044',
  forestD: '#335236',
  plum: '#724369',
  plumD: '#4e2e4c',
  plumL: '#a0729a',
  skin: '#e6ba91',
  skinD: '#c9956c',
  soot: '#8b6d57',
  sootD: '#4d4138',
  wood: '#a0713f',
  woodD: '#6f4b2c',
  iron: '#5f6461',
  ironL: '#8d928b',
  ash: '#55555f',
  ashL: '#787884',
  ashD: '#2f2d33',
  raven: '#433d59',
  ravenL: '#6a6386',
  amber: '#f2b33d',
  amberL: '#ffe09a',
  ember: '#e8742c',
  pale: '#e6fbf3',
  snow: '#f1f6f5',
  ice: '#d0e4ec',
  iceD: '#9dc2d4',
  slate: '#54778e',
  slateD: '#3b566b',
  // The mice and rats under the costumes.
  fur: '#b9a48a',
  furD: '#93806b',
  furL: '#e6d8c0',
  rat: '#9c897b',
  ratD: '#756259',
  ratL: '#c4b2a3',
  earPink: '#eaa9a0',
  nosePink: '#e8808a',
  tailPink: '#e0a596',
  tailRat: '#c98f86',
} as const;

/** [left, top, right, bottom] of the part's canvas, in joint-local coordinates. */
export type Box = readonly [number, number, number, number];

export function part(
  name: string,
  x: number,
  y: number,
  anim: Anim,
  box: Box,
  body: string,
  outline: number = OUTLINE,
): RigPart {
  const [left, top, right, bottom] = box;
  const w = right - left;
  const h = bottom - top;
  const inner =
    `<g transform="translate(${-left} ${-top})" fill="none" stroke="${INK}" ` +
    `stroke-width="${outline}" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
  return { name, x, y, anim, art: { svg: svg(w, h, inner), w, h, px: -left, py: -top } };
}

/** Outlined closed shape. */
export const shape = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;

/** Outline only, used to re-ink a shape after painting stripes over it. */
export const ink = (d: string, width?: number): string =>
  `<path d="${d}"${width === undefined ? '' : ` stroke-width="${width}"`}/>`;

/** Unoutlined fill for shading and painted decoration. */
export const flat = (d: string, fill: string, opacity?: number): string =>
  `<path d="${d}" fill="${fill}" stroke="none"${opacity === undefined ? '' : ` opacity="${opacity}"`}/>`;

export const circle = (cx: number, cy: number, r: number, fill: string): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

export const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;

export const rect = (x: number, y: number, w: number, h: number, fill: string, r = 3): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;

/** Unoutlined circle: eyes, rivets, glows. */
export const dot = (cx: number, cy: number, r: number, fill: string = INK, opacity?: number): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="none"${opacity === undefined ? '' : ` opacity="${opacity}"`}/>`;

/** Plain stroked line in any colour. */
export const line = (d: string, width = 2, color: string = INK): string =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}"/>`;

/** Felt stitching. */
export const stitch = (d: string, color: string = PAL.cream): string =>
  `<path d="${d}" stroke="${color}" stroke-width="1.6" stroke-dasharray="3 3.4" stroke-linecap="butt"/>`;

/** A chunky outlined limb following a centre line. */
export const tube = (d: string, w: number, color: string, outline: number = OUTLINE): string =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w + outline * 2}"/>` +
  `<path d="${d}" stroke="${color}" stroke-width="${w}"/>`;

/** The brass split pin that holds a puppet's limb on. */
export const pin = (x = 0, y = 0): string =>
  `<circle cx="${x}" cy="${y}" r="2.4" fill="${PAL.mustard}" stroke-width="1.5"/>`;

/** Hip at the origin, sole `len` below it (so a part at y = -len stands on the ground). */
export function leg(len: number, w: number, cloth: string, boot: string, toe = 7): string {
  const sole = len - 2;
  const ankle = Math.max(sole - 9, 1);
  const half = w / 2 + 2;
  return (
    tube(`M0 0 L0 ${ankle}`, w, cloth) +
    shape(`M${half} ${ankle} L${half} ${sole} L${-half - toe} ${sole} Q${-half - toe - 2} ${ankle + 2} ${-half} ${ankle} Z`, boot)
  );
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

/** Closed shaggy outline: an ellipse with `tufts` hooked tufts that droop by `droop`. */
export function fur(cx: number, cy: number, rx: number, ry: number, tufts: number, amp = 0.14, droop = 0): string {
  const at = (angle: number, scale: number): [number, number] => [cx + Math.cos(angle) * rx * scale, cy + Math.sin(angle) * ry * scale];
  const step = (Math.PI * 2) / tufts;
  const [sx, sy] = at(0, 1);
  let d = `M${r1(sx)} ${r1(sy)}`;
  for (let i = 0; i < tufts; i++) {
    const [qx, qy] = at(i * step, 1 + amp * 0.9);
    const [tx, ty] = at((i + 0.55) * step, 1 + amp);
    const [vx, vy] = at((i + 1) * step, 1);
    d += ` Q${r1(qx)} ${r1(qy)} ${r1(tx)} ${r1(ty + droop)} L${r1(vx)} ${r1(vy)}`;
  }
  return `${d} Z`;
}

/** Several overlapping shapes painted as one silhouette with a single outer outline. */
export function union(paths: string[], fill: string, outline: number = OUTLINE): string {
  const under = paths.map((d) => `<path d="${d}" fill="${fill}" stroke-width="${outline * 2}"/>`).join('');
  const over = paths.map((d) => `<path d="${d}" fill="${fill}" stroke="none"/>`).join('');
  return under + over;
}

/* ---- Shaded felt-puppet helpers (built on ../shade, light from the upper left) ---- */

/** Ellipse as path data, so it can be shaded with lit() and used as a clip with within(). */
export const oval = (cx: number, cy: number, rx: number, ry: number = rx): string =>
  `M${r1(cx - rx)} ${r1(cy)}A${rx} ${ry} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${rx} ${ry} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`;

/** Rounded rectangle as path data. */
export function rrect(x: number, y: number, w: number, h: number, r = 0): string {
  const q = Math.min(r, w / 2, h / 2);
  const R = x + w;
  const B = y + h;
  return (
    `M${r1(x + q)} ${y}H${r1(R - q)}Q${R} ${y} ${R} ${r1(y + q)}V${r1(B - q)}Q${R} ${B} ${r1(R - q)} ${B}` +
    `H${r1(x + q)}Q${x} ${B} ${x} ${r1(B - q)}V${r1(y + q)}Q${x} ${y} ${r1(x + q)} ${y}Z`
  );
}

const inkPath = (d: string, w: number, color: string = INK): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;

/** Felt piece: base fill, form shading, `details` painted inside the shape, then the outline on top. */
export function felt(d: string, base: string, details = '', o: LitOptions = {}): string {
  const w = o.outline ?? OUTLINE;
  return lit(d, base, { ...o, outline: 0 }) + (details ? within(d, details) : '') + (w > 0 ? inkPath(d, w, o.ink) : '');
}

/** Metal piece: a sheen gradient lit from the upper left, a shadow crescent, details, outline. */
export function metal(d: string, base: string, details = '', o: LitOptions = {}): string {
  const g = linear([[0, tone(base, 0.55)], [0.4, base], [1, tone(base, -0.38)]], 55);
  const w = o.outline ?? OUTLINE;
  const s = o.shadow ?? 2.4;
  return (
    g.def +
    `<path d="${d}" fill="${g.url}" stroke="none"/>` +
    (s > 0 ? crescent(d, -s, -s * 1.1, tone(base, -0.32), 0.85) : '') +
    (details ? within(d, details) : '') +
    (w > 0 ? inkPath(d, w, o.ink) : '')
  );
}

/** Painted crease in a darker shade of the cloth (not ink, so silhouettes stay clean). */
export const fold = (d: string, base: string, w = 1.3, opacity = 0.75): string => stroke(d, tone(base, -0.34), w, opacity);

/** Fine painted running stitch. */
export const seam = (d: string, color: string = PAL.cream, w = 1.2, opacity = 0.9): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="2.2 2.1" stroke-linecap="round"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;

/** Warm rim light along an upper edge. */
export const rim = (d: string, w = 1.4, opacity = 0.55): string => stroke(d, '#fff3d1', w, opacity);

/** The brass split pin, shaded and with a glint. */
export const brassPin = (x = 0, y = 0, r = 2.7): string =>
  lit(oval(x, y, r), PAL.mustard, { outline: 1.5, shadow: r * 0.42, light: r * 0.3, lightK: 0.45 }) +
  dot(x + 0.3, y + 0.3, r * 0.3, PAL.mustardD) +
  glint(x - r * 0.42, y - r * 0.45, r * 0.24);

/** An iron rivet head with a tiny highlight. */
export const rivet = (x: number, y: number, r = 1.3, base: string = PAL.iron): string =>
  dot(x, y, r, tone(base, -0.45)) + dot(x - r * 0.3, y - r * 0.35, r * 0.45, '#fff3d1', 0.85);

/** A shaded felt hand (mitten); curled finger hints sit on the lower left. */
export function hand(cx: number, cy: number, r: number, skin: string = PAL.skin): string {
  const k = tone(skin, -0.38);
  return (
    lit(oval(cx, cy, r), skin, { shadow: r * 0.36, light: r * 0.2 }) +
    stroke(`M${r1(cx - r * 0.78)} ${r1(cy + r * 0.05)} Q${r1(cx - r * 0.45)} ${r1(cy + r * 0.32)} ${r1(cx - r * 0.12)} ${r1(cy + r * 0.12)}`, k, 1.1, 0.8) +
    stroke(`M${r1(cx - r * 0.6)} ${r1(cy + r * 0.45)} Q${r1(cx - r * 0.3)} ${r1(cy + r * 0.68)} ${r1(cx + r * 0.02)} ${r1(cy + r * 0.48)}`, k, 1.1, 0.7)
  );
}

/** A shiny bead eye. */
export const bead = (x: number, y: number, r = 2): string => dot(x, y, r) + dot(x - r * 0.36, y - r * 0.4, r * 0.4, '#fffaf0');

/** An ink brow; draw it from the outer to the inner end. */
export const brow = (d: string, w = 2.2): string => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Cheek blush. */
export const blush = (x: number, y: number, rx = 3.2, ry = 2.2, opacity = 0.32): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${PAL.rust}" stroke="none" opacity="${opacity}"/>`;

/** Shaded version of `leg`: same footprint, with trouser shading, a turned boot cuff, a sole and a toe shine. */
export function litLeg(len: number, w: number, cloth: string, boot: string, toe = 7, extra = ''): string {
  const sole = len - 2;
  const ankle = Math.max(sole - 9, 1);
  const half = w / 2 + 2;
  const bootD = `M${half} ${ankle} L${half} ${sole} L${-half - toe} ${sole} Q${-half - toe - 2} ${ankle + 2} ${-half} ${ankle} Z`;
  const dark = tone(boot, -0.42);
  return (
    litTube(`M0 0 L0 ${ankle}`, w, cloth, { shadow: w * 0.34, light: w * 0.17 }) +
    extra +
    felt(
      bootD,
      boot,
      paint(`M${-half - toe - 4} ${r1(sole - 2.4)} H${half + 2} V${sole + 2} H${-half - toe - 4} Z`, dark) +
        paint(`M${-half - 3} ${ankle - 2} H${half + 2} V${r1(ankle + Math.min(2.6, (sole - ankle) * 0.35))} H${-half - 3} Z`, tone(boot, 0.2)) +
        // Toe cap seam, a lace strap across the instep and a shine on the toe.
        stroke(`M${r1(-half + 1.5)} ${r1(sole - 2.4)} Q${r1(-half + 0.5)} ${r1(sole - 6)} ${r1(-half - 2)} ${r1(ankle + 2.4)}`, dark, 1.1, 0.8) +
        stroke(`M${r1(-half + 0.5)} ${r1(ankle + 3.4)} L${r1(half - 1)} ${r1(ankle + 3)}`, dark, 1.3, 0.65) +
        stroke(`M${r1(-half - 1)} ${r1(sole - 3.8)} Q${r1(-half - toe * 0.5)} ${r1(sole - 5.8)} ${r1(-half - toe + 1)} ${r1(sole - 3.6)}`, '#fff3d1', 1.4, 0.5),
      { shadow: 2.2, light: 1.3, lightK: 0.32 },
    )
  );
}

/** A twisted rope or cord along a quadratic curve P0-P1-P2: shaded body plus twist marks. */
export function rope(p0: [number, number], p1: [number, number], p2: [number, number], w: number, color: string, outline = 2): string {
  const d = `M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1],
  ];
  const len = Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) + 1;
  const n = Math.max(3, Math.round(len / (w * 0.9)));
  let marks = '';
  for (let i = 1; i < n; i++) {
    const [x, y] = at(i / n);
    const [x2, y2] = at(Math.min(1, i / n + 0.01));
    const a = Math.atan2(y2 - y, x2 - x);
    // Twist marks lean across the rope.
    const dx = Math.cos(a + 1.0) * w * 0.55;
    const dy = Math.sin(a + 1.0) * w * 0.55;
    marks += `M${r1(x - dx)} ${r1(y - dy)} L${r1(x + dx)} ${r1(y + dy)} `;
  }
  return litTube(d, w, color, { outline, shadow: w * 0.3, light: w * 0.18 }) + stroke(marks, tone(color, -0.4), 0.9, 0.85);
}

/* ---- Mouse and rat building blocks: the army under the knight costumes ---- */

/** The coat of one animal: fur, its shadow side, the pale muzzle, ear lining, nose and bare tail. */
export interface Coat {
  fur: string;
  furD: string;
  muzzle: string;
  ear: string;
  nose: string;
  tail: string;
}

/** Light, quick troops are mice. */
export const MOUSE: Coat = { fur: PAL.fur, furD: PAL.furD, muzzle: PAL.furL, ear: PAL.earPink, nose: PAL.nosePink, tail: PAL.tailPink };
/** Heavy and sinister troops are rats: darker fur, longer snout, bare ringed tail. */
export const RAT: Coat = { fur: PAL.rat, furD: PAL.ratD, muzzle: PAL.ratL, ear: tone(PAL.earPink, -0.14), nose: PAL.nosePink, tail: PAL.tailRat };

/** A big round ear with a pink cup. `back` is the far ear: darker, so the near one reads in front. */
export function mouseEar(cx: number, cy: number, r: number, c: Coat, o: { outline?: number; back?: boolean } = {}): string {
  const fur = o.back ? c.furD : c.fur;
  const pink = o.back ? tone(c.ear, -0.2) : c.ear;
  const cup = oval(r1(cx - r * 0.06), r1(cy + r * 0.1), r1(r * 0.62));
  return (
    lit(oval(cx, cy, r), fur, { outline: o.outline ?? 3, shadow: r * 0.3, light: r * 0.2 }) +
    paint(cup, pink) +
    // The rim shades the upper left of the cup; the lower right catches the light.
    crescent(cup, r * 0.2, r * 0.24, tone(pink, -0.32), 0.75) +
    crescent(cup, -r * 0.1, -r * 0.12, tone(pink, 0.4), 0.6)
  );
}

export interface SnoutOptions {
  /** How far the tip sits below the base line. */
  drop?: number;
  outline?: number;
  /** Whisker length; 0 for none. */
  whiskers?: number;
  whiskerColor?: string;
  /** Two buck teeth under the tip. */
  teeth?: boolean;
  /** Fill of the muzzle (default: the coat's pale muzzle). */
  fill?: string;
  /** Radius of the nose. */
  nose?: number;
}

/**
 * A muzzle pointing LEFT: its base sits inside the face at (x, y), `len` long and `h` high at the
 * base, with a pink nose on the tip and whiskers fanning out below. The base edge has no outline,
 * so it melts into the face it is painted over.
 */
export function snout(x: number, y: number, len: number, h: number, c: Coat, o: SnoutOptions = {}): string {
  const tx = x - len;
  const ty = y + (o.drop ?? 1);
  const nr = o.nose ?? Math.max(2, h * 0.3);
  const w = o.outline ?? 2.4;
  const fill = o.fill ?? c.muzzle;
  const top = `M${r1(x)} ${r1(y - h / 2)} Q${r1(x - len * 0.6)} ${r1(y - h / 2 - 0.4)} ${r1(tx + 0.6)} ${r1(ty - nr * 0.8)}`;
  const bottom = `L${r1(tx + 0.6)} ${r1(ty + nr * 0.9)} Q${r1(x - len * 0.5)} ${r1(y + h / 2 + 1)} ${r1(x)} ${r1(y + h / 2)}`;
  const d = `${top} ${bottom} Z`;
  const wl = o.whiskers ?? len * 0.7 + 4;
  const px = x - len * 0.58;
  const py = ty + nr * 0.5;
  const fan = wl > 0
    ? [[-0.72, 0.62], [-0.2, 0.98], [0.42, 0.9]]
        .map(([ux, uy], i) => `M${r1(px + i * 1.3)} ${r1(py)} Q${r1(px + i * 1.3 + ux * wl * 0.5)} ${r1(py + uy * wl * 0.62)} ${r1(px + i * 1.3 + ux * wl)} ${r1(py + uy * wl)}`)
        .join(' ')
    : '';
  return (
    lit(d, fill, { outline: 0, shadow: h * 0.2, light: h * 0.12 }) +
    `<path d="${top} ${bottom}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>` +
    (o.teeth
      ? `<path d="M${r1(tx + 3)} ${r1(ty + nr * 0.9)} h3.4 v3 h-1.7 v-2.6 v2.6 h-1.7 Z" fill="#fffaf0" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`
      : '') +
    (fan ? stroke(fan, INK, 2.2, 0.35) + stroke(fan, o.whiskerColor ?? '#fff6e2', 1.1) : '') +
    // Whisker dots on the pad.
    dot(r1(px + 0.4), r1(py - 1.6), 0.55, tone(fill, -0.45)) +
    dot(r1(px + 2.4), r1(py - 1.2), 0.55, tone(fill, -0.45)) +
    lit(oval(r1(tx), r1(ty - 0.2), r1(nr * 1.1), nr), c.nose, { outline: Math.min(w, 2), shadow: nr * 0.4, light: nr * 0.25, lightK: 0.45 }) +
    glint(r1(tx - nr * 0.35), r1(ty - nr * 0.45), Math.max(0.5, nr * 0.24))
  );
}

type Pt = readonly [number, number];

/**
 * A tapering tail along the cubic curve p0-p1-p2-p3, `w0` thick at the root and `w1` at the tip.
 * Draw it in its own rig part with the root on the pivot, so it can swing. `rings` adds the ring
 * marks of a bare rat tail.
 */
export function tail(p0: Pt, p1: Pt, p2: Pt, p3: Pt, w0: number, w1: number, color: string, o: { rings?: boolean; outline?: number } = {}): string {
  const n = 18;
  const at = (t: number): Pt => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  const left: string[] = [];
  const right: string[] = [];
  let rings = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = at(t);
    const [ax, ay] = at(Math.max(0, t - 0.02));
    const [bx, by] = at(Math.min(1, t + 0.02));
    const k = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / k;
    const ny = (bx - ax) / k;
    const half = (w0 + (w1 - w0) * t) / 2;
    left.push(`${r1(x + nx * half)} ${r1(y + ny * half)}`);
    right.push(`${r1(x - nx * half)} ${r1(y - ny * half)}`);
    if (o.rings && i > 1 && i < n - 1 && i % 2 === 0) rings += `M${r1(x + nx * half * 0.8)} ${r1(y + ny * half * 0.8)} L${r1(x - nx * half * 0.8)} ${r1(y - ny * half * 0.8)} `;
  }
  const d = `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
  return (
    lit(d, color, { outline: o.outline ?? 2.6, shadow: w0 * 0.3, light: w0 * 0.18, lightK: 0.4 }) +
    (rings ? stroke(rings, tone(color, -0.4), 0.9, 0.8) : '')
  );
}

/** A paw: the shaded mitten of `hand` in fur, with pink toe pads on the lower left. */
export function paw(cx: number, cy: number, r: number, fur: string, c: Coat): string {
  return (
    hand(cx, cy, r, fur) +
    dot(r1(cx - r * 0.55), r1(cy + r * 0.2), r * 0.2, c.ear, 0.9) +
    dot(r1(cx - r * 0.2), r1(cy + r * 0.52), r * 0.2, c.ear, 0.9)
  );
}
