/**
 * Shared palette and small SVG writers for hand-drawn environment art (props and the castle).
 */
import { svg, type Art } from './types';
import { glint, rng, tone, type LitOptions } from './shade';

export const INK = '#2b2118';
export const TEAL = '#2f7f7a';
export const TEALD = '#1f5a5c';
export const RUST = '#b5502e';
export const RUSTD = '#853820';
export const MUST = '#dfa22d';
export const MUSTL = '#f3cb5e';
export const CREAM = '#f3e6c8';
export const FOREST = '#3f6b45';
export const PLUM = '#6b3a5e';
export const WOOD = '#9a6a3c';
export const WOODD = '#6e4626';
export const WOODL = '#bb8c56';
export const STONE = '#9a9484';
export const STONED = '#756f63';
export const STONEL = '#bfb9a6';
export const IRON = '#4b4f55';
export const IRONL = '#777d83';
export const RED = '#b3282d';
export const REDL = '#d9534a';
export const GLOW = '#9ff5ea';
export const WHITE = '#fbfaf6';
export const GOLD = '#c98a2b';
export const GOLDD = '#8e5a22';

// Small SVG writers. Shapes inherit their outline from the enclosing ink() group.
export const ink = (b: string, w = 3.5) =>
  `<g stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${b}</g>`;
export const r = (x: number, y: number, w: number, h: number, f: string, rx = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
export const c = (x: number, y: number, rad: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
export const e = (x: number, y: number, rx: number, ry: number, f: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
export const p = (d: string, f: string) => `<path d="${d}" fill="${f}"/>`;
/** An open line. */
export const l = (d: string, w?: number, col?: string) =>
  `<path d="${d}" fill="none"${w ? ` stroke-width="${w}"` : ''}${col ? ` stroke="${col}"` : ''}/>`;
/** A shape with no outline, for highlights. */
export const n = (d: string, f: string, o = 1) => `<path d="${d}" fill="${f}" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** A stroke with no ink, for highlights and carved lines. */
export const hl = (d: string, col: string, w = 2.5, o = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** Draws shapes twice so that overlapping pieces merge under one shared outline. */
export const blob = (shapes: string, f: string, w = 3.5, col = INK) =>
  `<g fill="${col}" stroke="${col}" stroke-width="${w * 2}" stroke-linejoin="round">${shapes}</g><g fill="${f}">${shapes}</g>`;
export const art = (w: number, h: number, px: number, py: number, b: string): Art => ({ svg: svg(w, h, b), w, h, px, py });
export const centred = (w: number, h: number, b: string) => art(w, h, w / 2, h / 2, b);

// Light helpers for environment art. The light comes from the upper left (see shade.ts).
/** Warm light and cool shadow, as painted overlays. */
export const LIGHT = '#fff3d1';
export const DUSK = '#2a2340';

const f1 = (v: number) => +v.toFixed(1);

/** Path of a rounded rectangle. */
export const roundRect = (x: number, y: number, w: number, h: number, rx = 3): string => {
  const k = Math.min(rx, w / 2, h / 2);
  return `M${f1(x + k)} ${f1(y)}H${f1(x + w - k)}Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + k)}V${f1(y + h - k)}Q${f1(x + w)} ${f1(y + h)} ${f1(x + w - k)} ${f1(y + h)}H${f1(x + k)}Q${f1(x)} ${f1(y + h)} ${f1(x)} ${f1(y + h - k)}V${f1(y + k)}Q${f1(x)} ${f1(y)} ${f1(x + k)} ${f1(y)}Z`;
};

// Masks are slow to rasterise on big canvases (each one costs a full-size layer: the keep went from
// 30 ms to 2.5 s with ~150 of them). Environment art uses these clip-path versions of the shade.ts
// helpers instead; they look the same.
let kid = 0;

/** Shape `d` minus the same shape moved by (dx, dy), drawn with a clip path instead of a mask. */
export function crescentFast(d: string, dx: number, dy: number, fill: string, opacity = 1): string {
  const id = `k${(kid++).toString(36)}`;
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<g clip-path="url(#${id})"><path d="M-4000 -4000H4000V4000H-4000Z${d}" fill="${fill}" fill-rule="evenodd" stroke="none" transform="translate(${dx} ${dy})"${opacity < 1 ? ` opacity="${opacity}"` : ''}/></g>`
  );
}

/** Same as `lit` in shade.ts, without masks. */
export function litFast(d: string, base: string, o: LitOptions = {}): string {
  const ink = o.ink ?? INK;
  const w = o.outline ?? 3.5;
  const s = o.shadow ?? 4;
  const l = o.light ?? 2.2;
  const sc = o.shadowColor ?? tone(base, o.shadowK ?? -0.24);
  const lc = o.lightColor ?? tone(base, o.lightK ?? 0.3);
  return (
    `<path d="${d}" fill="${base}" stroke="none"/>` +
    (s > 0 ? crescentFast(d, -s, f1(-s * 1.1), sc) : '') +
    (l > 0 ? crescentFast(d, l, f1(l * 1.1), lc) : '') +
    (w > 0 ? `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round"/>` : '')
  );
}

/**
 * A pole or beam along centre line `d`, `w` wide, with outline: a narrower dark stroke pushed to
 * the lower right and a thin light one to the upper left, both staying inside the tube.
 */
export function tubeFast(d: string, w: number, base: string, o: LitOptions = {}): string {
  const ink = o.ink ?? INK;
  const out = o.outline ?? 3.5;
  const sc = o.shadowColor ?? tone(base, o.shadowK ?? -0.3);
  const lc = o.lightColor ?? tone(base, o.lightK ?? 0.32);
  const line = (col: string, sw: number, dx: number, op = 1) =>
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f1(sw)}" stroke-linecap="round" stroke-linejoin="round"${dx ? ` transform="translate(${f1(dx)} ${f1(dx)})"` : ''}${op < 1 ? ` opacity="${op}"` : ''}/>`;
  return (
    (out > 0 ? line(ink, w + out * 2, 0) : '') +
    line(base, w, 0) +
    line(sc, w * 0.42, w * 0.2) +
    line(lc, Math.max(0.8, w * 0.2), -w * 0.2, 0.9)
  );
}

/** A closed shape with form shading and an outline (see `lit`). */
export const litPath = (d: string, f: string, o: LitOptions = {}): string => litFast(d, f, o);

/** A rounded rectangle with form shading: planks, plates, blocks. */
export const litRect = (x: number, y: number, w: number, h: number, f: string, rx = 3, o: LitOptions = {}): string =>
  litFast(roundRect(x, y, w, h, rx), f, { shadow: f1(Math.min(4, Math.min(w, h) * 0.24)), light: f1(Math.min(2, Math.min(w, h) * 0.12)), ...o });

/** A shaded ball with a glint: finials, knobs, studs. */
export const litBall = (x: number, y: number, rad: number, f: string, outline = 3): string =>
  litFast(`M${f1(x - rad)} ${y}a${rad} ${rad} 0 1 0 ${f1(rad * 2)} 0a${rad} ${rad} 0 1 0 ${f1(-rad * 2)} 0Z`, f, { outline, shadow: f1(rad * 0.4), light: f1(rad * 0.18) }) +
  glint(f1(x - rad * 0.38), f1(y - rad * 0.4), f1(Math.max(0.7, rad * 0.2)));

/** Round iron rivets or nail heads, each with a tiny glint. */
export function rivets(points: [number, number][], rad = 2.2, f = IRON, rim = INK): string {
  let heads = '';
  let shine = '';
  for (const [x, y] of points) {
    heads += `<circle cx="${x}" cy="${y}" r="${rad}"/>`;
    shine += `M${f1(x - rad * 0.35)} ${f1(y - rad * 0.35)}h.01`;
  }
  return (
    `<g fill="${f}" stroke="${rim}" stroke-width="${f1(Math.max(1, rad * 0.55))}">${heads}</g>` +
    `<path d="${shine}" fill="none" stroke="#fffaf0" stroke-width="${f1(Math.max(1, rad * 0.75))}" stroke-linecap="round" opacity=".85"/>`
  );
}

/** Wavy wood grain lines inside a box; vertical boards by default. */
export function grain(x0: number, y0: number, x1: number, y1: number, col: string, seed: number, count = 2, vertical = true, o = 0.55): string {
  const R = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const t = (i + 0.3 + R() * 0.4) / count;
    const a = 1 + R() * 2.2;
    if (vertical) {
      const x = f1(x0 + (x1 - x0) * t);
      const h = y1 - y0;
      d += `M${x} ${f1(y0 + R() * h * 0.15)}C${f1(x + a)} ${f1(y0 + h * 0.35)} ${f1(x - a)} ${f1(y0 + h * 0.65)} ${f1(x + a * 0.4)} ${f1(y1 - R() * h * 0.15)}`;
    } else {
      const y = f1(y0 + (y1 - y0) * t);
      const w = x1 - x0;
      d += `M${f1(x0 + R() * w * 0.12)} ${y}C${f1(x0 + w * 0.35)} ${f1(y + a)} ${f1(x0 + w * 0.65)} ${f1(y - a)} ${f1(x1 - R() * w * 0.12)} ${f1(y + a * 0.3)}`;
    }
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.1" stroke-linecap="round" opacity="${o}"/>`;
}

export function starPoints(cx: number, cy: number, outer: number, inner: number, count: number, rotDeg = -90): string {
  const out: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const a = ((rotDeg + (i * 180) / count) * Math.PI) / 180;
    const rad = i % 2 === 0 ? outer : inner;
    out.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${out.join('L')}Z`;
}
