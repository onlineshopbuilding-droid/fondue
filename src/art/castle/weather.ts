/**
 * Weather overlays drawn over the keep: snow per build stage (one per castle tier), canyon dust and marsh moss.
 * They are 300x660 with the same anchor as the keep.
 */
import { INK, p, n, hl } from '../draw';
import { LEAF, LEAFD, rand, fx, clip, linear, lump, spireD, moss } from './kit';

// ---------------------------------------------------------------------------------------------
// Weather overlays, drawn over the keep: 300x660, same anchor as the keep.
// ---------------------------------------------------------------------------------------------

const SNOW = '#f1f6fc';
const SNOWD = '#c9d6e8';
const SNOWLINE = '#1a2740';

/** A lumpy strip lying on top of a ledge. */
export function drift(x0: number, x1: number, y: number, seed: number, f = SNOW, line = SNOWLINE, rise = 8): string {
  const R = rand(seed);
  let d = `M${x0} ${y + 3}`;
  for (let x = x0; x < x1; ) {
    const nx = Math.min(x + 14 + R() * 16, x1);
    d += `Q${fx((x + nx) / 2)} ${fx(y - rise * (0.7 + R()))} ${fx(nx)} ${fx(y + 1 - R() * 2)}`;
    x = nx;
  }
  return `<path d="${d}V${y + 3}Z" fill="${f}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

export function icicles(x0: number, x1: number, y: number, seed: number): string {
  const R = rand(seed);
  let d = '';
  for (let x = x0; x < x1; x += 18 + R() * 26) d += `M${fx(x)} ${y}l3.5 ${fx(7 + R() * 9)}l3.5 ${fx(-7 - R() * 2)}Z`;
  return `<path d="${d}" fill="${SNOWD}" stroke="${SNOWLINE}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/** Snow over the upper part of a roof, with a scalloped lower edge. */
export function snowCap(d: string, x0: number, x1: number, y0: number, y1: number, seed: number): string {
  const R = rand(seed);
  let wave = `M${x0} ${y0}H${x1}V${y1}`;
  for (let x = x1; x > x0; ) {
    const nx = Math.max(x - 16 - R() * 14, x0);
    wave += `Q${fx((x + nx) / 2)} ${fx(y1 + (R() < 0.5 ? 12 : -6) + R() * 8)} ${fx(nx)} ${fx(y1 + R() * 6 - 3)}`;
    x = nx;
  }
  wave += 'Z';
  return clip(d, n(wave, SNOW) + hl(wave, SNOWD, 2.5)) + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
}

export function snowMerlons(x0: number, x1: number, y: number, w: number, gap: number, seed: number): string {
  let b = '';
  for (let x = x0, i = 0; x < x1; x += w + gap, i++) b += drift(x - 1, x + w + 1, y, seed + i, SNOW, SNOWLINE, 6);
  return b;
}

/** Ledges every tier shares: walkway and gate brow. */
const snowLedges = (seed: number) =>
  drift(-20, 256, 346, seed) + drift(128, 250, 452, seed + 1) + icicles(-6, 250, 359, seed + 2) + icicles(136, 246, 467, seed + 3);

export const SNOW_TIERS: string[] = [
  snowCap('M26 208Q50 182 82 150Q116 182 140 208Q134 214 126 210Q118 216 108 211Q98 216 88 211Q78 216 66 210Q56 216 46 211Q36 216 26 208Z', 20, 146, 148, 184, 501) +
    drift(40, 126, 252, 502) + drift(-20, 250, 296, 503, SNOW, SNOWLINE, 5) + snowLedges(504),
  snowCap('M24 158L84 120L144 158L137 166H31Z', 20, 150, 118, 146, 511) +
    [0, 1, 2, 3, 4, 5].map((k) => drift(-22 + k * 48, 26 + k * 48, 240 + (k % 2 ? 0 : 16) - 3, 512 + k)).join('') + snowLedges(520),
  snowCap('M-30 190Q14 156 64 112Q118 156 168 190Z', -30, 168, 110, 154, 521) +
    snowCap(spireD(220, 208, 42, 128), 176, 264, 126, 172, 522) +
    drift(-26, 160, 186, 523) + drift(184, 256, 206, 524) + drift(146, 196, 210, 525) + snowLedges(530),
  snowCap(spireD(217, 158, 46, 108), 168, 266, 106, 132, 532) +
    snowMerlons(42, 128, 98, 15, 9, 526) + snowMerlons(-20, 164, 128, 15, 10, 533) + snowMerlons(176, 256, 158, 12, 7, 540) + drift(154, 222, 190, 546) + snowLedges(551),
  snowCap(spireD(100, 142, 66, 110), 30, 170, 108, 126, 561) +
    snowCap(spireD(217, 148, 48, 108), 166, 268, 106, 126, 562) +
    snowCap(spireD(52, 124, 22, 108), 28, 76, 106, 115, 564) + snowCap(spireD(150, 124, 22, 108), 126, 174, 106, 115, 565) +
    snowMerlons(-20, 174, 124, 15, 9, 566) + snowMerlons(176, 258, 146, 13, 7, 570) + drift(164, 216, 184, 576) + snowLedges(581),
  ...[false, true].map((top) => {
    const k = top ? 10 : 0;
    return (
      snowCap(spireD(100, 142, 68, top ? 96 : 102), 28, 172, (top ? 94 : 100), (top ? 114 : 118), 591 + k) +
      snowCap(spireD(217, 148, 50, top ? 92 : 100), 164, 270, (top ? 90 : 98), (top ? 112 : 118), 592 + k) +
      snowCap(spireD(52, 124, 22, top ? 98 : 104), 28, 76, top ? 96 : 102, top ? 108 : 112, 594 + k) +
      snowCap(spireD(150, 124, 22, top ? 98 : 104), 126, 174, top ? 96 : 102, top ? 108 : 112, 595 + k) +
      snowMerlons(-20, 174, 121, 15, 9, 596 + k) + snowMerlons(176, 258, 143, 13, 7, 597 + k) + drift(164, top ? 194 : 216, 184, 598 + k) +
      (top ? drift(176, 260, 214, 599) : '') + snowLedges(611 + k)
    );
  }),
];

/** Sand blown against the wall foot and settled on the ledges. Tier-independent: only the shared lower wall. */
export function canyonWeather(): string {
  const R = rand(601);
  const SAND = '#d8a878';
  const grit = `M${[18, 44, 70, 96, 122, 236].map((x) => `${x} 356q-4 60 2 ${90 + (x % 7) * 8}`).join('M')}`;
  let piles = '';
  for (const [x, y, rx, ry] of [[-6, 624, 40, 18], [40, 632, 34, 12], [92, 634, 36, 11], [132, 632, 18, 9], [244, 632, 20, 8]]) piles += p(lump(x, y, rx, ry, R, 8), SAND);
  return (
    `<defs>${linear('d', 0, 1, [[0, SAND, 0], [1, SAND, 0.72]])}</defs>` +
    `<rect x="-20" y="510" width="160" height="134" fill="url(#d)" stroke="none"/>` +
    `<rect x="226" y="540" width="20" height="104" fill="url(#d)" stroke="none"/>` +
    hl(grit, SAND, 9, 0.28) +
    `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">${piles}</g>` +
    drift(-20, 256, 346, 602, SAND, '#8d4630', 5) +
    drift(128, 250, 452, 603, SAND, '#8d4630', 5)
  );
}

/** Damp stains, heavy moss and hanging weed. Tier-independent: only the shared lower wall. */
export function marshWeather(): string {
  const R = rand(701);
  let hanging = '';
  for (let x = -8; x < 250; x += 20 + R() * 24) {
    const h = 9 + R() * 16;
    hanging += `M${fx(x)} 358q${fx(2 + R() * 2)} ${fx(h)} 5 ${fx(h)}q3 0 5 ${fx(-h)}Z`;
  }
  return (
    `<defs>${linear('w', 0, 1, [[0, '#23403a', 0], [1, '#23403a', 0.62]])}</defs>` +
    `<rect x="-20" y="480" width="158" height="164" fill="url(#w)" stroke="none"/>` +
    `<rect x="226" y="520" width="16" height="124" fill="url(#w)" stroke="none"/>` +
    hl('M20 362V470M64 362V440M118 362V480M196 478V444M238 364V450', '#23403a', 7, 0.26) +
    moss(34, 552, 36, 12, 702) + moss(104, 530, 26, 10, 703) + moss(60, 486, 20, 8, 704) +
    moss(22, 430, 18, 7, 705) + moss(128, 410, 12, 6, 706) + moss(236, 560, 9, 14, 707) +
    `<path d="${hanging}" fill="${LEAFD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    drift(-20, 256, 346, 708, LEAF, INK, 4) +
    drift(128, 250, 452, 709, LEAF, INK, 4)
  );
}
