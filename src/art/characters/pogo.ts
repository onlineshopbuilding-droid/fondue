import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, ink, line, part, pin, rect, shape, tube } from './kit';

const TORSO = 'M-9 -17 Q-14 -6 -12 3 Q0 7 12 3 Q14 -6 9 -17 Q0 -20 -9 -17 Z';

const tucked = (cloth: string, boot: string): string =>
  tube('M0 0 Q-15 -5 -13 7', 7.5, cloth) + shape('M-8 5 L-8 13 L-24 13 Q-25 6 -18 5 Z', boot);

/** Pogo Bandit: a masked rogue with tucked legs on a spring-loaded stick. */
export const pogoRig: CharacterRig = {
  parts: [
    part('armBack', 11, -56, 'armBack', [-30, -9, 9, 15], tube('M0 0 Q-10 6 -19 4', 5.5, PAL.forestD) + circle(-22, 4, 5, PAL.skinD)),
    part('legBack', 11, -44, 'legBack', [-27, -11, 9, 16], tucked(PAL.plumD, PAL.woodD)),
    part(
      'stick',
      -5,
      -30,
      'static',
      [-22, -32, 19, 31],
      tube('M0 -24 L0 8', 3, PAL.iron) +
        tube('M-7 4 L7 8 L-7 12 L7 16 L-7 20 L7 24', 2.6, PAL.mustard, 2.6) +
        rect(-5, 23, 10, 5, PAL.rustD, 2) +
        tube('M-15 -2 L13 -2', 2.5, PAL.woodD, 2.6) +
        tube('M-16 -24 L8 -24', 3.5, PAL.rust),
    ),
    part('legFront', 3, -44, 'legFront', [-27, -11, 9, 16], tucked(PAL.plum, PAL.woodD)),
    part(
      'body',
      7,
      -44,
      'body',
      [-17, -22, 17, 10],
      shape(TORSO, PAL.cream) +
        flat('M-11.5 -11 L11.5 -11 L12.3 -6.5 L-12.3 -6.5 Z', PAL.rust) +
        flat('M-12.6 -2 L12.6 -2 L12.3 2.5 L-12.3 2.5 Z', PAL.rust) +
        ink(TORSO) +
        flat('M3 -17 Q9 -17 10 -16 Q13 -6 11 2 Q7 4.5 3 5 Z', PAL.forest) +
        line('M3 -17 L3 5', 2),
    ),
    part(
      'head',
      7,
      -62,
      'head',
      [-20, -25, 33, 7],
      shape('M12 -13 L28 -21 L23 -12 L30 -5 L12 -8 Z', PAL.forestD) +
        ellipse(-1, -8.5, 12, 12, PAL.skin) +
        shape('M-13 -11 Q-14 -21 0 -21 Q12 -21 12 -9 Q0 -15 -13 -11 Z', PAL.forest) +
        shape('M-15 -11 Q0 -15 12 -9 L12 -3 Q-2 -7 -15 -4 Z', PAL.ashD) +
        dot(-9, -8, 2.8, PAL.cream) +
        dot(-2, -8, 2.8, PAL.cream) +
        dot(-9.6, -8, 1.3) +
        dot(-2.6, -8, 1.3) +
        ellipse(-14, -1, 3.4, 2.8, PAL.skinD).replace('/>', ' stroke-width="2"/>') +
        shape('M-10 1 Q-5 5 0 1 Z', PAL.cream).replace('/>', ' stroke-width="2"/>'),
    ),
    part(
      'armFront',
      4,
      -56,
      'armFront',
      [-27, -9, 9, 15],
      tube('M0 0 Q-8 6 -14 4', 5.5, PAL.forest) + circle(-17, 4, 5.2, PAL.skin) + pin(),
    ),
  ],
};
