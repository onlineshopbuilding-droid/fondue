import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, leg, line, part, pin, rect, shape, stitch, tube } from './kit';

/** Pothelm: stumpy peasant with a copper saucepan for a helmet and a ladle for a club. */
export const gruntRig: CharacterRig = {
  parts: [
    part('armBack', 10, -41, 'armBack', [-12, -9, 12, 30], tube('M0 0 L-1 15', 8, PAL.tealD) + circle(-1, 19, 5.5, PAL.skinD)),
    part('legBack', 7, -20, 'legBack', [-20, -9, 14, 22], leg(20, 9, PAL.rustD, PAL.woodD)),
    part('legFront', -6, -20, 'legFront', [-20, -9, 14, 22], leg(20, 9, PAL.rust, PAL.woodD)),
    part(
      'body',
      0,
      -20,
      'body',
      [-23, -33, 23, 11],
      shape('M-12 -26 Q-20 -10 -19 3 Q0 10 19 3 Q20 -10 12 -26 Q0 -31 -12 -26 Z', PAL.teal) +
        flat('M8 -27 Q17 -12 17 3 Q11 6 6 6 Q11 -10 8 -27 Z', PAL.tealD) +
        shape('M-14 -17 L-3 -18 L-2 -8 L-13 -7 Z', PAL.mustard).replace('/>', ' stroke-width="2"/>') +
        stitch('M-12 -15 L-5 -16 L-4 -10 L-11 -9') +
        shape('M6 -3 L14 -4 L15 3 L7 5 Z', PAL.rust).replace('/>', ' stroke-width="2"/>') +
        tube('M-18 -5 Q0 1 18 -5', 2.5, PAL.creamD, 2.2) +
        rect(-3, -6, 7, 7, PAL.ironL, 1.5).replace('/>', ' stroke-width="2"/>'),
    ),
    part(
      'head',
      0,
      -45,
      'head',
      [-22, -32, 38, 7],
      circle(10, -6, 4.5, PAL.skinD) +
        ellipse(-1, -8, 13, 13, PAL.skin) +
        dot(-9, -2, 3.2, PAL.rust, 0.45) +
        tube('M16 -14 L32 -21', 3.5, PAL.woodD) +
        shape('M-16 -14 L-14 -27 Q-1 -31 12 -27 L14 -14 Z', PAL.copper) +
        flat('M-11 -26 Q-8 -28 -5 -28 L-6 -16 L-12 -16 Z', PAL.copperL) +
        rect(-20, -17, 38, 6, PAL.rustD, 3) +
        ellipse(-14, -3, 5, 4, PAL.skinD) +
        dot(-9, -7, 2) +
        dot(-1, -7, 2) +
        line('M-10 2 Q-6 4 -1 1', 2.2),
    ),
    part(
      'armFront',
      -7,
      -41,
      'armFront',
      [-40, -36, 12, 36],
      tube('M-8 28 L-17 -26', 3, PAL.ironL) +
        shape('M-34 -27 L-14 -27 Q-14 -14 -24 -14 Q-34 -14 -34 -27 Z', PAL.ironL) +
        ellipse(-24, -27, 10, 3.2, PAL.iron) +
        tube('M0 0 L-7 14', 8, PAL.teal) +
        circle(-9, 18, 6, PAL.skin) +
        pin(),
    ),
  ],
};
