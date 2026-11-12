/**
 * Round badges for the weapon buttons and the menu: one icon per weapon, pause, locked and the castle.
 * Each badge is a coloured disc with a lit glyph.
 */
import { INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, FOREST, PLUM, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL, GLOW, WHITE, GOLD, GOLDD, ink, r, c, l, hl, centred } from '../draw';
import * as sh from '../shade';
import { fxCirc, fxRect, fxAt, fxArc, fxRivet } from './kit';

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

export const iconWheel = (() => {
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

export const iconStomper = badge(
  PLUM,
  fxGlyph(fxRect(19, 13, 26, 21, 3), STONE, 2.4, 1.2) +
    sh.stroke('M25 19H39M25 26H39', STONED, 2.6) +
    sh.stroke('M26 20.4H38M26 27.4H38', STONEL, 0.9, 0.7) +
    fxGlyph('M32 50L24 39H40Z', MUSTL, 1.8, 0.8) +
    l('M15 50H24M40 50H49', 3.5),
);

export const iconComet = badge(
  TEALD,
  fxGlyph('M18 46C14 30 30 28 32 20C36 26 40 18 50 12C48 22 54 24 48 36C46 46 26 58 18 46Z', RUST, 2, 1) +
    fxGlyph('M26 42C24 34 34 32 36 26C40 30 44 26 46 22C46 30 46 40 26 42Z', MUST, 1.4, 0.8) +
    sh.paint('M31 38C30 34 35 31 38 28C38 33 37 37 31 38Z', '#fff4c8', 0.9) +
    sh.lit(fxCirc(26, 42, 10), PLUM, { outline: 2.5, shadow: 2.2, light: 1.4, lightColor: '#b67aa6' }) +
    sh.crescent(fxCirc(26, 42, 10), -2, 2, '#ff8a3a', 0.75) +
    sh.stroke('M21 47L25 42L23 37M25 42L31 40', MUSTL, 1.8) +
    `<circle cx="26" cy="42" r="10" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
);

export const iconMortar = badge(
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

export const iconFrost = badge(
  '#3f7fa6',
  fxGlyph('M14 46C28 46 38 40 44 24L51 28C47 46 32 54 16 54Z', CREAM, 2.4, 0) +
    l('M38 40L43 45M31 44L35 50', 2) +
    sh.stroke('M44 24L51 28', '#9ab7c9', 2.4) +
    hl('M24 13V33M15 18L33 28M33 18L15 28', INK, 5.5) +
    hl('M24 13V33M15 18L33 28M33 18L15 28', GLOW, 3) +
    `<circle cx="24" cy="23" r="1.6" fill="${WHITE}" stroke="none"/>`,
);

export const iconBellows = badge(
  RUST,
  fxGlyph('M52 18C52 14 48 12 44 14L22 28V36L44 50C48 52 52 50 52 46Z', WOOD, 2.4, 1.2) +
    sh.stroke('M48 18V46M40 24.5L28 31', WOODD, 1, 0.55) +
    l('M36 24V40M44 20V44', 2.5) +
    sh.lit(fxRect(16, 29, 8, 6, 1), IRON, { outline: 2, shadow: 1.2, light: 0.6 }) +
    fxGlyph('M15 32C10 28 10 22 12 18C8 22 4 26 6 34C8 40 12 42 14 40Z', MUSTL, 1.6, 0) +
    sh.paint('M12 34C9.6 31 9.6 28 10.4 26C8.6 29 8.6 33 10 35.6Z', '#fff4c8', 0.9),
);

export const iconBolter = badge(
  '#a97a1f',
  l('M16 16C30 22 42 34 48 48', 5, WOODD) +
    hl('M16 16C30 22 42 34 48 48', WOODL, 2) +
    l('M16 16L24 44L48 48', 1.5, CREAM) +
    l('M12 52L42 22', 4, IRON) +
    sh.stroke('M13 50.4L41 22.4', IRONL, 1.2, 0.8) +
    fxGlyph('M49 15L37 21L43 27Z', IRONL, 1.2, 0.6) +
    fxGlyph('M9 55L8 46L14 50Z', RUST, 1, 0),
);

export const iconPause = badge(IRON, fxGlyph(fxRect(20, 17, 9, 30, 3), CREAM, 2, 0) + fxGlyph(fxRect(35, 17, 9, 30, 3), CREAM, 2, 0));

export const iconLocked = badge(
  STONED,
  l('M23 31V23C23 12 41 12 41 23V31', 5, INK) +
    hl('M23 31V23C23 12 41 12 41 23V31', IRONL, 2) +
    fxGlyph(fxRect(17, 30, 30, 21, 4), MUST, 2.4, 1.2) +
    fxRivet(21.5, 34.5, 1.2) + fxRivet(42.5, 34.5, 1.2) +
    c(32, 38, 3.5, INK) +
    l('M32 40V45', 3),
);

/** Small keep for the health bar: stone base, plastered upper floor, tiled roof, door with a ring. */
export const iconCastle = centred(
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
