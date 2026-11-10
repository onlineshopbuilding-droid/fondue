import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, r1, stroke, tone, within } from '../shade';
import { INK, PAL, brassPin, felt, fold, litLeg, metal, oval, part, rrect } from './kit';

/** Cool rim light: the Shade is dark, so a pale edge keeps it readable against night skies. */
const edge = (d: string, w = 1.2, opacity = 0.5): string => stroke(d, PAL.ashL, w, opacity);

/** Bands of cloth wound round a shape: alternate tones, a dark under-edge and a lit upper edge per band. */
function wraps(x0: number, x1: number, ys: number[], tilt: number, base: string): string {
  let s = '';
  ys.forEach((y, i) => {
    const a = `M${x0} ${y} Q${r1((x0 + x1) / 2)} ${r1(y - tilt - 1.6)} ${x1} ${r1(y - tilt)}`;
    if (i % 2) s += paint(`${a} L${x1} ${r1(y - tilt + 5)} Q${r1((x0 + x1) / 2)} ${r1(y - tilt + 3.4)} ${x0} ${y + 5} Z`, tone(base, -0.14), 0.8);
    s += stroke(a, tone(base, -0.42), 1.3, 0.9);
    s += stroke(`M${x0} ${r1(y + 1.1)} Q${r1((x0 + x1) / 2)} ${r1(y - tilt - 0.5)} ${x1} ${r1(y - tilt + 1.1)}`, tone(base, 0.32), 0.8, 0.55);
  });
  return s;
}

const TORSO = 'M-8 -19 Q-11 -8 -9 7 Q0 10 9 7 Q11 -8 8 -19 Q0 -22 -8 -19 Z';
const TAIL_HIGH = 'M3 -18 Q18 -30 42 -24 L36 -19 L42 -13 Q20 -18 5 -9 Z';
const TAIL_LOW = 'M4 -4 Q18 -6 36 5 L29 7 L33 12 Q15 5 3 4 Z';

const body =
  // Two scarf tails streaming out behind, with folds and frayed ends.
  felt(
    TAIL_HIGH,
    PAL.ashD,
    fold('M8 -16 Q20 -24 36 -22', PAL.ashD, 1.2, 0.9) +
      fold('M10 -12.6 Q22 -18.4 34 -17.4', PAL.ashD, 1, 0.7) +
      edge('M6 -18.4 Q18 -28.4 40 -24', 1.1, 0.55),
    { shadow: 2, light: 1, lightK: 0.22 },
  ) +
  stroke('M42 -24 L44.4 -24.8 M42 -13 L44.6 -12.4', INK, 1, 0.8) +
  felt(
    TAIL_LOW,
    PAL.ash,
    fold('M8 -1.6 Q20 -2 31 4.6', PAL.ash, 1.2, 0.85) + fold('M9 2.4 Q18 3.4 26 6.6', PAL.ash, 1, 0.65) + edge('M6 -3.6 Q18 -5.6 34 4', 1, 0.45),
    { shadow: 1.8, light: 1, lightK: 0.22 },
  ) +
  stroke('M33 12 L35 13.8 M36 5 L38.4 5.2', INK, 1, 0.8) +
  // Wrapped torso with a knotted sash.
  felt(
    TORSO,
    PAL.ash,
    wraps(-12, 12, [-15, -8.4, -1.8, 4.6], 3.2, PAL.ash) + edge('M-9.4 -17 Q-11 -8 -9.6 4', 1.2, 0.5),
    { shadow: 3.4, light: 1.2, lightK: 0.24 },
  ) +
  felt('M-9.6 1.6 Q0 -2 10.4 0.6 L10 4.6 Q0 2.4 -9.4 5.6 Z', PAL.plumD, fold('M-7 3.6 Q0 1.4 8 2.8', PAL.plumD, 0.9, 0.7), { outline: 2, shadow: 1, light: 0.6 }) +
  felt('M6 0.6 Q9.6 2.6 8.4 9.4 L5.6 9 Q6.6 4.4 4.4 2.6 Z', PAL.plumD, '', { outline: 1.8, shadow: 0.8, light: 0.5 }) +
  lit(oval(6.4, 2.6, 2.2, 2), PAL.plum, { outline: 1.8, shadow: 0.8, light: 0.5 });

const HOOD = oval(-1, -12, 12.5, 13);
const MASK = 'M-14 -16 Q0 -20 12 -15 L12 -8 Q0 -12 -14 -9 Z';

const head =
  felt(
    HOOD,
    PAL.ash,
    // Wound layers of the hood, each lit on top.
    wraps(-16, 14, [-22, -4.6, 0.4], 2.4, PAL.ash) +
      fold('M4 -24 Q9 -16 9 -6', PAL.ash, 1.2, 0.7) +
      edge('M-12 -16 Q-12 -23.6 -3 -25', 1.4, 0.6),
    { shadow: 3.6, light: 1.4, lightK: 0.24 },
  ) +
  // The dark eye band, with a fold over the nose and narrowed brows above the glowing eyes.
  felt(
    MASK,
    PAL.ashD,
    stroke('M-14 -12.6 Q0 -16.6 12 -11.6', tone(PAL.ashD, 0.25), 0.8, 0.5) + stroke('M-13.8 -15.2 Q0 -19.4 12 -14.2', tone(PAL.ashD, 0.4), 0.8, 0.5),
    { outline: 2.4, shadow: 1.2, light: 0.7, lightK: 0.3 },
  ) +
  // Pale eyes that glow out of the dark: soft halos, bright almonds, tiny pupils.
  [-9, -2]
    .map(
      (x) =>
        `<ellipse cx="${x}" cy="-12.6" rx="4.6" ry="3.4" fill="${PAL.pale}" stroke="none" opacity="0.07"/>` +
        `<ellipse cx="${x}" cy="-12.6" rx="3.6" ry="2.5" fill="${PAL.pale}" stroke="none" opacity="0.12"/>`,
    )
    .join('') +
  paint('M-12 -12.2 Q-9 -15.4 -6.2 -12.6 Q-9 -10.4 -12 -12.2 Z', PAL.pale) +
  paint('M-4.8 -12.6 Q-2 -15.4 1 -12.2 Q-2 -10.4 -4.8 -12.6 Z', PAL.pale) +
  `<circle cx="-8.6" cy="-12.6" r="0.75" fill="${PAL.slateD}" stroke="none"/><circle cx="-2.4" cy="-12.6" r="0.75" fill="${PAL.slateD}" stroke="none"/>` +
  glint(-10, -13.2, 0.45) +
  glint(-3.2, -13.2, 0.45) +
  `<path d="M-12.4 -16.2 L-6.8 -14.4 M0.8 -16.2 L-4.6 -14.4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;

const BLADE = 'M-16 7 Q-34 4 -37 -18 Q-27 -11 -13 1 Z';

const armFront =
  // A short curved blade: steel sheen, a fuller groove, a bright edge and a glint at the tip.
  metal(
    BLADE,
    PAL.ice,
    stroke('M-18.6 4.2 Q-30 1.6 -33.6 -12.4', tone(PAL.iceD, -0.25), 0.9, 0.75) +
      stroke('M-15.6 1.6 Q-27.6 -6 -36 -17', '#ffffff', 1.4, 0.85) +
      paint('M-26 4 Q-33 1 -36 -10 L-38 -10 L-38 8 Z', tone(PAL.iceD, -0.15), 0.6),
    { outline: 2.8, shadow: 1.4 },
  ) +
  glint(-36, -16.6, 1.1) +
  `<path d="M-38.6 -18.8 L-33.4 -14.4 M-36 -21.4 L-36 -11.8" stroke="#fffaf0" stroke-width="0.7" stroke-linecap="round" opacity="0.85"/>` +
  // Brass guard and a cord-wrapped grip.
  metal(rrect(-15.8, 0.6, 4.6, 3.2, 1.2), PAL.mustard, '', { outline: 1.6, shadow: 0.6 }) +
  litTube('M-11 3 L-18 9', 2.6, PAL.woodD, { outline: 2.2, shadow: 0.8, light: 0.5 }) +
  stroke('M-12.6 3 L-11.4 5.2 M-14.6 4.6 L-13.4 6.8 M-16.6 6.2 L-15.4 8.4', PAL.plumL, 0.8, 0.9) +
  // Wrapped sleeve and a gloved hand round the grip.
  litTube('M0 0 L-12 7', 4.5, PAL.ash, { shadow: 1.4, light: 0.7, lightK: 0.24 }) +
  stroke('M-3.6 -1.4 L-2.4 3.8 M-7.6 0.6 L-6.4 5.8', tone(PAL.ash, -0.42), 1, 0.85) +
  lit(oval(-15, 9, 4.8), PAL.ashD, { shadow: 1.6, light: 1, lightK: 0.3 }) +
  stroke('M-18.6 8.8 Q-16.6 11.6 -13.4 11', tone(PAL.ashD, 0.3), 0.9, 0.7) +
  brassPin(0, 0, 2.2);

const armBack =
  litTube('M0 0 L9 13', 4.5, PAL.ashD, { shadow: 1.4, light: 0.7, lightK: 0.24 }) +
  stroke('M2 4.6 L6.2 2.4 M4.6 8.6 L8.8 6.4', tone(PAL.ashD, 0.25), 0.9, 0.7) +
  lit(oval(10, 17, 4.2), PAL.ashD, { shadow: 1.4, light: 0.9, lightK: 0.3 });

/** Bandaged shin: the shaded leg plus a few wraps. */
const shin = (cloth: string, boot: string): string =>
  litLeg(30, 5.5, cloth, boot, 9) +
  within(
    'M-2.7 0 H2.7 V20 H-2.7 Z',
    stroke('M-4 6 L4 3.6 M-4 11 L4 8.6 M-4 16 L4 13.6', tone(cloth, 0.32), 1.1, 0.75) + stroke('M-4 7.2 L4 4.8 M-4 12.2 L4 9.8', tone(cloth, -0.4), 0.8, 0.75),
  );

/** Shade: a slim figure bound in charcoal scarves, pale eyes and a short curved blade. */
export const shadeRig: CharacterRig = {
  parts: [
    part('armBack', 5, -44, 'armBack', [-12, -10, 22, 28], armBack),
    part('legBack', 4, -30, 'legBack', [-21, -10, 13, 33], shin(PAL.ashD, PAL.ashD)),
    part('legFront', -4, -30, 'legFront', [-21, -10, 13, 33], shin(PAL.ash, PAL.ashD)),
    part('body', 0, -30, 'body', [-15, -34, 50, 19], body),
    part('head', 0, -48, 'head', [-20, -30, 18, 9], head),
    part('armFront', -5, -44, 'armFront', [-44, -26, 10, 22], armFront),
  ],
};
