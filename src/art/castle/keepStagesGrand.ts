/**
 * The two highest castle tiers, built on the white-and-gold fortress of tier 5 (`tier4` in keepStages.ts):
 *
 * - Tier 6 (`tier5`), the Gilded Cheese Citadel: gilded roofs, a cheese-wheel dormer, cheese wheels
 *   in the carved panel, alpine flower boxes, gold lanterns at the gate and teal banners.
 * - Tier 7 (`tier6`), the Alpine Crown Fortress: everything of tier 6, plus crowned spires, a tower
 *   gallery, the Alps-and-cheese standard, fire baskets either side of the gate, a cheese crest over
 *   the arch and the plinth grown into a mossy alpine crag.
 *
 * Same coordinates as every stage (art = world + (40, 20)); the weapon places stay where the shared
 * parts in keepParts.ts put them. The top 80 art px hide under the bars on every screen, so the
 * grandeur sits between art y 90 and the road.
 */
import { INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, CREAM, WOODD, WOOD, IRON, RED, WHITE, GOLD, GOLDD, ink, r, p, n, hl, litPath, litRect, litBall, rivets } from '../draw';
import { tone, radial as rad, glint } from '../shade';
import { rand, fx, rect, clip, SHADE_DEFS, form, shade, rock, masonry, spire, flag, banner, merlons, type Win, windowsBody, windowsGlow, vine, moss } from './kit';
import { gateVoid, foundation, footShade, sallyPort, alcove, hoistBay, gateBrow, deck, slotPlates } from './keepParts';
import { MARBLE, GILT, GOLDEN, goldBand, pilaster, goldStuds, archGate } from './keepStages';

// ---------------------------------------------------------------------------------------------
// Small pieces of the two top tiers
// ---------------------------------------------------------------------------------------------

/** A cheese wheel seen face on: rind ring, a paler face, holes with a lit lower lip. */
export function cheeseWheel(cx: number, cy: number, rr: number, seed = 1): string {
  const R = rand(seed);
  const circle = (x: number, y: number, k: number) => `M${fx(x - k)} ${fx(y)}a${fx(k)} ${fx(k)} 0 1 0 ${fx(k * 2)} 0a${fx(k)} ${fx(k)} 0 1 0 ${fx(-k * 2)} 0Z`;
  let holes = '';
  const spots: [number, number, number][] = [[-0.38, -0.25, 0.2], [0.3, -0.35, 0.14], [0.22, 0.3, 0.22], [-0.3, 0.38, 0.12], [0.02, 0.02, 0.1]];
  for (const [dx, dy, k] of spots) {
    const x = cx + dx * rr * (0.9 + R() * 0.2);
    const y = cy + dy * rr * (0.9 + R() * 0.2);
    holes += n(circle(x, y, rr * k), tone(MUST, -0.25)) + hl(`M${fx(x - rr * k * 0.8)} ${fx(y + rr * k * 0.3)}a${fx(rr * k)} ${fx(rr * k * 0.8)} 0 0 0 ${fx(rr * k * 1.6)} 0`, '#fff0b8', 1, 0.8);
  }
  return (
    litPath(circle(cx, cy, rr), GOLD, { outline: 2.8, shadow: 2.5, light: 1.2, lightColor: MUSTL }) +
    litPath(circle(cx, cy, rr * 0.8), MUSTL, { outline: 1.6, shadow: fx(rr * 0.12), light: 1, lightColor: '#fff1c0' }) +
    holes +
    glint(fx(cx - rr * 0.45), fx(cy - rr * 0.5), Math.max(0.8, rr * 0.08))
  );
}

/** An alpine flower box under a window sill: a timber trough with red and cream blooms. */
function flowerBox(x: number, y: number, w: number, seed: number): string {
  const R = rand(seed);
  let leaves = '';
  let blooms = '';
  for (let k = x + 3; k < x + w - 2; k += 5 + R() * 3) {
    leaves += `M${fx(k)} ${y}q${fx(-2 - R() * 2)} -5 ${fx(-1 + R() * 2)} -9`;
    const col = R() < 0.7 ? RED : CREAM;
    blooms += `<circle cx="${fx(k + R() * 2 - 1)}" cy="${fx(y - 6 - R() * 5)}" r="${fx(2.4 + R() * 1.2)}" fill="${col}"/>`;
  }
  return (
    hl(leaves, '#3f6b45', 3.2) +
    `<g stroke-width="1.6">${blooms}</g>` +
    litRect(x, y - 1, w, 9, WOOD, 2, { outline: 2.5, shadow: 2.5, light: 1.2 }) +
    hl(`M${x + 3} ${y + 3.5}H${x + w - 3}`, WOODD, 1.2, 0.7)
  );
}

/** A gold lantern hanging from a wall bracket. */
function lantern(x: number, y: number): string {
  return (
    litRect(x - 1, y - 14, 14, 4, GOLDEN, 1.5, { outline: 2.5, shadow: 1.5, light: 0.8 }) +
    hl(`M${x} ${y - 10}V${y - 2}`, INK, 2) +
    litPath(`M${x - 7} ${y - 2}H${x + 7}L${x + 5} ${y + 18}H${x - 5}Z`, MUSTL, { outline: 2.6, shadow: 2.5, light: 1, lightColor: '#fff3c0' }) +
    hl(`M${x} ${y}V${y + 16}M${x - 6} ${y + 8}H${x + 6}`, GOLDD, 1.4, 0.9) +
    litPath(`M${x - 8} ${y - 2}L${x} ${y - 9}L${x + 8} ${y - 2}Z`, GOLDEN, { outline: 2.4, shadow: 1.5, light: 0.8 }) +
    litBall(x, y + 21, 2.6, GOLDEN, 2) +
    glint(x - 3, y + 2, 1)
  );
}

/** A tall fire basket of gilded iron, with flames. Its night glow is part of the window glow. */
function brazier(x: number, y: number): string {
  const flame = `M${x - 11} ${y}Q${x - 14} ${y - 14} ${x - 5} ${y - 22}Q${x - 6} ${y - 12} ${x} ${y - 30}Q${x + 6} ${y - 14} ${x + 8} ${y - 22}Q${x + 15} ${y - 10} ${x + 11} ${y}Z`;
  const core = `M${x - 6} ${y}Q${x - 7} ${y - 9} ${x - 1} ${y - 15}Q${x + 1} ${y - 8} ${x + 4} ${y - 13}Q${x + 8} ${y - 6} ${x + 6} ${y}Z`;
  return (
    litTubeLine(`M${x} ${y + 8}V${y + 46}`, 4) +
    litTubeLine(`M${x - 9} ${y + 46}L${x} ${y + 34}L${x + 9} ${y + 46}`, 3) +
    `<path d="${flame}" fill="#f08a2a"/>` +
    n(core, '#ffd06a') +
    n(`M${x - 2} ${y}Q${x - 2} ${y - 5} ${x} ${y - 8}Q${x + 2} ${y - 4} ${x + 2} ${y}Z`, '#fff4c8') +
    litPath(`M${x - 14} ${y - 1}H${x + 14}Q${x + 12} ${y + 10} ${x} ${y + 10}Q${x - 12} ${y + 10} ${x - 14} ${y - 1}Z`, GOLDEN, { outline: 2.8, shadow: 2.5, light: 1.2, lightColor: MUSTL }) +
    hl(`M${x - 11} ${y + 3}H${x + 11}`, GOLDD, 1.4, 0.8) +
    rivets([[x - 8, y + 4], [x, y + 5], [x + 8, y + 4]], 1.4, MUSTL, GOLDD)
  );
}
const ROYAL = '#2c5a8c';
const ROYALD = '#1a3658';
const litTubeLine = (d: string, w: number) => hl(d, INK, w + 4) + hl(d, IRON, w) + hl(d, '#8b9097', 1, 0.7);

/** The great clock of the top tier's tower: a gilded bezel, a cream dial, ticks and hands at ten past ten. */
function clockFace(cx: number, cy: number, rr: number): string {
  const circle = (k: number) => `M${fx(cx - k)} ${cy}a${fx(k)} ${fx(k)} 0 1 0 ${fx(k * 2)} 0a${fx(k)} ${fx(k)} 0 1 0 ${fx(-k * 2)} 0Z`;
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const k0 = i % 3 ? 0.66 : 0.58;
    ticks += `M${fx(cx + Math.sin(a) * rr * k0)} ${fx(cy - Math.cos(a) * rr * k0)}L${fx(cx + Math.sin(a) * rr * 0.76)} ${fx(cy - Math.cos(a) * rr * 0.76)}`;
  }
  const hand = (turn: number, len: number) => `M${cx} ${cy}L${fx(cx + Math.sin(turn * Math.PI * 2) * rr * len)} ${fx(cy - Math.cos(turn * Math.PI * 2) * rr * len)}`;
  return (
    `<defs>${GILT.def}</defs>` +
    litPath(`M${fx(cx - rr * 0.5)} ${fx(cy - rr * 0.84)}L${cx} ${fx(cy - rr * 1.32)}L${fx(cx + rr * 0.5)} ${fx(cy - rr * 0.84)}Z`, GOLDEN, { outline: 2.6, shadow: 2, light: 1 }) +
    litBall(cx, fx(cy - rr * 1.36), 2.6, RED, 2) +
    `<path d="${circle(rr)}" fill="${GILT.url}" stroke-width="3"/>` +
    hl(`M${fx(cx - rr * 0.92)} ${fx(cy - rr * 0.2)}a${fx(rr * 0.92)} ${fx(rr * 0.92)} 0 0 1 ${fx(rr * 0.75)} ${fx(-rr * 0.72)}`, '#fff1c0', 1.4, 0.8) +
    litPath(circle(rr * 0.8), CREAM, { outline: 2, shadow: fx(rr * 0.14), light: 0.8 }) +
    hl(ticks, INK, 1.8) +
    hl(hand(10 / 12, 0.42), INK, 3.2) +
    hl(hand(2 / 12, 0.62), INK, 2.4) +
    litBall(cx, cy, 2.2, GOLDEN, 1.8)
  );
}

/** A small gold crown sitting on a spire's tip. */
function crown(cx: number, y: number, s = 1): string {
  const d = `M${fx(cx - 9 * s)} ${y}L${fx(cx - 10 * s)} ${fx(y - 10 * s)}L${fx(cx - 5 * s)} ${fx(y - 5 * s)}L${cx} ${fx(y - 13 * s)}L${fx(cx + 5 * s)} ${fx(y - 5 * s)}L${fx(cx + 10 * s)} ${fx(y - 10 * s)}L${fx(cx + 9 * s)} ${y}Z`;
  return (
    litPath(d, MUSTL, { outline: 2.4, shadow: 2, light: 1, lightColor: '#fff3c0' }) +
    litBall(cx, fx(y - 13 * s), 2.2 * s, RED, 2) +
    litBall(fx(cx - 10 * s), fx(y - 10 * s), 1.8 * s, MUSTL, 2) +
    litBall(fx(cx + 10 * s), fx(y - 10 * s), 1.8 * s, MUSTL, 2) +
    hl(`M${fx(cx - 8 * s)} ${fx(y - 2 * s)}H${fx(cx + 8 * s)}`, GOLDD, 1.4, 0.8)
  );
}

/** Gold caps on a row of merlons, so the battlements read as gilded from far away. */
function goldCaps(x0: number, x1: number, y: number, w: number, gap: number): string {
  let b = `<defs>${GILT.def}</defs>`;
  for (let x = x0; x < x1; x += w + gap) b += r(x - 1, y - 3, w + 2, 5, GILT.url, 1.5);
  return b;
}

/** A corner turret with a gilded cone, optionally crowned. */
function bartizanGold(cx: number, crowned: boolean, f: string, line: string): string {
  const d = rect(cx - 16, 122, 32, 28);
  return (
    `<path d="${d}" fill="#f6f1e6"/>` +
    clip(d, form(cx - 16, 122, 32, 28, 1.2, true)) +
    `<path d="${d}" fill="none"/>` +
    hl(`M${cx} 128v14`, INK, 4) +
    goldBand(cx - 19, cx + 19, 146) +
    spire(cx, 124, 22, crowned ? 98 : 104, f, line, crowned ? MUSTL : RUST, 8) +
    (crowned ? crown(cx, 92, 0.7) : '')
  );
}

/** The recessed lower panel, now with three cheese wheels instead of stars. */
function cheesePanel(x: number, y: number, w: number, h: number, count: number): string {
  let wheels = '';
  for (let i = 0; i < count; i++) wheels += cheeseWheel(fx(x + ((i + 0.5) * w) / count), y + h / 2, h * 0.36, 40 + i);
  return (
    litRect(x, y, w, h, '#c8bea6', 3, { shadow: 0, light: 0 }) +
    shade('sU', x, y, w, 12, 0.6) +
    shade('sL', x, y, 10, h, 0.4) +
    hl(rect(x + 3.5, y + 3.5, w - 7, h - 7), GOLDEN, 2.5) +
    wheels
  );
}

/** The house device of the top tier: snowy Alps over a cheese wheel. */
function alpsDevice(cx: number, cy: number, s: number): string {
  return (
    `<g transform="translate(${cx} ${cy})scale(${s})" stroke-width="${fx(2.4 / s)}">` +
    p('M-16 4L-6 -12L0 -4L7 -16L17 4Z', '#8d95a3') +
    n('M-9.6 -6.2L-6 -12L-2.6 -7.2L-4.6 -5.6L-6.4 -7.4ZM3.4 -10.6L7 -16L11 -9.4L8.6 -8L6.6 -10.2Z', WHITE) +
    `</g>` +
    cheeseWheel(cx, fx(cy + 13 * s), 9 * s, 77)
  );
}

/** The mossy alpine crag the top tier's plinth has grown into. */
function crag(): string {
  const R = rand(977);
  let b = '';
  const stones: [number, number, number, number, string][] = [
    [30, 642, 24, 14, '#8a8476'], [134, 646, 18, 11, '#7a7468'], [-2, 632, 22, 13, '#9a9484'], [254, 640, 16, 10, '#8a8476'], [282, 648, 12, 7, '#7a7468'],
  ];
  for (const [x, y, rx, ry, f] of stones) b += rock(x, y, rx, ry, f, '#c9c2b0', R);
  return `<g stroke-width="2.8">${b}</g>` + moss(30, 630, 18, 6, 978) + moss(134, 636, 12, 5, 979) + moss(254, 631, 9, 4, 980);
}

// ---------------------------------------------------------------------------------------------
// Tiers 6 and 7
// ---------------------------------------------------------------------------------------------

export const WINS5: Win[] = [
  { x: 72, y: 156, w: 28, h: 54, arch: true },
  { x: 140, y: 160, w: 18, h: 40, arch: true },
  { x: 207, y: 182, w: 20, h: 40, arch: true },
];
export const WINS6: Win[] = [
  WINS5[0],
  WINS5[1],
  // The clock replaces the tower window; two more lights instead.
  { x: 20, y: 160, w: 16, h: 34, arch: true },
  { x: 234, y: 256, w: 14, h: 28, arch: true },
];

/** Where the fire baskets (tier 7) and the gate lanterns (tier 6) stand. */
export const BRAZIERS: [number, number][] = [[122, 520], [254, 548]];
const LANTERNS: [number, number][] = [[124, 500], [253, 530]];

/** Warm halos around lights at the gate, lit at night with the windows. */
function halos(spots: [number, number][], dy: number, rx: number, ry: number, o: number): string {
  const halo = rad([[0, '#ffb54a', o], [0.5, '#ff9a30', o * 0.33], [1, '#ff9a30', 0]]);
  return `<defs>${halo.def}</defs>` + spots.map(([x, y]) => `<ellipse cx="${x}" cy="${y + dy}" rx="${rx}" ry="${ry}" fill="${halo.url}" stroke="none"/>`).join('');
}

function grand(top: boolean): string {
  const keepD = 'M-20 146H176V352H-20Z';
  const towerD = 'M180 168H255V352H180Z';
  const wins = top ? WINS6 : WINS5;
  // Tier 6 gilds its roofs; tier 7 sets royal blue slate under gold crowns.
  const roof = top ? ROYAL : MUST;
  const roofLine = top ? ROYALD : GOLDD;
  return (
    SHADE_DEFS +
    ink(
      // Solid rear gallery.
      clip(rect(168, 190, 44, 162), masonry(168, 190, 212, 352, { ...MARBLE, seed: 181 }) + form(168, 190, 44, 162, 1) + shade('sU', 168, 190, 44, 18, 0.5)) +
        `<defs>${GILT.def}</defs>` +
        r(164, 184, 52, 9, GILT.url, 3) +
        // Broad gilded main roof with a cheese-wheel dormer.
        spire(100, 142, 68, top ? 96 : 102, roof, roofLine, top ? MUSTL : RUST, 10) +
        litPath('M88 142V126Q100 112 112 126V142Z', '#f6f1e6', { outline: 2.8, shadow: 2.5, light: 1.2 }) +
        cheeseWheel(100, 131, 7.5, 5) +
        (top ? crown(100, top ? 82 : 88, 0.9) : '') +
        // Main keep body.
        clip(keepD, masonry(-20, 146, 176, 352, { ...MARBLE, seed: 182 }) + form(-20, 146, 196, 206, 0.8)) +
        `<path d="${keepD}" fill="none"/>` +
        shade('sU', -20, 150, 196, 14, 0.4) +
        goldBand(-20, 176, 142) +
        merlons(-20, 174, 124, 18, 15, 9, '#f6f1e6') +
        goldCaps(-20, 174, 124, 15, 9) +
        goldStuds(-12, 170, 121, 24) +
        bartizanGold(52, top, roof, roofLine) +
        bartizanGold(150, top, roof, roofLine) +
        flag(52, top ? 84 : 92, top ? 70 : 78, 30, TEAL, MUSTL) +
        flag(150, top ? 84 : 92, top ? 70 : 78, 30, RUST, MUSTL) +
        // Great window with an alpine flower box, banners either side.
        windowsBody(wins.slice(0, 2), GOLDEN) +
        (top ? windowsBody(wins.slice(2, 3), GOLDEN) : '') +
        flowerBox(64, 216, 44, 11) +
        flowerBox(136, 205, 26, 12) +
        (top
          ? banner(42, 156, 22, 78, RUST, RUSTD, MUSTL, alpsDevice(53, 180, 0.6)) + banner(108, 156, 22, 78, RUST, RUSTD, MUSTL, alpsDevice(119, 180, 0.6))
          : banner(46, 158, 16, 66, TEAL, TEALD, MUSTL, cheeseWheel(54, 184, 5, 21)) + banner(110, 158, 16, 66, TEAL, TEALD, MUSTL, cheeseWheel(118, 184, 5, 22))) +
        goldBand(-20, 176, 236) +
        pilaster(160, 152, 340) +
        alcove('#f6f1e6', '#d9d1bf', '#bdb29a') +
        hl('M46 296Q46 252 86 252Q126 252 126 296', GOLDEN, 3) +
        litBall(86, 247, 4.5, MUSTL, 2.5) +
        // The tall tower.
        clip(towerD, masonry(176, 164, 259, 356, { ...MARBLE, seed: 183 }) + form(180, 164, 75, 192, 1, true)) +
        `<path d="${towerD}" fill="none"/>` +
        goldBand(178, 257, 164) +
        merlons(176, 258, 146, 18, 13, 7, '#f6f1e6') +
        goldCaps(176, 258, 146, 13, 7) +
        goldStuds(182, 256, 143, 20) +
        spire(217, 148, 50, top ? 92 : 100, roof, roofLine, top ? MUSTL : RUST) +
        (top ? crown(217, 80, 1) : '') +
        // Tier 7 turns the tower into the great alpine clock tower.
        (top ? clockFace(217, 189, 21) : windowsBody(wins.slice(2, 3), GOLDEN)) +
        (top ? windowsBody(wins.slice(3, 4), GOLDEN) : banner(186, 182, 14, 40, TEAL, TEALD, MUSTL, cheeseWheel(193, 198, 4, 31)) + banner(234, 182, 14, 40, RUST, RUSTD, MUSTL, cheeseWheel(241, 198, 4, 32))) +
        // The tower's gilded gallery.
        litRect(176, 228, 84, 8, GOLDEN, 2, { outline: 2.8, shadow: 2, light: 1, lightColor: MUSTL }) +
        hl('M182 228V220M192 228V220M202 228V220M232 228V220M242 228V220M252 228V220', INK, 3.6) +
        hl('M182 228V220M192 228V220M202 228V220M232 228V220M242 228V220M252 228V220', MUSTL, 1.6) +
        litRect(176, 216, 84, 5, GOLDEN, 2, { outline: 2.4, shadow: 1.5, light: 0.8 }) +
        goldBand(178, 257, 236) +
        pilaster(240, 246, 326) +
        flag(217, top ? 70 : 100, top ? 50 : 82, 40, RUST, MUSTL) +
        litRect(174, 330, 86, 16, '#f6f1e6', 3, { shadow: 3, light: 1.4 }) +
        goldBand(176, 258, 336) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...MARBLE, h: 30, line: '#a89c82', fills: ['#efe8d8', '#e4ddcb', '#f6f1e6', '#d9d1bf'], seed: 184 }) + form(-20, 352, 158, 276, 0.7)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...MARBLE, seed: 185 }) + form(136, 352, 108, 126, 0.8)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 26, 0.45) +
        goldBand(-20, 136, 470) +
        (top ? goldBand(-20, 136, 540) : '') +
        pilaster(14, 376, 462) +
        pilaster(124, 376, 462) +
        cheesePanel(30, 484, 104, 50, 3) +
        hoistBay('#ece6d6', GOLDEN) +
        footShade +
        foundation(top ? 111 : 101, { ...MARBLE, base: '#a99f8a', line: '#9c917b', fills: ['#d9d1bf', '#c5bca7', '#e4ddcb'] }, ['#d9d1bf', '#c5bca7', '#ece6d6'], WHITE) +
        (top ? crag() : '') +
        sallyPort(GOLDEN, GOLDD) +
        moss(30, 586, 22, 6, top ? 131 : 121) +
        moss(124, 590, 12, 5, top ? 132 : 122) +
        vine(16, 594, 140, 6, top ? 133 : 123) +
        (top ? vine(240, 596, 70, 5, 134) : '') +
        gateVoid +
        archGate('#f6f1e6', MUSTL, '#c5bca7', top ? TEAL : RUST) +
        (top ? cheeseWheel(188, 478, 8.5, 9) : litBall(188, 478, 7, MUSTL, 3)) +
        gateBrow(GOLDEN, MUSTL, GOLDD) +
        deck(256, '#f6f1e6', WHITE, GOLDEN, GOLDEN) +
        slotPlates({ f: GOLDEN, hi: MUSTL, rivet: GOLDD, trim: GOLDD }, false) +
        (top
          ? BRAZIERS.map(([x, y]) => `<g transform="translate(${x} ${y})scale(1.25)translate(${-x} ${-y})">${brazier(x, y)}</g>`).join('')
          : LANTERNS.map(([x, y]) => lantern(x, y)).join('')),
    )
  );
}

/** Tier 6: the Gilded Cheese Citadel. */
export const tier5 = () => grand(false);
/** Tier 7: the Alpine Crown Fortress. */
export const tier6 = () => grand(true);

/** Night glow of tier 6: windows plus the gate lanterns. */
export const glowGilded = (): string => halos(LANTERNS, 10, 22, 24, 0.7) + windowsGlow(WINS5);
/** Night glow of tier 7: windows plus the two fire baskets. */
export const glowTop = (): string => halos(BRAZIERS, -14, 36, 42, 0.75) + windowsGlow(WINS6);
