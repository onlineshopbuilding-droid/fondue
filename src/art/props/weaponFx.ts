/**
 * Projectiles and effects of the weapons new in v0.3: snowball and snow drift (Snowdrift Cannon),
 * pinecone (Pinecone Catapult), hornet (Hornet Hive), the hot cheese stream and its splash pool
 * (Cheese Cascade) and the swinging log (Battering Log). Each is centred on its box unless noted.
 */
import { INK, MUST, MUSTL, WOOD, WOODD, WOODL, IRON, IRONL, WHITE, art, centred, ink, hl, litPath, litRect, litBall, grain, rivets } from '../draw';
import { glint } from '../shade';
import { pinecone as coneBody, hornet as hornetBody } from '../weapons/passive';
import { SNOW, ICE } from '../weapons/kit';

/** Packed snowball shot by the Snowdrift Cannon. */
export const snowball = centred(
  28,
  28,
  ink(litBall(14, 14, 10, SNOW, 3) + `<path d="M8 17q3 2 6 1M15 9q3 1 4 4" fill="none" stroke="${ICE}" stroke-width="1.6"/>`),
);

/** The snow drift the cannon leaves on a stretch of road: a long low heap, anchored at its bottom middle. */
export const snowDrift = art(
  128,
  40,
  64,
  38,
  ink(
    litPath('M4 36Q8 22 22 20Q30 8 46 12Q56 2 72 8Q86 4 94 14Q112 12 118 24Q126 28 124 36Z', SNOW, { shadow: 4, light: 1.6, shadowColor: ICE, lightColor: WHITE, outline: 3 }) +
      hl('M24 26q8 -6 16 -2M58 18q10 -4 18 0M92 22q8 -2 14 2', ICE, 2, 0.9) +
      `<g fill="${WHITE}" stroke="none">${glint(40, 16, 1.6)}${glint(80, 12, 1.4)}</g>`,
    3,
  ),
);

/** A pinecone lobbed by the Pinecone Catapult. */
export const pinecone = centred(26, 30, ink(coneBody(13, 15, 1.2)));

/** A hornet from the Hornet Hive, flying right. */
export const hornet = centred(30, 26, ink(hornetBody(16, 15, 1.3), 1.8));

/**
 * The hot cheese stream of the Cheese Cascade, anchored at its top middle (the spout); stretch it
 * vertically to reach the road.
 */
export const cheeseStream = art(
  30,
  100,
  15,
  0,
  ink(
    litPath('M10 0Q12 40 9 80Q8 96 15 98Q22 96 21 80Q18 40 20 0Z', MUSTL, { shadow: 2.6, light: 1, lightColor: '#fff2b0', shadowColor: MUST, outline: 3 }) +
      hl('M13 6Q14 40 12 84', '#fff2b0', 1.6, 0.85),
    3,
  ),
);

/** The splash pool of hot cheese in front of the gate, anchored at its bottom middle. */
export const cheesePool = art(
  80,
  24,
  40,
  22,
  ink(
    litPath('M4 16Q4 6 22 6Q34 0 52 4Q76 4 76 14Q76 22 54 21Q40 24 22 21Q4 22 4 16Z', MUSTL, { shadow: 2.4, light: 1, lightColor: '#fff2b0', shadowColor: MUST, outline: 3 }) +
      litBall(22, 11, 3, '#fff2b0', 1.8) + litBall(54, 9, 2.4, '#fff2b0', 1.6) +
      `<g fill="${WHITE}" stroke="none" opacity=".6"><circle cx="34" cy="2" r="2.4"/><circle cx="62" cy="1" r="1.8"/></g>`,
    3,
  ),
);

/** The trunk of the Battering Log as one swinging piece: iron cap pointing right, rotation in its middle. */
export const swingLog = centred(
  112,
  40,
  ink(
    litPath('M8 6Q2 20 8 34H96V6Z', WOOD, { shadow: 4.5, light: 1.8 }) +
      grain(12, 9, 92, 31, WOODD, 77, 3, false, 0.55) +
      `<ellipse cx="8" cy="20" rx="6" ry="14" fill="${WOODL}" stroke="${INK}" stroke-width="2.6"/>` +
      `<ellipse cx="8" cy="20" rx="3" ry="7" fill="none" stroke="${WOODD}" stroke-width="1.2"/>` +
      litRect(26, 3, 9, 34, IRON, 2, { shadow: 2.5, light: 1, lightColor: IRONL }) +
      litRect(64, 3, 9, 34, IRON, 2, { shadow: 2.5, light: 1, lightColor: IRONL }) +
      litRect(92, 2, 12, 36, IRON, 3, { shadow: 2.5, light: 1, lightColor: IRONL }) +
      litPath('M104 8L110 14V26L104 32Z', IRON, { shadow: 1.6, light: 0.8, lightColor: IRONL, outline: 2.6 }) +
      rivets([[98, 10], [98, 30], [30.5, 20], [68.5, 20]], 1.8, '#8a9096', '#1d2024'),
    3,
  ),
);
