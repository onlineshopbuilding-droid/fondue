/**
 * Parts every keep stage shares: the gate opening, the foundation and the furniture of the weapon slots.
 * The five stages in keepStages.ts place these at the same spots, so gates and weapons fit every stage.
 */
import { IRON, IRONL, r, p, n, hl, LIGHT, litPath, litRect, rivets } from '../draw';
import { tone, linear as lin } from '../shade';
import { VOID, rand, rect, clip, SHADOW, form, shade, rock, type Stonework, masonry, boards, corbels } from './kit';

// ---------------------------------------------------------------------------------------------
// Parts every tier shares: the gate opening, the foundation, the slot furniture.
// ---------------------------------------------------------------------------------------------

/** Dark opening plus depth inside it. The leaf (`gate0..4`) is drawn over art x 151..225, y 490..640. */
export const gateVoid =
  r(151, 486, 74, 158, VOID, 0) +
  n(rect(151, 486, 74, 22), '#000', 0.4) +
  n(rect(151, 486, 12, 158), '#000', 0.3);

/**
 * The battered plinth the wall stands on. It flares out at the bottom and sinks into the earth,
 * with boulders half buried along its foot. The earth itself is repainted in each landscape's own
 * colours by `keepGround_*`, which also grows grass and moss over the lowest stones.
 */
export function foundation(seed: number, s: Omit<Stonework, 'seed'>, fills: [string, string, string], hi: string): string {
  const R = rand(seed);
  const plinth = 'M-24 590H134L144 656H-24Z';
  const spur = 'M239 596H252L266 656H239Z';
  const apron = 'M-24 640Q6 630 32 640T86 636T146 646L150 664H-24Z' + 'M236 642Q254 636 270 646T302 648V664H236Z';
  let rocks = '';
  const big: [number, number, number, number, number][] = [
    [-6, 640, 30, 16, 0], [36, 648, 26, 12, 1], [118, 650, 24, 11, 2], [146, 652, 12, 8, 0],
    [246, 646, 15, 10, 1], [268, 652, 12, 7, 2], [285, 656, 7, 4.5, 0],
  ];
  for (const [x, y, rx, ry, k] of big) rocks += rock(x, y, rx, ry, fills[k], hi, R);
  return (
    clip(plinth + spur, masonry(-24, 588, 272, 660, { ...s, h: 21, seed }) + shade('sD', -24, 604, 300, 56, 0.85) + form(-24, 588, 170, 70, 0.8)) +
    `<path d="${plinth}" fill="none" stroke-width="3"/><path d="${spur}" fill="none" stroke-width="3"/>` +
    // Sloped coping on top of the plinth, catching the light.
    litPath('M-24 582H134L140 593H-24Z', fills[2], { shadow: 2.5, light: 1.4, outline: 3 }) +
    litPath('M237 588H252L256 598H237Z', fills[2], { shadow: 2, light: 1.2, outline: 3 }) +
    shade('sU', -24, 593, 164, 10, 0.55) +
    `<g stroke-width="3">${p(apron, '#5c4a3a')}</g>` +
    `<g stroke-width="2.8">${rocks}</g>`
  );
}

/** Soft darkening that seats the wall on its plinth. */
export const footShade = shade('sD', -14, 540, 154, 44, 0.7) + shade('sD', 228, 560, 16, 30, 0.5);

/** The low hatch the wheel rolls out of: an arched frame, timber doors swung open, a threshold. */
export function sallyPort(frame: string, frameD: string): string {
  const d = 'M58 640V584Q58 556 92 556Q126 556 126 584V640Z';
  const inside = lin([[0, '#0c0907'], [1, '#2a1f17']], 90);
  return (
    `<defs>${inside.def}</defs>` +
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    hl('M53 640V586Q53 551 92 551', LIGHT, 1.6, 0.45) +
    hl('M131 640V586Q131 562 112 554', frameD, 2.5, 0.6) +
    `<path d="${d}" fill="${inside.url}" stroke-width="2.5"/>` +
    // A grille of iron bars, lit from the left.
    hl('M72 562V640M92 558V640M112 562V640M60 590H124', '#3a2c20', 4.5) +
    hl('M71 564V638M91 560V638M111 564V638M62 588.8H122', '#6c5b4a', 1.2, 0.7) +
    rivets([[72, 590], [92, 590], [112, 590]], 2, IRON) +
    litRect(52, 636, 80, 8, frameD, 2, { shadow: 2, light: 1.2, outline: 2.5 })
  );
}

/** The alcove behind the shrine slot, so the empty slot looks intended. */
export function alcove(frame: string, dark: string, line: string): string {
  const d = 'M46 346V292Q46 252 86 252Q126 252 126 292V346Z';
  const deep = lin([[0, tone(dark, -0.45)], [1, dark]], 90);
  return (
    `<defs>${deep.def}</defs>` +
    `<path d="${d}" fill="none" stroke-width="13"/>` +
    hl(d, frame, 7.5) +
    hl('M41 346V292Q41 247 86 247', LIGHT, 1.6, 0.5) +
    hl('M131 346V292Q131 262 112 252', tone(frame, -0.35), 2.5, 0.7) +
    `<path d="${d}" fill="${deep.url}" stroke-width="2.5"/>` +
    clip(d, hl('M44 346V292Q44 250 86 250Q128 250 128 292', SHADOW, 10, 0.5)) +
    hl('M118 346V296Q118 266 98 262', line, 2.5, 0.5)
  );
}

/** The dark shaft the stomper drops through. */
export function hoistBay(frame: string, line: string): string {
  return (
    litRect(52, 372, 68, 84, frame, 4, { shadow: 4, light: 2 }) +
    `<g stroke-width="2.5">${boards(60, 380, 52, 68, '#5a3e24', '#3f2b18', 13, 90)}</g>` +
    hl('M60 414H112', IRON, 5) +
    hl('M60 412.6H112', IRONL, 1.2, 0.7) +
    hl('M60 414H112', line, 1.5, 0.3) +
    shade('sU', 60, 380, 52, 28, 0.7)
  );
}

/** The ledge above the gate that carries the gate weapon. */
export function gateBrow(f: string, hi: string, trim = ''): string {
  return (
    litRect(128, 452, 122, 15, f, 4, { shadow: 3.5, light: 1.6 }) +
    hl('M134 456.5H244', hi, 2.5, 0.85) +
    (trim ? hl('M132 464H246', trim, 2.5) : '') +
    corbels(132, 244, 467, 9, 12, 12, f) +
    shade('sU', 132, 467, 112, 14, 0.55)
  );
}

/** The walkway at art y=346 that carries the shrine and the crossbow. */
export function deck(x1: number, f: string, hi: string, dark: string, trim = ''): string {
  return (
    litRect(-20, 346, x1 + 20, 13, f, 3, { shadow: 3.5, light: 1.6 }) +
    hl(`M-10 349.6H${x1 - 6}`, hi, 2.5, 0.9) +
    (trim ? hl(`M-10 357H${x1 - 6}`, trim, 2.5) : '') +
    corbels(-12, x1 - 12, 359, 12, 14, 18, dark) +
    shade('sU', -20, 359, x1 + 20, 16, 0.5)
  );
}

interface PlateStyle {
  f: string;
  hi: string;
  rivet: string;
  trim?: string;
}

function plate(x: number, y: number, w: number, h: number, s: PlateStyle): string {
  const inset = s.trim ? hl(rect(x + 4, y + 4, w - 8, h - 8), s.trim, 2) : '';
  return (
    litRect(x, y, w, h, s.f, 4, { shadow: 3, light: 1.5 }) +
    inset +
    hl(`M${x + 5} ${y + 3}H${x + w - 5}`, s.hi, 2, 0.8) +
    rivets([[x + 6, y + 7], [x + w - 6, y + 7], [x + 6, y + h - 6], [x + w - 6, y + h - 6]], 2.3, s.rivet)
  );
}

/** Backing plates in the tier's own material, so every mounted weapon is visibly fixed to this wall. */
export function slotPlates(s: PlateStyle, shrinePlate: boolean): string {
  return (
    plate(150, 276, 48, 70, s) +
    plate(160, 394, 52, 58, s) +
    plate(30, 356, 112, 21, s) +
    (shrinePlate ? plate(42, 298, 88, 48, s) : '')
  );
}
