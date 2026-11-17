/**
 * The three table stations of the lobby, one picture per castle tier (1..7): the campaign map
 * table, the co-op feast table and the round endless table with its hourglass and gold. The
 * material follows the tier: rough trestle wood, iron bands, oak on stone, red cloth, gold trim and
 * parquet, dark stone with glowing runes, white marble and gold. Plus the two broken tables that
 * stand in the hall before co-op or endless is opened. Every picture is centred on its station point.
 */
import { INK, RED, REDL, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, STONE, STONED, STONEL, GOLD, GLOW, WHITE, l, centred, litRect, rivets, tubeFast, litBall } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxCirc, fxEll, fxRect, fxTwinkle } from '../props/kit';

const PARCH = '#efdcae';
const COPPER = '#c0703a';
const COPPERL = '#e49a5e';
const GLASS = '#d8eef2';
const SAND = '#e9c46a';
const DUST = '#d9cfbd';

interface Mat {
  top: string;
  side: string;
  leg: string;
  /** Darker line colour for seams and grain. */
  seam: string;
}

const RUNE_STONE = '#454d52';
const MARBLE = '#efece4';

const MAT: Record<number, Mat> = {
  1: { top: WOODL, side: WOOD, leg: WOODD, seam: WOODD },
  2: { top: WOODL, side: WOOD, leg: WOODD, seam: WOODD },
  3: { top: '#b07a44', side: '#7f5230', leg: STONE, seam: '#5e3a20' },
  4: { top: '#b07a44', side: '#7f5230', leg: '#6a4222', seam: '#5e3a20' },
  5: { top: '#c08a4c', side: '#8a5a32', leg: '#6a4222', seam: '#6a4222' },
  6: { top: RUNE_STONE, side: '#353c40', leg: '#353c40', seam: '#262b2e' },
  7: { top: MARBLE, side: '#dcd6c8', leg: '#e6e1d4', seam: '#b9b2a2' },
};

/** Legs between the apron (y0) and the floor (y1), with outer leg centres at x0 and x1. */
function legs(t: number, x0: number, x1: number, y0: number, y1: number): string {
  const m = MAT[t];
  const h = y1 - y0;
  if (t <= 2) {
    // Trestles: a rough X at each end, joined by a stretcher.
    const tr = (x: number) => {
      const band = t === 2 ? litRect(x - 11, y0 + h * 0.5 - 7, 22, 14, IRON, 2, { lightColor: IRONL }) + rivets([[x - 5, y0 + h * 0.5], [x + 5, y0 + h * 0.5]], 1.8, IRONL) : '';
      return tubeFast(`M${x - 20} ${y1}L${x + 14} ${y0}M${x + 20} ${y1}L${x - 14} ${y0}`, 11, m.leg) + band;
    };
    return tubeFast(`M${x0 + 10} ${y0 + h * 0.62}H${x1 - 10}`, 8, m.side) + tr(x0) + tr(x1);
  }
  if (t === 3 || t === 6) {
    // Stone piers on a plinth; the dark ones carry glowing runes.
    const stone = t === 3 ? STONE : '#3a4145';
    const pier = (x: number) =>
      litRect(x - 22, y0, 44, h - 12, stone, 3, { outline: 4 }) +
      sh.stroke(`M${x - 22} ${y0 + h * 0.35}H${x + 22}M${x - 22} ${y0 + h * 0.7}H${x + 22}M${x} ${y0}V${y0 + h * 0.35}M${x - 8} ${y0 + h * 0.35}V${y0 + h * 0.7}`, t === 3 ? STONED : '#262b2e', 2.2, 0.8) +
      litRect(x - 28, y1 - 14, 56, 14, t === 3 ? STONED : '#2c3236', 3, { outline: 3.5 }) +
      (t === 6 ? sh.stroke(`M${x - 6} ${y0 + h * 0.42}l6 8l6 -8M${x} ${y0 + h * 0.42 + 8}v12`, GLOW, 2.6) : '');
    return pier(x0) + pier(x1);
  }
  if (t === 4 || t === 5) {
    // Turned oak legs; the gilded tier gets golden knobs and feet.
    const knob = t === 5 ? GOLD : m.leg;
    const leg = (x: number) =>
      tubeFast(`M${x} ${y0}V${y1 - 8}`, 14, m.leg) +
      litBall(x, y0 + h * 0.36, 10, knob) + litBall(x, y1 - 7, 8, knob);
    return tubeFast(`M${x0} ${y0 + h * 0.66}H${x1}`, 7, m.side) + leg(x0) + leg(x1);
  }
  // Marble columns with golden capitals and bases.
  const col = (x: number) =>
    litRect(x - 13, y0 + 8, 26, h - 22, m.leg, 2, { outline: 3.5 }) +
    sh.stroke(`M${x - 5} ${y0 + 12}V${y1 - 18}M${x + 5} ${y0 + 12}V${y1 - 18}`, m.seam, 1.6, 0.8) +
    litRect(x - 20, y0, 40, 11, GOLD, 3, { outline: 3, lightColor: MUSTL }) +
    litRect(x - 20, y1 - 15, 40, 15, GOLD, 3, { outline: 3, lightColor: MUSTL });
  return col(x0) + col(x1);
}

/** Detail painted on a table top (clipped to it), between back edge yb and front edge yf. */
function surface(t: number, x0: number, x1: number, yb: number, yf: number, seed: number): string {
  const m = MAT[t];
  const lines = (n: number) => {
    let d = '';
    for (let i = 1; i < n; i++) {
      const y = sh.r1(yb + ((yf - yb) * i) / n);
      d += `M${x0} ${y}H${x1}`;
    }
    return d;
  };
  if (t <= 4) {
    const out = sh.stroke(lines(t <= 2 ? 3 : 4), m.seam, 2, 0.7) +
      sh.stroke(`M${x0 + 30} ${sh.r1(yb + (yf - yb) * 0.2)}q40 4 80 0M${x1 - 120} ${sh.r1(yb + (yf - yb) * 0.55)}q50 -4 90 1`, m.seam, 1.1, 0.5);
    if (t === 2) {
      // Iron straps running from back to front near each end.
      const strap = (x: number) => sh.paint(`M${x - 8} ${yb}H${x + 8}L${x + 12} ${yf}H${x - 12}Z`, IRON) + sh.stroke(`M${x - 6} ${yb}L${x - 9} ${yf}`, IRONL, 1.5, 0.8);
      return out + strap(x0 + (x1 - x0) * 0.18) + strap(x1 - (x1 - x0) * 0.18);
    }
    if (t === 4) {
      const cx = (x0 + x1) / 2;
      const w = (x1 - x0) * 0.12;
      return out + sh.paint(`M${cx - w * 0.8} ${yb}H${cx + w * 0.8}L${cx + w} ${yf}H${cx - w}Z`, RED) +
        sh.stroke(`M${cx - w * 0.8 + 4} ${yb}L${cx - w + 4} ${yf}M${cx + w * 0.8 - 4} ${yb}L${cx + w - 4} ${yf}`, MUST, 2.5);
    }
    return out;
  }
  if (t === 5) {
    // Parquet: slanted strips in two tones, and a golden inlay line.
    const R = sh.rng(seed);
    let a = '';
    for (let x = x0 - 40; x < x1 + 40; x += 18) {
      if (R() < 0.5) a += `M${x} ${yf}L${x + 12} ${yb}h9L${x + 9} ${yf}Z`;
    }
    return sh.paint(a, '#a4703c', 0.55) + sh.stroke(lines(2), m.seam, 1.5, 0.6) +
      sh.stroke(`M${x0 + 26} ${yf - 6}L${x0 + 40} ${yb + 6}H${x1 - 40}L${x1 - 26} ${yf - 6}Z`, MUSTL, 2.2, 0.9);
  }
  if (t === 6) {
    return sh.stroke(lines(3), m.seam, 2, 0.8) +
      sh.stroke(`M${x0 + 26} ${yf - 6}L${x0 + 40} ${yb + 6}H${x1 - 40}L${x1 - 26} ${yf - 6}Z`, GLOW, 2.4, 0.85);
  }
  // Marble veins and a golden inlay.
  return sh.stroke(`M${x0 + 20} ${yb + 6}q40 18 70 10t60 20M${x1 - 90} ${yb + 4}q20 16 50 14t30 22`, '#c4bdae', 1.4, 0.8) +
    sh.stroke(`M${x0 + 26} ${yf - 6}L${x0 + 40} ${yb + 6}H${x1 - 40}L${x1 - 26} ${yf - 6}Z`, GOLD, 2.4, 0.9);
}

/** Detail on the front apron (x, y, w, h). */
function apron(t: number, x: number, y: number, w: number, h: number, seed: number): string {
  const m = MAT[t];
  const cx = x + w / 2;
  switch (t) {
    case 1:
      return sh.stroke(`M${x + 12} ${y + h * 0.4}q${w * 0.3} 3 ${w * 0.55} 0M${x + w * 0.35} ${y + h * 0.7}q${w * 0.3} -3 ${w * 0.6} 0`, m.seam, 1.2, 0.6) +
        sh.paint(fxEll(x + w * 0.7, y + h * 0.45, 5, 3), m.seam, 0.7) + rivets([[x + 10, y + h / 2], [x + w - 10, y + h / 2]], 2, IRONL);
    case 2: {
      const b = (bx: number) => litRect(bx - 7, y - 1, 14, h + 2, IRON, 2, { outline: 3, lightColor: IRONL }) + rivets([[bx, y + 5], [bx, y + h - 5]], 1.8, IRONL);
      return b(x + w * 0.18) + b(cx) + b(x + w * 0.82);
    }
    case 3:
      return sh.stroke(`M${x + 8} ${y + h / 2}H${x + w - 8}`, m.seam, 2, 0.7) + rivets([[cx, y + h / 2]], 3, MUST);
    case 4: {
      // The red runner falls over the front edge and ends in a golden fringe.
      const rw = w * 0.12;
      let fringe = '';
      for (let i = 0; i <= 6; i++) fringe += `M${sh.r1(cx - rw + (rw * 2 * i) / 6)} ${y + h + 10}v7`;
      return sh.lit(`M${cx - rw} ${y - 2}H${cx + rw}V${y + h + 10}L${cx} ${y + h + 4}L${cx - rw} ${y + h + 10}Z`, RED, { outline: 3.5, shadow: 3, light: 1.5, lightColor: REDL }) +
        sh.stroke(`M${cx - rw + 4} ${y}V${y + h + 6}M${cx + rw - 4} ${y}V${y + h + 6}`, MUST, 2.5) +
        sh.stroke(fringe, MUST, 2.2) + rivets([[x + 12, y + h / 2], [x + w - 12, y + h / 2]], 2.4, MUST);
    }
    case 5:
      return sh.paint(`M${x + 2} ${y + 2}H${x + w - 2}V${y + 7}H${x + 2}Z`, GOLD) + sh.paint(`M${x + 2} ${y + h - 7}H${x + w - 2}V${y + h - 2}H${x + 2}Z`, GOLD) +
        [x + w * 0.2, cx, x + w * 0.8].map((mx) => sh.lit(fxCirc(mx, y + h / 2, 6), COPPER, { outline: 2.5, shadow: 1.5, light: 1, lightColor: COPPERL })).join('');
    case 6: {
      const R = sh.rng(seed);
      let d = '';
      for (let i = 0; i < 6; i++) {
        const gx = sh.r1(x + w * (0.14 + i * 0.145));
        const k = Math.floor(R() * 3);
        d += k === 0 ? `M${gx - 4} ${y + 5}L${gx + 4} ${y + h - 5}M${gx + 4} ${y + 5}L${gx - 4} ${y + h - 5}` : k === 1 ? `M${gx} ${y + 5}V${y + h - 5}M${gx} ${y + 8}l5 4` : `M${gx - 4} ${y + h - 5}L${gx} ${y + 5}L${gx + 4} ${y + h - 5}`;
      }
      return sh.stroke(d, GLOW, 2.2, 0.95);
    }
    default:
      return sh.paint(`M${x + 2} ${y + h / 2 - 3}H${x + w - 2}V${y + h / 2 + 3}H${x + 2}Z`, GOLD) + sh.lit(fxCirc(cx, y + h / 2, 8), GOLD, { outline: 3, shadow: 2, light: 1, lightColor: MUSTL });
  }
}

/** A rectangular table: top trapezoid from back edge yb to front edge yf, apron ah deep, legs to yFloor. */
function rectTable(t: number, x0: number, x1: number, yb: number, yf: number, inset: number, ah: number, legInset: number, yFloor: number, seed: number): string {
  const m = MAT[t];
  const TOP = `M${x0} ${yf}L${x0 + inset} ${yb}H${x1 - inset}L${x1} ${yf}Z`;
  return legs(t, x0 + legInset, x1 - legInset, yf + ah - 4, yFloor) +
    sh.lit(TOP, m.top, { outline: 4, shadow: 4, light: 2 }) +
    sh.within(TOP, surface(t, x0, x1, yb, yf, seed)) +
    `<path d="${TOP}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
    litRect(x0 - 4, yf - 2, x1 - x0 + 8, ah, m.side, 4, { outline: 4 }) +
    apron(t, x0 - 4, yf - 2, x1 - x0 + 8, ah, seed);
}

/** Campaign: the big map table with a parchment campaign route through the mountains. */
function mapTable(t: number): Art {
  const MAP = 'M84 118L108 66H292L316 118Z';
  const lineCol = t === 6 ? GLOW : '#8a3a22';
  const dotCol = t === 6 ? GLOW : MUST;
  const mountain = (x: number, y: number, s: number) =>
    sh.paint(`M${x - s} ${y}L${x} ${y - s * 1.1}L${x + s} ${y}Z`, '#8d9cb2') + sh.paint(`M${x - s * 0.36} ${y - s * 0.7}L${x} ${y - s * 1.1}L${x + s * 0.36} ${y - s * 0.7}L${x + s * 0.12} ${y - s * 0.6}L${x - s * 0.1} ${y - s * 0.74}Z`, WHITE);
  const ROUTE = 'M110 110Q136 98 150 104T194 92T228 84T262 74';
  const dots: [number, number][] = [[110, 110], [150, 104], [194, 92], [228, 84]];
  const map =
    sh.lit(MAP, PARCH, { outline: 3, shadow: 4, light: 1.5 }) +
    sh.within(MAP,
      sh.paint('M84 118Q160 100 316 112V120H84Z', '#9bbb84', 0.85) +
      sh.paint('M180 66Q170 84 186 96T176 120H186Q198 98 188 84T194 66Z', '#8fb4cf', 0.9) +
      mountain(140, 92, 18) + mountain(166, 86, 14) + mountain(236, 76, 16) + mountain(270, 84, 20) + mountain(118, 80, 10) +
      sh.paint('M90 70Q100 66 110 70', '#c9b48a', 0.6)) +
    // A little keep where the route starts.
    sh.lit('M98 104h14v10h-14z', STONEL, { outline: 2, shadow: 1, light: 0 }) + sh.lit('M96 104l9 -8l9 8z', RED, { outline: 2, shadow: 1, light: 0 }) +
    `<path d="${ROUTE}" fill="none" stroke="${lineCol}" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>` +
    dots.map(([x, y]) => sh.lit(fxCirc(x, y, 4.5), dotCol, { outline: 2, shadow: 1, light: 0.6, ink: t === 6 ? '#1f5a5c' : INK })).join('') +
    // The flag at the end of the route.
    l('M262 76V44', 3, INK) + sh.lit('M262 44L284 50L262 58Z', RED, { outline: 2.5, shadow: 1.5, light: 0.8, lightColor: REDL }) +
    // A rolled edge on the left of the map.
    sh.lit('M78 120L104 64Q96 62 92 70L70 116Q70 124 78 120Z', sh.tone(PARCH, -0.08), { outline: 3, shadow: 2, light: 1 });
  // Small things on the table that grow with the tier.
  const extra =
    (t >= 3 ? sh.lit(fxRect(318, 92, 24, 18, 3), t >= 5 ? GOLD : WOODL, { outline: 3, shadow: 2, light: 1 }) + sh.paint('M322 92V86h16v6', CREAM) : '') +
    (t >= 4 ? sh.lit(fxCirc(56, 108, 9), t >= 5 ? GOLD : IRONL, { outline: 3, shadow: 2, light: 1, lightColor: MUSTL }) + sh.stroke('M56 102v12M50 108h12', INK, 1.5) : '') +
    (t >= 5 ? fxTwinkle(330, 80, 6, WHITE, 0.9) : '') +
    (t === 6 ? sh.stroke(ROUTE, GLOW, 7, 0.25) : '');
  return centred(400, 260,
    rectTable(t, 30, 370, 58, 126, 40, 28, 40, 254, t) + map + extra,
  );
}

const plateCol: Record<number, [string, string]> = {
  1: [WOOD, WOODD], 2: [WOOD, WOODD], 3: [IRONL, IRON], 4: [IRONL, IRON], 5: [MUST, GOLD], 6: ['#5a6a6e', GLOW], 7: [WHITE, GOLD],
};

/** A drinking vessel: wooden mugs early on, pewter in the middle, golden goblets at the top. */
function mug(t: number, x: number, yb: number): string {
  if (t >= 5) {
    const col = t === 6 ? '#6e7d82' : GOLD;
    return sh.lit(`M${x - 11} ${yb - 34}H${x + 11}Q${x + 10} ${yb - 16} ${x + 2} ${yb - 14}V${yb - 5}H${x + 8}V${yb}H${x - 8}V${yb - 5}H${x - 2}V${yb - 14}Q${x - 10} ${yb - 16} ${x - 11} ${yb - 34}Z`, col, { outline: 3, shadow: 3, light: 1.5, lightColor: MUSTL }) +
      sh.paint(`M${x - 9} ${yb - 32}H${x + 9}V${yb - 28}H${x - 9}Z`, t === 6 ? GLOW : '#8a2030', 0.9);
  }
  const col = t >= 3 ? IRONL : WOODL;
  return l(`M${x + 11} ${yb - 24}Q${x + 22} ${yb - 17} ${x + 11} ${yb - 9}`, 5, INK) +
    litRect(x - 11, yb - 30, 22, 30, col, 4, { outline: 3 }) +
    (t <= 2 ? sh.stroke(`M${x - 11} ${yb - 22}H${x + 11}M${x - 11} ${yb - 8}H${x + 11}`, IRON, 2) : '') +
    sh.paint(`M${x - 9} ${yb - 30}Q${x} ${yb - 38} ${x + 9} ${yb - 30}Z`, CREAM);
}

/** A cheese wheel standing on its side with a wedge cut out. */
function cheeseWheel(x: number, yb: number, rad: number): string {
  return sh.lit(fxEll(x, yb - rad * 0.55, rad, rad * 0.55), MUST, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
    sh.lit(fxEll(x, yb - rad * 0.75, rad, rad * 0.4), MUSTL, { outline: 3, shadow: 1.5, light: 0, shadowColor: MUST }) +
    sh.lit(`M${x} ${yb - rad * 0.75}L${x + rad * 0.95} ${yb - rad * 0.88}V${yb - rad * 0.45}L${x} ${yb - rad * 0.3}Z`, '#f6dd8a', { outline: 2.5, shadow: 1, light: 0 }) +
    [[x - rad * 0.5, yb - rad * 0.8], [x - rad * 0.2, yb - rad * 0.62], [x + rad * 0.5, yb - rad * 0.62]].map(([a, b]) => sh.paint(fxEll(sh.r1(a), sh.r1(b), 2.6, 1.6), GOLD)).join('');
}

/** A candle on a little holder; its flame never changes. */
function candle(x: number, yb: number, h: number, holder: string): string {
  return sh.lit(fxEll(x, yb - 3, 12, 4), holder, { outline: 3, shadow: 1.5, light: 1 }) +
    litRect(x - 5, yb - 3 - h, 10, h, CREAM, 2, { outline: 3 }) +
    sh.lit(`M${x} ${yb - h - 22}Q${x + 7} ${yb - h - 10} ${x} ${yb - h - 5}Q${x - 7} ${yb - h - 10} ${x} ${yb - h - 22}Z`, '#f6a43a', { outline: 2.5, shadow: 0, light: 0 }) +
    sh.paint(`M${x} ${yb - h - 15}Q${x + 3} ${yb - h - 9} ${x} ${yb - h - 7}Q${x - 3} ${yb - h - 9} ${x} ${yb - h - 15}Z`, '#ffe9a0');
}

/** Co-op: a laid table for two friends. */
function coopTable(t: number): Art {
  const [pc, rim] = plateCol[t];
  const plate = (x: number) => sh.lit(fxEll(x, 88, 26, 8), pc, { outline: 3, shadow: 2, light: 1 }) + sh.stroke(`M${x - 18} 88a18 5 0 1 0 36 0a18 5 0 1 0 -36 0`, rim, 1.6, 0.8);
  const holder = t >= 5 ? GOLD : t >= 3 ? IRONL : WOODD;
  return centred(280, 190,
    rectTable(t, 24, 256, 60, 104, 24, 20, 28, 186, t + 10) +
    candle(140, 70, 22, holder) +
    plate(70) + plate(210) +
    // A bread roll on the left plate, a cheese slice on the right one.
    sh.lit(fxEll(66, 84, 10, 6), '#d9a35a', { outline: 2.5, shadow: 2, light: 1 }) +
    sh.lit('M204 86l14 -8l4 8z', MUSTL, { outline: 2.5, shadow: 1, light: 0.6 }) +
    mug(t, 104, 92) + mug(t, 176, 92) +
    cheeseWheel(140, 98, 26),
  );
}

/** The big hourglass of the endless table. */
function hourglass(t: number, x: number, yb: number): string {
  const frame = t >= 5 ? GOLD : t === 6 ? '#3a4145' : t >= 3 ? '#7f5230' : WOODD;
  const fl = t >= 5 ? MUSTL : undefined;
  const H = 86;
  const top = yb - H;
  const glass = `M${x - 18} ${top + 10}Q${x - 18} ${top + 32} ${x - 3} ${top + 43}Q${x - 18} ${top + 54} ${x - 18} ${yb - 10}H${x + 18}Q${x + 18} ${top + 54} ${x + 3} ${top + 43}Q${x + 18} ${top + 32} ${x + 18} ${top + 10}Z`;
  return litRect(x - 27, yb - 10, 54, 10, frame, 3, { outline: 3.5, lightColor: fl }) +
    sh.lit(glass, GLASS, { outline: 3, shadow: 3, light: 1.5 }) +
    sh.within(glass, sh.paint(`M${x - 18} ${top + 24}H${x + 18}V${top + 44}H${x - 18}Z`, SAND) + sh.paint(`M${x - 18} ${yb - 10}Q${x} ${yb - 28} ${x + 18} ${yb - 10}Z`, SAND)) +
    sh.stroke(`M${x} ${top + 43}V${yb - 18}`, SAND, 2) +
    sh.stroke(`M${x - 12} ${top + 16}Q${x - 12} ${top + 28} ${x - 6} ${top + 34}`, WHITE, 2, 0.8) +
    tubeFast(`M${x - 23} ${top + 8}V${yb - 8}M${x + 23} ${top + 8}V${yb - 8}`, 5, frame) +
    litRect(x - 27, top, 54, 10, frame, 3, { outline: 3.5, lightColor: fl }) +
    (t === 6 ? sh.stroke(`M${x - 16} ${top + 5}H${x + 16}M${x - 16} ${yb - 5}H${x + 16}`, GLOW, 2) : '');
}

/** A heap of gold coins with a few lying flat around it. */
function coins(x: number, yb: number, s: number): string {
  const R = sh.rng(Math.round(x * 7 + s));
  let out = sh.lit(`M${x - 30 * s} ${yb}Q${x - 24 * s} ${yb - 20 * s} ${x} ${yb - 26 * s}Q${x + 24 * s} ${yb - 20 * s} ${x + 30 * s} ${yb}Z`, MUST, { outline: 3, shadow: 4, light: 2, lightColor: MUSTL });
  for (let i = 0; i < 9; i++) {
    const cx = sh.r1(x + (R() - 0.5) * 44 * s);
    const cy = sh.r1(yb - 3 - R() * 18 * s * (1 - Math.abs(cx - x) / (32 * s)));
    out += sh.lit(fxEll(cx, cy, 6 * s, 2.6 * s), MUSTL, { outline: 1.8, shadow: 1, light: 0, shadowColor: GOLD });
  }
  return out + sh.lit(`M${x + 8 * s} ${yb - 30 * s}a${6 * s} ${8 * s} 0 1 0 0.1 0Z`, MUSTL, { outline: 2.5, shadow: 1.5, light: 0.8, shadowColor: GOLD }) + fxTwinkle(x - 8 * s, yb - 22 * s, 5, WHITE, 0.95);
}

/** Endless: a round war table with a big hourglass and a heap of gold. */
function endlessTable(t: number): Art {
  const m = MAT[t];
  const TOP = fxEll(140, 98, 122, 32);
  const EDGE = 'M18 98A122 32 0 0 0 262 98V114A122 32 0 0 1 18 114Z';
  const deco =
    t <= 2 ? sh.stroke('M30 94Q140 82 250 94M24 106Q140 120 256 106', m.seam, 1.8, 0.6) + (t === 2 ? sh.stroke('M70 72L58 128M210 72L222 128', IRON, 7) + rivets([[66, 84], [214, 84]], 1.8, IRONL) : '') :
    t === 3 || t === 4 ? sh.stroke(fxEll(140, 98, 92, 22), m.seam, 2, 0.7) + (t === 4 ? sh.paint(fxEll(140, 98, 88, 20), RED, 0.9) + sh.stroke(fxEll(140, 98, 82, 17), MUST, 2.5) : '') :
    t === 5 ? sh.stroke(fxEll(140, 98, 96, 23), MUSTL, 2.5) + sh.stroke('M60 98H220M140 74V122M84 82L196 114M196 82L84 114', '#a4703c', 1.6, 0.6) :
    t === 6 ? sh.stroke(fxEll(140, 98, 96, 23), GLOW, 2.5, 0.9) + sh.stroke('M70 98l6 -6l6 6M200 98l6 6l6 -6M136 76h8M136 120h8', GLOW, 2.2) :
    sh.stroke('M40 92q30 10 60 4t50 8M180 86q20 14 50 10', '#c4bdae', 1.4, 0.8) + sh.stroke(fxEll(140, 98, 96, 23), GOLD, 2.5);
  const rim =
    t === 2 ? sh.stroke('M20 106A122 32 0 0 0 260 106', IRON, 6) + rivets([[60, 124], [140, 132], [220, 124]], 1.8, IRONL) :
    t === 4 ? sh.paint('M118 128L140 130L162 128V146L140 140L118 146Z', RED) + sh.stroke('M118 128L140 130L162 128V146L140 140L118 146Z', INK, 3) :
    t === 5 || t === 7 ? sh.stroke('M20 102A122 32 0 0 0 260 102', GOLD, 4) :
    t === 6 ? sh.stroke('M60 124l4 4l4 -4M136 132v-6M210 124l4 4l4 -4', GLOW, 2.2) : '';
  return centred(280, 190,
    legs(t, 92, 188, 120, 186) +
    sh.lit(EDGE, m.side, { outline: 4, shadow: 3, light: 0 }) + rim +
    sh.lit(TOP, m.top, { outline: 4, shadow: 4, light: 2 }) +
    sh.within(TOP, deco) + `<path d="${TOP}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    hourglass(t, 120, 106) +
    coins(198, 108, 1) +
    sh.lit(fxEll(66, 106, 8, 3.2), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }) +
    sh.lit(fxEll(78, 112, 8, 3.2), MUSTL, { outline: 2, shadow: 1, light: 0, shadowColor: GOLD }),
  );
}

/** Soft dust clouds on the floor. */
const dust = (pts: [number, number, number][]) =>
  pts.map(([x, y, s]) => sh.paint(`M${x - s} ${y}q0 -${s * 0.8} ${s * 0.7} -${s * 0.7}q${s * 0.3} -${s * 0.7} ${s} -${s * 0.3}q${s * 0.6} -${s * 0.2} ${s * 0.6} ${s}Z`, DUST, 0.75)).join('');

/** A cobweb spanning a corner at (x, y), opening towards (dx, dy). */
const cobweb = (x: number, y: number, dx: number, dy: number) =>
  sh.stroke(`M${x} ${y}L${x + dx} ${y}M${x} ${y}L${x} ${y + dy}M${x} ${y}L${x + dx * 0.8} ${y + dy * 0.8}M${x + dx * 0.4} ${y}Q${x + dx * 0.35} ${y + dy * 0.35} ${x} ${y + dy * 0.4}M${x + dx * 0.75} ${y}Q${x + dx * 0.6} ${y + dy * 0.6} ${x} ${y + dy * 0.75}`, '#f4f1ea', 1.3, 0.85);

/** The co-op table before it is mended: on its side, one leg snapped off. */
export const coopTableBroken: Art = (() => {
  const TOP = 'M34 44L70 28V170L34 178Z';
  return centred(280, 190,
    dust([[40, 184, 14], [150, 186, 10], [250, 184, 12]]) +
    // Legs pointing sideways, the lower one a broken stump.
    tubeFast('M70 58L196 50', 13, WOODD) +
    tubeFast('M70 146L118 148', 13, WOODD) + sh.lit('M112 140L124 141L119 146L127 150L113 155Z', '#d8b07a', { outline: 2.5, shadow: 1, light: 0 }) +
    tubeFast('M70 102H180', 8, WOOD) +
    sh.lit(TOP, WOODL, { outline: 4, shadow: 4, light: 2 }) +
    sh.within(TOP, sh.stroke('M46 40V176M58 34V174', WOODD, 2, 0.7)) +
    // A crack through one plank.
    l('M58 70L52 88L60 100L54 120', 2.5, INK) +
    litRect(70, 26, 16, 150, WOOD, 3, { outline: 4 }) +
    // The snapped leg lying on the floor.
    `<g transform="rotate(-6 210 170)">${tubeFast('M150 172H244', 13, WOODD)}${sh.lit('M144 164L152 166L148 172L154 178L142 180Z', '#d8b07a', { outline: 2.5, shadow: 1, light: 0 })}</g>` +
    cobweb(86, 58, 40, 40) + cobweb(70, 176, 30, -26),
  );
})();

/** The endless table before it is mended: toppled, cracked, the hourglass broken in the sand. */
export const endlessTableBroken: Art = (() => {
  const TOP = fxEll(64, 104, 30, 74);
  return centred(280, 190,
    dust([[30, 184, 12], [130, 186, 10], [240, 186, 13]]) +
    // The pedestal lying on its side.
    tubeFast('M90 120H168', 22, WOODD) + litRect(166, 92, 18, 58, WOODD, 4, { outline: 4 }) +
    sh.lit(TOP, WOOD, { outline: 4, shadow: 5, light: 2 }) +
    sh.within(TOP, sh.stroke('M48 40V170M64 30V178M80 40V170', WOODD, 1.8, 0.6)) +
    l('M60 34L70 60L58 84L72 108L62 130', 3, INK) + sh.paint('M60 34L70 60L66 62Z', INK, 0.5) +
    // The broken hourglass lying on the floor, sand spilled out.
    sh.lit('M188 182Q214 162 252 182Z', SAND, { outline: 3, shadow: 2, light: 1, lightColor: '#f6dd8a' }) +
    `<g transform="rotate(-80 214 166)">` +
    litRect(196, 152, 40, 8, WOOD, 2, { outline: 3 }) + litRect(196, 180, 40, 8, WOOD, 2, { outline: 3 }) +
    sh.lit('M202 160Q202 168 214 172Q226 168 226 160Z', GLASS, { outline: 2.5, shadow: 1.5, light: 0 }) +
    tubeFast('M200 160V180M232 160V180', 4, WOODD) + '</g>' +
    sh.lit('M228 176l8 -10l4 8z', GLASS, { outline: 2, shadow: 0, light: 0 }) +
    sh.lit('M244 178l6 -6l3 7z', GLASS, { outline: 2, shadow: 0, light: 0 }) +
    cobweb(150, 109, 28, -30),
  );
})();

export const TABLE_ART: Record<string, Art> = (() => {
  const out: Record<string, Art> = {};
  for (let t = 1; t <= 7; t++) {
    out[`mapTable${t}`] = mapTable(t);
    out[`coopTable${t}`] = coopTable(t);
    out[`endlessTable${t}`] = endlessTable(t);
  }
  out.coopTableBroken = coopTableBroken;
  out.endlessTableBroken = endlessTableBroken;
  return out;
})();
