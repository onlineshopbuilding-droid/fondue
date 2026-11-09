import type { CharacterRig } from '../types';
import { PAL, circle, dot, flat, line, part, shape, stitch, tube, union } from './kit';

const talonLeg = (color: string): string =>
  tube('M0 0 L0 30', 3, color, 2.8) +
  tube('M0 30 L-11 31.5', 2, PAL.mustardD, 1.9) +
  tube('M0 30 L5 31.5', 2, PAL.mustardD, 1.9);

const fringe = (x: number, y: number, fill: string): string =>
  shape(`M${x - 5} ${y} L${x} ${y + 13} L${x + 5} ${y} Z`, fill).replace('/>', ' stroke-width="2.4"/>');

/** Crowcaller: a gaunt figure in a feather cloak behind a long bone beak. */
export const crowcallerRig: CharacterRig = {
  parts: [
    part(
      'armBack',
      8,
      -50,
      'armBack',
      [-9, -8, 22, 40],
      fringe(9, 9, PAL.raven) + fringe(13, 18, PAL.raven) + tube('M0 0 L11 22', 3, PAL.raven, 2.8) + circle(12, 25, 3.8, PAL.skinD),
    ),
    part('legBack', 4, -34, 'legBack', [-16, -6, 11, 36], talonLeg(PAL.ashD)),
    part('legFront', -4, -34, 'legFront', [-16, -6, 11, 36], talonLeg(PAL.ash)),
    part(
      'body',
      0,
      -34,
      'body',
      [-24, -28, 24, 14],
      shape('M-11 -23 Q-20 -6 -20 6 L-15 2 L-11 10 L-6 3 L-2 11 L3 3 L7 10 L11 3 L16 8 L20 4 Q19 -8 11 -23 Q0 -27 -11 -23 Z', PAL.raven) +
        line('M-14 -8 q3.5 5 7 0 q3.5 5 7 0 q3.5 5 7 0 q3.5 5 7 0', 2, PAL.ravenL) +
        line('M-11 -16 q3.5 4.5 7.3 0 q3.5 4.5 7.3 0 q3.5 4.5 7.3 0', 2, PAL.ravenL) +
        line('M-17 0 q4 4 8.5 0 q4 4 8.5 0 q4 4 8.5 0 q4 4 8.5 0', 2, PAL.plumL),
    ),
    part(
      'head',
      0,
      -55,
      'head',
      [-33, -27, 26, 9],
      shape('M0 -20 L10 -24 L10 -18 L20 -19 L16 -13 L23 -10 L15 -6 L19 1 L5 5 Z', PAL.raven) +
        shape('M9 -18 Q-7 -22 -11 -13 L-30 -4 Q-17 2 -9 1 Q6 5 10 -4 Z', PAL.cream) +
        flat('M-17 -9.5 L-14 -11 L-10 -1 Q-12 0.5 -14 0.4 Z', PAL.rust) +
        line('M-26 -4 Q-17 -3 -9 -5', 1.9) +
        dot(-4, -11, 4.6) +
        dot(-4, -11, 2.2, PAL.amber) +
        stitch('M5 -17 Q7 -9 5 -1', PAL.creamD),
    ),
    part(
      'armFront',
      -6,
      -49,
      'armFront',
      [-33, -22, 8, 22],
      fringe(-8, 0, PAL.ravenL) +
        fringe(-15, -3, PAL.ravenL) +
        tube('M0 0 L-12 -6 L-21 -2', 3, PAL.raven, 2.8) +
        circle(-23, -4, 4, PAL.skin) +
        line('M-26 -7 L-30 -12', 2.2) +
        line('M-23 -8 L-25 -15', 2.2) +
        line('M-20 -7 L-20 -14', 2.2),
    ),
  ],
};

const WING_OUTLINE = 3;

/** The crow a Crowcaller turns into. Wings point up and flap around the shoulder. */
export const crowRig: CharacterRig = {
  parts: [
    part(
      'wingBack',
      -1,
      -17,
      'armBack',
      [-11, -29, 22, 8],
      shape('M-6 3 Q-8 -12 7 -25 L9 -18 L15 -20 L13 -12 L18 -12 L13 -4 L6 4 Z', PAL.ashD),
      WING_OUTLINE,
    ),
    part(
      'body',
      0,
      -12,
      'static',
      [-23, -14, 23, 16],
      shape('M8 -3 L19 -3 L18 1 L21 4 L8 6 Z', PAL.ashD) +
        line('M-3 7 L-4 12', 2.4, PAL.mustardD) +
        line('M3 7 L3 12', 2.4, PAL.mustardD) +
        shape('M-13 -7 L-20 -3 L-13 -1 Z', PAL.mustard).replace('/>', ` stroke-width="${2.4}"/>`) +
        union(
          ['M-10 0 a10 8 0 1 0 20 0 a10 8 0 1 0 -20 0 Z', 'M-14 -4 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 Z'],
          PAL.raven,
          WING_OUTLINE,
        ) +
        dot(-9.5, -5, 2, PAL.cream) +
        dot(-10, -5, 1, '#2b2118'),
      WING_OUTLINE,
    ),
    part(
      'wingFront',
      3,
      -16,
      'armFront',
      [-11, -29, 22, 8],
      shape('M-6 3 Q-8 -12 7 -25 L9 -18 L15 -20 L13 -12 L18 -12 L13 -4 L6 4 Z', PAL.ravenL),
      WING_OUTLINE,
    ),
  ],
};
