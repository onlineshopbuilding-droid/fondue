/**
 * Debris and effect images: armour bits, coin, crest token, blood splats, dust, sparks, stars, flames, the ice block and the shield bubble.
 * The particle system in src/render/effects.ts throws these around.
 */
import { INK, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, RED, REDL, GLOW, WHITE, GOLD, GOLDD, n, hl, blob, art, centred, starPoints } from '../draw';
import * as sh from '../shade';
import { fxPad, fxCirc, fxEll, fxRect, fxAt, fxArc, fxShade, fxRivet, fxTwinkle } from './kit';

// ---------------------------------------------------------------------------------------------
// Debris, pickups and particles
// ---------------------------------------------------------------------------------------------

/** Knocked-off helmet: dented iron dome with a rust plume and a riveted brim. */
export const gibHelmet = (() => {
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
export const gibPlate = fxPad(
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
export const gibBoot = fxPad(
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
export const gibStick = fxPad(
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
export const coin = (() => {
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

/** Crest token (Raider Crest): a wedge of cheese with holes under a soft teal glow and a "collected" arrow. */
export const crestToken = fxPad(
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

export const splat1 = splat(
  `<ellipse cx="58" cy="18" rx="38" ry="11"/><ellipse cx="34" cy="20" rx="17" ry="7"/><ellipse cx="86" cy="14" rx="15" ry="7"/>` +
    `<ellipse cx="12" cy="24" rx="6" ry="3"/><ellipse cx="106" cy="11.5" rx="7" ry="3.5"/><circle cx="102" cy="25" r="3"/><circle cx="70" cy="8" r="1.9"/>`,
  'M40 15C50 11 66 11 76 13C66 15 50 16 42 18Z',
  [[38, 15.5], [80, 12]],
);
export const splat2 = splat(
  `<ellipse cx="60" cy="17" rx="30" ry="11.5"/><ellipse cx="30" cy="12" rx="18" ry="6"/><ellipse cx="92" cy="21.5" rx="19" ry="6.8"/>` +
    `<ellipse cx="46" cy="25.5" rx="12" ry="3"/><ellipse cx="10.5" cy="17" rx="5" ry="3"/><ellipse cx="109.5" cy="16" rx="4" ry="2.5"/><circle cx="78" cy="8.5" r="2.8"/>`,
  'M46 12C56 8 72 9 80 12C70 14 56 15 48 16Z',
  [[44, 12.5], [96, 19]],
);
export const splat3 = splat(
  `<ellipse cx="44" cy="17" rx="26" ry="10"/><ellipse cx="80" cy="16" rx="24" ry="10.4"/><ellipse cx="60" cy="24.5" rx="14" ry="4"/>` +
    `<ellipse cx="16" cy="10" rx="8" ry="4"/><ellipse cx="105" cy="24" rx="9" ry="4"/><circle cx="24" cy="26" r="2.5"/><circle cx="110" cy="9" r="2.5"/>`,
  'M64 12C74 8 90 9 96 13C86 15 74 15 66 16Z',
  [[62, 13], [36, 14]],
);

/** Flying droplet. */
export const drop1 = (() => {
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
export const dust = centred(
  60,
  60,
  blob(DUST_SHAPES, CREAM, 2.5, '#c9b58c') +
    fxShade(DUST_SHAPES, -3.6, -4, '#dccdb0') +
    fxShade(DUST_SHAPES, 2.2, 2.4, WHITE, 0.8),
);

/** Spark: a hot four-point star with a glow and a white core. */
export const spark = fxPad(
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
export const star = (() => {
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

export const flame1 = flame(
  'M30 3C34 20 46 26 50 44C56 34 54 28 54 26C60 44 56 80 42 87H18C4 80 0 56 10 40C12 46 14 48 18 48C14 32 22 16 30 3Z',
  'M30 32C34 44 44 50 44 66C44 76 38 84 30 84C22 84 15 76 16 64C18 68 20 68 22 68C20 56 26 42 30 32Z',
  'M30 58C33 64 36 68 36 74C36 80 33 83 30 83C27 83 24 80 24 74C24 68 28 64 30 58Z',
  [[14, 22, 1.6], [47, 13, 1.3]],
);
export const flame2 = flame(
  'M38 3C36 16 50 26 52 42C52 48 50 50 48 50C56 56 56 78 42 87H18C6 80 2 62 8 48C12 52 14 52 16 50C12 34 26 24 38 3Z',
  'M36 28C36 42 46 52 44 68C42 78 38 84 30 84C20 84 14 74 18 62C20 64 22 64 24 62C22 50 32 42 36 28Z',
  'M32 56C32 64 38 68 36 76C35 81 33 83 30 83C26 83 23 79 25 72C27 68 30 64 32 56Z',
  [[18, 24, 1.5], [53, 14, 1.3]],
);
export const flame3 = flame(
  'M22 3C28 18 22 26 32 36C36 30 36 24 34 18C46 28 58 50 54 70C52 80 46 86 42 87H18C8 84 2 70 6 54C8 44 16 44 16 34C16 22 20 12 22 3Z',
  'M26 36C30 50 38 50 44 62C46 74 40 84 30 84C20 84 14 76 16 64C18 54 26 50 26 36Z',
  'M30 60C31 66 36 70 36 76C36 81 33 83 30 83C27 83 24 80 24 76C24 70 29 66 30 60Z',
  [[44, 11, 1.6], [8, 30, 1.2]],
);

/** Ice block around a frozen raider: translucent with a frosted top, bevel, streaks, bubbles and cracks. */
export const iceBlock = (() => {
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
export const shieldBubble = (() => {
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
