/**
 * King Fridolin on his throne: round, red-robed, a snowy beard with a cheese crumb in it, a crown
 * with a cheese-yellow gem and his long fondue fork. Seated, facing the player.
 */
import { INK, RED, REDL, MUST, MUSTL, GOLD, IRONL, WHITE, l, hl, centred } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxCirc, fxEll, fxRect } from '../props/kit';

const SKIN = '#f2c39b';
const CHEEK = '#e8907a';
const BEARD = '#f4f1ea';
const BOOT = '#5a3a22';

export const king: Art = (() => {
  const ROBE = 'M26 206Q18 132 58 112Q90 100 122 112Q162 132 154 206Z';
  const BEARD_D = 'M56 70Q50 104 66 122Q78 136 90 140Q102 136 114 122Q130 104 124 70Q112 92 90 92Q68 92 56 70Z';
  const CROWN = 'M60 40L56 8L72 24L90 2L108 24L124 8L120 40Z';
  const ERMINE = 'M44 120Q90 96 136 120Q140 132 132 138Q90 118 48 138Q40 132 44 120Z';
  const dots = [[64, 122], [82, 114], [100, 114], [118, 122]].map(([x, y]) => `<path d="M${x} ${y - 4}l2 5l-4 0z" fill="${INK}"/>`).join('');
  return centred(180, 220,
    // Boots peeking out under the robe.
    sh.lit(fxEll(66, 208, 18, 9), BOOT, { outline: 3.5, shadow: 2, light: 1 }) +
    sh.lit(fxEll(114, 208, 18, 9), BOOT, { outline: 3.5, shadow: 2, light: 1 }) +
    sh.lit(ROBE, RED, { outline: 4, shadow: 12, light: 4, lightColor: REDL }) +
    sh.stroke('M90 128V204', sh.tone(RED, -0.3), 3, 0.7) +
    sh.lit(fxRect(42, 164, 96, 14, 6), MUST, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
    sh.lit(fxRect(82, 160, 16, 22, 4), GOLD, { outline: 3, shadow: 2, light: 1 }) +
    sh.lit(ERMINE, WHITE, { outline: 3.5, shadow: 4, light: 0, shadowColor: '#d9d3c6' }) + dots +
    // The fork, held upright in the right hand (left of the picture), with a bread cube on top.
    l('M30 162L30 18', 6, INK) + hl('M30 162L30 18', IRONL, 3) +
    l('M24 18V4M36 18V4M24 18H36', 4, INK) +
    sh.lit(fxRect(20, -2 + 4, 20, 16, 3), '#e9c27a', { outline: 3, shadow: 2, light: 1 }) +
    sh.lit(fxCirc(30, 150, 13), SKIN, { outline: 3.5, shadow: 3, light: 1.5 }) +
    sh.lit(fxCirc(150, 154, 13), SKIN, { outline: 3.5, shadow: 3, light: 1.5 }) +
    // Head, beard and crown.
    sh.lit(fxCirc(90, 66, 36), SKIN, { outline: 4, shadow: 6, light: 2.5 }) +
    sh.paint(fxEll(66, 76, 8, 5), CHEEK, 0.7) + sh.paint(fxEll(114, 76, 8, 5), CHEEK, 0.7) +
    sh.lit(BEARD_D, BEARD, { outline: 4, shadow: 6, light: 0, shadowColor: '#d5d0c4' }) +
    sh.stroke('M74 108q8 8 16 0M90 120q8 8 16 0', '#d5d0c4', 2.5) +
    sh.lit('M98 112l9 -2l2 8l-9 2z', MUSTL, { outline: 2.5, shadow: 1.5, light: 0.8 }) +
    sh.lit('M90 84Q76 76 64 86Q72 92 90 88Q108 92 116 86Q104 76 90 84Z', BEARD, { outline: 3, shadow: 2, light: 0, shadowColor: '#d5d0c4' }) +
    sh.lit(fxEll(90, 76, 9, 8), CHEEK, { outline: 3, shadow: 2, light: 1.5 }) +
    l('M72 62q6 -6 12 0M96 62q6 -6 12 0', 3.5, INK) +
    l('M70 52q8 -5 14 -2M96 50q8 -3 14 2', 3, '#b8b2a6') +
    sh.lit(CROWN, MUST, { outline: 3.5, shadow: 4, light: 2, lightColor: MUSTL }) +
    sh.lit(fxCirc(90, 28, 6), MUSTL, { outline: 3, shadow: 1.5, light: 1, shadowColor: GOLD }) +
    sh.lit(fxCirc(70, 32, 4), RED, { outline: 2.5, shadow: 1, light: 0.8 }) +
    sh.lit(fxCirc(110, 32, 4), RED, { outline: 2.5, shadow: 1, light: 0.8 }),
  );
})();
