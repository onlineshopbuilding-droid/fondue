/**
 * The hall's shell for each castle tier (1 Oak Gate .. 7 Alpine Citadel): tileable back wall, floor
 * and ceiling, plus the window, the door out to the gate and the King's fondue cauldron. Each tier
 * changes colour and material, from a log hall strewn with straw to a marble and gold citadel.
 * Tiles are 400 units wide and wrap seamlessly; the scene repeats them across the 1600-unit room.
 * The cauldron has no steam (the scene animates it). Light comes from the upper left.
 */
import { INK, STONE, STONED, STONEL, WOOD, WOODD, WOODL, IRON, IRONL, GOLD, GOLDD, MUST, MUSTL, RED, REDL, GLOW, l, hl, art, centred } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxRect, fxCirc, fxEll, fxRivet } from '../props/kit';

const TW = 400;
const WALL_H = 380;
const FLOOR_H = 280;
const CEIL_H = 72;
const CHEESE = '#f5c842';
const CHEESEL = '#ffe58a';
const MARBLE = '#efe6d6';
const BURGUNDY = '#7a2a35';

type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ---------------------------------------------------------------- shared pieces

/** Rows of staggered blocks that wrap at x = 0 / 400; one stroke each for all lit and shaded edges. */
function blocks(seed: number, rows: readonly [number, number][], base: string, mortar: string, o: { avg: number; vary?: number; rad?: number; mw?: number; edge?: boolean; each?: (x: number, y: number, w: number, h: number, rnd: () => number) => string }): string {
  const rnd = sh.rng(seed);
  let out = '';
  let lights = '';
  let shades = '';
  const rad = o.rad ?? 6;
  const mw = o.mw ?? 3;
  rows.forEach(([y, h], row) => {
    const n = Math.max(1, Math.round(TW / o.avg));
    const raw = Array.from({ length: n }, () => 0.75 + rnd() * 0.5);
    const sum = raw.reduce((a, b) => a + b, 0);
    const ws = raw.map((v) => sh.r1((v / sum) * TW));
    ws[n - 1] = sh.r1(TW - ws.slice(0, n - 1).reduce((a, b) => a + b, 0));
    let x = -sh.r1((row % 2 ? 0.5 : 0.15 + rnd() * 0.2) * ws[0]);
    ws.forEach((w, i) => {
      const fill = sh.tone(base, (rnd() - 0.5) * (o.vary ?? 0.16));
      const copies = i === 0 ? [x, x + TW] : [x];
      for (const bx of copies) {
        out += `<path d="${fxRect(sh.r1(bx + mw / 2), sh.r1(y + mw / 2), sh.r1(w - mw), sh.r1(h - mw), rad)}" fill="${fill}" stroke="${mortar}" stroke-width="${mw}"/>`;
        if (o.edge !== false) {
          lights += `M${sh.r1(bx + 5)} ${sh.r1(y + h - 6)}V${sh.r1(y + 5)}H${sh.r1(bx + w - 7)}`;
          shades += `M${sh.r1(bx + w - 5)} ${sh.r1(y + 7)}V${sh.r1(y + h - 5)}H${sh.r1(bx + 7)}`;
        }
        if (o.each) out += o.each(bx, y, w, h, rnd);
      }
      x += w;
    });
  });
  return out + sh.stroke(lights, sh.tone(base, 0.32), 2.4, 0.7) + sh.stroke(shades, sh.tone(base, -0.3), 3, 0.7);
}

/** Wall rows of equal height from the top of the tile. */
const wallRows = (h: number, top = 0, bottom = WALL_H): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = top; y < bottom; y += h) out.push([y, h]);
  return out;
};

/** Floor rows that grow towards the front, so lines are denser at the back. */
const floorRows = (h0: number, g: number): [number, number][] => {
  const out: [number, number][] = [];
  let h = h0;
  for (let y = 0; y < FLOOR_H; y += h, h *= g) out.push([sh.r1(y), sh.r1(h)]);
  return out;
};

/** Paints `inner` again shifted by one tile width to each side, so anything near an edge wraps. */
const wrap = (inner: string) => inner + `<g transform="translate(-${TW} 0)">${inner}</g><g transform="translate(${TW} 0)">${inner}</g>`;

/** A full opaque background with a top-to-bottom gradient. */
function ground(w: number, h: number, top: string, bottom: string): string {
  const g = sh.linear([[0, top], [1, bottom]], 90);
  return `<defs>${g.def}</defs><rect x="0" y="0" width="${w}" height="${h}" fill="${g.url}"/>`;
}

/** Floor finish: darker towards the front, and the dark seam where the floor meets the wall. */
function floorFinish(): string {
  const g = sh.linear([[0, '#1c1420', 0], [1, '#1c1420', 0.32]], 90);
  return `<defs>${g.def}</defs><rect x="0" y="0" width="${TW}" height="${FLOOR_H}" fill="${g.url}"/>` +
    `<path d="M0 2H${TW}" stroke="${INK}" stroke-width="5"/>`;
}

/** Ceiling finish: dark bottom outline. */
const ceilFinish = () => `<path d="M0 ${CEIL_H - 2}H${TW}" stroke="${INK}" stroke-width="4"/>`;

/** A small original rune of four kinds, centred at (x, y). */
function rune(kind: number, x: number, y: number, s: number): string {
  const k = (v: number) => sh.r1(v * s);
  const P = [
    `M${x} ${y - k(1)}V${y + k(1)}M${x} ${y - k(1)}L${x + k(0.6)} ${y - k(0.4)}L${x} ${y + k(0.1)}`,
    `M${x - k(0.6)} ${y + k(0.7)}L${x} ${y - k(1)}L${x + k(0.6)} ${y + k(0.7)}M${x - k(0.3)} ${y + k(0.1)}H${x + k(0.3)}`,
    `M${x - k(0.4)} ${y + k(1)}V${y - k(1)}L${x + k(0.45)} ${y - k(0.3)}L${x - k(0.4)} ${y + k(0.3)}`,
    `M${x - k(0.5)} ${y - k(1)}V${y + k(1)}M${x + k(0.5)} ${y - k(1)}V${y + k(1)}M${x - k(0.5)} ${y}L${x + k(0.5)} ${y - k(0.5)}`,
  ];
  return P[kind % 4];
}

/** Rune strokes carved dark and glowing teal. */
const glowLines = (d: string, w = 2.6) =>
  sh.stroke(d, '#1e2530', w + 2.4) + sh.stroke(d, GLOW, w * 3.2, 0.25) + sh.stroke(d, GLOW, w) + sh.stroke(d, '#e9fffb', w * 0.4, 0.8);

/** A cheese wedge emblem centred at (x, y). */
function cheeseMark(x: number, y: number, s: number): string {
  const d = `M${x - 24 * s} ${y + 12 * s}H${x + 24 * s}V${y - 4 * s}L${x - 24 * s} ${y - 15 * s}Z`;
  return sh.lit(d, CHEESE, { outline: 3, shadow: 3 * s, light: 1.5 * s }) +
    sh.paint(fxCirc(x - 8 * s, y + 2 * s, 4 * s) + fxCirc(x + 10 * s, y + 4 * s, 3 * s) + fxCirc(x - 16 * s, y - 6 * s, 2.4 * s), '#c9962a');
}

// ---------------------------------------------------------------- walls (400 x 380)

function wall(t: Tier): string {
  switch (t) {
    case 1: {
      // Rough horizontal logs with knots and the odd joint.
      const rows = wallRows(38);
      const rnd = sh.rng(101);
      let logs = '';
      let grain = '';
      let knots = '';
      rows.forEach(([y, h], i) => {
        const fill = sh.tone(WOOD, (rnd() - 0.5) * 0.2 - 0.04);
        logs += `<path d="M-10 ${y + 3}H${TW + 10}V${y + h - 2}H-10Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>`;
        grain += `M0 ${y + 9 + (i % 3)}H${TW}M0 ${y + h - 10}H${TW}`;
        for (let k = 0; k < 2; k++) {
          const kx = sh.r1(30 + rnd() * 340);
          knots += `<ellipse cx="${kx}" cy="${y + h / 2}" rx="${sh.r1(6 + rnd() * 5)}" ry="4.5" fill="${WOODD}" stroke="${INK}" stroke-width="2"/>`;
        }
        const jx = sh.r1(60 + rnd() * 280);
        grain += `M${jx} ${y + 3}V${y + h - 2}`;
      });
      return `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="${INK}"/>` + logs +
        sh.stroke(grain, WOODD, 2.4, 0.75) + knots +
        sh.stroke(rows.map(([y]) => `M0 ${y + 6}H${TW}`).join(''), WOODL, 2.4, 0.55);
    }
    case 2: {
      // Vertical planks held by dark iron bands with a rivet on every plank.
      const rnd = sh.rng(202);
      let planks = '';
      let grain = '';
      const PW = 40;
      for (let x = 0; x < TW; x += PW) {
        const fill = sh.tone('#8a6440', (rnd() - 0.5) * 0.18);
        planks += `<path d="M${x + 1.5} -4H${x + PW - 1.5}V${WALL_H + 4}H${x + 1.5}Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>`;
        grain += `M${x + 10 + rnd() * 8} 0V${WALL_H}M${x + 26 + rnd() * 6} 0V${WALL_H}`;
      }
      let rivets = '';
      const bands = [70, 270].map((y) => {
        for (let x = 20; x < TW; x += PW) rivets += fxRivet(x, y + 11, 3);
        return `<path d="M-10 ${y}H${TW + 10}V${y + 22}H-10Z" fill="${IRON}" stroke="${INK}" stroke-width="3.5"/>` +
          sh.stroke(`M0 ${y + 4}H${TW}`, IRONL, 2.5, 0.8) + sh.stroke(`M0 ${y + 19}H${TW}`, '#2d3035', 2.5);
      }).join('');
      return `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="${INK}"/>` + planks +
        sh.stroke(grain, '#5e3f22', 2, 0.6) + sh.stroke(Array.from({ length: 10 }, (_, i) => `M${i * PW + 5} 0V${WALL_H}`).join(''), '#b08a5e', 2, 0.5) +
        bands + rivets;
    }
    case 3:
      return `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="#5d4e40"/>` +
        blocks(303, wallRows(44), '#a39079', '#5d4e40', { avg: 115, rad: 7 });
    case 4: {
      // Warm stone with one tall red banner bearing the cheese.
      const base = `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="#6a4d36"/>` +
        blocks(404, wallRows(46), '#c29a6e', '#6a4d36', { avg: 120, rad: 7, vary: 0.14 });
      const bx0 = 152;
      const bx1 = 248;
      const BAN = `M${bx0} 34H${bx1}V292L${(bx0 + bx1) / 2} 268L${bx0} 292Z`;
      const g = sh.linear([[0, REDL], [0.35, RED], [1, '#7c1a20']], 0);
      return base +
        sh.paint(`M${bx0 + 8} 40H${bx1 + 10}V300L${(bx0 + bx1) / 2 + 9} 276L${bx0 + 8} 300Z`, '#2a1a12', 0.3) +
        `<defs>${g.def}</defs><path d="${BAN}" fill="${g.url}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
        sh.within(BAN, sh.stroke(`M${bx0 + 10} 30V300M${bx1 - 10} 30V300`, MUST, 4) + sh.stroke(`M${bx0 + 34} 60V280M${bx0 + 62} 60V270`, '#7c1a20', 2, 0.5)) +
        cheeseMark(200, 150, 1.25) +
        sh.litTube(`M${bx0 - 16} 32H${bx1 + 16}`, 9, WOODD) +
        `<circle cx="${bx0 - 18}" cy="32" r="7" fill="${GOLD}" stroke="${INK}" stroke-width="3"/><circle cx="${bx1 + 18}" cy="32" r="7" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>`;
    }
    case 5: {
      // Honey sandstone, a gold trim band and a dark wood wainscot.
      const base = `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="#9c7a44"/>` +
        blocks(505, wallRows(52, 0, 250), '#ddb46c', '#a8824a', { avg: 140, rad: 4, vary: 0.1, mw: 2.5 });
      let panels = '';
      for (let x = 0; x < TW; x += 100) {
        panels += sh.lit(fxRect(x + 12, 284, 76, 78, 5), '#6a3f22', { outline: 3, shadow: 4, light: 2, lightColor: '#8f5c34' });
      }
      return base +
        `<path d="M-10 262H${TW + 10}V${WALL_H + 5}H-10Z" fill="#4e2e18" stroke="${INK}" stroke-width="3.5"/>` + panels +
        `<path d="M-10 246H${TW + 10}V266H-10Z" fill="${GOLD}" stroke="${INK}" stroke-width="3.5"/>` +
        sh.stroke(`M0 250H${TW}`, MUSTL, 3) + sh.stroke(`M0 262H${TW}`, GOLDD, 3) +
        sh.stroke(Array.from({ length: 8 }, (_, i) => `M${i * 50 + 25} 252l6 4.5l-6 4.5l-6 -4.5Z`).join(''), GOLDD, 2);
    }
    case 6: {
      // Big dark blue-grey ashlar with glowing runes carved into some blocks.
      let runes = '';
      let k = 0;
      const body = blocks(606, wallRows(64), '#4a5566', '#262c36', { avg: 135, rad: 5, vary: 0.12, mw: 4, each: (x, y, w, h, rnd) => {
        if (x < 0 || x + w > TW) return '';
        if (rnd() < 0.45) runes += rune(k++, sh.r1(x + w / 2), sh.r1(y + h / 2), 14);
        return '';
      } });
      return `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="#262c36"/>` + body + glowLines(runes);
    }
    default: {
      // Cream marble slabs with soft veins and a gold pilaster in the middle.
      const rnd = sh.rng(707);
      let veins = '';
      for (let i = 0; i < 9; i++) {
        const x = sh.r1(rnd() * TW);
        const y = sh.r1(rnd() * 330);
        veins += `M${x} ${y}q${sh.r1(20 + rnd() * 20)} ${sh.r1(10 + rnd() * 16)} ${sh.r1(34 + rnd() * 20)} ${sh.r1(4 + rnd() * 24)}t${sh.r1(30 + rnd() * 20)} ${sh.r1(10 + rnd() * 10)}`;
      }
      const P = 'M174 40H226V340H174Z';
      const g = sh.linear([[0, MUSTL], [0.4, GOLD], [1, GOLDD]], 0);
      return `<rect x="0" y="0" width="${TW}" height="${WALL_H}" fill="#cbbfa8"/>` +
        blocks(708, wallRows(76), MARBLE, '#cbbfa8', { avg: 200, rad: 3, vary: 0.06, mw: 2 }) +
        wrap(sh.stroke(veins, '#b8a99a', 1.6, 0.55)) +
        `<path d="M-10 344H${TW + 10}V${WALL_H + 5}H-10Z" fill="#d8ccb6" stroke="${INK}" stroke-width="3.5"/>` +
        `<path d="M-10 336H${TW + 10}V348H-10Z" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>` +
        `<defs>${g.def}</defs><path d="${P}" fill="${g.url}" stroke="${INK}" stroke-width="4"/>` +
        sh.stroke('M186 50V330M200 50V330M214 50V330', GOLDD, 2.5, 0.7) +
        sh.lit('M164 14H236L230 30H170Z', GOLD, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
        sh.lit(fxRect(166, 28, 68, 14, 4), MUSTL, { outline: 3.5, shadow: 3, light: 1.5 }) +
        `<path d="M176 24c-8 -10 -20 -4 -14 6M224 24c8 -10 20 -4 14 6" fill="none" stroke="${INK}" stroke-width="3"/>` +
        sh.lit(fxRect(166, 326, 68, 16, 4), GOLD, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
        sh.glint(180, 70, 2.6);
    }
  }
}

// ---------------------------------------------------------------- floors (400 x 280)

function floor(t: Tier): string {
  switch (t) {
    case 1: {
      // Packed earth with straw and a few pebbles.
      const rnd = sh.rng(111);
      let straw = '';
      let straw2 = '';
      let pebbles = '';
      for (let i = 0; i < 70; i++) {
        const y = sh.r1(8 + Math.pow(rnd(), 0.8) * 268);
        const x = sh.r1(rnd() * TW);
        const len = 10 + (y / FLOOR_H) * 22;
        const a = (rnd() - 0.5) * 1.2;
        const seg = `M${x} ${y}l${sh.r1(Math.cos(a) * len)} ${sh.r1(Math.sin(a) * len * 0.5)}`;
        if (i % 2) straw += seg; else straw2 += seg;
      }
      for (let i = 0; i < 14; i++) {
        const y = 20 + rnd() * 250;
        const s = 2 + (y / FLOOR_H) * 5;
        pebbles += fxEll(sh.r1(rnd() * TW), sh.r1(y), sh.r1(s * 1.4), sh.r1(s * 0.8));
      }
      return ground(TW, FLOOR_H, '#8f6e4a', '#6b4e33') +
        wrap(sh.paint(pebbles, '#5a4231') + sh.stroke(straw, '#a7852f', 3.4) + sh.stroke(straw, '#e8c75e', 2) + sh.stroke(straw2, '#d4ad48', 2.4)) +
        floorFinish();
    }
    case 2:
    case 4: {
      // Planks along the hall; tier 4 adds a long red runner.
      const rows = floorRows(16, 1.16);
      const rnd = sh.rng(t === 2 ? 222 : 444);
      let lines = '';
      let joints = '';
      for (const [y, h] of rows) {
        lines += `M0 ${y}H${TW}`;
        for (let x = 20 + rnd() * 120; x < TW - 10; x += 120 + rnd() * 140) joints += `M${sh.r1(x)} ${y}v${h}`;
      }
      const wood = t === 2 ? ['#a57a4c', '#6e4c2c'] : ['#b8875a', '#7a5233'];
      let rug = '';
      if (t === 4) {
        const y0 = 108;
        const y1 = 196;
        let dia = '';
        for (let x = 25; x < TW; x += 50) dia += `M${x} ${y0 + 24}l14 20l-14 20l-14 -20Z`;
        rug = `<path d="M-10 ${y0}H${TW + 10}V${y1}H-10Z" fill="${RED}" stroke="${INK}" stroke-width="4"/>` +
          sh.stroke(`M0 ${y0 + 9}H${TW}M0 ${y1 - 9}H${TW}`, MUST, 5) + sh.paint(dia, '#e0a63a') +
          sh.stroke(`M0 ${y0 + 3}H${TW}`, REDL, 2.5, 0.8) + sh.paint(`M0 ${y1 - 30}H${TW}V${y1}H0Z`, '#5a1018', 0.25);
      }
      return ground(TW, FLOOR_H, wood[0], wood[1]) +
        sh.stroke(lines, WOODD, 3, 0.8) + sh.stroke(joints, WOODD, 2.5, 0.7) +
        sh.stroke(rows.map(([y]) => `M0 ${y + 4}H${TW}`).join(''), WOODL, 1.6, 0.4) + rug + floorFinish();
    }
    case 3:
      return `<rect x="0" y="0" width="${TW}" height="${FLOOR_H}" fill="#4f4840"/>` +
        blocks(333, floorRows(22, 1.2), '#8f897a', '#4f4840', { avg: 110, rad: 6, vary: 0.18 }) + floorFinish();
    case 5: {
      // Herringbone parquet: rows of slanted blocks leaning alternately left and right.
      const rows = floorRows(18, 1.17);
      let light = '';
      let dark = '';
      rows.forEach(([y, h], i) => {
        const s = (i % 2 ? 1 : -1) * h * 0.9;
        const pw = 40;
        for (let x = -80, j = 0; x < TW + 80; x += pw, j++) {
          const d = `M${sh.r1(x)} ${y}H${sh.r1(x + pw)}L${sh.r1(x + pw + s)} ${sh.r1(y + h)}H${sh.r1(x + s)}Z`;
          if (j % 2) light += d; else dark += d;
        }
      });
      return `<rect x="0" y="0" width="${TW}" height="${FLOOR_H}" fill="#5a3a20"/>` +
        `<path d="${light}" fill="#c08a52" stroke="#4a2c16" stroke-width="2.5"/>` +
        `<path d="${dark}" fill="#a06c3c" stroke="#4a2c16" stroke-width="2.5"/>` +
        sh.stroke(rows.map(([y]) => `M0 ${y + 2.5}H${TW}`).join(''), '#e0b07a', 1.5, 0.45) + floorFinish();
    }
    case 6: {
      // Dark slate slabs with a glowing rune inlay running along the hall.
      let inlay = `M0 120H${TW}M0 150H${TW}`;
      for (let x = 50, k = 0; x < TW; x += 100, k++) inlay += rune(k, x, 135, 9);
      return `<rect x="0" y="0" width="${TW}" height="${FLOOR_H}" fill="#1d222a"/>` +
        blocks(666, floorRows(26, 1.22), '#3b4350', '#1d222a', { avg: 130, rad: 4, vary: 0.12, mw: 3.5 }) +
        glowLines(inlay, 2.2) + floorFinish();
    }
    default: {
      // Checkerboard of cream and burgundy marble with gold seams.
      const rows = floorRows(20, 1.2);
      let a = '';
      let b = '';
      rows.forEach(([y, h], i) => {
        for (let x = 0, j = 0; x < TW; x += 50, j++) {
          const d = `M${x} ${y}H${x + 50}V${sh.r1(y + h)}H${x}Z`;
          if ((i + j) % 2) a += d; else b += d;
        }
      });
      let seams = '';
      for (const [y] of rows) seams += `M0 ${y}H${TW}`;
      for (let x = 0; x <= TW; x += 50) seams += `M${x} 0V${FLOOR_H}`;
      return sh.paint(a, MARBLE) + sh.paint(b, BURGUNDY) +
        sh.stroke(rows.map(([y]) => `M0 ${y + 4}H${TW}`).join(''), '#fff8e8', 2, 0.35) +
        sh.stroke(seams, GOLDD, 3.6) + sh.stroke(seams, MUSTL, 1.6, 0.9) + floorFinish();
    }
  }
}

// ---------------------------------------------------------------- ceilings (400 x 72)

function ceiling(t: Tier): string {
  const band = (fill: string, lines: string, lineCol: string) =>
    `<rect x="0" y="0" width="${TW}" height="${CEIL_H}" fill="${fill}"/>` + sh.stroke(lines, lineCol, 2, 0.6);
  const ends = (fill: string, rivet: boolean, round = false) => [50, 250].map((x) =>
    (round
      ? sh.lit(fxCirc(x + 22, 48, 20), fill, { outline: 3.5, shadow: 4, light: 2 }) + `<circle cx="${x + 22}" cy="48" r="10" fill="none" stroke="${sh.tone(fill, -0.3)}" stroke-width="2"/>`
      : sh.lit(fxRect(x, 30, 44, 40, 5), fill, { outline: 3.5, shadow: 4, light: 2 })) + (rivet ? fxRivet(x + 22, 50, 3) : '')).join('');
  switch (t) {
    case 1:
      return band('#5a3d22', `M0 10H${TW}M0 20H${TW}M120 0V26M330 0V26`, '#3b2614') + `<path d="M0 26H${TW}" stroke="${INK}" stroke-width="3"/>` + ends(WOOD, false, true) + ceilFinish();
    case 2:
      return band(WOODD, `M0 12H${TW}M0 24H${TW}`, '#4a2e18') + `<path d="M0 30H${TW}" stroke="${INK}" stroke-width="3"/>` + ends(WOOD, true) +
        [50, 250].map((x) => sh.lit(fxRect(x - 4, 40, 52, 10, 2), IRON, { outline: 3, shadow: 2, light: 1, lightColor: IRONL })).join('') + ceilFinish();
    case 3:
      return band(WOODD, `M0 14H${TW}M0 26H${TW}`, sh.tone(WOODD, -0.2)) + ends(WOOD, true) + ceilFinish();
    case 4: {
      let flags = '';
      for (let x = 0, i = 0; x < TW; x += 40, i++) flags += sh.lit(`M${x + 4} 52L${x + 36} 52L${x + 20} 70Z`, i % 2 ? MUST : RED, { outline: 2.5, shadow: 2, light: 1 });
      return band('#5c3a22', `M0 14H${TW}M0 26H${TW}`, '#3b2412') + ends('#8c5c34', true) +
        sh.stroke(`M0 50Q100 58 200 50T400 50`, INK, 3) + flags + ceilFinish();
    }
    case 5: {
      const cof = [0, 100, 200, 300].map((x) => sh.lit(fxRect(x + 10, 10, 80, 44, 4), '#5a3520', { outline: 3, shadow: 5, light: 2 }) +
        sh.paint(fxCirc(x + 50, 32, 7), GOLD) + `<circle cx="${x + 50}" cy="32" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>`).join('');
      return band('#3e2414', '', '#000') + cof + `<path d="M-10 58H${TW + 10}V70H-10Z" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>` + sh.stroke(`M0 61H${TW}`, MUSTL, 2) + ceilFinish();
    }
    case 6: {
      let runes = '';
      for (let x = 50, k = 1; x < TW; x += 100, k++) runes += rune(k, x, 40, 9);
      return band('#2a313c', `M0 12H${TW}M0 24H${TW}`, '#1a1f27') +
        blocks(616, [[0, 30]], '#3a4352', '#1a1f27', { avg: 100, rad: 3, mw: 3, edge: false }) +
        `<path d="M-10 28H${TW + 10}V70H-10Z" fill="#323a47" stroke="${INK}" stroke-width="3.5"/>` + glowLines(runes, 2) +
        sh.stroke(`M0 62H${TW}`, GLOW, 2, 0.6) + ceilFinish();
    }
    default: {
      const cof = [0, 100, 200, 300].map((x) => sh.lit(fxRect(x + 12, 8, 76, 40, 6), '#f6efe0', { outline: 3, shadow: 5, light: 2, shadowColor: '#cfc2a8' }) +
        `<path d="M${x + 50} 18l7 10l-7 10l-7 -10Z" fill="${GOLD}" stroke="${INK}" stroke-width="2.5"/>`).join('');
      return band('#e3d8c2', '', '#000') + sh.stroke('M0 4H400', GOLD, 4) + cof +
        `<path d="M-10 52H${TW + 10}V70H-10Z" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>` + sh.stroke(`M0 56H${TW}`, MUSTL, 2.5) +
        sh.stroke(Array.from({ length: 20 }, (_, i) => `M${i * 20 + 10} 60v8`).join(''), GOLDD, 3) + ceilFinish();
    }
  }
}

// ---------------------------------------------------------------- windows (200 x 260, centred)

/** Sky, far ridges, snowy peaks and a strip of alpine meadow, clipped to the opening. */
function view(open: string, x0: number, x1: number, top: number, bottom: number): string {
  const w = x1 - x0;
  const h = bottom - top;
  const X = (f: number) => sh.r1(x0 + w * f);
  const Y = (f: number) => sh.r1(top + h * f);
  const sky = sh.linear([[0, '#7fb6dc'], [1, '#e2f1f4']], 90);
  const far = `M${x0} ${Y(0.52)}L${X(0.15)} ${Y(0.4)}L${X(0.38)} ${Y(0.52)}L${X(0.6)} ${Y(0.36)}L${X(0.85)} ${Y(0.46)}L${x1} ${Y(0.42)}V${bottom}H${x0}Z`;
  const peaks = `M${x0} ${Y(0.66)}L${X(0.3)} ${Y(0.42)}L${X(0.46)} ${Y(0.56)}L${X(0.7)} ${Y(0.34)}L${x1} ${Y(0.6)}V${bottom}H${x0}Z`;
  const snow = `M${X(0.3)} ${Y(0.42)}L${X(0.2)} ${Y(0.51)}L${X(0.27)} ${Y(0.49)}L${X(0.33)} ${Y(0.52)}L${X(0.39)} ${Y(0.48)}Z` +
    `M${X(0.7)} ${Y(0.34)}L${X(0.58)} ${Y(0.45)}L${X(0.66)} ${Y(0.43)}L${X(0.73)} ${Y(0.46)}L${X(0.81)} ${Y(0.41)}Z`;
  return `<defs>${sky.def}</defs><path d="${open}" fill="${sky.url}"/>` +
    sh.within(open, sh.paint(far, '#aebfd2') + sh.paint(peaks, '#7d8fa8') + sh.paint(snow, '#f6fbff') +
      sh.paint(`M${x0} ${Y(0.86)}Q${X(0.5)} ${Y(0.78)} ${x1} ${Y(0.84)}V${bottom}H${x0}Z`, '#6f9a5c'));
}

/** An arched opening path. */
const archPath = (x0: number, x1: number, top: number, bottom: number) => {
  const rr = (x1 - x0) / 2;
  return `M${x0} ${bottom}V${top + rr}A${rr} ${rr} 0 0 1 ${x1} ${top + rr}V${bottom}Z`;
};
/** A pointed (lancet) opening path. */
const lancetPath = (x0: number, x1: number, top: number, bottom: number) => {
  const w = x1 - x0;
  return `M${x0} ${bottom}V${top + w}Q${x0} ${top + w * 0.3} ${(x0 + x1) / 2} ${top}Q${x1} ${top + w * 0.3} ${x1} ${top + w}V${bottom}Z`;
};

function windowArt(t: Tier): string {
  switch (t) {
    case 1: {
      const O = 'M60 90H140V170H60Z';
      const shutter = (x: number, dir: number) => {
        const d = `M${x} 86H${x + 38 * dir}V174H${x}Z`;
        return sh.lit(d, '#8a5e34', { outline: 3.5, shadow: 3, light: 1.5 }) +
          sh.stroke(`M${x + 13 * dir} 88V172M${x + 26 * dir} 88V172`, WOODD, 2) + sh.stroke(`M${x + 2 * dir} 100H${x + 36 * dir}M${x + 2 * dir} 160H${x + 36 * dir}`, '#5a3a1e', 4);
      };
      return shutter(52, -1) + shutter(148, 1) +
        sh.lit('M48 80H152V180H48ZM60 90V170H140V90Z', WOOD, { outline: 3.5, shadow: 3, light: 2 }) +
        view(O, 60, 140, 90, 170) + l(`M100 90V170`, 7, INK) + hl('M100 90V170', WOODD, 4) +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="3.5"/>` +
        sh.lit(fxRect(42, 176, 116, 14, 3), WOODD, { outline: 3.5, shadow: 2, light: 1.5 });
    }
    case 2: {
      const O = 'M52 70H148V190H52Z';
      let bars = '';
      for (const x of [76, 100, 124]) bars += `M${x} 70V190`;
      bars += 'M52 110H148M52 150H148';
      return sh.lit('M38 56H162V204H38ZM52 70V190H148V70Z', WOODD, { outline: 4, shadow: 4, light: 2 }) +
        view(O, 52, 148, 70, 190) + l(bars, 9, INK) + hl(bars, IRON, 5) + hl('M75 70V190M99 70V190M123 70V190', IRONL, 1.6, 0.8) +
        [[76, 110], [100, 110], [124, 110], [76, 150], [100, 150], [124, 150]].map(([x, y]) => fxRivet(x, y, 3)).join('') +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        sh.lit(fxRect(32, 200, 136, 14, 3), WOODD, { outline: 3.5, shadow: 2, light: 1.5 });
    }
    case 3:
    case 4: {
      const O = archPath(50, 150, 30, 220);
      const FRAME = archPath(34, 166, 14, 232);
      let curtains = '';
      if (t === 4) {
        const cur = (x: number, dir: number) => {
          const d = `M${x} 20H${x + 34 * dir}Q${x + 22 * dir} 110 ${x + 40 * dir} 226H${x - 8 * dir}Q${x + 2 * dir} 120 ${x} 20Z`;
          return sh.lit(d, RED, { outline: 3.5, shadow: 6, light: 2, lightColor: REDL }) +
            sh.stroke(`M${x + 12 * dir} 26Q${x + 8 * dir} 120 ${x + 6 * dir} 220M${x + 24 * dir} 26Q${x + 18 * dir} 120 ${x + 22 * dir} 222`, '#7c1a20', 2.4, 0.7) +
            sh.lit(fxRect(x + (dir > 0 ? 4 : -36), 136, 32, 10, 4), MUST, { outline: 3, shadow: 2, light: 1 });
        };
        curtains = cur(40, -1) + cur(160, 1) +
          sh.litTube('M10 20H190', 8, WOODD) + `<circle cx="10" cy="20" r="7" fill="${GOLD}" stroke="${INK}" stroke-width="3"/><circle cx="190" cy="20" r="7" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>`;
      }
      return sh.lit(FRAME, t === 3 ? STONEL : '#d8b88c', { outline: 4, shadow: 6, light: 3 }) +
        view(O, 50, 150, 30, 220) +
        l('M100 30V220M50 140H150', 7, INK) + hl('M100 30V220M50 140H150', WOODD, 4) +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        sh.lit(fxRect(26, 222, 148, 18, 5), t === 3 ? STONE : '#b8936a', { outline: 3.5, shadow: 3, light: 1.5 }) + curtains;
    }
    case 5: {
      const O = archPath(48, 152, 26, 222);
      const FRAME = archPath(34, 166, 12, 234);
      let lead = '';
      for (let k = -200; k < 260; k += 26) lead += `M${48 + k} 222L${48 + k + 200} 22M${48 + k} 22L${48 + k + 200} 222`;
      return sh.lit(FRAME, GOLD, { outline: 4, shadow: 5, light: 2.5, lightColor: MUSTL }) +
        sh.stroke(archPath(41, 159, 19, 228), GOLDD, 2, 0.8) +
        view(O, 48, 152, 26, 222) +
        sh.within(O, sh.paint(O, '#fff6d8', 0.12) + sh.stroke(lead, '#3a3328', 2.2, 0.85)) +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        sh.lit(fxRect(24, 226, 152, 16, 4), GOLD, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
        sh.glint(60, 60, 2.5);
    }
    case 6: {
      const O = lancetPath(72, 128, 20, 236);
      const FRAME = lancetPath(54, 146, 2, 248);
      let runes = '';
      for (let y = 100, k = 0; y < 236; y += 44, k++) runes += rune(k, 63, y, 8) + rune(k + 2, 137, y, 8);
      return sh.lit(FRAME, '#4a5566', { outline: 4, shadow: 6, light: 2.5 }) +
        view(O, 72, 128, 20, 236) + l('M100 20V236', 6, INK) + hl('M100 20V236', IRON, 3) +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        glowLines(runes, 2) + glowLines(lancetPath(66, 134, 12, 240).replace(/Z$/, ''), 1.6) +
        sh.lit(fxRect(46, 244, 108, 12, 3), '#3b4350', { outline: 3.5, shadow: 2, light: 1 });
    }
    default: {
      // Grand window: clear view below, stained glass with peaks and a cheese wedge in the arch.
      const O = archPath(26, 174, 14, 234);
      const FRAME = archPath(12, 188, 2, 248);
      const ARCH = `M26 104A74 74 0 0 1 174 104Z`;
      const glass =
        sh.paint(ARCH, '#3d5fa8') +
        sh.paint('M26 104L64 64L88 84L112 48L150 92L174 80V104Z', '#7f8fb8') +
        sh.paint('M112 48L100 62L108 60L116 66L124 58Z', '#f6fbff') +
        sh.paint('M26 104Q100 86 174 104Z', '#4f8a4a') +
        `<path d="M82 52H118V40L82 32Z" fill="${CHEESE}"/>` + sh.paint(fxCirc(94, 44, 3) + fxCirc(108, 46, 2.4), '#c9962a');
      return sh.lit(FRAME, GOLD, { outline: 4, shadow: 5, light: 2.5, lightColor: MUSTL }) +
        view(O, 26, 174, 14, 234) +
        sh.within(ARCH, glass + sh.stroke('M100 30V104M60 104L76 50M140 104L124 50M26 104L64 64M174 80L150 92', '#2a2a2a', 3)) +
        l('M26 104H174M100 104V234M26 170H174', 8, INK) + hl('M26 104H174M100 104V234M26 170H174', GOLD, 4.5) +
        `<path d="${O}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        sh.lit(fxRect(4, 236, 192, 18, 5), MARBLE, { outline: 3.5, shadow: 3, light: 1.5 }) +
        sh.stroke('M8 240H192', GOLD, 3) + sh.glint(40, 120, 2.6);
    }
  }
}

// ---------------------------------------------------------------- doors (220 x 250, pivot bottom centre)

const FL = 250;

/** Plank leaf of an arched door, with vertical plank lines. */
function leaf(x0: number, x1: number, top: number, fill: string, lines: string, extras: string): string {
  const LEAF = archPath(x0, x1, top, FL);
  let planks = '';
  for (let x = x0 + 26; x < x1 - 4; x += 26) planks += `M${x} ${top}V${FL}`;
  return sh.lit(LEAF, fill, { outline: 4, shadow: 9, light: 3 }) +
    sh.within(LEAF, sh.stroke(planks, lines, 3, 0.8) + extras) +
    `<path d="${LEAF}" fill="none" stroke="${INK}" stroke-width="4"/>`;
}

function doorArt(t: Tier): string {
  const cx = 110;
  const band = (x0: number, w: number, y: number, col: string, lc: string, rivets = true) =>
    sh.lit(fxRect(x0, y, w, 13, 3), col, { outline: 3, shadow: 2, light: 1.2, lightColor: lc }) +
    (rivets ? [x0 + 12, x0 + w / 2, x0 + w - 12].map((x) => fxRivet(sh.r1(x), y + 6.5, 2.4)).join('') : '');
  const ring = (x: number, y: number, col: string) =>
    `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="4"/>`;
  switch (t) {
    case 1: {
      const LEAF = `M${cx - 58} ${FL}V78Q${cx - 58} 66 ${cx - 46} 66H${cx + 46}Q${cx + 58} 66 ${cx + 58} 78V${FL}Z`;
      let planks = '';
      for (let x = cx - 58 + 29; x < cx + 58; x += 29) planks += `M${x} 60V${FL}`;
      return sh.lit(`M${cx - 78} ${FL}V48H${cx + 78}V${FL}H${cx + 62}V64H${cx - 62}V${FL}Z`, '#7a5430', { outline: 4, shadow: 5, light: 2.5 }) +
        sh.lit(LEAF, '#a27446', { outline: 4, shadow: 8, light: 3 }) +
        sh.within(LEAF, sh.stroke(planks, WOODD, 3, 0.85) +
          sh.lit(`M${cx - 56} 96H${cx + 56}V112H${cx - 56}Z`, '#8a5e34', { outline: 3, shadow: 2, light: 1 }) +
          sh.lit(`M${cx - 56} 206H${cx + 56}V222H${cx - 56}Z`, '#8a5e34', { outline: 3, shadow: 2, light: 1 }) +
          sh.lit(`M${cx - 52} 206L${cx + 40} 112H${cx + 56}L${cx - 36} 206Z`, '#8a5e34', { outline: 3, shadow: 2, light: 1 })) +
        `<path d="${LEAF}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        `<path d="M${cx + 30} 150c-14 4 -14 28 0 30c12 -2 12 -26 0 -30Z" fill="none" stroke="${INK}" stroke-width="7"/>` +
        `<path d="M${cx + 30} 150c-14 4 -14 28 0 30c12 -2 12 -26 0 -30Z" fill="none" stroke="#d9b77a" stroke-width="3.5" stroke-dasharray="5 3"/>`;
    }
    case 2:
      return sh.lit(archPath(cx - 82, cx + 82, 26, FL) + `M${cx - 62} ${FL}V${108}A62 62 0 0 0 ${cx + 62} 108V${FL}Z`, WOODD, { outline: 4, shadow: 6, light: 2.5 }) +
        leaf(cx - 62, cx + 62, 46, '#8e6440', '#5a3a1e', band(cx - 60, 120, 110, IRON, IRONL) + band(cx - 60, 120, 196, IRON, IRONL)) +
        sh.lit(fxRect(cx - 66, 104, 16, 26, 3) + fxRect(cx - 66, 190, 16, 26, 3), IRON, { outline: 3, shadow: 2, light: 1 }) +
        ring(cx + 34, 160, IRONL);
    case 3:
    case 4:
    case 5: {
      const stone = t === 3 ? STONED : t === 4 ? '#a8825a' : '#d2a862';
      const metal = t === 5 ? GOLD : IRON;
      const metalL = t === 5 ? MUSTL : IRONL;
      const ARCH = archPath(cx - 92, cx + 92, 12, FL);
      let vous = '';
      for (let a = 0; a <= 6; a++) {
        const ang = Math.PI + (a / 6) * Math.PI;
        vous += `M${sh.r1(cx + Math.cos(ang) * 70)} ${sh.r1(100 + Math.sin(ang) * 70)}L${sh.r1(cx + Math.cos(ang) * 92)} ${sh.r1(100 + Math.sin(ang) * 92)}`;
      }
      vous += `M${cx - 92} 160H${cx - 70}M${cx + 70} 160H${cx + 92}M${cx - 92} 210H${cx - 70}M${cx + 70} 210H${cx + 92}`;
      const trim = t === 4 ? sh.stroke(`M${cx - 76} ${FL}V100A76 76 0 0 1 ${cx + 76} 100V${FL}`, RED, 8) + sh.stroke(`M${cx - 80} ${FL}V100A80 80 0 0 1 ${cx + 80} 100V${FL}`, MUST, 2) : '';
      const key = t === 5 ? sh.lit(`M${cx - 14} 8H${cx + 14}L${cx + 10} 34H${cx - 10}Z`, GOLD, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) : '';
      const hinge = (y: number) => sh.lit(`M${cx - 70} ${y}H${cx - 10}L${cx - 2} ${y + 6}L${cx - 10} ${y + 12}H${cx - 70}Z`, metal, { outline: 3, shadow: 2, light: 1, lightColor: metalL });
      return sh.lit(ARCH, stone, { outline: 4, shadow: 8, light: 3 }) + sh.stroke(vous, sh.tone(stone, -0.35), 3, 0.8) + trim + key +
        leaf(cx - 70, cx + 70, 30, t === 5 ? '#7a4a2a' : WOOD, WOODD, t === 5 ? hinge(110) + hinge(196) : band(cx - 68, 136, 112, metal, metalL) + band(cx - 68, 136, 196, metal, metalL)) +
        ring(cx + 40, 164, t === 5 ? MUSTL : IRONL) + (t === 5 ? sh.glint(cx + 34, 156, 2) : '');
    }
    case 6: {
      const ARCH = archPath(cx - 94, cx + 94, 10, FL);
      const LEAF = archPath(cx - 70, cx + 70, 32, FL);
      let rivets = '';
      for (const y of [120, 170, 220]) for (let x = cx - 56; x <= cx + 56; x += 28) rivets += fxRivet(x, y, 3);
      let runes = '';
      for (let y = 130, k = 0; y < 240; y += 40, k++) runes += rune(k, cx - 82, y, 8) + rune(k + 1, cx + 82, y, 8);
      for (let a = 1; a <= 5; a++) {
        const ang = Math.PI + (a / 6) * Math.PI;
        runes += rune(a, sh.r1(cx + Math.cos(ang) * 82), sh.r1(102 + Math.sin(ang) * 82), 7);
      }
      return sh.lit(ARCH, '#3d4654', { outline: 4, shadow: 8, light: 3 }) + glowLines(runes, 2) +
        sh.lit(LEAF, '#3a3f47', { outline: 4, shadow: 9, light: 3, lightColor: '#646b75' }) +
        sh.within(LEAF, sh.stroke(`M${cx} 30V${FL}M${cx - 70} 145H${cx + 70}M${cx - 70} 195H${cx + 70}`, '#23272d', 4) + rivets) +
        `<path d="${LEAF}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        glowLines(`M${cx} 40V${FL - 4}`, 1.6) + ring(cx + 34, 170, IRONL);
    }
    default: {
      const ARCH = archPath(cx - 96, cx + 96, 6, FL);
      const LEAF = archPath(cx - 72, cx + 72, 28, FL);
      const g = sh.linear([[0, MUSTL], [0.45, GOLD], [1, GOLDD]], 0);
      const panel = (x: number) => sh.lit(fxRect(x, 120, 44, 50, 4) + fxRect(x, 186, 44, 50, 4), '#d9a23e', { outline: 3, shadow: 3, light: 1.5, lightColor: MUSTL, shadowColor: GOLDD });
      return sh.lit(ARCH, MARBLE, { outline: 4, shadow: 7, light: 3, shadowColor: '#cfc2a8' }) +
        sh.stroke(`M${cx - 84} ${FL}V100A84 84 0 0 1 ${cx + 84} 100V${FL}`, GOLD, 6) +
        `<defs>${g.def}</defs><path d="${LEAF}" fill="${g.url}" stroke="none"/>` +
        sh.within(LEAF, panel(cx - 60) + panel(cx + 16) + sh.stroke(`M${cx} 28V${FL}`, INK, 4) +
          sh.paint(`M${cx - 38} 62L${cx - 22} 46L${cx - 8} 60L${cx + 8} 40L${cx + 30} 62Z`, GOLDD, 0.7)) +
        `<path d="${LEAF}" fill="none" stroke="${INK}" stroke-width="4"/>` +
        sh.lit(fxRect(cx - 14, 150, 8, 34, 3) + fxRect(cx + 6, 150, 8, 34, 3), MUSTL, { outline: 3, shadow: 2, light: 1 }) +
        sh.lit(`M${cx - 14} 2H${cx + 14}L${cx + 10} 28H${cx - 10}Z`, GOLD, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }) +
        sh.glint(cx - 50, 70, 2.6) + sh.glint(cx + 30, 110, 2);
    }
  }
}

// ---------------------------------------------------------------- cauldrons (320 x 230, pivot bottom centre)

const CX = 160;
const CB = 230;

/** A three-tongued flame standing on (cx, by). */
function flame(cx: number, by: number, w: number, h: number): string {
  const X = (f: number) => sh.r1(cx + w * f);
  const Y = (f: number) => sh.r1(by - h * f);
  return `M${X(-0.5)} ${by}Q${X(-0.5)} ${Y(0.45)} ${X(-0.3)} ${Y(0.72)}Q${X(-0.24)} ${Y(0.45)} ${X(-0.1)} ${Y(0.55)}` +
    `Q${X(-0.06)} ${Y(0.85)} ${X(0.02)} ${Y(1)}Q${X(0.14)} ${Y(0.6)} ${X(0.22)} ${Y(0.5)}Q${X(0.3)} ${Y(0.6)} ${X(0.33)} ${Y(0.8)}Q${X(0.5)} ${Y(0.4)} ${X(0.5)} ${by}Z`;
}

function fire(cx: number, by: number, w: number, h: number, blue = false): string {
  const outer = blue ? '#3f8fd0' : '#f08a2c';
  const inner = blue ? '#bff3ff' : '#ffe08a';
  return `<path d="${flame(cx, by, w, h)}" fill="${outer}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    sh.paint(flame(cx, by, w * 0.6, h * 0.6), inner) +
    sh.paint(fxEll(cx - w * 0.3, by - 4, 5, 3) + fxEll(cx + w * 0.25, by - 3, 4, 2.5), blue ? '#e0fbff' : '#ffb347');
}

/** Two crossed logs on the floor. */
const logs = (cx: number, by: number, w: number) =>
  sh.litTube(`M${cx - w / 2} ${by - 4}L${cx + w / 2} ${by - 14}`, 13, WOOD) + sh.litTube(`M${cx - w / 2} ${by - 14}L${cx + w / 2} ${by - 4}`, 13, WOODD);

/** Pot body, rim and the melted cheese surface. `rim` draws the rim in its own colour. */
function pot(cx: number, rimY: number, rx: number, depth: number, body: [string, string, string], rimCol: string, rimL: string, extra = ''): string {
  const ry = rx * 0.26;
  const B = `M${cx - rx} ${rimY}C${cx - rx} ${sh.r1(rimY + depth * 0.95)} ${sh.r1(cx - rx * 0.55)} ${rimY + depth} ${cx} ${rimY + depth}` +
    `C${sh.r1(cx + rx * 0.55)} ${rimY + depth} ${cx + rx} ${sh.r1(rimY + depth * 0.95)} ${cx + rx} ${rimY}Z`;
  const g = sh.linear([[0, body[0]], [0.35, body[1]], [1, body[2]]], 0);
  return `<defs>${g.def}</defs><path d="${B}" fill="${g.url}" stroke="none"/>` +
    sh.within(B, sh.paint(`M${cx - rx} ${rimY}H${cx + rx}V${rimY + depth * 0.22}H${cx - rx}Z`, '#1a1210', 0.22) + extra +
      sh.stroke(`M${sh.r1(cx - rx * 0.7)} ${sh.r1(rimY + depth * 0.3)}Q${sh.r1(cx - rx * 0.66)} ${sh.r1(rimY + depth * 0.7)} ${sh.r1(cx - rx * 0.4)} ${sh.r1(rimY + depth * 0.86)}`, '#fff8e0', 4, 0.35)) +
    `<path d="${B}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
    sh.lit(fxEll(cx, rimY, rx + 8, ry + 5) + `M${cx - rx + 6} ${rimY}a${rx - 6} ${ry - 3} 0 1 0 ${2 * (rx - 6)} 0a${rx - 6} ${ry - 3} 0 1 0 ${-2 * (rx - 6)} 0Z`, rimCol, { outline: 3.5, shadow: 3, light: 2, lightColor: rimL }) +
    sh.lit(fxEll(cx, rimY + 1, rx - 6, ry - 3), CHEESE, { outline: 0, shadow: 0, light: 0 }) +
    sh.paint(fxEll(cx - rx * 0.2, rimY - ry * 0.15, rx * 0.45, ry * 0.35), CHEESEL, 0.9) +
    `<path d="${fxCirc(cx + rx * 0.35, rimY, 5) + fxCirc(cx - rx * 0.45, rimY + 3, 3.5) + fxCirc(cx + rx * 0.05, rimY + ry * 0.4, 3)}" fill="${CHEESEL}" stroke="#c9962a" stroke-width="1.6"/>` +
    `<path d="M${cx - rx + 6} ${rimY}a${rx - 6} ${ry - 3} 0 1 0 ${2 * (rx - 6)} 0a${rx - 6} ${ry - 3} 0 1 0 ${-2 * (rx - 6)} 0Z" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
}

const ringHandle = (x: number, y: number, col: string) =>
  `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${col}" stroke-width="4.5"/>`;

/** A hearth block with an arched fire opening. */
function hearth(w: number, top: number, col: string, blue = false, edge = ''): string {
  const x0 = CX - w / 2;
  const BOX = fxRect(x0, top, w, CB - top, 6);
  const OPEN = archPath(CX - 46, CX + 46, top + 12, CB);
  return sh.lit(BOX, col, { outline: 4, shadow: 6, light: 3 }) +
    sh.within(BOX, sh.stroke(`M${x0} ${top + (CB - top) / 2}H${x0 + w}M${x0 + w * 0.2} ${top}V${top + (CB - top) / 2}M${x0 + w * 0.8} ${top}V${top + (CB - top) / 2}`, sh.tone(col, -0.35), 3, 0.7) + edge) +
    `<path d="${OPEN}" fill="#1a1210" stroke="${INK}" stroke-width="3.5"/>` +
    sh.within(OPEN, fire(CX, CB - 6, 70, 46, blue) + (blue ? '' : logs(CX, CB, 70)));
}

function cauldronArt(t: Tier): string {
  const IRONB: [string, string, string] = ['#6d737b', '#3b3f45', '#1f2226'];
  switch (t) {
    case 1: {
      const stone = (x: number, y: number, rx: number, ry: number) => sh.lit(fxEll(x, y, rx, ry), STONE, { outline: 3.5, shadow: 4, light: 2 });
      return stone(CX, 196, 30, 18) + fire(CX, CB - 8, 90, 70) + logs(CX, CB, 110) +
        pot(CX, 96, 64, 72, IRONB, '#33363b', IRONL) +
        stone(CX - 66, 210, 30, 20) + stone(CX + 66, 210, 30, 20);
    }
    case 2: {
      const legs = `M${CX - 60} 150L${CX - 96} ${CB - 4}M${CX + 60} 150L${CX + 96} ${CB - 4}`;
      return sh.litTube(`M${CX} 168L${CX + 4} ${CB - 4}`, 9, IRON, { lightColor: IRONL }) +
        fire(CX, CB - 8, 100, 72) + logs(CX, CB, 120) +
        pot(CX, 74, 76, 86, IRONB, '#3b3f45', IRONL) +
        ringHandle(CX - 86, 96, IRONL) + ringHandle(CX + 86, 96, IRONL) +
        sh.litTube(legs, 10, IRON, { lightColor: IRONL }) +
        sh.litTube(`M${CX - 80} 196Q${CX} 186 ${CX + 80} 196`, 7, IRON, { lightColor: IRONL });
    }
    case 3:
      return hearth(270, 160, STONE) + pot(CX, 64, 94, 100, IRONB, '#3b3f45', IRONL) +
        ringHandle(CX - 104, 92, IRONL) + ringHandle(CX + 104, 92, IRONL);
    case 4: {
      const COPPER: [string, string, string] = ['#e8a070', '#b8673a', '#6e3418'];
      return hearth(270, 160, '#b8936a', false, sh.stroke(`M${CX - 135} 168H${CX + 135}`, RED, 6)) +
        pot(CX, 64, 94, 100, COPPER, '#c97a46', '#f2b583') +
        ringHandle(CX - 104, 92, '#d98a52') + ringHandle(CX + 104, 92, '#d98a52') + sh.glint(CX - 56, 100, 3);
    }
    case 5: {
      const COPPER: [string, string, string] = ['#ffc39a', '#c8743f', '#7a3a18'];
      const paw = (x: number, dir: number) => {
        const leg = `M${x - 12} 150Q${x - 6 * dir} 190 ${x - 10} 208H${x + 14}Q${x + 6} 190 ${x + 14} 150Z`;
        const foot = `M${x - 22} ${CB - 2}Q${x - 24} 208 ${x - 12} 206Q${x - 8} 198 ${x} 204Q${x + 8} 198 ${x + 14} 206Q${x + 26} 208 ${x + 24} ${CB - 2}Z`;
        return sh.lit(leg, GOLD, { outline: 3.5, shadow: 4, light: 2, lightColor: MUSTL }) +
          sh.lit(foot, GOLD, { outline: 3.5, shadow: 3, light: 2, lightColor: MUSTL }) +
          sh.stroke(`M${x - 6} ${CB - 2}v-12M${x + 7} ${CB - 2}v-12`, GOLDD, 2.4);
      };
      return fire(CX, CB - 6, 110, 74) + logs(CX, CB, 120) + paw(CX + 2, 1) +
        pot(CX, 60, 102, 100, COPPER, GOLD, MUSTL,
          sh.stroke(`M${CX - 102} 96Q${CX} 122 ${CX + 102} 96`, GOLD, 8) + sh.stroke(`M${CX - 102} 96Q${CX} 122 ${CX + 102} 96`, MUSTL, 2.5)) +
        paw(CX - 78, -1) + paw(CX + 78, 1) + ringHandle(CX - 112, 88, MUSTL) + ringHandle(CX + 112, 88, MUSTL) +
        sh.glint(CX - 60, 100, 3.4) + sh.glint(CX - 44, 124, 1.8);
    }
    case 6: {
      const DARK: [string, string, string] = ['#59626e', '#2f3640', '#15191e'];
      let runes = '';
      for (let i = 0; i < 5; i++) runes += rune(i, CX - 72 + i * 36, 112 + (i % 2) * 10, 10);
      return hearth(274, 162, '#3b4350', true, glowLines(`M${CX - 137} 172H${CX + 137}`, 1.6)) +
        pot(CX, 64, 98, 102, DARK, '#2a3038', '#5e6874', glowLines(runes, 2.4)) +
        ringHandle(CX - 108, 92, '#5e6874') + ringHandle(CX + 108, 92, '#5e6874');
    }
    default: {
      const GOLDB: [string, string, string] = [MUSTL, GOLD, GOLDD];
      let crown = '';
      for (let i = 0; i < 7; i++) {
        // Points stand on the back edge of the rim (rx 112, ry 32 around y 66), so they show above it.
        const x = CX - 96 + i * 32;
        const y = sh.r1(66 - 32 * Math.sqrt(1 - ((x - CX) / 112) ** 2) + 10);
        crown += sh.lit(`M${x - 11} ${y}L${x} ${y - 28}L${x + 11} ${y}Z`, GOLD, { outline: 3, shadow: 2.5, light: 1.5, lightColor: MUSTL }) +
          `<circle cx="${x}" cy="${y - 30}" r="5" fill="${i % 2 ? RED : MUSTL}" stroke="${INK}" stroke-width="2.5"/>`;
      }
      const PLINTH = fxRect(CX - 140, 166, 280, CB - 166, 6);
      const OPEN = archPath(CX - 44, CX + 44, 176, CB);
      return crown +
        sh.lit(PLINTH, MARBLE, { outline: 4, shadow: 6, light: 3, shadowColor: '#cfc2a8' }) +
        sh.stroke(`M${CX - 140} 176H${CX + 140}`, GOLD, 5) + sh.stroke(`M${CX - 110} 190q20 8 36 4M${CX + 70} 200q20 -6 34 2`, '#b8a99a', 1.6, 0.6) +
        `<path d="${OPEN}" fill="#1a1210" stroke="${INK}" stroke-width="3.5"/>` + sh.within(OPEN, fire(CX, CB - 6, 70, 46) + logs(CX, CB, 70)) +
        sh.stroke(archPath(CX - 50, CX + 50, 170, CB).replace(/Z$/, ''), GOLD, 4) +
        pot(CX, 66, 104, 100, GOLDB, GOLD, MUSTL, sh.stroke(`M${CX - 104} 104Q${CX} 130 ${CX + 104} 104`, GOLDD, 4) + cheeseMark(CX, 128, 0.8)) +
        ringHandle(CX - 114, 94, MUSTL) + ringHandle(CX + 114, 94, MUSTL) + sh.glint(CX - 64, 104, 3.6);
    }
  }
}

// ---------------------------------------------------------------- export

const TIERS: Tier[] = [1, 2, 3, 4, 5, 6, 7];

/** Every tier's hall shell: wall/floor/ceiling tiles (400 wide, seamless) plus window, door and cauldron. */
export const HALL_SHELL_ART: Record<string, Art> = Object.fromEntries(TIERS.flatMap((t) => [
  [`wall${t}`, art(TW, WALL_H, 0, 0, wall(t))],
  [`floor${t}`, art(TW, FLOOR_H, 0, 0, floor(t))],
  [`ceiling${t}`, art(TW, CEIL_H, 0, 0, ceiling(t))],
  [`window${t}`, centred(200, 260, windowArt(t))],
  [`door${t}`, art(220, 250, 110, 250, doorArt(t))],
  [`cauldron${t}`, art(320, 230, CX, CB, cauldronArt(t))],
]));
