import type { CharacterRig } from '../types';
import { crescent, glint, lit, litTube, paint, r1, radial, stroke, tone, within } from '../shade';
import { INK, PAL, blush, brassPin, felt, fold, metal, oval, part, rim, rope, rrect, seam } from './kit';

/** One gore band of the envelope; k = 1 is the full balloon, smaller k a narrower band round the middle. */
const gore = (k: number): string => {
  const c = r1(42 * k);
  const b = r1(9 * k);
  return `M0 -62 C${c} -62 ${c} -12 ${b} -2 L${-b} -2 C${-c} -12 ${-c} -62 0 -62 Z`;
};
/** Just the right-hand seam of a gore, for painted panel seams. */
const goreSeam = (k: number): string => `M0 -62 C${r1(42 * k)} -62 ${r1(42 * k)} -12 ${r1(9 * k)} -2`;
const goreSeamL = (k: number): string => `M0 -62 C${r1(-42 * k)} -62 ${r1(-42 * k)} -12 ${r1(-9 * k)} -2`;

const ENVELOPE = gore(1);

/** A sewn-on patch: shaded felt with a running stitch just inside its edge. */
const patch = (d: string, inner: string, color: string, thread: string = PAL.cream): string =>
  felt(d, color, seam(inner, thread, 1, 0.95), { outline: 1.8, shadow: 1.4, light: 0.8 });

const balloon = (() => {
  const shine = radial([[0, '#fff3d1', 0.55], [0.55, '#fff3d1', 0.12], [1, '#fff3d1', 0]], 0.34, 0.26, 0.5);
  // Horizontal panel seams follow the curve of the envelope.
  const bands = [-48, -34, -20].map((y) => {
    const w = y === -48 ? 26 : y === -34 ? 31 : 27;
    return `M${-w} ${y} Q0 ${y + 6} ${w} ${y}`;
  });
  return (
    // Main rigging ropes down to the basket.
    rope([-9, 1], [-13, 20], [-16, 38], 2, PAL.creamD, 1.6) +
    rope([9, 1], [13, 20], [16, 38], 2, PAL.creamD, 1.6) +
    // Envelope: rust and cream gores.
    `<path d="${ENVELOPE}" fill="${PAL.rust}" stroke="none"/>` +
    within(
      ENVELOPE,
      paint(gore(0.68), PAL.cream) +
        paint(gore(0.34), PAL.rust) +
        // Painted seams between the narrower panels, and the stitched horizontal seams.
        stroke([0.86, 0.52, 0.17].map((k) => goreSeam(k) + ' ' + goreSeamL(k)).join(' '), INK, 1, 0.22) +
        bands.map((d) => seam(d, PAL.rustD, 1, 0.55)).join('') +
        // Rigging net over the lower half.
        stroke('M-27 -28 Q-18 -14 -9 -2 M27 -28 Q18 -14 9 -2 M-16 -36 Q-10 -16 -4 -2 M16 -36 Q10 -16 4 -2', PAL.creamD, 1, 0.75) +
        // Volume: a broad soft shadow on the lower right, a deep core shadow, and a warm sheen.
        crescent(ENVELOPE, -12, -9, '#2a2340', 0.18) +
        crescent(ENVELOPE, -5, -5, '#2a2340', 0.22) +
        shine.def +
        `<path d="${ENVELOPE}" fill="${shine.url}" stroke="none"/>` +
        crescent(ENVELOPE, 2.2, 2.4, '#fff3d1', 0.4),
    ) +
    stroke(gore(0.68), INK, 2) +
    stroke(gore(0.34), INK, 2) +
    `<path d="${ENVELOPE}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
    // Patches: mustard square, teal scrap and a small cream darn.
    patch('M-29 -44 L-17 -46 L-16 -33 L-28 -31 Z', 'M-27 -42 L-19 -43.5 L-18 -35 L-26 -33.5 Z', PAL.mustard, PAL.rustD) +
    stroke('M-25.6 -40.6 L-20.4 -36 M-20.6 -41 L-25 -35.6', PAL.rustD, 0.9, 0.7) +
    patch('M15 -24 L26 -28 L28 -17 L18 -13 Z', 'M17.4 -22.6 L24.8 -25.4 L26.2 -18.2 L19 -15.4 Z', PAL.teal) +
    glint(-15, -50, 1.6, '#fffaf0', 0.7) +
    // Vent cap on top.
    felt('M-10 -60 Q0 -64.4 10 -60 Q0 -52 -10 -60 Z', PAL.teal, seam('M-7 -59.6 Q0 -57 7 -59.6', PAL.cream, 0.9, 0.9), { outline: 2.4, shadow: 1.2, light: 0.7 }) +
    // Load ring and the brass burner with its flame.
    metal(rrect(-10, -3.6, 20, 3.6, 1.6), PAL.iron, '', { outline: 2, shadow: 0.8 }) +
    metal('M-8.6 0 L8.6 0 L6.8 8 L-6.8 8 Z', PAL.mustard, stroke('M-4 1.4 L-3.4 6.6 M0 1.4 L0 6.6 M4 1.4 L3.4 6.6', PAL.mustardD, 0.9, 0.85), { outline: 2.6, shadow: 1.2 }) +
    glint(-5.4, 2, 0.7) +
    `<ellipse cx="0" cy="-4" rx="6.6" ry="4.4" fill="${PAL.amber}" stroke="none" opacity="0.35"/>` +
    paint('M0 -9.6 Q4.2 -4.4 2.2 -1.6 Q0 0.2 -2.2 -1.6 Q-4.2 -4.4 0 -9.6 Z', PAL.ember, 0.95) +
    paint('M0 -6.8 Q2.2 -3.6 1.1 -2.2 Q0 -1.2 -1.1 -2.2 Q-2.2 -3.6 0 -6.8 Z', PAL.amberL)
  );
})();

/** Leather sleeve with a cuff and a gloved fist. */
const arm = (to: [number, number], cloth: string, skin: string, pinned: boolean, from: [number, number] = [0, 0]): string =>
  litTube(`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`, 5, cloth, { outline: 3, shadow: 1.6, light: 0.8 }) +
  stroke(`M${r1(to[0] * 0.78 - 2.6)} ${r1(to[1] * 0.78 - 0.4)} L${r1(to[0] * 0.78 + 2.6)} ${r1(to[1] * 0.78 + 0.8)}`, tone(cloth, -0.4), 1.2, 0.85) +
  lit(oval(to[0] - 2, to[1] + 2.2, 4.3), skin, { outline: 3, shadow: 1.5, light: 0.9 }) +
  stroke(`M${r1(to[0] - 5.4)} ${r1(to[1] + 2.4)} Q${r1(to[0] - 3.6)} ${r1(to[1] + 4.6)} ${r1(to[0] - 1)} ${r1(to[1] + 4)}`, tone(skin, -0.4), 0.9, 0.85) +
  (pinned ? brassPin(from[0], from[1], 2.3) : '');

const TORSO = 'M-10 -13 Q-12 0 -11 9 L11 9 Q12 0 10 -13 Q0 -17 -10 -13 Z';

const body =
  // Scarf tail streaming behind, striped and fringed.
  litTube('M6 -11 Q16 -14 25 -7', 3.4, PAL.cream, { outline: 2.6, shadow: 1, light: 0.5 }) +
  stroke('M12 -12.4 L12.6 -10 M17.4 -12 L17.6 -9.6', PAL.rust, 1.4, 0.85) +
  stroke('M25 -7 L27.4 -5 M24.4 -6 L26 -3.6 M25.6 -8 L28.6 -7', PAL.creamD, 1, 0.9) +
  // Leather flying jacket with a seam, buttons and a fleece collar.
  felt(
    TORSO,
    PAL.wood,
    paint('M-12 3 H12 V10 H-12 Z', PAL.woodD, 0.55) +
      fold('M5 -12 Q7.6 -4 6.6 6', PAL.wood, 1.1, 0.7) +
      stroke('M-1.4 -11 L-1.6 9', tone(PAL.wood, -0.4), 1.1, 0.8) +
      seam('M-10.4 3.6 H10.4', PAL.creamD, 1, 0.7) +
      rim('M-8.6 -13.4 Q-4 -15.2 0 -15', 1.1, 0.45),
    { shadow: 2.8, light: 1.2 },
  ) +
  lit(oval(-3.6, -4.6, 1.2), PAL.mustard, { outline: 1, shadow: 0.5, light: 0.3 }) +
  lit(oval(-3.6, 0.6, 1.2), PAL.mustard, { outline: 1, shadow: 0.5, light: 0.3 }) +
  litTube('M-8 -12 Q0 -8 8 -12', 3.4, PAL.cream, { outline: 2.4, shadow: 1, light: 0.5 }) +
  stroke('M-6 -11.4 L-5.2 -9.6 M-2.4 -10.4 L-2 -8.6 M1.6 -10.4 L1.4 -8.6 M5 -11.2 L4.6 -9.6', PAL.creamD, 0.8, 0.9);

const FACE = oval(-1, -8, 10.5);
const CAP = 'M-12 -9 Q-12 -19 -1 -19 Q10 -19 10 -8 L10 1 Q6 3 4 0 L4 -9 Z';

const head =
  felt(
    FACE,
    PAL.skin,
    // Shadow under the cap and a little stubble on the chin.
    paint('M-14 -12 H10 V-9 Q-2 -10 -14 -9.4 Z', tone(PAL.skin, -0.3), 0.5) + paint(oval(-3, 1.4, 7, 2.6), tone(PAL.skin, -0.14), 0.6),
    { shadow: 3, light: 1.4 },
  ) +
  // Leather aviator cap with a seam and an ear flap.
  felt(
    CAP,
    PAL.woodD,
    stroke('M-1 -19 Q-1.6 -14 -1.4 -9.6', tone(PAL.woodD, -0.4), 1, 0.8) +
      seam('M5.6 -6 L5.6 -0.4 Q7 1 8.6 0', PAL.creamD, 0.9, 0.8) +
      rim('M-9.4 -14.6 Q-6 -18.2 -1 -18.4', 1.1, 0.5),
    { shadow: 2, light: 1 },
  ) +
  // Goggle strap and brass-rimmed goggles; eyes peer through the glass.
  stroke('M-3 -10 L10 -10', INK, 3) +
  stroke('M-3 -10.4 L10 -10.4', tone(PAL.woodD, 0.2), 1, 0.7) +
  metal(oval(-9, -9, 5), PAL.mustard, '', { outline: 2.4, shadow: 1 }) +
  metal(oval(1, -9, 5), PAL.mustard, '', { outline: 2.4, shadow: 1 }) +
  `<circle cx="-9" cy="-9" r="3.4" fill="${PAL.tealL}" stroke="${PAL.mustardD}" stroke-width="0.8"/>` +
  `<circle cx="1" cy="-9" r="3.4" fill="${PAL.tealL}" stroke="${PAL.mustardD}" stroke-width="0.8"/>` +
  `<circle cx="-9.8" cy="-8.6" r="1.2" fill="${INK}" stroke="none"/><circle cx="0.2" cy="-8.6" r="1.2" fill="${INK}" stroke="none"/>` +
  paint('M-11.6 -8.4 Q-9 -12.2 -6.4 -10.6 Q-9 -10.6 -11.6 -8.4 Z', PAL.pale, 0.75) +
  paint('M-1.6 -8.4 Q1 -12.2 3.6 -10.6 Q1 -10.6 -1.6 -8.4 Z', PAL.pale, 0.75) +
  glint(-10.6, -10.4, 0.7) +
  glint(-0.6, -10.4, 0.7) +
  // Button nose, rosy cheek and a cheerful grin.
  lit(oval(-12, -4, 2.4, 2), PAL.skinD, { outline: 1.5, shadow: 0.8, light: 0.6 }) +
  blush(-5.8, -2.6, 2.4, 1.5, 0.4) +
  stroke('M-10.6 -1.4 Q-6.6 1.2 -2.6 -1.4', INK, 1.8) +
  paint('M-9.6 -0.9 Q-6.6 0.8 -3.6 -1 Q-6.6 -0.2 -9.6 -0.9 Z', '#fffaf0', 0.9);

const BASKET = 'M-19 -9 L19 -9 L16 7.5 L-16 7.5 Z';

/** Over-and-under wicker weave: rows of rounded strands, each row offset by half a stake. */
const weave = (): string => {
  let lit1 = '';
  let dark = '';
  let n = 0;
  for (let y = -7.4; y < 8; y += 3.4, n++) {
    for (let x = -20 + (n % 2) * 3.6; x < 20; x += 7.2) {
      lit1 += `M${r1(x + 0.8)} ${r1(y + 0.4)} Q${r1(x + 3.6)} ${r1(y - 1)} ${r1(x + 6.4)} ${r1(y + 0.4)} `;
      dark += `M${r1(x + 0.6)} ${r1(y + 1.4)} Q${r1(x + 3.6)} ${r1(y + 2.6)} ${r1(x + 6.6)} ${r1(y + 1.4)} `;
    }
  }
  return stroke(dark, tone(PAL.mustardD, -0.42), 1.2, 0.85) + stroke(lit1, tone(PAL.mustard, 0.35), 1, 0.7);
};

const basket =
  felt(
    BASKET,
    PAL.mustardD,
    weave() +
      // Upright stakes peeking between the weavers.
      stroke('M-12.6 -8 L-11.2 7 M-5 -8 L-4.4 7 M2.6 -8 L2.4 7 M10.2 -8 L9.4 7', tone(PAL.mustardD, -0.3), 0.9, 0.5),
    { shadow: 3, light: 1.2 },
  ) +
  // Rim: a bent wooden hoop bound with rope.
  felt(rrect(-22, -12, 44, 5.5, 2.7), PAL.wood, stroke('M-20 -10.4 H20', tone(PAL.wood, -0.3), 0.8, 0.6) + rim('M-19 -11 H19', 1, 0.5), { shadow: 1.6, light: 0.9 }) +
  stroke('M-17 -12.6 L-15 -6 M-15.4 -12.6 L-13.4 -6 M14 -12.6 L16 -6 M15.6 -12.6 L17.6 -6', INK, 2.4) +
  stroke('M-17 -12.6 L-15 -6 M-15.4 -12.6 L-13.4 -6 M14 -12.6 L16 -6 M15.6 -12.6 L17.6 -6', PAL.creamD, 1.2) +
  // Sandbag hanging off the side on a short rope.
  rope([21, -7], [22.6, -5], [24, -2.4], 1.6, PAL.creamD, 1.4) +
  felt(
    'M23 -3 Q31 -3 30 5 Q26 9 21 5 Q20 0 23 -3 Z',
    PAL.rust,
    stroke('M22 1.6 Q25.6 3.2 29.6 1.2', tone(PAL.rust, -0.35), 0.9, 0.8) + seam('M24.6 -1.6 Q25 3 24.4 7', PAL.creamD, 0.8, 0.8),
    { outline: 2.4, shadow: 1.6, light: 0.8 },
  ) +
  lit(oval(24.2, -2.6, 1.6, 1.1), PAL.creamD, { outline: 1.2, shadow: 0.5, light: 0.3 });

/** Balloonist: a goggled pilot in a wicker basket under a patched, striped balloon. */
export const balloonistRig: CharacterRig = {
  parts: [
    part('balloon', 0, -56, 'static', [-40, -70, 40, 44], balloon),
    part('armBack', 7, -26, 'armBack', [-12, -10, 18, 24], arm([3, 10], PAL.woodD, PAL.skinD, false)),
    part('body', 0, -16, 'body', [-17, -21, 33, 16], body),
    part('head', 0, -30, 'head', [-22, -25, 19, 9], head),
    part('basket', 0, -9, 'static', [-28, -18, 36, 13], basket),
    part('armFront', -7, -27, 'armFront', [-22, -10, 10, 22],arm([-8, 9], PAL.wood, PAL.skin, true, [0.6, 2.6])),
  ],
};
