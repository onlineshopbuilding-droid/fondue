/**
 * The keep in its five build stages, from a wooden palisade to the white-and-gold fortress, plus its ground shadow.
 * Keep art coordinates are world + (40, 20); the window lists (`WINS0` to `WINS4`) also feed the night glow.
 */
import { INK, TEAL, TEALD, RUST, RUSTD, MUST, MUSTL, WOOD, WOODD, WOODL, STONE, STONED, STONEL, IRON, IRONL, WHITE, GOLD, GOLDD, ink, r, l, n, hl, art, starPoints, LIGHT, litPath, litRect, litBall, rivets, grain, litFast as lit, tubeFast as litTube } from '../draw';
import { tone, linear as lin, linearAbs, radial as rad, glint } from '../shade';
import { rand, fx, rect, clip, litTubeBeam, ropeLashes, SHADOW, SHADE_DEFS, form, gableLight, shade, lump, type Stonework, masonry, logs, boards, shingles, spire, flag, emblem, banner, merlons, type Win, windowsBody, vine, moss } from './kit';
import { gateVoid, foundation, footShade, sallyPort, alcove, hoistBay, gateBrow, deck, slotPlates } from './keepParts';

// ---------------------------------------------------------------------------------------------
// Tier 0: a plain wooden palisade fort with a watchtower.
// ---------------------------------------------------------------------------------------------

export const WINS0: Win[] = [{ x: 74, y: 214, w: 20, h: 22 }];

export function tier0(): string {
  const R = rand(100);
  const top = () => 258 + R() * 12;
  const thatch = 'M26 208Q50 182 82 150Q116 182 140 208Q134 214 126 210Q118 216 108 211Q98 216 88 211Q78 216 66 210Q56 216 46 211Q36 216 26 208Z';
  const straw = 'M82 156L52 200M82 156L66 204M82 156L82 206M82 156L98 204M82 156L112 200M56 182L46 204M108 182L120 204';
  return (
    SHADE_DEFS +
    ink(
      // Watchtower behind the palisade.
      litTubeBeam('M50 360L56 244', WOODD, 8) + litTubeBeam('M116 360L110 244', WOODD, 8) +
        litTubeBeam('M54 330L112 270M112 330L54 270', WOODD, 5) +
        flag(83, 158, 122, 30, RUST, MUSTL) +
        boards(46, 196, 74, 56, WOOD, WOODD, 15, 3) +
        windowsBody(WINS0, WOODL) +
        litTubeBeam('M40 252H126', WOODD, 5) +
        lit(thatch, '#b7924e', { shadow: 6, light: 3, shadowColor: '#7f6230', lightColor: '#e2c27f' }) +
        clip(thatch, hl(straw, '#8a6a34', 2.5) + hl(straw.replace(/M82 156/g, 'M83 158'), '#e7cc8a', 1, 0.6) + shade('sD', 26, 186, 116, 30, 0.45)) +
        hl('M34 203Q64 184 82 164', '#d9b873', 3, 0.8) +
        hl('M30 209Q36 213 46 211Q56 216 66 210Q78 216 88 211Q98 216 108 211Q118 216 126 210Q134 214 140 208', '#6d5226', 2, 0.6) +
        // Palisade above the walkway.
        logs(-22, 252, top, 352, 11, { point: true }) +
        shade('sD', -20, 310, 272, 36, 0.5) +
        litTubeBeam('M-20 296H250', WOODD, 4) +
        ropeLashes([4, 52, 100, 148, 196, 238], 296) +
        // Lower wall.
        logs(-22, 138, () => 352, 628, 12) +
        logs(136, 244, () => 352, 478, 13, { w: 20 }) +
        form(136, 352, 108, 126, 1) +
        form(-22, 352, 160, 276, 0.8) +
        shade('sU', -14, 359, 258, 26, 0.6) +
        litTubeBeam('M-20 418H136', WOODD, 5) +
        litTubeBeam('M-20 528H136', WOODD, 5) +
        ropeLashes([24, 112], 418) +
        ropeLashes([24], 528) +
        hoistBay(WOOD, WOODD) +
        footShade +
        foundation(21, ROUGH, ['#8d7d63', '#7a6c58', '#a29474'], '#bcae8c') +
        sallyPort(WOOD, WOODD) +
        moss(30, 584, 22, 7, 1) +
        moss(112, 586, 14, 5, 2) +
        vine(16, 590, 110, 7, 5) +
        // Gate frame: two huge posts and a lintel.
        gateVoid +
        litTubeBeam('M144 478V644', WOODD, 9) +
        litTubeBeam('M232 478V644', WOODD, 9) +
        litRect(128, 468, 120, 22, WOOD, 5, { shadow: 5, light: 2 }) +
        grain(134, 471, 242, 487, WOODD, 77, 2, false) +
        hl('M134 473H240', WOODL, 2, 0.8) +
        litPath('M122 479a8 11 0 1 0 16 0a8 11 0 1 0 -16 0Z', WOODL, { shadow: 2.5, light: 1.2 }) +
        litPath('M239 479a8 11 0 1 0 16 0a8 11 0 1 0 -16 0Z', WOODL, { shadow: 2.5, light: 1.2 }) +
        hl('M127 479a3 5 0 1 0 6 0a3 5 0 1 0 -6 0M244 479a3 5 0 1 0 6 0a3 5 0 1 0 -6 0', WOODD, 1.6, 0.8) +
        gateBrow(WOODD, WOOD) +
        deck(256, WOODL, '#d6ad78', WOOD) +
        slotPlates({ f: WOOD, hi: WOODL, rivet: WOODD }, true) +
        // Hand-made touches: a lantern on a bracket and a coil of rope.
        litTubeBeam('M124 500H136', WOODD, 3) +
        l('M124 503V510', 2) +
        litRect(118, 510, 12, 16, MUSTL, 3, { outline: 2.5, shadow: 2.5, light: 1, lightColor: '#fff3c0' }) +
        l('M124 510V526M118 518H130', 2) +
        glint(121, 514, 1, '#fffaf0') +
        lit(lump(44, 559, 13, 9, R), '#c9a66a', { outline: 3, shadow: 3, light: 1.4 }) +
        hl('M34 556Q44 550 54 556M34 561Q44 555 54 561M37 565Q44 561 51 565', '#8a6a34', 1.6),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 1: timber on a stone footing, bound with iron.
// ---------------------------------------------------------------------------------------------

const ROUGH: Omit<Stonework, 'seed'> = { h: 24, base: '#6a6458', fills: [STONE, STONED, '#8a8476', '#a59f8f'], line: '#4e4a41', hi: STONEL };

export const WINS1: Win[] = [{ x: 58, y: 174, w: 20, h: 28 }, { x: 96, y: 174, w: 20, h: 28 }];

/** A forged iron strap: darker below, a bright upper edge, round rivets with glints, a few dents. */
function ironBand(x0: number, x1: number, y: number, h = 11): string {
  const heads: [number, number][] = [];
  let dents = '';
  for (let x = x0 + 12, i = 0; x < x1; x += 24, i++) {
    heads.push([x, y + h / 2]);
    if (i % 3 === 1) dents += `M${x + 9} ${fx(y + h * 0.4)}h4`;
  }
  return (
    litRect(x0, y, x1 - x0, h, IRON, 2, { shadow: fx(h * 0.32), light: 1, lightColor: IRONL }) +
    hl(`M${x0 + 3} ${y + 2.4}H${x1 - 3}`, '#a9b0b8', 1.2, 0.8) +
    hl(dents, '#2c2f35', 1.4, 0.6) +
    rivets(heads, 2.4, '#5a5f66', '#1d2024')
  );
}

/** Split-plank roof of the timber tower: seams with a lit bevel beside each. */
function boardRoof(): string {
  const seams = 'M40 158L84 126M56 166L92 128M72 166L104 134M90 166L118 140M108 166L130 150M40 152L60 166M56 140L90 166M70 132L112 166M92 128L136 164';
  return hl(seams, '#7f5530', 2.2) + `<g transform="translate(1.6 0.6)">${hl(seams, '#e6bf8a', 1, 0.55)}</g>`;
}

/** Stone jambs either side of the gate, as alternating quoin blocks. */
function jambs(light: string, mid: string): string {
  let b = '';
  for (const x of [137, 225]) {
    for (let i = 0, y = 480; i < 5; i++, y += 33) b += litRect(x, y, 14, i === 4 ? 644 - y : 33, i % 2 ? mid : light, 2.5, { shadow: 3, light: 1.4, outline: 2.8 });
  }
  return b + shade('sR', 225, 480, 14, 164, 0.4);
}

export function tier1(): string {
  const crenel = (k: number) => 240 + (k % 2 ? 0 : 16);
  const top = (x: number) => crenel(Math.floor((x + 22) / 48));
  let caps = '';
  for (let k = 0, x = -22; x < 254; k++, x += 48) caps += r(x - 1, crenel(k) - 3, 50, 8, IRON, 2);
  const footingTop = 'M-20 506Q20 494 52 504T110 500T140 508V640H-20Z';
  const roofD = 'M24 158L84 120L144 158L137 166H31Z';
  return (
    SHADE_DEFS +
    ink(
      flag(84, 128, 96, 34, RUST, MUSTL) +
        // Square timber tower.
        boards(36, 152, 96, 110, '#8b5e34', WOODD, 16, 6) +
        form(36, 152, 96, 110, 0.8) +
        ironBand(36, 132, 212, 10) +
        litTube('M36 154V258M132 154V258', 4, IRON, { outline: 2.5, lightColor: IRONL }) +
        windowsBody(WINS1.slice(0, 2), WOODL) +
        lit(roofD, WOODL, { shadow: 5, light: 2 }) +
        clip(roofD, boardRoof() + shade('sD', 24, 140, 120, 28, 0.35) + n('M84 120L144 158H84Z', SHADOW, 0.22)) +
        hl('M30 160L84 126L138 160', '#d6ad78', 3) +
        hl('M32 159.5L84 127', LIGHT, 1.2, 0.6) +
        // Board parapet with iron caps.
        logs(-22, 254, top, 352, 24, { w: 24, fills: ['#8b5e34', WOOD, '#a5733f'] }) +
        caps +
        shade('sD', -20, 300, 274, 46, 0.5) +
        ironBand(-20, 254, 300, 11) +
        // Timber lower wall with bands.
        boards(-20, 352, 158, 170, WOOD, WOODD, 19, 7) +
        boards(136, 352, 108, 126, '#8b5e34', WOODD, 19, 8) +
        form(136, 352, 108, 126, 1) +
        shade('sU', -14, 359, 258, 28, 0.6) +
        ironBand(-20, 136, 380, 11) +
        ironBand(-20, 136, 470, 11) +
        ironBand(136, 244, 430, 11) +
        // Stone footing with an uneven top.
        clip(footingTop, masonry(-20, 494, 140, 640, { ...ROUGH, seed: 33 }) + shade('sU', -20, 494, 160, 18, 0.5)) +
        `<path d="${footingTop}" fill="none"/>` +
        hoistBay(WOODD, WOOD) +
        footShade +
        foundation(31, ROUGH, [STONED, STONE, '#837c6d'], STONEL) +
        sallyPort(STONEL, STONED) +
        moss(32, 584, 26, 8, 3) +
        moss(74, 503, 18, 7, 4) +
        vine(22, 592, 150, 7, 6) +
        vine(118, 595, 60, 5, 8) +
        gateVoid +
        // Stone jambs with timber lintel and iron straps.
        jambs(STONEL, STONE) +
        litRect(128, 468, 120, 22, WOODD, 4, { shadow: 5, light: 2 }) +
        grain(134, 471, 242, 487, '#4a2f19', 41, 2, false) +
        hl('M134 473H240', WOOD, 2, 0.9) +
        litRect(144, 466, 14, 26, IRON, 2, { shadow: 3, light: 1.2, lightColor: IRONL }) +
        litRect(218, 466, 14, 26, IRON, 2, { shadow: 3, light: 1.2, lightColor: IRONL }) +
        rivets([[151, 472], [151, 485], [225, 472], [225, 485]], 2.2, '#5a5f66', '#1d2024') +
        gateBrow(IRON, IRONL) +
        deck(256, WOODL, '#d6ad78', IRON) +
        slotPlates({ f: IRON, hi: IRONL, rivet: '#20242a' }, true),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 2: proper stone walls, shingled roofs, a banner.
// ---------------------------------------------------------------------------------------------

const ASHLAR: Omit<Stonework, 'seed'> = { h: 22, base: '#857f71', fills: [STONEL, '#aca696', STONE, '#b6b09f'], line: '#6a6559', hi: '#d6d0bd' };
export const WINS2: Win[] = [
  { x: 52, y: 198, w: 22, h: 40, arch: true },
  { x: 120, y: 198, w: 22, h: 40, arch: true },
  { x: 212, y: 218, w: 16, h: 18, arch: true },
];

export function tier2(): string {
  const bodyD = 'M-20 186H158V352H-20Z';
  const turretD = 'M190 212H250V352H190Z';
  const gableD = 'M-30 190Q14 156 64 112Q118 156 168 190Z';
  return (
    SHADE_DEFS +
    ink(
      // Rear curtain wall between keep and turret.
      clip(rect(150, 216, 42, 136), masonry(150, 216, 192, 352, { ...ASHLAR, seed: 45 }) + form(150, 216, 42, 136, 1.2) + shade('sU', 150, 216, 42, 20, 0.6)) +
      litRect(146, 210, 50, 9, STONEL, 3, { shadow: 2.5, light: 1.2 }) +
        // Main keep.
        clip(bodyD, masonry(-20, 186, 158, 352, { ...ASHLAR, seed: 41 }) + form(-20, 186, 178, 166, 1)) +
        `<path d="${bodyD}" fill="none"/>` +
        shade('sU', -20, 188, 178, 24, 0.65) +
        windowsBody(WINS2.slice(0, 2), STONEL) +
        flag(64, 116, 96, 36, RUST, MUSTL) +
        shingles(gableD, -30, 112, 168, 194, RUST, RUSTD, 12, 15, gableLight(-30, 112, 168, 194)) +
        hl('M-12 182Q18 156 62 120', '#e08a60', 2.5, 0.7) +
        litRect(-26, 186, 186, 9, WOODD, 3, { shadow: 2.5, light: 1.2 }) +
        banner(80, 197, 28, 52, TEAL, TEALD, MUSTL, emblem(94, 221, 0.72)) +
        alcove(STONEL, '#7b7566', '#6a6559') +
        // Right turret: a round drum.
        clip(turretD, masonry(190, 208, 250, 352, { ...ASHLAR, seed: 42 }) + form(190, 208, 60, 144, 1.1, true)) +
        `<path d="${turretD}" fill="none"/>` +
        windowsBody(WINS2.slice(2, 3), STONEL) +
        spire(220, 208, 42, 128, RUST, RUSTD, MUSTL) +
        litRect(184, 206, 72, 9, WOODD, 3, { shadow: 2.5, light: 1.2 }) +
        shade('sU', 190, 215, 60, 14, 0.6) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...ASHLAR, seed: 43 }) + form(-20, 352, 158, 276, 0.8)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...ASHLAR, seed: 44 }) + form(136, 352, 108, 126, 1)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 28, 0.6) +
        hoistBay(STONED, STONEL) +
        footShade +
        foundation(51, ROUGH, [STONED, STONE, '#837c6d'], STONEL) +
        sallyPort(STONEL, STONED) +
        moss(26, 584, 26, 8, 5) +
        moss(70, 588, 18, 6, 6) +
        moss(130, 470, 12, 6, 7) +
        vine(12, 594, 200, 7, 9) +
        vine(128, 596, 70, 5, 10) +
        gateVoid +
        // Stone gate arch.
        archGate(STONEL, STONE, STONED, RUST) +
        gateBrow(STONE, STONEL) +
        deck(256, STONEL, '#d6d0bd', STONE) +
        slotPlates({ f: STONED, hi: STONEL, rivet: IRON }, false),
    )
  );
}

/** Segmental voussoir arch and jamb quoins over the opening. */
function archGate(light: string, mid: string, dark: string, stoneKey: string): string {
  const jamb = (x: number) =>
    [0, 1, 2, 3, 4].map((i) => litRect(x, 494 + i * 30, 14, i === 4 ? 30 : 30, i % 2 ? mid : light, 3, { shadow: 3, light: 1.4, outline: 3 })).join('');
  // Tympanum, carved panel between arch and the rectangular opening.
  const tymp = 'M151 490Q188 462 225 490Z';
  // Voussoirs.
  const outer = (a: number): [number, number] => [188 + Math.cos(a) * 62, 496 + Math.sin(a) * 36];
  const inner = (a: number): [number, number] => [188 + Math.cos(a) * 44, 496 + Math.sin(a) * 24];
  let stones = '';
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a0 = Math.PI + (i / count) * Math.PI;
    const a1 = Math.PI + ((i + 1) / count) * Math.PI;
    const pts = [outer(a0), outer(a1), inner(a1), inner(a0)].map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L');
    stones += litPath(`M${pts}Z`, i === 4 ? stoneKey : i % 2 ? mid : light, { outline: 2.5, shadow: 2.5, light: 1.2 });
  }
  return (
    jamb(137) +
    jamb(225) +
    shade('sR', 225, 494, 14, 150, 0.4) +
    litPath(tymp, dark, { outline: 2.5, shadow: 0, light: 0 }) +
    clip(tymp, shade('sU', 151, 470, 74, 20, 0.7) + hl('M164 489Q188 474 212 489', tone(dark, 0.3), 1.4, 0.6) + hl('M188 488V478M180 486L184 479M196 486L192 479', tone(dark, -0.4), 1.6, 0.8)) +
    stones +
    litRect(133, 490, 22, 8, light, 2, { shadow: 2, light: 1, outline: 3 }) +
    litRect(221, 490, 22, 8, light, 2, { shadow: 2, light: 1, outline: 3 })
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 3: a taller slate keep, an extra tower, runes and more banners.
// ---------------------------------------------------------------------------------------------

const SLATE: Omit<Stonework, 'seed'> = { h: 22, base: '#5b6271', fills: ['#8d95a3', '#7c8493', '#9aa2af', '#868e9c'], line: '#4a5160', hi: '#bcc3cd' };
export const WINS3: Win[] = [
  { x: 66, y: 120, w: 16, h: 22, arch: true },
  { x: 90, y: 120, w: 16, h: 22, arch: true },
  { x: 52, y: 176, w: 22, h: 46, arch: true },
  { x: 118, y: 176, w: 22, h: 46, arch: true },
  { x: 207, y: 186, w: 20, h: 40, arch: true },
];

/** Runes cut into the stone with a dull verdigris inlay. */
const runeLine = (d: string) =>
  hl(d, '#3f4756', 5.5, 0.9) + hl(d, '#7fae9f', 2.2) + `<g transform="translate(-0.6 -0.6)">${hl(d, '#c8eadf', 0.8, 0.7)}</g>`;

export function tier3(): string {
  const keepD = 'M-20 146H166V352H-20Z';
  const upperD = 'M44 110H128V150H44Z';
  const towerD = 'M180 174H255V352H180Z';
  return (
    SHADE_DEFS +
    ink(
      // Solid rear wall: nothing behind the crossbow but stone.
      clip(rect(158, 196, 60, 156), masonry(158, 196, 218, 352, { ...SLATE, seed: 66 }) + form(158, 196, 60, 156, 1.2) + shade('sU', 158, 196, 60, 20, 0.6)) +
      litRect(154, 190, 68, 9, '#9aa2af', 3, { shadow: 2.5, light: 1.2 }) +
        // Crenellated top storey carrying the flag.
        clip(upperD, masonry(44, 110, 128, 154, { ...SLATE, seed: 61 }) + form(44, 110, 84, 44, 1)) +
        `<path d="${upperD}" fill="none"/>` +
        shade('sU', 44, 112, 84, 10, 0.5) +
        windowsBody(WINS3.slice(0, 2), '#bcc3cd') +
        merlons(42, 128, 98, 15, 15, 9, '#9aa2af') +
        flag(50, 110, 96, 30, TEAL, MUSTL) +
        // Main keep.
        clip(keepD, masonry(-20, 146, 166, 352, { ...SLATE, seed: 62 }) + form(-20, 146, 186, 206, 1)) +
        `<path d="${keepD}" fill="none"/>` +
        merlons(-20, 164, 128, 20, 15, 10, '#9aa2af') +
        shade('sU', -20, 148, 186, 16, 0.55) +
        windowsBody(WINS3.slice(2, 4), '#bcc3cd') +
        banner(80, 160, 30, 80, RUST, RUSTD, MUSTL, emblem(95, 196, 0.9)) +
        runeLine('M46 300V330M38 310L54 322M54 310L38 322') +
        alcove('#bcc3cd', '#5b6271', '#4a5160') +
        runeLine('M70 262L86 256L102 262') +
        // The extra tower: a straight drum standing on the walkway, its plinth on the stonework.
        clip(towerD, masonry(176, 170, 259, 356, { ...SLATE, seed: 63 }) + form(180, 170, 75, 186, 1.2, true)) +
        `<path d="${towerD}" fill="none"/>` +
        litRect(174, 332, 86, 14, '#9aa2af', 3, { shadow: 3, light: 1.4 }) +
        hl('M180 336H254', '#c6ccd5', 2, 0.8) +
        windowsBody(WINS3.slice(4, 5), '#bcc3cd') +
        merlons(176, 256, 158, 18, 12, 7, '#9aa2af') +
        spire(217, 158, 46, 108, TEALD, '#163f42', MUSTL) +
        banner(186, 186, 14, 40, TEAL, TEALD, MUSTL, emblem(193, 202, 0.4)) +
        banner(234, 186, 14, 40, RUST, RUSTD, MUSTL, emblem(241, 202, 0.4)) +
        flag(217, 122, 96, 34, RUST, MUSTL) +
        runeLine('M246 296V322M238 304L254 314M254 304L238 314') +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...SLATE, seed: 64 }) + form(-20, 352, 158, 276, 0.8)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...SLATE, seed: 65 }) + form(136, 352, 108, 126, 1)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 28, 0.6) +
        runeLine('M130 400V440M122 412L138 424') +
        hoistBay('#7c8493', '#bcc3cd') +
        footShade +
        foundation(71, { ...SLATE, base: '#4d5462', fills: ['#6f7787', '#7c8493', '#5f6878'] }, ['#6f7787', '#7c8493', '#5f6878'], '#bcc3cd') +
        sallyPort('#bcc3cd', '#7c8493') +
        moss(30, 584, 26, 8, 11) +
        moss(66, 588, 14, 5, 12) +
        vine(20, 594, 240, 6, 13) +
        gateVoid +
        archGate('#bcc3cd', '#9aa2af', '#6f7787', TEAL) +
        runeLine('M188 470V486M180 478H196') +
        gateBrow('#7c8493', '#bcc3cd', MUST) +
        deck(256, '#9aa2af', '#c6ccd5', '#7c8493', MUST) +
        slotPlates({ f: '#6f7787', hi: '#bcc3cd', rivet: GOLD, trim: GOLD }, false),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Tier 4: a magnificent white-and-gold fortress.
// ---------------------------------------------------------------------------------------------

const MARBLE: Omit<Stonework, 'seed'> = { h: 24, base: '#d1c9b6', fills: ['#f6f1e6', '#ece6d6', '#f2ecdd', '#e4ddcb'], line: '#bdb29a', hi: WHITE };
export const WINS4: Win[] = [
  { x: 72, y: 156, w: 28, h: 54, arch: true },
  { x: 140, y: 160, w: 18, h: 40, arch: true },
  { x: 207, y: 182, w: 20, h: 40, arch: true },
];
const GOLDEN = MUST;

/** Polished gold: bright upper edge, deep lower edge. */
export const GILT = lin([[0, '#ffe39a'], [0.35, MUSTL], [0.7, GOLDEN], [1, GOLDD]], 90);

/** Gold string course with little studs. */
function goldBand(x0: number, x1: number, y: number): string {
  const studs: [number, number][] = [];
  for (let x = x0 + 10; x < x1; x += 20) studs.push([x, y + 4]);
  return (
    `<defs>${GILT.def}</defs>` +
    r(x0, y, x1 - x0, 8, GILT.url, 2) +
    hl(`M${x0 + 3} ${y + 2}H${x1 - 3}`, '#fff1c0', 1.2, 0.8) +
    rivets(studs, 1.6, GOLD, GOLDD)
  );
}

/** A fluted marble pilaster with gilded capital and base. */
function pilaster(x: number, y0: number, y1: number): string {
  return (
    litRect(x, y0, 12, y1 - y0, '#f6f1e6', 2, { shadow: 3, light: 1.2 }) +
    hl(`M${x + 4} ${y0 + 6}V${y1 - 6}M${x + 8} ${y0 + 6}V${y1 - 6}`, '#cfc5ae', 1.4, 0.9) +
    hl(`M${x + 5} ${y0 + 6}V${y1 - 6}`, WHITE, 0.8, 0.9) +
    `<defs>${GILT.def}</defs>` +
    r(x - 3, y0 - 6, 18, 7, GILT.url, 2) +
    r(x - 3, y1 - 1, 18, 7, GILT.url, 2) +
    glint(x, y0 - 4, 0.9) +
    glint(x, y1 + 1, 0.9)
  );
}

/** A recessed stone panel carrying solid carved medallions in gold. */
function carvedPanel(x: number, y: number, w: number, h: number, count: number): string {
  let medals = '';
  for (let i = 0; i < count; i++) {
    const cx = fx(x + ((i + 0.5) * w) / count);
    const cy = y + h / 2;
    medals +=
      litPath(`M${fx(cx - h * 0.36)} ${cy}a${fx(h * 0.36)} ${fx(h * 0.36)} 0 1 0 ${fx(h * 0.72)} 0a${fx(h * 0.36)} ${fx(h * 0.36)} 0 1 0 ${fx(-h * 0.72)} 0Z`, '#f6f1e6', { outline: 2.5, shadow: 2.5, light: 1.2 }) +
      litPath(starPoints(cx, cy, h * 0.27, h * 0.12, 8), GOLDEN, { outline: 2.2, shadow: 1.5, light: 0.8, lightColor: '#ffe39a' }) +
      glint(fx(cx - 2.5), cy - 3, 1);
  }
  return (
    litRect(x, y, w, h, '#c8bea6', 3, { shadow: 0, light: 0 }) +
    shade('sU', x, y, w, 12, 0.6) +
    shade('sL', x, y, 10, h, 0.4) +
    hl(rect(x + 3.5, y + 3.5, w - 7, h - 7), GOLDEN, 2.5) +
    medals
  );
}

function goldStuds(x0: number, x1: number, y: number, step: number): string {
  const pts: [number, number][] = [];
  for (let x = x0; x < x1; x += step) pts.push([x, y]);
  return rivets(pts, 2.6, MUSTL, GOLDD);
}

/** A small corner turret standing on the keep's crown. */
function bartizan(cx: number): string {
  const d = rect(cx - 16, 122, 32, 28);
  return (
    `<path d="${d}" fill="#f6f1e6"/>` +
    clip(d, form(cx - 16, 122, 32, 28, 1.2, true)) +
    `<path d="${d}" fill="none"/>` +
    hl(`M${cx} 128v14`, INK, 4) +
    goldBand(cx - 19, cx + 19, 146) +
    spire(cx, 124, 22, 108, TEAL, TEALD, MUSTL, 8)
  );
}

export function tier4(): string {
  const keepD = 'M-20 146H176V352H-20Z';
  const towerD = 'M180 168H255V352H180Z';
  return (
    SHADE_DEFS +
    ink(
      // Solid rear gallery: nothing behind the crossbow but carved stone.
      clip(rect(168, 190, 44, 162), masonry(168, 190, 212, 352, { ...MARBLE, seed: 81 }) + form(168, 190, 44, 162, 1) + shade('sU', 168, 190, 44, 18, 0.5)) +
      `<defs>${GILT.def}</defs>` +
      r(164, 184, 52, 9, GILT.url, 3) +
        // Broad main roof behind the keep crown.
        spire(100, 142, 66, 110, TEAL, TEALD, MUSTL, 10) +
        // Main keep body.
        clip(keepD, masonry(-20, 146, 176, 352, { ...MARBLE, seed: 82 }) + form(-20, 146, 196, 206, 0.8)) +
        `<path d="${keepD}" fill="none"/>` +
        shade('sU', -20, 150, 196, 14, 0.4) +
        goldBand(-20, 176, 142) +
        merlons(-20, 174, 124, 18, 15, 9, '#f6f1e6') +
        goldStuds(-12, 170, 121, 24) +
        bartizan(52) +
        bartizan(150) +
        flag(52, 110, 96, 30, RUST, MUSTL) +
        flag(150, 110, 96, 30, TEAL, MUSTL) +
        // Great arched window with gold tracery and banners either side.
        windowsBody(WINS4.slice(0, 2), GOLDEN) +
        litPath(starPoints(86, 225, 11, 5.5, 8), MUSTL, { shadow: 2, light: 1, lightColor: '#fff1c0' }) +
        glint(83, 221, 1.1) +
        banner(46, 158, 16, 66, RUST, RUSTD, MUSTL, emblem(54, 184, 0.5)) +
        banner(110, 158, 16, 66, RUST, RUSTD, MUSTL, emblem(118, 184, 0.5)) +
        goldBand(-20, 176, 236) +
        pilaster(160, 152, 340) +
        alcove('#f6f1e6', '#d9d1bf', '#bdb29a') +
        hl('M46 296Q46 252 86 252Q126 252 126 296', GOLDEN, 3) +
        // The tall tower: a straight drum standing on the walkway, its plinth on the stonework.
        clip(towerD, masonry(176, 164, 259, 356, { ...MARBLE, seed: 83 }) + form(180, 164, 75, 192, 1, true)) +
        `<path d="${towerD}" fill="none"/>` +
        goldBand(178, 257, 164) +
        merlons(176, 258, 146, 18, 13, 7, '#f6f1e6') +
        goldStuds(182, 256, 143, 20) +
        spire(217, 148, 48, 108, TEAL, TEALD, MUSTL) +
        windowsBody(WINS4.slice(2, 3), GOLDEN) +
        banner(186, 182, 14, 40, RUST, RUSTD, MUSTL, emblem(193, 198, 0.38)) +
        banner(234, 182, 14, 40, RUST, RUSTD, MUSTL, emblem(241, 198, 0.38)) +
        goldBand(178, 257, 236) +
        pilaster(240, 246, 326) +
        flag(217, 122, 96, 34, RUST, MUSTL) +
        litRect(174, 330, 86, 16, '#f6f1e6', 3, { shadow: 3, light: 1.4 }) +
        goldBand(176, 258, 336) +
        // Lower wall.
        clip(rect(-20, 352, 158, 276), masonry(-20, 352, 140, 628, { ...MARBLE, h: 30, line: '#a89c82', fills: ['#efe8d8', '#e4ddcb', '#f6f1e6', '#d9d1bf'], seed: 84 }) + form(-20, 352, 158, 276, 0.7)) +
        clip(rect(136, 352, 108, 126), masonry(136, 352, 244, 478, { ...MARBLE, seed: 85 }) + form(136, 352, 108, 126, 0.8)) +
        `<path d="M138 352V478M244 352V478" fill="none"/>` +
        shade('sU', -14, 359, 258, 26, 0.45) +
        goldBand(-20, 136, 470) +
        pilaster(14, 376, 462) +
        pilaster(124, 376, 462) +
        carvedPanel(30, 486, 104, 48, 3) +
        hoistBay('#ece6d6', GOLDEN) +
        footShade +
        foundation(91, { ...MARBLE, base: '#a99f8a', line: '#9c917b', fills: ['#d9d1bf', '#c5bca7', '#e4ddcb'] }, ['#d9d1bf', '#c5bca7', '#ece6d6'], WHITE) +
        sallyPort(GOLDEN, GOLDD) +
        moss(30, 586, 22, 6, 21) +
        vine(16, 594, 120, 6, 22) +
        gateVoid +
        archGate('#f6f1e6', MUSTL, '#c5bca7', RUST) +
        litBall(188, 478, 7, MUSTL, 3) +
        gateBrow(GOLDEN, MUSTL, GOLDD) +
        deck(256, '#f6f1e6', WHITE, GOLDEN, GOLDEN) +
        slotPlates({ f: GOLDEN, hi: MUSTL, rivet: GOLDD, trim: GOLDD }, false),
    )
  );
}

// ---------------------------------------------------------------------------------------------
// Ground shadow
// ---------------------------------------------------------------------------------------------

export const keepShadow = art(
  560,
  110,
  0,
  110,
  // Placed at world (-40, 558): art x = keep art x, art y = keep art y - 578.
  // The sun stands upper left, so the keep throws its shadow down-right across the road, soft at its
  // far end, with a dark contact line where the wall meets the ground.
  (() => {
    const fade = linearAbs([[0, '#1a1226', 0.75], [0.5, '#1a1226', 0.65], [0.8, '#1a1226', 0.3], [1, '#1a1226', 0]], 0, 0, 392, 0);
    const contact = rad([[0, '#140d07', 0.7], [0.6, '#140d07', 0.35], [1, '#140d07', 0]]);
    const body = (k: number) =>
      `M-10 ${54 - k}L150 ${56 - k}L266 ${60 - k}Q${330 + k * 2} ${72 - k * 0.4} ${380 + k * 2} ${94 + k * 0.6}Q${330 + k} ${103 + k * 0.4} ${236 - k} ${102 + k * 0.5}L-10 ${101 + k * 0.5}Z`;
    return (
      `<defs>${fade.def}${contact.def}</defs>` +
      [7, 3.5, 0].map((k) => `<path d="${body(k)}" fill="${fade.url}" opacity=".5"/>`).join('') +
      `<ellipse cx="206" cy="68" rx="90" ry="12" fill="${contact.url}"/>` +
      `<ellipse cx="60" cy="66" rx="90" ry="12" fill="${contact.url}"/>`
    );
  })(),
);
