/**
 * Weapons and projectiles that fly or roll across the field: wheel, slab, comet, bomb, stone, shell and bolts.
 * All are centred on their box, so they can spin around their middle.
 */
import { INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, FOREST, PLUM, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL, WHITE, art, centred, starPoints } from '../draw';
import * as sh from '../shade';
import { fxPad, fxCirc, fxRect, fxAt, fxArc, fxRivet } from './kit';

// ---------------------------------------------------------------------------------------------
// Weapons and projectiles
// ---------------------------------------------------------------------------------------------

/** Stone wheel: twelve rim blocks, a dressed stone disc with a carved cross and an iron hub. */
export const wheel = (() => {
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
export const slab = (() => {
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
export const comet = (() => {
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
export const bomb = (() => {
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
export const stone = centred(
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
export const shell = (() => {
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
export const bolt = fxPad(
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
export const roofBolt = fxPad(
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
