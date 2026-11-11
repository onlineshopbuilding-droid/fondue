/**
 * Landscape dressing in front of the castle's foot, once per landscape (`foot_*`).
 * These strips are drawn over the raiders and hide where the wall meets the ground.
 */
import { INK, RUST, MUSTL, CREAM, WOODD, STONE, STONED, STONEL, WHITE, ink, r, c, e, p, n, hl, art, crescentFast as crescent } from '../draw';
import { tone, linearAbs } from '../shade';
import { rand, fx, clip, SHADOW, lump, rock, moss } from './kit';

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

export const footMeadow = art(
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

export const footCanyon = art(
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

export const footMarsh = art(
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

export const footSnow = art(
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
