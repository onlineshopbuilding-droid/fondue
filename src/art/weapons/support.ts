// Support slot (upper left of the keep): Golden Fondue, Ember Beacon, Helping Hand, Iron Grip, Mending Horn.
import { INK, RUST, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, STONE, STONEL, WHITE, GOLD, RED, TEAL, c, hl, n, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, radial, glint } from '../shade';
import { type Trim, METAL, metalOf, rivetCol, shelf, band, gem, cheeseWheel, drape, oval, f, SAPPHIRE } from './kit';

/** Golden Fondue: a gilded caquelon over a flame; the hoard in front grows to coins, bars and a crown. */
export function midasFigure(t: Trim): string {
  const pot = 'M26 52Q22 88 60 92Q98 88 94 52Z';
  const gold = radial([[0, '#fff1b0'], [0.45, MUSTL], [1, GOLD]], 0.35, 0.3, 0.7);
  const coin = (x: number, y: number) => litPath(oval(x, y, 7, 3.5), MUSTL, { shadow: 1.4, light: 0.6, lightColor: '#fff1b0', shadowColor: GOLD, outline: 2.4 });
  const bar = (x: number, y: number) => litPath(`M${x} ${y}L${x + 4} ${y - 6}H${x + 18}L${x + 22} ${y}Z`, MUST, { shadow: 1.6, light: 0.8, lightColor: '#fff1b0', shadowColor: GOLD, outline: 2.4 });
  const coins: [number, number][] = [[24, 98], [98, 98], [92, 93], [28, 93], [18, 92], [104, 92], [96, 87], [22, 86], [12, 98], [108, 98]];
  let hoard = '';
  for (let i = 0; i < Math.min(coins.length, 2 + t.tier * 1.2); i++) hoard += coin(coins[i][0], coins[i][1]);
  if (t.tier >= 5) hoard += bar(6, 102) + bar(92, 102);
  if (t.tier >= 7) hoard += bar(14, 96) + bar(86, 96);
  return (
    `<defs>${gold.def}</defs>` +
    litRect(20, 102, 80, 10, STONE, 3, { shadow: 3, light: 1.2, lightColor: STONEL }) +
    drape(105, 24, 72, t) +
    tubeFast('M34 102L40 84M86 102L80 84', 5, metalOf(t).base, { outline: 2.6, lightColor: metalOf(t).light }) +
    litPath('M52 100Q50 88 60 80Q70 88 68 100Z', RUST, { shadow: 1.5, light: 0.8, outline: 2.6 }) +
    litPath('M56 100Q55 92 60 87Q65 92 64 100Z', MUSTL, { shadow: 0, light: 0, outline: 0 }) +
    `<path d="${pot}" fill="${gold.url}" stroke="${INK}" stroke-width="3.5"/>` +
    hl('M32 60Q34 80 50 86', '#fff6c8', 2.2, 0.8) +
    band(24, 62, 72, 7, t, 3) +
    (t.tier >= 4 ? gem(42, 76, RED, 3.5) + gem(78, 76, SAPPHIRE, 3.5) : '') +
    (t.tier >= 6 ? gem(60, 80, TEAL, 4) : '') +
    litPath(oval(60, 52, 36, 9), MUST, { shadow: 2, light: 1, lightColor: '#fff1b0' }) +
    `<path d="${oval(60, 51, 29, 6)}" fill="#fff0a8" stroke="${INK}" stroke-width="2.4"/>` +
    litBall(50, 48, 4, '#ffe58a', 2) + litBall(70, 50, 3, '#ffe58a', 2) +
    (t.tier >= 3 ? litBall(60, 46, 3.4, '#ffe58a', 2) : '') +
    tubeFast('M26 58L8 46', 6, MUST, { outline: 3, lightColor: '#fff1b0' }) +
    hoard +
    glint(36, 58, 1.8) + glint(84, 44, 1.2) +
    hl('M60 30v-8M48 34l-4 -6M72 34l4 -6', MUSTL, 2.4, 0.9) +
    (t.tier >= 4 ? hl('M36 38l-6 -4M84 38l6 -4', MUSTL, 2.4, 0.9) : '') +
    (t.tier >= 7 ? litPath('M44 40L46 26L53 33L60 22L67 33L74 26L76 40Z', t.base, { ...METAL(t), outline: 2.4 }) + gem(60, 34, RED, 2.6) : '')
  );
}

/** Ember Beacon: an iron fire basket on a post; taller flames, more sparks and a blue-hot core per tier. */
export function beaconFigure(t: Trim): string {
  const k = 0.8 + t.tier * 0.06;
  const flameOut = 'M34 56Q28 36 42 26Q40 38 50 36Q46 18 62 6Q60 24 70 26Q76 14 82 22Q78 32 88 40Q90 50 86 56Z';
  const flameMid = 'M42 56Q38 42 48 36Q50 44 56 42Q54 28 64 20Q64 34 72 36Q76 30 80 38Q80 48 78 56Z';
  const flameIn = 'M50 56Q48 48 54 44Q58 48 60 44Q62 36 66 34Q68 42 72 46Q72 52 70 56Z';
  const basket = metalOf(t);
  const sparks: [number, number, number][] = [[30, 20, 2.2], [94, 28, 1.8], [84, 8, 1.6], [24, 40, 1.4], [100, 12, 1.6], [16, 24, 1.4], [106, 40, 1.8], [40, 4, 1.4]];
  let sp = '';
  for (let i = 0; i < Math.min(sparks.length, 2 + t.tier); i++) sp += c(sparks[i][0], sparks[i][1], sparks[i][2], i % 2 ? '#ff9a30' : MUSTL);
  return (
    shelf(104, t, 30, 60) +
    drape(115, 34, 52, t) +
    tubeFast('M60 104V72', 8, WOODD, { outline: 3 }) +
    (t.tier >= 3 ? band(54, 86, 12, 6, t) : '') +
    `<g transform="translate(60 56)scale(${f(k)} ${f(k * 1.05)})translate(-60 -56)">` +
    litPath(flameOut, RUST, { shadow: 2.5, light: 1.2, lightColor: '#ff8a5a', outline: 3 }) +
    litPath(flameMid, MUST, { shadow: 1.5, light: 0.8, lightColor: MUSTL, outline: 0 }) +
    litPath(flameIn, t.tier >= 7 ? '#bfefff' : '#fff0bd', { shadow: 0, light: 0, outline: 0 }) +
    (t.tier >= 7 ? n('M56 56Q55 50 59 47Q61 51 63 48Q65 52 64 56Z', WHITE) : '') +
    `</g>` +
    litPath('M30 54H90L80 78H40Z', '#2a1c14', { shadow: 0, light: 0, outline: 3 }) +
    tubeFast('M40 56L46 78M54 56L56 78M66 56L64 78M80 56L74 78', 3.6, basket.base, { outline: 2.2, lightColor: basket.light }) +
    litRect(26, 50, 68, 8, basket.base, 3, METAL(basket)) +
    litRect(38, 76, 44, 6, basket.base, 3, METAL(basket)) +
    (t.tier >= 4 ? litPath('M22 50Q16 44 20 38Q24 46 30 48Z', basket.base, { ...METAL(basket), outline: 2.2 }) + litPath('M98 50Q104 44 100 38Q96 46 90 48Z', basket.base, { ...METAL(basket), outline: 2.2 }) : '') +
    (t.tier >= 5 ? gem(60, 54, RED, 3.2) : '') +
    (t.tier >= 6 ? gem(40, 54, SAPPHIRE, 2.6) + gem(80, 54, TEAL, 2.6) : '') +
    `<g stroke="none">${sp}</g>` +
    hl('M34 70h52', '#ff9a30', 2, 0.35)
  );
}

/** A big felt hand seen from the palm side, fingers up, wrist at (60, 92). */
function feltHand(fill: string, shade: string, line: string): string {
  const fingers = [
    [36, 30, 10, 36, -10], [48, 18, 11, 44, -3], [61, 16, 11, 46, 3], [73, 24, 10, 40, 10],
  ];
  let s = '';
  for (const [x, y, w, h, a] of fingers) {
    const d = `M${x} ${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}H${x}Z`;
    s += `<g transform="rotate(${a} ${x + w / 2} ${y + h})">` + litPath(d, fill, { shadow: 2.4, light: 1, shadowColor: shade, outline: 3 }) + `</g>`;
  }
  s += `<g transform="rotate(-38 30 72)">` + litPath('M14 66A6 6 0 0 1 20 60H44V72H20A6 6 0 0 1 14 66Z', fill, { shadow: 2.4, light: 1, shadowColor: shade, outline: 3 }) + `</g>`;
  s += litPath('M30 52H88Q90 76 80 90H40Q30 78 30 52Z', fill, { shadow: 4, light: 1.6, shadowColor: shade, outline: 3.2 });
  s += hl('M44 70Q56 78 72 66M48 80Q58 84 70 78', line, 1.6, 0.8);
  return s;
}

/** Helping Hand: a second felt hand rising from a cuffed sleeve on a stand; rings, bracelet and gold per tier. */
export function helperFigure(t: Trim): string {
  const fill = t.tier >= 7 ? '#fff4d6' : '#fdfaf3';
  const shade = t.tier >= 7 ? '#e9c77a' : tone('#fdfaf3', -0.22);
  const ring = (x: number, y: number, a: number, col: string, stone?: string) =>
    `<g transform="rotate(${a} ${x} ${y})">${litRect(x - 6.5, y - 2, 13, 4.5, col, 2, { ...METAL(t), outline: 2 })}${stone ? gem(x, y, stone, 2.4) : ''}</g>`;
  const sleeve = t.tier >= 4 ? RED : TEAL;
  return (
    shelf(104, t, 26, 68) +
    drape(115, 30, 60, t) +
    // Sleeve and cuff on a short post.
    tubeFast('M60 104V96', 12, WOODD, { outline: 2.6 }) +
    litPath('M38 88H82L86 102H34Z', sleeve, { shadow: 3, light: 1.2, outline: 3 }) +
    hl('M40 96H80', tone(sleeve, 0.35), 1.4, 0.7) +
    feltHand(fill, shade, '#a3959b') +
    litRect(36, 84, 48, 9, t.tier >= 2 ? t.base : CREAM, 3, t.tier >= 2 ? METAL(t) : { shadow: 2, light: 1 }) +
    (t.tier >= 2 ? rivets([[42, 88.5], [60, 88.5], [78, 88.5]], 1.5, rivetCol(t), '#1d2024') : '') +
    (t.tier >= 3 ? ring(53, 52, -3, t.base) : '') +
    (t.tier >= 5 ? ring(66, 50, 3, t.base, RED) + ring(78, 56, 10, t.base) : '') +
    (t.tier >= 6 ? gem(60, 88.5, SAPPHIRE, 3.4) : '') +
    (t.tier >= 7 ? ring(41, 58, -10, t.base, TEAL) : '') +
    // Motion lines: it is reaching out.
    hl('M96 36q8 10 0 20M104 30q12 16 0 32', MUSTL, 2.2, 0.85) +
    (t.tier >= 4 ? hl('M24 36q-8 10 0 20', MUSTL, 2.2, 0.85) : '')
  );
}

/** Iron Grip: an armoured gauntlet clenched over an anvil; knuckle plates, spikes, gold and gems per tier. */
export function gripFigure(t: Trim): string {
  const iron = t.tier >= 6 ? t.base : t.tier >= 4 ? '#8d939a' : IRON;
  const ironL = t.tier >= 6 ? t.light : t.tier >= 4 ? '#d6dbe0' : IRONL;
  const ironD = t.tier >= 6 ? t.dark : '#2c2f34';
  const M = { shadow: 3, light: 1.4, lightColor: ironL, shadowColor: ironD };
  const plate = t.tier >= 3 ? t.base : ironL;
  let knuckles = '';
  for (let i = 0; i < 4; i++) {
    const x = 38 + i * 12;
    knuckles += litRect(x, 34, 11, 14, iron, 3, { ...M, outline: 2.8 }) + litRect(x + 1, 30, 9, 7, plate, 2, { ...METAL(t.tier >= 3 ? t : metalOf(t)), outline: 2.2 });
    if (t.tier >= 5) knuckles += litPath(`M${x + 2} 31L${x + 5.5} ${t.tier >= 7 ? 18 : 22}L${x + 9} 31Z`, ironL, { shadow: 1, light: 0.5, outline: 2.2 });
  }
  return (
    // Anvil on a block.
    litRect(24, 96, 72, 14, WOODD, 3, { shadow: 3, light: 1.4 }) +
    grain(27, 98, 93, 108, tone(WOODD, -0.4), 5, 2, false, 0.6) +
    drape(108, 26, 68, t) +
    litPath('M30 80H92Q100 80 106 72Q100 86 86 88L80 96H40L36 88Q28 86 30 80Z', '#4b4f55', { shadow: 3.5, light: 1.4, lightColor: IRONL }) +
    hl('M34 82H90', IRONL, 1.6, 0.8) +
    // Cuff, back of the fist and the folded thumb.
    litPath('M16 52Q14 40 26 38H38V76H26Q16 74 16 62Z', iron, M) +
    hl('M20 46V70M26 42V74', ironD, 1.6, 0.6) +
    band(14, 50, 26, 6, t) +
    (t.tier >= 4 ? band(14, 64, 26, 6, t) : '') +
    litPath('M36 36H86Q94 36 94 46V66Q94 78 82 78H36Z', iron, M) +
    knuckles +
    litPath('M40 58H74Q80 58 80 64Q80 70 74 70H40Z', iron, { ...M, outline: 3 }) +
    hl('M44 62H72', ironL, 1.4, 0.8) +
    rivets([[24, 44], [24, 70], [88, 46], [88, 70]], 1.8, rivetCol(t), '#1d2024') +
    (t.tier >= 4 ? gem(30, 57, RED, 3.4) : '') +
    (t.tier >= 6 ? gem(60, 52, SAPPHIRE, 3.6) + gem(86, 58, TEAL, 3) : '') +
    (t.tier >= 7 ? cheeseWheel(26, 57, 4, t.light) : '') +
    // Strength lines.
    hl('M100 34l8 -6M102 46l10 -2', MUSTL, 2.4, 0.9) +
    (t.tier >= 3 ? hl('M98 22l6 -8', MUSTL, 2.4, 0.9) : '') +
    (t.tier >= 5 ? hl('M10 30l-4 -6M14 22l-2 -8', MUSTL, 2.4, 0.9) : '') +
    glint(46, 40, 1.4)
  );
}

/** A marmot head peeking up, with a carpenter's cap; for the Mending Horn from tier 4. */
function marmotHead(x: number, y: number, cap: string): string {
  const fur = '#9a6d44';
  return (
    litBall(x - 13, y - 10, 4.5, fur, 2.4) + litBall(x + 13, y - 10, 4.5, fur, 2.4) +
    litBall(x, y, 15, fur, 3) +
    litPath(`M${x - 8} ${y + 2}Q${x} ${y - 2} ${x + 8} ${y + 2}Q${x + 6} ${y + 10} ${x} ${y + 10}Q${x - 6} ${y + 10} ${x - 8} ${y + 2}Z`, '#d9b98a', { shadow: 1.2, light: 0.5, outline: 2.2 }) +
    litBall(x, y + 2, 2.4, INK, 1.4) +
    `<path d="M${x - 2} ${y + 9}h4v4h-4Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>` +
    c(x - 6, y - 4, 2.2, INK) + c(x + 6, y - 4, 2.2, INK) + glint(x - 6.6, y - 4.8, 0.8) + glint(x + 5.4, y - 4.8, 0.8) +
    litPath(`M${x - 14} ${y - 8}Q${x - 12} ${y - 20} ${x} ${y - 20}Q${x + 12} ${y - 20} ${x + 14} ${y - 8}Q${x} ${y - 13} ${x - 14} ${y - 8}Z`, cap, { shadow: 2, light: 0.8, outline: 2.4 })
  );
}

/** Mending Horn: a carpenter's toolbox with planks and a curled horn; a marmot carpenter joins from tier 4. */
export function menderFigure(t: Trim): string {
  const hornCol = t.tier >= 3 ? t.base : '#e6d6b4';
  const hornL = t.tier >= 3 ? t.light : '#fff6dc';
  const hornD = 'M30 50Q14 46 14 30Q14 14 32 12Q48 12 50 26Q50 36 40 36Q34 36 34 30';
  const bellD = 'M50 20Q60 4 80 6L86 30Q66 26 56 36Z';
  return (
    shelf(104, t, 16, 88) +
    drape(115, 24, 72, t) +
    // Planks leaning against the box, a hammer and a saw from tier 3.
    litRect(84, 48, 10, 56, WOODL, 2, { shadow: 2.5, light: 1.2 }) +
    litRect(96, 56, 9, 48, WOOD, 2, { shadow: 2.5, light: 1.2 }) +
    (t.tier >= 3 ? litPath('M14 102L30 60L38 62L24 104Z', IRONL, { shadow: 1.6, light: 0.8, lightColor: '#e2e6ea', outline: 2.4 }) + hl('M17 96l4 1M20 88l4 1M23 80l4 1M26 72l4 1', INK, 1.4, 0.8) : '') +
    // The toolbox.
    litPath('M22 70H86V104H22Z', WOOD, { shadow: 4, light: 1.6 }) +
    grain(25, 72, 83, 102, WOODD, 31, 3, false, 0.5) +
    band(20, 66, 68, 7, t) +
    band(28, 84, 8, 20, t) + band(72, 84, 8, 20, t) +
    tubeFast('M40 66V56H68V66', 4, metalOf(t).base, { outline: 2.4, lightColor: metalOf(t).light }) +
    (t.tier >= 4 ? marmotHead(54, 54, t.tier >= 6 ? RED : TEAL) : '') +
    // Hammer resting on the lid.
    tubeFast('M66 62L96 40', 4.5, WOODL, { outline: 2.6 }) +
    `<g transform="rotate(-36 98 38)">${litRect(90, 32, 18, 10, metalOf(t).base, 2, METAL(metalOf(t)))}</g>` +
    // The horn curls up and opens to the right.
    `<path d="${hornD}" fill="none" stroke="${INK}" stroke-width="${t.tier >= 5 ? 12 : 10}" stroke-linecap="round"/>` +
    `<path d="${hornD}" fill="none" stroke="${hornCol}" stroke-width="${t.tier >= 5 ? 7 : 5}" stroke-linecap="round"/>` +
    hl('M28 47Q18 42 18 30', hornL, 1.6, 0.8) +
    litPath(bellD, hornCol, { shadow: 3, light: 1.4, lightColor: hornL }) +
    `<ellipse cx="83" cy="18" rx="4" ry="12" transform="rotate(-10 83 18)" fill="#3a2516" stroke="${INK}" stroke-width="2.4"/>` +
    (t.tier >= 5 ? hl('M60 14Q66 8 72 8', WHITE, 1.6, 0.8) + litPath('M54 30L50 44L58 38L62 46L64 32Z', RED, { shadow: 1.4, light: 0.6, outline: 2.2 }) : '') +
    (t.tier >= 6 ? gem(66, 20, SAPPHIRE, 3) : '') +
    (t.tier >= 7 ? gem(40, 86, RED, 3.4) + cheeseWheel(54, 86, 4, t.light) + gem(68, 86, TEAL, 3.4) : '') +
    // The call: music notes and a healing glow.
    hl('M96 12q6 6 0 12M104 6q10 12 0 24', MUSTL, 2.2, 0.85) +
    (t.tier >= 2 ? litPath('M108 34h4v4h4v4h-4v4h-4v-4h-4v-4h4Z', '#5aa04c', { shadow: 0, light: 0, outline: 1.8 }) : '') +
    (t.tier >= 5 ? litPath('M10 4h3v3h3v3h-3v3h-3v-3h-3v-3h3Z', '#5aa04c', { shadow: 0, light: 0, outline: 1.6 }) : '') +
    glint(70, 12, 1.4)
  );
}
