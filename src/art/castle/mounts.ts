/**
 * Weapons mounted on the keep, each loaded and empty: bolter, mortar, frost, bellows, stomper, shrine and wheel ramp.
 * They are drawn on a 120x120 grid centred on their slot; index.ts adds the cast shadow.
 */
import { INK, RUST, RUSTD, MUST, MUSTL, CREAM, PLUM, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL, GLOW, WHITE, ink, r, c, p, l, n, hl, litPath, litRect, litBall, rivets, grain, tubeFast as litTube } from '../draw';
import { tone, linear as lin, radial as rad, glint } from '../shade';
import { rand, fx, clip, litTubeBeam, radial, rim } from './kit';

// ---------------------------------------------------------------------------------------------
// Mounted weapons, 120x120 art centred on their slots
// ---------------------------------------------------------------------------------------------

const haloDefs = (id: string, col: string, inner: number) => `<defs>${radial(id, [[0, col, inner], [0.5, col, inner * 0.45], [1, col, 0]])}</defs>`;

/** Shading options for small iron parts. */
const IRONO = { shadow: 2.5, light: 1, lightColor: IRONL } as const;

/** Timber plank bolted to the wall, with two iron straps. */
function plank(y: number): string {
  return (
    litRect(26, y, 68, 11, WOOD, 3, { shadow: 3, light: 1.4 }) +
    grain(29, y + 2, 91, y + 9, WOODD, y, 2, false, 0.6) +
    litRect(38, y - 4, 9, 19, IRON, 2, IRONO) +
    litRect(73, y - 4, 9, 19, IRON, 2, IRONO) +
    rivets([[42.5, y], [42.5, y + 11], [77.5, y], [77.5, y + 11]], 1.8, '#5a5f66', '#1d2024')
  );
}

export function bolter(ready: boolean): string {
  const stringD = ready ? 'M72 12L38 49L72 86' : 'M72 12Q84 34 80 50Q74 66 72 86';
  const limb = 'M72 12Q102 48 72 86';
  const stock = 'M26 44H96Q102 49 96 55H26Q22 49 26 44Z';
  const wood = ready ? WOOD : '#7f5b37';
  return ink(
    litTubeBeam('M58 100V58', WOODD, 8) +
      plank(102) +
      litBall(58, 58, 8, IRONL, 3.5) +
      litPath(stock, wood, { shadow: 3, light: 1.4 }) +
      grain(30, 46, 94, 53, tone(wood, -0.42), 7, 2, false, 0.6) +
      hl('M32 47H90', ready ? WOODL : '#9a7a53', 1.4, 0.8) +
      litTube(limb, 6.5, ready ? WOODL : '#8c6b45', { outline: 2.75 }) +
      hl('M76 22Q90 40 88 50', ready ? '#ecc48c' : '#a88a62', 1, 0.7) +
      litRect(66, 6, 12, 12, IRON, 3, IRONO) +
      litRect(66, 80, 12, 12, IRON, 3, IRONO) +
      glint(69.5, 9.5, 1) +
      glint(69.5, 83.5, 1) +
      (ready ? hl(stringD, INK, 5) + hl(stringD, CREAM, 2.5) : hl(stringD, INK, 4.5) + hl(stringD, '#8f8672', 2)) +
      (ready
        ? litRect(34, 45, 68, 8, WOODL, 2, { shadow: 2.2, light: 1 }) +
          litPath('M102 40L119 49L102 58Z', IRONL, { shadow: 2.5, light: 1, lightColor: '#d6dbe0' }) +
          hl('M104 44L114 49', WHITE, 1.6) +
          glint(106, 45, 1) +
          litPath('M44 41L32 49L44 57Z', RUST, { shadow: 2, light: 1 }) +
          hl('M41 44L36 49M41 54L36 49', RUSTD, 1, 0.8)
        : hl('M42 49H70', INK, 2.5, 0.5)),
  );
}

export function mortar(ready: boolean): string {
  const metal = ready ? IRON : '#5d6066';
  const light = ready ? IRONL : '#8a8d92';
  const defs = ready ? haloDefs('h', '#ff9a30', 0.9) : '';
  const barrel = 'M36 92L30 40Q30 30 60 30Q90 30 90 40L84 92Q60 100 36 92Z';
  const iron = lin([[0, tone(metal, 0.28)], [0.45, metal], [1, tone(metal, -0.5)]], 0);
  const wheel = (x: number) =>
    litPath(`M${x - 9} 96a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z`, WOODD, { shadow: 2.5, light: 1.2 }) +
    hl(`M${x - 6} 96H${x + 6}M${x} 90V102`, tone(WOODD, -0.35), 1.6, 0.8) +
    rivets([[x, 96]], 2.6, IRON);
  return (
    defs +
    `<defs>${iron.def}</defs>` +
    ink(
      (ready ? `<ellipse cx="74" cy="34" rx="32" ry="28" fill="url(#h)" stroke="none"/>` : '') +
        litPath('M16 76H104L110 96H10Z', WOOD, { shadow: 3.5, light: 1.6 }) +
        grain(20, 79, 104, 93, WOODD, 13, 2, false, 0.55) +
        hl('M18 80H102', WOODL, 1.6, 0.8) +
        wheel(30) +
        wheel(90) +
        `<g transform="rotate(-38 60 62)">` +
        `<path d="${barrel}" fill="${iron.url}"/>` +
        hl('M38 84L34 42', light, 2.5, 0.9) +
        hl('M44 60h3M70 74h4M52 82h3', tone(metal, -0.45), 1.3, 0.6) +
        glint(37, 50, 1.4) +
        litPath('M24 40Q60 22 96 40Q96 48 90 48Q60 38 30 48Q24 48 24 40Z', light, { shadow: 2.5, light: 1.2, lightColor: '#d6dbe0' }) +
        litRect(30, 66, 60, 8, RUST, 2, { shadow: 2.5, light: 1 }) +
        rivets([[40, 70], [60, 70], [80, 70]], 1.6, MUSTL) +
        (ready
          ? `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#ffb347" stroke-width="2.5"/><ellipse cx="60" cy="35" rx="16" ry="4.5" fill="#fff0bd" stroke="none"/>`
          : `<ellipse cx="60" cy="35" rx="29" ry="9" fill="#2d2a2a" stroke-width="2.5"/><ellipse cx="62" cy="37" rx="20" ry="5" fill="#141212" stroke="none"/>`) +
        `</g>` +
        plank(101) +
        (ready
          ? `<g stroke-width="1.6">${c(92, 18, 3.5, MUSTL)}${c(104, 30, 2.5, '#ff9a30')}${c(78, 10, 2.5, '#ff9a30')}</g>` + glint(91, 17, 0.9)
          : puffs([[88, 18, 8], [100, 12, 6], [76, 10, 5]])),
    )
  );
}

export function frost(ready: boolean): string {
  const horn = ready ? CREAM : '#b8ad93';
  const band = ready ? MUST : '#8a7b55';
  const defs = ready ? haloDefs('h', GLOW, 0.95) : '';
  const hornD = 'M8 26C24 60 56 78 104 78L110 34C80 40 40 36 8 26Z';
  // Growth rings across the horn, darker towards its shaded underside.
  const rings = 'M24 31Q30 50 44 62M60 38Q64 56 72 74M88 38Q90 56 94 77M100 36Q101 56 103 78';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="92" cy="56" rx="28" ry="42" fill="url(#h)" stroke="none"/>` : '') +
        litTubeBeam('M60 88V70', WOODD, 8) +
        plank(92) +
        litPath(hornD, horn, { shadow: 5, light: 2, shadowK: -0.3 }) +
        clip(hornD, hl(rings, tone(horn, -0.3), 1.4, 0.7)) +
        hl('M18 38C36 58 64 70 100 70', ready ? WHITE : '#d0c7ae', 2.5, 0.75) +
        litPath('M40 46L58 54L54 76L34 66Z', band, { shadow: 2.5, light: 1.2, lightColor: '#ffe39a' }) +
        litPath('M72 50L88 50L88 77L72 76Z', band, { shadow: 2.5, light: 1.2, lightColor: '#ffe39a' }) +
        (ready ? glint(43, 52, 1.1) + glint(75, 54, 1.1) : '') +
        (ready
          ? `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#c8faf2" stroke-width="3"/><ellipse cx="108" cy="56" rx="4" ry="15" fill="${WHITE}" stroke="none"/>`
          : `<ellipse cx="107" cy="56" rx="9" ry="23" fill="#3b4250" stroke-width="3"/><ellipse cx="109" cy="58" rx="5" ry="15" fill="#22262e" stroke="none"/>`) +
        (ready
          ? hl('M100 10v18M92 15l16 9M108 15l-16 9', INK, 5) +
            hl('M100 10v18M92 15l16 9M108 15l-16 9', GLOW, 2.5) +
            hl('M114 88v10M109 91l10 5M119 91l-10 5', INK, 3.5) +
            hl('M114 88v10M109 91l10 5M119 91l-10 5', GLOW, 1.8)
          : ''),
    )
  );
}

/** Cold grey smoke, as soft round puffs. */
function puffs(list: [number, number, number][]): string {
  return list.map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="#b9b6ae" stroke="none" opacity=".55"/>`).join('');
}

export function bellows(ready: boolean): string {
  const leather = ready ? '#8a5a3a' : '#6f5140';
  const head = ready ? RUST : '#7d4e3f';
  const headD = ready ? RUSTD : '#5e3a30';
  const defs = ready ? haloDefs('h', '#ff8a2a', 0.95) : '';
  const upper = 'M56 42Q68 28 88 30Q104 30 116 44Q120 54 112 56L96 52L72 62Z';
  const lower = 'M60 72Q74 80 100 76Q112 74 114 66L96 60L74 64Z';
  const body = ready ? 'M8 30H56L62 46V66L56 82H8Q2 56 8 30Z' : 'M8 46H56L62 52V62L56 72H8Q4 58 8 46Z';
  const scales = 'M66 50q4 -3 8 0M76 46q4 -3 8 0M70 56q4 -3 8 0M86 52q4 -3 8 0';
  return (
    defs +
    ink(
      (ready ? `<ellipse cx="94" cy="58" rx="26" ry="30" fill="url(#h)" stroke="none"/>` : '') +
        litTubeBeam('M52 88V72', WOODD, 8) +
        plank(92) +
        // Bellows body: leather pleats between two boards.
        litPath(body, leather, { shadow: 4, light: 1.6 }) +
        hl(ready ? 'M20 32V80M34 32V80M46 34V78' : 'M20 47V71M34 47V71M46 48V70', INK, 2.2, 0.75) +
        hl(ready ? 'M22 32V80M36 32V80M48 34V78' : 'M22 47V71M36 47V71M48 48V70', tone(leather, 0.35), 1, 0.6) +
        litRect(4, ready ? 26 : 42, 8, ready ? 60 : 34, WOODD, 2, { shadow: 2.5, light: 1 }) +
        rivets(ready ? [[8, 34], [8, 78]] : [[8, 48], [8, 70]], 1.6, IRONL) +
        // Dragon head pointing right.
        litPath('M70 34Q64 14 48 12Q58 22 60 38Z', ready ? MUSTL : '#a89a72', { shadow: 2.5, light: 1, lightColor: '#fff1c0' }) +
        litPath(lower, headD, { shadow: 2.5, light: 1 }) +
        (ready
          ? `<ellipse cx="96" cy="60" rx="16" ry="7" fill="#ffcf6b" stroke-width="2"/><ellipse cx="96" cy="60" rx="8" ry="3" fill="#fff0bd" stroke="none"/>`
          : `<ellipse cx="96" cy="60" rx="16" ry="6" fill="#231d1d" stroke-width="2"/>`) +
        litPath(upper, head, { shadow: 4, light: 1.6 }) +
        n('M64 44Q76 34 92 35Q78 40 70 50Z', ready ? '#d97a52' : '#96624f') +
        hl(scales, tone(head, -0.35), 1.2, 0.7) +
        c(84, 42, 6, ready ? MUSTL : '#c9c1aa') +
        c(85, 42, 2.4, INK) +
        glint(82, 40, 1) +
        hl('M76 36L92 33', INK, 3) +
        hl('M109 42h.01', INK, 3.5) +
        p('M100 53l3 7 3-5ZM108 55l3 6 2-5Z', CREAM) +
        p('M88 73l3-7 3 6ZM98 74l3-7 3 5Z', CREAM) +
        (ready ? `<g stroke-width="1.6">${c(114, 40, 3, MUSTL)}${c(112, 78, 2.5, '#ff9a30')}${c(118, 70, 2, MUSTL)}</g>` : puffs([[112, 38, 6], [104, 30, 4]])),
    )
  );
}

export function stomper(ready: boolean): string {
  const chainY = ready ? 54 : 84;
  const links = (y0: number, y1: number) => {
    let flat = '';
    let ring = '';
    for (let y = y0, i = 0; y < y1; y += 12, i++) {
      if (i % 2) flat += `M60 ${y}v7`;
      else ring += `M57 ${y}a3 4.5 0 1 0 6 0a3 4.5 0 1 0 -6 0`;
    }
    return l(flat, 7) + hl(flat, IRONL, 3.5) + hl(flat.replace(/M60/g, 'M59'), '#d6dbe0', 1, 0.7) + `<path d="${ring}" fill="none" stroke="${INK}" stroke-width="5.5"/>` + hl(ring, IRONL, 2.2);
  };
  const weight = 'M30 58H90L100 104Q100 112 92 112H28Q20 112 20 104Z';
  const hookD = `M60 ${chainY}C72 ${chainY + 2} 72 ${chainY + 18} 60 ${chainY + 18}C52 ${chainY + 18} 49 ${chainY + 12} 50 ${chainY + 9}`;
  return ink(
    litRect(10, 8, 100, 15, WOOD, 3, { shadow: 3.5, light: 1.5 }) +
      grain(14, 10, 106, 21, WOODD, 17, 2, false, 0.6) +
      litRect(20, 4, 11, 23, IRON, 2, IRONO) +
      litRect(89, 4, 11, 23, IRON, 2, IRONO) +
      rivets([[25.5, 10], [25.5, 21], [94.5, 10], [94.5, 21]], 1.8, '#5a5f66', '#1d2024') +
      // Winch drum with rope wound round it, and its crank.
      litRect(36, 24, 48, 22, WOODD, 6, { shadow: 4, light: 1.6 }) +
      hl('M44 26Q46 35 44 44M52 26Q54 35 52 44M60 26Q62 35 60 44M68 26Q70 35 68 44M76 26Q78 35 76 44', '#c9a66a', 2.2, 0.85) +
      hl('M44 26Q46 35 44 44M60 26Q62 35 60 44M76 26Q78 35 76 44', '#7f6230', 0.9, 0.7) +
      litBall(36, 35, 7, IRONL, 3.5) +
      litTube('M36 35L22 48', 4, IRON, { outline: 2.5, lightColor: IRONL }) +
      litBall(21, 49, 4.5, MUSTL, 3) +
      links(44, chainY) +
      (ready
        ? l('M52 56a8 8 0 1 1 16 0', 9) +
          hl('M52 56a8 8 0 1 1 16 0', IRONL, 4) +
          litPath(weight, STONED, { shadow: 5, light: 2, lightColor: STONEL }) +
          n('M33 62H45L36 108H27Z', STONE, 0.9) +
          hl('M52 76L49 88M72 84L76 92M84 64l-4 6', INK, 1.6, 0.4) +
          n('M90 58l-6 0 5 6Z', tone(STONED, -0.4)) +
          litRect(25, 68, 70, 10, IRON, 2, IRONO) +
          hl('M29 71H91', '#a9b0b8', 1.2, 0.8) +
          litRect(21, 96, 78, 10, IRON, 2, IRONO) +
          hl('M25 99H95', '#a9b0b8', 1.2, 0.8) +
          rivets([[34, 73], [60, 73], [86, 73], [30, 101], [60, 101], [90, 101]], 2.2, '#5a5f66', '#1d2024') +
          litPath('M34 112l4 7 4-7ZM54 112l4 7 4-7ZM76 112l4 7 4-7Z', IRON, { shadow: 1.2, light: 0.6, lightColor: IRONL })
        : l(hookD, 9) + hl(hookD, IRONL, 4) + hl(`M62 ${chainY + 2}C69 ${chainY + 4} 69 ${chainY + 12} 64 ${chainY + 15}`, '#d6dbe0', 1.2, 0.8)),
  );
}

export function shrine(ready: boolean): string {
  const col = ready ? STONEL : '#928c7c';
  const roof = ready ? RUST : '#73493a';
  const defs = ready ? haloDefs('h', '#ffb347', 0.95) : '';
  const inside = lin(ready ? [[0, '#241a30'], [1, '#3a2a45']] : [[0, '#17151c'], [1, '#2a2730']], 90);
  const roofD = 'M24 46L60 14L96 46Q60 38 24 46Z';
  return (
    defs +
    `<defs>${inside.def}</defs>` +
    ink(
      (ready ? `<circle cx="60" cy="64" r="46" fill="url(#h)" stroke="none"/>` : '') +
        litRect(14, 92, 92, 12, STONE, 3, { shadow: 3, light: 1.4, lightColor: STONEL }) +
        hl('M20 95.5H100', STONEL, 1.6, 0.9) +
        n('M100 92l-5 0 5 4Z', STONED) +
        r(38, 46, 44, 46, inside.url, 2) +
        litRect(26, 44, 12, 50, col, 2, { shadow: 3, light: 1.2 }) +
        litRect(82, 44, 12, 50, col, 2, { shadow: 3, light: 1.2 }) +
        hl('M30 50V88M86 50V88', tone(col, -0.25), 1.2, 0.8) +
        litPath(roofD, roof, { shadow: 3.5, light: 1.5 }) +
        clip(roofD, hl('M34 44L60 24L86 44M42 46L60 32L78 46', tone(roof, -0.3), 1.2, 0.7)) +
        hl('M34 42L60 22', ready ? '#e08a60' : '#90604e', 2) +
        litBall(60, 11, 4.5, ready ? MUSTL : '#b9a97a', 3) +
        (ready
          ? litPath('M50 56C38 66 40 80 52 84C64 90 78 84 80 70C80 60 76 54 88 40C74 46 72 40 66 48C60 42 58 52 50 56Z', RUST, { shadow: 3, light: 1.2, lightColor: '#ff9a6a' }) +
            `<g stroke-width="2">${p('M58 62C52 68 52 78 60 82C70 84 76 76 74 68C72 62 72 58 80 50C72 54 70 50 66 56C62 54 62 60 58 62Z', MUST)}</g>` +
            n('M62 66C58 72 60 78 64 80C70 80 72 74 70 70Z', '#fff0bd', 0.85) +
            litBall(58, 72, 11, PLUM, 3) +
            n('M51 69a8 8 0 0 1 8-6l-1 3a5 5 0 0 0-5 4Z', '#b98aa8') +
            hl('M52 75L57 72L55 67M57 72L63 71', MUSTL, 2) +
            hl('M18 34l5 5M100 34l-5 5M60 2v4', MUSTL, 2.5)
          : `<ellipse cx="60" cy="86" rx="16" ry="5" fill="#4a4a4a" stroke-width="2"/>` +
            hl('M46 60q10-8 20 0', '#5a5a64', 2, 0.5) +
            hl('M56 76h6M50 80h4', '#5a5a64', 2, 0.5)),
    )
  );
}

/** Wheel centre: art (64, 52), i.e. offset (+4, -8) from the centre of the 120x120 art. */
export function wheelRamp(ready: boolean): string {
  const cx = 64;
  const cy = 52;
  return ink(
    // Wall brace, cradle legs and base plank with a short rolling lip.
    litRect(16, 58, 9, 22, IRON, 2, IRONO) +
      rivets([[20.5, 63], [20.5, 75]], 1.8, '#5a5f66', '#1d2024') +
      litTubeBeam('M24 69H56', WOOD, 6) +
      litTubeBeam('M42 92L60 56', WOODD, 8) +
      litTubeBeam('M88 92L68 56', WOODD, 8) +
      litPath('M100 86L117 96V104L100 98Z', WOOD, { shadow: 2, light: 1 }) +
      litRect(28, 86, 76, 12, WOOD, 3, { shadow: 3, light: 1.4 }) +
      grain(31, 88, 101, 96, WOODD, 23, 2, false, 0.6) +
      litRect(38, 82, 9, 20, IRON, 2, IRONO) +
      litRect(83, 82, 9, 20, IRON, 2, IRONO) +
      rivets([[42.5, 86], [42.5, 98], [87.5, 86], [87.5, 98]], 1.8, '#5a5f66', '#1d2024') +
      // The axle itself, with its iron cap; the waiting wheel sits on it.
      litRect(cx - 13, cy - 5, 26, 10, IRON, 3, IRONO) +
      (ready
        ? `<g transform="translate(${cx} ${cy})scale(${fx(30 / 46)})translate(-50 -50)">${stoneWheel()}</g>`
        : litBall(cx, cy, 8, IRONL, 3.5) + c(cx, cy, 3, INK)),
  );
}

/**
 * The same stone wheel as the rolling `wheel` projectile in props/projectiles.ts (100x100, radius 46), so the
 * wheel that rolls out looks like the one waiting on the wall. Outlines are a little heavier,
 * because the mount draws it at about two thirds of the size.
 */
function stoneWheel(): string {
  const R = rand(7);
  const at = (rr: number, a: number) => `${fx(50 + Math.cos(a) * rr)} ${fx(50 + Math.sin(a) * rr)}`;
  const arc = (rr: number, a0: number, a1: number) => `M${at(rr, a0)}A${rr} ${rr} 0 0 1 ${at(rr, a1)}`;
  const circ = (rr: number) => `M${50 - rr} 50a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`;
  const rim = rad([[0, STONEL], [0.6, STONE], [1, STONED]], 0.4, 0.38, 0.66);
  const disc = rad([[0, '#d6d0bc'], [0.7, STONEL], [1, STONE]], 0.42, 0.4, 0.62);
  const hub = rad([[0, '#959ba2'], [0.55, IRON], [1, '#2c2f34']], 0.36, 0.34, 0.7);
  let blocks = '';
  let joints = '';
  for (let i = 0; i < 12; i++) {
    const a0 = (i * Math.PI) / 6;
    const a1 = a0 + Math.PI / 6;
    joints += `M${at(33, a0)}L${at(46, a0)}`;
    const k = R() - 0.5;
    blocks += n(`M${at(46, a0)}A46 46 0 0 1 ${at(46, a1)}L${at(33, a1)}A33 33 0 0 0 ${at(33, a0)}Z`, k < 0 ? STONED : STONEL, fx(Math.abs(k) * 0.5 + 0.05));
    const pa = a0 + 0.18 + R() * 0.17;
    const pr = 37 + R() * 5;
    const px = 50 + Math.cos(pa) * pr;
    const py = 50 + Math.sin(pa) * pr;
    blocks +=
      `<circle cx="${fx(px + 0.7)}" cy="${fx(py + 0.7)}" r="1.8" fill="${CREAM}" stroke="none" opacity=".45"/>` +
      `<circle cx="${fx(px)}" cy="${fx(py)}" r="${fx(1.4 + R() * 0.8)}" fill="#5f5a50" stroke="none" opacity=".75"/>` +
      hl(arc(43.4, a0 + 0.08, a0 + 0.3 + R() * 0.1), CREAM, 1.8, 0.45);
  }
  let chisel = '';
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2;
    const rr = 15 + R() * 14;
    chisel += `M${at(rr, a)}l${fx(2.5 + R() * 2)} ${fx(1 + R())}`;
  }
  const CROSS = 'M50 19V81M19 50H81';
  const rivet = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2.4" fill="${IRONL}" stroke="${INK}" stroke-width="1.4"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="1" fill="${WHITE}" stroke="none" opacity=".85"/>`;
  return (
    `<defs>${rim.def}${disc.def}${hub.def}</defs>` +
    `<path d="${circ(46)}" fill="${rim.url}" stroke="none"/>` +
    blocks +
    hl(arc(43.5, 3.5, 4.4), WHITE, 2.8, 0.35) +
    hl(joints, INK, 3.4) +
    `<path d="${circ(33)}" fill="${disc.url}" stroke="none"/>` +
    clip(circ(33), hl(chisel, STONED, 1.4, 0.5) + hl(circ(33), STONED, 6, 0.35)) +
    hl(CROSS, STONED, 8) +
    hl(CROSS, '#5c574d', 3.2, 0.85) +
    hl('M53 21V47M53 53V79M21 53H47M53 53H79', CREAM, 1.5, 0.45) +
    `<path d="${circ(33)}" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<path d="${circ(12.5)}" fill="${hub.url}" stroke="${INK}" stroke-width="4"/>` +
    rivet(56, 44) + rivet(56, 56) + rivet(44, 56) + rivet(44, 44) +
    `<circle cx="50" cy="50" r="3.8" fill="${INK}" stroke="none"/>` +
    glint(46.5, 45.5, 1.6, WHITE, 0.7) +
    `<path d="${circ(46)}" fill="none" stroke="${INK}" stroke-width="5.4"/>`
  );
}
