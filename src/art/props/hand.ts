/**
 * The player's hand, open and closed.
 * It is the cursor of the game and is drawn in world coordinates.
 */
import { INK, WHITE, hl, blob, art } from '../draw';
import * as sh from '../shade';
import { fxRect, fxRot } from './kit';

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
export const handOpen = (() => {
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
export const handClosed = (() => {
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
