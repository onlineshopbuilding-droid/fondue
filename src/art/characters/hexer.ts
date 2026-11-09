import type { CharacterRig } from '../types';
import { PAL, circle, dot, flat, leg, line, part, pin, rect, shape, stitch, tube } from './kit';

/** Hexer: a hooded plum robe, gnarled staff and amber lantern. */
export const hexerRig: CharacterRig = {
  parts: [
    part('armBack', 8, -47, 'armBack', [-13, -10, 16, 34], tube('M0 0 L5 18', 9, PAL.plumD) + circle(6, 25, 4.6, PAL.skinD)),
    part('legBack', 8, -12, 'legBack', [-20, -8, 12, 14], leg(12, 7, PAL.plumD, PAL.woodD, 8)),
    part('legFront', -8, -12, 'legFront', [-20, -8, 12, 14], leg(12, 7, PAL.plumD, PAL.woodD, 8)),
    part(
      'body',
      0,
      -30,
      'body',
      [-28, -30, 28, 30],
      shape('M-10 -24 Q-16 -2 -24 21 Q-12 27 0 24 Q12 27 24 21 Q16 -2 10 -24 Q0 -28 -10 -24 Z', PAL.plum) +
        flat('M5 -25 Q9 -25 10 -24 Q16 -2 22.5 20 Q15 23 10 23.5 Q10 0 5 -25 Z', PAL.plumD) +
        flat('M-23 18 L-17.5 12 L-12 18 L-6 12 L0 18.5 L6 12 L12 18 L17.5 12 L23 18 Q12 24 0 22 Q-12 24 -23 18 Z', PAL.mustard) +
        stitch('M-1 -22 L-3 10', PAL.plumL) +
        dot(-7, -4, 2.3, PAL.amber) +
        dot(-5, 5, 1.8, PAL.mustard),
    ),
    part(
      'head',
      0,
      -53,
      'head',
      [-22, -31, 27, 13],
      shape('M-17 5 Q-22 -15 -3 -23 Q11 -29 24 -26 Q15 -20 17 -8 Q19 3 14 8 Q-2 12 -17 5 Z', PAL.plum) +
        shape('M-17 3 Q-18 -11 -7 -14 Q4 -13 5 -3 Q3 6 -9 7 Q-15 7 -17 3 Z', PAL.plumD).replace('/>', ' stroke-width="2.6"/>') +
        dot(-12, -4, 2.3, PAL.amberL) +
        dot(-4, -4, 2.3, PAL.amberL) +
        stitch('M4 -21 Q12 -14 11 4', PAL.plumL),
    ),
    part(
      'armFront',
      -8,
      -47,
      'armFront',
      [-46, -48, 12, 48],
      tube('M-30 -39 L-30 -33', 1.5, PAL.iron, 2) +
        dot(-30, -18, 13, PAL.amber, 0.28) +
        rect(-37, -29, 14, 19, PAL.amber, 3) +
        flat('M-34 -26 L-31 -26 L-31 -14 L-34 -14 Z', PAL.amberL) +
        line('M-30 -29 L-30 -10', 2) +
        rect(-39, -33, 18, 5, PAL.iron, 2) +
        rect(-37, -11, 14, 4, PAL.iron, 2) +
        tube('M-17 43 Q-21 26 -17 14 Q-14 0 -19 -12 Q-23 -24 -17 -33 Q-14 -43 -24 -43 Q-31 -43 -30 -38', 3.5, PAL.woodD) +
        circle(-16, 2, 4, PAL.wood).replace('/>', ' stroke-width="2.4"/>') +
        circle(-21, -19, 3.4, PAL.wood).replace('/>', ' stroke-width="2.4"/>') +
        tube('M0 0 L-13 12', 10, PAL.plumL) +
        circle(-17, 15, 5, PAL.skin) +
        pin(),
    ),
  ],
};
