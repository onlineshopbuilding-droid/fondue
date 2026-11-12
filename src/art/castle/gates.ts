/**
 * Gate leaves for the five stages and the three crack overlays drawn over them.
 * Each body fills a 74x150 canvas, the size of the gate frame.
 */
import { INK, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, RED, GOLD, GOLDD, ink, e, n, hl, starPoints, litPath, litRect, litBall, rivets, grain, crescentFast as crescent, tubeFast as litTube } from '../draw';
import { tone, linear as lin, radial as rad, glint } from '../shade';
import { rand, fx, rect, clip, SHADOW, SHADE_DEFS, form, shade } from './kit';
import { GILT } from './keepStages';

// ---------------------------------------------------------------------------------------------
// Gate leaves (74x150, they fill the gate frame) and the crack overlays drawn over them.
// ---------------------------------------------------------------------------------------------

export const LEAF_D = 'M6 2H68Q72 2 72 6V148H2V6Q2 2 6 2Z';

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

export function gate0(): string {
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

export function gate1(): string {
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

export function gate2(): string {
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

export function gate3(): string {
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

export function gate4(): string {
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

export const crack1 = split(CRACK_A, 5);
export const crack2 = crack1 + split(CRACK_B, 5);
/** The worst stage: a hole smashed through, splintered board ends around it, chips flying off. */
export const crack3 =
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
