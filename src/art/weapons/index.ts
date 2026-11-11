// Art of every weapon on the keep at each of its five tiers, named `weapon:<id>:<tier>`.
// One figure per weapon on a 120 grid; a shared trim block makes higher tiers look mightier.
import type { Art } from '../types';
import { INK, RUST, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, STONE, STONED, STONEL, WHITE, GOLD, GOLDD, TEAL, PLUM, RED, REDL, ink, c, hl, art, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, radial, glint } from '../shade';
import { bolter, mortar, frost, bellows, stomper, shrine, wheelRamp } from '../castle/mounts';

/** World size of a weapon picture; the figure itself is about 96 px at tier 1. */
export const WEAPON_ART_SIZE = 120;
/** Figure scale at tier 1 (96 / 120) and the growth per tier (tier 5: +18 %). */
const BASE_SCALE = 0.8;
const GROWTH_PER_TIER = 0.045;
export const WEAPON_TIERS = 5;

/** Texture name of a weapon picture. */
export const weaponKey = (id: string, tier: number) => `weapon:${id}:${tier}`;

/** The metal of a tier's fittings: plain wood (1), iron (2), brass (3), gold (4, 5). */
interface Trim { base: string; light: string; dark: string; tier: number }

const BRASS = '#c9a23e';
const BRASSL = '#ecd27a';
const GOLDL = '#ffe08a';

function trimOf(tier: number): Trim {
  if (tier <= 1) return { base: WOODD, light: WOOD, dark: tone(WOODD, -0.3), tier };
  if (tier === 2) return { base: IRON, light: IRONL, dark: '#2c2f34', tier };
  if (tier === 3) return { base: BRASS, light: BRASSL, dark: '#8a6a22', tier };
  return { base: MUST, light: GOLDL, dark: GOLDD, tier };
}

const f = (v: number) => +v.toFixed(1);
const oval = (x: number, y: number, rx: number, ry: number) => `M${f(x - rx)} ${f(y)}a${rx} ${ry} 0 1 0 ${f(rx * 2)} 0a${rx} ${ry} 0 1 0 ${f(-rx * 2)} 0Z`;
const METAL = (t: Trim) => ({ shadow: 2.5, light: 1, lightColor: t.light, shadowColor: t.dark });

/** A shelf plank bolted to the wall with two straps in the tier's metal. */
function shelf(y: number, t: Trim, x0 = 22, w = 76): string {
  return (
    litRect(x0, y, w, 11, WOOD, 3, { shadow: 3, light: 1.4 }) +
    grain(x0 + 3, y + 2, x0 + w - 3, y + 9, WOODD, y + x0, 2, false, 0.6) +
    litRect(x0 + 10, y - 4, 9, 19, t.base, 2, METAL(t)) +
    litRect(x0 + w - 19, y - 4, 9, 19, t.base, 2, METAL(t)) +
    rivets([[x0 + 14.5, y], [x0 + 14.5, y + 11], [x0 + w - 14.5, y], [x0 + w - 14.5, y + 11]], 1.8, t.tier >= 3 ? t.light : '#5a5f66', '#1d2024')
  );
}

// ---------------------------------------------------------------------------------------------
// The nine new figures, drawn on a 120 grid, pointing right (towards the raiders)
// ---------------------------------------------------------------------------------------------

/** Sticky Fondue: a red caquelon tipped over a shelf, thick cheese running over its lip. */
function cheesePot(t: Trim): string {
  const pot = 'M28 54Q24 92 58 96Q92 94 90 54Z';
  const rim = oval(59, 54, 32, 9);
  const melt = radial([[0, '#fff2b0'], [0.6, MUSTL], [1, MUST]], 0.4, 0.4, 0.6);
  const dots = [[40, 70], [52, 80], [66, 74], [78, 82], [46, 86], [72, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${CREAM}" stroke="none" opacity=".9"/>`).join('');
  return (
    `<defs>${melt.def}</defs>` +
    shelf(100, t) +
    `<g transform="rotate(14 60 80)">` +
    tubeFast('M28 64L6 50', 7, WOOD, { outline: 3 }) +
    litBall(6, 50, 5, WOODD, 3) +
    litPath(pot, RUST, { shadow: 4.5, light: 2, lightColor: REDL }) +
    dots +
    litRect(27, 66, 64, 7, t.base, 3, METAL(t)) +
    litPath(rim, tone(RUST, 0.15), { shadow: 2, light: 1, outline: 3.5 }) +
    `<path d="${oval(59, 53, 26, 6)}" fill="${melt.url}" stroke="${INK}" stroke-width="2.5"/>` +
    litBall(50, 50, 4, MUSTL, 2) + litBall(68, 52, 3, MUSTL, 2) +
    `</g>` +
    // The cheese runs over the lower lip and hangs in long drops.
    litPath('M84 52Q100 54 100 68Q102 86 96 90Q90 92 92 82Q94 70 86 64Z', MUSTL, { shadow: 2.5, light: 1.2, lightColor: '#fff2b0', shadowColor: MUST }) +
    litPath('M96 88Q98 98 95 104Q92 108 91 102Q91 94 94 90Z', MUSTL, { shadow: 1.5, light: 0.6, shadowColor: MUST, outline: 3 }) +
    glint(94, 64, 1.6) +
    hl('M40 46q6 -6 12 0', CREAM, 2, 0.7)
  );
}

/** Fondue Forks: three long forks bundled in a hooped bucket, prongs up and out. */
function forkBundle(t: Trim): string {
  const fork = (x0: number, y0: number, x1: number, y1: number, knob: string) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const deg = f((a * 180) / Math.PI + 90);
    return (
      tubeFast(`M${x0} ${y0}L${x1} ${y1}`, 4.5, IRONL, { outline: 2.8, lightColor: '#d6dbe0' }) +
      `<g transform="translate(${x1} ${y1})rotate(${deg})">` +
      litPath('M-9 0V-14Q-9 -17 -7 -14V-3H-1.5V-17Q0 -20 1.5 -17V-3H7V-14Q9 -17 9 -14V0Q9 6 0 6Q-9 6 -9 0Z', IRONL, { shadow: 1.5, light: 0.8, lightColor: '#e2e6ea', outline: 2.6 }) +
      `</g>` +
      litBall(x0 + (x1 - x0) * 0.08, y0 + (y1 - y0) * 0.08, 5.5, knob, 2.8)
    );
  };
  return (
    shelf(102, t, 26, 68) +
    fork(48, 76, 26, 26, RED) +
    fork(60, 74, 62, 18, TEAL) +
    fork(72, 76, 96, 28, PLUM) +
    // The bucket with hoops in the tier's metal.
    litPath('M34 68H86L80 102H40Z', WOOD, { shadow: 4, light: 1.6 }) +
    grain(38, 70, 82, 100, WOODD, 9, 4, true, 0.5) +
    litPath('M33 66H87V73H33Z', WOODL, { shadow: 2, light: 1 }) +
    litPath('M36 78H84L83 85H37Z', t.base, METAL(t)) +
    litPath('M39 92H81L80 99H40Z', t.base, METAL(t)) +
    rivets([[44, 81.5], [76, 81.5], [46, 95.5], [74, 95.5]], 1.5, t.light)
  );
}

/** Alphorn: a long wooden horn swinging down to a wide bell, resting on a forked stand. */
function alphornFigure(t: Trim): string {
  const tube = 'M14 18C26 26 40 44 54 62C66 78 80 88 96 92';
  const bell = 'M88 80Q100 80 112 70Q118 88 114 108Q100 104 88 104Z';
  const band = (x: number, y: number, a: number) => `<g transform="translate(${x} ${y})rotate(${a})">${litRect(-6, -8, 12, 16, t.base, 2, METAL(t))}</g>`;
  return (
    shelf(104, t, 30, 62) +
    tubeFast('M44 104L56 66M72 104L58 66', 6, WOODD, { outline: 2.6 }) +
    tubeFast(tube, 11, WOOD, { outline: 3.5, lightColor: WOODL }) +
    hl('M18 19C30 27 42 42 54 58', WOODL, 1.6, 0.7) +
    band(30, 32, 45) + band(48, 55, 52) + band(70, 79, 38) +
    litPath(bell, WOODL, { shadow: 4, light: 1.6, lightColor: '#e0b27a' }) +
    `<path d="M108 74Q114 90 111 104" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="112" cy="89" rx="5" ry="18" fill="#3a2516" stroke="${INK}" stroke-width="2.5"/>` +
    hl('M92 84Q100 84 106 78', CREAM, 1.6, 0.6) +
    // Painted flowers on the bell.
    `<g stroke="none">${c(96, 94, 3, REDL)}${c(96, 94, 1.2, CREAM)}${c(102, 88, 2.4, CREAM)}</g>` +
    litRect(8, 13, 9, 9, t.base, 2, METAL(t))
  );
}

/** Cuckoo Clock: a carved chalet clock; the bird peeks out over the dial, weights below. */
function cuckooClock(t: Trim): string {
  const roof = 'M16 46L60 12L104 46Q104 52 98 52L60 24L22 52Q16 52 16 46Z';
  const chain = (x: number) => hl(`M${x} 94V112`, INK, 3) + hl(`M${x} 94V112`, t.light, 1.4);
  const cone = (x: number) => litPath(`M${x - 5} 106Q${x - 6} 116 ${x} 119Q${x + 6} 116 ${x + 5} 106Z`, WOODD, { shadow: 2, light: 0.8, outline: 2.6 }) + hl(`M${x - 3} 110h6M${x - 3} 114h6`, tone(WOODD, -0.4), 1, 0.7);
  const hands = 'M60 66L60 56M60 66L68 70';
  return (
    chain(42) + chain(78) + cone(42) + cone(78) +
    tubeFast('M60 92L60 108', 2.5, t.light, { outline: 2 }) + litBall(60, 110, 5, t.base, 2.6) +
    litRect(28, 38, 64, 58, WOOD, 4, { shadow: 4, light: 1.8 }) +
    grain(31, 42, 89, 92, WOODD, 3, 3, true, 0.45) +
    litPath(roof, WOODD, { shadow: 3, light: 1.4 }) +
    hl('M28 42L60 18L92 42', tone(WOODD, -0.35), 1.2, 0.7) +
    // Carved leaves and the little door with the bird.
    litPath('M30 92Q22 98 18 92Q24 86 30 88Z', '#5a8a4c', { shadow: 1.5, light: 0.6, outline: 2.4 }) +
    litPath('M90 92Q98 98 102 92Q96 86 90 88Z', '#5a8a4c', { shadow: 1.5, light: 0.6, outline: 2.4 }) +
    litRect(50, 28, 20, 16, '#2a1c12', 3, { shadow: 0, light: 0, outline: 2.6 }) +
    litBall(64, 36, 6, '#c9a46a', 2.4) +
    litPath('M69 34L78 36L69 38Z', MUST, { shadow: 0, light: 0, outline: 2 }) +
    c(65, 34, 1.3, INK) +
    // Dial.
    litBall(60, 66, 16, CREAM, 3) +
    `<circle cx="60" cy="66" r="16" fill="none" stroke="${t.base}" stroke-width="3"/>` +
    hl('M60 52v3M60 77v3M46 66h3M71 66h3', INK, 1.6, 0.8) +
    hl(hands, INK, 2.4) +
    c(60, 66, 2, INK) +
    rivets([[34, 44], [86, 44], [34, 90], [86, 90]], 1.6, t.light)
  );
}

/** Storm Bell: a bronze bell with a lightning mark in a little wooden belfry. */
function stormBell(t: Trim): string {
  const bell = 'M40 44Q40 30 60 28Q80 30 80 44L84 76Q88 86 96 88H24Q32 86 36 76Z';
  const bronze = '#b8862f';
  return (
    shelf(102, t, 14, 92) +
    tubeFast('M22 102V20M98 102V20', 7, WOOD, { outline: 3 }) +
    litPath('M12 22L60 6L108 22Q108 28 102 28H18Q12 28 12 22Z', RUST, { shadow: 3, light: 1.4 }) +
    tubeFast('M22 30H98', 6, WOODD, { outline: 2.8 }) +
    litRect(52, 26, 16, 8, t.base, 2, METAL(t)) +
    litPath(bell, bronze, { shadow: 5, light: 2.2, lightColor: '#efc56a', shadowColor: '#7a5418' }) +
    litPath('M24 86H96Q98 92 92 94H28Q22 92 24 86Z', tone(bronze, -0.1), { shadow: 2, light: 1 }) +
    litRect(36, 52, 48, 6, t.base, 2, METAL(t)) +
    // A lightning mark across the bell, and the clapper below.
    litPath('M62 60L52 74H60L54 86L70 70H62L68 60Z', MUSTL, { shadow: 1.2, light: 0.6, lightColor: '#fff6c8', outline: 2.4 }) +
    litBall(60, 98, 6, IRON, 2.8) +
    glint(46, 40, 1.6) +
    hl('M44 40Q44 34 54 32', '#f5d68a', 1.8, 0.8) +
    hl('M8 48l6 6M112 48l-6 6', MUSTL, 2.4, 0.9)
  );
}

/** Golden Fondue: a gilded caquelon over a small flame, coins heaped in front. */
function goldenPot(t: Trim): string {
  const pot = 'M26 52Q22 88 60 92Q98 88 94 52Z';
  const gold = radial([[0, '#fff1b0'], [0.45, MUSTL], [1, GOLD]], 0.35, 0.3, 0.7);
  const coin = (x: number, y: number) => litPath(oval(x, y, 7, 3.5), MUSTL, { shadow: 1.4, light: 0.6, lightColor: '#fff1b0', shadowColor: GOLD, outline: 2.4 });
  return (
    `<defs>${gold.def}</defs>` +
    litRect(20, 102, 80, 10, STONE, 3, { shadow: 3, light: 1.2, lightColor: STONEL }) +
    tubeFast('M34 102L40 84M86 102L80 84', 5, t.base, { outline: 2.6, lightColor: t.light }) +
    litPath('M52 100Q50 88 60 80Q70 88 68 100Z', RUST, { shadow: 1.5, light: 0.8, outline: 2.6 }) +
    litPath('M56 100Q55 92 60 87Q65 92 64 100Z', MUSTL, { shadow: 0, light: 0, outline: 0 }) +
    `<path d="${pot}" fill="${gold.url}" stroke="${INK}" stroke-width="3.5"/>` +
    hl('M32 60Q34 80 50 86', '#fff6c8', 2.2, 0.8) +
    litRect(24, 62, 72, 7, t.base, 3, METAL(t)) +
    litPath(oval(60, 52, 36, 9), MUST, { shadow: 2, light: 1, lightColor: '#fff1b0' }) +
    `<path d="${oval(60, 51, 29, 6)}" fill="#fff0a8" stroke="${INK}" stroke-width="2.4"/>` +
    litBall(50, 48, 4, '#ffe58a', 2) + litBall(70, 50, 3, '#ffe58a', 2) +
    tubeFast('M26 58L8 46', 6, MUST, { outline: 3, lightColor: '#fff1b0' }) +
    coin(24, 98) + coin(98, 98) + coin(92, 93) + coin(28, 93) +
    glint(36, 58, 1.8) + glint(84, 44, 1.2) +
    hl('M60 30v-8M48 34l-4 -6M72 34l4 -6', MUSTL, 2.4, 0.9)
  );
}

/** Hedgehog Gate: a felt hedgehog of iron spikes bolted to the gate, snout to the road. */
function hedgehog(t: Trim): string {
  const cx = 60;
  const cy = 90;
  let spikes = '';
  const n = 15;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + ((i + 0.5) / n) * Math.PI;
    const rx = 44;
    const ry = 50;
    const bx = cx + Math.cos(a) * rx * 0.86;
    const by = cy + Math.sin(a) * ry * 0.86;
    const tx = cx + Math.cos(a) * rx * 1.28;
    const ty = cy + Math.sin(a) * ry * 1.22;
    const px = -Math.sin(a) * 5;
    const py = Math.cos(a) * 5;
    spikes += litPath(`M${f(bx - px)} ${f(by - py)}L${f(tx)} ${f(ty)}L${f(bx + px)} ${f(by + py)}Z`, t.tier >= 3 ? t.base : IRONL, { shadow: 1.2, light: 0.6, lightColor: t.tier >= 3 ? t.light : '#d6dbe0', outline: 2.4 });
  }
  return (
    shelf(98, t, 14, 92) +
    spikes +
    litPath('M16 96Q18 44 60 40Q100 42 104 96Z', '#7a5636', { shadow: 4, light: 1.8, lightColor: '#a8805a' }) +
    hl('M30 70q6 -8 12 -10M46 56q6 -4 12 -4M70 54q8 2 12 6', tone('#7a5636', -0.35), 1.6, 0.7) +
    // The face on the right: pale cheek, snout, nose and a bright eye.
    litPath('M84 62Q104 64 114 84Q112 94 96 96Q82 92 80 78Z', '#d9b98a', { shadow: 2.5, light: 1, lightColor: '#f0dcb4' }) +
    litBall(114, 84, 4.5, INK, 2) +
    c(94, 74, 3.4, INK) + glint(93, 72.8, 1.1) +
    hl('M98 88q6 2 10 0', INK, 1.6, 0.8)
  );
}

/** Marmot Sentry: a plump marmot in a tin cap, aiming a little crossbow down the road. */
function marmot(t: Trim): string {
  const fur = '#9a6d44';
  const body = 'M30 104Q22 72 40 54Q58 42 76 54Q92 72 86 104Z';
  return (
    shelf(104, t, 20, 80) +
    litPath(body, fur, { shadow: 4.5, light: 2, lightColor: '#c49a6a' }) +
    litPath('M44 100Q40 76 56 66Q72 72 70 100Z', '#d9b98a', { shadow: 2, light: 1, outline: 0 }) +
    // Head with round ears, eye, nose and two front teeth.
    litBall(38, 34, 6, fur, 2.6) +
    litBall(58, 38, 18, fur, 3.2) +
    litPath('M60 40Q80 34 80 46Q78 54 64 54Z', '#d9b98a', { shadow: 1.5, light: 0.6, outline: 2.6 }) +
    litBall(80, 44, 3, INK, 1.6) +
    `<path d="M70 53h6v5h-6Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.6"/>` +
    c(66, 36, 3, INK) + glint(65.2, 35, 1) +
    // Tin cap in the tier's metal.
    litPath('M40 30Q42 16 58 16Q74 16 76 30Q58 24 40 30Z', t.tier >= 2 ? t.base : IRONL, METAL(t)) +
    litBall(58, 15, 3, t.light, 2) +
    // Crossbow held across the chest, pointing right.
    tubeFast('M44 76H104', 5, WOOD, { outline: 3, lightColor: WOODL }) +
    `<path d="M96 58Q108 76 96 94" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M96 58Q108 76 96 94" fill="none" stroke="${WOODL}" stroke-width="3.5" stroke-linecap="round"/>` +
    hl('M96 58L84 76L96 94', CREAM, 1.4) +
    litPath('M104 72L114 76L104 80Z', IRONL, { shadow: 1, light: 0.5, outline: 2.2 }) +
    litBall(50, 78, 5, fur, 2.4) + litBall(80, 80, 5, fur, 2.4)
  );
}

/** Ember Beacon: an iron fire basket on a post, flames and sparks rising. */
function fireBasket(t: Trim): string {
  const flameOut = 'M34 56Q28 36 42 26Q40 38 50 36Q46 18 62 6Q60 24 70 26Q76 14 82 22Q78 32 88 40Q90 50 86 56Z';
  const flameMid = 'M42 56Q38 42 48 36Q50 44 56 42Q54 28 64 20Q64 34 72 36Q76 30 80 38Q80 48 78 56Z';
  const flameIn = 'M50 56Q48 48 54 44Q58 48 60 44Q62 36 66 34Q68 42 72 46Q72 52 70 56Z';
  const basket = t.tier >= 2 ? t.base : IRON;
  return (
    shelf(104, t, 30, 60) +
    tubeFast('M60 104V72', 8, WOODD, { outline: 3 }) +
    litPath(flameOut, RUST, { shadow: 2.5, light: 1.2, lightColor: '#ff8a5a', outline: 3 }) +
    litPath(flameMid, MUST, { shadow: 1.5, light: 0.8, lightColor: MUSTL, outline: 0 }) +
    litPath(flameIn, '#fff0bd', { shadow: 0, light: 0, outline: 0 }) +
    // The cage: rim, bars and bottom ring.
    litPath('M30 54H90L80 78H40Z', '#2a1c14', { shadow: 0, light: 0, outline: 3 }) +
    tubeFast('M40 56L46 78M54 56L56 78M66 56L64 78M80 56L74 78', 3.6, basket, { outline: 2.2, lightColor: t.tier >= 2 ? t.light : IRONL }) +
    litRect(26, 50, 68, 8, basket, 3, METAL(t)) +
    litRect(38, 76, 44, 6, basket, 3, METAL(t)) +
    `<g stroke="none">${c(30, 20, 2.2, MUSTL)}${c(94, 28, 1.8, '#ff9a30')}${c(84, 8, 1.6, MUSTL)}${c(24, 40, 1.4, '#ff9a30')}</g>` +
    hl('M34 70h52', '#ff9a30', 2, 0.35)
  );
}

// ---------------------------------------------------------------------------------------------
// Shared trim: higher tiers get fittings, a medallion, crown points and finally a glow with gems
// ---------------------------------------------------------------------------------------------

/** Corner fittings, medallion and crown points of a tier, in figure coordinates. */
function ornament(t: Trim): string {
  if (t.tier <= 1) return '';
  const metal = METAL(t);
  const bracket = (x: number, flip: boolean) => {
    const d = flip ? `M${x} 92H${x - 18}V98H${x - 6}V112H${x}Z` : `M${x} 92H${x + 18}V98H${x + 6}V112H${x}Z`;
    return litPath(d, t.base, { ...metal, outline: 2.8 }) + rivets([[flip ? x - 3 : x + 3, 96], [flip ? x - 3 : x + 3, 107]], 1.5, t.tier >= 3 ? t.light : '#5a5f66', '#1d2024');
  };
  let s = bracket(4, false) + bracket(116, true);
  if (t.tier >= 3) {
    s += litBall(60, 112, 7, t.base, 2.8) + `<circle cx="60" cy="112" r="3.6" fill="none" stroke="${t.dark}" stroke-width="1.4"/>`;
  }
  if (t.tier >= 4) {
    const point = (x: number) => litPath(`M${x - 5} 14L${x} 2L${x + 5} 14Z`, t.base, { ...metal, outline: 2.4 }) + litBall(x, 2, 2.4, t.light, 1.6);
    s += point(10) + point(110);
    s += `<path d="M53 112l7 -4 7 4 -7 4Z" fill="${t.light}" stroke="${INK}" stroke-width="1.4"/>`;
  }
  if (t.tier >= 5) {
    const gem = (x: number, y: number, col: string) =>
      `<path d="M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z" fill="${col}" stroke="${INK}" stroke-width="1.6"/>` + glint(x - 1, y - 1.4, 0.9, WHITE, 0.9);
    s += gem(60, 112, RED) + gem(13, 102, TEAL) + gem(107, 102, '#4f7fd9') + gem(10, 14, RED) + gem(110, 14, TEAL);
    s += glint(30, 10, 1.6) + glint(92, 6, 1.2) + glint(112, 60, 1.4);
  }
  return s;
}

/** Warm light behind a tier-5 weapon. A gradient, not a filter: cheap to rasterise. */
function halo(): string {
  const g = radial([[0, '#ffe08a', 0.55], [0.55, '#ffb347', 0.22], [1, '#ffb347', 0]]);
  return `<defs>${g.def}</defs><circle cx="60" cy="60" r="60" fill="${g.url}"/>`;
}

/** The old mounted weapons keep their art; they always show the loaded state. */
const FIGURES: Record<string, (t: Trim) => string> = {
  wheel: () => wheelRamp(true),
  cheese: cheesePot,
  forks: forkBundle,
  stomper: () => stomper(true),
  alphorn: alphornFigure,
  cuckoo: cuckooClock,
  comet: () => shrine(true),
  bell: stormBell,
  midas: goldenPot,
  mortar: () => mortar(true),
  frost: () => frost(true),
  bellows: () => bellows(true),
  thorns: hedgehog,
  bolter: () => bolter(true),
  sentry: marmot,
  beacon: fireBasket,
};

/** Ids with their own art; any other weapon id gets a plain placeholder plank. */
export const WEAPON_ART_IDS = Object.keys(FIGURES);

function placeholder(t: Trim): string {
  return shelf(70, t) + litBall(60, 52, 16, STONED, 3) + hl('M54 46q6 -6 12 0', STONEL, 2, 0.7);
}

/** The picture of a weapon at a tier (1 to 5), 120 x 120 world pixels, anchored in the middle. */
export function weaponArt(id: string, tier: number): Art {
  const tr = Math.max(1, Math.min(WEAPON_TIERS, Math.round(tier)));
  const t = trimOf(tr);
  const s = f(BASE_SCALE * (1 + GROWTH_PER_TIER * (tr - 1)));
  const figure = (FIGURES[id] ?? placeholder)(t);
  const S = WEAPON_ART_SIZE;
  return art(S, S, S / 2, S / 2,
    (tr >= 5 ? halo() : '') +
    `<g transform="translate(60 60)scale(${s})translate(-60 -60)">${ink(figure)}${ink(ornament(t))}</g>`);
}

/** Every weapon picture for the asset directory: each id at each tier. */
export function listWeaponArt(): { id: string; tier: number; name: string; art: Art }[] {
  const out: { id: string; tier: number; name: string; art: Art }[] = [];
  for (const id of WEAPON_ART_IDS) {
    for (let tier = 1; tier <= WEAPON_TIERS; tier++) out.push({ id, tier, name: weaponKey(id, tier), art: weaponArt(id, tier) });
  }
  return out;
}
