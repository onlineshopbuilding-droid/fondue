import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, leg, line, part, pin, rect, shape, stitch, tube } from './kit';

/** Slinger: long and thin, in a leather cap, sighting along a slingshot. */
export const slingerRig: CharacterRig = {
  parts: [
    part(
      'armBack',
      4,
      -46,
      'armBack',
      [-9, -14, 23, 15],
      tube('M0 0 L13 6 L6 -4', 4.5, PAL.forestD) + circle(5, -6, 4.4, PAL.skinD),
    ),
    part('legBack', 5, -32, 'legBack', [-16, -8, 11, 34], leg(32, 5.5, PAL.woodD, PAL.sootD, 6)),
    part('legFront', -4, -32, 'legFront', [-16, -8, 11, 34], leg(32, 5.5, PAL.mustardD, PAL.sootD, 6)),
    part(
      'body',
      0,
      -32,
      'body',
      [-13, -23, 18, 10],
      shape('M-7 -18 Q-10 -7 -9 4 Q0 7 9 4 Q10 -7 7 -18 Q0 -21 -7 -18 Z', PAL.forest) +
        stitch('M-1 -17 L-1 2', PAL.creamD) +
        tube('M-9 -1 Q0 2 9 -1', 2, PAL.woodD, 2) +
        shape('M6 -2 L14 -2 L15 6 Q10 9 6 6 Z', PAL.wood).replace('/>', ' stroke-width="2.2"/>'),
    ),
    part(
      'head',
      0,
      -50,
      'head',
      [-24, -24, 18, 11],
      tube('M0 4 L0 -1', 4, PAL.rust, 2.6) +
        ellipse(-1, -9, 10.5, 10.5, PAL.skin) +
        shape('M4 -11 L14 -11 L13 3 Q9 6 5 2 Z', PAL.woodD) +
        shape('M-12 -9 Q-12 -21 -1 -21 Q11 -21 11 -9 Z', PAL.wood) +
        shape('M-11 -11 L-21 -7 L-11 -6 Z', PAL.woodD) +
        stitch('M-6 -20 Q-3 -15 -3 -10', PAL.cream) +
        rect(-3, -22, 6, 3, PAL.woodD, 1.5).replace('/>', ' stroke-width="2"/>') +
        dot(-8, -5, 1.8) +
        dot(-2, -5, 1.8) +
        shape('M-11 -3 L-19 1 L-10 2 Z', PAL.skinD).replace('/>', ' stroke-width="2"/>') +
        line('M-8 5 L-2 4', 1.9),
    ),
    part(
      'armFront',
      -3,
      -44,
      'armFront',
      [-44, -32, 8, 15],
      tube('M-26 7 L-26 -10', 2.5, PAL.woodD, 2.6) +
        tube('M-26 -9 Q-35 -12 -35 -24', 2.5, PAL.woodD, 2.6) +
        tube('M-26 -9 Q-17 -12 -17 -24', 2.5, PAL.woodD, 2.6) +
        line('M-35 -25 L-10 -15 L-17 -25', 2.2, PAL.rust) +
        circle(-9, -15, 3.8, PAL.ironL).replace('/>', ' stroke-width="2"/>') +
        tube('M0 0 L-22 -2', 4.5, PAL.forest) +
        circle(-26, -2, 5, PAL.skin) +
        pin(),
    ),
  ],
};
