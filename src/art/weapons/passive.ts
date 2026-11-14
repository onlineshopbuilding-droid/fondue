// Passive slot (upper right of the keep): Marmot Sentry, Roof Bolter, Storm Bell, Pinecone Catapult, Hornet Hive.
import { INK, RUST, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRONL, WHITE, RED, TEAL, c, hl, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, glint } from '../shade';
import { type Trim, METAL, metalOf, rivetCol, shelf, band, gem, cheeseWheel, drape, f, SAPPHIRE, LEAF, LEAFD } from './kit';

/** Marmot Sentry: a plump marmot aiming a crossbow; helmet, plume, quiver and a cape per tier. */
export function sentryFigure(t: Trim): string {
  const fur = '#9a6d44';
  const body = 'M30 104Q22 72 40 54Q58 42 76 54Q92 72 86 104Z';
  const m = metalOf(t);
  return (
    shelf(104, t, 20, 80) +
    drape(115, 26, 68, t) +
    (t.tier >= 6 ? litPath('M30 58Q12 80 18 104H44Z', RED, { shadow: 2.5, light: 1, outline: 2.8 }) : '') +
    (t.tier >= 4 ? litRect(22, 60, 12, 36, WOODD, 3, { shadow: 2, light: 1 }) + hl('M25 60l-3 -10M29 60l1 -11M33 60l4 -9', IRONL, 2) + band(21, 70, 14, 5, t) : '') +
    litPath(body, fur, { shadow: 4.5, light: 2, lightColor: '#c49a6a' }) +
    litPath('M44 100Q40 76 56 66Q72 72 70 100Z', '#d9b98a', { shadow: 2, light: 1, outline: 0 }) +
    (t.tier >= 3 ? litPath('M42 70Q58 62 74 70L72 86Q58 80 44 86Z', m.base, { ...METAL(m), outline: 2.6 }) + rivets([[50, 74], [66, 74]], 1.4, rivetCol(t), '#1d2024') : '') +
    (t.tier >= 5 ? gem(58, 76, RED, 3) : '') +
    litBall(38, 34, 6, fur, 2.6) +
    litBall(58, 38, 18, fur, 3.2) +
    litPath('M60 40Q80 34 80 46Q78 54 64 54Z', '#d9b98a', { shadow: 1.5, light: 0.6, outline: 2.6 }) +
    litBall(80, 44, 3, INK, 1.6) +
    `<path d="M70 53h6v5h-6Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.6"/>` +
    c(66, 36, 3, INK) + glint(65.2, 35, 1) +
    // Cap, then helmet: tin, iron, brass, gold.
    litPath(t.tier >= 3 ? 'M38 32Q38 12 58 12Q78 12 78 32Q58 26 38 32Z' : 'M40 30Q42 16 58 16Q74 16 76 30Q58 24 40 30Z', m.base, METAL(m)) +
    (t.tier >= 3 ? hl('M40 28Q58 22 76 28', m.light, 1.4, 0.8) : '') +
    (t.tier >= 5 ? litPath('M56 12Q50 0 40 -2Q52 -4 62 6Q68 -2 74 0Q66 4 62 12Z', RED, { shadow: 1.6, light: 0.8, outline: 2.4 }) : litBall(58, 15, 3, m.light, 2)) +
    (t.tier >= 7 ? gem(58, 20, SAPPHIRE, 3) : '') +
    // Crossbow: wood, then metal limbs, two bolts from tier 6.
    tubeFast('M44 76H104', 5, WOOD, { outline: 3, lightColor: WOODL }) +
    `<path d="M96 58Q108 76 96 94" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M96 58Q108 76 96 94" fill="none" stroke="${t.tier >= 2 ? m.light : WOODL}" stroke-width="3.5" stroke-linecap="round"/>` +
    hl('M96 58L84 76L96 94', CREAM, 1.4) +
    litPath('M104 72L114 76L104 80Z', IRONL, { shadow: 1, light: 0.5, outline: 2.2 }) +
    (t.tier >= 6 ? tubeFast('M60 68H104', 2.5, WOODL, { outline: 2 }) + litPath('M104 65L112 68L104 71Z', IRONL, { shadow: 1, light: 0.5, outline: 2 }) : '') +
    litBall(50, 78, 5, fur, 2.4) + litBall(80, 80, 5, fur, 2.4)
  );
}

/** Roof Bolter: a crossbow on a post that fires by itself; metal limbs, two and three bolts per tier. */
export function bolterFigure(t: Trim): string {
  const m = metalOf(t);
  const limb = t.tier >= 5 ? 'M72 6Q108 48 72 92' : 'M72 12Q102 48 72 86';
  const stringD = t.tier >= 5 ? 'M72 6L36 49L72 92' : 'M72 12L38 49L72 86';
  const stock = 'M26 44H96Q102 49 96 55H26Q22 49 26 44Z';
  const boltAt = (y: number) => litRect(34, y - 4, 68, 8, WOODL, 2, { shadow: 2.2, light: 1 }) + litPath(`M102 ${y - 9}L119 ${y}L102 ${y + 9}Z`, t.tier >= 6 ? t.base : IRONL, { shadow: 2.5, light: 1, lightColor: t.tier >= 6 ? t.light : '#d6dbe0' }) + litPath(`M44 ${y - 8}L32 ${y}L44 ${y + 8}Z`, t.tier >= 4 ? TEAL : RUST, { shadow: 2, light: 1 });
  return (
    tubeFast('M58 102V58', 8, WOODD, { outline: 2.6 }) +
    shelf(102, t, 26, 68) +
    drape(113, 30, 60, t) +
    litBall(58, 58, 8, m.light, 3.5) +
    litPath(stock, WOOD, { shadow: 3, light: 1.4 }) +
    grain(30, 46, 94, 53, tone(WOOD, -0.42), 7, 2, false, 0.6) +
    tubeFast(limb, 6.5, t.tier >= 3 ? t.base : WOODL, { outline: 2.75, lightColor: t.tier >= 3 ? t.light : '#ecc48c' }) +
    litRect(66, t.tier >= 5 ? 0 : 6, 12, 12, m.base, 3, METAL(m)) +
    litRect(66, t.tier >= 5 ? 86 : 80, 12, 12, m.base, 3, METAL(m)) +
    hl(stringD, INK, 5) + hl(stringD, CREAM, 2.5) +
    (t.tier >= 6 ? `<g transform="translate(0 -14)">${boltAt(49)}</g>` : '') +
    (t.tier >= 4 ? `<g transform="translate(0 14)">${boltAt(49)}</g>` : '') +
    boltAt(49) +
    (t.tier >= 7 ? gem(58, 58, RED, 3.4) + cheeseWheel(26, 49, 4, t.light) : '') +
    // The wind-up crank that makes it fire by itself.
    tubeFast('M58 58L40 76', 3.5, m.base, { outline: 2.2, lightColor: m.light }) + litBall(39, 77, 4, t.tier >= 2 ? t.light : MUSTL, 2.4)
  );
}

/** Storm Bell: a bronze bell in a belfry; a storm cloud, bigger lightning and gold per tier. */
export function bellFigure(t: Trim): string {
  const bell = 'M40 44Q40 30 60 28Q80 30 80 44L84 76Q88 86 96 88H24Q32 86 36 76Z';
  const bronze = t.tier >= 6 ? MUST : '#b8862f';
  const bronzeL = t.tier >= 6 ? '#fff1b0' : '#efc56a';
  const bolt = (x: number, y: number, s: number) => litPath(`M${x + 2 * s} ${y}L${x - 8 * s} ${y + 14 * s}H${x}L${x - 6 * s} ${y + 26 * s}L${x + 10 * s} ${y + 10 * s}H${x + 2 * s}L${x + 8 * s} ${y}Z`, MUSTL, { shadow: 1.2, light: 0.6, lightColor: '#fff6c8', outline: 2.4 });
  return (
    shelf(102, t, 14, 92) +
    drape(113, 22, 76, t) +
    tubeFast('M22 102V20M98 102V20', 7, WOOD, { outline: 3 }) +
    (t.tier >= 2 ? band(16, 60, 12, 6, t) + band(92, 60, 12, 6, t) : '') +
    litPath('M12 22L60 6L108 22Q108 28 102 28H18Q12 28 12 22Z', t.tier >= 7 ? '#2f5f8a' : RUST, { shadow: 3, light: 1.4 }) +
    (t.tier >= 3 ? hl('M14 22L60 7L106 22', t.base, 2.4) : '') +
    (t.tier >= 4 ? litBall(60, 5, 4, t.light, 2.4) : '') +
    tubeFast('M22 30H98', 6, WOODD, { outline: 2.8 }) +
    litRect(52, 26, 16, 8, metalOf(t).base, 2, METAL(metalOf(t))) +
    litPath(bell, bronze, { shadow: 5, light: 2.2, lightColor: bronzeL, shadowColor: '#7a5418' }) +
    litPath('M24 86H96Q98 92 92 94H28Q22 92 24 86Z', tone(bronze, -0.1), { shadow: 2, light: 1 }) +
    band(36, 52, 48, 6, t) +
    bolt(60, 60, 1 + (t.tier >= 4 ? 0.1 : 0)) +
    (t.tier >= 6 ? gem(44, 70, SAPPHIRE, 3) + gem(76, 70, RED, 3) : '') +
    litBall(60, 98, 6, metalOf(t).base, 2.8) +
    glint(46, 40, 1.6) +
    hl('M44 40Q44 34 54 32', '#f5d68a', 1.8, 0.8) +
    hl('M8 48l6 6M112 48l-6 6', MUSTL, 2.4, 0.9) +
    // A storm cloud over the belfry from tier 5, with its own bolts.
    // Side bolts from tier 5, crackling sparks at tier 7.
    (t.tier >= 5 ? bolt(10, 62, 0.55) + bolt(110, 62, 0.55) : '') +
    (t.tier >= 7 ? `<g stroke="none">${c(30, 40, 2, '#fff6c8')}${c(90, 40, 2, '#fff6c8')}${c(60, 22, 1.8, '#fff6c8')}</g>` : '')
  );
}

/** A pinecone of overlapping scales; `col` and `dark` set wood brown or gold. */
export function pinecone(x: number, y: number, s: number, col = '#8a5a32', dark = '#5e3a1e'): string {
  let scales = '';
  for (let row = 0; row < 4; row++) {
    const yy = y - 6 * s + row * 4 * s;
    const n2 = row === 0 || row === 3 ? 2 : 3;
    for (let i = 0; i < n2; i++) {
      const xx = x + (i - (n2 - 1) / 2) * 4.4 * s;
      scales += `M${f(xx - 2.4 * s)} ${f(yy)}q${f(2.4 * s)} ${f(3.4 * s)} ${f(4.8 * s)} 0`;
    }
  }
  return (
    litPath(`M${x} ${f(y - 9 * s)}Q${f(x + 8 * s)} ${f(y - 4 * s)} ${f(x + 6 * s)} ${f(y + 4 * s)}Q${f(x + 3 * s)} ${f(y + 10 * s)} ${x} ${f(y + 10 * s)}Q${f(x - 3 * s)} ${f(y + 10 * s)} ${f(x - 6 * s)} ${f(y + 4 * s)}Q${f(x - 8 * s)} ${f(y - 4 * s)} ${x} ${f(y - 9 * s)}Z`, col, { shadow: f(2 * s), light: f(0.8 * s), outline: 2.4 }) +
    hl(scales, dark, f(1.3 * s), 0.9)
  );
}

/** Pinecone Catapult: a small catapult whose bucket is heaped with pinecones; wheels, more cones and gold per tier. */
export function catapultFigure(t: Trim): string {
  const m = metalOf(t);
  const gold = t.tier >= 7;
  const cone = (x: number, y: number, s: number) => (gold ? pinecone(x, y, s, MUST, '#8e5a22') : pinecone(x, y, s));
  const pile: [number, number][] = [[16, 92], [26, 94], [21, 85], [100, 94], [110, 92], [105, 85]];
  let heap = '';
  for (let i = 0; i < Math.min(pile.length, t.tier - 1); i++) heap += cone(pile[i][0], pile[i][1], 0.75);
  const wheel = (x: number) => litBall(x, 96, 9, WOODD, 2.8) + hl(`M${x - 6} 96H${x + 6}M${x} 90V102`, tone(WOODD, -0.35), 1.6, 0.8) + litBall(x, 96, 2.6, m.light, 1.6);
  return (
    shelf(104, t, 10, 100) +
    drape(115, 20, 80, t) +
    (t.tier >= 5 ? litPath('M30 32Q20 18 8 22Q18 26 24 36Z', LEAF, { shadow: 1.5, light: 0.6, outline: 2.2 }) + hl('M8 22Q18 22 28 34', LEAFD, 1.2) : '') +
    // Frame: base beam, uprights and the cross bar the arm hits.
    litRect(24, 84, 72, 10, WOOD, 3, { shadow: 3, light: 1.4 }) +
    tubeFast('M40 84L56 48M80 84L64 48', 6, WOODD, { outline: 2.6 }) +
    litRect(48, 42, 24, 8, WOOD, 2, { shadow: 2, light: 1 }) +
    band(46, 42, 6, 8, t) + band(68, 42, 6, 8, t) +
    (t.tier >= 3 ? wheel(34) + wheel(86) : '') +
    // The arm leans back to the left; the bucket sits up top with its cones.
    tubeFast('M86 76L40 34', 6, WOODL, { outline: 2.8 }) +
    litBall(84, 74, 5, m.base, 2.6) +
    hl('M84 74L62 84', INK, 3) + hl('M84 74L62 84', CREAM, 1.4) +
    litPath('M22 30Q22 44 36 44Q50 44 50 30Z', WOODD, { shadow: 2.4, light: 1, outline: 2.8 }) +
    band(22, 28, 28, 5, t) +
    cone(30, 22, 0.8) + cone(42, 22, 0.8) + (t.tier >= 4 ? cone(36, 14, 0.8) : '') +
    heap +
    (t.tier >= 6 ? gem(60, 89, RED, 3) + gem(36, 36.5, SAPPHIRE, 2.6) : '') +
    (t.tier >= 7 ? cheeseWheel(60, 46, 3.6, t.light) : '') +
    // A cone in flight to the right.
    hl('M58 18q20 -12 40 0', MUSTL, 1.8, 0.6) + cone(102, 22, 0.6)
  );
}

/** One felt hornet: yellow and black body, wings and a sting, flying right. */
export function hornet(x: number, y: number, s = 1): string {
  return (
    `<g transform="translate(${x} ${y})scale(${s})">` +
    `<ellipse cx="-2" cy="-6" rx="5" ry="3" transform="rotate(-20 -2 -6)" fill="#e8f2f6" stroke="${INK}" stroke-width="1.4" opacity=".9"/>` +
    `<ellipse cx="3" cy="-6" rx="5" ry="3" transform="rotate(20 3 -6)" fill="#e8f2f6" stroke="${INK}" stroke-width="1.4" opacity=".9"/>` +
    `<path d="M-8 0Q-8 -5 0 -5Q8 -5 9 0Q8 5 0 5Q-8 5 -8 0Z" fill="${MUSTL}" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M-4 -4.6V4.6M1 -5V5" stroke="${INK}" stroke-width="2.2" fill="none"/>` +
    `<path d="M-8 0L-12 0" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="7" cy="-1.5" r="1.2" fill="${INK}"/>` +
    `</g>`
  );
}

/** Hornet Hive: a straw skep on a shelf, hornets buzzing out; bands, honey, a second hive and a crown per tier. */
export function hiveFigure(t: Trim): string {
  const straw = t.tier >= 7 ? '#e8b43a' : '#c99a4a';
  const strawD = tone(straw, -0.35);
  const skep = (cx: number, base: number, w: number, h: number) => {
    const d = `M${cx - w} ${base}Q${cx - w} ${base - h} ${cx} ${base - h}Q${cx + w} ${base - h} ${cx + w} ${base}Z`;
    let rings = '';
    for (let i = 1; i < 5; i++) {
      const y = f(base - (h * i) / 5);
      const half = f(w * Math.sqrt(1 - Math.pow(i / 5.3, 2)));
      rings += `M${f(cx - half)} ${y}Q${cx} ${f(y + 3)} ${f(cx + half)} ${y}`;
    }
    return litPath(d, straw, { shadow: 4, light: 1.8, lightColor: tone(straw, 0.35) }) + hl(rings, strawD, 1.8, 0.85);
  };
  const flyers: [number, number][] = [[96, 36], [108, 56], [92, 18], [112, 30], [86, 4], [104, 10], [116, 76]];
  let bugs = '';
  for (let i = 0; i < Math.min(flyers.length, t.tier); i++) bugs += hornet(flyers[i][0], flyers[i][1], 1.05);
  return (
    shelf(102, t, 14, 88) +
    drape(113, 22, 72, t) +
    (t.tier >= 5 ? skep(76, 102, 18, 30) : '') +
    skep(48, 102, 32, 62) +
    (t.tier >= 3 ? band(20, 82, 56, 6, t) : '') +
    (t.tier >= 5 ? band(22, 62, 52, 5, t) : '') +
    // Entrance hole, honey dripping from tier 4.
    `<path d="M40 102Q40 92 48 92Q56 92 56 102Z" fill="#2a1c12" stroke="${INK}" stroke-width="2.6"/>` +
    (t.tier >= 4 ? litPath('M62 84Q66 84 66 90Q66 98 64 100Q62 98 62 92Z', MUST, { shadow: 1, light: 0.6, lightColor: MUSTL, outline: 2.2 }) : '') +
    (t.tier >= 6 ? gem(48, 52, RED, 3.4) : '') +
    (t.tier >= 7 ? litPath('M36 42L38 30L44 36L48 26L52 36L58 30L60 42Z', t.base, { ...METAL(t), outline: 2.4 }) + gem(48, 37, SAPPHIRE, 2.4) : litBall(48, 38, 4, strawD, 2.4)) +
    hornet(60, 96, 0.9) +
    bugs +
    hl('M70 50q8 -8 16 -6M74 70q10 -4 20 -2', INK, 1.2, 0.35)
  );
}
