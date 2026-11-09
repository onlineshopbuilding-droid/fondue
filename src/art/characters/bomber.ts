import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, leg, line, part, pin, rect, shape, stitch, tube } from './kit';

/** Keg Hauler: stocky, with soot smudges and a fused keg strapped to its back. */
export const bomberRig: CharacterRig = {
  parts: [
    part('armBack', 12, -44, 'armBack', [-13, -9, 13, 30], tube('M0 0 L1 15', 9, PAL.rustD) + circle(1, 20, 6, PAL.skinD)),
    part(
      'keg',
      23,
      -37,
      'static',
      [-26, -46, 26, 28],
      shape('M-14 -22 Q-23 0 -14 22 L14 22 Q23 0 14 -22 Z', PAL.wood) +
        line('M-6 -22 Q-9 0 -6 22', 2) +
        line('M6 -22 Q9 0 6 22', 2) +
        shape('M-18 -14 L18 -14 L20 -7 L-20 -7 Z', PAL.iron) +
        shape('M-20 7 L20 7 L18 14 L-18 14 Z', PAL.iron) +
        dot(-12, -10.5, 1.5, PAL.ironL) +
        dot(12, 10.5, 1.5, PAL.ironL) +
        ellipse(0, -22, 14, 4, PAL.woodD) +
        tube('M0 -24 Q9 -30 3 -36', 2, PAL.creamD, 2.5) +
        shape('M3 -44 L5.5 -39.5 L10.5 -39 L6.5 -35.5 L7.5 -31 L3 -33.5 L-1.5 -31 L-0.5 -35.5 L-4.5 -39 L0.5 -39.5 Z', PAL.ember).replace('/>', ' stroke-width="2"/>') +
        dot(3, -37, 2, PAL.amberL),
    ),
    part('legBack', 8, -20, 'legBack', [-22, -9, 16, 22], leg(20, 11, PAL.woodD, PAL.sootD)),
    part('legFront', -7, -20, 'legFront', [-22, -9, 16, 22], leg(20, 11, PAL.forestD, PAL.sootD)),
    part(
      'body',
      0,
      -22,
      'body',
      [-25, -33, 25, 11],
      shape('M-14 -26 Q-23 -12 -20 3 Q0 9 20 3 Q23 -12 14 -26 Q0 -31 -14 -26 Z', PAL.rust) +
        flat('M9 -27 Q20 -12 18 3 Q12 6 7 7 Q13 -10 9 -27 Z', PAL.rustD) +
        flat('M-13 -14 Q-9 -19 -4 -17 Q-3 -10 -9 -8 Q-13 -9 -13 -14 Z', PAL.sootD, 0.55) +
        tube('M11 -28 Q0 -14 -18 -6', 3.5, PAL.woodD, 2.2) +
        tube('M-19 -2 Q0 4 19 -2', 3, PAL.woodD, 2.2) +
        rect(-4, -3, 8, 8, PAL.mustard, 1.5).replace('/>', ' stroke-width="2"/>') +
        stitch('M12 -8 Q14 -3 13 2'),
    ),
    part(
      'head',
      0,
      -47,
      'head',
      [-22, -33, 21, 8],
      circle(13, -9, 4, PAL.skinD) +
        ellipse(-1, -11, 14, 14, PAL.skin) +
        flat('M3 -13 Q9 -13 10 -7 Q6 -3 2 -6 Z', PAL.sootD, 0.45) +
        flat('M-13 -3 Q-9 -6 -6 -3 Q-9 -1 -13 -3 Z', PAL.sootD, 0.35) +
        shape('M-15 -15 Q-14 -30 -1 -30 Q13 -30 13 -15 Z', PAL.mustard) +
        rect(-17, -18, 32, 7, PAL.mustardD, 3.5) +
        stitch('M-7 -28 L-7 -20', PAL.cream) +
        stitch('M3 -28 L3 -20', PAL.cream) +
        dot(-9, -8, 3.6, PAL.cream) +
        dot(-1, -8, 3.6, PAL.cream) +
        dot(-10, -8, 1.8) +
        dot(-2, -8, 1.8) +
        ellipse(-15, -3, 4.5, 3.5, PAL.skinD) +
        shape('M-16 2 Q-9 -3 -3 1 Q2 -2 6 3 Q1 7 -4 5 Q-11 8 -16 2 Z', PAL.ashD),
    ),
    part(
      'armFront',
      -11,
      -43,
      'armFront',
      [-37, -32, 12, 12],
      tube('M0 0 L-13 -5 L-20 -14', 9, PAL.rust) + circle(-22, -18, 7, PAL.skin) + pin(),
    ),
  ],
};
