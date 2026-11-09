import type { CharacterRig } from '../types';
import { PAL, circle, dot, flat, line, part, pin, rect, shape, stitch, tube } from './kit';

const gore = (k: number): string => {
  const c = Math.round(42 * k * 10) / 10;
  const b = Math.round(9 * k * 10) / 10;
  return `M0 -62 C${c} -62 ${c} -12 ${b} -2 L${-b} -2 C${-c} -12 ${-c} -62 0 -62 Z`;
};

/** Balloonist: a goggled pilot in a wicker basket under a patched, striped balloon. */
export const balloonistRig: CharacterRig = {
  parts: [
    part(
      'balloon',
      0,
      -56,
      'static',
      [-38, -65, 38, 41],
      line('M-9 2 L-16 38', 2.4) +
        line('M9 2 L16 38', 2.4) +
        shape(gore(1), PAL.rust) +
        shape(gore(0.68), PAL.cream).replace('/>', ' stroke-width="2"/>') +
        shape(gore(0.34), PAL.rust).replace('/>', ' stroke-width="2"/>') +
        shape('M-29 -44 L-17 -46 L-16 -33 L-28 -31 Z', PAL.mustard).replace('/>', ' stroke-width="2"/>') +
        stitch('M-27 -42 L-19 -43.5 L-18 -35 L-26 -33.5', PAL.rustD) +
        shape('M15 -24 L26 -28 L28 -17 L18 -13 Z', PAL.teal).replace('/>', ' stroke-width="2"/>') +
        stitch('M18 -23 L25 -25.5 L26 -18 L19 -15.5') +
        shape('M-10 -60 Q0 -64 10 -60 Q0 -52 -10 -60 Z', PAL.teal).replace('/>', ' stroke-width="2.4"/>') +
        shape('M-9 -2 L9 -2 L7 7 L-7 7 Z', PAL.mustard) +
        flat('M-5 4 L5 4 L4 6 L-4 6 Z', PAL.ember),
    ),
    part('armBack', 7, -26, 'armBack', [-9, -8, 16, 21], tube('M0 0 L3 10', 5, PAL.woodD) + circle(3, 13, 4.2, PAL.skinD)),
    part(
      'body',
      0,
      -16,
      'body',
      [-15, -18, 31, 14],
      tube('M6 -11 Q16 -14 25 -7', 3, PAL.cream, 2.8) +
        shape('M-10 -13 Q-12 0 -11 9 L11 9 Q12 0 10 -13 Q0 -17 -10 -13 Z', PAL.wood) +
        tube('M-8 -12 Q0 -8 8 -12', 3, PAL.cream, 2.4),
    ),
    part(
      'head',
      0,
      -30,
      'head',
      [-19, -21, 17, 6],
      circle(-1, -8, 10.5, PAL.skin) +
        shape('M-12 -9 Q-12 -19 -1 -19 Q10 -19 10 -8 L10 1 Q6 3 4 0 L4 -9 Z', PAL.woodD) +
        line('M-3 -10 L10 -10', 3) +
        circle(-9, -9, 5, PAL.tealL).replace('/>', ' stroke-width="2.6"/>') +
        circle(1, -9, 5, PAL.tealL).replace('/>', ' stroke-width="2.6"/>') +
        dot(-10.5, -10.5, 1.5, PAL.pale) +
        dot(-0.5, -10.5, 1.5, PAL.pale) +
        line('M-8 0 Q-4 2 0 0', 1.9),
    ),
    part(
      'basket',
      0,
      -9,
      'static',
      [-24, -14, 34, 10],
      shape('M-19 -9 L19 -9 L16 7.5 L-16 7.5 Z', PAL.mustardD) +
        line('M-18 -3 L18 -3', 1.6) +
        line('M-17 2.5 L17 2.5', 1.6) +
        line('M-9 -8 L-8 7', 1.6) +
        line('M0 -8 L0 7', 1.6) +
        line('M9 -8 L8 7', 1.6) +
        rect(-22, -12, 44, 5.5, PAL.wood, 2.7) +
        line('M21 -6 L24 -2', 2) +
        shape('M23 -3 Q31 -3 30 5 Q26 9 21 5 Q20 0 23 -3 Z', PAL.rust).replace('/>', ' stroke-width="2.4"/>'),
    ),
    part(
      'armFront',
      -7,
      -27,
      'armFront',
      [-20, -8, 8, 17],
      tube('M0 0 L-8 7', 5, PAL.wood) + circle(-10, 9, 4.6, PAL.skin) + pin(),
    ),
  ],
};
