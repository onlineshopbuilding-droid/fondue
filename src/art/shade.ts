/**
 * Light and material helpers shared by every piece of art: figures, keep, props and landscapes.
 *
 * One rule for the whole game: the light comes from the upper left. Forms are lit on their upper
 * left edge and fall into shadow on the lower right; cast shadows fall to the lower right.
 *
 * Everything here returns SVG markup. Ids only have to be unique inside one SVG document, but a
 * global counter keeps them unique everywhere, so pieces can be combined freely.
 */

let next = 0;
/** A fresh id for a gradient, mask or clip path. */
export const uid = (prefix = 'u'): string => `${prefix}${(next++).toString(36)}`;

const hex = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const toHex = (c: number[]): string => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Linear mix of two colours, f = 0 gives a, f = 1 gives b. */
export function mix(a: string, b: string, f: number): string {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * f));
}

/** Shadows lean cool and violet, light leans warm, like late afternoon. */
const SHADOW_TINT = '#2a2340';
const LIGHT_TINT = '#fff3d1';

/**
 * A darker or lighter version of a colour that stays in the same family.
 * k < 0 goes into shadow (-0.2 is a typical form shadow), k > 0 into light (0.25 a typical highlight).
 */
export function tone(color: string, k: number): string {
  return k < 0 ? mix(color, SHADOW_TINT, -k) : mix(color, LIGHT_TINT, k);
}

/** Opacity attribute, omitted when fully opaque. */
const op = (o: number) => (o < 1 ? ` opacity="${o}"` : '');

/**
 * The part of shape `d` that is not covered by the same shape moved by (dx, dy): a crescent along
 * the edge opposite to the move. Moving up-left (negative dx, dy) leaves a lower-right crescent.
 * Drawn without outline.
 */
export function crescent(d: string, dx: number, dy: number, fill: string, opacity = 1): string {
  // A clip path, not a mask: browsers paint every mask into a layer as big as the whole canvas,
  // which made the keep and the landscapes take seconds to rasterise at boot. Inside the clip, a
  // huge rectangle with the moved shape cut out of it (even-odd) leaves exactly the crescent.
  // "M0 0" resets the pen, so a shape written with a relative "m" still starts where it should.
  const id = uid('c');
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<g clip-path="url(#${id})"><path d="M-9000 -9000H9000V9000H-9000ZM0 0${d}" fill="${fill}" fill-rule="evenodd" stroke="none" transform="translate(${dx} ${dy})"${op(opacity)}/></g>`
  );
}

/** Same as `crescent`, for a stroked centre line of width `w` (limbs, straps, poles). */
export function crescentStroke(d: string, w: number, dx: number, dy: number, color: string, opacity = 1): string {
  // Without a mask (see `crescent`): a narrower band of the same line, pushed away from the move.
  // Shift plus half band never exceeds half the line width, so the band always stays inside it.
  const k = Math.hypot(dx, dy);
  if (k === 0 || w <= 0) return '';
  const band = Math.min(w * 0.5, k * 1.15);
  const shift = ((w - band) / 2) * 0.9;
  const tx = r1((-dx / k) * shift);
  const ty = r1((-dy / k) * shift);
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(band)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${tx} ${ty})"${op(opacity)}/>`;
}

export interface LitOptions {
  /** Ink colour and width of the outline; width 0 for none. */
  ink?: string;
  outline?: number;
  /** Width of the shadow crescent on the lower right, in art pixels. */
  shadow?: number;
  /** Width of the light crescent on the upper left. */
  light?: number;
  /** Override the shadow and light colours (default: tone of the base). */
  shadowColor?: string;
  lightColor?: string;
  /** Strength of the default tones. */
  shadowK?: number;
  lightK?: number;
}

/**
 * A closed shape with form shading: base fill, a shadow crescent on the lower right, a thin light
 * crescent on the upper left, then the outline on top so that the shading never covers it.
 */
export function lit(d: string, base: string, o: LitOptions = {}): string {
  const ink = o.ink ?? '#2b2118';
  const w = o.outline ?? 3.5;
  const s = o.shadow ?? 4;
  const l = o.light ?? 2.2;
  const sc = o.shadowColor ?? tone(base, o.shadowK ?? -0.24);
  const lc = o.lightColor ?? tone(base, o.lightK ?? 0.3);
  return (
    `<path d="${d}" fill="${base}" stroke="none"/>` +
    (s > 0 ? crescent(d, -s, -s * 1.1, sc) : '') +
    (l > 0 ? crescent(d, l, l * 1.1, lc) : '') +
    (w > 0 ? `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round"/>` : '')
  );
}

/** A limb or pole along centre line `d`, `w` wide, with outline and form shading. */
export function litTube(d: string, w: number, base: string, o: LitOptions = {}): string {
  const ink = o.ink ?? '#2b2118';
  const out = o.outline ?? 3.5;
  const s = o.shadow ?? Math.max(1.5, w * 0.3);
  const l = o.light ?? Math.max(1, w * 0.16);
  const sc = o.shadowColor ?? tone(base, o.shadowK ?? -0.24);
  const lc = o.lightColor ?? tone(base, o.lightK ?? 0.3);
  return (
    (out > 0 ? `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w + out * 2}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    `<path d="${d}" fill="none" stroke="${base}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    (s > 0 ? crescentStroke(d, w, -s, -s * 1.1, sc) : '') +
    (l > 0 ? crescentStroke(d, w, l, l * 1.1, lc) : '')
  );
}

/** `inner` painted only where shape `d` is, for patterns, grain and painted shadows. */
export function within(d: string, inner: string): string {
  const id = uid('c');
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

export type Stop = readonly [offset: number, color: string, opacity?: number];

const stops = (list: readonly Stop[]) =>
  list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');

/**
 * A linear gradient in the shape's own box. Returns the id and the markup for its definition;
 * put `def` before the shape and use `fill="url(#id)"`. Angle 90 runs top to bottom.
 */
export function linear(list: readonly Stop[], angle = 90): { id: string; def: string; url: string } {
  const id = uid('g');
  const a = (angle * Math.PI) / 180;
  const x = Math.cos(a) / 2;
  const y = Math.sin(a) / 2;
  const def = `<linearGradient id="${id}" x1="${0.5 - x}" y1="${0.5 - y}" x2="${0.5 + x}" y2="${0.5 + y}">${stops(list)}</linearGradient>`;
  return { id, def, url: `url(#${id})` };
}

/** A radial gradient in the shape's own box, centred at (cx, cy) in 0..1 units. */
export function radial(list: readonly Stop[], cx = 0.5, cy = 0.5, r = 0.5): { id: string; def: string; url: string } {
  const id = uid('g');
  const def = `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
  return { id, def, url: `url(#${id})` };
}

/** Linear gradient in absolute art coordinates, for washes over a whole layer. */
export function linearAbs(list: readonly Stop[], x1: number, y1: number, x2: number, y2: number): { id: string; def: string; url: string } {
  const id = uid('g');
  const def = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
  return { id, def, url: `url(#${id})` };
}

/** Plain stroke without outline, for inner lines, seams, grain and hair strands. */
export const stroke = (d: string, color: string, w = 1.6, opacity = 1, cap: 'round' | 'butt' = 'round'): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"${op(opacity)}/>`;

/** Plain fill without outline. */
export const paint = (d: string, color: string, opacity = 1): string =>
  `<path d="${d}" fill="${color}" stroke="none"${op(opacity)}/>`;

/** A small specular glint: a soft spot and a sharp core, for metal, eyes and glass. */
export const glint = (x: number, y: number, r = 2, color = '#fffaf0', opacity = 0.95): string =>
  `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${color}" stroke="none" opacity="${opacity * 0.25}"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="none"${op(opacity)}/>`;

/**
 * A deterministic pseudo-random sequence, so that scattered detail (grain, pebbles, grass) looks
 * hand placed but is the same on every boot and every machine.
 */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Rounds a number for compact path data. */
export const r1 = (v: number): number => Math.round(v * 10) / 10;
