// Slow slot (middle left of the keep): Sticky Fondue, Frost Horn, Cuckoo Clock, Snowdrift Cannon, Cowbell Toll.
import { INK, RUST, MUST, MUSTL, CREAM, WOOD, WOODD, IRON, IRONL, WHITE, GLOW, RED, REDL, TEAL, c, hl, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, radial, glint, within } from '../shade';
import { type Trim, METAL, metalOf, rivetCol, shelf, band, gem, cheeseWheel, drape, oval, f, SAPPHIRE, SNOW, ICE, LEAF } from './kit';

/** Sticky Fondue: a red caquelon tipped over a shelf; more cheese runs over its lip with every tier. */
export function cheeseFigure(t: Trim): string {
  const pot = 'M28 54Q24 92 58 96Q92 94 90 54Z';
  const rim = oval(59, 54, 32, 9);
  const melt = radial([[0, '#fff2b0'], [0.6, MUSTL], [1, MUST]], 0.4, 0.4, 0.6);
  const dots = [[40, 70], [52, 80], [66, 74], [78, 82], [46, 86], [72, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${t.tier >= 5 ? MUSTL : CREAM}" stroke="none" opacity=".9"/>`).join('');
  const drip = (x: number, len: number) => litPath(`M${x - 4} 88Q${x - 4} ${88 + len} ${x} ${92 + len}Q${x + 4} ${88 + len} ${x + 3} 88Z`, MUSTL, { shadow: 1.5, light: 0.6, shadowColor: MUST, outline: 2.6 });
  const pool = t.tier >= 4 ? litPath(oval(84, 101, 18 + t.tier, 4), MUSTL, { shadow: 1.5, light: 0.8, lightColor: '#fff2b0', shadowColor: MUST, outline: 2.6 }) : '';
  const fork = (x: number, deg: number, knob: string) =>
    `<g transform="rotate(${deg} ${x} 52)">` + tubeFast(`M${x} 52V20`, 3.2, IRONL, { outline: 2.4 }) +
    hl(`M${x - 4} 22V13M${x} 22V11M${x + 4} 22V13M${x - 4} 22H${x + 4}`, INK, 4.4) + hl(`M${x - 4} 22V13M${x} 22V11M${x + 4} 22V13M${x - 4} 22H${x + 4}`, IRONL, 2) +
    litBall(x, 44, 3.6, knob, 2.2) + `</g>`;
  return (
    `<defs>${melt.def}</defs>` +
    shelf(100, t) +
    drape(111, 30, 60, t) +
    pool +
    (t.tier >= 4 ? fork(48, -14, RED) : '') +
    (t.tier >= 6 ? fork(66, 10, TEAL) : '') +
    `<g transform="rotate(14 60 80)">` +
    tubeFast('M28 64L6 50', 7, WOOD, { outline: 3 }) +
    litBall(6, 50, 5, t.tier >= 3 ? t.base : WOODD, 3) +
    litPath(pot, t.tier >= 7 ? '#c23a2e' : RUST, { shadow: 4.5, light: 2, lightColor: REDL }) +
    dots +
    band(27, 66, 64, 7, t, 3) +
    (t.tier >= 5 ? band(32, 82, 54, 6, t, 3) : '') +
    litPath(rim, tone(RUST, 0.15), { shadow: 2, light: 1, outline: 3.5 }) +
    `<path d="${oval(59, 53, 26, 6)}" fill="${melt.url}" stroke="${INK}" stroke-width="2.5"/>` +
    litBall(50, 50, 4, MUSTL, 2) + litBall(68, 52, 3, MUSTL, 2) +
    (t.tier >= 6 ? gem(59, 69.5, SAPPHIRE, 3) : '') +
    `</g>` +
    litPath('M84 52Q100 54 100 68Q102 86 96 90Q90 92 92 82Q94 70 86 64Z', MUSTL, { shadow: 2.5, light: 1.2, lightColor: '#fff2b0', shadowColor: MUST }) +
    litPath('M96 88Q98 98 95 104Q92 108 91 102Q91 94 94 90Z', MUSTL, { shadow: 1.5, light: 0.6, shadowColor: MUST, outline: 3 }) +
    (t.tier >= 3 ? drip(40, 6 + t.tier) : '') +
    (t.tier >= 5 ? drip(60, 4 + t.tier) : '') +
    (t.tier >= 7 ? drip(76, 10) : '') +
    glint(94, 64, 1.6) +
    hl('M40 46q6 -6 12 0', CREAM, 2, 0.7)
  );
}

/** Frost Horn: a curved horn breathing frost; bands, crystals, icicles and a snowflake crown per tier. */
export function frostFigure(t: Trim): string {
  const halo = radial([[0, GLOW, 0.9], [0.5, GLOW, 0.4], [1, GLOW, 0]]);
  const hornD = 'M8 26C24 60 56 78 104 78L110 34C80 40 40 36 8 26Z';
  const rings = 'M24 31Q30 50 44 62M60 38Q64 56 72 74M88 38Q90 56 94 77M100 36Q101 56 103 78';
  const bandCol = t.tier >= 2 ? t.base : MUST;
  const flake = (x: number, y: number, s: number) => {
    const d = `M${x} ${y - s}V${y + s}M${f(x - s * 0.87)} ${f(y - s / 2)}L${f(x + s * 0.87)} ${f(y + s / 2)}M${f(x + s * 0.87)} ${f(y - s / 2)}L${f(x - s * 0.87)} ${f(y + s / 2)}`;
    return hl(d, INK, f(s * 0.55)) + hl(d, GLOW, f(s * 0.28)) + c(x, y, f(s * 0.18), WHITE);
  };
  let icicles = '';
  if (t.tier >= 5) for (const [x, h] of [[32, 10], [44, 14], [56, 8], [80, 12], [92, 9]] as const) icicles += litPath(`M${x - 3} 102L${x} ${102 + h}L${x + 3} 102Z`, ICE, { shadow: 1, light: 0.5, outline: 2 });
  let crystals = '';
  if (t.tier >= 3) for (const [x, y] of [[30, 40], [52, 50], [80, 46]] as const) crystals += litPath(`M${x} ${y - 7}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z`, ICE, { shadow: 1, light: 0.5, outline: 2 });
  return (
    `<defs>${halo.def}</defs><ellipse cx="92" cy="56" rx="${26 + t.tier * 2}" ry="${40 + t.tier * 2}" fill="${halo.url}" stroke="none"/>` +
    tubeFast('M60 98V70', 8, WOODD, { outline: 2.6 }) +
    shelf(98, t, 20, 80) +
    icicles +
    litPath(hornD, t.tier >= 7 ? '#fffaf0' : CREAM, { shadow: 5, light: 2, shadowK: -0.3 }) +
    within(hornD, hl(rings, tone(CREAM, -0.3), 1.4, 0.7)) +
    hl('M18 38C36 58 64 70 100 70', WHITE, 2.5, 0.75) +
    litPath('M40 46L58 54L54 76L34 66Z', bandCol, { shadow: 2.5, light: 1.2, lightColor: t.tier >= 2 ? t.light : '#ffe39a' }) +
    litPath('M72 50L88 50L88 77L72 76Z', bandCol, { shadow: 2.5, light: 1.2, lightColor: t.tier >= 2 ? t.light : '#ffe39a' }) +
    (t.tier >= 4 ? litPath('M10 22L20 26L18 36L6 32Z', t.base, { ...METAL(t), outline: 2.4 }) : '') +
    (t.tier >= 6 ? gem(46, 61, SAPPHIRE, 3.4) + gem(80, 63, TEAL, 3.4) : glint(43, 52, 1.1) + glint(75, 54, 1.1)) +
    crystals +
    `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#c8faf2" stroke="${INK}" stroke-width="3"/><ellipse cx="108" cy="56" rx="4" ry="15" fill="${WHITE}" stroke="none"/>` +
    flake(100, 18, 8 + (t.tier >= 4 ? 2 : 0)) +
    flake(114, 92, 5) +
    (t.tier >= 3 ? flake(84, 8, 5) : '') +
    (t.tier >= 7 ? flake(116, 30, 6) + flake(70, 92, 5) : '')
  );
}

/** Cuckoo Clock: a carved chalet clock; gilded weights, antlers, a second bird and a crown of bells per tier. */
export function cuckooFigure(t: Trim): string {
  const roof = 'M16 46L60 12L104 46Q104 52 98 52L60 24L22 52Q16 52 16 46Z';
  const chainCol = t.tier >= 2 ? t.light : '#c9b38a';
  const chain = (x: number) => hl(`M${x} 94V108`, INK, 3) + hl(`M${x} 94V108`, chainCol, 1.4);
  const coneCol = t.tier >= 3 ? t.base : WOODD;
  const cone = (x: number) => litPath(`M${x - 5} 104Q${x - 6} 114 ${x} 117Q${x + 6} 114 ${x + 5} 104Z`, coneCol, { shadow: 2, light: 0.8, outline: 2.6 }) + hl(`M${x - 3} 108h6M${x - 3} 112h6`, tone(coneCol, -0.4), 1, 0.7);
  const antler = (dir: 1 | -1) => {
    const x = 60 + dir * 22;
    return hl(`M${x} 30q${dir * 10} -6 ${dir * 14} -18M${x + dir * 7} 26q${dir * 2} -8 ${dir * -2} -12M${x + dir * 12} 20q${dir * 6} -2 ${dir * 8} -8`, INK, 6) +
      hl(`M${x} 30q${dir * 10} -6 ${dir * 14} -18M${x + dir * 7} 26q${dir * 2} -8 ${dir * -2} -12M${x + dir * 12} 20q${dir * 6} -2 ${dir * 8} -8`, t.tier >= 7 ? t.light : '#e6d6b4', 3);
  };
  const bird = (x: number, y: number) => litBall(x, y, 6, '#c9a46a', 2.4) + litPath(`M${x + 5} ${y - 2}L${x + 14} ${y}L${x + 5} ${y + 2}Z`, MUST, { shadow: 0, light: 0, outline: 2 }) + c(x + 1, y - 2, 1.3, INK);
  const bell = (x: number) => litPath(`M${x - 4} 56Q${x - 4} 48 ${x} 48Q${x + 4} 48 ${x + 4} 56L${x + 5} 59H${x - 5}Z`, t.base, { ...METAL(t), outline: 2 });
  return (
    (t.tier >= 5 ? antler(-1) + antler(1) : '') +
    chain(42) + chain(78) + cone(42) + cone(78) +
    tubeFast('M60 92L60 106', 2.5, chainCol, { outline: 2 }) + litBall(60, 108, 5, t.tier >= 2 ? t.base : WOODD, 2.6) +
    litRect(28, 38, 64, 58, WOOD, 4, { shadow: 4, light: 1.8 }) +
    grain(31, 42, 89, 92, WOODD, 3, 3, true, 0.45) +
    litPath(roof, t.tier >= 7 ? RED : WOODD, { shadow: 3, light: 1.4 }) +
    (t.tier >= 3 ? hl('M18 47L60 15L102 47', t.base, 2.6) : hl('M28 42L60 18L92 42', tone(WOODD, -0.35), 1.2, 0.7)) +
    litPath('M30 92Q22 98 18 92Q24 86 30 88Z', LEAF, { shadow: 1.5, light: 0.6, outline: 2.4 }) +
    litPath('M90 92Q98 98 102 92Q96 86 90 88Z', LEAF, { shadow: 1.5, light: 0.6, outline: 2.4 }) +
    (t.tier >= 4 ? litPath('M26 88Q16 82 12 88Q18 94 26 92Z', LEAF, { shadow: 1.5, light: 0.6, outline: 2.4 }) + litPath('M94 88Q104 82 108 88Q102 94 94 92Z', LEAF, { shadow: 1.5, light: 0.6, outline: 2.4 }) : '') +
    litRect(50, 28, 20, 16, '#2a1c12', 3, { shadow: 0, light: 0, outline: 2.6 }) +
    bird(62, 36) +
    (t.tier >= 6 ? litRect(30, 54, 14, 12, '#2a1c12', 3, { shadow: 0, light: 0, outline: 2.4 }) + bird(36, 60) : '') +
    litBall(60, 70, 16, t.tier >= 5 ? '#fff8e6' : CREAM, 3) +
    `<circle cx="60" cy="70" r="16" fill="none" stroke="${t.base}" stroke-width="3"/>` +
    hl('M60 56v3M60 81v3M46 70h3M71 70h3', INK, 1.6, 0.8) +
    hl('M60 70L60 60M60 70L68 74', INK, 2.4) +
    c(60, 70, 2, INK) +
    (t.tier >= 7 ? bell(20) + bell(100) + gem(60, 20, RED, 3.2) : '') +
    rivets([[34, 44], [86, 44], [34, 90], [86, 90]], 1.6, t.tier >= 2 ? rivetCol(t) : '#c9b38a')
  );
}

/** Snowdrift Cannon: a stout barrel cannon on a sled stuffed with packed snow; longer, banded, twin-barrelled per tier. */
export function snowdriftFigure(t: Trim): string {
  const m = metalOf(t);
  const len = 52 + t.tier * 3;
  const barrel = (y: number, r: number, k: number) => {
    const x0 = 22;
    const x1 = x0 + len * k;
    const d = `M${x0} ${y - r}H${f(x1)}Q${f(x1 + 4)} ${y} ${f(x1)} ${y + r}H${x0}Q${x0 - 6} ${y} ${x0} ${y - r}Z`;
    let hoops = '';
    const nH = t.tier >= 3 ? 3 : 2;
    for (let i = 0; i < nH; i++) {
      const x = f(x0 + 6 + ((x1 - x0 - 16) * i) / (nH - 1));
      hoops += litRect(x, y - r - 1.5, 6, r * 2 + 3, m.base, 2, METAL(m));
    }
    return (
      litPath(d, WOOD, { shadow: 4, light: 1.6 }) +
      grain(x0 + 2, y - r + 2, x1 - 2, y + r - 2, WOODD, y, 3, false, 0.5) +
      hoops +
      litRect(f(x1 - 2), y - r - 3, 8, r * 2 + 6, t.tier >= 2 ? t.base : IRON, 3, METAL(t.tier >= 2 ? t : m)) +
      // Packed snow peeking out of the muzzle.
      `<ellipse cx="${f(x1 + 7)}" cy="${y}" rx="5" ry="${f(r - 1)}" fill="${SNOW}" stroke="${INK}" stroke-width="2.4"/>` +
      litBall(f(x1 + 10), y - 3, 4, SNOW, 2)
    );
  };
  let balls = '';
  const heap = Math.min(6, 1 + Math.floor(t.tier / 1.4));
  const spots: [number, number][] = [[20, 96], [30, 96], [25, 89], [40, 96], [35, 89], [30, 82]];
  for (let i = 0; i < heap; i++) balls += litBall(spots[i][0], spots[i][1], 5.5, SNOW, 2.4);
  return (
    shelf(100, t, 14, 92) +
    drape(111, 24, 72, t) +
    // A sled under the cannon with curled runners.
    hl('M14 96H96Q110 96 110 84', INK, 6) + hl('M14 96H96Q110 96 110 84', t.tier >= 4 ? t.light : IRONL, 2.6) +
    tubeFast('M40 94L48 78M84 94L76 78', 5, WOODD, { outline: 2.4 }) +
    (t.tier >= 6 ? barrel(44, 10, 0.85) : '') +
    barrel(66, 14, 1) +
    balls +
    // Snow on top of the barrel; icicles from tier 5.
    `<g transform="translate(0 ${t.tier >= 6 ? -18 : 0})">` +
    `<path d="M30 52Q44 46 60 51Q72 47 84 52" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M30 52Q44 46 60 51Q72 47 84 52" fill="none" stroke="${SNOW}" stroke-width="3.6" stroke-linecap="round"/>` +
    `</g>` +
    (t.tier >= 5 ? litPath('M46 78l3 8 3 -8ZM62 78l3 10 3 -10Z', ICE, { shadow: 1, light: 0.5, outline: 2 }) : '') +
    (t.tier >= 7 ? gem(50, 66, SAPPHIRE, 3.4) + gem(70, 66, TEAL, 3.4) + cheeseWheel(60, 66, 4, t.light) : '') +
    `<g stroke="none" fill="${WHITE}">${c(110, 50, 2.4, WHITE)}${c(104, 40, 1.8, WHITE)}${c(114, 62, 1.6, WHITE)}</g>`
  );
}

/** Cowbell Toll: a big cowbell on an embroidered strap under a carved yoke; more bells, flowers and gold per tier. */
export function cowbellFigure(t: Trim): string {
  const bronze = t.tier >= 5 ? MUST : '#b8862f';
  const bronzeL = t.tier >= 5 ? '#fff1b0' : '#efc56a';
  const big = 'M38 46H82L88 92Q60 100 32 92Z';
  const small = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y})scale(${s})">` +
    hl('M0 -18V-6', INK, 3.5) + hl('M0 -18V-6', '#7a5418', 1.6) +
    litPath('M-9 -6H9L12 16Q0 20 -12 16Z', bronze, { shadow: 2.5, light: 1, lightColor: bronzeL, shadowColor: '#7a5418' }) +
    litBall(0, 19, 3, IRON, 2) + `</g>`;
  const flower = (x: number, y: number, col: string) => `<g stroke="none">${c(x, y, 3, col)}${c(x, y, 1.2, MUSTL)}</g>`;
  let flowers = '';
  if (t.tier >= 3) for (const [x, col] of [[48, REDL], [60, WHITE], [72, REDL]] as const) flowers += flower(x, 39, col);
  if (t.tier >= 6) flowers += flower(42, 39, '#4f7fd9') + flower(78, 39, '#4f7fd9');
  return (
    shelf(104, t, 16, 88) +
    drape(115, 26, 68, t) +
    // The yoke: two posts and a curved, carved beam.
    tubeFast('M22 104V24M98 104V24', 7, WOOD, { outline: 3 }) +
    litPath('M12 26Q60 6 108 26L106 34Q60 16 14 34Z', t.tier >= 7 ? RED : WOODD, { shadow: 3, light: 1.4 }) +
    (t.tier >= 2 ? band(16, 22, 12, 12, t) + band(92, 22, 12, 12, t) : '') +
    (t.tier >= 4 ? litBall(60, 12, 5, t.light, 2.6) : '') +
    (t.tier >= 4 ? small(22, 52, 0.7) + small(98, 52, 0.7) : '') +
    (t.tier >= 6 ? small(36, 62, 0.55) + small(84, 62, 0.55) : '') +
    // Strap with embroidery.
    litPath('M46 20Q60 16 74 20L70 46H50Z', t.tier >= 3 ? RED : '#7a4a2a', { shadow: 2.4, light: 1, outline: 3 }) +
    hl('M48 27Q60 24 72 27', t.tier >= 3 ? t.light : '#a87a52', 1.6, 0.9) +
    flowers +
    litPath(big, bronze, { shadow: 5, light: 2.2, lightColor: bronzeL, shadowColor: '#7a5418' }) +
    litRect(36, 44, 48, 7, t.tier >= 2 ? t.base : '#7a5418', 2, METAL(t.tier >= 2 ? t : metalOf(t))) +
    hl('M42 56Q40 72 42 86', bronzeL, 2.2, 0.8) +
    (t.tier >= 5 ? litPath('M60 60l5 9 -5 9 -5 -9Z', WHITE, { shadow: 1, light: 0, outline: 2 }) + c(60, 69, 2, MUSTL) : '') +
    (t.tier >= 7 ? gem(48, 76, SAPPHIRE, 3) + gem(72, 76, RED, 3) : '') +
    litBall(60, 98, 6, metalOf(t).base, 2.8) +
    // Sound rings: one at tier 1, more per tier.
    hl('M96 70q6 8 0 16', MUSTL, 2.4, 0.9) +
    (t.tier >= 3 ? hl('M104 64q10 14 0 28', MUSTL, 2.4, 0.75) : '') +
    (t.tier >= 5 ? hl('M24 70q-6 8 0 16', MUSTL, 2.4, 0.9) + hl('M112 58q12 20 0 40', MUSTL, 2, 0.55) : '') +
    (t.tier >= 7 ? hl('M16 64q-10 14 0 28', MUSTL, 2.4, 0.75) : '') +
    glint(44, 52, 1.4)
  );
}
