/**
 * The wooden signboard that announces each day.
 * It hangs from the top of the screen with a pine cone on either side.
 */
import { INK, RUST, RUSTD, MUST, CREAM, FOREST, WOOD, WOODD, WOODL, WHITE, l, hl, art } from '../draw';
import * as sh from '../shade';
import { fxEll, fxRect, fxRivet } from './kit';

// ---------------------------------------------------------------------------------------------
// Signboard
// ---------------------------------------------------------------------------------------------

/** Carved ornament at each end of the signboard: pine sprigs around a cone with lit scales. */
function pineCone(x: number, y: number): string {
  const CONE = `M${x} ${y - 28}C${x + 22} ${y - 20} ${x + 22} ${y + 14} ${x} ${y + 30}C${x - 22} ${y + 14} ${x - 22} ${y - 20} ${x} ${y - 28}Z`;
  const needles = [
    `M${x - 34} ${y - 4}L${x - 14} ${y - 10}L${x - 18} ${y + 2}Z`,
    `M${x + 34} ${y - 4}L${x + 14} ${y - 10}L${x + 18} ${y + 2}Z`,
    `M${x - 30} ${y + 18}L${x - 12} ${y + 2}L${x - 12} ${y + 14}Z`,
    `M${x + 30} ${y + 18}L${x + 12} ${y + 2}L${x + 12} ${y + 14}Z`,
  ];
  const veins = `M${x - 31} ${y - 4}L${x - 17} ${y - 4.5}M${x + 31} ${y - 4}L${x + 17} ${y - 4.5}M${x - 27} ${y + 15}L${x - 13} ${y + 6}M${x + 27} ${y + 15}L${x + 13} ${y + 6}`;
  const scale = (dx: number, dy: number, lift = 0) => `M${x + dx - 8} ${y + dy - lift}q8 8 16 0`;
  const offsets: [number, number][] = [[0, -18], [-8, -7], [8, -7], [0, 3], [-7, 13], [7, 13]];
  return (
    needles.map((d) => sh.lit(d, FOREST, { outline: 3.5, shadow: 2.4, light: 1.2 })).join('') +
    sh.stroke(veins, '#7fa765', 1.2, 0.8) +
    sh.lit(CONE, RUSTD, { outline: 3.5, shadow: 4, light: 2 }) +
    sh.within(CONE, sh.stroke(offsets.map(([dx, dy]) => scale(dx, dy, 2.2)).join(''), RUST, 3, 0.9)) +
    l(offsets.map(([dx, dy]) => scale(dx, dy)).join(''), 2.5, INK)
  );
}

/** Day signboard hung on two ropes: grained planks, brass caps, a nailed parchment panel. */
export const banner = (() => {
  const BOARD = 'M18 38H622Q634 38 634 50L626 80L634 112Q634 124 622 124H18Q6 124 6 112L14 80L6 50Q6 38 18 38Z';
  const ROPES = 'M96 0L88 40M96 0L104 40M544 0L536 40M544 0L552 40';
  const rnd = sh.rng(31);
  let grain = '';
  for (let i = 0; i < 15; i++) {
    const y = sh.r1(43 + i * 5.6 + rnd() * 2);
    const w = sh.r1((rnd() - 0.5) * 4);
    grain += `M6 ${y}Q170 ${sh.r1(y + w)} 320 ${y}T634 ${y}`;
  }
  const knots = [[40, 60], [600, 104], [100, 106], [560, 58]]
    .map(([kx, ky]) => `<ellipse cx="${kx}" cy="${ky}" rx="5" ry="2.4" fill="${WOODD}" stroke="none"/>` + sh.stroke(fxEll(kx, ky, 8, 4), WOODD, 1.2, 0.6))
    .join('');
  const parchment = sh.linear([[0, '#f6ebd2'], [1, '#e2cfa3']], 90);
  const cap = (x: number) => sh.lit(fxRect(x, 32, 24, 12, 4), MUST, { outline: 3.5, shadow: 2.5, light: 1.2 }) + fxRivet(x + 6, 38, 1.8) + fxRivet(x + 18, 38, 1.8);
  return art(
    640,
    130,
    320,
    0,
    l(ROPES, 7, INK) +
      `<path d="${ROPES}" fill="none" stroke="#c9a46a" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="${ROPES}" fill="none" stroke="${WOODD}" stroke-width="3.4" stroke-dasharray="1.6 3" opacity=".7"/>` +
      `<defs>${parchment.def}</defs>` +
      sh.paint(BOARD, WOOD) +
      sh.within(BOARD, sh.stroke(grain, WOODD, 1.2, 0.35) + knots + sh.stroke('M6 81H634', WOODD, 2, 0.8) + sh.stroke('M6 83.5H634', WOODL, 1, 0.5)) +
      sh.crescent(BOARD, -4, -4.4, sh.tone(WOOD, -0.3)) +
      hl('M18 45H622', WOODL, 3) +
      `<path d="${BOARD}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
      sh.lit(fxRect(112, 50, 416, 64, 8), CREAM, { outline: 3.5, shadow: 2.5, light: 1.4 }) +
      `<path d="${fxRect(120, 56, 400, 52, 5)}" fill="${parchment.url}" stroke="${INK}" stroke-width="2.5"/>` +
      sh.stroke('M124 59.5H516', WHITE, 1.4, 0.6) +
      fxRivet(116, 54, 2) + fxRivet(524, 54, 2) + fxRivet(116, 110, 2) + fxRivet(524, 110, 2) +
      pineCone(60, 80) +
      pineCone(580, 80) +
      cap(84) +
      cap(532),
  );
})();
