/**
 * The hall inside the keep, where the lobby lives: stone walls in candle light, a beamed ceiling,
 * two pillars with torches beside the throne alcove, the door out to the gate on the left, a
 * window to the Alps on each far side and a plank floor. Furniture and decor are separate pictures.
 * Coordinates match src/render/lobby/layout.ts (room 1600 x 720).
 */
import { INK, STONE, STONED, STONEL, WOOD, WOODD, WOODL, IRON, IRONL, l, hl, art } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxRect, fxRivet } from '../props/kit';

const W = 1600;
const H = 720;
const FLOOR = 592;
const WALL_TOP = 64;
const MORTAR = '#5d4e40';
const WALL = '#a39079';

/** Staggered stone blocks over the whole back wall, each a little lighter or darker. */
function stones(): string {
  const rnd = sh.rng(7);
  let out = '';
  const rowH = 44;
  for (let row = 0, y = WALL_TOP; y < FLOOR; row++, y += rowH) {
    let x = row % 2 ? -40 : -90;
    while (x < W) {
      const w = 92 + Math.floor(rnd() * 46);
      const fill = sh.tone(WALL, (rnd() - 0.5) * 0.16);
      out += `<path d="${fxRect(x + 2, y + 2, w - 4, rowH - 4, 7)}" fill="${fill}" stroke="${MORTAR}" stroke-width="3"/>`;
      if (rnd() < 0.35) out += sh.stroke(`M${x + 12} ${y + 9}h${sh.r1(w * 0.4)}`, sh.tone(WALL, 0.22), 2, 0.7);
      x += w;
    }
  }
  return out;
}

/** An arched window with a view of snowy peaks. */
function windowAt(cx: number): string {
  const x0 = cx - 54;
  const x1 = cx + 54;
  const top = 150;
  const bottom = 390;
  const OPEN = `M${x0} ${bottom}V${top + 54}A54 54 0 0 1 ${x1} ${top + 54}V${bottom}Z`;
  const FRAME = `M${x0 - 16} ${bottom + 14}V${top + 54}A70 70 0 0 1 ${x1 + 16} ${top + 54}V${bottom + 14}Z`;
  const sky = sh.linear([[0, '#7fb6dc'], [1, '#d8ecf2']], 90);
  const peaks = `M${x0} 330L${cx - 26} 262L${cx - 4} 300L${cx + 20} 246L${x1} 318V${bottom}H${x0}Z`;
  const snow = `M${cx - 26} 262L${cx - 36} 280L${cx - 22} 276L${cx - 14} 284ZM${cx + 20} 246L${cx + 8} 268L${cx + 22} 262L${cx + 34} 272Z`;
  return (
    `<defs>${sky.def}</defs>` +
    sh.lit(FRAME, STONEL, { outline: 4, shadow: 6, light: 3 }) +
    `<path d="${OPEN}" fill="${sky.url}"/>` +
    sh.within(OPEN, sh.paint(peaks, '#7d8fa8') + sh.paint(snow, '#f6fbff') + sh.paint(`M${x0} 360Q${cx} 340 ${x1} 356V${bottom}H${x0}Z`, '#6f9a5c')) +
    l(`M${cx} ${top}V${bottom}M${x0} ${top + 120}H${x1}`, 7, INK) +
    hl(`M${cx} ${top}V${bottom}M${x0} ${top + 120}H${x1}`, WOODD, 4) +
    `<path d="${OPEN}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    sh.lit(fxRect(x0 - 24, bottom + 6, 156, 18, 5), STONE, { outline: 3.5, shadow: 3, light: 1.5 })
  );
}

/** The door out to the gate: oak planks under a stone arch, iron bands and a ring. */
function door(): string {
  const cx = 250;
  const x0 = cx - 76;
  const x1 = cx + 76;
  const top = 330;
  const ARCH = `M${x0 - 22} ${FLOOR}V${top + 76}A98 98 0 0 1 ${x1 + 22} ${top + 76}V${FLOOR}Z`;
  const LEAF = `M${x0} ${FLOOR}V${top + 76}A76 76 0 0 1 ${x1} ${top + 76}V${FLOOR}Z`;
  let planks = '';
  for (let x = x0 + 30; x < x1; x += 30) planks += `M${x} ${top - 10}V${FLOOR}`;
  const band = (y: number) => sh.lit(fxRect(x0 + 4, y, 144, 14, 3), IRON, { outline: 3, shadow: 2, light: 1.2, lightColor: IRONL }) +
    [x0 + 18, x0 + 52, x0 + 100, x0 + 134].map((x) => fxRivet(x, y + 7, 2.2)).join('');
  return (
    sh.lit(ARCH, STONED, { outline: 4, shadow: 8, light: 3 }) +
    sh.lit(LEAF, WOOD, { outline: 4, shadow: 10, light: 3 }) +
    sh.within(LEAF, sh.stroke(planks, WOODD, 3, 0.8) + band(top + 80) + band(FLOOR - 70)) +
    `<path d="${LEAF}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="${x1 - 28}" cy="${FLOOR - 130}" r="13" fill="none" stroke="${INK}" stroke-width="8"/>` +
    `<circle cx="${x1 - 28}" cy="${FLOOR - 130}" r="13" fill="none" stroke="${IRONL}" stroke-width="4"/>`
  );
}

/** A stone pillar with a torch bracket, beside the throne alcove. */
function pillar(cx: number): string {
  const P = fxRect(cx - 30, WALL_TOP - 4, 60, FLOOR - WALL_TOP + 4, 4);
  const CAP = fxRect(cx - 40, WALL_TOP, 80, 22, 5);
  const BASE = fxRect(cx - 40, FLOOR - 26, 80, 26, 5);
  const bracket = `M${cx - 14} 372L${cx} 352L${cx + 14} 372Z`;
  return (
    sh.lit(P, STONE, { outline: 4, shadow: 10, light: 4 }) +
    sh.within(P, sh.stroke(`M${cx - 30} 160H${cx + 30}M${cx - 30} 260H${cx + 30}M${cx - 30} 460H${cx + 30}`, STONED, 3, 0.8)) +
    sh.lit(CAP, STONEL, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(BASE, STONEL, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(`M${cx - 9} 386L${cx - 12} 350H${cx + 12}L${cx + 9} 386Z`, WOODD, { outline: 3.5, shadow: 2, light: 1 }) +
    sh.lit(bracket, IRON, { outline: 3, shadow: 2, light: 1, lightColor: IRONL })
  );
}

/** The throne alcove's two-step stone dais. */
function dais(): string {
  return (
    sh.lit(fxRect(640, FLOOR - 40, 320, 50, 6), STONE, { outline: 4, shadow: 6, light: 3 }) +
    sh.lit(fxRect(680, FLOOR - 72, 240, 40, 6), STONEL, { outline: 4, shadow: 5, light: 3 })
  );
}

/** Ceiling: a dark beam band with rafter ends. */
function ceiling(): string {
  let rafters = '';
  for (let x = 40; x < W; x += 160) rafters += sh.lit(fxRect(x, 30, 44, 44, 5), WOOD, { outline: 3.5, shadow: 4, light: 2 }) + fxRivet(x + 22, 52, 3);
  return sh.lit(`M-10 -10H${W + 10}V${WALL_TOP}H-10Z`, WOODD, { outline: 4, shadow: 8, light: 3 }) +
    sh.stroke(`M0 14H${W}M0 26H${W}`, sh.tone(WOODD, -0.2), 2, 0.6) + rafters;
}

/** Plank floor, a little darker towards the front. */
function floor(): string {
  const g = sh.linear([[0, WOODL], [1, sh.tone(WOODD, -0.15)]], 90);
  let lines = '';
  for (let y = FLOOR + 22, i = 0; y < H; y += 26 + i * 4, i++) lines += `M0 ${y}H${W}`;
  const rnd = sh.rng(11);
  let joints = '';
  for (let y = FLOOR, i = 0; y < H; y += 26 + i * 4, i++) {
    for (let x = rnd() * 200; x < W; x += 180 + rnd() * 160) joints += `M${sh.r1(x)} ${y}v${22 + i * 4}`;
  }
  return `<defs>${g.def}</defs><rect x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${g.url}"/>` +
    sh.stroke(lines, WOODD, 3, 0.8) + sh.stroke(joints, WOODD, 2.5, 0.7) +
    `<path d="M0 ${FLOOR}H${W}" stroke="${INK}" stroke-width="5"/>`;
}

/** Warm light pools: around the torches and the throne; darker towards the corners. */
function light(): string {
  const warm = sh.radial([[0, '#ffd27a', 0.42], [0.5, '#ffb050', 0.14], [1, '#ffb050', 0]]);
  const dark = sh.radial([[0, '#1c1420', 0], [0.7, '#1c1420', 0.05], [1, '#1c1420', 0.42]], 0.5, 0.45, 0.75);
  return `<defs>${warm.def}${dark.def}</defs>` +
    `<ellipse cx="640" cy="330" rx="230" ry="200" fill="${warm.url}"/>` +
    `<ellipse cx="960" cy="330" rx="230" ry="200" fill="${warm.url}"/>` +
    `<ellipse cx="800" cy="420" rx="320" ry="260" fill="${warm.url}" opacity=".7"/>` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${dark.url}"/>`;
}

export const lobbyRoom: Art = art(W, H, 0, 0,
  `<rect x="0" y="0" width="${W}" height="${H}" fill="${WALL}"/>` +
  stones() +
  windowAt(78) + windowAt(1522) +
  door() + pillar(640) + pillar(960) + dais() +
  ceiling() + floor() + light(),
);

/** A torch flame (animated in the scene); anchor at its foot. */
export const lobbyFlame: Art = art(40, 64, 20, 60,
  `<path d="M20 60C6 58 4 40 12 28C14 36 18 36 18 30C18 18 24 10 26 2C30 16 38 26 36 42C35 54 30 60 20 60Z" fill="#f08a2c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M20 56C13 54 12 44 17 38C19 44 22 42 22 38C25 42 30 46 28 50C27 54 24 56 20 56Z" fill="#ffe08a"/>`,
);
