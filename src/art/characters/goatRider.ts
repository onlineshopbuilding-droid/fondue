import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, fur, line, part, pin, rect, shape, stitch, tube } from './kit';

const goatLeg = (wool: string): string =>
  tube('M0 0 L0 22', 9, wool) + rect(-7, 23, 14, 7, PAL.woodD, 2);

const LEG_BOX = [-13, -11, 13, 33] as const;

/** Goat Rider: a small raider in a horned hat on a big shaggy alpine goat. */
export const goatRiderRig: CharacterRig = {
  parts: [
    part('goatLegFarFront', -19, -32, 'legBack', LEG_BOX, goatLeg(PAL.creamD)),
    part('goatLegFarRear', 40, -32, 'legFront', LEG_BOX, goatLeg(PAL.creamD)),
    part('goatLegNearFront', -28, -32, 'legFront', LEG_BOX, goatLeg(PAL.cream)),
    part('goatLegNearRear', 31, -32, 'legBack', LEG_BOX, goatLeg(PAL.cream)),
    part(
      'goatBody',
      4,
      -44,
      'static',
      [-50, -28, 62, 30],
      tube('M42 -10 Q48 -16 50 -22', 6, PAL.creamD) +
        shape(fur(0, 0, 41, 18, 20, 0.15, 2.5), PAL.cream) +
        flat('M-20 10 L-14 16 L-8 11 L-2 17 L4 11 L10 16 L16 11 L22 15 L26 8 Q4 16 -20 10 Z', PAL.creamD) +
        shape('M-13 -19 Q6 -23 24 -18 L27 3 Q6 9 -15 4 Z', PAL.teal) +
        stitch('M-10 -1 Q6 4 24 0', PAL.mustard) +
        flat('M-10 -16 Q6 -19 22 -15 L22.5 -11 Q6 -15 -10.5 -12 Z', PAL.mustard),
    ),
    part(
      'goatHead',
      -38,
      -54,
      'static',
      [-38, -40, 34, 36],
      ellipse(9, 9, 14, 17, PAL.cream) +
        shape('M4 22 L14 22 L13 31 Q9 35 5 31 Z', PAL.mustard) +
        tube('M4 -14 Q12 -30 26 -29', 3.5, PAL.woodD) +
        tube('M-2 -15 Q4 -32 20 -33', 4.5, PAL.creamD) +
        shape('M-26 7 Q-25 24 -20 27 Q-16 19 -14 8 Z', PAL.creamD) +
        shape('M-4 -19 Q9 -17 9 -5 Q7 6 -6 9 L-25 9 Q-34 7 -32 -2 Q-24 -13 -4 -19 Z', PAL.cream) +
        shape('M4 -11 Q18 -13 22 -3 Q13 1 5 -3 Z', PAL.creamD) +
        circle(-11, -7, 4.8, PAL.mustard).replace('/>', ' stroke-width="2.4"/>') +
        flat('M-14.5 -8.2 L-7.5 -8.2 L-7.5 -5.8 L-14.5 -5.8 Z', '#2b2118') +
        dot(-29, 0, 1.7) +
        line('M-31 5 Q-25 5 -20 2', 2),
    ),
    part('riderArmBack', 13, -67, 'armBack', [-9, -8, 9, 24], tube('M0 0 L1 11', 5.5, PAL.plumD) + circle(1, 14, 4.2, PAL.skinD)),
    part(
      'riderBody',
      10,
      -58,
      'body',
      [-18, -18, 15, 30],
      tube('M-2 3 L-5 18', 6, PAL.rustD) +
        shape('M0 15 L0 27 L-13 27 Q-14 19 -9 15 Z', PAL.woodD) +
        shape('M-8 -13 Q-11 -4 -10 6 Q0 9 10 6 Q11 -4 8 -13 Q0 -16 -8 -13 Z', PAL.plum) +
        stitch('M-8 2 Q0 5 8 2', PAL.mustard),
    ),
    part(
      'riderHead',
      10,
      -70,
      'head',
      [-22, -30, 21, 6],
      circle(-1, -7, 10, PAL.skin) +
        tube('M-10 -15 Q-17 -17 -16 -22', 2.5, PAL.cream, 2.8) +
        tube('M8 -15 Q15 -17 14 -22', 2.5, PAL.cream, 2.8) +
        shape('M-11 -12 Q-11 -22 -1 -22 Q9 -22 9 -12 Z', PAL.rust) +
        rect(-13, -14, 24, 5.5, PAL.creamD, 2.7) +
        dot(-7, -6, 1.8) +
        dot(-1, -6, 1.8) +
        ellipse(-11, -3, 3, 2.4, PAL.skinD).replace('/>', ' stroke-width="2"/>') +
        line('M-8 0 Q-4 2 0 -0.5', 1.9),
    ),
    part(
      'riderArmFront',
      5,
      -67,
      'armFront',
      [-40, -12, 12, 16],
      line('M-14 -3 Q-26 2 -35 10', 2.2, PAL.rust) +
        tube('M0 0 L-11 -2', 5.5, PAL.plum) +
        circle(-14, -3, 4.6, PAL.skin) +
        pin(0, 0),
    ),
  ],
};
