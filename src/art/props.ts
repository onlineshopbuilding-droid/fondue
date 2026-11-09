/**
 * Environment and prop art in Fondue's folk-art felt puppet style: chunky rounded shapes, a thick
 * dark outline, flat fills and at most one simple highlight.
 */
import { svg, type Art } from './types';

const INK = '#2b2118';
const TEAL = '#2f7f7a';
const TEALD = '#1f5a5c';
const RUST = '#b5502e';
const RUSTD = '#853820';
const MUST = '#dfa22d';
const MUSTL = '#f3cb5e';
const CREAM = '#f3e6c8';
const FOREST = '#3f6b45';
const PLUM = '#6b3a5e';
const WOOD = '#9a6a3c';
const WOODD = '#6e4626';
const WOODL = '#bb8c56';
const STONE = '#9a9484';
const STONED = '#756f63';
const STONEL = '#bfb9a6';
const IRON = '#4b4f55';
const IRONL = '#777d83';
const RED = '#b3282d';
const REDL = '#d9534a';
const GLOW = '#9ff5ea';
const WHITE = '#fbfaf6';

// Small SVG writers. Shapes inherit their outline from the enclosing ink() group.
const ink = (b: string, w = 3.5) =>
  `<g stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${b}</g>`;
const r = (x: number, y: number, w: number, h: number, f: string, rx = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
const c = (x: number, y: number, rad: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
const e = (x: number, y: number, rx: number, ry: number, f: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
const p = (d: string, f: string) => `<path d="${d}" fill="${f}"/>`;
/** An open line. */
const l = (d: string, w?: number, col?: string) =>
  `<path d="${d}" fill="none"${w ? ` stroke-width="${w}"` : ''}${col ? ` stroke="${col}"` : ''}/>`;
/** A shape with no outline, for highlights. */
const n = (d: string, f: string, o = 1) => `<path d="${d}" fill="${f}" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** A stroke with no ink, for highlights and carved lines. */
const hl = (d: string, col: string, w = 2.5, o = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** Draws shapes twice so that overlapping pieces merge under one shared outline. */
const blob = (shapes: string, f: string, w = 3.5, col = INK) =>
  `<g fill="${col}" stroke="${col}" stroke-width="${w * 2}" stroke-linejoin="round">${shapes}</g><g fill="${f}">${shapes}</g>`;
const art = (w: number, h: number, px: number, py: number, b: string): Art => ({ svg: svg(w, h, b), w, h, px, py });
const centred = (w: number, h: number, b: string) => art(w, h, w / 2, h / 2, b);

function starPoints(cx: number, cy: number, outer: number, inner: number, count: number, rotDeg = -90): string {
  const out: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const a = ((rotDeg + (i * 180) / count) * Math.PI) / 180;
    const rad = i % 2 === 0 ? outer : inner;
    out.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${out.join('L')}Z`;
}

// ---------------------------------------------------------------------------------------------
// The keep. Art coordinates = world - (-40, 52), so the gate opening spans art x 151..225.
// ---------------------------------------------------------------------------------------------

function keepWindow(x: number, y: number): string {
  return (
    r(x - 14, y, 28, 46, MUSTL, 2) +
    l(`M${x} ${y}v46M${x - 14} ${y + 22}h28`, 2.5) +
    r(x - 31, y - 2, 17, 50, TEAL, 2) +
    r(x + 14, y - 2, 17, 50, TEAL, 2) +
    hl(`M${x - 25} ${y + 12}h5M${x - 25} ${y + 34}h5M${x + 20} ${y + 12}h5M${x + 20} ${y + 34}h5`, CREAM, 3) +
    r(x - 28, y + 48, 56, 11, WOODD, 2) +
    c(x - 18, y + 45, 5, RUST) +
    c(x, y + 45, 5, MUST) +
    c(x + 18, y + 45, 5, PLUM)
  );
}

const STONES: [number, number, number, number, string][] = [
  [24, 358, 52, 26, STONEL], [84, 358, 40, 26, STONED], [132, 356, 44, 20, STONEL], [186, 356, 34, 20, STONED],
  [18, 394, 38, 30, STONED], [64, 394, 62, 30, STONEL],
  [14, 434, 60, 30, STONEL], [100, 434, 28, 30, STONED],
  [12, 474, 36, 32, STONED], [56, 474, 72, 32, STONEL],
  [8, 516, 56, 26, STONEL], [72, 516, 58, 26, STONED],
];

const keepBody =
  // Pennant and gabled upper storey behind the roof platform.
  l('M120 34V4', 4) +
  p('M122 5L150 12L122 20Z', RUST) +
  p('M66 200V104L120 46L174 104V200Z', CREAM) +
  l('M66 198V104M174 198V104M66 150H174M67 196L100 153M173 196L140 153', 9) +
  hl('M66 198V104M174 198V104M66 150H174M67 196L100 153M173 196L140 153', WOOD, 4) +
  c(120, 104, 15, TEAL) +
  l('M120 89v30M105 104h30', 2.5) +
  p('M102 198V168Q102 154 120 154Q138 154 138 168V198Z', RUST) +
  c(130, 178, 2.5, MUST) +
  p('M22 128L120 14L218 128L196 136L120 50L44 136Z', RUST) +
  hl('M45 96l18 16M64 74l18 16M84 52l18 16M195 96l-18 16M176 74l-18 16M156 52l-18 16', RUSTD, 3) +
  // Roof platform: the deck's top edge is the defenders' floor.
  r(8, 172, 224, 7, WOODL, 3) +
  [12, 58, 182, 226].map((x) => r(x, 172, 8, 26, WOODD, 2)).join('') +
  // Middle storey.
  r(18, 214, 204, 136, CREAM, 2) +
  l('M24 226V344M216 226V344M120 226V344M24 344H216', 9) +
  hl('M24 226V344M216 226V344M120 226V344M24 344H216', WOOD, 4) +
  keepWindow(72, 256) +
  keepWindow(168, 256) +
  p('M6 214Q8 242 34 246V214Z', WOODD) +
  p('M234 214Q232 242 206 246V214Z', WOODD) +
  p('M18 212l17 16 17-16 17 16 17-16 17 16 17-16 17 16 17-16 17 16 17-16 17 16 17-16Z', TEAL) +
  r(4, 198, 232, 16, WOOD, 3) +
  hl('M12 204H228', WOODL, 2.5) +
  // Stone base.
  p('M14 348H226L238 580H2Z', STONE) +
  `<g stroke-width="2.5">${STONES.map(([x, y, w, h, f]) => r(x, y, w, h, f, 7)).join('')}</g>` +
  // Gate arch and the dark opening that the leaf closes.
  r(151, 400, 74, 172, '#17110c', 0) +
  r(137, 402, 14, 176, STONEL, 4) +
  r(225, 402, 14, 176, STONEL, 4) +
  p('M135 404Q137 368 187 364Q237 368 239 404Z', STONEL) +
  l('M153 404L146 380M171 404L167 374M203 404L207 374M221 404L228 380', 2.5) +
  p('M176 358H198L203 404H171Z', STONE) +
  c(187, 382, 7, RUST) +
  // Boulders around the foot.
  e(28, 566, 30, 18, STONED) +
  e(88, 572, 36, 16, STONE) +
  e(136, 576, 22, 12, STONED);

// ---------------------------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------------------------

const dots = (points: [number, number][], w = 4, col = INK) =>
  hl(points.map(([x, y]) => `M${x} ${y}h.01`).join(''), col, w);

const gate0 = ink(
  r(2, 2, 70, 146, WOOD, 4) +
    l('M16 3V147M30 3V147M44 3V147M58 3V147', 2.5) +
    e(23, 66, 3, 5, WOODD) +
    e(51, 104, 3, 6, WOODD) +
    p('M5 34H19L69 116H55Z', WOODL) +
    r(2, 20, 70, 15, WOODL, 3) +
    r(2, 115, 70, 15, WOODL, 3) +
    dots([[9, 27], [37, 27], [65, 27], [9, 122], [37, 122], [65, 122]]),
);

const gate1 = ink(
  r(2, 2, 70, 146, WOODD, 3) +
    l('M18 3V147M36 3V147M54 3V147', 2.5) +
    r(2, 14, 70, 18, IRON, 2) +
    r(2, 66, 70, 18, IRON, 2) +
    r(2, 118, 70, 18, IRON, 2) +
    hl('M6 18H68M6 70H68M6 122H68', IRONL, 3) +
    dots([[10, 26], [28, 26], [46, 26], [64, 26], [10, 78], [28, 78], [46, 78], [64, 78], [10, 130], [28, 130], [46, 130], [64, 130]], 5) +
    p('M2 2H24L2 24ZM72 2H50L72 24ZM2 148H24L2 126ZM72 148H50L72 126Z', IRON),
);

const gate2 = ink(
  r(2, 2, 70, 146, RUSTD, 4) +
    r(8, 8, 58, 134, MUST, 3) +
    `<g stroke-width="3">${p(starPoints(37, 75, 27, 16, 12), MUSTL)}</g>` +
    c(37, 75, 13, RUST) +
    hl('M31 72h.01M43 72h.01M31 80q6 5 12 0', CREAM, 2.5) +
    l('M14 22H60M14 128H60', 3) +
    dots([[14, 14], [60, 14], [14, 136], [60, 136]], 5, MUSTL) +
    hl('M12 40V110', CREAM, 3, 0.7),
);

const RUNES = 'M37 14V44M37 20L48 30M37 30L26 40M26 62L48 62L26 88L48 88M37 106V136M26 106L37 118L48 106M28 136H46';
const gate3 = ink(
  r(2, 2, 70, 146, '#3b3347', 4) +
    r(8, 8, 58, 134, '#4c4359', 2) +
    l('M8 52H66M8 98H66', 2.5) +
    dots([[5, 5], [69, 5], [5, 145], [69, 145]], 4, TEAL) +
    hl(RUNES, '#3fd6c4', 11, 0.28) +
    hl(RUNES, '#4fe3d0', 6, 0.55) +
    hl(RUNES, GLOW, 3),
);

const gate4 = ink(
  r(2, 2, 70, 146, '#23282f', 3) +
    `<g stroke-width="2.5">` +
    p('M3 3H71L37 42Z', '#39424e') +
    p('M3 3L37 42L3 75Z', '#2c333c') +
    p('M71 3L37 42L71 75Z', '#1d2228') +
    p('M3 75L37 42L71 75L37 108Z', '#4d5967') +
    p('M3 75L37 108L3 147Z', '#343c47') +
    p('M71 75L37 108L71 147Z', '#232930') +
    p('M3 147L37 108L71 147Z', '#3f4955') +
    `</g>` +
    p('M37 58L52 75L37 92L22 75Z', '#7f8ea0') +
    n('M37 62L46 75H28Z', '#b6c4d4') +
    hl('M6 8L34 40M6 142L34 112', '#8fa0b2', 2),
);

// ---------------------------------------------------------------------------------------------
// Crack overlays: each adds to the previous one.
// ---------------------------------------------------------------------------------------------

const crackLine = (d: string) => hl(d, INK, 3.5) + hl(d.replace(/M(\d+) /g, (_, x: string) => `M${Number(x) + 2} `), CREAM, 1.2, 0.55);

const CRACK_A = 'M72 22L56 32L62 46L46 58L52 74M56 32L44 24M46 58L34 52';
const CRACK_B = 'M2 112L18 104L14 90L30 82L26 66M18 104L30 112M30 82L42 88M72 96L60 100L64 116L52 124L56 146M60 100L48 96';
const CRACK_C = 'M36 2L30 18L40 28L28 40M2 30L14 38L10 52L22 56M2 74L14 70M74 62L62 68';
const HOLE = 'M22 62L34 54L42 62L54 58L60 74L50 80L56 92L42 90L36 100L28 88L16 88L22 76Z';

const crack1Body = crackLine(CRACK_A);
const crack2Body = crack1Body + crackLine(CRACK_B);
const crack3Body =
  crack2Body +
  crackLine(CRACK_C) +
  ink(
    p(HOLE, '#17110c') +
      p('M14 92L26 86L24 100Z', CREAM) +
      p('M56 54L66 46L62 62Z', CREAM) +
      p('M38 104L46 96L50 110Z', WOODL) +
      p('M12 58L20 62L14 70Z', WOODL),
    2.5,
  );

// ---------------------------------------------------------------------------------------------
// Cauldron: figures are drawn between the back piece and the front piece.
// ---------------------------------------------------------------------------------------------

const cauldronBack = art(
  150,
  90,
  75,
  90,
  ink(
    e(75, 38, 71, 25, IRON) +
      e(75, 42, 62, 18, '#1d1712') +
      p('M16 46C34 32 116 32 134 46C118 62 34 62 16 46Z', MUST) +
      n('M34 44C54 37 96 37 116 44C96 49 54 49 34 44Z', MUSTL) +
      `<g stroke-width="2.5">` +
      c(52, 44, 7, MUSTL) +
      c(96, 42, 10, MUSTL) +
      c(74, 50, 5, MUSTL) +
      c(82, 12, 4, MUSTL) +
      c(58, 22, 3, MUSTL) +
      `</g>` +
      n('M92 37a4 3 0 0 1 6 0Z', CREAM),
  ),
);

const cauldronFront = art(
  150,
  90,
  75,
  90,
  ink(
    p('M8 44C6 66 22 80 42 84H108C128 80 144 66 142 44C118 74 32 74 8 44Z', IRON) +
      hl('M24 70C44 80 62 81 76 81', IRONL, 3) +
      p('M4 40C24 72 126 72 146 40C150 50 148 56 142 58C118 84 32 84 8 58C2 56 0 50 4 40Z', IRONL) +
      p('M34 66C34 76 38 84 42 84C46 84 46 74 50 72Z', MUST) +
      p('M100 70C102 78 106 80 108 80C112 80 112 72 116 64Z', MUST) +
      e(22, 84, 22, 8, STONED) +
      e(66, 86, 20, 6, STONE) +
      e(112, 85, 22, 7, STONED) +
      e(142, 86, 10, 5, STONE) +
      e(4, 86, 8, 4, STONE),
  ),
);

// ---------------------------------------------------------------------------------------------
// Eagle
// ---------------------------------------------------------------------------------------------

const GOLD = '#c98a2b';
const GOLDD = '#8e5a22';

const eagleBody =
  p('M152 82L214 78L203 94L216 104L203 112L212 124L152 112Z', GOLDD) +
  p('M108 120L102 138M128 120L126 138', MUST) +
  l('M106 120L100 136M126 120L124 136', 7) +
  hl('M106 120L100 136M126 120L124 136', MUST, 3) +
  l('M90 146L100 136L104 147M112 146L124 136L128 147', 4) +
  p('M60 74C80 52 134 52 162 74C176 86 174 104 158 112C130 126 94 124 76 106Z', GOLD) +
  n('M66 82C76 96 96 110 118 112C92 118 78 106 66 82Z', MUSTL) +
  p('M40 58C24 58 12 66 14 88C20 80 30 78 42 80Z', MUST) +
  c(60, 66, 25, MUSTL) +
  hl('M74 46L84 62M80 80L90 70', GOLDD, 3) +
  c(50, 60, 5, INK) +
  n('M48 58a2 2 0 1 0 .1 0Z', WHITE) +
  l('M40 50L58 54', 4);

const eagleA = centred(
  220,
  150,
  ink(
    p('M72 80C58 54 54 30 60 6L72 20L84 6L92 26L104 18L112 66Z', GOLDD) +
      eagleBody +
      p('M88 88C82 54 92 24 124 5L132 20L146 7L151 26L168 16L168 38L187 33L179 54C166 74 140 90 116 94Z', GOLD) +
      hl('M104 80C108 56 118 38 130 26M118 86C128 66 144 50 160 38', GOLDD, 3),
  ),
);

const eagleB = centred(
  220,
  150,
  ink(
    p('M68 96L46 138L66 130L74 148L90 128L108 112Z', GOLDD) +
      eagleBody +
      p('M88 82C120 70 162 74 178 92L172 118L158 108L152 137L136 122L124 148L112 124L96 142L90 112Z', GOLD) +
      hl('M106 94C114 104 118 116 118 128M128 92C136 102 140 112 142 122M150 90C156 96 160 104 162 110', GOLDD, 3),
  ),
);

// ---------------------------------------------------------------------------------------------
// Weapons and projectiles
// ---------------------------------------------------------------------------------------------

const wheelTicks = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const q = (rad: number) => `${(50 + Math.cos(a) * rad).toFixed(1)} ${(50 + Math.sin(a) * rad).toFixed(1)}`;
  return `M${q(35)}L${q(44)}`;
}).join('');

const wheel = centred(
  100,
  100,
  ink(
    c(50, 50, 46, STONE) +
      n('M14 42A37 37 0 0 1 58 13L56 19A31 31 0 0 0 20 44Z', STONEL) +
      l(wheelTicks, 3.5) +
      `<circle cx="50" cy="50" r="33" fill="${STONEL}" stroke-width="3"/>` +
      l('M50 20V80M20 50H80', 5, STONED) +
      p('M50 28L58 36L50 44L42 36Z', RUST) +
      c(50, 50, 13, STONED) +
      c(50, 50, 5, INK),
    4,
  ),
);

const slab = art(
  160,
  300,
  80,
  300,
  ink(
    p('M16 8Q18 2 26 2H134Q142 2 144 8L156 292Q156 298 150 298H10Q4 298 4 292Z', STONE) +
      n('M22 8H40L30 290H12Z', STONEL) +
      hl('M38 26H122L132 274H28Z', STONED, 5) +
      p('M80 72L118 142H96L124 196H36L64 142H42Z', STONEL) +
      `<g stroke-width="3">${p('M80 72L96 102L84 96L76 106L66 100Z', CREAM)}</g>` +
      r(70, 196, 20, 26, STONED, 2) +
      hl('M50 248h14M72 240v18M88 248l10-8M88 248l10 8M112 240v18', INK, 4) +
      p('M144 60L156 74L146 92Z', STONED) +
      p('M4 240L14 226L16 262Z', STONED),
    4,
  ),
);

const comet = centred(
  80,
  80,
  ink(
    p('M34 66C14 54 16 38 26 30C26 18 36 24 40 16C44 6 54 12 62 2C62 12 76 12 74 24C78 30 76 42 70 48C66 62 48 74 34 66Z', RUST) +
      `<g stroke-width="2.5">${p('M34 62C22 50 24 40 34 32C38 22 48 22 58 14C58 22 68 26 64 36C70 46 58 64 34 62Z', MUST)}</g>` +
      p('M16 46C20 32 40 28 50 38C60 48 56 66 42 72C26 78 10 62 16 46Z', PLUM) +
      n('M22 46C26 38 34 36 40 38C32 40 26 46 24 54Z', '#94648a') +
      hl('M28 66L34 56L30 48M34 56L46 52L50 44M46 52L50 62', MUSTL, 3),
  ),
);

const bomb = centred(
  36,
  40,
  ink(
    l('M24 12C26 6 30 8 32 5', 3, WOODD) +
      r(18, 9, 10, 7, IRONL, 2) +
      c(17, 26, 13, IRON) +
      n('M9 22a10 10 0 0 1 8-6l-1 4a7 7 0 0 0-4 4Z', IRONL) +
      `<g stroke-width="1.5">${p(starPoints(32, 5, 5, 2, 5), MUSTL)}</g>`,
    3,
  ),
);

const stone = centred(16, 16, ink(p('M3 7L7 2H12L14 8L11 14H5Z', STONE) + n('M5 7L8 4H10L6 9Z', STONEL), 2));

const bolt = centred(
  60,
  12,
  ink(
    r(12, 4, 38, 4, WOODL, 1) +
      p('M2 6L14 1V11Z', IRON) +
      p('M46 6L58 1L54 6L58 11Z', RUST),
    2,
  ),
);

const roofBolt = centred(
  40,
  8,
  ink(
    r(7, 2.5, 25, 3, WOODL, 1) +
      p('M38 4L30 1V7Z', IRON) +
      p('M10 4L2 1L4 4L2 7Z', TEAL),
    1.5,
  ),
);

const RET = 'M45 7V24M45 66V83M7 45H24M66 45H83';
const reticle = centred(
  90,
  90,
  `<circle cx="45" cy="45" r="31" fill="none" stroke="${INK}" stroke-width="10"/>` +
    hl(RET, INK, 10) +
    `<circle cx="45" cy="45" r="31" fill="none" stroke="${CREAM}" stroke-width="4.5"/>` +
    hl(RET, CREAM, 4.5) +
    c(45, 45, 4, CREAM).replace('/>', ` stroke="${INK}" stroke-width="2.5"/>`),
);

// ---------------------------------------------------------------------------------------------
// Cursor hands
// ---------------------------------------------------------------------------------------------

const handOpenShapes =
  `<rect x="21" y="10" width="11" height="36" rx="5.5" transform="rotate(-9 26 46)"/>` +
  `<rect x="33" y="5" width="12" height="40" rx="6"/>` +
  `<rect x="46" y="9" width="11" height="36" rx="5.5" transform="rotate(8 51 46)"/>` +
  `<rect x="54" y="20" width="10" height="28" rx="5" transform="rotate(8 58 48)"/>` +
  `<rect x="5" y="42" width="30" height="12" rx="6" transform="rotate(38 20 48)"/>` +
  `<rect x="20" y="33" width="40" height="33" rx="13"/>`;

const handOpen = art(
  72,
  72,
  39,
  49,
  blob(handOpenShapes, WHITE, 3) + hl('M33 36V26M45 36V26M54 38L56 28', INK, 2.5),
);

const handClosedShapes =
  `<circle cx="24" cy="24" r="9"/><circle cx="36" cy="21" r="9.5"/><circle cx="48" cy="23" r="9"/><circle cx="58" cy="29" r="8"/>` +
  `<rect x="15" y="24" width="50" height="36" rx="14"/>` +
  `<rect x="8" y="38" width="16" height="13" rx="6"/>`;

const handClosed = art(
  72,
  72,
  39,
  43,
  blob(handClosedShapes, WHITE, 3) +
    hl('M30 18V28M42 18V28M53 22V32', INK, 2.5) +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round"><rect x="12" y="37" width="36" height="14" rx="7" fill="${WHITE}"/></g>`,
);

// ---------------------------------------------------------------------------------------------
// Debris, pickups and particles
// ---------------------------------------------------------------------------------------------

const gibHelmet = centred(
  26,
  26,
  ink(
    l('M5 13C2 4 9 2 11 4', 2.5) +
      p('M3 19C2 8 8 4 13 4C18 4 24 7 23 19L19 17L15 13L11 15L8 18Z', IRONL) +
      r(1, 18, 24, 5, IRON, 2) +
      hl('M15 13L12 9M15 13L19 11', INK, 1.5),
    2.5,
  ),
);

const gibPlate = centred(
  26,
  26,
  ink(p('M4 7L14 2L23 6L21 19L12 24L6 19Z', IRONL) + hl('M9 8L15 6M8 12L13 11', WHITE, 2, 0.75) + dots([[18, 9], [17, 17]], 2.5), 2.5),
);

const gibBoot = centred(
  26,
  26,
  ink(p('M9 3H19V15L24 17C25 21 24 23 22 23H6C4 18 8 12 9 3Z', WOOD) + r(5, 20, 20, 4, WOODD, 1.5) + r(8, 3, 12, 4, WOODL, 1.5), 2.5),
);

const gibStick = centred(
  26,
  26,
  ink(p('M3 20L18 4L22 7L9 25L7 21L5 23Z', WOOD) + hl('M9 17L17 8', WOODL, 2) + p('M20 2L25 2L22 7Z', WOODL), 2.5),
);

const coin = centred(
  28,
  28,
  ink(
    c(14, 14, 12, MUST) +
      `<circle cx="14" cy="14" r="8" fill="${MUSTL}" stroke-width="1.5"/>` +
      `<g stroke-width="1">${p(starPoints(14, 14, 5, 2, 6), RUST)}</g>` +
      hl('M6 11A8 8 0 0 1 11 5', WHITE, 1.8),
    2.5,
  ),
);

const offering = centred(
  28,
  28,
  `<circle cx="20" cy="9" r="8" fill="#4fe3d0" opacity=".35"/>` +
    ink(
      p('M3 16L19 7L25 16V24H3Z', MUST) +
        p('M3 16H25V24H3Z', MUSTL) +
        c(9, 20, 1.8, MUST) +
        c(19, 21, 1.4, MUST),
      2.2,
    ) +
    hl('M20 4V13M16 8.5L20 13L24 8.5', GLOW, 2),
);

const splat = (shapes: string, shine: string) =>
  centred(120, 34, blob(shapes, RED, 2.2) + n(shine, REDL, 0.9));

const splat1 = splat(
  `<ellipse cx="58" cy="18" rx="38" ry="11"/><ellipse cx="34" cy="20" rx="17" ry="7"/><ellipse cx="86" cy="14" rx="15" ry="7"/>` +
    `<ellipse cx="12" cy="24" rx="6" ry="3"/><ellipse cx="108" cy="11" rx="7" ry="3.5"/><circle cx="102" cy="25" r="3"/><circle cx="66" cy="5" r="2.5"/>`,
  'M40 15C50 11 66 11 76 13C66 15 50 16 42 18Z',
);
const splat2 = splat(
  `<ellipse cx="60" cy="17" rx="30" ry="12"/><ellipse cx="30" cy="12" rx="18" ry="6"/><ellipse cx="92" cy="22" rx="19" ry="7"/>` +
    `<ellipse cx="46" cy="27" rx="12" ry="4"/><ellipse cx="9" cy="17" rx="5" ry="3"/><ellipse cx="114" cy="16" rx="4" ry="2.5"/><circle cx="78" cy="5" r="3"/>`,
  'M46 12C56 8 72 9 80 12C70 14 56 15 48 16Z',
);
const splat3 = splat(
  `<ellipse cx="44" cy="17" rx="26" ry="10"/><ellipse cx="80" cy="16" rx="24" ry="11"/><ellipse cx="60" cy="26" rx="14" ry="5"/>` +
    `<ellipse cx="16" cy="10" rx="8" ry="4"/><ellipse cx="108" cy="24" rx="9" ry="4"/><circle cx="24" cy="27" r="3"/><circle cx="110" cy="9" r="2.5"/>`,
  'M64 12C74 8 90 9 96 13C86 15 74 15 66 16Z',
);

const drop1 = centred(14, 14, ink(p('M7 2C9 6 12 7 12 10C12 12 10 13 7 13C4 13 2 12 2 10C2 7 5 6 7 2Z', RED) + n('M5 9a1.5 1.5 0 0 1 2-2v2Z', REDL), 1.5));

const dust = centred(
  60,
  60,
  blob(
    `<circle cx="20" cy="36" r="13"/><circle cx="30" cy="21" r="14"/><circle cx="43" cy="33" r="12"/><circle cx="31" cy="42" r="12"/>`,
    CREAM,
    2.5,
    '#c9b58c',
  ) + n('M22 19a11 11 0 0 1 12-5a14 14 0 0 0-9 9Z', WHITE, 0.9),
);

const spark = centred(20, 20, ink(p(starPoints(10, 10, 9, 3, 4), MUSTL), 1.5) + c(10, 10, 2, WHITE).replace('/>', ' stroke="none"/>'));

const star = centred(26, 26, ink(p(starPoints(13, 14, 11.5, 5, 5), MUSTL) + n('M13 7l2 5-5 .5Z', WHITE, 0.8), 2.2));

const flame = (outer: string, mid: string, core: string) =>
  art(60, 90, 30, 90, ink(p(outer, RUST) + `<g stroke-width="2.5">${p(mid, MUST)}</g>` + n(core, CREAM)));

const flame1 = flame(
  'M30 3C34 20 46 26 50 44C56 34 54 28 54 26C60 44 56 80 42 87H18C4 80 0 56 10 40C12 46 14 48 18 48C14 32 22 16 30 3Z',
  'M30 32C34 44 44 50 44 66C44 76 38 84 30 84C22 84 15 76 16 64C18 68 20 68 22 68C20 56 26 42 30 32Z',
  'M30 58C33 64 36 68 36 74C36 80 33 83 30 83C27 83 24 80 24 74C24 68 28 64 30 58Z',
);
const flame2 = flame(
  'M38 3C36 16 50 26 52 42C52 48 50 50 48 50C56 56 56 78 42 87H18C6 80 2 62 8 48C12 52 14 52 16 50C12 34 26 24 38 3Z',
  'M36 28C36 42 46 52 44 68C42 78 38 84 30 84C20 84 14 74 18 62C20 64 22 64 24 62C22 50 32 42 36 28Z',
  'M32 56C32 64 38 68 36 76C35 81 33 83 30 83C26 83 23 79 25 72C27 68 30 64 32 56Z',
);
const flame3 = flame(
  'M22 3C28 18 22 26 32 36C36 30 36 24 34 18C46 28 58 50 54 70C52 80 46 86 42 87H18C8 84 2 70 6 54C8 44 16 44 16 34C16 22 20 12 22 3Z',
  'M26 36C30 50 38 50 44 62C46 74 40 84 30 84C20 84 14 76 16 64C18 54 26 50 26 36Z',
  'M30 60C31 66 36 70 36 76C36 81 33 83 30 83C27 83 24 80 24 76C24 70 29 66 30 60Z',
);

const iceBlock = art(
  90,
  120,
  45,
  120,
  ink(
    `<g fill-opacity=".65">${p('M6 12Q6 4 14 4H76Q84 4 84 12V110Q84 118 76 118H14Q6 118 6 110Z', '#86c8e6')}</g>`,
  ) +
    n('M10 24L24 8H60L14 70Z', WHITE, 0.45) +
    n('M84 84L60 116H78L84 108Z', '#3f86b4', 0.4) +
    hl('M62 30L52 44L60 54L48 68M60 54L72 60', WHITE, 2.5, 0.85),
);

const shieldBubble = centred(
  110,
  130,
  ink(`<ellipse cx="55" cy="65" rx="50" ry="60" fill="#e8a02a" fill-opacity=".35"/>`, 3.5) +
    hl('M18 48C22 30 34 18 48 14', WHITE, 5, 0.75) +
    hl('M18 62v.1', WHITE, 5, 0.75) +
    hl('M92 92C86 104 76 112 66 116', '#f7d68a', 3.5, 0.75),
);

// ---------------------------------------------------------------------------------------------
// Signboard
// ---------------------------------------------------------------------------------------------

function pineCone(x: number, y: number): string {
  const scales = (dx: number, dy: number) => l(`M${x + dx - 8} ${y + dy}q8 8 16 0`, 2.5);
  return (
    p(`M${x - 34} ${y - 4}L${x - 14} ${y - 10}L${x - 18} ${y + 2}Z`, FOREST) +
    p(`M${x + 34} ${y - 4}L${x + 14} ${y - 10}L${x + 18} ${y + 2}Z`, FOREST) +
    p(`M${x - 30} ${y + 18}L${x - 12} ${y + 2}L${x - 12} ${y + 14}Z`, FOREST) +
    p(`M${x + 30} ${y + 18}L${x + 12} ${y + 2}L${x + 12} ${y + 14}Z`, FOREST) +
    p(`M${x} ${y - 28}C${x + 22} ${y - 20} ${x + 22} ${y + 14} ${x} ${y + 30}C${x - 22} ${y + 14} ${x - 22} ${y - 20} ${x} ${y - 28}Z`, RUSTD) +
    scales(0, -18) + scales(-8, -7) + scales(8, -7) + scales(0, 3) + scales(-7, 13) + scales(7, 13)
  );
}

const banner = art(
  640,
  130,
  320,
  0,
  ink(
    l('M96 0L88 40M96 0L104 40M544 0L536 40M544 0L552 40', 3.5, WOODD) +
      p('M18 38H622Q634 38 634 50L626 80L634 112Q634 124 622 124H18Q6 124 6 112L14 80L6 50Q6 38 18 38Z', WOOD) +
      hl('M18 45H622', WOODL, 3) +
      r(112, 50, 416, 64, CREAM, 8) +
      `<g stroke-width="2.5">${r(120, 56, 400, 52, '#ecdcb6', 5)}</g>` +
      pineCone(60, 80) +
      pineCone(580, 80) +
      r(84, 32, 24, 12, MUST, 4) +
      r(532, 32, 24, 12, MUST, 4),
  ),
);

// ---------------------------------------------------------------------------------------------
// Enamel weapon icons
// ---------------------------------------------------------------------------------------------

const badge = (colour: string, glyph: string) =>
  centred(
    64,
    64,
    ink(c(32, 32, 29, colour) + hl('M32 7a25 25 0 1 1-.1 0Z', CREAM, 2, 0.6) + `<g stroke-width="2.5">${glyph}</g>`, 3.5),
  );

const iconWheel = badge(
  TEAL,
  c(32, 32, 17, STONE) +
    `<circle cx="32" cy="32" r="11" fill="${STONEL}" stroke-width="2"/>` +
    l('M32 21V43M21 32H43', 3, STONED) +
    c(32, 32, 4, INK),
);

const iconStomper = badge(
  PLUM,
  r(19, 13, 26, 21, STONE, 3) +
    hl('M25 19H39M25 26H39', STONED, 3) +
    p('M32 50L24 39H40Z', MUSTL) +
    l('M15 50H24M40 50H49', 3.5),
);

const iconComet = badge(
  TEALD,
  p('M18 46C14 30 30 28 32 20C36 26 40 18 50 12C48 22 54 24 48 36C46 46 26 58 18 46Z', RUST) +
    p('M26 42C24 34 34 32 36 26C40 30 44 26 46 22C46 30 46 40 26 42Z', MUST) +
    c(26, 42, 10, PLUM) +
    hl('M20 40a7 7 0 0 1 5-5', '#94648a', 2.5),
);

const iconMortar = badge(
  FOREST,
  p('M24 39L19 22L39 13L46 29Z', IRON) +
    p('M16 22L41 10L44 16L19 28Z', IRONL) +
    r(14, 40, 36, 10, WOOD, 3) +
    c(24, 42, 5, WOODD) +
    c(42, 42, 5, WOODD),
);

const iconFrost = badge(
  '#3f7fa6',
  p('M14 46C28 46 38 40 44 24L51 28C47 46 32 54 16 54Z', CREAM) +
    l('M38 40L43 45M31 44L35 50', 2) +
    l('M24 13V33M15 18L33 28M33 18L15 28', 3, GLOW),
);

const iconBellows = badge(
  RUST,
  p('M52 18C52 14 48 12 44 14L22 28V36L44 50C48 52 52 50 52 46Z', WOOD) +
    r(16, 29, 8, 6, IRON, 1) +
    l('M36 24V40M44 20V44', 2.5) +
    p('M15 32C10 28 10 22 12 18C8 22 4 26 6 34C8 40 12 42 14 40Z', MUSTL),
);

const iconBolter = badge(
  '#a97a1f',
  l('M16 16C30 22 42 34 48 48', 5, WOODD) +
    hl('M16 16C30 22 42 34 48 48', WOODL, 2) +
    l('M16 16L24 44L48 48', 1.5, CREAM) +
    l('M12 52L42 22', 4, IRON) +
    p('M49 15L37 21L43 27Z', IRONL) +
    p('M9 55L8 46L14 50Z', RUST),
);

const iconPause = badge(IRON, r(20, 17, 9, 30, CREAM, 3) + r(35, 17, 9, 30, CREAM, 3));

const iconLocked = badge(
  STONED,
  l('M23 31V23C23 12 41 12 41 23V31', 5, INK) +
    hl('M23 31V23C23 12 41 12 41 23V31', IRONL, 2) +
    r(17, 30, 30, 21, MUST, 4) +
    c(32, 38, 3.5, INK) +
    l('M32 40V45', 3),
);

const iconCastle = centred(
  40,
  40,
  ink(
    p('M9 37V24H31V37Z', STONE) +
      p('M9 24V14H31V24Z', CREAM) +
      l('M20 14V24', 2, WOOD) +
      p('M4 16L20 2L36 16L31 18L20 9L9 18Z', RUST) +
      r(23, 28, 7, 9, '#17110c', 1),
    2.5,
  ),
);

// ---------------------------------------------------------------------------------------------

export const PROPS: Record<string, Art> = {
  keep: art(240, 580, 0, 580, ink(keepBody)),
  gate0: art(74, 150, 0, 150, gate0),
  gate1: art(74, 150, 0, 150, gate1),
  gate2: art(74, 150, 0, 150, gate2),
  gate3: art(74, 150, 0, 150, gate3),
  gate4: art(74, 150, 0, 150, gate4),
  crack1: art(74, 150, 0, 150, crack1Body),
  crack2: art(74, 150, 0, 150, crack2Body),
  crack3: art(74, 150, 0, 150, crack3Body),
  cauldronBack,
  cauldronFront,
  perch: art(
    110,
    250,
    55,
    250,
    ink(
      r(56, 14, 22, 228, WOOD, 4) +
        hl('M63 24V230', WOODL, 3) +
        r(14, 14, 66, 16, WOODD, 4) +
        p('M78 30L56 30L78 56Z', WOODD) +
        r(52, 60, 30, 10, IRON, 2) +
        e(66, 244, 40, 6, STONED) +
        l('M24 30V96C24 118 42 122 42 100', 11) +
        hl('M24 30V96C24 118 42 122 42 100', IRONL, 5),
    ),
  ),
  eagleA,
  eagleB,
  wheel,
  slab,
  comet,
  bomb,
  stone,
  bolt,
  roofBolt,
  reticle,
  handOpen,
  handClosed,
  gibHelmet,
  gibPlate,
  gibBoot,
  gibStick,
  coin,
  offering,
  splat1,
  splat2,
  splat3,
  drop1,
  dust,
  spark,
  star,
  flame1,
  flame2,
  flame3,
  iceBlock,
  shieldBubble,
  banner,
  iconWheel,
  iconStomper,
  iconComet,
  iconMortar,
  iconFrost,
  iconBellows,
  iconBolter,
  iconPause,
  iconLocked,
  iconCastle,
};
