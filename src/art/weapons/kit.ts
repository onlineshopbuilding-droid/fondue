// Shared pieces of the weapon pictures: the tier's metal, the shelf every weapon sits on, and the
// ornaments that make each tier look grander than the one before (wood -> iron -> brass -> gold,
// then gems, cheese, flags, laurel and finally a halo with a crown).
// Everything is drawn on a 120 grid with the light from the upper left. No masks, no filters:
// shading uses the clip-path helpers of ../draw, which rasterise fast (HANDBUCH trap 14).
import { INK, MUST, MUSTL, WOOD, WOODD, IRON, IRONL, WHITE, GOLDD, TEAL, RED, REDL, CREAM, litPath, litRect, litBall, rivets, grain, hl } from '../draw';
import { tone, radial, glint } from '../shade';

/** Highest tier a weapon picture exists for. */
export const WEAPON_ART_TIERS = 7;

/** The metal of a tier's fittings and how far up the tier is. */
export interface Trim { base: string; light: string; dark: string; tier: number }

export const BRASS = '#c9a23e';
export const BRASSL = '#ecd27a';
export const GOLDL = '#ffe08a';
export const SAPPHIRE = '#4f7fd9';
export const LEAF = '#5a8a4c';
export const LEAFD = '#3f6b45';
export const SNOW = '#f4f8fb';
export const ICE = '#bfe3ee';

/** Plain wood (1), iron (2), brass (3), gold (4 and up; 7 a brighter, warmer gold). */
export function trimOf(tier: number): Trim {
  if (tier <= 1) return { base: WOODD, light: WOOD, dark: tone(WOODD, -0.3), tier };
  if (tier === 2) return { base: IRON, light: IRONL, dark: '#2c2f34', tier };
  if (tier === 3) return { base: BRASS, light: BRASSL, dark: '#8a6a22', tier };
  if (tier < 7) return { base: MUST, light: GOLDL, dark: GOLDD, tier };
  return { base: '#e8b43a', light: '#fff1b0', dark: GOLDD, tier };
}

/** Metal of small parts that should look like metal even at tier 1 (iron there). */
export const metalOf = (t: Trim): Trim => (t.tier <= 1 ? { base: IRON, light: IRONL, dark: '#2c2f34', tier: 1 } : t);

export const f = (v: number) => +v.toFixed(1);
export const oval = (x: number, y: number, rx: number, ry: number) => `M${f(x - rx)} ${f(y)}a${rx} ${ry} 0 1 0 ${f(rx * 2)} 0a${rx} ${ry} 0 1 0 ${f(-rx * 2)} 0Z`;
export const METAL = (t: Trim) => ({ shadow: 2.5, light: 1, lightColor: t.light, shadowColor: t.dark });
/** Rivet colour of a tier: grey iron, then shiny brass or gold. */
export const rivetCol = (t: Trim) => (t.tier >= 3 ? t.light : '#5a5f66');

/** A shelf plank bolted to the wall with two straps in the tier's metal. */
export function shelf(y: number, t: Trim, x0 = 22, w = 76): string {
  return (
    litRect(x0, y, w, 11, WOOD, 3, { shadow: 3, light: 1.4 }) +
    grain(x0 + 3, y + 2, x0 + w - 3, y + 9, WOODD, y + x0, 2, false, 0.6) +
    litRect(x0 + 10, y - 4, 9, 19, t.base, 2, METAL(t)) +
    litRect(x0 + w - 19, y - 4, 9, 19, t.base, 2, METAL(t)) +
    rivets([[x0 + 14.5, y], [x0 + 14.5, y + 11], [x0 + w - 14.5, y], [x0 + w - 14.5, y + 11]], 1.8, rivetCol(t), '#1d2024')
  );
}

/** A band of the tier's metal across a part, with rivets from tier 2. */
export function band(x: number, y: number, w: number, h: number, t: Trim, rad = 2): string {
  const m = metalOf(t);
  const rv: [number, number][] = t.tier >= 2 ? [[x + 3.5, y + h / 2], [x + w - 3.5, y + h / 2]] : [];
  return litRect(x, y, w, h, m.base, rad, METAL(m)) + (rv.length ? rivets(rv, 1.4, rivetCol(t), '#1d2024') : '');
}

/** A cut gem with a glint. */
export const gem = (x: number, y: number, col: string, s = 4) =>
  `<path d="M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z" fill="${col}" stroke="${INK}" stroke-width="1.6"/>` +
  `<path d="M${x} ${y - s}L${x + s} ${y}L${x} ${y}Z" fill="${WHITE}" stroke="none" opacity=".28"/>` +
  glint(f(x - s * 0.25), f(y - s * 0.35), f(s * 0.22), WHITE, 0.9);

/** A small round cheese wheel with holes and a gold rim, the emblem of the higher tiers. */
export function cheeseWheel(x: number, y: number, r: number, rim: string): string {
  return (
    litBall(x, y, r, MUSTL, 2.4) +
    `<g fill="${MUST}" stroke="none" opacity=".85"><circle cx="${f(x - r * 0.35)}" cy="${f(y + r * 0.1)}" r="${f(r * 0.2)}"/><circle cx="${f(x + r * 0.3)}" cy="${f(y - r * 0.25)}" r="${f(r * 0.15)}"/><circle cx="${f(x + r * 0.25)}" cy="${f(y + r * 0.4)}" r="${f(r * 0.13)}"/></g>` +
    `<circle cx="${x}" cy="${y}" r="${f(r + 1.2)}" fill="none" stroke="${rim}" stroke-width="2"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r + 2.4)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`
  );
}

/** A swallow-tailed pennant on a pole, flying to the right; the pole foot is at (x, y). */
export function pennant(x: number, y: number, h: number, cloth: string, stripe: string, t: Trim): string {
  const top = y - h;
  const d = `M${x} ${top + 2}Q${x + 12} ${top - 1} ${x + 24} ${top + 3}L${x + 18} ${top + 9}L${x + 24} ${top + 15}Q${x + 12} ${top + 12} ${x} ${top + 16}Z`;
  return (
    litRect(x - 2, top, 4, h, WOODD, 2, { shadow: 1, light: 0.6, outline: 2.4 }) +
    litPath(d, cloth, { shadow: 2.4, light: 1, outline: 2.6 }) +
    hl(`M${x + 2} ${top + 9}Q${x + 10} ${top + 7} ${x + 17} ${top + 9}`, stripe, 2.4) +
    litBall(x, top - 1, 2.8, t.light, 1.8)
  );
}

/** A laurel sprig of five leaves along a curve, mirrored with `dir` = -1. */
export function laurel(x: number, y: number, dir: 1 | -1): string {
  let s = hl(`M${x} ${y}q${dir * 10} -2 ${dir * 16} -12`, LEAFD, 2);
  const leaves: [number, number, number][] = [[3, -1, 20], [7, -3, 35], [11, -6, 50], [14, -9, 65], [16, -12, 80]];
  for (const [dx, dy, a] of leaves) {
    const lx = x + dir * dx;
    const ly = y + dy;
    s += `<ellipse cx="${lx}" cy="${ly}" rx="4" ry="1.9" transform="rotate(${dir * -a} ${lx} ${ly})" fill="${LEAF}" stroke="${INK}" stroke-width="1.3"/>`;
  }
  return s;
}

/** A small four-point twinkle. */
export const twinkle = (x: number, y: number, s: number, col = '#fff6c8') => {
  const k = s * 0.22;
  return `<path d="M${x} ${y - s}Q${f(x + k)} ${f(y - k)} ${x + s} ${y}Q${f(x + k)} ${f(y + k)} ${x} ${y + s}Q${f(x - k)} ${f(y + k)} ${x - s} ${y}Q${f(x - k)} ${f(y - k)} ${x} ${y - s}Z" fill="${col}" stroke="none"/>`;
};

/** Behind the figure: pennants from tier 5 (two from 6) and the warm light of tiers 6 and 7. */
export function ornamentBack(t: Trim): string {
  let s = '';
  if (t.tier >= 6) {
    const g = radial(t.tier >= 7
      ? [[0, '#fff1b0', 0.75], [0.5, '#ffc95a', 0.35], [1, '#ffb347', 0]]
      : [[0, '#ffe08a', 0.4], [0.6, '#ffb347', 0.14], [1, '#ffb347', 0]]);
    s += `<defs>${g.def}</defs><circle cx="60" cy="58" r="${t.tier >= 7 ? 62 : 54}" fill="${g.url}" stroke="none"/>`;
  }
  if (t.tier >= 7) {
    // Rays behind everything, as soft gold wedges.
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + 0.13;
      const a0 = a - 0.09;
      const a1 = a + 0.09;
      rays += `M60 58L${f(60 + Math.cos(a0) * 64)} ${f(58 + Math.sin(a0) * 64)}L${f(60 + Math.cos(a1) * 64)} ${f(58 + Math.sin(a1) * 64)}Z`;
    }
    s += `<path d="${rays}" fill="#ffe08a" stroke="none" opacity=".35"/>`;
  }
  if (t.tier >= 5) s += pennant(9, 58, 50, RED, MUSTL, t);
  if (t.tier >= 6) s += `<g transform="translate(120 0)scale(-1 1)">${pennant(9, 58, 50, TEAL, CREAM, t)}</g>`;
  return s;
}

/** In front of the figure: brackets (2+), medallion (3+), crown points (4+), gems (5+), cheese and laurel (6+), crown (7). */
export function ornamentFront(t: Trim): string {
  if (t.tier <= 1) return '';
  const metal = METAL(t);
  const bracket = (x: number, flip: boolean) => {
    const d = flip ? `M${x} 92H${x - 18}V98H${x - 6}V112H${x}Z` : `M${x} 92H${x + 18}V98H${x + 6}V112H${x}Z`;
    return litPath(d, t.base, { ...metal, outline: 2.8 }) + rivets([[flip ? x - 3 : x + 3, 96], [flip ? x - 3 : x + 3, 107]], 1.5, rivetCol(t), '#1d2024');
  };
  let s = bracket(4, false) + bracket(116, true);
  // Tier 2: a riveted iron plate where the medallion of tier 3 will be.
  if (t.tier === 2) s += litRect(49, 106, 22, 11, t.base, 2, metal) + rivets([[53.5, 111.5], [66.5, 111.5]], 1.5, '#8a9096', '#1d2024') + hl('M57 111.5H63', t.light, 1.6, 0.9);
  if (t.tier >= 6) s += laurel(48, 114, -1) + laurel(72, 114, 1);
  if (t.tier >= 3) {
    s += litBall(60, 112, 7.5, t.base, 2.8) + `<circle cx="60" cy="112" r="4" fill="none" stroke="${t.dark}" stroke-width="1.4"/>`;
  }
  if (t.tier >= 4) {
    const point = (x: number) => litPath(`M${x - 5} 16L${x} 3L${x + 5} 16Z`, t.base, { ...metal, outline: 2.4 }) + litBall(x, 3, 2.6, t.light, 1.6);
    // Without pennants the points stand in the top corners; with them they move onto the brackets.
    s += t.tier >= 5 ? '' : point(10) + point(110);
    s += `<path d="M53 112l7 -4 7 4 -7 4Z" fill="${t.light}" stroke="${INK}" stroke-width="1.4"/>`;
  }
  if (t.tier >= 5) {
    s += gem(10, 102, TEAL) + gem(110, 102, SAPPHIRE);
    s += t.tier >= 6 ? cheeseWheel(60, 112, 5.5, t.light) : gem(60, 112, RED);
  }
  if (t.tier >= 7) {
    // A little crown on the medallion, and twinkles around the figure.
    s += litPath('M50 106L52 96L56 101L60 93L64 101L68 96L70 106Z', t.base, { ...metal, outline: 2.2 }) +
      gem(60, 101, RED, 2.4) + litBall(52, 95.5, 1.8, t.light, 1.2) + litBall(68, 95.5, 1.8, t.light, 1.2) + litBall(60, 92.5, 1.8, t.light, 1.2);
    s += twinkle(34, 8, 4.5) + twinkle(88, 4, 3.5) + twinkle(114, 50, 4) + twinkle(6, 76, 3.5) + twinkle(100, 84, 3);
  }
  return s;
}

/** Red cloth with a gold fringe, hung over the shelf front from tier 6. */
export function drape(y: number, x0: number, w: number, t: Trim): string {
  if (t.tier < 6) return '';
  const x1 = x0 + w;
  const d = `M${x0} ${y}H${x1}V${y + 9}Q${x1 - w / 4} ${y + 15} ${x0 + w / 2} ${y + 10}Q${x0 + w / 4} ${y + 15} ${x0} ${y + 9}Z`;
  let fringe = '';
  for (let x = x0 + 4; x < x1 - 2; x += 6) fringe += `M${x} ${y + 10 + Math.abs(Math.sin(x)) * 2}v3`;
  return litPath(d, RED, { shadow: 2.5, light: 1, lightColor: REDL, outline: 2.6 }) + hl(fringe, t.light, 2) + hl(`M${x0 + 2} ${y + 3}H${x1 - 2}`, t.light, 1.6, 0.9);
}
