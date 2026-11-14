// Gate slot (above the gate arch): Gate Mortar, Hedgehog Gate, Alphorn, Cheese Cascade, Battering Log.
import { INK, RUST, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, WHITE, RED, REDL, TEAL, c, hl, n, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, linear, radial, glint } from '../shade';
import { type Trim, METAL, metalOf, rivetCol, shelf, band, gem, cheeseWheel, drape, oval, f, SAPPHIRE, LEAF } from './kit';

/** Gate Mortar: a squat barrel on a wheeled carriage; bands, a shell stack and a gold barrel per tier. */
export function mortarFigure(t: Trim): string {
  const metal = t.tier >= 7 ? MUST : IRON;
  const lightM = t.tier >= 7 ? '#fff1b0' : IRONL;
  const barrel = 'M36 92L30 40Q30 30 60 30Q90 30 90 40L84 92Q60 100 36 92Z';
  const iron = linear([[0, tone(metal, 0.28)], [0.45, metal], [1, tone(metal, -0.5)]], 0);
  const glow = radial([[0, '#ff9a30', 0.9], [0.5, '#ff9a30', 0.4], [1, '#ff9a30', 0]]);
  const wheel = (x: number) =>
    litPath(oval(x, 96, 9, 9), WOODD, { shadow: 2.5, light: 1.2 }) +
    hl(`M${x - 6} 96H${x + 6}M${x} 90V102`, tone(WOODD, -0.35), 1.6, 0.8) +
    rivets([[x, 96]], 2.6, t.tier >= 3 ? t.light : IRON);
  const shells: [number, number][] = [[104, 98], [112, 98], [108, 91], [10, 98], [18, 98], [14, 91]];
  let stack = '';
  for (let i = 0; i < Math.min(shells.length, t.tier - 1); i++) stack += litBall(shells[i][0], shells[i][1], 4.5, IRON, 2.4);
  const bands = Math.min(3, 1 + Math.floor((t.tier - 1) / 2));
  let rings = '';
  for (let i = 0; i < bands; i++) rings += litRect(30 + i * 1.5, 62 + i * 10, 60 - i * 3, 7, t.tier >= 2 ? t.base : RUST, 2, t.tier >= 2 ? METAL(t) : { shadow: 2.5, light: 1 });
  return (
    `<defs>${iron.def}${glow.def}</defs>` +
    `<ellipse cx="74" cy="34" rx="${28 + t.tier * 2}" ry="${24 + t.tier * 2}" fill="${glow.url}" stroke="none"/>` +
    litPath('M16 76H104L110 96H10Z', WOOD, { shadow: 3.5, light: 1.6 }) +
    grain(20, 79, 104, 93, WOODD, 13, 2, false, 0.55) +
    hl('M18 80H102', WOODL, 1.6, 0.8) +
    wheel(30) + wheel(90) +
    `<g transform="rotate(-38 60 62)">` +
    `<path d="${barrel}" fill="${iron.url}" stroke="${INK}" stroke-width="3.5"/>` +
    hl('M38 84L34 42', lightM, 2.5, 0.9) +
    glint(37, 50, 1.4) +
    litPath('M24 40Q60 22 96 40Q96 48 90 48Q60 38 30 48Q24 48 24 40Z', t.tier >= 4 ? t.base : lightM, { shadow: 2.5, light: 1.2, lightColor: t.tier >= 4 ? t.light : '#d6dbe0' }) +
    rings +
    (t.tier >= 5 ? gem(60, 66, RED, 3.4) : rivets([[40, 66], [60, 66], [80, 66]], 1.6, MUSTL)) +
    (t.tier >= 6 ? gem(42, 66, SAPPHIRE, 2.8) + gem(78, 66, TEAL, 2.8) : '') +
    `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#ffb347" stroke="${INK}" stroke-width="2.5"/><ellipse cx="60" cy="35" rx="16" ry="4.5" fill="#fff0bd" stroke="none"/>` +
    `</g>` +
    shelf(101, t, 26, 68) +
    drape(112, 30, 60, t) +
    stack +
    `<g stroke-width="1.6">${c(92, 18, 3.5, MUSTL)}${c(104, 30, 2.5, '#ff9a30')}${c(78, 10, 2.5, '#ff9a30')}</g>` +
    glint(91, 17, 0.9)
  );
}

/** Hedgehog Gate: a felt hedgehog of spikes bolted to the gate; more and finer spikes, gold tips and a crown per tier. */
export function thornsFigure(t: Trim): string {
  const cx = 60;
  const cy = 90;
  let spikes = '';
  const nSp = 11 + t.tier * 2;
  const spike = t.tier >= 3 ? t.base : IRONL;
  const spikeL = t.tier >= 3 ? t.light : '#d6dbe0';
  const reach = 1.22 + t.tier * 0.02;
  for (let i = 0; i < nSp; i++) {
    const a = Math.PI + ((i + 0.5) / nSp) * Math.PI;
    const bx = cx + Math.cos(a) * 44 * 0.86;
    const by = cy + Math.sin(a) * 50 * 0.86;
    const tx = cx + Math.cos(a) * 44 * reach;
    const ty = cy + Math.sin(a) * 50 * (reach - 0.06);
    const w = 5 - t.tier * 0.25;
    const px = -Math.sin(a) * w;
    const py = Math.cos(a) * w;
    spikes += litPath(`M${f(bx - px)} ${f(by - py)}L${f(tx)} ${f(ty)}L${f(bx + px)} ${f(by + py)}Z`, spike, { shadow: 1.2, light: 0.6, lightColor: spikeL, outline: 2.4 });
    if (t.tier >= 5 && i % 2 === 0) spikes += c(f(tx), f(ty), 1.8, i % 4 === 0 ? REDL : MUSTL);
  }
  return (
    shelf(98, t, 14, 92) +
    drape(109, 22, 76, t) +
    spikes +
    litPath('M16 96Q18 44 60 40Q100 42 104 96Z', '#7a5636', { shadow: 4, light: 1.8, lightColor: '#a8805a' }) +
    hl('M30 70q6 -8 12 -10M46 56q6 -4 12 -4M70 54q8 2 12 6', tone('#7a5636', -0.35), 1.6, 0.7) +
    (t.tier >= 4 ? litPath('M28 80Q44 70 60 72Q76 70 86 78L84 86Q60 78 30 88Z', t.base, { ...METAL(t), outline: 2.4 }) + rivets([[40, 80], [60, 77], [78, 80]], 1.4, t.light, '#1d2024') : '') +
    (t.tier >= 6 ? gem(60, 78, SAPPHIRE, 3) : '') +
    litPath('M84 62Q104 64 114 84Q112 94 96 96Q82 92 80 78Z', '#d9b98a', { shadow: 2.5, light: 1, lightColor: '#f0dcb4' }) +
    litBall(114, 84, 4.5, INK, 2) +
    c(94, 74, 3.4, INK) + glint(93, 72.8, 1.1) +
    hl('M98 88q6 2 10 0', INK, 1.6, 0.8) +
    (t.tier >= 7 ? litPath('M84 62L86 50L91 56L95 46L99 56L104 50L105 64Z', t.base, { ...METAL(t), outline: 2.2 }) + gem(95, 57, RED, 2.2) : '')
  );
}

/** Alphorn: a long wooden horn on a forked stand; more bands, flowers, ribbons and a gold bell per tier. */
export function alphornFigure(t: Trim): string {
  const tube = 'M14 18C26 26 40 44 54 62C66 78 80 88 96 92';
  const bell = 'M88 80Q100 80 112 70Q118 88 114 108Q100 104 88 104Z';
  const bandAt = (x: number, y: number, a: number) => `<g transform="translate(${x} ${y})rotate(${a})">${litRect(-6, -8, 12, 16, metalOf(t).base, 2, METAL(metalOf(t)))}</g>`;
  const flower = (x: number, y: number, col: string) => `<g stroke="none">${c(x, y, 3, col)}${c(x, y, 1.2, CREAM)}</g>`;
  return (
    shelf(104, t, 30, 62) +
    drape(115, 34, 54, t) +
    tubeFast('M44 104L56 66M72 104L58 66', 6, WOODD, { outline: 2.6 }) +
    tubeFast(tube, 11 + (t.tier >= 5 ? 1 : 0), WOOD, { outline: 3.5, lightColor: WOODL }) +
    hl('M18 19C30 27 42 42 54 58', WOODL, 1.6, 0.7) +
    bandAt(30, 32, 45) + bandAt(70, 79, 38) +
    (t.tier >= 3 ? bandAt(48, 55, 52) : '') +
    (t.tier >= 5 ? bandAt(84, 87, 20) : '') +
    litPath(bell, t.tier >= 7 ? MUSTL : WOODL, { shadow: 4, light: 1.6, lightColor: t.tier >= 7 ? '#fff1b0' : '#e0b27a' }) +
    `<path d="M108 74Q114 90 111 104" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="112" cy="89" rx="5" ry="18" fill="#3a2516" stroke="${INK}" stroke-width="2.5"/>` +
    (t.tier >= 4 ? `<ellipse cx="112" cy="89" rx="6.5" ry="19.5" fill="none" stroke="${t.base}" stroke-width="2.4"/>` : '') +
    hl('M92 84Q100 84 106 78', CREAM, 1.6, 0.6) +
    flower(96, 94, REDL) + flower(102, 88, CREAM) +
    (t.tier >= 2 ? flower(94, 100, '#4f7fd9') : '') +
    (t.tier >= 4 ? flower(104, 98, REDL) + flower(100, 82, MUSTL) : '') +
    (t.tier >= 6 ? litPath('M30 32Q22 44 26 58Q30 48 34 42Z', RED, { shadow: 1.4, light: 0.6, outline: 2.2 }) + litPath('M34 38Q36 50 32 62Q40 52 40 42Z', MUSTL, { shadow: 1.4, light: 0.6, outline: 2.2 }) : '') +
    (t.tier >= 6 ? gem(100, 92, SAPPHIRE, 3) : '') +
    litRect(8, 13, 9, 9, t.base, 2, METAL(t)) +
    // The blast pushes outward from tier 3.
    (t.tier >= 3 ? hl('M118 64v-6M118 112v6', MUSTL, 2.4, 0.9) : '')
  );
}

/** Cheese Cascade: a cauldron spout over the gate arch pouring hot cheese; wider stream, flames and gold per tier. */
export function cascadeFigure(t: Trim): string {
  const m = metalOf(t);
  const pot = t.tier >= 7 ? MUST : IRON;
  const potL = t.tier >= 7 ? '#fff1b0' : IRONL;
  const w = 6 + t.tier * 1.2;
  const melt = radial([[0, '#fff2b0'], [0.6, MUSTL], [1, MUST]], 0.4, 0.4, 0.6);
  let drops = '';
  const spots: [number, number][] = [[80, 108], [100, 112], [72, 114], [108, 104], [88, 116]];
  for (let i = 0; i < Math.min(spots.length, 1 + Math.floor(t.tier / 1.5)); i++) drops += litBall(spots[i][0], spots[i][1], 2.6, MUSTL, 1.8);
  return (
    `<defs>${melt.def}</defs>` +
    // Gantry beam with chains, the cauldron tipped to the right.
    litRect(6, 6, 76, 10, WOOD, 3, { shadow: 3, light: 1.4 }) +
    band(14, 4, 9, 14, t) + band(62, 4, 9, 14, t) +
    hl('M30 16V30M58 16V30', INK, 3.5) + hl('M30 16V30M58 16V30', m.light, 1.6) +
    // The stone ledge over the gate arch that carries the fire.
    litRect(6, 88, 66, 12, '#9a9484', 3, { shadow: 3, light: 1.4, lightColor: '#bfb9a6' }) +
    hl('M28 89V99M50 89V99', '#756f63', 1.4, 0.8) +
    drape(99, 10, 58, t) +
    (t.tier >= 5 ? litPath('M24 86Q20 74 30 70Q30 78 36 76Q36 66 44 62Q46 72 52 72Q58 68 60 76Q64 84 58 86Z', '#ff8a3a', { shadow: 1.2, light: 0.6, outline: 2.4 }) + n('M34 86Q32 80 38 78Q40 82 44 80Q48 82 48 86Z', '#fff0bd') : '') +
    `<g transform="rotate(${16 + t.tier} 44 52)">` +
    litPath('M14 30Q12 70 44 74Q76 70 74 30Z', pot, { shadow: 4.5, light: 2, lightColor: potL }) +
    band(13, 42, 62, 7, t, 3) +
    (t.tier >= 6 ? gem(44, 58, RED, 3.4) : '') +
    litPath(oval(44, 30, 31, 8), potL, { shadow: 2, light: 1, outline: 3.2 }) +
    `<path d="${oval(44, 29, 25, 5.5)}" fill="${melt.url}" stroke="${INK}" stroke-width="2.4"/>` +
    // The spout on the right lip.
    litPath('M70 26L92 22L92 32L72 36Z', m.base, { ...METAL(m), outline: 2.8 }) +
    `</g>` +
    // The stream falls from the spout to the road below.
    litPath(`M${f(90 - w / 2)} 40Q${f(92 - w / 2)} 70 ${f(88 - w / 2)} 104Q88 112 ${f(88 + w / 2)} 104Q${f(92 + w / 2)} 70 ${f(90 + w / 2)} 38Z`, MUSTL, { shadow: f(w * 0.3), light: 1, lightColor: '#fff2b0', shadowColor: MUST, outline: 3 }) +
    hl(`M${f(89 - w / 4)} 46Q${f(91 - w / 4)} 70 ${f(88 - w / 4)} 96`, '#fff2b0', 1.6, 0.85) +
    litPath(oval(88, 108, w + 6, 4), MUSTL, { shadow: 1.5, light: 0.8, lightColor: '#fff2b0', shadowColor: MUST, outline: 2.6 }) +
    drops +
    // Steam.
    `<g fill="${WHITE}" stroke="none" opacity=".55">${c(104, 60, 4, WHITE)}${c(108, 50, 3, WHITE)}${t.tier >= 4 ? c(72, 92, 3.5, WHITE) + c(110, 80, 3, WHITE) : ''}</g>` +
    (t.tier >= 7 ? gem(28, 11, SAPPHIRE, 3) + gem(60, 11, RED, 3) : '')
  );
}

/** An ibex head facing right with horns curving back over it; the ram head of the Battering Log. */
function ibexHead(x: number, y: number, t: Trim): string {
  const coat = t.tier >= 7 ? t.base : '#9a7a52';
  const coatL = t.tier >= 7 ? t.light : '#c9a97a';
  const horn = t.tier >= 6 ? t.light : '#e6d6b4';
  const hornD = `M${x - 2} ${y - 12}C${x - 6} ${y - 34} ${x - 30} ${y - 36} ${x - 34} ${y - 18}`;
  let ridges = '';
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    const px = (1 - k) ** 3 * (x - 2) + 3 * (1 - k) ** 2 * k * (x - 6) + 3 * (1 - k) * k * k * (x - 30) + k ** 3 * (x - 34);
    const py = (1 - k) ** 3 * (y - 12) + 3 * (1 - k) ** 2 * k * (y - 34) + 3 * (1 - k) * k * k * (y - 36) + k ** 3 * (y - 18);
    ridges += `M${f(px - 3)} ${f(py - 2)}l5 3`;
  }
  return (
    `<path d="${hornD}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>` +
    `<path d="${hornD}" fill="none" stroke="${horn}" stroke-width="6.5" stroke-linecap="round"/>` +
    hl(ridges, INK, 1.4, 0.75) +
    // Head: a long snout to the right, ear back, beard below.
    litPath(`M${x - 12} ${y - 14}Q${x - 2} ${y - 18} ${x + 8} ${y - 10}L${x + 22} ${y - 2}Q${x + 26} ${y + 4} ${x + 20} ${y + 8}L${x + 4} ${y + 12}Q${x - 10} ${y + 14} ${x - 14} ${y + 2}Z`, coat, { shadow: 3, light: 1.2, lightColor: coatL, outline: 3 }) +
    litPath(`M${x + 2} ${y + 10}L${x + 8} ${y + 24}L${x + 12} ${y + 9}Z`, tone(coat, -0.3), { shadow: 0, light: 0, outline: 2.4 }) +
    litPath(`M${x - 8} ${y - 10}Q${x - 18} ${y - 12} ${x - 20} ${y - 6}Q${x - 14} ${y - 4} ${x - 8} ${y - 6}Z`, coat, { shadow: 1, light: 0.5, outline: 2.2 }) +
    c(x + 2, y - 6, 2.4, INK) + glint(x + 1.3, y - 6.8, 0.8) +
    c(x + 21, y + 2, 1.4, INK) +
    hl(`M${x + 10} ${y + 6}q5 2 9 0`, INK, 1.4, 0.8)
  );
}

/** Battering Log: a tree trunk swinging on chains under a beam; iron cap, then an ibex ram head, gold and gems per tier. */
export function logFigure(t: Trim): string {
  const m = metalOf(t);
  const head = t.tier >= 5;
  const capCol = t.tier >= 2 ? t.base : WOODD;
  const chain = (x0: number, x1: number) => {
    const d = `M${x0} 16L${x1} 56`;
    return hl(d, INK, 5) + hl(d, m.light, 2.2) + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  };
  const x0 = 12;
  const x1 = head ? 82 : 92 + t.tier * 2;
  const log = `M${x0} 52Q${x0 - 5} 66 ${x0} 80H${x1}V52Z`;
  return (
    litRect(4, 4, 112, 12, WOODD, 3, { shadow: 3, light: 1.4 }) +
    grain(8, 6, 112, 14, tone(WOODD, -0.4), 41, 2, false, 0.6) +
    band(28, 2, 10, 16, t) + band(70, 2, 10, 16, t) +
    chain(33, 36) + chain(75, 72) +
    litPath(log, WOOD, { shadow: 4.5, light: 1.8 }) +
    hl(`M${x0 + 10} 58H${x1 - 26}M${x0 + 18} 72H${x1 - 14}M${x0 + 6} 65H${x0 + 30}`, WOODD, 1.6, 0.7) +
    `<ellipse cx="${x0}" cy="66" rx="6" ry="14" fill="${WOODL}" stroke="${INK}" stroke-width="2.6"/>` +
    `<ellipse cx="${x0}" cy="66" rx="3" ry="7" fill="none" stroke="${WOODD}" stroke-width="1.2"/>` +
    band(30, 50, 9, 32, t) + band(68, 50, 9, 32, t) +
    (t.tier >= 3 ? litPath('M52 52Q48 40 38 40Q46 46 48 52Z', LEAF, { shadow: 1, light: 0.5, outline: 2 }) : '') +
    (t.tier >= 4 ? cheeseWheel(52, 66, 5, t.light) : '') +
    (head
      ? litRect(x1 - 6, 48, 12, 36, capCol, 3, METAL(t)) + ibexHead(x1 + 10, 64, t) +
        (t.tier >= 6 ? gem(x1, 66, SAPPHIRE, 3.4) : '') +
        (t.tier >= 7 ? gem(x1, 56, RED, 2.6) + gem(x1, 76, TEAL, 2.6) : '')
      : litRect(x1 - 4, 48, 12, 36, capCol, 3, t.tier >= 2 ? METAL(t) : { shadow: 2.5, light: 1 }) +
        (t.tier >= 2 ? rivets([[x1 + 2, 56], [x1 + 2, 76]], 1.8, rivetCol(t), '#1d2024') : '') +
        (t.tier >= 3 ? litPath(`M${x1 + 8} 54L${x1 + 16} 60V72L${x1 + 8} 78Z`, capCol, { ...METAL(t), outline: 2.6 }) : '')) +
    // Swing lines.
    hl('M10 94q20 8 40 6M30 104q20 6 40 2', MUSTL, 2.2, 0.8) +
    (t.tier >= 5 ? hl('M70 98q20 4 36 -4', MUSTL, 2.2, 0.8) : '') +
    (t.tier >= 6 ? `<g stroke="none">${c(112, 94, 2.4, MUSTL)}${c(104, 102, 1.8, WHITE)}</g>` : '') +
    (t.tier >= 7 ? `<g stroke="none">${c(20, 28, 2, MUSTL)}${c(98, 28, 1.6, WHITE)}</g>` : '')
  );
}
