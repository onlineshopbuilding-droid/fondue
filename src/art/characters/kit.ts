import { svg } from '../types';
import type { Anim, RigPart } from '../types';

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
