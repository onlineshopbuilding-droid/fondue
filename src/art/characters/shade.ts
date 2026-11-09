import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, leg, line, part, shape, tube } from './kit';

/** Shade: a slim figure bound in charcoal scarves, pale eyes and a short curved blade. */
export const shadeRig: CharacterRig = {
  parts: [
    part('armBack', 5, -44, 'armBack', [-9, -8, 20, 27], tube('M0 0 L9 13', 4.5, PAL.ashD) + circle(10, 17, 4.2, PAL.ashD)),
    part(
      'legBack',
      4,
      -30,
      'legBack',
      [-17, -8, 11, 32],
      leg(30, 5.5, PAL.ashD, PAL.ashD, 9),
    ),
    part(
      'legFront',
      -4,
      -30,
      'legFront',
      [-17, -8, 11, 32],
      leg(30, 5.5, PAL.ash, PAL.ashD, 9) + line('M-4 6 L4 3', 1.8, PAL.ashL) + line('M-4 13 L4 10', 1.8, PAL.ashL),
    ),
    part(
      'body',
      0,
      -30,
      'body',
      [-13, -32, 46, 14],
      shape('M3 -18 Q18 -30 42 -24 L36 -19 L42 -13 Q20 -18 5 -9 Z', PAL.ashD) +
        shape('M4 -4 Q18 -6 36 5 L29 7 L33 12 Q15 5 3 4 Z', PAL.ash) +
        shape('M-8 -19 Q-11 -8 -9 7 Q0 10 9 7 Q11 -8 8 -19 Q0 -22 -8 -19 Z', PAL.ash) +
        line('M-9 -9 Q0 -14 9 -13', 2, PAL.ashL) +
        line('M-9 -2 Q0 -7 10 -6', 2, PAL.ashL) +
        line('M-9 5 Q0 0 9 1', 2, PAL.ashL),
    ),
    part(
      'head',
      0,
      -48,
      'head',
      [-18, -28, 18, 7],
      ellipse(-1, -12, 12.5, 13, PAL.ash) +
        flat('M-13 -18 Q0 -24 11 -19 L11 -20 Q0 -25 -12 -20 Z', PAL.ashL) +
        line('M-11 -2 Q0 -6 11 -3', 2, PAL.ashL) +
        shape('M-14 -16 Q0 -20 12 -15 L12 -8 Q0 -12 -14 -9 Z', PAL.ashD).replace('/>', ' stroke-width="2.4"/>') +
        dot(-9, -12.5, 4.6, PAL.pale, 0.35) +
        dot(-2, -12.5, 4.6, PAL.pale, 0.35) +
        dot(-9, -12.5, 2.4, PAL.pale) +
        dot(-2, -12.5, 2.4, PAL.pale),
    ),
    part(
      'armFront',
      -5,
      -44,
      'armFront',
      [-41, -22, 8, 20],
      shape('M-16 7 Q-34 4 -37 -18 Q-27 -11 -13 1 Z', PAL.ice) +
        flat('M-19 5 Q-31 2 -34 -12 Q-26 -5 -17 1 Z', PAL.iceD) +
        tube('M-11 3 L-18 9', 2.4, PAL.woodD, 2.4) +
        tube('M0 0 L-12 7', 4.5, PAL.ash) +
        circle(-15, 9, 4.8, PAL.ashD),
    ),
  ],
};
