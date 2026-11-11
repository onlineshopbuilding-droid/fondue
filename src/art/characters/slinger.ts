import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, stroke, tone } from '../shade';
import { MOUSE, PAL, bead, blush, brassPin, brow, felt, fold, hand, litLeg, metal, mouseEar, oval, part, rim, rrect, seam, snout, tail } from './kit';

const C = MOUSE;

const TORSO = 'M-7 -18 Q-10 -7 -9 4 Q0 7 9 4 Q10 -7 7 -18 Q0 -21 -7 -18 Z';
const POUCH = 'M6 -2 L14 -2 L15 6 Q10 9 6 6 Z';
const CAP = 'M-12 -9 Q-12 -21 -1 -21 Q11 -21 11 -9 Z';
const TONGUE = '#d4766a';

/** Long leg; the front one gets a stitched knee patch. */
const slingLeg = (cloth: string, patch: boolean): string =>
  litLeg(
    32,
    5.5,
    cloth,
    PAL.sootD,
    6,
    fold('M-1.4 9 Q0.4 11 -1 14', cloth, 1, 0.7) +
      (patch ? felt(rrect(-3.4, 11, 6.4, 6, 1.4), PAL.wood, seam(rrect(-2.4, 12, 4.4, 4, 1), PAL.cream, 0.8, 0.85), { outline: 1.4, shadow: 0.9, light: 0.5 }) : ''),
  );

const body =
  felt(
    TORSO,
    PAL.forest,
    // Laced front, creases and a darker hem.
    stroke('M-1 -15 L1.6 -12.6 M1.6 -15 L-1 -12.6 M-1 -12 L1.6 -9.6 M1.6 -12 L-1 -9.6 M-1 -9 L1.6 -6.6 M1.6 -9 L-1 -6.6', PAL.creamD, 0.9, 0.9) +
      fold('M4 -14 Q6 -6 5 0', PAL.forest, 1.1, 0.7) +
      paint('M-12 2.6 Q0 6.6 12 2.6 V12 H-12 Z', PAL.forestD, 0.6) +
      seam('M-8.6 3.6 Q0 6.6 8.6 3.6', PAL.creamD, 0.9, 0.7) +
      rim('M-5.4 -18.6 Q0 -20.4 5.4 -18.6', 1.2, 0.4),
    { shadow: 3, light: 1.5 },
  ) +
  // Belt with an iron buckle.
  litTube('M-9 -1 Q0 2 9 -1', 2.2, PAL.woodD, { outline: 2, shadow: 0.7, light: 0.4 }) +
  metal(rrect(-3.4, -1.6, 3.6, 3.4, 0.7), PAL.ironL, '', { outline: 1.2, shadow: 0.6 }) +
  // Leather stone pouch with a flap, stitching and a brass stud.
  felt(POUCH, PAL.wood, seam('M7.2 4 Q10 6.4 13.8 4.4', PAL.cream, 0.9, 0.8) + stroke('M8 3 Q10 2 12.4 3', tone(PAL.wood, -0.3), 0.8, 0.7), {
    outline: 2.2,
    shadow: 1.6,
    light: 0.9,
  }) +
  felt('M5.4 -2.6 L14.6 -2.6 L14.6 1.4 Q10 3.6 5.4 1.4 Z', PAL.woodD, '', { outline: 1.8, shadow: 0.9, light: 0.6, lightK: 0.35 }) +
  lit(oval(10, 1.4, 1.2), PAL.mustard, { outline: 1, shadow: 0.5, light: 0.3 });

const head =
  // Neckerchief knotted at the front.
  felt('M-5.4 -1 Q0 3 5.4 -1 L5 4 Q0 7 -5 4 Z', PAL.rust, fold('M-3 3 Q0 4.6 3 3', PAL.rust, 0.9, 0.7), { outline: 2.4, shadow: 1, light: 0.6 }) +
  felt('M-6 3 L-9.4 9 L-5.6 8 L-4 4 Z', PAL.rust, '', { outline: 2, shadow: 0.8, light: 0.5 }) +
  // Far ear behind the cap.
  mouseEar(-8, -21.5, 6, C, { back: true }) +
  // Face.
  felt(oval(-1, -9, 10.5), C.fur, paint('M-12 -9 H11 V-6.6 Q-1 -7.6 -12 -6.6 Z', tone(C.fur, -0.3), 0.5), { shadow: 3.6, light: 1.7 }) +
  blush(-6.4, -1.4, 2.6, 1.8) +
  // Stitched ear flap of the cap.
  felt('M4 -11 L14 -11 L13 3 Q9 6 5 2 Z', PAL.woodD, seam('M6 -9 L12.2 -9 L11.6 1.2 Q9 3.4 6.6 1', PAL.creamD, 0.9, 0.8), { shadow: 1.6, light: 0.9, lightK: 0.3 }) +
  // Leather cap with panel seams, scuffs and a button.
  felt(
    CAP,
    PAL.wood,
    seam('M-6 -20 Q-3 -15 -3 -10', PAL.cream, 1, 0.85) +
      seam('M4 -20 Q6 -15 6 -10', PAL.cream, 1, 0.85) +
      stroke('M-9 -13 l2 -0.6 M1 -17 l1.6 0.4', tone(PAL.wood, -0.3), 0.8, 0.7) +
      rim('M-9.6 -13 Q-8.4 -19.4 -2 -20.2', 1.4, 0.55),
    { shadow: 2.4, light: 1.4 },
  ) +
  // Near ear, poking through a hole in the cap.
  mouseEar(6.5, -20.5, 7.5, C) +
  stroke('M0.8 -15.6 Q6 -12.8 12 -14.8', tone(PAL.wood, -0.45), 1.6, 0.9) +
  felt('M-11 -11 L-21 -7 L-11 -6 Z', PAL.woodD, '', { outline: 3, shadow: 1, light: 0.7, lightK: 0.35 }) +
  lit(rrect(-3, -22.4, 6, 3, 1.5), PAL.woodD, { outline: 1.8, shadow: 0.7, light: 0.4 }) +
  // Long pointed muzzle with a pink nose and whiskers.
  snout(-10.5, -0.6, 12, 7, C, { drop: 1.4 }) +
  // Aiming: front eye wide and focused, back eye squeezed shut.
  brow('M-11 -7.6 L-5.6 -6.4', 2) +
  bead(-8, -3.8, 1.9) +
  brow('M-4.2 -6.4 L0.8 -7.8', 2) +
  stroke('M-4 -3.6 Q-2 -4.8 0.2 -3.4', '#2b2118', 1.6) +
  // Tight mouth with the tongue poking out in concentration.
  stroke('M-9 5 Q-5.6 3.8 -2.4 4.4', '#2b2118', 1.8) +
  `<ellipse cx="-2.6" cy="5.4" rx="1.6" ry="1.2" fill="${TONGUE}" stroke="#2b2118" stroke-width="0.9"/>`;

const slingArm =
  // Y-fork: handle wrapped in leather, forked prongs with grain.
  litTube('M-26 7 L-26 -10', 2.6, PAL.wood, { outline: 2.6, shadow: 0.8, light: 0.5 }) +
  stroke('M-27.4 3.6 L-24.6 2.6 M-27.4 5.8 L-24.6 4.8', tone(PAL.woodD, -0.2), 1, 0.9) +
  litTube('M-26 -9 Q-35 -12 -35 -24', 2.6, PAL.wood, { outline: 2.6, shadow: 0.8, light: 0.5 }) +
  litTube('M-26 -9 Q-17 -12 -17 -24', 2.6, PAL.wood, { outline: 2.6, shadow: 0.8, light: 0.5 }) +
  stroke('M-29 -10.6 Q-33 -13 -33.6 -19 M-23 -10.6 Q-19 -13 -18.4 -19', tone(PAL.wood, -0.35), 0.7, 0.8) +
  // Rubber band, then the leather pouch with its stone.
  stroke('M-35 -25 L-10 -15 L-17 -25', '#2b2118', 3.4) +
  stroke('M-35 -25 L-10 -15 L-17 -25', PAL.rust, 1.8) +
  stroke('M-34.4 -25.6 L-11 -16.2', PAL.copperL, 0.6, 0.6) +
  felt('M-13 -18.6 Q-9 -20.8 -5.6 -16.6 Q-6.6 -11.4 -10.4 -11.8 Q-13.6 -13 -13 -18.6 Z', PAL.woodD, '', { outline: 2, shadow: 1, light: 0.6, lightK: 0.35 }) +
  lit(oval(-9.4, -16.4, 3), PAL.ashL, { outline: 1.6, shadow: 1.1, light: 0.6 }) +
  glint(-10.4, -17.6, 0.7) +
  // Small leather ties at the prong tips.
  `<rect x="-36.6" y="-23.2" width="3.2" height="2" rx="0.6" fill="${PAL.cream}" stroke="#2b2118" stroke-width="0.9"/>` +
  `<rect x="-18.6" y="-23.2" width="3.2" height="2" rx="0.6" fill="${PAL.cream}" stroke="#2b2118" stroke-width="0.9"/>` +
  // Sleeve with a cuff, hand gripping the fork.
  litTube('M0 0 L-22 -2', 4.5, PAL.forest, { shadow: 1.5, light: 0.8 }) +
  stroke('M-19 -4.8 L-19.4 0.6', tone(PAL.forest, -0.38), 1.4, 0.9) +
  hand(-26, -2, 5, C.fur) +
  brassPin(0, 0, 2.5);

/** Slinger: a long, thin mouse in a leather cap, sighting along a slingshot. */
export const slingerRig: CharacterRig = {
  parts: [
    part('tail', 6, -31, 'legBack', [-6, -15, 35, 15], tail([0, 0], [12, 10], [25, 8], [28, -8], 5.6, 2.4, C.tail)),
    part(
      'armBack',
      4,
      -46,
      'armBack',
      [-10, -15, 24, 16],
      litTube('M0 0 L13 6 L6 -4', 4.5, PAL.forestD, { shadow: 1.5, light: 0.8 }) + hand(5, -6, 4.4, C.furD),
    ),
    part('legBack', 5, -32, 'legBack', [-17, -10, 12, 35], slingLeg(PAL.woodD, false)),
    part('legFront', -4, -32, 'legFront', [-17, -10, 12, 35], slingLeg(PAL.mustardD, true)),
    part('body', 0, -32, 'body', [-14, -25, 19, 12], body),
    part('head', 0, -50, 'head', [-32, -33, 19, 18], head),
    part('armFront', -3, -44, 'armFront', [-46, -34, 10, 17], slingArm),
  ],
};
