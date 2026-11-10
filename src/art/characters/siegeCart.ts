import type { CharacterRig } from '../types';
import { glint, lit, litTube, paint, r1, radial, rng, stroke, tone, within } from '../shade';
import { INK, PAL, blush, brassPin, brow, felt, fold, metal, oval, part, rim, rivet, rope, rrect, seam } from './kit';

const BED = rrect(-62, -12, 124, 24, 3);

/** Wavy wood grain across a plank from x0 to x1 around height y. */
function grain(seed: number, x0: number, x1: number, y: number, h: number, base: string, lines = 3): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < lines; i++) {
    const yy = y - h / 2 + (h * (i + 0.5)) / lines + (r() - 0.5) * 1.2;
    let x = x0 + r() * 6;
    while (x < x1 - 6) {
      const len = 14 + r() * 26;
      const end = Math.min(x1, x + len);
      const wob = (r() - 0.5) * 1.8;
      d += `M${r1(x)} ${r1(yy)} Q${r1((x + end) / 2)} ${r1(yy + wob)} ${r1(end)} ${r1(yy + (r() - 0.5) * 0.8)} `;
      x = end + 3 + r() * 8;
    }
  }
  return stroke(d, tone(base, -0.32), 0.9, 0.6);
}

/** A knot in the wood: dark core and growth rings swirling round it. */
const knot = (x: number, y: number, base: string, s = 1): string =>
  paint(oval(x, y, 2.2 * s, 0.8 * s), tone(base, -0.45), 0.8) +
  stroke(`M${r1(x - 9 * s)} ${r1(y - 0.4 * s)} Q${r1(x - 4 * s)} ${r1(y - 0.6 * s)} ${r1(x - 2.6 * s)} ${r1(y - 1.8 * s)} Q${x} ${r1(y - 2.8 * s)} ${r1(x + 2.8 * s)} ${r1(y - 1.6 * s)} Q${r1(x + 4.4 * s)} ${r1(y - 0.4 * s)} ${r1(x + 9 * s)} ${r1(y - 0.6 * s)}`, tone(base, -0.32), 0.8, 0.6) +
  stroke(`M${r1(x - 8 * s)} ${r1(y + 0.8 * s)} Q${r1(x - 3.6 * s)} ${r1(y + 1 * s)} ${r1(x - 2 * s)} ${r1(y + 1.8 * s)} Q${x} ${r1(y + 2.4 * s)} ${r1(x + 2.2 * s)} ${r1(y + 1.6 * s)} Q${r1(x + 4 * s)} ${r1(y + 0.8 * s)} ${r1(x + 8 * s)} ${r1(y + 1 * s)}`, tone(base, -0.32), 0.8, 0.55);

/** A painted diamond on the planks, with its paint chipped and worn at the edges. */
function diamond(x: number, color: string, seed: number): string {
  const d = `M${x} -8 L${x + 7} 0 L${x} 8 L${x - 7} 0 Z`;
  const r = rng(seed);
  let chips = '';
  for (let i = 0; i < 3; i++) {
    const cx = x + (r() - 0.5) * 8;
    const cy = (r() - 0.5) * 10;
    const s = 0.7 + r() * 0.9;
    chips += `M${r1(cx - s)} ${r1(cy - s * 0.4)} L${r1(cx + s * 0.3)} ${r1(cy - s)} L${r1(cx + s)} ${r1(cy + s * 0.2)} L${r1(cx - s * 0.2)} ${r1(cy + s * 0.8)} Z `;
  }
  return (
    paint(d, color) +
    within(
      d,
      paint(`M${x + 8} -2 L${x + 8} 9 H${x - 2} Z`, tone(color, -0.25), 0.5) +
        paint(`M${x - 8} -9 H${x + 1} L${x - 8} 1 Z`, tone(color, 0.3), 0.45) +
        paint(chips, PAL.wood, 0.85) +
        // The plank seams run through the paint too.
        stroke(`M${x - 8} -4 H${x + 8} M${x - 8} 4 H${x + 8}`, tone(color, -0.55), 1.2, 0.7),
    ) +
    stroke(d, INK, 1.8, 0.85)
  );
}

const wagon =
  // Undercarriage beam with axle blocks.
  lit(rrect(-49, 11, 98, 7, 2), PAL.woodD, { shadow: 2, light: 1 }) +
  within(rrect(-49, 11, 98, 7, 2), grain(4, -48, 48, 14.5, 5, PAL.woodD, 2)) +
  // The bed: three planks with grain, knots, seams and nails.
  felt(
    BED,
    PAL.wood,
    paint('M-64 -4 H64 V4 H-64 Z', tone(PAL.wood, -0.06)) +
      paint('M-64 4 H64 V14 H-64 Z', tone(PAL.wood, 0.04)) +
      grain(1, -54, 54, -8, 7, PAL.wood) +
      grain(2, -54, 54, 0, 7, PAL.wood) +
      grain(3, -54, 54, 8, 7, PAL.wood) +
      knot(-45, -7.6, PAL.wood) +
      knot(41, 1, PAL.wood, 0.9) +
      knot(15, 8.4, PAL.wood, 0.8) +
      stroke('M-64 -4 H64 M-64 4 H64', tone(PAL.wood, -0.55), 1.6, 0.95) +
      stroke('M-64 -2.8 H64 M-64 5.2 H64', tone(PAL.wood, 0.35), 0.8, 0.55) +
      diamond(-34, PAL.rust, 11) +
      diamond(-14, PAL.teal, 12) +
      diamond(6, PAL.mustard, 13) +
      diamond(26, PAL.rust, 14) +
      [-8, 0, 8].map((y) => rivet(-50.5, y, 1.1, PAL.iron) + rivet(50.5, y, 1.1, PAL.iron)).join('') +
      rim('M-56 -11 H56', 1.4, 0.5),
    { shadow: 4.2, light: 1.8 },
  ) +
  // Iron end caps with rivets and a dent.
  metal(rrect(-62, -12, 9, 24, 2), PAL.iron, stroke('M-59.5 -6 Q-58 -4 -59.6 -1.6', tone(PAL.iron, -0.4), 1, 0.7)) +
  metal(rrect(53, -12, 9, 24, 2), PAL.iron, stroke('M56.4 3 Q58 5 56.6 7.4', tone(PAL.iron, -0.4), 1, 0.7)) +
  [-7, 0, 7].map((y) => rivet(-57.5, y, 1.4, PAL.ironL) + rivet(57.5, y, 1.4, PAL.ironL)).join('') +
  glint(-59.6, -9.4, 0.8) +
  glint(55.4, -9.4, 0.8);

/** A spoked cartwheel. Shading is round-symmetric, because the wheel spins. */
function wheelArt(): string {
  const tire = radial([[0.7, tone(PAL.iron, -0.3)], [0.8, PAL.ironL], [0.9, PAL.iron], [1, tone(PAL.iron, -0.4)]], 0.5, 0.5, 0.5);
  const spoke = (deg: number, color: string, w: number): string => {
    const a = (deg * Math.PI) / 180;
    const x = r1(Math.cos(a) * 11);
    const y = r1(Math.sin(a) * 11);
    return litTube(`M0 0 L${x} ${y}`, w, color, { outline: 1.4, shadow: 0, light: 0 }) + stroke(`M${r1(x * 0.35)} ${r1(y * 0.35)} L${r1(x * 0.85)} ${r1(y * 0.85)}`, tone(color, -0.35), 0.7, 0.7);
  };
  let bolts = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.2;
    bolts += rivet(r1(Math.cos(a) * 14.3), r1(Math.sin(a) * 14.3), 0.9, PAL.ironL);
  }
  let joints = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.5;
    joints += `M${r1(Math.cos(a) * 9.4)} ${r1(Math.sin(a) * 9.4)} L${r1(Math.cos(a) * 12.4)} ${r1(Math.sin(a) * 12.4)} `;
  }
  return (
    tire.def +
    `<circle cx="0" cy="0" r="17" fill="${tire.url}"/>` +
    bolts +
    // Wooden felloe ring with its joints, around a dark hollow.
    `<circle cx="0" cy="0" r="12.4" fill="${PAL.wood}" stroke-width="2.2"/>` +
    `<circle cx="0" cy="0" r="9.4" fill="${tone(PAL.woodD, -0.25)}" stroke="${tone(PAL.wood, -0.5)}" stroke-width="1.2"/>` +
    stroke(joints, tone(PAL.wood, -0.5), 1, 0.85) +
    [60, 120, 180, 240, 300].map((a) => spoke(a, PAL.wood, 2.6)).join('') +
    spoke(0, PAL.mustard, 3) +
    // Brass hub with a bolt.
    `<circle cx="0" cy="0" r="4.6" fill="${PAL.mustard}" stroke-width="2"/>` +
    `<circle cx="0" cy="0" r="2.6" fill="none" stroke="${PAL.mustardD}" stroke-width="1"/>` +
    `<circle cx="0" cy="0" r="1.2" fill="${tone(PAL.mustardD, -0.3)}" stroke="none"/>`
  );
}

const STAND = rrect(-9, -2, 18, 12, 2);
const STOCK = 'M26 -8 L-56 -10';

const crossbow =
  // Stand: a squat block lashed to the bed with rope.
  felt(STAND, PAL.woodD, grain(21, -9, 9, 4, 10, PAL.woodD, 3), { shadow: 2.2, light: 1 }) +
  rope([-8, 1], [-2, 5], [3, 10.6], 2.2, PAL.creamD, 1.4) +
  rope([-3, 0.4], [3, 4], [8, 9.6], 2.2, PAL.creamD, 1.4) +
  // The bow arm: rust-lacquered wood with a stitched leather grip and iron nocks.
  litTube('M-34 -28 Q-68 -9 -34 10', 5, PAL.rust, { shadow: 1.7, light: 0.9 }) +
  stroke('M-36.6 -24 Q-60 -9 -36.6 6', tone(PAL.rust, 0.35), 0.9, 0.55) +
  litTube('M-48.6 -21.4 Q-53.2 -10 -48.6 1.4', 5.4, PAL.sootD, { outline: 0, shadow: 1.6, light: 0.8 }) +
  seam('M-48 -20 Q-52.4 -10 -48 0', PAL.cream, 1.1, 0.9) +
  metal(oval(-34, -28, 3.2), PAL.iron, '', { outline: 2, shadow: 1 }) +
  metal(oval(-34, 10, 3.2), PAL.iron, '', { outline: 2, shadow: 1 }) +
  // Bowstring: twisted cord.
  stroke('M-34 -28 L12 -10 L-34 10', INK, 4.6) +
  stroke('M-34 -28 L12 -10 L-34 10', PAL.creamD, 2.2) +
  stroke('M-34 -28 L12 -10 L-34 10', PAL.cream, 2.2, 0.8).replace('stroke-linecap="round"', 'stroke-linecap="butt" stroke-dasharray="1.6 1.8"') +
  // Stock with grain and two iron bands.
  litTube(STOCK, 7, PAL.woodD, { shadow: 2.2, light: 1.1 }) +
  stroke('M20 -9.2 Q0 -9.6 -20 -10 M14 -7.4 Q-6 -7.8 -30 -8.2', tone(PAL.woodD, -0.4), 0.8, 0.65) +
  metal(rrect(-42, -14.4, 4.4, 8.6, 1), PAL.iron, '', { outline: 1.8, shadow: 0.8 }) +
  metal(rrect(-2, -13.6, 4.4, 8.6, 1), PAL.iron, '', { outline: 1.8, shadow: 0.8 }) +
  rivet(-39.8, -10, 0.8, PAL.ironL) +
  rivet(0.2, -9.3, 0.8, PAL.ironL) +
  // The bolt: ash shaft, two-colour fletching, iron head with a glint.
  felt('M18 -14 L10 -21.4 L3.6 -21 L9.4 -14 L3.6 -7 L10 -6.6 Z', PAL.mustard, stroke('M5.6 -19.4 L11 -14 M5.6 -8.6 L11 -14 M8 -20 L13 -15 M8 -8 L13 -13', PAL.mustardD, 0.8, 0.8), {
    outline: 2,
    shadow: 1.2,
    light: 0.6,
  }) +
  litTube('M16 -14 L-64 -14', 2.5, PAL.creamD, { outline: 2.4, shadow: 0.8, light: 0.5 }) +
  stroke('M8 -14.6 L-56 -14.6', '#fff3d1', 0.6, 0.5) +
  metal('M-61.6 -19.6 L-73.4 -14 L-61.6 -8.4 L-63.4 -14 Z', PAL.ironL, stroke('M-62.8 -16.8 L-70 -14', '#fff3d1', 0.8, 0.7), { outline: 2.6, shadow: 1.2 }) +
  glint(-66.6, -15.6, 0.8) +
  // Crank, its handle reaching down to the operator's hand.
  litTube('M30 -7 L25.6 -0.6', 2.4, PAL.iron, { outline: 2, shadow: 0.6, light: 0.4 }) +
  lit(rrect(22.6, -2.4, 5, 4.4, 2), PAL.woodD, { outline: 1.8, shadow: 1, light: 0.6 }) +
  metal(oval(30, -7, 4.6), PAL.iron, `<circle cx="30" cy="-7" r="2.7" fill="none" stroke="${tone(PAL.iron, -0.4)}" stroke-width="0.9"/>`, { outline: 2.2, shadow: 1.3 }) +
  rivet(30, -7, 1.2, PAL.ironL);

const TUNIC = 'M-6 -11 Q-9 -3 -8 5 L8 5 Q9 -3 6 -11 Q0 -14 -6 -11 Z';
// The operator is tiny, so his pieces get a lighter outline than the cart; otherwise the ink swamps his face.
const OP_INK = 2.6;

const operatorBody =
  felt(
    TUNIC,
    PAL.teal,
    paint('M-10 1 H10 V7 H-10 Z', PAL.tealD, 0.6) +
      seam('M-7.6 1.6 H7.6', PAL.mustard, 1.2, 0.95) +
      fold('M3 -9 Q5 -4 4.4 0', PAL.teal, 1, 0.7) +
      rim('M-5 -11.4 Q0 -13 5 -11.4', 1, 0.45),
    { shadow: 2.4, light: 1.1, outline: OP_INK },
  ) +
  // Cream collar.
  felt('M-5.4 -11.4 Q0 -8.4 5.4 -11.4 Q0 -13.6 -5.4 -11.4 Z', PAL.cream, '', { outline: 1.6, shadow: 0.8, light: 0 });

const FACE = oval(-1, -6, 8.5);
const CAP = 'M-10 -8 Q-9 -18 -1 -18 Q8 -18 8 -8 Z';

const operatorHead =
  // Ponytail of rust hair behind.
  felt('M2 -12 Q9 -19 13 -9 Q10 -8 9 -3 Q6 -8 2 -8 Z', PAL.rustD, stroke('M5 -12 Q9 -14 11 -9', tone(PAL.rustD, 0.3), 0.8, 0.7), { outline: 2.4, shadow: 1.2, light: 0.6 }) +
  felt(FACE, PAL.skin, paint(oval(-1, 0.6, 7.4, 3.2), tone(PAL.skin, -0.14), 0.6), { shadow: 2.6, light: 1.2, outline: OP_INK }) +
  // Knitted cap with ribbing and a bobble.
  felt(
    CAP,
    PAL.rust,
    stroke('M-6 -9 Q-6.4 -13 -5 -16.6 M-2.6 -8.6 Q-2.8 -13 -2 -17.6 M1 -8.6 Q1.2 -13 1.4 -17.6 M4.4 -9 Q4.8 -13 4.4 -16.6', tone(PAL.rust, -0.34), 0.9, 0.7) +
      paint('M-11 -10.4 H9 V-7 H-11 Z', tone(PAL.rust, -0.2), 0.7) +
      rim('M-7.4 -15.4 Q-3.6 -17.8 0.6 -17.6', 1, 0.5),
    { shadow: 2, light: 1, outline: OP_INK },
  ) +
  lit(oval(-1, -19.6, 2.6), PAL.mustard, { outline: 1.8, shadow: 0.9, light: 0.6 }) +
  // Worried face: brows tilted up in the middle, wide eyes, a wobbly mouth and a bead of sweat.
  brow('M-8.6 -6.4 L-5.2 -7.6', 1.4) +
  brow('M-2.4 -7.6 L0.6 -6.6', 1.4) +
  `<circle cx="-6" cy="-3.8" r="1.9" fill="#fffaf0" stroke="${INK}" stroke-width="0.9"/>` +
  `<circle cx="-1" cy="-3.8" r="1.9" fill="#fffaf0" stroke="${INK}" stroke-width="0.9"/>` +
  `<circle cx="-6.4" cy="-3.6" r="1" fill="${INK}" stroke="none"/><circle cx="-1.4" cy="-3.6" r="1" fill="${INK}" stroke="none"/>` +
  `<circle cx="-6.8" cy="-4.1" r="0.35" fill="#fffaf0" stroke="none"/><circle cx="-1.8" cy="-4.1" r="0.35" fill="#fffaf0" stroke="none"/>` +
  lit(oval(-10, -1.6, 2.6, 2.1), PAL.skinD, { outline: 1.6, shadow: 0.8, light: 0.6 }) +
  blush(-5.6, 0.2, 1.8, 1.2, 0.35) +
  stroke('M-7 2.4 Q-5.6 1.4 -4.2 2.4 Q-2.8 3.2 -1.6 2.2', INK, 1.1) +
  lit('M5.4 -6.4 Q7 -3.8 6 -2.6 Q4.6 -2.4 4.6 -4 Q4.8 -5.2 5.4 -6.4 Z', '#cfe8f2', { outline: 0.9, shadow: 0.5, light: 0.3 }) +
  glint(5.3, -3.6, 0.35);

const operatorArm =
  litTube('M0 1 L-9 2', 4, PAL.tealD, { outline: OP_INK, shadow: 1.2, light: 0.6 }) +
  stroke('M-7 -0.6 L-7.2 4.4', tone(PAL.tealD, -0.35), 1, 0.85) +
  lit(oval(-11, 2.6, 3.6), PAL.skin, { outline: 2.2, shadow: 1.2, light: 0.7 }) +
  stroke('M-13.4 3 Q-12 4.6 -10 4', tone(PAL.skin, -0.38), 0.9, 0.8) +
  brassPin(0, 1, 1.8);

/** Siege Cart: a plank wagon with a huge mounted crossbow and a tiny worried operator. */
export const siegeCartRig: CharacterRig = {
  parts: [
    part('wagon', 0, -40, 'static', [-68, -18, 68, 24], wagon),
    part('wheelBack', 40, -19, 'spin', [-22, -22, 22, 22], wheelArt()),
    part('wheelFront', -40, -19, 'spin', [-22, -22, 22, 22], wheelArt()),
    part('crossbow', 10, -62, 'static', [-80, -40, 44, 20], crossbow),
    part('operatorBody', 50, -58, 'body', [-14, -18, 16, 10], operatorBody),
    part('operatorHead', 50, -69, 'head', [-16, -26, 18, 7], operatorHead),
    part('operatorArm', 46, -65, 'armFront', [-21, -12, 10, 15], operatorArm),
  ],
};
