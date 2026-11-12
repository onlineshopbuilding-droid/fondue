/**
 * Ground at the foot of the wall, behind the raiders, once per landscape (`keepGround_*`).
 * It lets the keep grow out of meadow, canyon, marsh and snow instead of standing on a bare line.
 */
import type { Art } from '../types';
import { INK, RUST, MUSTL, CREAM, WHITE, ink, c, p, n, hl, art, litRect } from '../draw';
import { tone } from '../shade';
import { rand, fx, SHADE_DEFS, shade, moss } from './kit';

// ---------------------------------------------------------------------------------------------
// Ground at the wall foot, behind the raiders: the keep grows out of each landscape.
// Art 340x130 in keep coordinates y 560..690, placed bottom-left at world (-40, 670).
// ---------------------------------------------------------------------------------------------

interface GroundStyle {
  grass: string;
  grassD: string;
  grassL: string;
  earth: string;
  road: string;
  line: string;
  /** Paving stones at the gate. */
  cobble: string;
  extra: string;
  /** Height of the grass blades; snow keeps them short. */
  blade?: number;
}

/** A strip whose top edge is a fringe of grass blades between x0 and x1. */
function fringe(x0: number, x1: number, y: number, depth: number, R: () => number, blade = 7): string {
  let d = `M${x0} ${y + depth}V${y}`;
  for (let x = x0; x < x1; ) {
    const w = 3 + R() * 4;
    const h = blade * (0.4 + R() * 0.9);
    d += `L${fx(x + w * 0.5)} ${fx(y - h)}L${fx(x + w)} ${fx(y + R() * 2 - 1)}`;
    x += w;
  }
  return `${d}V${y + depth}Z`;
}

/** Grass blades standing up from a line, for the edge of a bank. */
function blades(x0: number, x1: number, y: (x: number) => number, R: () => number, h: number, col: string, dark: string, line = INK): string {
  let d = '';
  for (let x = x0; x < x1; x += 4 + R() * 7) {
    const by = fx(y(x));
    const lean = (R() - 0.4) * 6;
    const hh = fx(h * (0.5 + R() * 0.7));
    d += `M${fx(x)} ${by}q${fx(lean * 0.3)} ${fx(-hh * 0.6)} ${fx(lean)} ${-hh}`;
  }
  return hl(d, line, 3.6) + hl(d, col, 1.8) + hl(d, dark, 0.8, 0.5);
}

/** Cobbles leading up to the gate: the road turns into paving as it reaches the keep. */
function paving(f: string, line: string, R: () => number): string {
  // Worn flat setts, half sunk in the dirt; they thin out as the road takes over.
  let b = '';
  const rows: [number, number, number][] = [[643, 150, 232], [651, 146, 246], [660, 152, 258]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0 + R() * 4; x < x1; ) {
      const w = 10 + R() * 6;
      if (R() < (x > x1 - 34 ? 0.45 : 0.85))
        b += litRect(fx(x), fx(y + R() * 1.5), fx(w), fx(5 + R() * 1.5), tone(f, (R() - 0.6) * 0.16), 2.5, { outline: 1.2, ink: tone(line, 0.25), shadow: 1.4, light: 0.8 });
      x += w + 2.5;
    }
  }
  return `<g opacity=".85">${b}</g>`;
}

function keepGround(s: GroundStyle, seed: number): string {
  const R = rand(seed);
  const bankL = 'M-24 646Q2 634 30 640T86 636T150 648L154 690H-24Z';
  // Right of the gate the spur stands in the road: only a low drift of dirt and a few tufts.
  const bankR = 'M234 662V648Q244 640 256 646Q266 652 270 659Q256 664 234 662Z';
  const edgeL = (x: number) => 641 + Math.sin(x * 0.11) * 3 + (x > 120 ? (x - 120) * 0.2 : 0);
  return (
    // Contact shadow where the plinth disappears into the ground.
    shade('sD', -24, 616, 176, 30, 0.7) +
    shade('sD', 236, 626, 34, 26, 0.6) +
    // Earth showing between grass, then the grass bank with a fringe of blades.
    `<g stroke="${s.line}" stroke-width="2.5" stroke-linejoin="round">` +
    p(bankL, s.earth) +
    `</g>` +
    n(bankR, tone(s.road, -0.15)) +
    hl('M240 650Q252 643 264 649', tone(s.road, 0.3), 1.4, 0.7) +
    n(fringe(-24, 150, 644, 46, R, (s.blade ?? 13) * 0.55), s.grass) +
    n('M-24 652Q30 646 80 650T150 656L152 664Q90 658 40 662T-24 662Z', s.grassL, 0.45) +
    shade('sD', -24, 656, 180, 34, 0.35) +
    paving(tone(s.cobble, -0.12), tone(s.road, -0.55), R) +
    blades(-20, 148, edgeL, R, s.blade ?? 13, s.grass, s.grassD, s.line) +
    blades(238, 262, (x) => 650 + (x - 238) * 0.06, R, (s.blade ?? 13) * 0.6, s.grass, s.grassD, s.line) +
    s.extra
  );
}

const ground = (s: GroundStyle, seed: number): Art => art(340, 130, 0, 130, SHADE_DEFS + ink(`<g transform="translate(0 -560)">${keepGround(s, seed)}</g>`));

/**
 * The same bank along the west wing, which only the market shows: 420 wide, placed bottom-left at
 * world (-460, 670), so it runs under the keep's own bank. No paving: the road ends at the gate.
 */
function westBank(s: GroundStyle, seed: number): string {
  const R = rand(seed);
  const bank = 'M0 648Q40 638 84 644T170 640T260 646T340 640T420 646L420 690H0Z';
  const edge = (x: number) => 643 + Math.sin(x * 0.09) * 3;
  return (
    shade('sD', 0, 618, 420, 30, 0.6) +
    `<g stroke="${s.line}" stroke-width="2.5" stroke-linejoin="round">${p(bank, s.earth)}</g>` +
    n(fringe(0, 420, 645, 46, R, (s.blade ?? 13) * 0.55), s.grass) +
    n('M0 654Q60 648 120 652T240 654T420 656L420 664Q300 660 200 664T0 662Z', s.grassL, 0.45) +
    shade('sD', 0, 656, 420, 34, 0.35) +
    blades(4, 416, edge, R, s.blade ?? 13, s.grass, s.grassD, s.line)
  );
}
const westGround = (s: GroundStyle, seed: number): Art => art(420, 130, 0, 130, SHADE_DEFS + ink(`<g transform="translate(0 -560)">${westBank(s, seed)}</g>`));

/** Little meadow flowers: cream, mustard and rust heads on short stems. */
function flowers(list: [number, number, string][]): string {
  const stems = list.map(([x, y]) => `M${x} ${y + 7}V${y + 1}`).join('');
  return hl(stems, '#3f6b45', 1.4) + `<g stroke-width="1.6">${list.map(([x, y, f]) => c(x, y, 2.8, f)).join('')}</g>` + hl(list.map(([x, y]) => `M${x - 0.8} ${y - 0.8}h.01`).join(''), '#fffaf0', 1.2, 0.8);
}

const MEADOW: GroundStyle = {
    grass: '#6f9a4a', grassD: '#3f6b45', grassL: '#a9c86e', earth: '#6b5038', road: '#b08a5a', line: INK, cobble: '#c9b08a',
    extra:
      moss(12, 628, 14, 6, 801) + moss(104, 632, 12, 5, 802) + moss(250, 640, 9, 4, 803) +
      flowers([[8, 640, CREAM], [42, 636, MUSTL], [70, 642, CREAM], [126, 646, RUST]]),
};
export const groundMeadow = ground(MEADOW, 811);
export const groundMeadowWest = westGround(MEADOW, 911);

const CANYON: GroundStyle = {
    grass: '#a39a4a', grassD: '#6b6424', grassL: '#d9c27a', earth: '#9a5136', road: '#dcae78', line: INK, cobble: '#e8c79a',
    extra:
      // Sand blown against the plinth, with ripples.
      `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">${p('M-24 640Q20 618 60 632Q90 622 120 638Q100 648 40 648Z', '#d8a878')}${p('M236 646Q252 632 268 646Z', '#d8a878')}</g>` +
      hl('M-14 636Q16 626 40 634M58 634Q84 628 108 638', '#b98857', 1.4, 0.8) +
      hl('M-10 632Q14 622 36 628', '#f0d2a3', 1.4, 0.8) +
      hl('M20 668l6 6l-3 6M100 672l-5 5l4 6', '#6e2f1f', 1.4, 0.7),
};
export const groundCanyon = ground(CANYON, 812);
export const groundCanyonWest = westGround(CANYON, 912);

const MARSH: GroundStyle = {
    grass: '#55703f', grassD: '#2a3f28', grassL: '#86a35e', earth: '#3f3a2a', road: '#7b6a4c', line: INK, cobble: '#9b8c6c',
    extra:
      // Damp stain creeping up the plinth and a dark puddle with sky in it.
      `<path d="M-24 596Q20 606 50 600T120 606T150 600V640H-24Z" fill="#23403a" stroke="none" opacity=".25"/>` +
      `<g stroke="${INK}" stroke-width="2.2">${p('M262 664Q280 656 306 660Q322 666 300 672Q276 674 262 664Z', '#3f6660')}</g>` +
      n('M270 663Q284 659 300 662Q286 664 272 665Z', '#9fc0bc', 0.7) +
      moss(30, 632, 22, 7, 821) + moss(110, 636, 16, 6, 822) + moss(248, 642, 10, 5, 823),
};
export const groundMarsh = ground(MARSH, 813);
export const groundMarshWest = westGround(MARSH, 913);

const SNOW: GroundStyle = {
    grass: '#eef3fa', grassD: '#9fb1c9', grassL: WHITE, earth: '#c9d6e8', road: '#9fb1c9', line: '#1a2740', cobble: '#c5d2e4', blade: 4,
    extra:
      // Snow heaped against the plinth, blue in its shadow, and dry stalks poking through.
      `<g stroke="#1a2740" stroke-width="2.4" stroke-linejoin="round">${p('M-24 642Q10 614 50 628Q84 612 124 632Q140 640 150 650L-24 652Z', '#f1f6fc')}${p('M236 650Q250 634 268 650Z', '#f1f6fc')}</g>` +
      n('M60 640Q90 628 124 636Q138 642 148 650Q110 644 60 646Z', '#c9d6e8', 0.85) +
      n('M-10 632Q14 620 40 628Q20 626 -4 636Z', WHITE) +
      hl('M30 636l-2 -12M34 636l3 -10M96 638l-3 -11M100 638l2 -9', '#5a4630', 1.4, 0.9),
};
export const groundSnow = ground(SNOW, 814);
export const groundSnowWest = westGround(SNOW, 914);
