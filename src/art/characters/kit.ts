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
