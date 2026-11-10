import type { CharacterRig } from '../types';
import { crescent, glint, lit, paint, r1, rng, stroke, tone, within } from '../shade';
import { INK, PAL, oval, part } from './kit';

const OUT = 4;
const SKIN = PAL.slate;

/**
 * A shaggy fur piece drawn as one silhouette: thick ink underneath (so overlapping clumps merge),
 * the wool on top with a broad soft shadow, a darker core shadow, a light edge, then `details`.
 */
function shag(d: string, base: string, details: string, shadow = 7, light = 2.6): string {
  return (
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${OUT * 2}" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="${base}" stroke="none"/>` +
    crescent(d, -shadow * 2, -shadow * 2.2, tone(base, -0.13), 0.85) +
    crescent(d, -shadow, -shadow * 1.1, tone(base, -0.27)) +
    crescent(d, light, light * 1.1, tone(base, 0.5)) +
    within(d, details)
  );
}

/**
 * Layered fur: rows of hanging tuft tips, each with a dark under-edge and a pale strand on its lit
 * side, plus loose single hairs. Jittered on a staggered grid inside an ellipse so it reads as
 * overlapping layers of wool rather than noise.
 */
function tufts(seed: number, cx: number, cy: number, rx: number, ry: number, base: string, size = 1, gap = 15): string {
  const r = rng(seed);
  const dark = tone(base, -0.34);
  const pale = tone(base, 0.6);
  let dk = '';
  let lt = '';
  let hair = '';
  const row = gap * 0.82 * size;
  const col = gap * size;
  let n = 0;
  for (let y = cy - ry; y <= cy + ry; y += row, n++) {
    for (let x = cx - rx + (n % 2) * col * 0.5; x <= cx + rx; x += col) {
      const jx = x + (r() - 0.5) * col * 0.45;
      const jy = y + (r() - 0.5) * row * 0.4;
      const ex = (jx - cx) / rx;
      const ey = (jy - cy) / ry;
      if (ex * ex + ey * ey > 1 || r() < 0.22) continue;
      const s = size * (0.75 + r() * 0.45);
      const lean = (r() - 0.35) * 1.6 * s;
      dk += `M${r1(jx - 4.2 * s)} ${r1(jy - 3 * s)} Q${r1(jx - 1.2 * s + lean)} ${r1(jy - 0.2 * s)} ${r1(jx + lean)} ${r1(jy + 4 * s)} Q${r1(jx + 1 * s + lean)} ${r1(jy - 0.4 * s)} ${r1(jx + 4.2 * s)} ${r1(jy - 3.2 * s)} `;
      lt += `M${r1(jx - 3.4 * s)} ${r1(jy - 5 * s)} Q${r1(jx - 1.4 * s)} ${r1(jy - 2.8 * s)} ${r1(jx - 0.6 * s + lean)} ${r1(jy + 0.8 * s)} `;
      if (r() < 0.55) {
        const hx = jx + col * 0.5;
        const hy = jy + row * 0.3;
        hair += `M${r1(hx)} ${r1(hy - 2.5 * s)} q${r1(1.2 * s)} ${r1(2.6 * s)} ${r1(-0.3 * s)} ${r1(5.2 * s)} `;
      }
    }
  }
  return stroke(lt, pale, 1.15 * size, 0.7) + stroke(hair, dark, 0.9 * size, 0.3) + stroke(dk, dark, 1.4 * size, 0.42);
}

/** Closed shaggy outline: an ellipse with `n` hooked tufts that droop by `droop`. */
function furPath(cx: number, cy: number, rx: number, ry: number, n: number, amp = 0.14, droop = 0, phase = 0): string {
  const at = (a: number, k: number): [number, number] => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  const step = (Math.PI * 2) / n;
  const [sx, sy] = at(phase, 1);
  let d = `M${r1(sx)} ${r1(sy)}`;
  for (let i = 0; i < n; i++) {
    const a = phase + i * step;
    const [qx, qy] = at(a + step * 0.1, 1 + amp * 0.9);
    const [tx, ty] = at(a + step * 0.55, 1 + amp);
    const [vx, vy] = at(a + step, 1);
    d += ` Q${r1(qx)} ${r1(qy)} ${r1(tx)} ${r1(ty + droop)} L${r1(vx)} ${r1(vy)}`;
  }
  return `${d} Z`;
}

/** Blue-grey hide: base, shadow and light crescents and an ink outline. */
const hide = (d: string, outline = 3, shadow = 3, light = 1.4): string =>
  lit(d, SKIN, { outline, shadow, light, lightK: 0.32, shadowK: -0.3 });

/** A curved claw, pale horn colour with a dark tip. */
const claw = (x: number, y: number, s = 1): string => {
  const d = `M${r1(x - 2.4 * s)} ${r1(y)} Q${r1(x - 1.6 * s)} ${r1(y + 4.6 * s)} ${r1(x + 1.6 * s)} ${r1(y + 5.6 * s)} Q${r1(x + 0.6 * s)} ${r1(y + 2.6 * s)} ${r1(x + 2.4 * s)} ${r1(y)} Z`;
  return lit(d, '#e4dcc8', { outline: 1.6, shadow: 0.9, light: 0.5 }) + paint(`M${r1(x + 0.4 * s)} ${r1(y + 4.2 * s)} L${r1(x + 1.6 * s)} ${r1(y + 5.6 * s)} L${r1(x + 1 * s)} ${r1(y + 3.4 * s)} Z`, '#8d8576', 0.8);
};

/** A foot planted on the ground under a shaggy thigh. */
function yetiLeg(wool: string, seed: number): string {
  const foot = 'M-31 42 Q-35.5 36 -30.5 31 Q-26 26.6 -16 26 L18 26 L18 42 Z';
  const thigh = furPath(0, 10, 24, 24, 13, 0.16, 2.5);
  return (
    hide(foot, OUT, 3.4, 1.4) +
    within(
      foot,
      // Sole, toe creases and a knuckle highlight.
      paint('M-40 38.5 H20 V46 H-40 Z', tone(SKIN, -0.38), 0.75) +
        stroke('M-25 41 Q-24.4 36.5 -22.6 34', tone(SKIN, -0.42), 1.4, 0.85) +
        stroke('M-17 41 Q-16.4 36 -14.6 33.4', tone(SKIN, -0.42), 1.4, 0.85) +
        stroke('M-31.4 34 Q-28 30 -22 29', '#fff3d1', 1.2, 0.4),
    ) +
    `<path d="${foot}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
    claw(-33.4, 36.6, 0.75) +
    claw(-29, 39.4, 0.7) +
    shag(
      thigh,
      wool,
      tufts(seed, 0, 12, 20, 22, wool, 0.95) +
        // Shadow under the belly, where the thigh disappears into the body.
        paint(oval(2, -4, 28, 13), tone(wool, -0.3), 0.55),
      6,
      2.4,
    )
  );
}

/** An arm hanging from the shoulder: shaggy upper arm and forearm over a knuckled blue-grey fist. */
function yetiArm(wool: string, lean: number, seed: number): string {
  const l = lean;
  const fist =
    `M${l - 20} 90 Q${l - 26.5} 110 ${l - 17} 114.5 Q${l - 12} 118.6 ${l - 6} 115.6 Q${l} 119.4 ${l + 6} 115.6 ` +
    `Q${l + 12} 118.6 ${l + 17} 114.5 Q${l + 26.5} 110 ${l + 20} 90 Z`;
  const fur = `${furPath(l * 0.3, 24, 21, 34, 12, 0.15, 2)} ${furPath(l, 64, 24, 34, 14, 0.14, 3, 0.2)}`;
  return (
    hide(fist, OUT, 4, 1.6) +
    within(
      fist,
      // Knuckle creases between the fingers, a darker palm edge and a light on the first knuckle.
      stroke(`M${l - 11} 117 Q${l - 11.6} 110 ${l - 10.4} 104`, tone(SKIN, -0.42), 1.6, 0.9) +
        stroke(`M${l} 118.6 Q${l - 0.6} 111 ${l + 0.4} 105`, tone(SKIN, -0.42), 1.6, 0.9) +
        stroke(`M${l + 11} 117 Q${l + 10.4} 110 ${l + 11.4} 104`, tone(SKIN, -0.42), 1.6, 0.9) +
        stroke(`M${l - 19} 108 Q${l - 17} 112.6 ${l - 13} 113.6`, '#fff3d1', 1.2, 0.45) +
        stroke(`M${l - 5} 112 Q${l - 3} 114.6 ${l + 1} 114.8`, '#fff3d1', 1, 0.35),
    ) +
    `<path d="${fist}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
    claw(l - 11.6, 116.4, 0.85) +
    claw(l - 0.4, 117.8, 0.85) +
    claw(l + 10.8, 116.4, 0.85) +
    shag(
      fur,
      wool,
      tufts(seed, l * 0.6, 50, 22, 50, wool, 0.95) +
        // The elbow crease where the forearm hangs from the upper arm.
        stroke(`M${l - 14} 38 Q${l - 2} 44 ${l + 12} 37`, tone(wool, -0.3), 1.6, 0.6),
      7,
      2.6,
    )
  );
}

/** A curling horn with growth ridges. */
function horn(d: string, ridges: string, tip: string): string {
  const base = '#e8dcc0';
  return (
    lit(d, base, { outline: 3, shadow: 2.2, light: 1, lightK: 0.45 }) +
    within(d, stroke(ridges, tone(base, -0.36), 1.2, 0.85) + paint(tip, tone(base, 0.5), 0.8)) +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
  );
}

const HEAD_FUR = furPath(0, -8, 24, 21, 14, 0.15, 1.5);
const FACE = oval(-9, -5, 11.4, 9.4);

const head =
  horn(
    'M-14 -24 Q-21 -37 -13 -45 Q-7.5 -37 -4.6 -27 Z',
    'M-22 -29 Q-13 -27 -3 -30 M-21 -33.5 Q-14 -31.6 -5 -34 M-19 -38 Q-14 -36.6 -8 -38.4 M-17 -41.6 Q-14 -40.6 -10 -42',
    'M-13 -45 Q-11 -42 -10 -39 L-12.4 -40 Z',
  ) +
  horn(
    'M8.6 -26.6 Q12 -38 19 -44 Q22.6 -33 15.6 -22.6 Z',
    'M6 -30 Q13 -28.6 21 -31 M7.6 -34.4 Q14 -33 21 -35.6 M10 -38.6 Q15 -37.6 20.6 -39.6',
    'M19 -44 Q20.4 -40 20.6 -37 L18.4 -39 Z',
  ) +
  shag(
    HEAD_FUR,
    PAL.snow,
    tufts(41, 2, -10, 22, 20, PAL.snow, 0.9, 13) +
      // Fur round the face sits in its own soft shadow, which makes the face feel set in.
      paint(oval(-9, -4, 15, 13), tone(PAL.snow, -0.22), 0.5),
    5,
    2.2,
  ) +
  // The face: blue-grey hide with a heavy brow, sunken angry eyes, a flat nose and a snarl.
  hide(FACE, 3, 2.8, 1.4) +
  within(
    FACE,
    paint('M-22 -15 H4 V-7.8 Q-9 -3.6 -22 -7.6 Z', tone(SKIN, -0.36), 0.6) +
      paint(oval(-9, 5.4, 9, 4.2), tone(SKIN, -0.28), 0.5) +
      stroke('M-18.6 -11.4 Q-12 -14.6 -4 -12.4', '#fff3d1', 1.1, 0.35),
  ) +
  `<path d="${FACE}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
  // Glowing amber eyes with slit pupils and a glint.
  `<circle cx="-13" cy="-5" r="2.3" fill="${PAL.amber}" stroke="${INK}" stroke-width="1.1"/>` +
  `<circle cx="-5" cy="-5" r="2.3" fill="${PAL.amber}" stroke="${INK}" stroke-width="1.1"/>` +
  paint('M-12.8 -6.8 Q-12.1 -5 -12.8 -3.2 Q-13.5 -5 -12.8 -6.8 Z', INK) +
  paint('M-4.8 -6.8 Q-4.1 -5 -4.8 -3.2 Q-5.5 -5 -4.8 -6.8 Z', INK) +
  glint(-13.8, -5.9, 0.6) +
  glint(-5.8, -5.9, 0.6) +
  // Furious brows: thick, low, meeting in the middle.
  `<path d="M-18.4 -10.8 L-10 -6.6" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/>` +
  `<path d="M0 -10.8 L-8 -6.6" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/>` +
  // Flat nose.
  lit('M-11.6 -1.8 Q-9 -3.2 -6.4 -1.8 Q-6.6 0.6 -9 0.8 Q-11.4 0.6 -11.6 -1.8 Z', PAL.slateD, { outline: 1.4, shadow: 0.9, light: 0.6 }) +
  `<circle cx="-10.2" cy="-0.4" r="0.55" fill="${INK}" stroke="none"/><circle cx="-7.8" cy="-0.4" r="0.55" fill="${INK}" stroke="none"/>` +
  glint(-10.2, -1.9, 0.45, '#fffaf0', 0.7) +
  // Snarl with two fangs.
  `<path d="M-15 2.6 Q-9 0.2 -3 2.6 Q-9 5.6 -15 2.6 Z" fill="#3b2533" stroke="none"/>` +
  `<path d="M-15.4 2.4 Q-9 -0.2 -2.6 2.4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
  `<path d="M-13 1.4 L-11.6 4.8 L-10.4 1 Z" fill="${PAL.cream}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>` +
  `<path d="M-7.6 1 L-6.4 4.8 L-5 1.4 Z" fill="${PAL.cream}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;

const BODY_FUR = `${furPath(0, 22, 36, 34, 16, 0.13, 3)} ${furPath(6, -26, 48, 32, 16, 0.14, 1, 0.1)}`;
const BELLY = furPath(-12, 24, 20, 25, 12, 0.12, 2);

const body =
  shag(
    BODY_FUR,
    PAL.snow,
    tufts(7, 4, -6, 54, 64, PAL.snow, 1.2, 16) +
      // Paler, softer belly wool.
      `<path d="${BELLY}" fill="${PAL.ice}" stroke="none"/>` +
      crescent(BELLY, -4, -4.4, tone(PAL.ice, -0.2), 0.9) +
      crescent(BELLY, 1.6, 1.8, tone(PAL.ice, 0.45)) +
      tufts(23, -12, 26, 17, 22, PAL.ice, 0.85, 12) +
      stroke(BELLY, tone(PAL.ice, -0.25), 1.4, 0.6) +
      // Cast shadow of the head on the shoulders.
      paint(oval(-12, -30, 28, 11), tone(PAL.snow, -0.32), 0.42),
    10,
    3,
  );

/** Yeti: an enormous shaggy brute with stubby ridged horns and a tiny furious face. */
export const yetiRig: CharacterRig = {
  parts: [
    part('armBack', 33, -140, 'armBack', [-40, -30, 42, 128], yetiArm(PAL.iceD, 3, 3), OUT),
    part('legBack', 20, -44, 'legBack', [-42, -24, 34, 50], yetiLeg(PAL.iceD, 5), OUT),
    part('legFront', -16, -44, 'legFront', [-42, -24, 34, 50], yetiLeg(PAL.snow, 6), OUT),
    part('body', 4, -100, 'body', [-66, -82, 72, 76], body, OUT),
    part('armFront', -30, -140, 'armFront', [-42, -30, 38, 128], yetiArm(PAL.snow, -4, 9), OUT),
    part('head', -14, -146, 'head', [-38, -50, 37, 26], head, OUT),
  ],
};
