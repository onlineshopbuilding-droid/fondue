import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, r1, rng, stroke, tone, within } from '../shade';
import { INK, PAL, brassPin, felt, oval, part, seam } from './kit';

/**
 * Overlapping rows of feathers, painted inside a shape. Rows are listed top to bottom; lower rows
 * are drawn first so each upper row overlaps the one below like shingles. Every feather has a
 * darker tip, a pale quill and a soft dark edge.
 */
function featherRows(rows: ReadonlyArray<readonly [y: number, x0: number, x1: number]>, len: number, w: number, colors: readonly string[], seed: number): string {
  const r = rng(seed);
  let s = '';
  for (let i = rows.length - 1; i >= 0; i--) {
    const [y, x0, x1] = rows[i];
    const base = colors[i % colors.length];
    const off = (i % 2) * w * 0.5;
    for (let x = x0 + off; x <= x1; x += w) {
      const l = len * (0.85 + r() * 0.3);
      const tip = x + (r() - 0.6) * 1.6;
      const d = `M${r1(x - w * 0.62)} ${r1(y)} Q${r1(x - w * 0.6)} ${r1(y + l * 0.72)} ${r1(tip)} ${r1(y + l)} Q${r1(x + w * 0.6)} ${r1(y + l * 0.72)} ${r1(x + w * 0.62)} ${r1(y)} Z`;
      s +=
        paint(d, base) +
        within(d, paint(`M${r1(x - w)} ${r1(y + l * 0.55)} H${r1(x + w)} V${r1(y + l + 2)} H${r1(x - w)} Z`, tone(base, -0.25), 0.8) + paint(`M${r1(x - w)} ${r1(y - 1)} L${r1(x - w * 0.1)} ${r1(y - 1)} L${r1(x - w)} ${r1(y + l)} Z`, tone(base, 0.22), 0.6)) +
        stroke(d, tone(base, -0.5), 0.9, 0.85) +
        stroke(`M${r1(x)} ${r1(y + 0.6)} Q${r1(x + 0.2)} ${r1(y + l * 0.5)} ${r1(tip)} ${r1(y + l - 1.2)}`, tone(base, 0.45), 0.7, 0.75);
    }
  }
  return s;
}

/** A single long feather with a quill, for the fringes on the sleeves. */
function feather(x: number, y: number, len: number, w: number, angle: number, color: string): string {
  const a = (angle * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = Math.cos(a);
  const px = Math.cos(a);
  const py = -Math.sin(a);
  const tx = x + ux * len;
  const ty = y + uy * len;
  const d =
    `M${r1(x - px * w * 0.5)} ${r1(y - py * w * 0.5)} Q${r1(x - px * w * 0.6 + ux * len * 0.7)} ${r1(y - py * w * 0.6 + uy * len * 0.7)} ${r1(tx)} ${r1(ty)} ` +
    `Q${r1(x + px * w * 0.6 + ux * len * 0.7)} ${r1(y + py * w * 0.6 + uy * len * 0.7)} ${r1(x + px * w * 0.5)} ${r1(y + py * w * 0.5)} Z`;
  return (
    lit(d, color, { outline: 2.2, shadow: w * 0.22, light: w * 0.12 }) +
    stroke(`M${r1(x)} ${r1(y)} L${r1(x + ux * len * 0.85)} ${r1(y + uy * len * 0.85)}`, tone(color, 0.45), 0.8, 0.8) +
    // Barbs split near the tip.
    stroke(`M${r1(x + ux * len * 0.6 - px * w * 0.45)} ${r1(y + uy * len * 0.6 - py * w * 0.45)} L${r1(x + ux * len * 0.66)} ${r1(y + uy * len * 0.66)}`, INK, 0.9, 0.7)
  );
}

/** Scaly bird leg with three hooked talons. */
function talonLeg(color: string): string {
  const scale = tone(color, -0.4);
  const claw = (d: string): string => litTube(d, 1.9, PAL.mustardD, { outline: 1.7, shadow: 0.6, light: 0.3 });
  return (
    litTube('M0 0 L0 30', 3, color, { outline: 2.8, shadow: 0.9, light: 0.5 }) +
    stroke('M-1.5 12 L1.5 13 M-1.5 16 L1.5 17 M-1.5 20 L1.5 21 M-1.5 24 L1.5 25', scale, 0.8, 0.9) +
    claw('M0 30 L-11 31.5') +
    claw('M0 30 L5 31.5') +
    claw('M0 29.6 L-5 32') +
    paint('M-12.6 30.6 L-14 32.8 L-11.2 32 Z', INK) +
    paint('M5.4 30.6 L7 32.8 L4.4 32.2 Z', INK)
  );
}

const CLOAK = 'M-11 -23 Q-20 -6 -20 6 L-15 2 L-11 10 L-6 3 L-2 11 L3 3 L7 10 L11 3 L16 8 L20 4 Q19 -8 11 -23 Q0 -27 -11 -23 Z';

const body =
  felt(
    CLOAK,
    PAL.raven,
    featherRows(
      [
        [-24, -14, 14],
        [-17, -18, 18],
        [-10, -20, 20],
        [-3, -21, 21],
        [3, -21, 21],
      ],
      9,
      6,
      [PAL.raven, tone(PAL.raven, 0.1), PAL.raven, tone(PAL.plum, -0.15), PAL.raven],
      5,
    ) +
      // A cord with a bone bead closes the cloak at the throat.
      stroke('M-8 -21 Q0 -16 8 -21', PAL.creamD, 1.2, 0.9),
    { shadow: 4, light: 1.4, lightK: 0.28 },
  ) +
  lit(oval(0, -17.4, 2.2, 1.6), PAL.cream, { outline: 1.4, shadow: 0.7, light: 0.4 });

const MASK = 'M9 -18 Q-7 -22 -11 -13 L-30 -4 Q-17 2 -9 1 Q6 5 10 -4 Z';
const CREST = 'M0 -20 L10 -24 L10 -18 L20 -19 L16 -13 L23 -10 L15 -6 L19 1 L5 5 Z';

const head =
  // Crest of black feathers behind the mask.
  felt(
    CREST,
    PAL.raven,
    stroke('M4 -18 L10 -22 M6 -14 L18 -17.4 M8 -9 L20 -9.6 M8 -4 L16 0', tone(PAL.raven, 0.4), 0.9, 0.8) +
      stroke('M5 -15 L11 -20 M7 -11 L17 -14 M8 -6 L18 -6', tone(PAL.raven, -0.4), 0.8, 0.7),
    { shadow: 2.4, light: 1, lightK: 0.3 },
  ) +
  // The bone mask: shaded bone, a war-paint stripe, cracks, a nostril and a hollow eye socket.
  felt(
    MASK,
    PAL.cream,
    paint('M-17 -9.5 L-14 -11 L-10 -1 Q-12 0.5 -14 0.4 Z', PAL.rust) +
      paint('M-30 -6 L-24 -8 L-22 0 L-30 0 Z', tone(PAL.creamD, -0.2), 0.7) +
      paint('M-28 -3.6 Q-17 -1 -9 -2 Q4 2 10 -5 V6 H-30 Z', tone(PAL.creamD, -0.08), 0.75) +
      stroke('M2 -19 L0 -15 L2.4 -12.6 M-5 -3 L-3 -0.4', tone(PAL.creamD, -0.45), 0.8, 0.85) +
      seam('M5 -17 Q7 -9 5 -1', tone(PAL.creamD, -0.2), 1, 0.9) +
      paint('M-21.4 -7.6 Q-19.4 -8.6 -18 -7.4 Q-19.6 -6.6 -21.4 -7.6 Z', INK, 0.85),
    { shadow: 2.6, light: 1.4, lightK: 0.4 },
  ) +
  stroke('M-26 -4 Q-17 -3 -9 -5', INK, 1.9) +
  // Socket with a glowing amber eye under a heavy, scowling brow ridge.
  paint(oval(-4, -11, 5.2, 4.8), INK) +
  `<circle cx="-4" cy="-11" r="2.6" fill="${PAL.amber}" stroke="none"/>` +
  `<circle cx="-4" cy="-11" r="4" fill="${PAL.amber}" stroke="none" opacity="0.25"/>` +
  paint('M-4.4 -13 Q-3.6 -11 -4.4 -9 Q-5.2 -11 -4.4 -13 Z', INK) +
  glint(-5, -12, 0.7) +
  lit('M-11.6 -15.6 Q-4 -19.4 3.4 -15 Q-3 -15.4 -10 -13.2 Z', PAL.cream, { outline: 1.4, shadow: 0.8, light: 0.5, lightK: 0.4 });

const armBack =
  feather(9, 6, 13, 6, -6, PAL.raven) +
  feather(13, 15, 13, 6, -10, PAL.raven) +
  litTube('M0 0 L11 22', 3, PAL.raven, { outline: 2.8, shadow: 1, light: 0.5 }) +
  lit(oval(12, 25, 3.8), PAL.skinD, { outline: 2.8, shadow: 1.2, light: 0.7 }) +
  stroke('M9.6 26.4 Q11.4 28 13.6 27.4', tone(PAL.skinD, -0.4), 0.8, 0.8);

const armFront =
  feather(-8, -2, 13, 6.4, 8, PAL.ravenL) +
  feather(-15, -5, 13, 6.4, 4, PAL.ravenL) +
  litTube('M0 0 L-12 -6 L-21 -2', 3, PAL.raven, { outline: 2.8, shadow: 1, light: 0.5 }) +
  // Bony fingers spread in a summoning gesture, with dark nails.
  litTube('M-26 -7 L-30 -12', 1.8, PAL.skin, { outline: 1.6, shadow: 0.5, light: 0.3 }) +
  litTube('M-23 -8 L-25 -15', 1.8, PAL.skin, { outline: 1.6, shadow: 0.5, light: 0.3 }) +
  litTube('M-20 -7 L-20 -14', 1.8, PAL.skin, { outline: 1.6, shadow: 0.5, light: 0.3 }) +
  paint(oval(-30, -12.2, 0.9) + oval(-25, -15.2, 0.9) + oval(-20, -14.2, 0.9), PAL.sootD) +
  lit(oval(-23, -4, 4), PAL.skin, { outline: 2.8, shadow: 1.3, light: 0.8 }) +
  stroke('M-26.4 -3 Q-24.4 -1 -21.6 -1.6', tone(PAL.skin, -0.38), 0.8, 0.8) +
  brassPin(0, 0, 2.2);

/** Crowcaller: a gaunt figure in a feather cloak behind a long bone beak. */
export const crowcallerRig: CharacterRig = {
  parts: [
    part('armBack', 8, -50, 'armBack', [-11, -10, 26, 42], armBack),
    part('legBack', 4, -34, 'legBack', [-18, -8, 13, 38], talonLeg(PAL.ashD)),
    part('legFront', -4, -34, 'legFront', [-18, -8, 13, 38], talonLeg(PAL.ash)),
    part('body', 0, -34, 'body', [-26, -30, 26, 16], body),
    part('head', 0, -55, 'head', [-35, -30, 28, 11], head),
    part('armFront', -6, -49, 'armFront', [-36, -24, 10, 24], armFront),
  ],
};

const WING_OUTLINE = 3;
const WING = 'M-6 3 Q-8 -12 7 -25 L9 -18 L15 -20 L13 -12 L18 -12 L13 -4 L6 4 Z';

/** A wing: base shading, a row of coverts near the shoulder and long primaries split by dark lines. */
const wing = (color: string): string =>
  felt(
    WING,
    color,
    paint('M-8 4 Q-6 -8 4 -14 L8 -6 L6 6 Z', tone(color, 0.14), 0.8) +
      stroke('M-2 -2 Q0 -10 6 -16 M2 0 Q5 -6 11 -11 M5 2 Q8 -2 13 -5', tone(color, -0.45), 0.9, 0.85) +
      stroke('M-3 -3 Q-1 -11 5 -17', tone(color, 0.4), 0.7, 0.6) +
      stroke('M-5 1 Q-2 -2 1 0 Q3 -3 6 -1', tone(color, -0.35), 0.8, 0.75),
    { outline: WING_OUTLINE, shadow: 2, light: 0.9, lightK: 0.3 },
  );

const CROW_BODY = 'M-10 0 a10 8 0 1 0 20 0 a10 8 0 1 0 -20 0 Z M-14 -4 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 Z';

/** The crow a Crowcaller turns into. Wings point up and flap around the shoulder. */
export const crowRig: CharacterRig = {
  parts: [
    part('wingBack', -1, -17, 'armBack', [-13, -31, 24, 10], wing(PAL.ashD), WING_OUTLINE),
    part(
      'body',
      0,
      -12,
      'static',
      [-25, -16, 25, 18],
      // Fanned tail feathers.
      felt('M8 -3 L19 -3 L18 1 L21 4 L8 6 Z', PAL.ashD, stroke('M9 -0.6 L18.6 -1 M9 2.6 L19.4 3', tone(PAL.ashD, 0.35), 0.8, 0.8), { outline: WING_OUTLINE, shadow: 1, light: 0.5 }) +
        // Legs.
        litTube('M-3 7 L-4 12', 1.6, PAL.mustardD, { outline: 1.6, shadow: 0.4, light: 0.3 }) +
        litTube('M3 7 L3 12', 1.6, PAL.mustardD, { outline: 1.6, shadow: 0.4, light: 0.3 }) +
        // One silhouette for head and body, with feather scallops on the breast.
        `<path d="${CROW_BODY}" fill="none" stroke="${INK}" stroke-width="${WING_OUTLINE * 2}" stroke-linejoin="round"/>` +
        felt(
          CROW_BODY,
          PAL.raven,
          stroke('M-8 2 q2 2.4 4 0 q2 2.4 4 0 M-6 5.6 q2 2.4 4 0 q2 2.4 4 0 q2 2.4 4 0 M-9 -1.6 q2 2 4 0', tone(PAL.raven, -0.42), 0.9, 0.85) +
            stroke('M-8 1.2 q2 2.4 4 0 M-6 4.8 q2 2.4 4 0', tone(PAL.raven, 0.4), 0.6, 0.6) +
            stroke('M-12 -8 Q-9 -10 -5 -9', tone(PAL.raven, 0.45), 0.9, 0.7),
          { outline: 0, shadow: 2.6, light: 1.2, lightK: 0.3 },
        ) +
        // Beak with a dark parting line, set on top of the head.
        lit('M-12.6 -7.6 L-21 -3.4 L-12.6 -0.8 Q-11.6 -4.2 -12.6 -7.6 Z', PAL.mustard, { outline: 2.2, shadow: 1, light: 0.5, lightK: 0.4 }) +
        stroke('M-13 -3.6 L-19.6 -3.4', PAL.mustardD, 0.8, 0.9) +
        // Bright eye with a glint.
        `<circle cx="-9.5" cy="-5" r="2.1" fill="${PAL.cream}" stroke="${INK}" stroke-width="0.8"/>` +
        `<circle cx="-10" cy="-5" r="1.1" fill="${INK}" stroke="none"/>` +
        glint(-10.4, -5.5, 0.4),
      WING_OUTLINE,
    ),
    part('wingFront', 3, -16, 'armFront', [-13, -31, 24, 10], wing(PAL.ravenL), WING_OUTLINE),
  ],
};
