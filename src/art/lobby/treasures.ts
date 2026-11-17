/**
 * Loose things that fill the hall as the castle grows: straw and hay in the early tiers, barrels,
 * gold and a chest full of cheese later on, a rune stone for the runic fortress, pennants,
 * a golden candle stand and a tall banner for the citadel.
 */
import { INK, RED, REDL, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, GOLD, GOLDD, GLOW, WHITE, l, art, centred, litRect, rivets, tubeFast, litBall } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxEll, fxRect, fxTwinkle } from '../props/kit';

const STRAW = '#e3c26a';
const STRAWD = '#b8913e';
const STRAWL = '#f4dd94';
const BLUE = '#24407a';
const BLUEL = '#3a5c9c';

/** Short straw strands scattered over a box. */
function strands(x0: number, y0: number, x1: number, y1: number, n: number, seed: number, col: string, o = 0.9): string {
  const R = sh.rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = sh.r1(x0 + R() * (x1 - x0));
    const y = sh.r1(y0 + R() * (y1 - y0));
    const a = (R() - 0.5) * 1.6;
    const len = 8 + R() * 10;
    d += `M${x} ${y}l${sh.r1(Math.cos(a) * len)} ${sh.r1(Math.sin(a) * len)}`;
  }
  return sh.stroke(d, col, 1.6, o);
}

export const straw: Art = (() => {
  const PILE = 'M8 54Q20 30 60 28Q90 14 130 24Q176 20 200 38Q216 46 212 54Z';
  return centred(220, 60,
    sh.lit(PILE, STRAW, { outline: 3, shadow: 4, light: 2, lightColor: STRAWL }) +
    sh.within(PILE, strands(10, 18, 210, 56, 46, 3, STRAWD) + strands(10, 18, 210, 50, 30, 7, STRAWL)) +
    // A few loose strands lying beside the pile.
    sh.stroke('M4 56l14 -4M200 56l16 -3M100 58l12 -2', STRAWD, 1.8),
  );
})();

export const hayBale: Art = (() => {
  const FRONT = 'M8 34H96V84H8Z';
  const SIDE = 'M96 34L122 20V70L96 84Z';
  const TOP = 'M8 34L34 20H122L96 34Z';
  return centred(130, 90,
    sh.lit(SIDE, STRAWD, { outline: 3.5, shadow: 2, light: 0 }) +
    sh.lit(TOP, STRAWL, { outline: 3.5, shadow: 2, light: 0 }) +
    sh.lit(FRONT, STRAW, { outline: 3.5, shadow: 4, light: 2, lightColor: STRAWL }) +
    sh.within(FRONT, strands(8, 34, 96, 84, 34, 11, STRAWD)) + sh.within(TOP, strands(10, 20, 120, 34, 16, 12, STRAWD, 0.6)) +
    sh.within(SIDE, strands(96, 20, 122, 84, 10, 13, '#9c7a32', 0.7)) +
    // Twine.
    sh.stroke('M34 34V84M70 34V84M34 34L60 20M70 34L96 20', '#8a4a2a', 3) +
    sh.stroke('M8 82l-4 4M96 84l4 4', STRAWD, 1.8),
  );
})();

export const barrel: Art = (() => {
  const BODY = 'M16 18Q6 60 16 108Q45 116 74 108Q84 60 74 18Q45 10 16 18Z';
  return centred(90, 120,
    sh.lit(BODY, WOOD, { outline: 4, shadow: 7, light: 3, lightColor: WOODL }) +
    sh.within(BODY, sh.stroke('M30 12Q24 60 30 116M45 10V118M60 12Q66 60 60 116', WOODD, 2, 0.7)) +
    sh.stroke('M10 34Q45 42 80 34M8 92Q45 100 82 92', IRON, 6) + sh.stroke('M10 32Q45 40 80 32', IRONL, 1.5, 0.8) +
    rivets([[24, 37], [66, 37], [24, 96], [66, 96]], 1.6, IRONL) +
    sh.lit(fxEll(45, 18, 29, 8), WOODL, { outline: 3.5, shadow: 2, light: 1 }) +
    sh.stroke('M30 14Q45 22 60 14M24 20H66', WOODD, 1.5, 0.7) +
    litBall(58, 18, 3, IRON, 2),
  );
})();

/** A heap of coins: a gold mound covered with coin faces. */
function heap(cx: number, yb: number, w: number, h: number, seed: number, n: number): string {
  const MOUND = `M${cx - w} ${yb}Q${cx - w * 0.7} ${yb - h} ${cx} ${yb - h}Q${cx + w * 0.7} ${yb - h} ${cx + w} ${yb}Z`;
  const R = sh.rng(seed);
  let faces = '';
  for (let i = 0; i < n; i++) {
    const fx = (R() - 0.5) * 1.7 * w;
    const top = yb - h * (1 - (fx / w) ** 2) * 0.95;
    const fy = sh.r1(top + R() * (yb - top - 4) + 3);
    faces += sh.lit(fxEll(sh.r1(cx + fx), fy, 8, 3.4), MUSTL, { outline: 1.8, shadow: 1.2, light: 0, shadowColor: GOLD });
  }
  return sh.lit(MOUND, MUST, { outline: 3.5, shadow: 6, light: 2.5, lightColor: MUSTL }) + sh.within(MOUND, faces);
}

export const goldPile: Art = centred(160, 90,
  heap(80, 84, 66, 56, 5, 22) +
  // Coins standing and lying around the heap.
  sh.lit('M104 36a8 11 0 1 0 0.1 0Z', MUSTL, { outline: 2.5, shadow: 2, light: 1, shadowColor: GOLD }) + sh.stroke('M104 40v14', GOLD, 1.5) +
  sh.lit(fxEll(14, 84, 9, 3.6), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }) +
  sh.lit(fxEll(148, 84, 9, 3.6), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }) +
  fxTwinkle(60, 40, 7, WHITE, 0.95) + fxTwinkle(118, 62, 5, WHITE, 0.9),
);

/** A cheese wheel seen slightly from above, lying flat. */
const wheel = (x: number, y: number, rx: number) =>
  sh.lit(`M${x - rx} ${y}V${y + rx * 0.4}A${rx} ${rx * 0.36} 0 0 0 ${x + rx} ${y + rx * 0.4}V${y}Z`, MUST, { outline: 3, shadow: 2, light: 0 }) +
  sh.lit(fxEll(x, y, rx, rx * 0.36), MUSTL, { outline: 3, shadow: 1.5, light: 0, shadowColor: MUST }) +
  sh.paint(fxEll(x - rx * 0.3, y, 2.6, 1.4), GOLD) + sh.paint(fxEll(x + rx * 0.35, y + 1, 2, 1.1), GOLD);

export const cheeseChest: Art = (() => {
  const LID = 'M30 62L42 14Q100 2 158 14L170 62Z';
  return centred(200, 150,
    // The open lid behind.
    sh.lit(LID, WOOD, { outline: 4, shadow: 5, light: 2, lightColor: WOODL }) +
    sh.lit('M44 56L52 22Q100 12 148 22L156 56Z', '#5e3a20', { outline: 3, shadow: 3, light: 0 }) +
    sh.stroke('M60 14L54 62M140 14L146 62', IRON, 6) +
    // Treasure heaped above the rim.
    heap(100, 76, 76, 26, 9, 12) +
    wheel(70, 52, 22) + wheel(124, 46, 24) + wheel(98, 34, 20) +
    sh.lit('M144 60l22 -10l6 12l-22 8z', MUSTL, { outline: 2.5, shadow: 1, light: 0.6 }) +
    // The chest box.
    litRect(24, 70, 152, 72, WOOD, 6, { outline: 4, lightColor: WOODL }) +
    sh.stroke('M24 94H176M24 118H176', WOODD, 2, 0.7) +
    litRect(20, 66, 160, 12, WOODD, 4, { outline: 3.5 }) +
    litRect(48, 66, 12, 76, IRON, 2, { outline: 3, lightColor: IRONL }) + litRect(140, 66, 12, 76, IRON, 2, { outline: 3, lightColor: IRONL }) +
    rivets([[54, 84], [54, 104], [54, 124], [146, 84], [146, 104], [146, 124]], 1.8, IRONL) +
    litRect(88, 80, 24, 28, GOLD, 4, { outline: 3, lightColor: MUSTL }) + sh.paint('M98 90a2 2 0 1 0 4 0a2 2 0 1 0 -4 0ZM99 92h2v8h-2Z', INK) +
    // A few coins spilled in front.
    sh.lit(fxEll(14, 140, 8, 3.2), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }) +
    sh.lit(fxEll(186, 142, 8, 3.2), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }) +
    fxTwinkle(110, 30, 6, WHITE, 0.95) + fxTwinkle(46, 58, 5, WHITE, 0.9),
  );
})();

export const runeStone: Art = (() => {
  const STONE_D = 'M18 146Q8 80 22 36Q34 6 56 8Q84 12 88 50Q96 100 84 146Z';
  const RUNES = 'M40 40V64M40 46l10 -6M40 54l10 6M62 34l-8 14l8 14M60 80V108M52 88l16 12M68 88l-16 12M34 92l6 -12l6 12M34 120h22M45 112v16M66 122l6 -8l6 8';
  return centred(100, 150,
    sh.lit(fxEll(52, 146, 44, 5), '#3a4145', { outline: 0, shadow: 0, light: 0 }) +
    sh.lit(STONE_D, '#5c6569', { outline: 4, shadow: 8, light: 3 }) +
    sh.within(STONE_D, sh.stroke('M20 70Q40 76 56 70M60 132q14 -6 26 0', '#454d52', 2, 0.8) + sh.paint('M60 20q10 10 4 24q10 -6 12 6', '#4f7a5a', 0.5)) +
    // The glow: a wide faint stroke under the sharp rune lines (no blur filter).
    sh.stroke(RUNES, GLOW, 8, 0.25) + sh.stroke(RUNES, GLOW, 3) +
    fxTwinkle(24, 30, 4, GLOW, 0.9) + fxTwinkle(84, 70, 3.5, GLOW, 0.8),
  );
})();

export const pennants: Art = (() => {
  // The string sags in a shallow quadratic curve from (0, 6) to (400, 6).
  const at = (t: number): [number, number] => {
    const x = 400 * t;
    const y = 6 + 2 * (1 - t) * t * 44;
    return [sh.r1(x), sh.r1(y)];
  };
  let flags = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.18) / n;
    const t1 = (i + 0.82) / n;
    const [ax, ay] = at(t0);
    const [bx, by] = at(t1);
    const tx = sh.r1((ax + bx) / 2);
    const ty = sh.r1((ay + by) / 2 + 26);
    const col = i % 2 === 0 ? RED : MUST;
    flags += sh.lit(`M${ax} ${ay}L${bx} ${by}L${tx} ${ty}Z`, col, { outline: 2.5, shadow: 2, light: 1, lightColor: i % 2 === 0 ? REDL : MUSTL });
  }
  return art(400, 60, 0, 0,
    l('M0 6Q200 50 400 6', 2.5, INK) + flags,
  );
})();

export const candelabra: Art = (() => {
  const flame = (x: number, y: number) =>
    sh.lit(`M${x} ${y - 18}Q${x + 6} ${y - 8} ${x} ${y - 3}Q${x - 6} ${y - 8} ${x} ${y - 18}Z`, '#f6a43a', { outline: 2.2, shadow: 0, light: 0 }) +
    sh.paint(`M${x} ${y - 12}Q${x + 2.5} ${y - 7} ${x} ${y - 5}Q${x - 2.5} ${y - 7} ${x} ${y - 12}Z`, '#ffe9a0');
  const candle = (x: number, y: number) => litRect(x - 5, y - 22, 10, 22, CREAM, 2, { outline: 2.8 }) + flame(x, y - 22);
  return centred(90, 180,
    // Three feet and the stem.
    tubeFast('M45 160L20 176M45 160L70 176M45 160V174', 6, GOLD, { lightColor: MUSTL }) +
    tubeFast('M45 160V70', 7, GOLD, { lightColor: MUSTL }) +
    litBall(45, 132, 7, GOLD) + litBall(45, 100, 6, GOLD) +
    // Arms.
    tubeFast('M45 76Q18 76 16 56M45 76Q72 76 74 56', 5, GOLD, { lightColor: MUSTL }) +
    sh.lit(fxEll(16, 56, 10, 3.5), GOLD, { outline: 2.5, shadow: 1, light: 0.6, lightColor: MUSTL }) +
    sh.lit(fxEll(74, 56, 10, 3.5), GOLD, { outline: 2.5, shadow: 1, light: 0.6, lightColor: MUSTL }) +
    sh.lit(fxEll(45, 66, 11, 4), GOLD, { outline: 2.5, shadow: 1, light: 0.6, lightColor: MUSTL }) +
    candle(16, 54) + candle(74, 54) + candle(45, 64) +
    sh.stroke('M42 60V48', '#f0e3c0', 1.5, 0.8) + sh.glint(41, 112, 1.5),
  );
})();

export const stainedBanner: Art = (() => {
  const CLOTH = 'M14 18H96V214L55 190L14 214Z';
  const BORDER = 'M22 24H88V200L55 180L22 200Z';
  return centred(110, 230,
    l('M4 14H106', 7, INK) + sh.stroke('M4 14H106', GOLDD, 4) + litBall(5, 14, 5, GOLD) + litBall(105, 14, 5, GOLD) +
    sh.lit(CLOTH, BLUE, { outline: 4, shadow: 8, light: 3, lightColor: BLUEL }) +
    sh.stroke(BORDER, GOLD, 4) +
    sh.within(CLOTH, sh.stroke('M40 18V214M70 18V214', sh.tone(BLUE, -0.25), 3, 0.5)) +
    // The emblem: a golden mountain above a cheese wedge.
    sh.lit('M28 108L48 70L58 84L66 74L84 108Z', GOLD, { outline: 3, shadow: 3, light: 1.5, lightColor: MUSTL }) +
    sh.paint('M44 78L48 70L53 78L49 76Z', WHITE) +
    sh.lit('M34 150L76 128V150Z', MUSTL, { outline: 3, shadow: 1.5, light: 0, shadowColor: MUST }) +
    sh.lit('M34 150H76V164H34Z', MUST, { outline: 3, shadow: 2, light: 0 }) +
    sh.paint(fxEll(50, 156, 3, 2), GOLD) + sh.paint(fxEll(64, 145, 2.5, 1.6), GOLD) +
    sh.paint(fxRect(40, 112, 30, 4, 2), GOLD),
  );
})();

export const TREASURE_ART: Record<string, Art> = {
  straw,
  hayBale,
  barrel,
  goldPile,
  cheeseChest,
  runeStone,
  pennants,
  candelabra,
  stainedBanner,
};
