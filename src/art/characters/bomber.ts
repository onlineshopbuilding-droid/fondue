// The Keg Hauler as a felt-puppet rig: its drawn parts and the joints they turn on.
// The animation that moves these parts lives in src/render/enemyView.ts.
import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, radial, stroke, tone } from '../shade';
import { PAL, RAT, bead, blush, brassPin, brow, felt, fold, hand, litLeg, metal, mouseEar, oval, part, rim, rivet, rrect, seam, snout, tail } from './kit';

/** Heavy lifting is rat work. */
const C = RAT;

const BARREL = 'M-14 -22 Q-23 0 -14 22 L14 22 Q23 0 14 -22 Z';
const TORSO = 'M-14 -26 Q-23 -12 -20 3 Q0 9 20 3 Q23 -12 14 -26 Q0 -31 -14 -26 Z';
const HELMET = 'M-15 -17 Q-14 -31 -1 -31 Q13 -31 13 -17 Z';
const BEARD = 'M-17 1 Q-10 -3.5 -4 -0.5 Q2 -3.5 7.5 1.5 Q5 9.5 -3 8.5 Q-12 10.5 -17 1 Z';
const MOUTH = 'M-12.4 2.6 Q-6.4 7.4 0.4 2.8 Q-6 4.6 -12.4 2.6 Z';

const hoop = (d: string): string => metal(d, PAL.iron, '', { outline: 3, shadow: 1.4 });

const keg =
  // Glow of the burning fuse.
  (() => {
    const g = radial([[0, PAL.amberL, 0.75], [0.45, PAL.amber, 0.3], [1, PAL.amber, 0]]);
    return g.def + `<circle cx="3" cy="-38" r="11" fill="${g.url}" stroke="none"/>`;
  })() +
  felt(
    BARREL,
    PAL.wood,
    // Staves, grain and a knot.
    stroke('M-6 -22 Q-9 0 -6 22 M6 -22 Q9 0 6 22 M-11.5 -22 Q-17 0 -11.5 22 M11.5 -22 Q17 0 11.5 22', tone(PAL.wood, -0.42), 1.5, 0.95) +
      stroke('M-2 -21 Q-3.6 -10 -2.4 -2 M2.6 4 Q3.8 12 2.6 21 M-9 -6 Q-11 0 -9.6 8 M9.2 -20 Q10.6 -16 10.2 -9', tone(PAL.wood, -0.25), 0.8, 0.8) +
      paint(oval(-9, 12, 1.5, 2.2), tone(PAL.wood, -0.38)) +
      stroke('M-11.4 12 Q-9 8 -6.8 12', tone(PAL.wood, -0.25), 0.8, 0.8) +
      // Painted flame mark: this keg is not for drinking.
      `<path d="M0 -5.4 Q4.4 -0.6 2.8 3.4 Q0.4 5.8 -2.6 3.6 Q-4.4 0.2 -1.2 -2.4 Q-0.8 0.6 0.4 0.8 Q1.4 -2 0 -5.4 Z" fill="${PAL.cream}" stroke="none" opacity="0.88"/>` +
      `<path d="M0.2 0 Q2 1.8 1 3.4 Q-0.6 4.2 -1.4 2.8 Q-0.8 1.6 0.2 0 Z" fill="${PAL.ember}" stroke="none" opacity="0.9"/>`,
    { shadow: 6, light: 2.4 },
  ) +
  // Iron hoops follow the barrel's bulge.
  hoop('M-18 -14 Q0 -12 18 -14 L20 -7 Q0 -5 -20 -7 Z') +
  hoop('M-20 7 Q0 9 20 7 L18 14 Q0 16 -18 14 Z') +
  rivet(-14, -10.2, 1.2, PAL.ironL) +
  rivet(14.5, -10.2, 1.2, PAL.ironL) +
  rivet(-14.5, 10.8, 1.2, PAL.ironL) +
  rivet(14, 10.8, 1.2, PAL.ironL) +
  glint(-16, -12, 0.9) +
  glint(-17.4, 8.8, 0.9) +
  // Lid with planks and the bung the fuse runs from.
  felt(oval(0, -22, 14, 4), PAL.woodD, stroke('M-6 -26 L-7 -18 M5 -26 L6 -18', tone(PAL.woodD, -0.4), 1, 0.8) + rim('M-12 -23.4 Q0 -26.6 12 -23.4', 1, 0.45), {
    outline: 3,
    shadow: 1.4,
    light: 0.8,
  }) +
  `<ellipse cx="0" cy="-23" rx="2.6" ry="1.2" fill="${PAL.sootD}" stroke="#2b2118" stroke-width="1"/>` +
  // Twisted fuse cord, singed near the spark.
  litTube('M0 -23.6 Q9 -30 3 -36', 2.2, PAL.creamD, { outline: 2.4, shadow: 0.6, light: 0.4 }) +
  stroke('M1.6 -25 l1.2 -0.9 M4.2 -26.4 l1.2 -0.6 M6.4 -28.4 l1 -0.4 M7 -31 l0.8 0.4 M5.8 -33.4 l0.5 0.8', tone(PAL.creamD, -0.45), 0.9, 0.9) +
  stroke('M4.6 -34.2 Q3.8 -35.4 3 -36', PAL.sootD, 2.2) +
  // The spark itself, with a few flying embers.
  `<path d="M3 -44 L5.5 -39.5 L10.5 -39 L6.5 -35.5 L7.5 -31 L3 -33.5 L-1.5 -31 L-0.5 -35.5 L-4.5 -39 L0.5 -39.5 Z" fill="${PAL.ember}" stroke="#2b2118" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M3 -41.2 L4.4 -38.6 L7.4 -38.2 L5 -36.2 L5.6 -33.6 L3 -35 L0.4 -33.6 L1 -36.2 L-1.4 -38.2 L1.6 -38.6 Z" fill="${PAL.amber}" stroke="none"/>` +
  `<circle cx="3" cy="-37" r="1.8" fill="${PAL.amberL}" stroke="none"/>` +
  `<circle cx="-5.6" cy="-45" r="0.9" fill="${PAL.amberL}" stroke="none"/>` +
  `<circle cx="11.6" cy="-44.6" r="0.8" fill="${PAL.amber}" stroke="none"/>` +
  `<circle cx="12.6" cy="-33.4" r="0.7" fill="${PAL.amberL}" stroke="none"/>`;

const torso =
  felt(
    TORSO,
    PAL.rust,
    // Hem, soot smudge, creases.
    paint('M-24 0 Q0 9 24 0 V14 H-24 Z', PAL.rustD, 0.5) +
      seam('M-20 1.4 Q0 8.6 20 1.4', PAL.copperL, 1.1, 0.75) +
      paint('M-14 -15 Q-10 -20 -4.6 -18 Q-2.6 -11 -8.4 -8.4 Q-13.6 -9 -14 -15 Z', PAL.sootD, 0.45) +
      paint('M-11 -14.6 Q-9 -16.4 -7 -15.6 Q-6.4 -12.6 -8.6 -11.4 Q-10.8 -11.8 -11 -14.6 Z', PAL.sootD, 0.35) +
      fold('M10 -24 Q15 -12 13 -2', PAL.rust) +
      fold('M-5 -6 Q-6 -2 -5 1', PAL.rust, 1.1, 0.6) +
      rim('M-12 -27 Q0 -30 12 -27', 1.6, 0.4),
    { shadow: 5.5, light: 2.2 },
  ) +
  // Patch over a scorch hole.
  felt('M8.6 -13.4 L15.6 -14 L16 -7 L9 -6.4 Z', PAL.copper, seam('M10 -12.2 L14.4 -12.6 L14.6 -8.2 L10.4 -7.8 Z', PAL.cream, 1, 0.9), {
    outline: 1.8,
    shadow: 1.4,
    light: 0.8,
  }) +
  // Bandolier strap with fuse coil and brass loops.
  litTube('M11 -28 Q0 -14 -18 -6', 4, PAL.woodD, { outline: 2.2, shadow: 1.2, light: 0.7 }) +
  seam('M10.2 -26.4 Q0 -14.4 -16.6 -7.2', tone(PAL.woodD, 0.35), 0.8, 0.8) +
  lit(rrect(1.8, -19.6, 3.4, 3.4, 0.8), PAL.mustard, { outline: 1.3, shadow: 0.8, light: 0.5 }) +
  lit(rrect(-6.2, -14.6, 3.4, 3.4, 0.8), PAL.mustard, { outline: 1.3, shadow: 0.8, light: 0.5 }) +
  // Belt with a brass buckle.
  litTube('M-19.5 -2 Q0 4 19.5 -2', 3.6, PAL.woodD, { outline: 2.2, shadow: 1.1, light: 0.7 }) +
  lit(rrect(-4.2, -3.2, 8.4, 8.4, 1.6), PAL.mustard, { outline: 2, shadow: 1.6, light: 1 }) +
  paint(rrect(-2, -1, 4, 4, 0.6), PAL.woodD) +
  stroke('M-2 1 H1.4', PAL.ironL, 1.1) +
  glint(-2.6, -1.8, 0.8);

const head =
  // Far ear behind the cap.
  mouseEar(-9, -31, 6.5, C, { back: true }) +
  // Face, sooty from the last bang.
  felt(
    oval(-1, -11, 14),
    C.fur,
    paint('M3 -13 Q9 -13 10 -7 Q6 -3 2 -6 Z', PAL.sootD, 0.4) +
      paint('M-14 -3 Q-9 -6.4 -5.6 -2.6 Q-9 -0.6 -14 -3 Z', PAL.sootD, 0.3) +
      paint('M-20 -17 H20 V-13.6 Q0 -14.8 -20 -13.4 Z', tone(C.fur, -0.3), 0.5),
    { shadow: 5, light: 2.2 },
  ) +
  blush(-6.2, -3.8, 3.6, 2.4) +
  // Felt hard cap with a riveted crest and panel stitching.
  felt(
    HELMET,
    PAL.mustard,
    seam('M-7 -29.6 Q-8.6 -24 -8 -19', PAL.cream, 1.2, 0.85) +
      seam('M4 -29.8 Q5.4 -24 5 -19', PAL.cream, 1.2, 0.85) +
      paint('M-4 -33 Q2 -27 3 -17 L18 -17 V-33 Z', PAL.sootD, 0.18) +
      rim('M-11 -24 Q-9 -29.6 -2 -30.2', 1.6, 0.6),
    { shadow: 3, light: 1.8 },
  ) +
  litTube('M-1 -31.2 L-1 -18.6', 2.6, PAL.mustardD, { outline: 1.6, shadow: 0.8, light: 0.5 }) +
  rivet(-1, -27.6, 0.9, PAL.ironL) +
  rivet(-1, -22.6, 0.9, PAL.ironL) +
  // Near ear, poking out between cap and brim.
  mouseEar(12.5, -26.5, 7.5, C) +
  // Brim.
  felt(rrect(-17.5, -20, 32.5, 6.2, 3.1), PAL.mustardD, seam('M-15 -17 H12.6', PAL.cream, 1, 0.7) + rim('M-15 -19 H12', 1, 0.45), {
    outline: 3.2,
    shadow: 1.6,
    light: 1,
  }) +
  // Wild eyes under singed, cocked brows.
  `<circle cx="-9" cy="-8" r="3.5" fill="${PAL.cream}" stroke="#2b2118" stroke-width="1.4"/>` +
  `<circle cx="-1" cy="-8" r="3.5" fill="${PAL.cream}" stroke="#2b2118" stroke-width="1.4"/>` +
  bead(-10, -7.8, 1.8) +
  bead(-2, -7.8, 1.8) +
  brow('M-12.4 -11.4 Q-9.6 -14 -6.6 -12', 2) +
  brow('M-3.6 -12.4 Q-1.2 -13.6 1.6 -12.6', 2) +
  // Bushy beard with a gap-toothed grin.
  felt(
    BEARD,
    PAL.ashD,
    stroke('M-14 2.4 Q-12 6 -9.6 7.6 M-6 6.6 Q-4.6 8.4 -2 8 M2 4.6 Q4 6 5.4 4.4', PAL.ashL, 1, 0.8) +
      stroke('M-15 0.8 Q-11 -1.6 -6 0.4 M0 -0.6 Q3 -0.8 6 1.4', PAL.ashL, 1, 0.65),
    { outline: 3, shadow: 1.6, light: 1, lightK: 0.25 },
  ) +
  paint(MOUTH, '#3a1d18') +
  `<path d="M-11 3.3 Q-6.4 5.4 -0.8 3.4 L-1.4 4.6 Q-6.4 6.4 -10.6 4.4 Z" fill="${PAL.cream}" stroke="none"/>` +
  stroke('M-7.4 4.6 V6 M-4.4 4.6 V5.8', '#3a1d18', 0.9) +
  `<path d="${MOUTH}" fill="none" stroke="#2b2118" stroke-width="1.3" stroke-linejoin="round"/>` +
  // Long rat snout over the beard, sooty on top, whiskers hanging into the beard.
  snout(-13.5, -1.8, 14, 9, C) +
  paint('M-22 -5.4 Q-19 -6.6 -16 -5.6 Q-19 -4 -22 -5.4 Z', PAL.sootD, 0.4);

const fistArm =
  litTube('M0 0 L-13 -5 L-20 -14', 9, PAL.rust, { shadow: 2.8, light: 1.4 }) +
  // Rolled cuff and an elbow patch.
  stroke('M-21.6 -8.4 L-14 -14.4', tone(PAL.rust, -0.36), 2.4, 0.95) +
  stroke('M-21.2 -9.8 L-14.6 -15', '#fff3d1', 0.9, 0.35) +
  felt(oval(-12.6, -4.6, 3.4, 2.8), PAL.copper, seam(oval(-12.6, -4.6, 2.1, 1.6), PAL.cream, 0.9, 0.85), { outline: 1.5, shadow: 0.9, light: 0.6 }) +
  // Raised fist with knuckles.
  hand(-22, -18, 7, C.fur) +
  stroke('M-27.6 -20.6 Q-26.2 -23.2 -23.6 -23.4 M-26 -16.6 Q-24.2 -19.6 -21.2 -19.6', tone(C.fur, -0.38), 1.1, 0.75) +
  brassPin();

/** Keg Hauler: a stocky rat, with soot smudges and a fused keg strapped to its back. */
export const bomberRig: CharacterRig = {
  parts: [
    part(
      'armBack',
      12,
      -44,
      'armBack',
      [-14, -11, 14, 31],
      litTube('M0 0 L1 15', 9, PAL.rustD, { shadow: 2.6, light: 1.3 }) + stroke('M-3.6 12.6 L5.8 12.4', tone(PAL.rustD, -0.35), 2, 0.9) + hand(1, 20, 6, C.furD),
    ),
    part('keg', 23, -37, 'static', [-28, -54, 28, 30], keg),
    // Bare ringed tail, hanging out under the keg.
    part('tail', 12, -19, 'legBack', [-6, -14, 42, 15], tail([0, 0], [12, 9], [30, 8], [35, -8], 6.5, 2.4, C.tail, { rings: true })),
    part('legBack', 8, -20, 'legBack', [-24, -13, 17, 23], litLeg(20, 11, PAL.woodD, PAL.sootD)),
    part('legFront', -7, -20, 'legFront', [-24, -13, 17, 23], litLeg(20, 11, PAL.forestD, PAL.sootD)),
    part('body', 0, -22, 'body', [-26, -35, 26, 13], torso),
    part('head', 0, -47, 'head', [-36, -42, 24, 18], head),
    part('armFront', -11, -43, 'armFront', [-40, -36, 14, 14], fistArm),
  ],
};
