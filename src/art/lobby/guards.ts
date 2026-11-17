/**
 * A royal guard of King Fridolin: a friendly mountain dog in a shiny steel helmet with a red plume
 * and the King's red-and-gold tabard with the cheese emblem, holding a long fondue fork like a
 * halberd. Standing, facing the player; the pivot is at the feet.
 */
import { INK, RED, REDL, MUST, MUSTL, GOLD, IRON, IRONL, WHITE, l, art, litRect } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxCirc, fxEll } from '../props/kit';

const FUR = '#b0652e';
const FURD = '#7d4220';
const MUZZLE = '#f6efe2';
const STEEL = '#c9d0d6';
const STEELL = '#eef2f5';
const BOOT = '#5a3a22';
const MAIL = '#8d949b';

export const knight: Art = (() => {
  const TABARD = 'M46 112Q75 104 104 112L110 206Q75 216 40 206Z';
  const BODY = 'M40 114Q75 98 110 114L116 200Q75 210 34 200Z';
  const HEAD = 'M42 74Q42 44 75 44Q108 44 108 74Q108 98 75 102Q42 98 42 74Z';
  const EAR_L = 'M46 62Q30 64 30 86Q32 102 44 100Q50 84 52 70Z';
  const EAR_R = 'M104 62Q120 64 120 86Q118 102 106 100Q100 84 98 70Z';
  const HELMET = 'M38 58Q38 22 75 20Q112 22 112 58Z';
  const BRIM = 'M28 60Q75 48 122 60Q124 68 116 68Q75 58 34 68Q26 68 28 60Z';
  const PLUME = 'M74 22Q66 4 80 0Q100 -2 104 14Q94 8 88 12Q98 18 92 26Q86 16 80 20Z';
  const CHEESE = 'M62 150L90 140V166L62 172Z';
  return art(150, 260, 75, 260,
    // The fondue fork, held upright on the left of the picture, with a little red pennant.
    l('M24 252V30', 7, INK) + sh.stroke('M24 252V30', '#9a6a3c', 4) + sh.stroke('M23 250V32', '#bb8c56', 1.5, 0.8) +
    l('M16 34V4M32 34V4M16 34H32', 4.5, INK) + sh.stroke('M16 32V5M32 32V5', IRONL, 2) +
    sh.lit('M24 40L46 46L24 54Z', RED, { outline: 2.5, shadow: 1.5, light: 1, lightColor: REDL }) +
    // Legs and boots.
    litRect(50, 200, 20, 44, MAIL, 4, { outline: 3.5 }) + litRect(80, 200, 20, 44, MAIL, 4, { outline: 3.5 }) +
    sh.lit(fxEll(58, 248, 18, 10), BOOT, { outline: 3.5, shadow: 2, light: 1 }) +
    sh.lit(fxEll(92, 248, 18, 10), BOOT, { outline: 3.5, shadow: 2, light: 1 }) +
    // Chain mail body and arms.
    sh.lit(BODY, MAIL, { outline: 4, shadow: 6, light: 2 }) +
    sh.within(BODY, sh.stroke('M30 130H120M30 146H120M30 162H120M30 178H120M30 194H120', IRON, 1.4, 0.6)) +
    sh.litTube('M42 120Q30 150 28 168', 16, MAIL) +
    sh.litTube('M108 120Q122 150 118 182', 16, MAIL) +
    // The King's tabard: red with gold trim and a yellow cheese emblem.
    sh.lit(TABARD, RED, { outline: 4, shadow: 8, light: 3, lightColor: REDL }) +
    sh.within(TABARD, sh.stroke(TABARD, MUST, 9)) +
    sh.stroke('M75 112V206', sh.tone(RED, -0.25), 2, 0.6) +
    sh.lit(CHEESE, MUSTL, { outline: 3, shadow: 2, light: 1, shadowColor: MUST }) +
    sh.lit('M62 150L90 140L98 146L70 156Z', '#f8e08c', { outline: 2.5, shadow: 0, light: 0 }) +
    sh.paint(fxEll(72, 160, 3, 2.4), GOLD) + sh.paint(fxEll(83, 156, 2.4, 2), GOLD) + sh.paint(fxEll(78, 166, 2, 1.6), GOLD) +
    litRect(38, 182, 74, 10, '#6a4222', 3, { outline: 3 }) + litRect(68, 180, 14, 14, GOLD, 2, { outline: 2.5, lightColor: MUSTL }) +
    // Paws: one round the fork, one at the side.
    sh.lit(fxCirc(26, 170, 10), FUR, { outline: 3.5, shadow: 2, light: 1 }) + sh.stroke('M20 168h12M20 173h12', FURD, 1.6, 0.8) +
    sh.lit(fxCirc(118, 186, 10), FUR, { outline: 3.5, shadow: 2, light: 1 }) +
    // Head: floppy ears, white muzzle, a big black nose and a smile.
    sh.lit(EAR_L, FURD, { outline: 3.5, shadow: 3, light: 1 }) + sh.lit(EAR_R, FURD, { outline: 3.5, shadow: 3, light: 1 }) +
    sh.lit(HEAD, FUR, { outline: 4, shadow: 6, light: 2.5 }) +
    sh.lit('M75 58Q66 70 58 80Q56 98 75 100Q94 98 92 80Q84 70 75 58Z', MUZZLE, { outline: 0, shadow: 3, light: 0, shadowColor: '#ddd4c2' }) +
    `<path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    sh.lit(fxEll(75, 82, 9, 6.5), INK, { outline: 2, shadow: 0, light: 0 }) + sh.glint(72, 80, 1.6) +
    l('M75 88V92M64 92Q75 100 86 92', 3, INK) + sh.lit('M71 95Q75 102 79 95Z', '#e8806e', { outline: 2, shadow: 0, light: 0 }) +
    sh.lit(fxCirc(60, 72, 5.5), INK, { outline: 0, shadow: 0, light: 0 }) + sh.glint(58.5, 70.5, 1.6) +
    sh.lit(fxCirc(90, 72, 5.5), INK, { outline: 0, shadow: 0, light: 0 }) + sh.glint(88.5, 70.5, 1.6) +
    sh.stroke('M52 64q7 -5 14 -1M84 63q7 -4 14 1', FURD, 2.5) +
    sh.paint(fxEll(52, 86, 6, 3.5), '#e8907a', 0.6) + sh.paint(fxEll(98, 86, 6, 3.5), '#e8907a', 0.6) +
    // Shiny steel helmet with a red plume.
    sh.lit(PLUME, RED, { outline: 3, shadow: 3, light: 1.5, lightColor: REDL }) +
    sh.lit(HELMET, STEEL, { outline: 4, shadow: 6, light: 2.5, lightColor: STEELL }) +
    sh.stroke('M75 22V56', IRONL, 3, 0.8) +
    sh.stroke('M50 46Q52 32 64 26', WHITE, 3.5, 0.9) +
    sh.lit(BRIM, STEEL, { outline: 3.5, shadow: 2, light: 1, lightColor: STEELL }) +
    sh.lit(fxCirc(75, 52, 5), MUST, { outline: 2.5, shadow: 1.5, light: 1, lightColor: MUSTL }),
  );
})();
