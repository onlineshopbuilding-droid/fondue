import type { CharacterRig } from '../types';
import { lit, litTube, paint, stroke, tone } from '../shade';
import { MOUSE, PAL, blush, brassPin, felt, fold, hand, metal, mouseEar, oval, part, rim, rivet, rrect, seam, snout, tail } from './kit';

const C = MOUSE;

const TORSO = 'M-9 -17 Q-14 -6 -12 3 Q0 7 12 3 Q14 -6 9 -17 Q0 -20 -9 -17 Z';
const VEST = 'M3 -17 Q9 -17 10 -16 Q13 -6 11 2 Q7 4.5 3 5 Z';
const BOOT = 'M-8 5 L-8 13 L-24 13 Q-25 6 -18 5 Z';

/** Tucked leg: shaded trousers and a boot with sole, cuff and shine; `patch` adds a knee patch. */
function tucked(cloth: string, boot: string, patch = false): string {
  const dark = tone(boot, -0.42);
  return (
    litTube('M0 0 Q-15 -5 -13 7', 7.5, cloth, { shadow: 2.4, light: 1.2 }) +
    (patch
      ? felt(oval(-10.4, -1.4, 3, 2.6), PAL.mustard, seam(oval(-10.4, -1.4, 1.8, 1.5), PAL.cream, 0.9, 0.85), { outline: 1.5, shadow: 0.9, light: 0.6 })
      : '') +
    felt(
      BOOT,
      boot,
      paint('M-27 10.8 H-6 V15 H-27 Z', dark) +
        paint('M-20 4 H-6 V7.2 H-20 Z', tone(boot, 0.2)) +
        stroke('M-11.2 10.8 Q-12 8.4 -15 7.6', dark, 1.1, 0.8) +
        stroke('M-22.6 9.2 Q-20.6 7.6 -18.4 8.4', '#fff3d1', 1.3, 0.5),
      { shadow: 2, light: 1.2, lightK: 0.32 },
    )
  );
}

/** Pogo spring as a real coil: back strands darker and behind the pole, front strands on top. */
function spring(front: boolean): string {
  let d = '';
  const turns = 4;
  const steps = turns * 24;
  let pen = false;
  for (let i = 0; i <= steps; i++) {
    const t = (i / 24) * Math.PI * 2;
    const x = -7 * Math.cos(t);
    const y = 4.5 + (19 * i) / steps + 1.5 * Math.sin(t);
    const isFront = Math.sin(t + Math.PI / 24) > 0;
    if (isFront === front) {
      d += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
      pen = true;
    } else {
      if (pen) d += `L${x.toFixed(2)} ${y.toFixed(2)} `;
      pen = false;
    }
  }
  return front
    ? litTube(d, 2.4, PAL.mustard, { outline: 1.8, shadow: 0.8, light: 0.6, lightK: 0.45 })
    : litTube(d, 2, tone(PAL.mustardD, -0.15), { outline: 1.6, shadow: 0, light: 0 });
}

const stick =
  spring(false) +
  // Iron pole with a long highlight.
  litTube('M0 -24 L0 8', 3, PAL.iron, { shadow: 1, light: 0.6 }) +
  stroke('M-0.6 -21 V6', PAL.ironL, 0.9, 0.9) +
  spring(true) +
  // Rubber foot with tread.
  felt(rrect(-5, 23, 10, 5, 2), PAL.rustD, stroke('M-3 26.6 v1.6 M0 26.6 v1.6 M3 26.6 v1.6', '#2b2118', 0.9, 0.7), { shadow: 1.2, light: 0.7 }) +
  // Wooden foot pegs with iron caps.
  litTube('M-15 -2 L13 -2', 2.6, PAL.wood, { outline: 2.6, shadow: 0.8, light: 0.5 }) +
  stroke('M-12 -2.4 H-6 M4 -2.4 H10', tone(PAL.wood, -0.35), 0.7, 0.8) +
  lit(rrect(-17, -4.2, 3, 4.4, 1), PAL.ironL, { outline: 1.5, shadow: 0.7, light: 0.4 }) +
  lit(rrect(12, -4.2, 3, 4.4, 1), PAL.ironL, { outline: 1.5, shadow: 0.7, light: 0.4 }) +
  // Handlebar with leather-wrapped grips and an iron clamp.
  litTube('M-16 -24 L8 -24', 3.5, PAL.rust, { shadow: 1.1, light: 0.6 }) +
  stroke('M-15 -25.8 l1 3.6 M-12.6 -25.8 l1 3.6 M-10.2 -25.8 l1 3.6 M3.4 -25.8 l1 3.6 M5.8 -25.8 l1 3.6', tone(PAL.rust, -0.42), 0.9, 0.9) +
  metal(rrect(-2.6, -26.6, 5.2, 5.2, 1), PAL.iron, '', { outline: 1.6, shadow: 0.8 }) +
  rivet(0, -24, 0.9, PAL.ironL);

const body =
  felt(
    TORSO,
    PAL.cream,
    // Rust stripes follow the round of the belly.
    paint('M-14 -11.4 Q0 -9.4 14 -11.4 L14 -6.4 Q0 -4.4 -14 -6.4 Z', PAL.rust) +
      paint('M-14 -2.4 Q0 -0.4 14 -2.4 L14 2.4 Q0 4.4 -14 2.4 Z', PAL.rust) +
      stroke('M-12 -6.6 Q-6 -5.2 0 -5', tone(PAL.rust, -0.3), 1, 0.6) +
      // Green vest with its own shading, an edge seam and a button.
      `<path d="${VEST}" fill="${PAL.forest}" stroke="none"/>` +
      paint('M8 -18 Q14 -6 12 4 L8 6 Q11 -4 8 -18 Z', PAL.forestD, 0.75) +
      seam('M4.4 -15.6 L4.4 3.4', PAL.mustard, 1, 0.8) +
      stroke('M3 -17 L3 5', '#2b2118', 2),
    { shadow: 3.2, light: 1.6 },
  ) +
  lit(oval(5.8, -8, 1.3), PAL.mustard, { outline: 1, shadow: 0.5, light: 0.3 }) +
  fold('M-6 -15 Q-8 -10 -7 -6', PAL.cream, 1, 0.5);

const head =
  // Bandana tails with folds and polka dots.
  felt(
    'M12 -13 L28 -21 L23 -12 L30 -5 L12 -8 Z',
    PAL.forestD,
    stroke('M15 -11.4 L24.6 -16.4 M15 -9 L25.4 -7', tone(PAL.forestD, -0.35), 1, 0.8) +
      `<circle cx="20" cy="-15" r="1" fill="${PAL.cream}" stroke="none" opacity="0.85"/><circle cx="22" cy="-8.4" r="1" fill="${PAL.cream}" stroke="none" opacity="0.85"/>`,
    { shadow: 1.8, light: 1 },
  ) +
  // Far ear behind the bandana.
  mouseEar(-7, -22.5, 6.5, C, { back: true }) +
  // Face.
  felt(oval(-1, -8.5, 12), C.fur, paint('M-15 -1 Q-6 6 6 1 L8 6 H-15 Z', tone(C.fur, -0.12), 0.6), { shadow: 4, light: 1.8 }) +
  blush(-5.6, 0.6, 2.8, 1.8) +
  // Bandana cap, dotted, knotted at the back.
  felt(
    'M-13 -11 Q-14 -21 0 -21 Q12 -21 12 -9 Q0 -15 -13 -11 Z',
    PAL.forest,
    `<circle cx="-7" cy="-16" r="1.1" fill="${PAL.cream}" stroke="none" opacity="0.85"/>` +
      `<circle cx="-1" cy="-18.4" r="1.1" fill="${PAL.cream}" stroke="none" opacity="0.85"/>` +
      `<circle cx="5" cy="-16.4" r="1.1" fill="${PAL.cream}" stroke="none" opacity="0.85"/>` +
      `<circle cx="-2" cy="-14" r="1" fill="${PAL.cream}" stroke="none" opacity="0.85"/>` +
      rim('M-11 -14 Q-10 -19.4 -2 -20.2', 1.3, 0.55),
    { shadow: 2.2, light: 1.3 },
  ) +
  // Near ear, poking through the bandana.
  mouseEar(7.5, -20.5, 8, C) +
  stroke('M1.6 -15.4 Q7 -12.4 13 -14.4', tone(PAL.forest, -0.4), 1.6, 0.9) +
  lit(oval(12, -11, 2.6, 3), PAL.forestD, { outline: 2, shadow: 0.9, light: 0.6 }) +
  // Black mask with a sheen; heavy lids give the sly look.
  felt('M-15 -11 Q0 -15 12 -9 L12 -3 Q-2 -7 -15 -4 Z', PAL.ashD, rim('M-13.6 -10.6 Q0 -14.2 11 -8.8', 1, 0.35), { shadow: 1.4, light: 0.8, lightK: 0.25 }) +
  felt(
    oval(-9, -8, 3),
    PAL.cream,
    `<circle cx="-10" cy="-7.4" r="1.5" fill="#2b2118" stroke="none"/>` + paint('M-13 -12 L-5 -10.6 L-5 -8.4 L-13 -9.4 Z', PAL.ashD),
    { outline: 1.4, shadow: 0, light: 0 },
  ) +
  felt(
    oval(-2, -8, 3),
    PAL.cream,
    `<circle cx="-3" cy="-7.4" r="1.5" fill="#2b2118" stroke="none"/>` + paint('M-6 -10.4 L2 -11.8 L2 -9.6 L-6 -8.8 Z', PAL.ashD),
    { outline: 1.4, shadow: 0, light: 0 },
  ) +
  `<circle cx="-10.5" cy="-7.9" r="0.55" fill="#fffaf0" stroke="none"/><circle cx="-3.5" cy="-7.9" r="0.55" fill="#fffaf0" stroke="none"/>` +
  // Lopsided grin with a missing tooth.
  `<path d="M-11 1.2 Q-5 5.6 0.6 -0.2 Q-5 2.4 -11 1.2 Z" fill="#3a1d18" stroke="none"/>` +
  `<path d="M-10.2 1.6 Q-5 3.4 -0.2 0.4 L-0.6 1.4 Q-5 4.2 -9.8 2.4 Z" fill="${PAL.cream}" stroke="none"/>` +
  `<rect x="-6" y="2" width="1.6" height="1.8" fill="#3a1d18" stroke="none"/>` +
  `<path d="M-11 1.2 Q-5 5.6 0.6 -0.2" fill="none" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round"/>` +
  // Pointed muzzle with a pink nose and whiskers.
  snout(-11, -1.6, 11, 7.6, C);

/** Pogo Bandit: a masked mouse rogue with tucked legs on a spring-loaded stick. */
export const pogoRig: CharacterRig = {
  parts: [
    // The tail streams out behind and flicks up on every hop.
    part('tail', 16, -42, 'legBack', [-6, -6, 38, 19], tail([0, 0], [10, 11], [24, 14], [31, 3], 6, 2.6, C.tail)),
    part(
      'armBack',
      11,
      -56,
      'armBack',
      [-31, -10, 10, 16],
      litTube('M0 0 Q-10 6 -19 4', 5.5, PAL.forestD, { shadow: 1.8, light: 0.9 }) + hand(-22, 4, 5, C.furD),
    ),
    part('legBack', 11, -44, 'legBack', [-28, -12, 10, 17], tucked(PAL.plumD, PAL.woodD)),
    part('stick', -5, -30, 'static', [-24, -34, 21, 33], stick),
    part('legFront', 3, -44, 'legFront', [-28, -12, 10, 17], tucked(PAL.plum, PAL.woodD, true)),
    part('body', 7, -44, 'body', [-18, -24, 18, 12], body),
    part('head', 7, -62, 'head', [-32, -34, 35, 17], head),
    part(
      'armFront',
      4,
      -56,
      'armFront',
      [-28, -10, 10, 16],
      litTube('M0 0 Q-8 6 -14 4', 5.5, PAL.forest, { shadow: 1.8, light: 0.9 }) +
        stroke('M-11.6 0.6 L-11 7.4', tone(PAL.forest, -0.35), 1.4, 0.9) +
        hand(-17, 4, 5.2, C.fur) +
        brassPin(0, 0, 2.5),
    ),
  ],
};
