import type { CharacterRig } from '../types';
import { PAL, circle, dot, ellipse, flat, line, part, rect, shape, stitch, tube } from './kit';

const WHEEL_BOX = [-20, -20, 20, 20] as const;

const spoke = (angle: number, color: string, width: number): string => {
  const a = (angle * Math.PI) / 180;
  const x = Math.round(Math.cos(a) * 130) / 10;
  const y = Math.round(Math.sin(a) * 130) / 10;
  return line(`M0 0 L${x} ${y}`, width, color);
};

const wheel: string =
  circle(0, 0, 17, PAL.iron) +
  circle(0, 0, 12, PAL.wood).replace('/>', ' stroke-width="2.4"/>') +
  [60, 120, 180, 240, 300].map((a) => spoke(a, '#2b2118', 2.6)).join('') +
  spoke(0, PAL.mustard, 3.4) +
  circle(0, 0, 4.4, PAL.mustard).replace('/>', ' stroke-width="2.4"/>');

const diamond = (x: number, fill: string): string =>
  shape(`M${x} -8 L${x + 7} 0 L${x} 8 L${x - 7} 0 Z`, fill).replace('/>', ' stroke-width="2"/>');

/** Siege Cart: a plank wagon with a huge mounted crossbow and a tiny worried operator. */
export const siegeCartRig: CharacterRig = {
  parts: [
    part(
      'wagon',
      0,
      -40,
      'static',
      [-65, -14, 65, 22],
      rect(-49, 12, 98, 6, PAL.woodD, 2) +
        rect(-62, -12, 124, 24, PAL.wood, 3) +
        line('M-61 -4 L61 -4', 1.8) +
        line('M-61 4 L61 4', 1.8) +
        rect(-62, -12, 8, 24, PAL.iron, 2) +
        rect(54, -12, 8, 24, PAL.iron, 2) +
        dot(-58, -7, 1.5, PAL.ironL) +
        dot(-58, 7, 1.5, PAL.ironL) +
        dot(58, -7, 1.5, PAL.ironL) +
        dot(58, 7, 1.5, PAL.ironL) +
        diamond(-34, PAL.rust) +
        diamond(-14, PAL.teal) +
        diamond(6, PAL.mustard) +
        diamond(26, PAL.rust),
    ),
    part('wheelBack', 40, -19, 'spin', WHEEL_BOX, wheel),
    part('wheelFront', -40, -19, 'spin', WHEEL_BOX, wheel),
    part(
      'crossbow',
      10,
      -62,
      'static',
      [-76, -36, 40, 18],
      rect(-9, -2, 18, 12, PAL.woodD, 2) +
        tube('M-34 -28 Q-68 -9 -34 10', 5, PAL.rust) +
        stitch('M-50 -19 Q-55 -10 -50 -1', PAL.cream) +
        line('M-34 -28 L12 -10 L-34 10', 5.5) +
        line('M-34 -28 L12 -10 L-34 10', 2.2, PAL.cream) +
        tube('M26 -8 L-56 -10', 7, PAL.woodD) +
        tube('M16 -14 L-64 -14', 2.5, PAL.creamD, 2.6) +
        shape('M-62 -20 L-73 -14 L-62 -8 Z', PAL.ironL) +
        shape('M18 -14 L10 -21 L4 -21 L10 -14 L4 -7 L10 -7 Z', PAL.mustard).replace('/>', ' stroke-width="2.2"/>') +
        circle(30, -7, 5.5, PAL.iron) +
        dot(30, -7, 1.8, PAL.ironL),
    ),
    part(
      'operatorBody',
      50,
      -58,
      'body',
      [-11, -15, 13, 8],
      shape('M-6 -11 Q-9 -3 -8 5 L8 5 Q9 -3 6 -11 Q0 -14 -6 -11 Z', PAL.teal) + stitch('M-5 1 L6 1', PAL.mustard),
    ),
    part(
      'operatorHead',
      50,
      -69,
      'head',
      [-16, -22, 17, 5],
      shape('M2 -12 Q9 -19 13 -9 Q10 -8 9 -3 Q6 -8 2 -8 Z', PAL.rustD) +
        circle(-1, -6, 8.5, PAL.skin) +
        shape('M-10 -8 Q-9 -18 -1 -18 Q8 -18 8 -8 Z', PAL.rust) +
        dot(-6, -4, 1.7) +
        dot(-1, -4, 1.7) +
        ellipse(-10, -2, 2.6, 2.1, PAL.skinD).replace('/>', ' stroke-width="1.8"/>') +
        flat('M-7 2 Q-3 0 0 2 Q-3 3.4 -7 2 Z', PAL.skinD),
    ),
    part(
      'operatorArm',
      46,
      -65,
      'armFront',
      [-18, -9, 8, 12],
      tube('M0 0 L-9 1', 4, PAL.tealD) + circle(-11, 2, 4, PAL.skin),
    ),
  ],
};
