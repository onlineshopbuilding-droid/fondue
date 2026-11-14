/**
 * The keep's west wing: everything left of the keep, which only the market shows when the camera
 * pulls back (world x -400 to 0; the fight never looks there). One picture per build stage, in that
 * stage's materials: a corner tower where it meets the keep, a back wall with the yard in front of it
 * (the dairy and its cheese wheels), a low front wall and an end tower. Plus night glow, snow and the
 * landscape's ground along the wall foot.
 *
 * West art coordinates: x = world + 400, y = world + 20 (the same y as the keep's art).
 */
import type { Art } from '../types';
import { INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, STONED, IRON, IRONL, GOLD, GOLDD, ink, p, n, hl, art, litRect, litPath, litBall, rivets, grain } from '../draw';
import { tone } from '../shade';
import { rect, clip, SHADE_DEFS, form, shade, type Stonework, masonry, logs, shingles, spire, flag, emblem, banner, merlons, type Win, windowsBody, windowsGlow, vine, moss, spireD } from './kit';
import { ROUGH, ASHLAR, SLATE, MARBLE } from './keepStages';
import { drift, icicles, snowCap, snowMerlons } from './weather';

/** Size of the west pictures and where their left edge stands in the world. */
export const WEST_W = 400;
export const WEST_X = -400;
const FOOT = 652;

type Stone = Omit<Stonework, 'seed'>;

interface Stage {
  /** Wall stone; null for the timber palisade of stage 0. */
  stone: Stone | null;
  /** Stage 1: timber standing on a stone footing this high. */
  footing: number;
  cap: string;
  roof: string;
  roofLine: string;
  band: 'none' | 'iron' | 'gold';
  frame: string;
  flags: [string, string];
  wallTop: number;
  endTop: number;
  jointTop: number;
  /** The corner tower ends in battlements instead of a roof. */
  crown: boolean;
}

const THATCH = '#b7924e';
const THATCHD = '#7f6230';

const STAGES: Stage[] = [
  { stone: null, footing: 0, cap: WOODD, roof: THATCH, roofLine: THATCHD, band: 'none', frame: WOODL, flags: [RUST, MUSTL], wallTop: 410, endTop: 330, jointTop: 262, crown: false },
  { stone: null, footing: 70, cap: STONED, roof: '#8b5e34', roofLine: WOODD, band: 'iron', frame: WOODL, flags: [RUST, TEAL], wallTop: 398, endTop: 300, jointTop: 236, crown: false },
  { stone: ASHLAR, footing: 0, cap: '#bfb9a6', roof: RUST, roofLine: RUSTD, band: 'none', frame: '#bfb9a6', flags: [TEAL, RUST], wallTop: 386, endTop: 268, jointTop: 184, crown: false },
  { stone: SLATE, footing: 0, cap: '#9aa2af', roof: TEALD, roofLine: '#163f42', band: 'none', frame: '#bcc3cd', flags: [RUST, TEAL], wallTop: 374, endTop: 238, jointTop: 128, crown: true },
  { stone: MARBLE, footing: 0, cap: '#f6f1e6', roof: TEAL, roofLine: TEALD, band: 'gold', frame: MUST, flags: [RUST, TEAL], wallTop: 368, endTop: 222, jointTop: 124, crown: true },
  // Tiers 6 and 7: the same marble, with gilded roofs like the keep's.
  { stone: MARBLE, footing: 0, cap: '#f6f1e6', roof: MUST, roofLine: GOLDD, band: 'gold', frame: MUST, flags: [TEAL, RUST], wallTop: 362, endTop: 214, jointTop: 118, crown: true },
  { stone: MARBLE, footing: 0, cap: '#f6f1e6', roof: MUST, roofLine: GOLDD, band: 'gold', frame: MUST, flags: [TEAL, RUST], wallTop: 356, endTop: 206, jointTop: 112, crown: true },
];

/** Where the parts stand (west art x). */
const END = { x: 36, w: 72 };
const JOINT = { x: 302, w: 76 };
const WALL = { x0: 100, x1: 306 };
const FRONT = { x0: 14, x1: 306, top: 588 };
const DAIRY = { x0: 148, x1: 256, wallTop: 506 };

const windowsOf = (t: number): Win[] => {
  const s = STAGES[t];
  const arch = t >= 2;
  return [
    { x: END.x + 25, y: s.endTop + 40, w: 22, h: 32, arch },
    { x: JOINT.x + 27, y: s.jointTop + 56, w: 22, h: t >= 3 ? 44 : 34, arch },
    ...(t >= 3 ? [{ x: JOINT.x + 29, y: s.jointTop + 150, w: 18, h: 30, arch }] : []),
    { x: 190, y: 524, w: 24, h: 26, arch: false },
  ];
};

const GILT = '#e9b44c';
function band(kind: Stage['band'], x0: number, x1: number, y: number): string {
  if (kind === 'none') return '';
  const studs: [number, number][] = [];
  for (let x = x0 + 9; x < x1 - 4; x += 18) studs.push([x, y + 4.5]);
  if (kind === 'iron') return litRect(x0, y, x1 - x0, 9, IRON, 2, { shadow: 3, light: 1, lightColor: IRONL }) + rivets(studs, 2, '#5a5f66', '#1d2024');
  return litRect(x0, y, x1 - x0, 8, GILT, 2, { shadow: 2.5, light: 1.2, lightColor: '#ffe39a', shadowColor: GOLDD }) + rivets(studs, 1.6, GOLD, GOLDD);
}

/** A wall or tower face in the stage's material, clipped to a rectangle. */
function face(s: Stage, x: number, y0: number, w: number, y1: number, seed: number, round: boolean, point = false): string {
  const d = rect(x, y0, w, y1 - y0);
  let fill: string;
  if (s.stone) {
    fill = masonry(x - 2, y0, x + w + 2, y1, { ...s.stone, seed });
  } else {
    const split = s.footing > 0 ? y1 - s.footing : y1;
    fill =
      logs(x - 2, x + w + 2, () => (point ? y0 - 14 : y0), split, seed, { w: 18, point }) +
      (s.footing > 0 ? masonry(x - 2, split, x + w + 2, y1, { ...ROUGH, seed: seed + 1 }) + shade('sD', x, split - 16, w, 16, 0.5) : '');
  }
  const out = point ? `M${x} ${y1}V${y0}H${x + w}V${y1}Z` : d;
  return (
    clip(point ? rect(x - 2, y0 - 16, w + 4, y1 - y0 + 16) : d, fill + form(x, y0 - 16, w, y1 - y0 + 16, round ? 1.1 : 0.9, round) + shade('sU', x, y0, w, 18, point ? 0.3 : 0.55)) +
    (point ? '' : `<path d="${out}" fill="none"/>`)
  );
}

/** A tower: body, a ledge, then a roof or battlements, windows and a flag. */
function tower(s: Stage, t: number, x: number, w: number, top: number, seed: number, crown: boolean, flagCol: string, roofH: number): string {
  const cx = x + w / 2;
  let roof: string;
  if (crown) {
    roof =
      litRect(x - 6, top - 6, w + 12, 12, s.cap, 3, { shadow: 3, light: 1.4 }) +
      merlons(x - 6, x + w + 6, top - 24, 18, 13, 7, s.cap) +
      band(s.band, x - 6, x + w + 6, top + 6) +
      flag(cx, top - 24, top - 52, 28, flagCol, MUSTL);
  } else {
    const tip = top - roofH;
    roof =
      spire(cx, top + 2, w / 2 + 10, tip, s.roof, s.roofLine, t >= 4 ? MUSTL : t >= 2 ? MUSTL : WOODL, t === 0 ? 9 : 11) +
      litRect(x - 6, top - 2, w + 12, 9, s.stone ? s.cap : WOODD, 3, { shadow: 2.5, light: 1.2 }) +
      (t >= 1 ? flag(cx, tip - 12, tip - 44, 28, flagCol, MUSTL) : '');
  }
  return face(s, x, top, w, FOOT, seed, true) + band(s.band, x, x + w, top + 30) + roof;
}

/** The yard's dairy: a cream half-timbered house where the cheese is kept, roofed in the stage's roof. */
function dairy(s: Stage, t: number): string {
  const { x0, x1, wallTop } = DAIRY;
  const mid = (x0 + x1) / 2;
  const gable = `M${x0 - 14} ${wallTop + 2}L${mid} ${wallTop - 62}L${x1 + 14} ${wallTop + 2}Z`;
  const walls = rect(x0, wallTop, x1 - x0, 104);
  const plaster = t === 0 ? WOOD : CREAM;
  const beams =
    t === 0
      ? grain(x0 + 3, wallTop + 3, x1 - 3, wallTop + 100, WOODD, 71, 6)
      : hl(`M${x0 + 4} ${wallTop + 4}V${wallTop + 100}M${x1 - 4} ${wallTop + 4}V${wallTop + 100}M${x0} ${wallTop + 8}H${x1}M${x0 + 4} ${wallTop + 58}L${mid - 24} ${wallTop + 12}M${x1 - 4} ${wallTop + 58}L${mid + 24} ${wallTop + 12}`, WOODD, 5);
  return (
    p(walls, plaster) +
    clip(walls, beams + form(x0, wallTop, x1 - x0, 104, 0.9) + shade('sU', x0, wallTop, x1 - x0, 20, 0.6)) +
    `<path d="${walls}" fill="none"/>` +
    // Big double door the carts back up to; its lower half hides behind the front wall.
    litRect(mid - 18, wallTop + 52, 36, 54, WOODD, 3, { shadow: 3, light: 1.2 }) +
    hl(`M${mid} ${wallTop + 54}V${wallTop + 104}`, INK, 2) +
    shingles(gable, x0 - 14, wallTop - 62, x1 + 14, wallTop + 6, s.roof, s.roofLine, t === 0 ? 9 : 11, 13) +
    // A cheese wedge sign under the gable: what this house is for.
    litBall(mid, wallTop - 20, 12, t >= 4 ? MUSTL : CREAM, 2.5) +
    emblem(mid, wallTop - 20, 0.5) +
    litBall(mid, wallTop - 68, 4.5, MUSTL)
  );
}

/** Wheels of cheese stacked against the dairy, ready for the fondue, with a cut wedge on top. */
function cheeseStack(t: number): string {
  // A wheel seen from the side: a fat drum with bulging sides, a lighter top rim and the rind's band.
  const wheel = (x: number, bottom: number, w: number, h: number) =>
    litPath(`M${x - w / 2} ${bottom - h * 0.5}Q${x - w / 2} ${bottom - h} ${x - w * 0.3} ${bottom - h}H${x + w * 0.3}Q${x + w / 2} ${bottom - h} ${x + w / 2} ${bottom - h * 0.5}Q${x + w / 2} ${bottom} ${x + w * 0.3} ${bottom}H${x - w * 0.3}Q${x - w / 2} ${bottom} ${x - w / 2} ${bottom - h * 0.5}Z`, MUSTL, { shadow: 3.5, light: 1.6, lightColor: '#fff0b0', shadowColor: GOLD }) +
    hl(`M${x - w * 0.36} ${bottom - h * 0.5}H${x + w * 0.36}`, GOLD, 1.6, 0.7) +
    hl(`M${x - w * 0.28} ${bottom - h + 2.5}H${x + w * 0.2}`, '#fff6d0', 1.4, 0.9);
  const wedge = (x: number, bottom: number) =>
    litPath(`M${x - 14} ${bottom}L${x + 12} ${bottom - 14}L${x + 14} ${bottom}Z`, MUSTL, { shadow: 2.5, light: 1.2, lightColor: '#fff0b0', shadowColor: GOLD }) +
    n(`M${x + 4} ${bottom - 4}a2.6 2.6 0 1 0 .1 0ZM${x - 4} ${bottom - 2.5}a1.8 1.8 0 1 0 .1 0ZM${x + 9} ${bottom - 9}a1.6 1.6 0 1 0 .1 0Z`, GOLD);
  const many = t >= 2;
  return (
    wheel(274, 590, 34, 18) + wheel(306, 590, 30, 16) + wheel(290, 572, 32, 18) + wedge(290, 554) +
    (many ? wheel(124, 590, 32, 17) + wheel(126, 573, 26, 15) : '') +
    (t >= 4 ? wheel(232, 590, 28, 15) : '')
  );
}

/** The low wall in front of the yard. */
function frontWall(s: Stage, t: number): string {
  const { x0, x1, top } = FRONT;
  if (!s.stone && s.footing === 0) {
    return logs(x0, x1, () => top - 6, FOOT, 91, { w: 16, point: true }) + shade('sD', x0, FOOT - 30, x1 - x0, 30, 0.5) + hl(`M${x0} ${top + 22}H${x1}`, WOODD, 5) + hl(`M${x0} ${top + 20}H${x1}`, WOODL, 1.2, 0.7);
  }
  const stone = s.stone ?? ROUGH;
  const d = rect(x0, top, x1 - x0, FOOT - top);
  return (
    clip(d, masonry(x0 - 2, top, x1 + 2, FOOT, { ...stone, seed: 92 + t }) + form(x0, top, x1 - x0, FOOT - top, 0.8) + shade('sD', x0, FOOT - 30, x1 - x0, 30, 0.6)) +
    `<path d="${d}" fill="none"/>` +
    litRect(x0 - 4, top - 8, x1 - x0 + 8, 11, s.cap, 3, { shadow: 3, light: 1.4 }) +
    band(s.band, x0, x1, top + 12) +
    moss(60, FOOT - 6, 20, 6, 93 + t) + moss(230, FOOT - 4, 14, 5, 94 + t)
  );
}

/** The back wall behind the yard, with its walkway, battlements or palisade points. */
function backWall(s: Stage, t: number): string {
  const { x0, x1 } = WALL;
  const top = s.wallTop;
  if (!s.stone) {
    return face(s, x0, top, x1 - x0, FOOT, 81 + t, false, t === 0) + (t === 1 ? band('iron', x0, x1, top + 34) + litRect(x0 - 4, top - 6, x1 - x0 + 8, 10, WOODD, 3) : '');
  }
  return (
    face(s, x0, top, x1 - x0, FOOT, 81 + t, false) +
    litRect(x0 - 4, top - 6, x1 - x0 + 8, 10, s.cap, 3, { shadow: 2.5, light: 1.2 }) +
    merlons(x0 - 2, x1, top - 24, 18, 15, 9, s.cap) +
    band(s.band, x0, x1, top + 12) +
    banner(116, top + 18, 24, 50, s.flags[0], tone(s.flags[0], -0.3), MUSTL, emblem(128, top + 40, 0.5)) +
    (t >= 3 ? banner(268, top + 18, 24, 50, s.flags[1], tone(s.flags[1], -0.3), MUSTL, emblem(280, top + 40, 0.5)) : '')
  );
}

/** The whole west wing of one build stage. */
function wing(t: number): string {
  const s = STAGES[t];
  const wins = windowsOf(t);
  return (
    SHADE_DEFS +
    ink(
      backWall(s, t) +
        dairy(s, t) +
        windowsBody(wins.slice(-1), WOODL) +
        cheeseStack(t) +
        frontWall(s, t) +
        tower(s, t, END.x, END.w, s.endTop, 61 + t, false, s.flags[1], t >= 2 ? 84 : 66) +
        windowsBody([wins[0]], s.frame) +
        vine(END.x + 10, FOOT - 6, 120 + t * 20, 6, 70 + t) +
        tower(s, t, JOINT.x, JOINT.w, s.jointTop, 51 + t, s.crown, s.flags[0], t >= 2 ? 78 : 64) +
        windowsBody(wins.slice(1, -1), s.frame) +
        (t >= 2 ? banner(JOINT.x + 26, s.jointTop + 104, 24, 50, s.flags[1], tone(s.flags[1], -0.3), MUSTL, emblem(JOINT.x + 38, s.jointTop + 126, 0.5)) : '') +
        shade('sD', 0, FOOT - 40, WEST_W, 40, 0.35),
    )
  );
}

/** Snow on every ledge, roof and battlement of one stage. */
function snow(t: number): string {
  const s = STAGES[t];
  const top = s.wallTop;
  const roofCap = (cx: number, base: number, half: number, tip: number, seed: number) => snowCap(spireD(cx, base, half, tip), cx - half - 4, cx + half + 4, tip - 2, tip + (base - tip) * 0.45, seed);
  const endTip = s.endTop - (t >= 2 ? 84 : 66);
  const jointTip = s.jointTop - (t >= 2 ? 78 : 64);
  const dairyGable = `M${DAIRY.x0 - 14} ${DAIRY.wallTop + 2}L${(DAIRY.x0 + DAIRY.x1) / 2} ${DAIRY.wallTop - 62}L${DAIRY.x1 + 14} ${DAIRY.wallTop + 2}Z`;
  return (
    (s.stone ? snowMerlons(WALL.x0 - 2, WALL.x1, top - 24, 15, 9, 900 + t) : drift(WALL.x0, WALL.x1, top - 4, 900 + t)) +
    snowCap(dairyGable, DAIRY.x0 - 16, DAIRY.x1 + 16, DAIRY.wallTop - 64, DAIRY.wallTop - 34, 910 + t) +
    drift(FRONT.x0 - 2, FRONT.x1 + 2, FRONT.top - 8, 920 + t) + icicles(FRONT.x0 + 6, FRONT.x1 - 6, FRONT.top + 3, 925 + t) +
    roofCap(END.x + END.w / 2, s.endTop + 2, END.w / 2 + 10, endTip, 930 + t) +
    (s.crown ? snowMerlons(JOINT.x - 6, JOINT.x + JOINT.w + 6, s.jointTop - 24, 13, 7, 940 + t) : roofCap(JOINT.x + JOINT.w / 2, s.jointTop + 2, JOINT.w / 2 + 10, jointTip, 940 + t))
  );
}

const west = (b: string): Art => art(WEST_W, 660, 0, 660, b);

export const WEST_ART: Record<string, Art> = {};
for (let t = 0; t < STAGES.length; t++) {
  WEST_ART[`keepWest${t}`] = west(wing(t));
  WEST_ART[`keepWestGlow${t}`] = west(windowsGlow(windowsOf(t)));
  WEST_ART[`keepWestSnow_snowpine_${t}`] = west(ink(snow(t)));
}
