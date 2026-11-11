import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, stroke, tone } from '../shade';
import { MOUSE, PAL, bead, blush, brassPin, brow, felt, fold, hand, litLeg, metal, mouseEar, oval, part, paw, rim, rivet, rope, rrect, seam, snout, tail } from './kit';

/** Under the saucepan: a field mouse. */
const C = MOUSE;

const TORSO = 'M-12 -26 Q-20 -10 -19 3 Q0 10 19 3 Q20 -10 12 -26 Q0 -31 -12 -26 Z';
const POT = 'M-16 -14 L-14 -27 Q-1 -31 12 -27 L14 -14 Z';
const LADLE = 'M-34 -27 L-14 -27 Q-14 -14 -24 -14 Q-34 -14 -34 -27 Z';
const STEW = '#7a4526';

const torso =
  felt(
    TORSO,
    PAL.teal,
    // Hem band and its running stitch.
    paint('M-22 0 Q0 9 22 0 V14 H-22 Z', PAL.tealD, 0.55) +
      seam('M-19 1.6 Q0 9 19 1.6', PAL.creamD, 1.1, 0.8) +
      fold('M9 -24 Q13 -12 12 -1', PAL.teal) +
      fold('M-3 -15 Q-5 -8 -4 -2', PAL.teal, 1.1, 0.6) +
      fold('M15 -8 Q16 -4 15 0', PAL.teal, 1.1, 0.6) +
      rim('M-10 -27 Q0 -30 10 -27', 1.6, 0.4),
    { shadow: 5, light: 2.2 },
  ) +
  // Mustard patch, sewn on with cross stitches.
  felt('M4 -18 L13 -19 L14 -10 L5 -9 Z', PAL.mustard, seam('M5.6 -16.8 L12 -17.6 L12.6 -11 L6.4 -10.4 Z', PAL.cream, 1, 0.9), {
    outline: 1.8,
    shadow: 1.6,
    light: 0.9,
  }) +
  // Small rust patch on the hem.
  felt('M8 -1 L15 -2 L15.6 4.5 L8.6 5.5 Z', PAL.rust, seam('M9.4 0.2 L14 -0.6', PAL.cream, 1, 0.85), { outline: 1.8, shadow: 1.4, light: 0.8 }) +
  // Rope belt with an iron ring.
  rope([-18.5, -5], [0, 1.4], [18.5, -5], 3.2, PAL.creamD, 2) +
  lit(oval(0.5, -2.6, 4), PAL.ironL, { outline: 2, shadow: 1.4, light: 0.8 }) +
  paint(oval(0.5, -2.6, 1.9), PAL.tealD) +
  stroke('M-1.2 -4.6 Q0.5 -5.5 2.2 -4.6', '#fff3d1', 0.9, 0.7) +
  // Knotted rope ends hanging off the ring.
  rope([2, 0], [3.5, 4], [2.4, 8], 2.4, PAL.creamD, 1.6) +
  rope([-1, 0.4], [-2.4, 3.8], [-1.2, 7], 2.4, PAL.creamD, 1.6);

const head =
  // Far ear, peeking over the pot.
  mouseEar(-8, -31, 7.5, C, { back: true }) +
  // Furry face with a paler jaw and the shadow the pot rim casts.
  felt(
    oval(-1, -8, 13),
    C.fur,
    paint('M-15 -2 Q-8 7 2 6 Q9 3 12 -3 Q4 2 -3 1.4 Q-10 1 -15 -2 Z', C.muzzle, 0.7) +
      paint('M-20 -11.5 H20 V-8.6 Q0 -9.6 -20 -8.8 Z', tone(C.fur, -0.36), 0.6),
    { shadow: 4.5, light: 2 },
  ) +
  blush(-5.5, -0.6, 3.2, 2.2, 0.26) +
  // Pan handle with an iron strap and a hanging hole.
  litTube('M14 -15.5 L32 -21', 3.8, PAL.woodD, { shadow: 1.2, light: 0.7 }) +
  stroke('M20 -18.4 L26 -20.2', tone(PAL.woodD, -0.35), 0.9, 0.8) +
  `<circle cx="30.4" cy="-20.4" r="1.1" fill="${PAL.sootD}" stroke="none"/>` +
  metal(rrect(12, -19, 6, 5, 1.2), PAL.iron, '', { outline: 1.6, shadow: 0.8 }) +
  rivet(15, -16.6, 0.9, PAL.ironL) +
  // The copper saucepan helmet: sheen, a soot-burnt bottom, dents and a glint.
  metal(
    POT,
    PAL.copper,
    paint('M-17 -32 H15 V-27.3 Q-1 -30.2 -17 -27.6 Z', PAL.sootD, 0.42) +
      stroke('M-10.6 -26 Q-9.8 -20 -10.8 -15', PAL.copperL, 2.4, 0.85) +
      stroke('M-6.8 -26.6 Q-6.4 -22 -6.9 -18', PAL.copperL, 1, 0.55) +
      // Two shallow dents: a shadowed dip with light catching its lower lip.
      paint(oval(3, -22.6, 2.4, 1.6), tone(PAL.copper, -0.3), 0.7) +
      stroke('M1.2 -21.4 Q3 -20.6 4.8 -21.6', PAL.copperL, 0.9, 0.7) +
      paint(oval(-3, -18.8, 1.6, 1.1), tone(PAL.copper, -0.3), 0.6),
    { shadow: 2.6 },
  ) +
  glint(-10, -24.6, 1.1) +
  // Near ear: too big for the pot, so it sticks out at the back.
  mouseEar(12.5, -25.5, 9, C) +
  // Rolled rim of the pan.
  metal(
    rrect(-20, -17, 38, 6, 3),
    PAL.rustD,
    stroke('M-17 -15.8 H14', PAL.copperL, 1.2, 0.7) + stroke('M-16 -12.2 H15', tone(PAL.rustD, -0.35), 1.2, 0.7),
    { shadow: 1.4 },
  ) +
  glint(-15.5, -15.2, 0.9) +
  // Brows pulled down in a scowl.
  brow('M-13 -9.6 L-6.8 -7.9', 2.2) +
  brow('M-4.4 -7.9 L1.6 -9.6', 2.2) +
  bead(-9, -5.4, 2.1) +
  bead(-1, -5.4, 2.1) +
  // Grumpy mouth tucked under the muzzle.
  stroke('M-9.6 5 Q-5 3 -0.8 4.6', '#2b2118', 2) +
  // Pointed muzzle with a pink nose, buck teeth and whiskers.
  snout(-10, -2.4, 12, 9.5, C, { teeth: true });

const ladleArm =
  // Iron ladle: long handle with a hook, a bowl full of stew.
  litTube('M-8 28 L-17 -26', 3, PAL.ironL, { shadow: 1, light: 0.6 }) +
  litTube('M-8.2 27 Q-6.2 32 -9.6 33', 2.4, PAL.ironL, { outline: 2.6, shadow: 0.8, light: 0.5 }) +
  stroke('M-15.6 -18 L-10.4 13', '#fff3d1', 0.8, 0.55) +
  metal(LADLE, PAL.iron, paint('M-36 -27 H-12 V-24 Q-24 -25.5 -36 -24 Z', PAL.ironL, 0.35), { shadow: 2.6 }) +
  // A drip of stew down the side of the bowl.
  `<path d="M-31.6 -26 Q-30.2 -22 -31 -19.4 Q-32.4 -19.6 -32.2 -21.6 Z" fill="${STEW}" stroke="none"/>` +
  glint(-29.6, -21.4, 1.2) +
  // Rim seen from above: dark inside, stew surface with a pea and a carrot bit.
  `<ellipse cx="-24" cy="-27" rx="10" ry="3.2" fill="${tone(PAL.iron, -0.4)}" stroke="#2b2118" stroke-width="2.4"/>` +
  `<ellipse cx="-23.6" cy="-26.5" rx="8" ry="2.1" fill="${STEW}" stroke="none"/>` +
  `<circle cx="-27" cy="-26.8" r="1.1" fill="${PAL.forest}" stroke="none"/>` +
  `<circle cx="-21" cy="-26.2" r="1" fill="${PAL.ember}" stroke="none"/>` +
  stroke('M-30 -27.4 Q-25 -28.6 -20 -27.8', '#fff3d1', 0.8, 0.5) +
  // Sleeve with a cuff seam and an elbow seam.
  litTube('M0 0 L-7 14', 8, PAL.teal, { shadow: 2.6, light: 1.3 }) +
  stroke('M-9.4 9.4 L-2.2 13', tone(PAL.teal, -0.35), 1.6, 0.9) +
  seam('M-2.6 -1.4 L-8.6 10.6', PAL.creamD, 1, 0.6) +
  paw(-9, 18, 6, C.fur, C) +
  // Fingers wrapped round the handle.
  stroke('M-14.4 16 Q-11 17.4 -7.6 15.8', tone(C.fur, -0.38), 1.1, 0.85) +
  brassPin();

/** Pothelm: a stumpy mouse with a copper saucepan for a helmet and a ladle for a club. */
export const gruntRig: CharacterRig = {
  parts: [
    // The tail swings against the stride and whips about when the mouse is held.
    part('tail', 13, -22, 'legBack', [-6, -20, 36, 12], tail([0, 0], [13, 7], [28, 3], [28, -13], 6.2, 2.8, C.tail)),
    part(
      'armBack',
      10,
      -41,
      'armBack',
      [-13, -11, 13, 31],
      litTube('M0 0 L-1 15', 8, PAL.tealD, { shadow: 2.4, light: 1.2 }) +
        stroke('M-5 11.6 L3.2 11.8', tone(PAL.tealD, -0.35), 1.5, 0.9) +
        hand(-1, 19, 5.5, C.furD),
    ),
    part('legBack', 7, -20, 'legBack', [-21, -12, 15, 23], litLeg(20, 9, PAL.rustD, PAL.woodD)),
    part('legFront', -6, -20, 'legFront', [-21, -12, 15, 23], litLeg(20, 9, PAL.rust, PAL.woodD)),
    part('body', 0, -20, 'body', [-25, -35, 25, 15], torso),
    part('head', 0, -45, 'head', [-32, -43, 40, 15], head),
    part('armFront', -7, -41, 'armFront', [-42, -38, 14, 38], ladleArm),
  ],
};
