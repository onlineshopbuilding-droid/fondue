/**
 * Environment and prop art in Fondue's folk-art felt puppet style: chunky rounded shapes, a thick
 * dark outline, flat fills and at most one simple highlight.
 */
import type { Art } from './types';
import { CASTLE_ART, KEEP_PROPS } from './castle';
import {
  INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, FOREST, PLUM, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL,
  RED, REDL, GLOW, WHITE, GOLD, GOLDD, ink, r, c, l, n, hl, blob, art, centred, starPoints,
} from './draw';

// ---------------------------------------------------------------------------------------------
// Gates, crack overlays and the road cauldron are drawn in castle.ts with the rest of the keep.
// ---------------------------------------------------------------------------------------------

const { gate0, gate1, gate2, gate3, gate4, crack1Body, crack2Body, crack3Body, cauldronBack, cauldronFront } = KEEP_PROPS;

// =============================================================================================
// From here on: projectiles, hands, debris, effects, signboard and badges.
// Light from the upper left. Free-floating pieces keep a clean margin to the edge of their box.
// =============================================================================================
import * as sh from './shade';

/** Centred art in a box `padX`/`padY` larger on each side: same drawn size and centre, clean margin. */
const fxPad = (w: number, h: number, padX: number, padY: number, b: string) =>
  centred(w + padX * 2, h + padY * 2, `<g transform="translate(${padX} ${padY})">${b}</g>`);
const fxCirc = (cx: number, cy: number, rad: number) =>
  `M${cx - rad} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
const fxEll = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
const fxRect = (x: number, y: number, w: number, h: number, rad: number) =>
  `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}` +
  `H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`;
/** Point on a circle, for rings of joints, rivets and ticks. */
const fxAt = (cx: number, cy: number, rad: number, a: number) => `${sh.r1(cx + Math.cos(a) * rad)} ${sh.r1(cy + Math.sin(a) * rad)}`;
/** Arc along a circle from angle a0 to a1 (radians, clockwise). */
const fxArc = (cx: number, cy: number, rad: number, a0: number, a1: number) =>
  `M${fxAt(cx, cy, rad, a0)}A${rad} ${rad} 0 0 1 ${fxAt(cx, cy, rad, a1)}`;
/** Crescent shading for a group of plain shapes that merge into one form, like `blob`. */
const fxShade = (shapes: string, dx: number, dy: number, fill: string, o = 1) => {
  const id = sh.uid('fm');
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000">` +
    `<g fill="#fff" stroke="none">${shapes}</g><g fill="#000" stroke="none" transform="translate(${dx} ${dy})">${shapes}</g></mask>` +
    `<g fill="${fill}" stroke="none" mask="url(#${id})"${o < 1 ? ` opacity="${o}"` : ''}>${shapes}</g>`
  );
};
/** An iron rivet with a glint. */
const fxRivet = (x: number, y: number, rad = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${rad}" fill="${IRONL}" stroke="${INK}" stroke-width="${sh.r1(rad * 0.6)}"/>` +
  `<circle cx="${sh.r1(x - rad * 0.35)}" cy="${sh.r1(y - rad * 0.35)}" r="${sh.r1(rad * 0.4)}" fill="${WHITE}" stroke="none" opacity=".85"/>`;
/** A small four-point twinkle. */
const fxTwinkle = (x: number, y: number, s: number, col = WHITE, o = 1) => {
  const k = s * 0.2;
  return sh.paint(
    `M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z`,
    col,
    o,
  );
};
/** Shading offset (dx, dy) seen from inside a group rotated by `deg`, so light stays upper left. */
const fxRot = (dx: number, dy: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [sh.r1(dx * Math.cos(a) + dy * Math.sin(a)), sh.r1(-dx * Math.sin(a) + dy * Math.cos(a))];
};

// ---------------------------------------------------------------------------------------------
// Weapons and projectiles
// ---------------------------------------------------------------------------------------------

/** Stone wheel: twelve rim blocks, a dressed stone disc with a carved cross and an iron hub. */
const wheel = (() => {
  const rnd = sh.rng(7);
  const rim = sh.radial([[0, STONEL], [0.6, STONE], [1, STONED]], 0.4, 0.38, 0.66);
  const disc = sh.radial([[0, '#d6d0bc'], [0.7, STONEL], [1, STONE]], 0.42, 0.4, 0.62);
  const hub = sh.radial([[0, '#959ba2'], [0.55, IRON], [1, '#2c2f34']], 0.36, 0.34, 0.7);
  const RIM = fxCirc(50, 50, 46);
  const DISC = fxCirc(50, 50, 33);
  let blocks = '';
  let joints = '';
  for (let i = 0; i < 12; i++) {
    const a0 = (i * Math.PI) / 6;
    const a1 = a0 + Math.PI / 6;
    joints += `M${fxAt(50, 50, 33, a0)}L${fxAt(50, 50, 46, a0)}`;
    // Every block a slightly different stone, with a pit and a worn light edge.
    const k = rnd() - 0.5;
    blocks += sh.paint(
      `M${fxAt(50, 50, 46, a0)}A46 46 0 0 1 ${fxAt(50, 50, 46, a1)}L${fxAt(50, 50, 33, a1)}A33 33 0 0 0 ${fxAt(50, 50, 33, a0)}Z`,
      k < 0 ? STONED : STONEL,
      sh.r1(Math.abs(k) * 0.5 + 0.05),
    );
    const pa = a0 + 0.18 + rnd() * 0.17;
    const pr = 37 + rnd() * 5;
    const px = 50 + Math.cos(pa) * pr;
    const py = 50 + Math.sin(pa) * pr;
    blocks +=
      `<circle cx="${sh.r1(px + 0.7)}" cy="${sh.r1(py + 0.7)}" r="1.5" fill="${CREAM}" stroke="none" opacity=".45"/>` +
      `<circle cx="${sh.r1(px)}" cy="${sh.r1(py)}" r="${sh.r1(1.1 + rnd() * 0.8)}" fill="#5f5a50" stroke="none" opacity=".75"/>` +
      sh.stroke(fxArc(50, 50, 43.4, a0 + 0.08, a0 + 0.3 + rnd() * 0.1), CREAM, 1.3, 0.4);
  }
  let chisel = '';
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 15 + rnd() * 14;
    const x = 50 + Math.cos(a) * rr;
    const y = 50 + Math.sin(a) * rr;
    chisel += `M${sh.r1(x)} ${sh.r1(y)}l${sh.r1(2 + rnd() * 2)} ${sh.r1(1 + rnd())}`;
  }
  const CROSS = 'M50 19V81M19 50H81';
  return centred(
    100,
    100,
    `<defs>${rim.def}${disc.def}${hub.def}</defs>` +
      `<path d="${RIM}" fill="${rim.url}" stroke="none"/>` +
      blocks +
      sh.stroke(fxArc(50, 50, 43.5, 3.5, 4.4), WHITE, 2.2, 0.35) +
      sh.stroke(joints, INK, 2.4) +
      `<path d="${DISC}" fill="${disc.url}" stroke="none"/>` +
      sh.within(DISC, sh.stroke(chisel, STONED, 1, 0.45) + sh.stroke(fxCirc(50, 50, 33), STONED, 5, 0.35)) +
      sh.stroke(CROSS, STONED, 7) +
      sh.stroke(CROSS, '#5c574d', 2.6, 0.85) +
      sh.stroke('M52.8 21V47M52.8 53V79M21 52.8H47M53 52.8H79', CREAM, 1.1, 0.45) +
      `<path d="${DISC}" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<path d="${fxCirc(50, 50, 12.5)}" fill="${hub.url}" stroke="${INK}" stroke-width="3"/>` +
      fxRivet(56, 44, 1.7) + fxRivet(56, 56, 1.7) + fxRivet(44, 56, 1.7) + fxRivet(44, 44, 1.7) +
      `<circle cx="50" cy="50" r="3.8" fill="${INK}" stroke="none"/>` +
      sh.glint(46.5, 45.5, 1.3, WHITE, 0.7) +
      `<path d="${RIM}" fill="none" stroke="${INK}" stroke-width="4"/>`,
  );
})();

/** Carved stone that the Stomper drops: chipped edges, moss on top, a carved pine and runes. */
const slab = (() => {
  const rnd = sh.rng(23);
  const BODY =
    'M17 12Q18 6 26 5H66L71 9L77 5H133Q141 5 143 12L147.6 118L152 125L148.3 132L155 289Q155 296 148 296H12Q5 296 5 289' +
    'L9.6 190L6 183L10 176Z';
  const face = sh.linear([[0, '#aca695'], [0.55, STONE], [1, '#878174']], 90);
  let speck = '';
  let lightSpeck = '';
  for (let i = 0; i < 70; i++) {
    const x = sh.r1(14 + rnd() * 132);
    const y = sh.r1(12 + rnd() * 278);
    const rad = sh.r1(0.8 + rnd() * 1.6);
    if (i % 3 === 0) lightSpeck += `M${x} ${y}h.01`;
    else speck += `<circle cx="${x}" cy="${y}" r="${rad}"/>`;
  }
  const PANEL = 'M38 26H122L132 274H28Z';
  const PINE = 'M80 72L118 142H96L124 196H36L64 142H42Z';
  const RUNES = 'M50 248h14M72 240v18M88 248l10-8M88 248l10 8M112 240v18';
  const carve = (d: string, w: number) => sh.stroke(d, '#57524a', w) + sh.stroke(d.replace(/M(\d+) (\d+)/g, (_, x: string, y: string) => `M${+x + 1.4} ${+y + 1.4}`), STONEL, 1.2, 0.55);
  const moss =
    `<g fill="${FOREST}" stroke="none">${['M14 17Q15 6 26 6Q36 2 46 7Q52 11 46 14Q40 17 33 15Q27 19 21 17Q16 21 14 17Z', 'M100 8Q110 2 122 5Q130 7 126 11Q118 13 110 12Q102 13 100 8Z', 'M140 26Q148 30 147 46Q141 42 140 26Z'].map((d) => `<path d="${d}"/>`).join('')}</g>` +
    sh.stroke('M18 11Q22 7 28 8M31 7Q37 5 42 8M104 7Q110 4 117 6', '#86ad6a', 2, 0.9) +
    `<g fill="#2f5236" stroke="none"><circle cx="24" cy="13" r="1.2"/><circle cx="36" cy="12" r="1"/><circle cx="114" cy="9" r="1"/></g>`;
  return art(
    160,
    300,
    80,
    300,
    `<defs>${face.def}</defs>` +
      `<path d="${BODY}" fill="${face.url}" stroke="none"/>` +
      sh.within(
        BODY,
        `<g fill="${STONED}" opacity=".45">${speck}</g>` +
          sh.stroke(lightSpeck, CREAM, 2, 0.4) +
          sh.paint('M0 280H160V300H0Z', '#5c574d', 0.35) +
          sh.paint('M18 10H40L28 292H8Z', STONEL, 0.35) +
          sh.paint('M142 52L151 70L145 88Z', STONED, 0.7) +
          sh.paint('M7 232L15 222L16 256Z', STONED, 0.6) +
          sh.stroke('M136 40L127 57L132 70M24 228L35 245L31 262M118 284l-6-10 5-8', '#5f5a50', 1.6, 0.7) +
          moss,
      ) +
      sh.crescent(BODY, -6, -6.6, '#2a2340', 0.22) +
      sh.crescent(BODY, 3, 3.3, CREAM, 0.35) +
      carve(PANEL.replace(/Z$/, 'L38 26'), 4.5) +
      sh.lit(PINE, STONEL, { outline: 3, shadow: 3.5, light: 1.6 }) +
      sh.stroke('M80 80V188M80 118L94 130M80 118L66 130M80 158L100 176M80 158L60 176', STONE, 1.6, 0.8) +
      sh.lit('M80 72L96 102L84 96L76 106L66 100Z', CREAM, { outline: 2.5, shadow: 1.6, light: 0 }) +
      sh.lit(fxRect(70, 196, 20, 26, 2), STONED, { outline: 3, shadow: 2.5, light: 1.2 }) +
      carve(RUNES, 4.5) +
      `<path d="${BODY}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  );
})();

/** Falling comet: a glowing rock with lava cracks and a hot core inside a flame tail. */
const comet = (() => {
  const TAIL = 'M34 66C14 54 16 38 26 30C26 18 36 24 40 16C44 6 54 12 62 2C62 12 76 12 74 24C78 30 76 42 70 48C66 62 48 74 34 66Z';
  const MID = 'M34 62C22 50 24 40 34 32C38 22 48 22 58 14C58 22 68 26 64 36C70 46 58 64 34 62Z';
  const CORE = 'M38 60C30 52 32 44 40 40C44 34 50 32 55 27C54 36 57 42 51 50C47 56 43 60 38 60Z';
  const ROCK = 'M16 46C20 32 40 28 50 38C60 48 56 66 42 72C26 78 10 62 16 46Z';
  const CRACKS = 'M28 66L34 56L30 48M34 56L46 52L50 44M46 52L50 62';
  const tail = sh.linear([[0, RUSTD], [0.55, RUST], [1, '#ec7a36']], 135);
  const mid = sh.linear([[0, MUST], [1, MUSTL]], 135);
  const rock = sh.radial([[0, '#a0629a'], [0.5, PLUM], [1, '#3a1d35']], 0.34, 0.3, 0.78);
  return fxPad(
    80,
    80,
    6,
    6,
    `<defs>${tail.def}${mid.def}${rock.def}</defs>` +
      `<path d="${TAIL}" fill="#ffc861" stroke="#ffc861" stroke-width="7" stroke-linejoin="round" opacity=".18"/>` +
      `<path d="${ROCK}" fill="#ffa64a" stroke="#ffa64a" stroke-width="7" opacity=".2"/>` +
      `<path d="${TAIL}" fill="${tail.url}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
      sh.stroke('M60 8L52 20M70 20L62 30M46 16L42 24', MUSTL, 1.8, 0.55) +
      `<path d="${MID}" fill="${mid.url}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      sh.paint(CORE, '#fff4c8', 0.92) +
      `<path d="${ROCK}" fill="${rock.url}" stroke="none"/>` +
      sh.crescent(ROCK, -3.2, 3.2, '#ff8a3a', 0.85) +
      sh.crescent(ROCK, 2, 2.2, '#c08ab2', 0.75) +
      `<g fill="#3b1d36" stroke="none" opacity=".8"><circle cx="23" cy="56" r="2.6"/><circle cx="41" cy="65" r="2"/><circle cx="21" cy="45" r="1.5"/></g>` +
      sh.stroke('M21.5 58.2a2.6 2.6 0 0 0 3.4-1.4M39.6 66.8a2 2 0 0 0 3-1', '#c08ab2', 1, 0.8) +
      sh.stroke(CRACKS, '#ff9b3d', 5, 0.5) +
      sh.stroke(CRACKS, MUSTL, 2.6) +
      sh.stroke(CRACKS, '#fff6d0', 1) +
      sh.glint(23, 41, 1.6, WHITE, 0.8) +
      `<path d="${ROCK}" fill="none" stroke="${INK}" stroke-width="3.5"/>` +
      `<g stroke="${INK}" stroke-width="1.1"><circle cx="71" cy="5" r="1.7" fill="${MUSTL}"/><circle cx="78" cy="15" r="1.3" fill="${MUSTL}"/><circle cx="52" cy="4" r="1.2" fill="${MUST}"/></g>`,
  );
})();

/** Black powder bomb: shiny iron ball with a seam, collar, braided fuse and a fizzing spark. */
const bomb = (() => {
  const BALL = fxCirc(17, 26, 13);
  const ball = sh.radial([[0, '#8a9198'], [0.42, IRON], [1, '#1f2226']], 0.34, 0.3, 0.78);
  const FUSE = 'M23 10C24 4 28.5 5.5 31.5 4.5';
  return fxPad(
    36,
    40,
    5,
    5,
    `<defs>${ball.def}</defs>` +
      sh.litTube(FUSE, 2.6, '#a37b4a', { outline: 1.3, shadow: 0.8, light: 0.5 }) +
      `<path d="${FUSE}" fill="none" stroke="#5b3d20" stroke-width="2.6" stroke-dasharray="1 1.8" opacity=".6"/>` +
      `<g transform="rotate(22 23 13)">${sh.lit(fxRect(18, 9, 10, 7.5, 2), IRONL, { outline: 2.2, shadow: 2, light: 1 })}` +
      sh.stroke('M19.5 11.6H26.5', '#2f3237', 1.2, 0.7) + `</g>` +
      `<path d="${BALL}" fill="${ball.url}" stroke="none"/>` +
      sh.crescent(BALL, -3, -3.3, '#15171a', 0.55) +
      sh.within(BALL, sh.stroke('M3 27Q17 34 31 27', '#25282c', 1.6, 0.8) + sh.stroke('M3 28.4Q17 35.4 31 28.4', IRONL, 0.9, 0.6)) +
      fxRivet(10, 30.4, 1.1) + fxRivet(24, 30.4, 1.1) +
      `<ellipse cx="11.6" cy="19.8" rx="4.4" ry="2.4" transform="rotate(-40 11.6 19.8)" fill="${WHITE}" stroke="none" opacity=".5"/>` +
      sh.glint(10.8, 19.4, 1.2, WHITE, 0.95) +
      sh.stroke('M26 33.5A11 11 0 0 1 19.5 37.6', IRONL, 1.4, 0.6) +
      `<path d="${BALL}" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="31.5" cy="4.5" r="6.2" fill="${MUSTL}" stroke="none" opacity=".3"/>` +
      `<path d="${starPoints(31.5, 4.5, 5.2, 2, 5)}" fill="${MUSTL}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<circle cx="31.5" cy="4.8" r="1.3" fill="${WHITE}" stroke="none"/>`,
  );
})();

/** Thrown rock with a lit facet and a shaded facet. */
const stone = centred(
  16,
  16,
  sh.paint('M3 7L7 2H12L14 8L11 14H5Z', STONE) +
    sh.paint('M3 7L7 2H12L8.5 7.5Z', STONEL) +
    sh.paint('M14 8L11 14H5L9 9.5Z', STONED) +
    `<circle cx="10" cy="11" r=".9" fill="#5f5a50" stroke="none"/>` +
    sh.stroke('M5.2 6.2L7.6 3.2', WHITE, 0.9, 0.7) +
    `<path d="M3 7L7 2H12L14 8L11 14H5Z" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
);

/** Mortar shell: iron ball with a riveted copper band. Tinted blue or orange for frost and fire. */
const shell = (() => {
  const BALL = fxCirc(15, 15, 11);
  const ball = sh.radial([[0, '#8a9198'], [0.45, IRON], [1, '#202327']], 0.34, 0.3, 0.78);
  const BAND = 'M4.4 18.2Q15 24.4 25.6 18.2L24.8 21.6Q15 27.6 5.2 21.6Z';
  return centred(
    30,
    30,
    `<defs>${ball.def}</defs>` +
      `<path d="${BALL}" fill="${ball.url}" stroke="none"/>` +
      sh.crescent(BALL, -2.4, -2.6, '#15171a', 0.5) +
      sh.within(BALL, sh.paint(BAND, RUST) + sh.stroke('M5 19.2Q15 25.2 25 19.2', '#e08a5a', 1, 0.8) + sh.stroke(BAND, INK, 1.1)) +
      fxRivet(9.5, 22.2, 0.9) + fxRivet(15, 24, 0.9) + fxRivet(20.5, 22.2, 0.9) +
      `<ellipse cx="10.6" cy="10" rx="3.6" ry="2" transform="rotate(-40 10.6 10)" fill="${WHITE}" stroke="none" opacity=".45"/>` +
      sh.glint(10, 9.6, 1, WHITE, 0.95) +
      `<path d="${BALL}" fill="none" stroke="${INK}" stroke-width="3"/>`,
  );
})();

/** Crossbow bolt: grained shaft, glinting iron head with binding, split rust fletching. */
const bolt = fxPad(
  60,
  12,
  2,
  3,
  sh.paint('M44 6L56 0.9L53 6Z', RUST) +
    sh.paint('M44 6L56 11.1L53 6Z', RUSTD) +
    sh.stroke('M47 4.6L52 2.6M49.5 4.6L54 2.6M47 7.4L52 9.4M49.5 7.4L54 9.4', CREAM, 0.8, 0.55) +
    `<path d="M44 6L56 0.9L53 6L56 11.1Z" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="12" y="4.1" width="38" height="3.8" rx="1.4" fill="${WOODL}" stroke="${INK}" stroke-width="1.5"/>` +
    sh.stroke('M16 5.4H28M31 6.6H44', WOODD, 0.7, 0.6) +
    sh.stroke('M13 7.2H49', WOOD, 1, 0.7) +
    sh.stroke('M14.6 4.2V7.8M16.4 4.2V7.8', '#5b3d20', 1, 0.8) +
    sh.paint('M2 6L14 1V11Z', IRON) +
    sh.paint('M2 6L14 1V6Z', '#9aa1a8') +
    sh.stroke('M5 5.2L12.6 2.2', WHITE, 0.9, 0.8) +
    `<path d="M2 6L14 1V11Z" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
);

/** Small bolt from the roof ballista: iron head to the right, teal fletching. */
const roofBolt = fxPad(
  40,
  8,
  2,
  3,
  sh.paint('M11 4L2.2 1L4.2 4Z', TEAL) +
    sh.paint('M11 4L2.2 7L4.2 4Z', TEALD) +
    `<path d="M11 4L2.2 1L4.2 4L2.2 7Z" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<rect x="7" y="2.6" width="25" height="2.8" rx="1" fill="${WOODL}" stroke="${INK}" stroke-width="1.2"/>` +
    sh.stroke('M8 4.6H31', WOOD, 0.8, 0.7) +
    sh.paint('M38 4L30 1V7Z', IRON) +
    sh.paint('M38 4L30 1V4Z', '#9aa1a8') +
    `<path d="M38 4L30 1V7Z" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,
);

/** Comet aiming reticle: a cream ring with rust pointers and a target pip. */
const RET = 'M45 7V24M45 66V83M7 45H24M66 45H83';
const reticle = centred(
  90,
  90,
  `<circle cx="45" cy="45" r="29" fill="${CREAM}" stroke="none" opacity=".14"/>` +
    `<circle cx="45" cy="45" r="31" fill="none" stroke="${INK}" stroke-width="10"/>` +
    hl(RET, INK, 10) +
    `<circle cx="45" cy="45" r="31" fill="none" stroke="${CREAM}" stroke-width="4.5"/>` +
    hl(RET, CREAM, 4.5) +
    sh.stroke(fxArc(45, 45, 31, 3.55, 4.35), WHITE, 1.5, 0.95) +
    sh.stroke(fxArc(45, 45, 31, 0.4, 1.2), '#c9b48c', 1.5, 0.9) +
    `<g fill="${RUST}" stroke="${INK}" stroke-width="2"><circle cx="45" cy="24" r="2.8"/><circle cx="45" cy="66" r="2.8"/><circle cx="24" cy="45" r="2.8"/><circle cx="66" cy="45" r="2.8"/></g>` +
    `<circle cx="45" cy="45" r="4.4" fill="${RUST}" stroke="${INK}" stroke-width="2.5"/>` +
    sh.glint(43.8, 43.8, 1.1, WHITE, 0.9),
);

// ---------------------------------------------------------------------------------------------
// Cursor hands
// ---------------------------------------------------------------------------------------------

// The hands are tinted per player in game (a multiply), so they stay near white: the shading is in
// light cool greys that turn into warm or cool shadows of the player colour.
const HAND = '#fdfaf3';
const HAND_SH = sh.tone(HAND, -0.2);
const HAND_NAIL = '#f1e5e1';
const HAND_LINE = '#a3959b';

interface FxDigit { x: number; y: number; w: number; h: number; rot: number; ox: number; oy: number }

/** A finger seen from the back: rounded, shaded on the lower right, with a nail and knuckle creases. */
const fxDigit = (f: FxDigit, creases: number[]) => {
  const d = fxRect(f.x, f.y, f.w, f.h, f.w / 2);
  const [sx, sy] = fxRot(-2.6, -2.9, f.rot);
  const nw = f.w - 4.6;
  const nh = sh.r1(Math.min(9, f.h * 0.27));
  const nail = fxRect(f.x + 2.3, f.y + 2.3, nw, nh, nw / 2);
  const cr = creases
    .map((t) => {
      const y = sh.r1(f.y + f.h * t);
      return `M${f.x + 2.6} ${y}Q${f.x + f.w / 2} ${sh.r1(y + 1.8)} ${f.x + f.w - 2.6} ${y}`;
    })
    .join('');
  return (
    `<g transform="rotate(${f.rot} ${f.ox} ${f.oy})">` +
    sh.paint(d, HAND) +
    sh.crescent(d, sx, sy, HAND_SH) +
    sh.paint(nail, HAND_NAIL) +
    sh.crescent(nail, sh.r1(sx * 0.45), sh.r1(sy * 0.45), '#d8c5c1') +
    sh.stroke(nail, HAND_LINE, 0.9, 0.85) +
    sh.stroke(`M${f.x + 3.7} ${sh.r1(f.y + nh - 0.6)}V${f.y + 4.6}`, WHITE, 1.1, 0.95) +
    sh.stroke(cr, HAND_LINE, 1.1, 0.75) +
    `</g>`
  );
};

const handOpenShapes =
  `<rect x="21" y="10" width="11" height="36" rx="5.5" transform="rotate(-9 26 46)"/>` +
  `<rect x="33" y="5" width="12" height="40" rx="6"/>` +
  `<rect x="46" y="9" width="11" height="36" rx="5.5" transform="rotate(8 51 46)"/>` +
  `<rect x="54" y="20" width="10" height="28" rx="5" transform="rotate(8 58 48)"/>` +
  `<rect x="5" y="42" width="30" height="12" rx="6" transform="rotate(38 20 48)"/>` +
  `<rect x="20" y="33" width="40" height="33" rx="13"/>`;

/** The open hand: back of the hand with knuckles, nails and soft shading under one bold outline. */
const handOpen = (() => {
  const PALM = fxRect(20, 33, 40, 33, 13);
  const THUMB = fxRect(5, 42, 30, 12, 6);
  const [tx, ty] = fxRot(-2.4, -2.7, 38);
  const thumb =
    `<g transform="rotate(38 20 48)">` +
    sh.paint(THUMB, HAND) +
    sh.crescent(THUMB, tx, ty, HAND_SH) +
    sh.paint(fxRect(7.2, 44.3, 8.4, 7.4, 3.7), HAND_NAIL) +
    sh.stroke(fxRect(7.2, 44.3, 8.4, 7.4, 3.7), HAND_LINE, 0.9, 0.85) +
    sh.stroke('M9.6 45.6H13', WHITE, 1.1, 0.95) +
    sh.stroke('M18.5 44.6Q17 48 18.5 51.4', HAND_LINE, 1.1, 0.75) +
    `</g>`;
  return art(
    72,
    72,
    39,
    49,
    blob(handOpenShapes, HAND, 3) +
      fxDigit({ x: 54, y: 20, w: 10, h: 28, rot: 8, ox: 58, oy: 48 }, [0.38]) +
      fxDigit({ x: 46, y: 9, w: 11, h: 36, rot: 8, ox: 51, oy: 46 }, [0.36, 0.58]) +
      fxDigit({ x: 21, y: 10, w: 11, h: 36, rot: -9, ox: 26, oy: 46 }, [0.36, 0.58]) +
      fxDigit({ x: 33, y: 5, w: 12, h: 40, rot: 0, ox: 39, oy: 45 }, [0.34, 0.56]) +
      thumb +
      sh.paint(PALM, HAND) +
      sh.crescent(PALM, -3.6, -4, HAND_SH) +
      sh.stroke('M27.5 40Q27 50 29 58M39 40V58M49.5 41Q50 50 48.5 57', HAND_LINE, 1.1, 0.22) +
      sh.stroke('M23.8 39.5Q27.3 36.8 30.8 39.5M35.4 38.8Q39 36 42.6 38.8M47 39.4Q50.4 36.9 53.8 39.4M53.6 42.2Q56.2 40.4 58.4 42', HAND_LINE, 1.2, 0.75) +
      sh.stroke('M21.6 46.5Q25.5 50.5 24.8 56', HAND_LINE, 1.2, 0.7) +
      hl('M33 37V27M45 37V27M57.8 40L59.4 29', INK, 2.2),
  );
})();

/** The fist: four curled fingers with knuckles, the thumb across the front with its nail. */
const handClosed = (() => {
  const COLS: [number, number, number, number][] = [[50, 21, 16, 25], [39, 14, 18, 32], [26.5, 11.5, 19, 34.5], [15, 15, 18, 31]];
  const shapes =
    COLS.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`).join('') +
    `<rect x="15" y="24" width="50" height="36" rx="14"/><rect x="8" y="38" width="16" height="13" rx="6"/>`;
  const BODY = fxRect(15, 24, 50, 36, 14);
  const ROOT = fxRect(8, 38, 16, 13, 6);
  const THUMB = fxRect(12, 37, 36, 14, 7);
  const NAIL = fxRect(37.4, 39.4, 8.6, 9.2, 3.8);
  const fingers = COLS.map(([x, y, w, h]) => {
    const d = fxRect(x, y, w, h, w / 2);
    const c1 = y + 11;
    const c2 = y + 19;
    return (
      sh.paint(d, HAND) +
      sh.crescent(d, -2.4, -2.6, HAND_SH) +
      sh.stroke(`M${x + 3} ${c1}Q${x + w / 2} ${c1 + 2} ${x + w - 3} ${c1}M${x + 3.5} ${c2}Q${x + w / 2} ${c2 + 1.6} ${x + w - 3.5} ${c2}`, HAND_LINE, 1.1, 0.7) +
      sh.stroke(`M${x + 3.4} ${y + 7}Q${x + 4} ${y + 3.6} ${x + 7} ${y + 2.8}`, WHITE, 1.4, 0.9) +
      sh.stroke(d, INK, 2.2)
    );
  }).join('');
  return art(
    72,
    72,
    39,
    43,
    blob(shapes, HAND, 3) +
      sh.paint(BODY, HAND) +
      sh.crescent(BODY, -3.4, -3.8, HAND_SH) +
      sh.paint(ROOT, HAND) +
      sh.crescent(ROOT, -2, -2.2, HAND_SH) +
      fingers +
      sh.paint(fxRect(13.5, 39.5, 36, 14, 7), HAND_SH, 0.8) +
      sh.paint(THUMB, HAND) +
      sh.crescent(THUMB, -2.2, -2.5, HAND_SH) +
      sh.paint(NAIL, HAND_NAIL) +
      sh.crescent(NAIL, -1, -1.1, '#d8c5c1') +
      sh.stroke(NAIL, HAND_LINE, 0.9, 0.85) +
      sh.stroke('M39.6 41.4H43.6', WHITE, 1.1, 0.95) +
      sh.stroke('M30.5 38.6Q29 44 30.5 49.4', HAND_LINE, 1.2, 0.75) +
      sh.stroke('M24 55.5Q38 59 55 55', HAND_LINE, 1.1, 0.35) +
      `<path d="${THUMB}" fill="none" stroke="${INK}" stroke-width="2.8"/>`,
  );
})();

// ---------------------------------------------------------------------------------------------
// Debris, pickups and particles
// ---------------------------------------------------------------------------------------------

/** Knocked-off helmet: dented iron dome with a rust plume and a riveted brim. */
const gibHelmet = (() => {
  const DOME = 'M3 19C2 8 8 4 13 4C18 4 24 7 23 19L19 17L15 13L11 15L8 18Z';
  const dome = sh.radial([[0, '#adb3b9'], [0.5, IRONL], [1, IRON]], 0.34, 0.3, 0.8);
  return fxPad(
    26,
    26,
    3,
    3,
    `<defs>${dome.def}</defs>` +
      sh.lit('M6 12C1 6 5 1 11 3.6C8 5 7 8 8 11Z', RUST, { outline: 1.6, shadow: 1.2, light: 0.6 }) +
      `<path d="${DOME}" fill="${dome.url}" stroke="none"/>` +
      sh.crescent(DOME, -2.2, -2.4, IRON, 0.8) +
      sh.stroke('M7 10Q9 6.6 12.6 6', WHITE, 1.3, 0.8) +
      sh.stroke('M15 13L12 9M15 13L19 11', INK, 1.4) +
      `<path d="${DOME}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      sh.lit(fxRect(1, 18, 24, 5, 2), IRON, { outline: 2.2, shadow: 1.4, light: 0.8 }) +
      fxRivet(5, 20.5, 1) + fxRivet(13, 20.5, 1) + fxRivet(21, 20.5, 1),
  );
})();

/** Bent armour plate with scratches and rivets. Also used, tinted icy blue, as ice shards. */
const gibPlate = fxPad(
  26,
  26,
  3,
  3,
  sh.lit('M4 7L14 2L23 6L21 19L12 24L6 19Z', IRONL, { outline: 2.5, shadow: 2.6, light: 1.4 }) +
    sh.stroke('M9 8L15 6M8 12L13 11', WHITE, 1.6, 0.75) +
    sh.stroke('M10.5 17.5l4 1.6', IRON, 1, 0.7) +
    fxRivet(18, 9, 1.3) + fxRivet(17, 17, 1.3),
);

/** Lost boot: leather with laces, a turned-down cuff and a stitched sole. */
const gibBoot = fxPad(
  26,
  26,
  3,
  3,
  sh.lit('M9 3H19V15L24 17C25 21 24 23 22 23H6C4 18 8 12 9 3Z', WOOD, { outline: 2.5, shadow: 2.4, light: 1.2 }) +
    sh.stroke('M11 8.5L16.5 10.5M16.5 8.5L11 10.5M11 12L16.5 14M16.5 12L11 14', CREAM, 0.9, 0.75) +
    sh.stroke('M18.5 16.2L22 17.6', WOODL, 1, 0.6) +
    sh.lit(fxRect(5, 20, 20, 4, 1.5), WOODD, { outline: 1.8, shadow: 1, light: 0.6 }) +
    `<path d="M7 22H23" fill="none" stroke="${CREAM}" stroke-width=".8" stroke-dasharray="1.4 1.4" opacity=".55"/>` +
    sh.lit(fxRect(8, 3, 12, 4, 1.5), WOODL, { outline: 1.8, shadow: 1, light: 0.6 }),
);

/** Broken spear shaft with grain, a knot and a splinter. */
const gibStick = fxPad(
  26,
  26,
  3,
  3,
  sh.lit('M3 20L18 4L22 7L9 25L7 21L5 23Z', WOOD, { outline: 2.5, shadow: 2, light: 1 }) +
    sh.stroke('M7 18.5L16.5 8.5M10 20.6L19 10.2', WOODD, 0.8, 0.6) +
    `<ellipse cx="13.6" cy="15" rx="1.6" ry="1" transform="rotate(-45 13.6 15)" fill="${WOODD}" stroke="none"/>` +
    sh.lit('M20 2L25 2L22 7Z', WOODL, { outline: 2, shadow: 1, light: 0 }),
);

/** Gold coin: shiny rim with milled edge, recessed face with a stamped star, and a twinkle. */
const coin = (() => {
  const gold = sh.radial([[0, '#fff0b0'], [0.5, MUSTL], [1, GOLD]], 0.34, 0.3, 0.75);
  const face = sh.radial([[0, MUST], [1, MUSTL]], 0.36, 0.34, 0.75);
  let mill = '';
  for (let i = 0; i < 28; i++) mill += `M${fxAt(14, 14, 10.4, (i * Math.PI) / 14)}L${fxAt(14, 14, 11.6, (i * Math.PI) / 14)}`;
  return fxPad(
    28,
    28,
    2,
    2,
    `<defs>${gold.def}${face.def}</defs>` +
      `<circle cx="14" cy="14" r="12" fill="${gold.url}" stroke="none"/>` +
      sh.stroke(mill, GOLDD, 0.8, 0.45) +
      `<circle cx="14" cy="14" r="8.2" fill="${face.url}" stroke="${GOLDD}" stroke-width="1.2"/>` +
      sh.stroke(fxArc(14, 14, 8.2, 0.2, 1.9), '#fff3c4', 1, 0.85) +
      `<path d="${starPoints(14.6, 14.6, 5, 2, 6)}" fill="${GOLDD}" stroke="none" opacity=".55"/>` +
      `<path d="${starPoints(14, 14, 5, 2, 6)}" fill="${RUST}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>` +
      sh.stroke('M6 11A8.6 8.6 0 0 1 11 5.4', WHITE, 1.8, 0.9) +
      `<circle cx="14" cy="14" r="12" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      fxTwinkle(22.5, 5.6, 3.6, WHITE, 0.95),
  );
})();

/** Offering: a wedge of cheese with holes under a soft teal glow and a "collected" arrow. */
const offering = fxPad(
  28,
  28,
  2,
  2,
  `<circle cx="20" cy="9" r="8" fill="#4fe3d0" stroke="none" opacity=".22"/><circle cx="20" cy="9" r="5" fill="${GLOW}" stroke="none" opacity=".35"/>` +
    sh.lit('M3 16L19 7L25 16Z', '#f7d77a', { outline: 2.2, shadow: 0, light: 1 }) +
    `<ellipse cx="15" cy="12.4" rx="1.7" ry=".9" fill="${GOLD}" stroke="none" opacity=".8"/>` +
    sh.lit('M3 16H25V24H3Z', MUST, { outline: 2.2, shadow: 1.8, light: 0 }) +
    sh.stroke('M5 17.4H23', '#fff1b8', 1, 0.7) +
    sh.paint(fxCirc(9, 20, 2), '#a86d1c') + sh.stroke('M7.6 21.4a2 2 0 0 0 2.9 0', MUSTL, 0.8) +
    sh.paint(fxCirc(19, 21, 1.5), '#a86d1c') + sh.stroke('M18 22.1a1.5 1.5 0 0 0 2.1 0', MUSTL, 0.7) +
    hl('M20 4V13M16 8.5L20 13L24 8.5', TEALD, 3.4) +
    hl('M20 4V13M16 8.5L20 13L24 8.5', GLOW, 1.8),
);

/** Road stain: glossy red pool with a dark rim and a darker wet core. */
const SPLAT_EDGE = '#5e1a17';
const splat = (shapes: string, shine: string, glints: [number, number][]) =>
  centred(
    120,
    34,
    blob(shapes, RED, 2.2, SPLAT_EDGE) +
      fxShade(shapes, -3, -2.6, '#7e1519', 0.6) +
      n(shine, REDL, 0.9) +
      glints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#ffd9cf" stroke="none" opacity=".6"/>`).join(''),
  );

const splat1 = splat(
  `<ellipse cx="58" cy="18" rx="38" ry="11"/><ellipse cx="34" cy="20" rx="17" ry="7"/><ellipse cx="86" cy="14" rx="15" ry="7"/>` +
    `<ellipse cx="12" cy="24" rx="6" ry="3"/><ellipse cx="106" cy="11.5" rx="7" ry="3.5"/><circle cx="102" cy="25" r="3"/><circle cx="70" cy="8" r="1.9"/>`,
  'M40 15C50 11 66 11 76 13C66 15 50 16 42 18Z',
  [[38, 15.5], [80, 12]],
);
const splat2 = splat(
  `<ellipse cx="60" cy="17" rx="30" ry="11.5"/><ellipse cx="30" cy="12" rx="18" ry="6"/><ellipse cx="92" cy="21.5" rx="19" ry="6.8"/>` +
    `<ellipse cx="46" cy="25.5" rx="12" ry="3"/><ellipse cx="10.5" cy="17" rx="5" ry="3"/><ellipse cx="109.5" cy="16" rx="4" ry="2.5"/><circle cx="78" cy="8.5" r="2.8"/>`,
  'M46 12C56 8 72 9 80 12C70 14 56 15 48 16Z',
  [[44, 12.5], [96, 19]],
);
const splat3 = splat(
  `<ellipse cx="44" cy="17" rx="26" ry="10"/><ellipse cx="80" cy="16" rx="24" ry="10.4"/><ellipse cx="60" cy="24.5" rx="14" ry="4"/>` +
    `<ellipse cx="16" cy="10" rx="8" ry="4"/><ellipse cx="105" cy="24" rx="9" ry="4"/><circle cx="24" cy="26" r="2.5"/><circle cx="110" cy="9" r="2.5"/>`,
  'M64 12C74 8 90 9 96 13C86 15 74 15 66 16Z',
  [[62, 13], [36, 14]],
);

/** Flying droplet. */
const drop1 = (() => {
  const D = 'M7 2C9 6 12 7 12 10C12 12 10 13 7 13C4 13 2 12 2 10C2 7 5 6 7 2Z';
  const g = sh.radial([[0, REDL], [0.6, RED], [1, '#7a171b']], 0.38, 0.55, 0.7);
  return fxPad(
    14,
    14,
    2,
    2,
    `<defs>${g.def}</defs><path d="${D}" fill="${g.url}" stroke="none"/>` +
      sh.crescent(D, -1.2, -1.3, '#6e1418', 0.6) +
      sh.glint(5.2, 9, 0.9, WHITE, 0.85) +
      `<path d="${D}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,
  );
})();

/** Dust puff: soft lumpy cloud, shaded lower right, with a light top. Tinted grey as smoke. */
const DUST_SHAPES = `<circle cx="20" cy="36" r="13"/><circle cx="30" cy="21" r="14"/><circle cx="43" cy="33" r="12"/><circle cx="31" cy="42" r="12"/>`;
const dust = centred(
  60,
  60,
  blob(DUST_SHAPES, CREAM, 2.5, '#c9b58c') +
    fxShade(DUST_SHAPES, -3.6, -4, '#dccdb0') +
    fxShade(DUST_SHAPES, 2.2, 2.4, WHITE, 0.8),
);

/** Spark: a hot four-point star with a glow and a white core. */
const spark = fxPad(
  20,
  20,
  3,
  3,
  `<circle cx="10" cy="10" r="7.5" fill="${MUSTL}" stroke="none" opacity=".28"/>` +
    `<path d="${starPoints(10, 10, 9, 2.6, 4)}" fill="${MUSTL}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="${starPoints(10, 10, 5.5, 1.5, 4)}" fill="#fff6c8" stroke="none"/>` +
    `<circle cx="10" cy="10" r="2" fill="${WHITE}" stroke="none"/>`,
);

/** Daze star: a bevelled five-point star with a glint. */
const star = (() => {
  const S = starPoints(13, 14, 11.5, 5, 5);
  let facets = '';
  for (let i = 0; i < 5; i++) {
    const ao = ((-90 + i * 72) * Math.PI) / 180;
    facets += `M13 14L${fxAt(13, 14, 11.5, ao)}L${fxAt(13, 14, 5, ao + Math.PI / 5)}Z`;
  }
  return fxPad(
    26,
    26,
    1,
    1,
    sh.paint(S, MUSTL) +
      sh.paint(facets, MUST, 0.8) +
      sh.stroke('M13 5.2L11.4 10.6', WHITE, 1.3, 0.75) +
      sh.glint(10.4, 12, 1, WHITE, 0.9) +
      `<path d="${S}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
  );
})();

/** Fire on the road (three frames): dark-tipped outer tongue, a golden middle and a white-hot core. */
const flame = (outer: string, mid: string, core: string, embers: [number, number, number][]) => {
  const o = sh.linear([[0, RUSTD], [0.45, RUST], [1, '#e2683a']], 90);
  const m = sh.linear([[0, '#e48a26'], [0.6, MUST], [1, MUSTL]], 90);
  const k = sh.linear([[0, '#fff1c0'], [1, WHITE]], 90);
  return art(
    60,
    90,
    30,
    90,
    `<defs>${o.def}${m.def}${k.def}</defs>` +
      `<path d="${outer}" fill="${o.url}" stroke="none"/>` +
      sh.crescent(outer, -3, -3.3, RUSTD, 0.5) +
      sh.crescent(outer, 2, 2.2, '#f39a55', 0.8) +
      `<path d="${outer}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="${mid}" fill="${m.url}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      sh.crescent(mid, 1.6, 1.8, '#ffe28a', 0.85) +
      `<path d="${core}" fill="${k.url}" stroke="none"/>` +
      embers.map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${MUSTL}" stroke="${INK}" stroke-width="1.1"/>`).join(''),
  );
};

const flame1 = flame(
  'M30 3C34 20 46 26 50 44C56 34 54 28 54 26C60 44 56 80 42 87H18C4 80 0 56 10 40C12 46 14 48 18 48C14 32 22 16 30 3Z',
  'M30 32C34 44 44 50 44 66C44 76 38 84 30 84C22 84 15 76 16 64C18 68 20 68 22 68C20 56 26 42 30 32Z',
  'M30 58C33 64 36 68 36 74C36 80 33 83 30 83C27 83 24 80 24 74C24 68 28 64 30 58Z',
  [[14, 22, 1.6], [47, 13, 1.3]],
);
const flame2 = flame(
  'M38 3C36 16 50 26 52 42C52 48 50 50 48 50C56 56 56 78 42 87H18C6 80 2 62 8 48C12 52 14 52 16 50C12 34 26 24 38 3Z',
  'M36 28C36 42 46 52 44 68C42 78 38 84 30 84C20 84 14 74 18 62C20 64 22 64 24 62C22 50 32 42 36 28Z',
  'M32 56C32 64 38 68 36 76C35 81 33 83 30 83C26 83 23 79 25 72C27 68 30 64 32 56Z',
  [[18, 24, 1.5], [53, 14, 1.3]],
);
const flame3 = flame(
  'M22 3C28 18 22 26 32 36C36 30 36 24 34 18C46 28 58 50 54 70C52 80 46 86 42 87H18C8 84 2 70 6 54C8 44 16 44 16 34C16 22 20 12 22 3Z',
  'M26 36C30 50 38 50 44 62C46 74 40 84 30 84C20 84 14 76 16 64C18 54 26 50 26 36Z',
  'M30 60C31 66 36 70 36 76C36 81 33 83 30 83C27 83 24 80 24 76C24 70 29 66 30 60Z',
  [[44, 11, 1.6], [8, 30, 1.2]],
);

/** Ice block around a frozen raider: translucent with a frosted top, bevel, streaks, bubbles and cracks. */
const iceBlock = (() => {
  const B = 'M6 12Q6 4 14 4H76Q84 4 84 12V108Q84 116 76 116H14Q6 116 6 108Z';
  const g = sh.linear([[0, '#dff5ff', 0.8], [0.45, '#8fcde9', 0.62], [1, '#3f86b4', 0.72]], 65);
  const rnd = sh.rng(5);
  let frost = '';
  for (let i = 0; i < 26; i++) {
    const corner = i % 2 === 0;
    const x = corner ? 8 + rnd() * 22 : 60 + rnd() * 22;
    const y = corner ? 6 + rnd() * 20 : 92 + rnd() * 22;
    frost += `<circle cx="${sh.r1(x)}" cy="${sh.r1(y)}" r="${sh.r1(0.5 + rnd() * 0.9)}"/>`;
  }
  const CRACK = 'M62 30L52 44L60 54L48 68M60 54L72 60';
  return art(
    90,
    120,
    45,
    120,
    `<defs>${g.def}</defs><path d="${B}" fill="${g.url}" stroke="none"/>` +
      sh.within(
        B,
        sh.paint('M6 4H84V15Q45 19 6 15Z', WHITE, 0.32) +
          sh.paint('M74 4H84V116H74Z', '#2f6f99', 0.2) +
          sh.paint('M10 24L24 8H60L14 70Z', WHITE, 0.4) +
          sh.paint('M20 96L72 24H78L25 100Z', WHITE, 0.16) +
          sh.paint('M84 84L60 116H78L84 108Z', '#3f86b4', 0.4) +
          `<g fill="${WHITE}" stroke="none" opacity=".55">${frost}</g>` +
          `<g fill="none" stroke="${WHITE}" stroke-width="1" opacity=".6"><circle cx="24" cy="90" r="2.2"/><circle cx="30" cy="98" r="1.4"/><circle cx="66" cy="84" r="1.8"/><circle cx="20" cy="78" r="1.1"/></g>`,
      ) +
      sh.stroke(fxRect(12, 10, 66, 100, 5), WHITE, 2, 0.35) +
      `<g transform="translate(1.2 1.2)">${sh.stroke(CRACK, '#2f6f99', 2.5, 0.35)}</g>` +
      hl(CRACK, WHITE, 2.5, 0.85) +
      `<path d="${B}" fill="none" stroke="${INK}" stroke-width="3.5"/>` +
      sh.glint(15, 13, 1.6, WHITE, 0.9),
  );
})();

/** Hexer's shield: a golden soap-bubble, clear in the middle and dense at the rim, with glints. */
const shieldBubble = (() => {
  const E = fxEll(55, 65, 50, 60);
  const g = sh.radial([[0, '#ffe2a0', 0.06], [0.62, '#f2b44a', 0.16], [0.9, '#e8a02a', 0.42], [1, '#c97a1a', 0.62]]);
  return centred(
    110,
    130,
    `<defs>${g.def}</defs><path d="${E}" fill="${g.url}" stroke="none"/>` +
      `<ellipse cx="55" cy="65" rx="45.5" ry="55.5" fill="none" stroke="#ffe7a8" stroke-width="2.5" opacity=".45"/>` +
      sh.stroke('M18 48C22 30 34 18 48 14', WHITE, 5, 0.75) +
      sh.stroke('M18 62v.1', WHITE, 5, 0.75) +
      sh.stroke('M92 92C86 104 76 112 66 116', '#f7d68a', 3.5, 0.75) +
      fxTwinkle(86, 27, 4.5, WHITE, 0.9) +
      fxTwinkle(25, 101, 3.2, '#fff3c4', 0.8) +
      `<path d="${E}" fill="none" stroke="${INK}" stroke-width="3.5"/>`,
  );
})();

// ---------------------------------------------------------------------------------------------
// Signboard
// ---------------------------------------------------------------------------------------------

/** Carved ornament at each end of the signboard: pine sprigs around a cone with lit scales. */
function pineCone(x: number, y: number): string {
  const CONE = `M${x} ${y - 28}C${x + 22} ${y - 20} ${x + 22} ${y + 14} ${x} ${y + 30}C${x - 22} ${y + 14} ${x - 22} ${y - 20} ${x} ${y - 28}Z`;
  const needles = [
    `M${x - 34} ${y - 4}L${x - 14} ${y - 10}L${x - 18} ${y + 2}Z`,
    `M${x + 34} ${y - 4}L${x + 14} ${y - 10}L${x + 18} ${y + 2}Z`,
    `M${x - 30} ${y + 18}L${x - 12} ${y + 2}L${x - 12} ${y + 14}Z`,
    `M${x + 30} ${y + 18}L${x + 12} ${y + 2}L${x + 12} ${y + 14}Z`,
  ];
  const veins = `M${x - 31} ${y - 4}L${x - 17} ${y - 4.5}M${x + 31} ${y - 4}L${x + 17} ${y - 4.5}M${x - 27} ${y + 15}L${x - 13} ${y + 6}M${x + 27} ${y + 15}L${x + 13} ${y + 6}`;
  const scale = (dx: number, dy: number, lift = 0) => `M${x + dx - 8} ${y + dy - lift}q8 8 16 0`;
  const offsets: [number, number][] = [[0, -18], [-8, -7], [8, -7], [0, 3], [-7, 13], [7, 13]];
  return (
    needles.map((d) => sh.lit(d, FOREST, { outline: 3.5, shadow: 2.4, light: 1.2 })).join('') +
    sh.stroke(veins, '#7fa765', 1.2, 0.8) +
    sh.lit(CONE, RUSTD, { outline: 3.5, shadow: 4, light: 2 }) +
    sh.within(CONE, sh.stroke(offsets.map(([dx, dy]) => scale(dx, dy, 2.2)).join(''), RUST, 3, 0.9)) +
    l(offsets.map(([dx, dy]) => scale(dx, dy)).join(''), 2.5, INK)
  );
}

/** Day signboard hung on two ropes: grained planks, brass caps, a nailed parchment panel. */
const banner = (() => {
  const BOARD = 'M18 38H622Q634 38 634 50L626 80L634 112Q634 124 622 124H18Q6 124 6 112L14 80L6 50Q6 38 18 38Z';
  const ROPES = 'M96 0L88 40M96 0L104 40M544 0L536 40M544 0L552 40';
  const rnd = sh.rng(31);
  let grain = '';
  for (let i = 0; i < 15; i++) {
    const y = sh.r1(43 + i * 5.6 + rnd() * 2);
    const w = sh.r1((rnd() - 0.5) * 4);
    grain += `M6 ${y}Q170 ${sh.r1(y + w)} 320 ${y}T634 ${y}`;
  }
  const knots = [[40, 60], [600, 104], [100, 106], [560, 58]]
    .map(([kx, ky]) => `<ellipse cx="${kx}" cy="${ky}" rx="5" ry="2.4" fill="${WOODD}" stroke="none"/>` + sh.stroke(fxEll(kx, ky, 8, 4), WOODD, 1.2, 0.6))
    .join('');
  const parchment = sh.linear([[0, '#f6ebd2'], [1, '#e2cfa3']], 90);
  const cap = (x: number) => sh.lit(fxRect(x, 32, 24, 12, 4), MUST, { outline: 3.5, shadow: 2.5, light: 1.2 }) + fxRivet(x + 6, 38, 1.8) + fxRivet(x + 18, 38, 1.8);
  return art(
    640,
    130,
    320,
    0,
    l(ROPES, 7, INK) +
      `<path d="${ROPES}" fill="none" stroke="#c9a46a" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="${ROPES}" fill="none" stroke="${WOODD}" stroke-width="3.4" stroke-dasharray="1.6 3" opacity=".7"/>` +
      `<defs>${parchment.def}</defs>` +
      sh.paint(BOARD, WOOD) +
      sh.within(BOARD, sh.stroke(grain, WOODD, 1.2, 0.35) + knots + sh.stroke('M6 81H634', WOODD, 2, 0.8) + sh.stroke('M6 83.5H634', WOODL, 1, 0.5)) +
      sh.crescent(BOARD, -4, -4.4, sh.tone(WOOD, -0.3)) +
      hl('M18 45H622', WOODL, 3) +
      `<path d="${BOARD}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
      sh.lit(fxRect(112, 50, 416, 64, 8), CREAM, { outline: 3.5, shadow: 2.5, light: 1.4 }) +
      `<path d="${fxRect(120, 56, 400, 52, 5)}" fill="${parchment.url}" stroke="${INK}" stroke-width="2.5"/>` +
      sh.stroke('M124 59.5H516', WHITE, 1.4, 0.6) +
      fxRivet(116, 54, 2) + fxRivet(524, 54, 2) + fxRivet(116, 110, 2) + fxRivet(524, 110, 2) +
      pineCone(60, 80) +
      pineCone(580, 80) +
      cap(84) +
      cap(532),
  );
})();

// ---------------------------------------------------------------------------------------------
// Enamel weapon icons
// ---------------------------------------------------------------------------------------------

/** Enamel badge: brass bezel, glossy enamel face that is recessed into it, and the glyph on top. */
const badge = (colour: string, glyph: string) => {
  const enamel = sh.radial([[0, sh.tone(colour, 0.32)], [0.55, colour], [1, sh.tone(colour, -0.32)]], 0.36, 0.32, 0.75);
  const bezel = sh.linear([[0, '#f6d77c'], [0.5, GOLD], [1, GOLDD]], 60);
  const FACE = fxCirc(32, 32, 25);
  return centred(
    64,
    64,
    `<defs>${enamel.def}${bezel.def}</defs>` +
      `<circle cx="32" cy="32" r="29" fill="${bezel.url}" stroke="none"/>` +
      sh.stroke(fxArc(32, 32, 27.3, 3.3, 4.6), '#fff3c4', 1.6, 0.8) +
      `<path d="${FACE}" fill="${enamel.url}" stroke="${INK}" stroke-width="1.4"/>` +
      sh.crescent(FACE, 2, 2.2, sh.tone(colour, -0.45), 0.5) +
      sh.within(FACE, `<ellipse cx="24" cy="18" rx="17" ry="9" transform="rotate(-35 24 18)" fill="${WHITE}" stroke="none" opacity=".14"/>`) +
      ink(glyph, 2.5) +
      `<circle cx="32" cy="32" r="29" fill="none" stroke="${INK}" stroke-width="3.5"/>`,
  );
};
/** Lit fill with the thinner outline used inside badges. */
const fxGlyph = (d: string, base: string, shadow = 2, light = 1) => sh.lit(d, base, { outline: 2.5, shadow, light });

const iconWheel = (() => {
  let joints = '';
  for (let i = 0; i < 8; i++) joints += `M${fxAt(32, 32, 11, (i * Math.PI) / 4)}L${fxAt(32, 32, 17, (i * Math.PI) / 4)}`;
  return badge(
    TEAL,
    fxGlyph(fxCirc(32, 32, 17), STONE, 2.2, 1.2) +
      sh.stroke(joints, INK, 1.5) +
      sh.lit(fxCirc(32, 32, 11), STONEL, { outline: 2, shadow: 1.6, light: 0.8 }) +
      sh.stroke('M32 22.5V41.5M22.5 32H41.5', STONED, 3) +
      `<circle cx="32" cy="32" r="4.5" fill="${IRON}" stroke="${INK}" stroke-width="2"/>` +
      sh.glint(30.6, 30.6, 0.9, WHITE, 0.8),
  );
})();

const iconStomper = badge(
  PLUM,
  fxGlyph(fxRect(19, 13, 26, 21, 3), STONE, 2.4, 1.2) +
    sh.stroke('M25 19H39M25 26H39', STONED, 2.6) +
    sh.stroke('M26 20.4H38M26 27.4H38', STONEL, 0.9, 0.7) +
    fxGlyph('M32 50L24 39H40Z', MUSTL, 1.8, 0.8) +
    l('M15 50H24M40 50H49', 3.5),
);

const iconComet = badge(
  TEALD,
  fxGlyph('M18 46C14 30 30 28 32 20C36 26 40 18 50 12C48 22 54 24 48 36C46 46 26 58 18 46Z', RUST, 2, 1) +
    fxGlyph('M26 42C24 34 34 32 36 26C40 30 44 26 46 22C46 30 46 40 26 42Z', MUST, 1.4, 0.8) +
    sh.paint('M31 38C30 34 35 31 38 28C38 33 37 37 31 38Z', '#fff4c8', 0.9) +
    sh.lit(fxCirc(26, 42, 10), PLUM, { outline: 2.5, shadow: 2.2, light: 1.4, lightColor: '#b67aa6' }) +
    sh.crescent(fxCirc(26, 42, 10), -2, 2, '#ff8a3a', 0.75) +
    sh.stroke('M21 47L25 42L23 37M25 42L31 40', MUSTL, 1.8) +
    `<circle cx="26" cy="42" r="10" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
);

const iconMortar = badge(
  FOREST,
  fxGlyph('M24 39L19 22L39 13L46 29Z', IRON, 2, 1.2) +
    fxGlyph('M16 22L41 10L44 16L19 28Z', IRONL, 1.6, 0.8) +
    sh.stroke('M21 21L38 13', WHITE, 1.2, 0.6) +
    fxGlyph(fxRect(14, 40, 36, 10, 3), WOOD, 2, 1) +
    sh.stroke('M18 44H30M34 46H46', WOODD, 1, 0.6) +
    fxGlyph(fxCirc(24, 42, 5), WOODD, 1.4, 0.8) +
    fxGlyph(fxCirc(42, 42, 5), WOODD, 1.4, 0.8) +
    fxRivet(24, 42, 1.3) + fxRivet(42, 42, 1.3),
);

const iconFrost = badge(
  '#3f7fa6',
  fxGlyph('M14 46C28 46 38 40 44 24L51 28C47 46 32 54 16 54Z', CREAM, 2.4, 0) +
    l('M38 40L43 45M31 44L35 50', 2) +
    sh.stroke('M44 24L51 28', '#9ab7c9', 2.4) +
    hl('M24 13V33M15 18L33 28M33 18L15 28', INK, 5.5) +
    hl('M24 13V33M15 18L33 28M33 18L15 28', GLOW, 3) +
    `<circle cx="24" cy="23" r="1.6" fill="${WHITE}" stroke="none"/>`,
);

const iconBellows = badge(
  RUST,
  fxGlyph('M52 18C52 14 48 12 44 14L22 28V36L44 50C48 52 52 50 52 46Z', WOOD, 2.4, 1.2) +
    sh.stroke('M48 18V46M40 24.5L28 31', WOODD, 1, 0.55) +
    l('M36 24V40M44 20V44', 2.5) +
    sh.lit(fxRect(16, 29, 8, 6, 1), IRON, { outline: 2, shadow: 1.2, light: 0.6 }) +
    fxGlyph('M15 32C10 28 10 22 12 18C8 22 4 26 6 34C8 40 12 42 14 40Z', MUSTL, 1.6, 0) +
    sh.paint('M12 34C9.6 31 9.6 28 10.4 26C8.6 29 8.6 33 10 35.6Z', '#fff4c8', 0.9),
);

const iconBolter = badge(
  '#a97a1f',
  l('M16 16C30 22 42 34 48 48', 5, WOODD) +
    hl('M16 16C30 22 42 34 48 48', WOODL, 2) +
    l('M16 16L24 44L48 48', 1.5, CREAM) +
    l('M12 52L42 22', 4, IRON) +
    sh.stroke('M13 50.4L41 22.4', IRONL, 1.2, 0.8) +
    fxGlyph('M49 15L37 21L43 27Z', IRONL, 1.2, 0.6) +
    fxGlyph('M9 55L8 46L14 50Z', RUST, 1, 0),
);

const iconPause = badge(IRON, fxGlyph(fxRect(20, 17, 9, 30, 3), CREAM, 2, 0) + fxGlyph(fxRect(35, 17, 9, 30, 3), CREAM, 2, 0));

const iconLocked = badge(
  STONED,
  l('M23 31V23C23 12 41 12 41 23V31', 5, INK) +
    hl('M23 31V23C23 12 41 12 41 23V31', IRONL, 2) +
    fxGlyph(fxRect(17, 30, 30, 21, 4), MUST, 2.4, 1.2) +
    fxRivet(21.5, 34.5, 1.2) + fxRivet(42.5, 34.5, 1.2) +
    c(32, 38, 3.5, INK) +
    l('M32 40V45', 3),
);

/** Small keep for the health bar: stone base, plastered upper floor, tiled roof, door with a ring. */
const iconCastle = centred(
  40,
  40,
  ink(
    fxGlyph('M9 37V24H31V37Z', STONE, 2, 1) +
      sh.stroke('M9 30.5H22M15 24V30.5M17 30.5V37', STONED, 1.1, 0.9) +
      fxGlyph('M9 24V14H31V24Z', CREAM, 2, 0) +
      l('M20 14V24', 2, WOOD) +
      r(12.5, 17, 4.5, 4.5, '#17110c', 1) +
      fxGlyph('M4 16L20 2L36 16L31 18L20 9L9 18Z', RUST, 1.6, 0.8) +
      sh.stroke('M10 13L20 4.6L30 13', RUSTD, 1, 0.7) +
      r(23, 28, 7, 9, '#17110c', 1) +
      sh.glint(28, 33, 0.8, MUSTL, 0.9),
    2.5,
  ),
);

// ---------------------------------------------------------------------------------------------

export const PROPS: Record<string, Art> = {
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
  wheel,
  slab,
  comet,
  bomb,
  stone,
  shell,
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
  ...CASTLE_ART,
};
