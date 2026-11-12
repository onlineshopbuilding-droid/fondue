/**
 * King Fridolin the Gooey: a round Swiss king who loves fondue. He walks in front of the keep in the
 * prelude and talks in speech bubbles. Felt puppet style like the rest of the game: chunky round
 * shapes, a thick dark outline, flat fills with one soft shadow and one light edge.
 * Two pictures: mouth closed (`king`) and mouth open (`kingTalk`); the scene swaps them while he talks.
 * He faces right, toward the road, and holds a long fondue fork with a cube of bread on it.
 */
import { INK, RED, REDL, MUST, MUSTL, GOLD, GOLDD, TEAL, WHITE, CREAM, IRON, IRONL, WOODD, WOODL, blob, hl, art } from './draw';
import * as sh from './shade';
import type { Art } from './types';

const W = 124;
const H = 164;
/** Feet line in art pixels; the pivot sits here. */
const FOOT = 160;

const SKIN = '#f2c39d';
const CHEEK = '#e8857a';
const CAPE = '#7d1d27';
const BEARD = '#f7f2e8';
const BREAD = '#e2b36a';

const lit = (d: string, f: string, shadow = 3.5, light = 2) => sh.lit(d, f, { outline: 3.5, shadow, light });
const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;

function body(talking: boolean): string {
  // Cape behind everything, with an ermine hem.
  const cape = lit('M33 64Q14 112 15 150Q60 158 105 150Q106 112 88 64Z', CAPE, 4, 1.5);
  const hem = blob(`<rect x="15" y="140" width="90" height="13" rx="6"/>`, WHITE, 3) +
    [24, 38, 52, 66, 80, 94].map((x) => `<path d="M${x} 143v6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`).join('');
  // Two stubby boots.
  const boots = lit(ell(47, FOOT - 6, 12, 7), WOODD, 2.5, 1.2) + lit(ell(75, FOOT - 6, 12, 7), WOODD, 2.5, 1.2);
  // The round belly in red, with the white cross of the valley flag on it.
  const belly = lit(ell(61, 106, 40, 38), RED, 6, 2.6);
  const cross = blob(`<rect x="55" y="88" width="13" height="34" rx="2"/><rect x="44" y="98.5" width="35" height="13" rx="2"/>`, WHITE, 2.6);
  const belt = hl('M24 124Q61 136 98 124', GOLDD, 3.2, 0.9);
  // Left arm resting on the belly, right arm up with the fork.
  const armBack = sh.litTube('M32 82Q22 100 36 114', 11, REDL, { outline: 3.2 });
  const handBack = lit(ell(38, 115, 7, 6.5), SKIN, 2, 1.2);
  const fork =
    sh.litTube('M103 92L114 24', 3.4, IRONL, { outline: 2.4, shadow: 1, light: 0.6 }) +
    sh.litTube('M101 104L104 88', 6, WOODL, { outline: 2.6 }) +
    hl('M112.5 25L111 12M116.5 26L116 13', IRON, 2.6) +
    `<g transform="rotate(-12 114 13)">${lit('M106 4H122V20H106Z', BREAD, 2.4, 1.4)}</g>` +
    // A drop of melted cheese runs off the bread.
    lit('M108 17Q104 24 107 29Q111 31 112 26Q112 21 112 18Z', MUSTL, 1.6, 1);
  const armFront = sh.litTube('M88 82Q100 92 103 98', 11, REDL, { outline: 3.2 });
  const handFront = lit(ell(103, 99, 7.5, 7), SKIN, 2, 1.2);

  // Head: round face, white side hair, rosy cheeks, a big nose and a very fine beard.
  const hair = blob(`<circle cx="38" cy="50" r="9"/><circle cx="84" cy="50" r="9"/>`, BEARD, 3);
  const face = lit(ell(61, 52, 24, 23), SKIN, 3.5, 2);
  const cheeks = `<ellipse cx="46" cy="60" rx="6" ry="4" fill="${CHEEK}" opacity="0.75"/><ellipse cx="76" cy="60" rx="6" ry="4" fill="${CHEEK}" opacity="0.75"/>`;
  const eyes =
    `<ellipse cx="52" cy="47" rx="2.8" ry="3.4" fill="${INK}"/><ellipse cx="70" cy="47" rx="2.8" ry="3.4" fill="${INK}"/>` +
    sh.glint(51.2, 45.8, 1, WHITE) + sh.glint(69.2, 45.8, 1, WHITE);
  const brows = hl('M46 40Q52 36 57 40M65 40Q70 36 76 40', BEARD, 4) + hl('M46 40Q52 36 57 40M65 40Q70 36 76 40', INK, 1.2, 0.6);
  const mouth = talking
    ? `<ellipse cx="61" cy="70" rx="6" ry="5" fill="#5a2420" stroke="${INK}" stroke-width="2"/><ellipse cx="61" cy="72.5" rx="3.4" ry="1.8" fill="${CHEEK}"/>`
    : hl('M56 69Q61 72 66 69', INK, 2.2);
  const beard = blob(
    `<circle cx="47" cy="80" r="9"/><circle cx="61" cy="84" r="11"/><circle cx="75" cy="80" r="9"/>` +
      `<circle cx="52" cy="${talking ? 78 : 75}" r="7"/><circle cx="70" cy="${talking ? 78 : 75}" r="7"/>`,
    BEARD, 3,
  ) + hl('M52 86Q56 90 60 88M64 89Q68 91 71 86', CREAM, 2, 0.9);
  const nose = lit(ell(61, 58, 7, 6), '#eba78a', 2, 1.4);
  const moustache = blob(
    `<path d="M61 62Q52 58 43 63Q37 67 41 71Q45 66 52 67Q57 67 61 65Z"/><path d="M61 62Q70 58 79 63Q85 67 81 71Q77 66 70 67Q65 67 61 65Z"/>`,
    BEARD, 2.8,
  );
  // A gold crown with three points and three gems.
  const crown =
    lit('M40 33L37 14L48 24L61 8L74 24L85 14L82 33Z', MUST, 3, 1.8) +
    lit('M39 28H83V36H39Z', GOLD, 2, 1.2) +
    `<circle cx="61" cy="32" r="3.2" fill="${RED}" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="49" cy="32" r="2.4" fill="${TEAL}" stroke="${INK}" stroke-width="1.6"/><circle cx="73" cy="32" r="2.4" fill="${TEAL}" stroke="${INK}" stroke-width="1.6"/>` +
    blob(`<circle cx="37" cy="13" r="3"/><circle cx="61" cy="7" r="3.6"/><circle cx="85" cy="13" r="3"/>`, MUSTL, 2.4);

  return cape + hem + boots + belly + cross + belt + armBack + handBack + fork + armFront + handFront +
    hair + face + cheeks + eyes + brows + mouth + beard + nose + moustache + crown;
}

export const KING_ART: Record<'king' | 'kingTalk', Art> = {
  king: art(W, H, W / 2, FOOT, body(false)),
  kingTalk: art(W, H, W / 2, FOOT, body(true)),
};
