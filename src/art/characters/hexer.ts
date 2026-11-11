import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, radial, stroke, tone } from '../shade';
import { PAL, RAT, brassPin, felt, fold, hand, litLeg, metal, mouseEar, oval, part, rim, rivet, rrect, seam, snout, tail } from './kit';

/** Whatever mutters under the hood is a rat. */
const C = RAT;

const ROBE = 'M-10 -24 Q-16 -2 -24 21 Q-12 27 0 24 Q12 27 24 21 Q16 -2 10 -24 Q0 -28 -10 -24 Z';
const HOOD = 'M-17 5 Q-22 -15 -3 -23 Q11 -29 24 -26 Q15 -20 17 -8 Q19 3 14 8 Q-2 12 -17 5 Z';
const OPENING = 'M-17 3 Q-18 -11 -7 -14 Q4 -13 5 -3 Q3 6 -9 7 Q-15 7 -17 3 Z';
const GLASS = 'M-37 -29 H-23 V-10 H-37 Z';

/** A small four-pointed embroidered star. */
const star = (x: number, y: number, s: number, color: string): string =>
  `<path d="M${x} ${y - s} Q${x + s * 0.2} ${y - s * 0.2} ${x + s} ${y} Q${x + s * 0.2} ${y + s * 0.2} ${x} ${y + s} Q${x - s * 0.2} ${y + s * 0.2} ${x - s} ${y} Q${x - s * 0.2} ${y - s * 0.2} ${x} ${y - s} Z" fill="${color}" stroke="none"/>`;

const robe =
  felt(
    ROBE,
    PAL.plum,
    // Deep folds, embroidered stars and a mustard zigzag hem.
    fold('M-6 -10 Q-10 6 -14 22', PAL.plum, 1.4, 0.8) +
      fold('M3 -8 Q5 8 8 23', PAL.plum, 1.4, 0.8) +
      fold('M13 -2 Q16 10 19 21', PAL.plum, 1.2, 0.7) +
      stroke('M-8.4 -9 Q-12 6 -16.6 21', PAL.plumL, 0.9, 0.45) +
      star(-11, 10, 2.2, PAL.mustard) +
      star(9, 3, 1.8, PAL.mustard) +
      star(14, 14, 1.5, PAL.amberL) +
      star(-3, 14, 1.4, PAL.amberL) +
      paint('M-23 18 L-17.5 12 L-12 18 L-6 12 L0 18.5 L6 12 L12 18 L17.5 12 L23 18 Q12 24 0 22 Q-12 24 -23 18 Z', PAL.mustard) +
      paint('M-26 19.6 Q-12 25.6 0 23 Q12 25.6 26 19.6 V30 H-26 Z', PAL.mustardD) +
      stroke('M-21 17.6 L-17.5 13.6 L-12 19.4 L-6 13.6 L0 20 L6 13.6 L12 19.4 L17.5 13.6 L21 17.6', PAL.plumD, 1, 0.75) +
      seam('M-22 20 Q-12 25 0 22.6 Q12 25 22 20', PAL.cream, 1, 0.8),
    { shadow: 7, light: 2.6 },
  ) +
  // Cord belt with a tassel.
  litTube('M-13 -6.4 Q0 -2.4 13 -6.4', 2.4, PAL.mustard, { outline: 1.8, shadow: 0.8, light: 0.5 }) +
  litTube('M-7 -4.2 Q-8 1 -7.2 6', 1.8, PAL.mustard, { outline: 1.6, shadow: 0.5, light: 0.3 }) +
  felt('M-9.2 5 L-5.2 5 L-4.4 10.4 L-10 10.4 Z', PAL.mustard, stroke('M-8.4 7 V10 M-7.2 7 V10 M-6 7 V10', tone(PAL.mustard, -0.42), 0.7), {
    outline: 1.6,
    shadow: 0.8,
    light: 0.5,
  }) +
  // Amber amulet on a thin cord.
  stroke('M-9 -15 Q-6 -10 -3 -15', '#2b2118', 1.1) +
  lit(oval(-6, -10.8, 2.6, 3), PAL.amber, { outline: 1.6, shadow: 1, light: 0.6, lightK: 0.5 }) +
  glint(-6.9, -12, 0.7);

const hood =
  // Far ear, poking out behind the hood's edge.
  mouseEar(-10, -19.5, 6, C, { back: true }) +
  felt(
    HOOD,
    PAL.plum,
    seam('M4 -21 Q12 -14 11 4', PAL.plumL, 1.2, 0.85) +
      fold('M14 -18 Q12 -8 15 4', PAL.plum, 1.3, 0.7) +
      rim('M-16 -6 Q-15 -16 -3 -21 Q8 -26 19 -25.4', 1.4, 0.5) +
      // Patch on the back of the hood.
      paint('M7 -5 L13 -6 L13.6 0 L7.6 0.8 Z', PAL.plumL, 0.9) +
      seam('M7.8 -4.2 L12.4 -5 L12.8 -0.4 L8.4 0.2 Z', PAL.cream, 0.8, 0.8),
    { shadow: 4, light: 2 },
  ) +
  lit(oval(24, -26, 1.8), PAL.mustard, { outline: 1.4, shadow: 0.7, light: 0.4 }) +
  // Near ear through a slit in the hood.
  mouseEar(3, -25, 7, C) +
  stroke('M-3 -20.4 Q3 -17.4 9 -20.4', PAL.plumD, 2, 0.95) +
  // Darkness inside the hood.
  (() => {
    const g = radial([[0, '#1a1020'], [0.7, '#2c1b2e'], [1, PAL.plumD]], 0.4, 0.55, 0.6);
    return g.def + `<path d="${OPENING}" fill="${g.url}" stroke="none"/>`;
  })() +
  // Glowing slanted eyes.
  `<circle cx="-12" cy="-4" r="4" fill="${PAL.amber}" stroke="none" opacity="0.22"/>` +
  `<circle cx="-4" cy="-4" r="4" fill="${PAL.amber}" stroke="none" opacity="0.22"/>` +
  `<path d="M-15.2 -5 Q-12 -6.6 -9 -3.4 Q-12.4 -2.6 -15.2 -5 Z" fill="${PAL.amberL}" stroke="none"/>` +
  `<path d="M-7 -3.4 Q-4 -6.6 -0.8 -5 Q-3.6 -2.6 -7 -3.4 Z" fill="${PAL.amberL}" stroke="none"/>` +
  `<circle cx="-11.8" cy="-4.3" r="0.8" fill="#fffaf0" stroke="none"/><circle cx="-4.2" cy="-4.3" r="0.8" fill="#fffaf0" stroke="none"/>` +
  `<path d="${OPENING}" fill="none" stroke="#2b2118" stroke-width="2.6" stroke-linejoin="round"/>` +
  stroke('M-15.6 2.4 Q-16.4 -9 -7 -12.4', PAL.plumL, 1, 0.6) +
  // A long rat snout pokes out of the dark, its nose and whiskers catching the lantern light.
  snout(-9, 0.6, 13, 8, C, { fill: tone(C.muzzle, -0.2) }) +
  stroke('M-12 -3 Q-17 -2.6 -21 -0.6', PAL.amber, 0.9, 0.6);

const staffArm =
  // Lantern glow.
  (() => {
    const g = radial([[0, PAL.amberL, 0.6], [0.5, PAL.amber, 0.22], [1, PAL.amber, 0]]);
    return g.def + `<circle cx="-30" cy="-19" r="17" fill="${g.url}" stroke="none"/>`;
  })() +
  // Chain from the staff's hook.
  `<ellipse cx="-30" cy="-37.4" rx="1.3" ry="2" fill="none" stroke="${PAL.iron}" stroke-width="1.3"/>` +
  `<ellipse cx="-30" cy="-34.6" rx="1.3" ry="2" fill="none" stroke="${PAL.ironL}" stroke-width="1.3"/>` +
  // Lantern: amber glass, flame, iron frame.
  (() => {
    const g = radial([[0, PAL.amberL], [0.55, PAL.amber], [1, PAL.ember]], 0.45, 0.55, 0.65);
    return g.def + `<path d="${GLASS}" fill="${g.url}" stroke="none"/>`;
  })() +
  `<path d="M-30 -25 Q-26.4 -20 -27.6 -16.2 Q-30 -13.4 -32.4 -16.2 Q-33.6 -20 -30 -25 Z" fill="${PAL.ember}" stroke="none" opacity="0.9"/>` +
  `<path d="M-30 -22 Q-28.4 -18.6 -29 -16.8 Q-30 -15.6 -31 -16.8 Q-31.6 -18.6 -30 -22 Z" fill="#fff6d6" stroke="none"/>` +
  stroke('M-35.4 -27 V-12', '#fff3d1', 1.2, 0.55) +
  `<path d="${GLASS}" fill="none" stroke="#2b2118" stroke-width="2.8" stroke-linejoin="round"/>` +
  stroke('M-33.4 -29 V-10 M-26.6 -29 V-10', '#2b2118', 1.6) +
  metal('M-39.4 -28.6 L-36 -33.6 L-24 -33.6 L-20.6 -28.6 Z', PAL.iron, '', { outline: 2.6, shadow: 1 }) +
  metal(rrect(-38.6, -11.4, 17.2, 4.6, 1.6), PAL.iron, '', { outline: 2.6, shadow: 1 }) +
  rivet(-35.6, -9.1, 0.9, PAL.ironL) +
  rivet(-24.4, -9.1, 0.9, PAL.ironL) +
  glint(-36, -31.6, 0.8) +
  // Gnarled staff with knots, grain, a rag tied on and an iron foot.
  litTube('M-17 43 Q-21 26 -17 14 Q-14 0 -19 -12 Q-23 -24 -17 -33 Q-14 -43 -24 -43 Q-31 -43 -30 -38', 4, PAL.woodD, { shadow: 1.3, light: 0.8, lightK: 0.35 }) +
  stroke('M-18.6 36 Q-20.6 26 -17.6 18 M-16 6 Q-15.4 0 -18 -7 M-20.6 -17 Q-21.6 -24 -18.4 -29', tone(PAL.woodD, -0.4), 0.8, 0.85) +
  lit(oval(-16, 2, 4), PAL.wood, { outline: 2.4, shadow: 1.4, light: 0.8 }) +
  `<ellipse cx="-16" cy="2" rx="1.6" ry="1.3" fill="${tone(PAL.wood, -0.45)}" stroke="none"/>` +
  lit(oval(-21, -19, 3.4), PAL.wood, { outline: 2.4, shadow: 1.2, light: 0.7 }) +
  `<ellipse cx="-21" cy="-19" rx="1.3" ry="1.1" fill="${tone(PAL.wood, -0.45)}" stroke="none"/>` +
  felt('M-21.4 -28.4 L-15.4 -27.4 L-15.8 -24.6 L-21.8 -25.6 Z', PAL.rust, '', { outline: 1.6, shadow: 0.7, light: 0.4 }) +
  felt('M-16.4 -26.6 L-11.6 -22 L-13 -20.8 L-17.2 -24.8 Z', PAL.rust, '', { outline: 1.6, shadow: 0.6, light: 0.4 }) +
  metal(rrect(-19.6, 38.6, 5.6, 5, 1.4), PAL.iron, '', { outline: 2, shadow: 0.8 }) +
  // Wide sleeve with a mustard cuff.
  litTube('M0 0 L-13 12', 10, PAL.plumL, { shadow: 3, light: 1.5 }) +
  stroke('M-15 6.2 L-7.4 14.2', PAL.mustard, 3) +
  seam('M-14.4 6.8 L-8 13.6', PAL.cream, 0.8, 0.8) +
  fold('M-3 2.4 L-9 7.6', PAL.plumL, 1.2, 0.7) +
  hand(-17, 15, 5, C.fur) +
  brassPin();

/** Hexer: a rat in a hooded plum robe, gnarled staff and amber lantern. */
export const hexerRig: CharacterRig = {
  parts: [
    // Bare tail trailing from under the robe.
    part('tail', 17, -11, 'legBack', [-6, -19, 36, 10], tail([0, 0], [12, 4], [24, 3], [29, -13], 6, 2.2, C.tail, { rings: true })),
    part(
      'armBack',
      8,
      -47,
      'armBack',
      [-14, -11, 17, 35],
      litTube('M0 0 L5 18', 9, PAL.plumD, { shadow: 2.8, light: 1.3 }) +
        stroke('M0.6 17.4 L9.4 15', PAL.mustardD, 2.4) +
        hand(6, 25, 4.6, C.furD),
    ),
    part('legBack', 8, -12, 'legBack', [-22, -10, 13, 15], litLeg(12, 7, PAL.plumD, PAL.woodD, 8)),
    part('legFront', -8, -12, 'legFront', [-22, -10, 13, 15], litLeg(12, 7, PAL.plumD, PAL.woodD, 8)),
    part('body', 0, -30, 'body', [-29, -32, 29, 31], robe),
    part('head', 0, -53, 'head', [-31, -37, 29, 19], hood),
    part('armFront', -8, -47, 'armFront', [-50, -58, 16, 56], staffArm),
  ],
};
