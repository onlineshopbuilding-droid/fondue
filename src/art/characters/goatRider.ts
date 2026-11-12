// The Goat Rider as a felt-puppet rig: its drawn parts and the joints they turn on.
// The animation that moves these parts lives in src/render/enemyView.ts.
import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, rng, stroke, tone } from '../shade';
import { MOUSE, PAL, bead, blush, brassPin, brow, felt, fold, fur, hand, metal, mouseEar, oval, part, rim, rrect, seam, snout, tail } from './kit';

/** The goat is a goat; its rider is a mouse. */
const C = MOUSE;

const MUZZLE = '#e3c3ad';

/** Little wool curls scattered over an ellipse, painted a shade darker than the fleece. */
function curls(cx: number, cy: number, rx: number, ry: number, n: number, seed: number, base: string): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const k = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    const s = 1.6 + r() * 1.2;
    d += `M${(x - s).toFixed(1)} ${y.toFixed(1)} Q${x.toFixed(1)} ${(y - s * 1.1).toFixed(1)} ${(x + s).toFixed(1)} ${y.toFixed(1)} `;
  }
  return stroke(d, tone(base, -0.22), 1.1, 0.85);
}

/** Goat leg: fleece, a shaggy fetlock tuft and a cloven hoof. */
function goatLeg(wool: string): string {
  const hoof = 'M-7 23 H7 L7.6 30 H-7.6 Z';
  return (
    litTube('M0 0 L0 22', 9, wool, { shadow: 3, light: 1.4 }) +
    stroke('M-1.6 6 Q-0.6 9 -1.8 12', tone(wool, -0.25), 1, 0.7) +
    felt(fur(0, 19.4, 6, 3.6, 7, 0.28, 1.2), wool, '', { shadow: 1.6, light: 0.9 }) +
    felt(hoof, PAL.woodD, stroke('M0 24 V30', tone(PAL.woodD, -0.45), 1.3) + stroke('M-5.6 25 H-1.6', '#fff3d1', 1, 0.4), {
      shadow: 1.6,
      light: 1,
      lightK: 0.3,
    })
  );
}

const LEG_BOX = [-14, -12, 14, 33] as const;

const BLANKET = 'M-13 -19 Q6 -23 24 -18 L27 3 Q6 9 -15 4 Z';

const goatBody =
  // Tail with a tuft.
  litTube('M42 -10 Q48 -16 50 -22', 6, PAL.creamD, { shadow: 1.8, light: 1 }) +
  felt('M46.4 -19.4 Q44.6 -25.4 49.2 -29 Q50 -26.4 52.2 -28 Q55.4 -23.4 53 -19.2 Q49.6 -17.6 46.4 -19.4 Z', PAL.creamD, stroke('M49 -26 Q48.4 -22.6 49.4 -20', tone(PAL.creamD, -0.35), 0.9, 0.8), {
    outline: 3,
    shadow: 1.2,
    light: 0.8,
  }) +
  // Shaggy fleece.
  felt(
    fur(0, 0, 41, 18, 20, 0.15, 2.5),
    PAL.cream,
    curls(0, -2, 36, 13, 34, 7, PAL.cream) + paint('M-44 9 Q0 15 44 8 V24 H-44 Z', tone(PAL.cream, -0.16), 0.6),
    { shadow: 6, light: 2.6 },
  ) +
  paint('M-20 10 L-14 16 L-8 11 L-2 17 L4 11 L10 16 L16 11 L22 15 L26 8 Q4 16 -20 10 Z', PAL.creamD) +
  // Leather girth strap with a buckle.
  litTube('M9 4 L10 17', 3.2, PAL.woodD, { outline: 2, shadow: 1, light: 0.6 }) +
  metal(rrect(7.4, 9, 5, 4.4, 1), PAL.ironL, '', { outline: 1.4, shadow: 0.8 }) +
  // Saddle blanket: mustard border, embroidered diamonds, stitched hem and tassels.
  felt(
    BLANKET,
    PAL.teal,
    paint('M-14 -24 Q6 -27 26 -22 L24 -15 Q6 -19 -14 -12 Z', PAL.mustard) +
      stroke('M-12 -12.6 Q6 -16.6 24 -14.6', tone(PAL.mustard, -0.35), 1, 0.7) +
      stroke('M-12 -15.6 Q6 -19.6 23.4 -17.4', PAL.rust, 1.2, 0.9) +
      `<path d="M-4 -7.4 L-1 -10.4 L2 -7.4 L-1 -4.4 Z M6 -7.6 L9 -10.6 L12 -7.6 L9 -4.6 Z M16 -7.2 L19 -10.2 L22 -7.2 L19 -4.2 Z" fill="${PAL.rust}" stroke="none"/>` +
      `<path d="M-1 -8.6 L0.2 -7.4 L-1 -6.2 L-2.2 -7.4 Z M9 -8.8 L10.2 -7.6 L9 -6.4 L7.8 -7.6 Z M19 -8.4 L20.2 -7.2 L19 -6 L17.8 -7.2 Z" fill="${PAL.cream}" stroke="none"/>` +
      seam('M-10 -1 Q6 4 24 0', PAL.mustard, 1.3, 0.95) +
      fold('M20 -12 Q22 -5 21 1', PAL.teal),
    { shadow: 3, light: 1.6 },
  ) +
  // Tassels on the lower corners.
  felt('M-16.6 2.6 L-13.4 2.6 L-12.4 9 L-17.6 9 Z', PAL.mustard, stroke('M-15.8 5 V8.6 M-14.2 5 V8.6', tone(PAL.mustard, -0.4), 0.8), {
    outline: 1.8,
    shadow: 1,
    light: 0.6,
  }) +
  felt('M25.4 1.4 L28.6 1.4 L29.6 7.8 L24.4 7.8 Z', PAL.mustard, stroke('M26.2 3.8 V7.4 M27.8 3.8 V7.4', tone(PAL.mustard, -0.4), 0.8), {
    outline: 1.8,
    shadow: 1,
    light: 0.6,
  });

const HEAD = 'M-4 -19 Q9 -17 9 -5 Q7 6 -6 9 L-25 9 Q-34 7 -32 -2 Q-24 -13 -4 -19 Z';
const BELL = 'M4 22 L14 22 L13 31 Q9 35 5 31 Z';

/** Ridged horn along a curve. */
function horn(d: string, w: number, base: string, ridges: string): string {
  return litTube(d, w, base, { shadow: w * 0.3, light: w * 0.18 }) + stroke(ridges, tone(base, -0.38), 0.9, 0.85);
}

const goatHead =
  // Neck in thick fleece.
  felt(oval(9, 9, 14, 17), PAL.cream, curls(9, 8, 10, 13, 12, 3, PAL.cream), { shadow: 4.5, light: 2 }) +
  // Collar and bell.
  litTube('M-3.6 17.6 Q9 23.6 22 16.6', 3.4, PAL.rust, { outline: 2.2, shadow: 1, light: 0.6 }) +
  seam('M-2 17.2 Q9 22.4 20.6 16.2', PAL.cream, 0.9, 0.75) +
  metal(BELL, PAL.mustard, stroke('M5.6 30 Q9 32.4 12.6 30', tone(PAL.mustard, -0.45), 1.1), { outline: 2.6, shadow: 1.4 }) +
  `<circle cx="9" cy="32.6" r="1.4" fill="${PAL.sootD}" stroke="#2b2118" stroke-width="1"/>` +
  glint(6.4, 24.6, 0.9) +
  // Horns: the far one darker, both ridged.
  horn('M4 -14 Q12 -30 26 -29', 3.5, PAL.woodD, 'M7.4 -19.6 l2.4 0.8 M10.4 -23.6 l2 1.2 M14.4 -26.8 l1.2 1.8 M19 -28.6 l0.4 2') +
  horn('M-2 -15 Q4 -32 20 -33', 4.5, PAL.creamD, 'M0.6 -20 l3 0.8 M3 -24.8 l2.8 1.4 M6.6 -28.8 l2 2 M11.2 -31.6 l1 2.4 M15.6 -32.8 l0.2 2.4') +
  rim('M-2.6 -18 Q1.6 -29 9 -31.6', 1, 0.5) +
  // Beard.
  felt('M-26 7 Q-25 24 -20 27 Q-16 19 -14 8 Z', PAL.creamD, stroke('M-23.4 10 Q-22.6 18 -20.6 23 M-19 10 Q-18.6 15 -18.6 19', tone(PAL.creamD, -0.35), 1, 0.85), {
    shadow: 2,
    light: 1,
  }) +
  // Head with a rosy muzzle and a wool fringe on the brow.
  felt(
    HEAD,
    PAL.cream,
    paint('M-36 -6 Q-27 -10 -20 -3 Q-18 6 -22 12 L-36 12 Z', MUZZLE, 0.75) +
      curls(-2, -10, 6, 4, 6, 19, PAL.cream) +
      stroke('M-20 -3.4 Q-16 2 -10 3', tone(PAL.cream, -0.25), 1.1, 0.7),
    { shadow: 4, light: 2 },
  ) +
  // Ear with a pink inside.
  felt('M4 -11 Q18 -13 22 -3 Q13 1 5 -3 Z', PAL.creamD, paint('M7 -8.4 Q15 -9.4 18.6 -4.4 Q12 -2.6 7 -5 Z', MUZZLE), { shadow: 1.6, light: 1 }) +
  // Grumpy goat eye: slot pupil, heavy lid, glint and a stern brow.
  felt(
    oval(-11, -7, 4.8),
    PAL.mustard,
    paint('M-17 -13 H-5 V-8.6 Q-11 -9.8 -17 -8.2 Z', tone(PAL.cream, -0.12)) +
      stroke('M-16.6 -8.4 Q-11 -9.8 -5.4 -8.8', '#2b2118', 1.3),
    { outline: 2.4, shadow: 1.4, light: 0.8 },
  ) +
  `<rect x="-14.6" y="-7" width="7.2" height="2.4" rx="1.2" fill="#2b2118" stroke="none"/>` +
  glint(-13.2, -5.4, 0.8) +
  brow('M-5 -13.8 L-16.4 -10.6', 2.4) +
  // Nostril, mouth and a muzzle shine.
  `<ellipse cx="-29" cy="0" rx="1.8" ry="1.3" fill="#2b2118" stroke="none"/>` +
  stroke('M-31 5 Q-25 5.4 -20 2', '#2b2118', 2) +
  glint(-29.4, -3.6, 0.9, '#fffaf0', 0.6);

const riderBody =
  // Leg and boot.
  litTube('M-2 3 L-5 18', 6, PAL.rustD, { shadow: 2, light: 1 }) +
  felt('M0 15 L0 27 L-13 27 Q-14 19 -9 15 Z', PAL.woodD,
    paint('M-16 24.6 H2 V30 H-16 Z', tone(PAL.woodD, -0.42)) +
      paint('M-12 14 H2 V17.4 H-12 Z', tone(PAL.woodD, 0.2)) +
      stroke('M-11.6 22.4 Q-9 20.4 -6 21.6', '#fff3d1', 1.2, 0.45),
    { shadow: 1.8, light: 1, lightK: 0.32 }) +
  // Plum tunic with a belt and a stitched yoke.
  felt(
    'M-8 -13 Q-11 -4 -10 6 Q0 9 10 6 Q11 -4 8 -13 Q0 -16 -8 -13 Z',
    PAL.plum,
    seam('M-9 -7 Q0 -4.6 9 -7', PAL.plumL, 1, 0.8) + fold('M5 -10 Q7 -3 6 5', PAL.plum, 1.1, 0.7) + paint('M-12 5 Q0 9 12 5 V12 H-12 Z', PAL.plumD, 0.55),
    { shadow: 3, light: 1.6 },
  ) +
  litTube('M-10 1.2 Q0 4.6 10 1.2', 2.6, PAL.woodD, { outline: 1.8, shadow: 0.8, light: 0.5 }) +
  lit(rrect(-5.6, 0.4, 4, 4, 0.8), PAL.mustard, { outline: 1.3, shadow: 0.8, light: 0.5 });

const riderHead =
  // Face.
  felt(oval(-1, -7, 10), C.fur, paint('M-12 -10 H10 V-7.8 Q-1 -8.6 -12 -7.8 Z', tone(C.fur, -0.3), 0.5), { shadow: 3.4, light: 1.6 }) +
  blush(-5, -1, 2.6, 1.8, 0.26) +
  // A big round ear under the brim.
  mouseEar(9.5, -8.5, 7, C) +
  // Horns of the cap, ridged.
  litTube('M-10 -15 Q-17 -17 -16 -22', 2.6, PAL.cream, { outline: 2.8, shadow: 0.8, light: 0.5 }) +
  litTube('M8 -15 Q15 -17 14 -22', 2.6, PAL.cream, { outline: 2.8, shadow: 0.8, light: 0.5 }) +
  stroke('M-12.4 -16.6 l0.6 1.6 M-15 -18.4 l1.4 0.8 M10.6 -16.4 l-0.4 1.6 M13.2 -18.2 l-1.4 0.8', tone(PAL.cream, -0.4), 0.8, 0.85) +
  // Rust felt cap with quarter seams and a button.
  felt('M-11 -12 Q-11 -22 -1 -22 Q9 -22 9 -12 Z', PAL.rust, seam('M-1 -21.6 V-13 M-6.6 -20.4 Q-8 -16 -8 -13 M4.6 -20.4 Q6 -16 6 -13', PAL.copperL, 0.9, 0.75), {
    shadow: 2.2,
    light: 1.3,
  }) +
  lit(oval(-1, -22.6, 1.6), PAL.mustard, { outline: 1.2, shadow: 0.6, light: 0.4 }) +
  // Fur band.
  felt(rrect(-13, -15, 24, 5.2, 2.6), PAL.creamD, stroke('M-10 -14 v3 M-7 -14.4 v3.4 M-4 -14 v3 M-1 -14.4 v3.4 M2 -14 v3 M5 -14.4 v3.4 M8 -14 v3', tone(PAL.creamD, -0.3), 0.9, 0.75), {
    outline: 3,
    shadow: 1.2,
    light: 0.8,
  }) +
  // A cheeky look: one brow up, one down.
  brow('M-9.8 -8.6 Q-7.8 -10 -5.6 -9', 1.8) +
  brow('M-3.4 -8.2 L0.8 -8.8', 1.8) +
  bead(-7, -5.6, 1.8) +
  bead(-1, -5.6, 1.8) +
  stroke('M-8.6 0.6 Q-4.6 3 -0.4 -0.4', '#2b2118', 1.9) +
  snout(-9, -2.6, 10, 7, C, { outline: 2.2 });

const riderArmFront =
  // Leather reins tied to the goat's horns.
  stroke('M-14 -3 Q-26 2 -35 10', '#2b2118', 3.6) +
  stroke('M-14 -3 Q-26 2 -35 10', PAL.rustD, 2) +
  stroke('M-15 -3.6 Q-26 1 -34.4 8.8', PAL.copperL, 0.7, 0.6) +
  litTube('M0 0 L-11 -2', 5.5, PAL.plum, { shadow: 1.8, light: 0.9 }) +
  stroke('M-9.4 -5.4 L-10 1.4', tone(PAL.plum, -0.35), 1.4, 0.9) +
  hand(-14, -3, 4.6, C.fur) +
  brassPin(0, 0, 2.5);

/** Goat Rider: a small mouse raider in a horned hat on a big shaggy alpine goat. */
export const goatRiderRig: CharacterRig = {
  parts: [
    part('goatLegFarFront', -19, -32, 'legBack', LEG_BOX, goatLeg(PAL.creamD)),
    part('goatLegFarRear', 40, -32, 'legFront', LEG_BOX, goatLeg(PAL.creamD)),
    part('goatLegNearFront', -28, -32, 'legFront', LEG_BOX, goatLeg(PAL.cream)),
    part('goatLegNearRear', 31, -32, 'legBack', LEG_BOX, goatLeg(PAL.cream)),
    part('goatBody', 4, -44, 'static', [-52, -34, 64, 32], goatBody),
    part('goatHead', -38, -54, 'static', [-40, -44, 36, 40], goatHead),
    part('riderTail', 18, -55, 'legBack', [-6, -18, 28, 11], tail([0, 0], [10, 6], [20, 3], [21, -12], 5.4, 2.4, C.tail)),
    part(
      'riderArmBack',
      13,
      -67,
      'armBack',
      [-10, -9, 10, 25],
      litTube('M0 0 L1 11', 5.5, PAL.plumD, { shadow: 1.8, light: 0.9 }) + hand(1, 14, 4.2, C.furD),
    ),
    part('riderBody', 10, -58, 'body', [-19, -20, 16, 32], riderBody),
    part('riderHead', 10, -70, 'head', [-28, -31, 22, 14], riderHead),
    part('riderArmFront', 5, -67, 'armFront', [-41, -13, 13, 17], riderArmFront),
  ],
};
