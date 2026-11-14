// Damage slot (lower left of the keep): Rolling Wheel, Fondue Forks, Stomper, Comet, Dragon Bellows.
// Each figure takes the tier's trim and adds its own parts as the tier rises.
import { INK, RUST, RUSTD, MUST, MUSTL, CREAM, WOOD, WOODD, WOODL, IRON, IRONL, STONE, STONED, STONEL, WHITE, PLUM, RED, TEAL, c, hl, n, l, p, litPath, litRect, litBall, rivets, grain, tubeFast } from '../draw';
import { tone, radial, glint, within } from '../shade';
import { type Trim, METAL, metalOf, rivetCol, shelf, band, gem, cheeseWheel, drape, oval, f, SAPPHIRE, GOLDL } from './kit';

const circ = (x: number, y: number, r: number) => oval(x, y, r, r);

/** A stone wheel of radius `r` at (x, y): rim blocks, cross, hub; studs, gold tyre and spikes as the tier rises. */
export function stoneWheel(x: number, y: number, r: number, t: Trim): string {
  const at = (rr: number, a: number) => `${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  const rimG = radial([[0, STONEL], [0.6, STONE], [1, STONED]], 0.4, 0.38, 0.66);
  const inner = r * 0.72;
  let joints = '';
  for (let i = 0; i < 12; i++) joints += `M${at(inner, (i * Math.PI) / 6)}L${at(r, (i * Math.PI) / 6)}`;
  let spikes = '';
  if (t.tier >= 6) {
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + 0.3;
      const b0 = a - 0.14;
      const b1 = a + 0.14;
      spikes += litPath(`M${at(r - 1, b0)}L${at(r + r * 0.22, a)}L${at(r - 1, b1)}Z`, metalOf(t).light, { shadow: 1, light: 0.5, outline: 2.2 });
    }
  }
  const studs: [number, number][] = [];
  if (t.tier >= 3) for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6 + Math.PI / 12; studs.push([f(x + Math.cos(a) * r * 0.86), f(y + Math.sin(a) * r * 0.86)]); }
  const tyre = t.tier >= 5 ? `<path d="${circ(x, y, r - 1.2)}" fill="none" stroke="${t.base}" stroke-width="${f(r * 0.12)}"/>` + hl(`M${at(r - 1.2, 3.4)}A${r - 1.2} ${r - 1.2} 0 0 1 ${at(r - 1.2, 4.5)}`, t.light, 1.6, 0.9) : '';
  const hubCol = t.tier >= 4 ? t.base : IRON;
  return (
    `<defs>${rimG.def}</defs>` +
    spikes +
    `<path d="${circ(x, y, r)}" fill="${rimG.url}" stroke="none"/>` +
    hl(joints, INK, 2.2) +
    tyre +
    litPath(circ(x, y, inner), STONEL, { shadow: f(r * 0.12), light: f(r * 0.05), outline: 2.6 }) +
    hl(`M${x} ${f(y - inner + 3)}V${f(y + inner - 3)}M${f(x - inner + 3)} ${y}H${f(x + inner - 3)}`, STONED, f(r * 0.15)) +
    (studs.length ? rivets(studs, f(r * 0.07), t.light, INK) : '') +
    (t.tier >= 7 ? cheeseWheel(x, y, f(r * 0.3), t.light) : litBall(x, y, f(r * 0.27), hubCol, 2.6) + c(x, y, f(r * 0.08), INK)) +
    `<path d="${circ(x, y, r)}" fill="none" stroke="${INK}" stroke-width="3.2"/>`
  );
}

/** Rolling Wheel: a stone wheel waiting in a cradle; spare wheels stack up behind it from tier 4. */
export function wheelFigure(t: Trim): string {
  const r = 33 + t.tier * 0.9;
  const spare = t.tier >= 4 ? stoneWheel(24, 74, 15, t) : '';
  const spare2 = t.tier >= 6 ? stoneWheel(100, 74, 15, t) : '';
  return (
    spare + spare2 +
    tubeFast('M40 96L56 62M84 96L68 62', 7, WOODD, { outline: 2.6 }) +
    litPath('M98 88L116 96V104L98 98Z', WOOD, { shadow: 2, light: 1 }) +
    shelf(90, t, 22, 80) +
    drape(101, 30, 64, t) +
    litRect(48, 58, 28, 10, metalOf(t).base, 3, METAL(metalOf(t))) +
    stoneWheel(62, 88 - r, r, t)
  );
}

/** Fondue Forks: long forks bundled in a hooped bucket, prongs up and out; more forks per tier. */
export function forksFigure(t: Trim): string {
  const prong = t.tier >= 6 ? t.base : IRONL;
  const prongL = t.tier >= 6 ? t.light : '#e2e6ea';
  const fork = (x0: number, y0: number, x1: number, y1: number, knob: string, w = 4.5) => {
    const deg = f((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90);
    return (
      tubeFast(`M${x0} ${y0}L${x1} ${y1}`, w, IRONL, { outline: 2.8, lightColor: '#d6dbe0' }) +
      `<g transform="translate(${x1} ${y1})rotate(${deg})">` +
      litPath('M-9 0V-14Q-9 -17 -7 -14V-3H-1.5V-17Q0 -20 1.5 -17V-3H7V-14Q9 -17 9 -14V0Q9 6 0 6Q-9 6 -9 0Z', prong, { shadow: 1.5, light: 0.8, lightColor: prongL, outline: 2.6 }) +
      `</g>` +
      litBall(x0 + (x1 - x0) * 0.08, y0 + (y1 - y0) * 0.08, 5.5, knob, 2.8)
    );
  };
  let forks = '';
  if (t.tier >= 5) forks += fork(42, 76, 14, 40, MUST) + fork(78, 76, 108, 42, MUST);
  if (t.tier >= 3) forks += fork(52, 74, 40, 16, RUST) + fork(68, 74, 82, 16, TEAL);
  forks += fork(48, 76, 26, 26, RED) + fork(60, 74, 62, 12 - t.tier, t.tier >= 7 ? MUSTL : TEAL) + fork(72, 76, 96, 28, PLUM);
  const bucket = t.tier >= 4 ? 'M30 66H90L84 102H36Z' : 'M34 68H86L80 102H40Z';
  return (
    shelf(102, t, 24, 72) +
    forks +
    litPath(bucket, t.tier >= 7 ? RED : WOOD, { shadow: 4, light: 1.6 }) +
    (t.tier >= 7 ? '' : grain(38, 70, 82, 100, WOODD, 9, 4, true, 0.5)) +
    litPath(t.tier >= 4 ? 'M29 64H91V71H29Z' : 'M33 66H87V73H33Z', WOODL, { shadow: 2, light: 1 }) +
    band(t.tier >= 4 ? 33 : 37, 78, t.tier >= 4 ? 54 : 46, 7, t) +
    band(t.tier >= 4 ? 35 : 40, 92, t.tier >= 4 ? 50 : 40, 7, t) +
    (t.tier >= 5 ? cheeseWheel(60, 86, 4.5, t.light) : '') +
    (t.tier >= 6 ? gem(42, 85.5, SAPPHIRE, 3) + gem(78, 85.5, RED, 3) : '')
  );
}

/** Stomper: a winch beam lowers a carved stone weight; bands, spikes and a carved face grow per tier. */
export function stomperFigure(t: Trim): string {
  const m = metalOf(t);
  const links = (y0: number, y1: number) => {
    let flat = '';
    let ring = '';
    for (let y = y0, i = 0; y < y1; y += 10, i++) {
      if (i % 2) flat += `M60 ${y}v6`;
      else ring += `M57 ${y}a3 4 0 1 0 6 0a3 4 0 1 0 -6 0`;
    }
    return l(flat, 7) + hl(flat, m.light, 3.5) + `<path d="${ring}" fill="none" stroke="${INK}" stroke-width="5.5"/>` + hl(ring, m.light, 2.2);
  };
  const wide = t.tier >= 5 ? 6 : 0;
  const weight = `M${30 - wide} 56H${90 + wide}L${100 + wide} 100Q${100 + wide} 108 ${92 + wide} 108H${28 - wide}Q${20 - wide} 108 ${20 - wide} 100Z`;
  let spikes = '';
  const nSp = t.tier >= 3 ? (t.tier >= 5 ? 5 : 3) : 0;
  for (let i = 0; i < nSp; i++) {
    const x = 30 + ((60 - (nSp === 3 ? 0 : 0)) * i) / Math.max(1, nSp - 1);
    spikes += litPath(`M${f(x - 4)} 108l4 ${t.tier >= 6 ? 10 : 7} 4 -${t.tier >= 6 ? 10 : 7}Z`, m.light, { shadow: 1.2, light: 0.6, outline: 2.4 });
  }
  return (
    litRect(10, 8, 100, 15, WOOD, 3, { shadow: 3.5, light: 1.5 }) +
    grain(14, 10, 106, 21, WOODD, 17, 2, false, 0.6) +
    litRect(20, 4, 11, 23, t.base, 2, METAL(t)) +
    litRect(89, 4, 11, 23, t.base, 2, METAL(t)) +
    rivets([[25.5, 10], [25.5, 21], [94.5, 10], [94.5, 21]], 1.8, rivetCol(t), '#1d2024') +
    litRect(36, 24, 48, 20, WOODD, 6, { shadow: 4, light: 1.6 }) +
    hl('M44 26Q46 34 44 42M52 26Q54 34 52 42M60 26Q62 34 60 42M68 26Q70 34 68 42M76 26Q78 34 76 42', '#c9a66a', 2.2, 0.85) +
    litBall(36, 34, 7, m.light, 3.2) +
    tubeFast('M36 34L22 46', 4, m.base, { outline: 2.5, lightColor: m.light }) +
    litBall(21, 47, 4.5, t.tier >= 3 ? t.light : MUSTL, 3) +
    links(44, 54) +
    spikes +
    litPath(weight, t.tier >= 7 ? STONEL : STONED, { shadow: 5, light: 2, lightColor: STONEL }) +
    n(`M${33 - wide} 60H45L36 104H${27 - wide}Z`, STONE, 0.9) +
    band(25 - wide, 64, 70 + wide * 2, 9, t) +
    band(21 - wide, 94, 78 + wide * 2, 9, t) +
    // From tier 4 a carved mountain face on the stone, from 6 with gem eyes.
    (t.tier >= 4
      ? hl('M40 88L52 76L58 82L66 72L80 88', tone(STONED, -0.45), 2.4) + hl('M48 80L52 76L56 80M62 76L66 72L70 76', CREAM, 1.8, 0.8)
      : hl('M52 80L49 88M72 82L76 90', INK, 1.6, 0.4)) +
    (t.tier >= 6 ? gem(44, 82, RED, 3) + gem(76, 82, SAPPHIRE, 3) : '') +
    (t.tier >= 7 ? cheeseWheel(60, 98.5, 4, t.light) : '')
  );
}

/** Comet: a little stone shrine holding a burning comet stone; roof, pillars and stars grow per tier. */
export function cometFigure(t: Trim): string {
  const inside = radial([[0, '#3a2a45'], [1, '#1d1626']], 0.5, 0.3, 0.8);
  const roofD = t.tier >= 4 ? 'M18 48L60 10L102 48Q60 40 18 48Z' : 'M24 46L60 14L96 46Q60 38 24 46Z';
  const roofCol = t.tier >= 7 ? RED : RUST;
  const comet = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y})scale(${s})">` +
    litPath('M-8 -14C-20 -4 -18 10 -6 14C6 20 20 14 22 0C22 -10 18 -16 30 -30C16 -24 14 -30 8 -22C2 -28 0 -18 -8 -14Z', RUST, { shadow: 3, light: 1.2, lightColor: '#ff9a6a' }) +
    litPath('M0 -8C-6 -2 -6 8 2 12C12 14 18 6 16 -2C14 -8 14 -12 22 -20C14 -16 12 -20 8 -14C4 -16 4 -10 0 -8Z', MUST, { shadow: 0, light: 0, outline: 2 }) +
    litBall(0, 2, 11, PLUM, 3) +
    hl('M-6 5L-1 2L-3 -3M-1 2L5 1', MUSTL, 2) +
    `</g>`;
  return (
    litRect(14, 92, 92, 12, STONE, 3, { shadow: 3, light: 1.4, lightColor: STONEL }) +
    drape(102, 20, 80, t) +
    litRect(38, 46, 44, 46, '#2a1f35', 2, { shadow: 0, light: 0, outline: 3 }) +
    `<path d="M38 46H82V92H38Z" fill="${inside.url}" stroke="none"/>` +
    litRect(26, 44, 12, 50, t.tier >= 5 ? CREAM : STONEL, 2, { shadow: 3, light: 1.2 }) +
    litRect(82, 44, 12, 50, t.tier >= 5 ? CREAM : STONEL, 2, { shadow: 3, light: 1.2 }) +
    (t.tier >= 2 ? band(24, 44, 16, 6, t) + band(80, 44, 16, 6, t) + band(24, 86, 16, 6, t) + band(80, 86, 16, 6, t) : '') +
    litPath(roofD, roofCol, { shadow: 3.5, light: 1.5 }) +
    within(roofD, hl('M30 46L60 24L90 46M40 48L60 34L80 48', tone(roofCol, -0.3), 1.2, 0.7)) +
    (t.tier >= 3 ? hl(t.tier >= 4 ? 'M18 48L60 10L102 48' : 'M24 46L60 14L96 46', t.base, 3) : '') +
    litBall(60, t.tier >= 4 ? 8 : 11, 4.5 + (t.tier >= 4 ? 1 : 0), t.tier >= 3 ? t.light : MUSTL, 3) +
    (t.tier >= 6 ? gem(60, 30, SAPPHIRE, 3.4) : '') +
    comet(60, 72, 0.9 + t.tier * 0.03) +
    (t.tier >= 5 ? comet(30, 26, 0.42) : '') +
    (t.tier >= 7 ? comet(94, 24, 0.42) : '') +
    hl('M16 34l5 5M104 34l-5 5', MUSTL, 2.5)
  );
}

/** Dragon Bellows: leather bellows with a dragon head; horns, crest, a bigger flame and gem eyes per tier. */
export function bellowsFigure(t: Trim): string {
  const leather = '#8a5a3a';
  const head = t.tier >= 7 ? '#2f7f5a' : RUST;
  const headD = t.tier >= 7 ? '#1f5a3e' : RUSTD;
  const upper = 'M56 42Q68 28 88 30Q104 30 116 44Q120 54 112 56L96 52L72 62Z';
  const lower = 'M60 72Q74 80 100 76Q112 74 114 66L96 60L74 64Z';
  const fl = 1 + t.tier * 0.08;
  let crest = '';
  if (t.tier >= 5) for (const x of [70, 80, 90]) crest += litPath(`M${x - 4} ${x === 70 ? 38 : 33}L${x} ${x === 70 ? 26 : 22}L${x + 4} ${x === 70 ? 36 : 31}Z`, t.base, { ...METAL(t), outline: 2.2 });
  return (
    tubeFast('M52 88V72', 8, WOODD, { outline: 2.6 }) +
    shelf(92, t, 18, 80) +
    drape(103, 24, 68, t) +
    litPath('M8 30H56L62 46V66L56 82H8Q2 56 8 30Z', leather, { shadow: 4, light: 1.6 }) +
    hl('M20 32V80M34 32V80M46 34V78', INK, 2.2, 0.75) +
    hl('M22 32V80M36 32V80M48 34V78', tone(leather, 0.35), 1, 0.6) +
    litRect(4, 26, 8, 60, WOODD, 2, { shadow: 2.5, light: 1 }) +
    (t.tier >= 2 ? band(2, 34, 12, 6, t) + band(2, 72, 12, 6, t) : rivets([[8, 34], [8, 78]], 1.6, IRONL)) +
    // Horns: bone, then the tier's metal.
    litPath('M70 34Q64 14 48 12Q58 22 60 38Z', t.tier >= 3 ? t.base : MUSTL, { shadow: 2.5, light: 1, lightColor: t.tier >= 3 ? t.light : '#fff1c0' }) +
    (t.tier >= 4 ? litPath('M80 31Q80 14 70 6Q74 18 72 32Z', t.base, { ...METAL(t), outline: 2.4 }) : '') +
    crest +
    litPath(lower, headD, { shadow: 2.5, light: 1 }) +
    // Fire in the jaws, bigger with the tier.
    `<g transform="translate(100 60)scale(${f(fl)})">` +
    litPath('M-6 -6Q8 -12 18 -4Q14 0 20 4Q8 10 -6 6Z', '#ff8a3a', { shadow: 0, light: 0, outline: 2 }) +
    n('M-2 -3Q8 -6 13 -2Q10 0 14 2Q6 5 -2 3Z', '#ffe08a') +
    `</g>` +
    litPath(upper, head, { shadow: 4, light: 1.6 }) +
    n('M64 44Q76 34 92 35Q78 40 70 50Z', tone(head, 0.3)) +
    hl('M66 50q4 -3 8 0M76 46q4 -3 8 0M70 56q4 -3 8 0M86 52q4 -3 8 0', tone(head, -0.35), 1.2, 0.7) +
    c(84, 42, 6, MUSTL) +
    (t.tier >= 6 ? gem(85, 42, RED, 3.4) : c(85, 42, 2.4, INK) + glint(82, 40, 1)) +
    hl('M76 36L92 33', INK, 3) +
    p('M100 53l3 7 3-5ZM108 55l3 6 2-5Z', CREAM) +
    p('M88 73l3-7 3 6ZM98 74l3-7 3 5Z', CREAM) +
    `<g stroke-width="1.6">${c(116, 38, 3, MUSTL)}${c(114, 80, 2.5, '#ff9a30')}${t.tier >= 4 ? c(118, 68, 2, GOLDL) + c(108, 30, 1.8, '#ff9a30') : ''}</g>` +
    (t.tier >= 7 ? `<g stroke="none">${c(112, 24, 2.2, WHITE)}${c(118, 90, 1.8, MUSTL)}</g>` : '')
  );
}
