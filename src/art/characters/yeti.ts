import type { CharacterRig } from '../types';
import { PAL, dot, ellipse, flat, fur, line, part, shape, union } from './kit';

const OUT = 4;

const yetiLeg = (wool: string): string =>
  shape('M-31 42 Q-33 29 -16 26 L18 26 L18 42 Z', PAL.slate) +
  line('M-24 41 L-24 35', 2) +
  line('M-15 41 L-15 34', 2) +
  shape(fur(0, 10, 24, 24, 13, 0.16, 2.5), wool);

/** An arm hanging from the shoulder: furry upper arm, huge forearm, slate fist. */
const yetiArm = (wool: string, lean: number): string =>
  shape(`M${lean - 20} 90 Q${lean - 25} 114 ${lean} 116 Q${lean + 25} 114 ${lean + 20} 90 Z`, PAL.slate) +
  line(`M${lean - 11} 113 L${lean - 11} 105`, 2.4) +
  line(`M${lean} 115 L${lean} 106`, 2.4) +
  line(`M${lean + 11} 113 L${lean + 11} 105`, 2.4) +
  union([fur(lean * 0.3, 24, 21, 34, 12, 0.15, 2), fur(lean, 64, 24, 34, 14, 0.14, 3)], wool, OUT);

const ticks = (pairs: ReadonlyArray<readonly [number, number]>, color: string): string =>
  pairs.map(([x, y]) => line(`M${x - 5} ${y - 4} L${x} ${y + 2} L${x + 5} ${y - 4}`, 2.4, color)).join('');

/** Yeti: an enormous shaggy brute with tiny horns and a tiny furious face. */
export const yetiRig: CharacterRig = {
  parts: [
    part(
      'armBack',
      33,
      -140,
      'armBack',
      [-34, -28, 40, 120],
      yetiArm(PAL.iceD, 3) + ticks([[0, 58], [12, 74], [-8, 80]], PAL.slate),
      OUT,
    ),
    part('legBack', 20, -44, 'legBack', [-35, -22, 32, 46], yetiLeg(PAL.iceD), OUT),
    part('legFront', -16, -44, 'legFront', [-35, -22, 32, 46], yetiLeg(PAL.snow), OUT),
    part(
      'body',
      4,
      -100,
      'body',
      [-62, -80, 66, 70],
      union([fur(0, 22, 36, 34, 16, 0.13, 3), fur(6, -26, 48, 32, 16, 0.14, 1)], PAL.snow, OUT) +
        flat(fur(-12, 24, 20, 25, 12, 0.12, 2), PAL.ice) +
        ticks([[-20, 10], [-6, 20], [-18, 36], [-2, 42], [24, -10], [26, 26], [32, -36], [6, -42]], PAL.iceD),
      OUT,
    ),
    part(
      'armFront',
      -30,
      -140,
      'armFront',
      [-36, -28, 34, 120],
      yetiArm(PAL.snow, -4) + ticks([[-6, 54], [-14, 72], [4, 78], [-2, 24]], PAL.iceD),
      OUT,
    ),
    part(
      'head',
      -14,
      -146,
      'head',
      [-34, -46, 34, 22],
      shape('M-14 -25 Q-20 -37 -13 -43 Q-7 -36 -5 -28 Z', PAL.cream) +
        shape('M9 -27 Q12 -37 18 -42 Q21 -32 15 -23 Z', PAL.cream) +
        shape(fur(0, -8, 24, 21, 14, 0.15, 1.5), PAL.snow) +
        ellipse(-9, -5, 11, 9, PAL.slate) +
        line('M-17 -11 L-10 -6.5', 3.2) +
        line('M-1 -11 L-7.5 -6.5', 3.2) +
        dot(-13, -5, 1.7, PAL.amber) +
        dot(-5, -5, 1.7, PAL.amber) +
        line('M-15 1 Q-9 -2 -3 1', 2.2) +
        flat('M-13 0.4 L-11.5 3.4 L-10 -0.5 Z', PAL.cream) +
        flat('M-7.5 -0.5 L-6 3.4 L-4.5 0.4 Z', PAL.cream),
      OUT,
    ),
  ],
};
