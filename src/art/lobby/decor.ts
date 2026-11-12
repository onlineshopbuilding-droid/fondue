/**
 * The throne and everything that makes the hall grander as the campaign goes on: rug, banners,
 * trophy shields, chandeliers, stacks of won cheese, a gilded throne, golden forks and a garland.
 * Which piece shows from which level is decided in src/render/lobby/layout.ts (DECOR).
 */
import { INK, RED, REDL, RUST, RUSTD, MUST, MUSTL, CREAM, FOREST, TEAL, TEALD, WOOD, WOODD, WOODL, IRON, IRONL, GOLD, WHITE, l, hl, art, centred } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxCirc, fxEll, fxRect, fxRivet } from '../props/kit';

/** The throne: a tall carved back with a cheese-wheel crest; `gold` gilds it for the late campaign. */
function throne(gold: boolean): Art {
  const wood = gold ? MUST : WOOD;
  const woodL = gold ? MUSTL : WOODL;
  const cloth = gold ? '#8e2a6a' : RUSTD;
  const BACK = 'M50 340V80Q50 30 140 18Q230 30 230 80V340Z';
  const PANEL = 'M74 300V92Q74 54 140 44Q206 54 206 92V300Z';
  const SEAT = fxRect(30, 228, 220, 34, 8);
  const ARM_L = fxRect(14, 180, 52, 30, 10);
  const ARM_R = fxRect(214, 180, 52, 30, 10);
  const crest = sh.lit(fxCirc(140, 36, 26), MUSTL, { outline: 4, shadow: 4, light: 2, shadowColor: MUST }) +
    sh.paint('M140 36L140 10A26 26 0 0 1 164 26Z', '#fff0b0') +
    [[130, 44], [150, 30], [146, 48]].map(([x, y]) => sh.paint(fxCirc(x, y, 3.5), GOLD)).join('');
  return centred(280, 340,
    sh.lit(BACK, wood, { outline: 4, shadow: 12, light: 4, lightColor: woodL }) +
    sh.lit(PANEL, cloth, { outline: 3.5, shadow: 8, light: 3 }) +
    sh.within(PANEL, sh.stroke('M90 80V300M140 60V300M190 80V300', sh.tone(cloth, -0.25), 3, 0.6)) +
    crest +
    sh.lit('M18 210V330H54V210ZM226 210V330H262V210Z', sh.tone(wood, -0.15), { outline: 4, shadow: 5, light: 2 }) +
    sh.lit(ARM_L, woodL, { outline: 4, shadow: 4, light: 2 }) + sh.lit(ARM_R, woodL, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(SEAT, cloth, { outline: 4, shadow: 5, light: 2 }) +
    sh.lit(fxRect(40, 256, 200, 24, 6), wood, { outline: 4, shadow: 4, light: 2, lightColor: woodL }) +
    (gold ? [70, 140, 210].map((x) => sh.lit(fxCirc(x, 268, 6), RED, { outline: 2.5, shadow: 1.5, light: 1, lightColor: REDL })).join('') + sh.stroke('M60 96Q140 64 220 96', MUSTL, 4, 0.9) : fxRivet(70, 268, 3) + fxRivet(210, 268, 3)),
  );
}

export const throneArt = throne(false);
export const throneGold = throne(true);

/** A long red rug with a golden border, in front of the dais. */
export const rug: Art = centred(460, 80,
  sh.lit('M20 10H440L456 70H4Z', RED, { outline: 4, shadow: 6, light: 2, lightColor: REDL }) +
  sh.stroke('M30 20H430L442 60H18Z', MUST, 4, 0.9) +
  sh.stroke('M4 70l-4 8M24 70l-2 8M44 70l-1 8M416 70l1 8M436 70l2 8M456 70l4 8', MUSTL, 3),
);

/** A hanging banner in the keep's colours with a cheese emblem. */
export const banner: Art = centred(96, 200,
  l('M6 6H90', 8, INK) + hl('M6 6H90', WOODL, 4) +
  sh.lit('M14 8H82V184L48 160L14 184Z', TEAL, { outline: 4, shadow: 7, light: 3 }) +
  sh.stroke('M24 20V164M72 20V164', TEALD, 3, 0.7) +
  sh.lit('M30 106Q30 76 48 70L74 96Q70 108 48 110Q30 110 30 106Z', MUSTL, { outline: 3, shadow: 3, light: 1.5, shadowColor: MUST }) +
  [[42, 96], [54, 90], [60, 102]].map(([x, y]) => sh.paint(fxCirc(x, y, 3), GOLD)).join('') +
  sh.stroke('M14 40H82M14 136H82', MUST, 3.5, 0.9),
);

/** A trophy: a dented mouse-knight helmet with round ears on a wooden shield. */
export const trophyShield: Art = centred(120, 130, `<g transform="translate(9 10) scale(.85)">` +
  sh.lit('M10 12H110V64Q110 106 60 124Q10 106 10 64Z', WOOD, { outline: 4, shadow: 7, light: 3, lightColor: WOODL }) +
  sh.stroke('M18 20H102V64Q102 100 60 116Q18 100 18 64Z', WOODD, 3, 0.6) +
  sh.lit(fxCirc(36, 34, 13), '#c9a7a0', { outline: 3.5, shadow: 3, light: 1.5 }) +
  sh.lit(fxCirc(84, 34, 13), '#c9a7a0', { outline: 3.5, shadow: 3, light: 1.5 }) +
  sh.lit('M32 86V60Q32 36 60 36Q88 36 88 60V86Z', IRON, { outline: 4, shadow: 5, light: 2.5, lightColor: IRONL }) +
  l('M40 62H80', 5, INK) + sh.stroke('M66 44l-6 8', IRONL, 2.5) +
  sh.lit('M60 36V20L72 24Z', RED, { outline: 3, shadow: 1.5, light: 1 }) + '</g>',
);

/** A wooden ring chandelier with candles; hangs from the ceiling (anchor at the top). */
export const chandelier: Art = art(240, 130, 120, 0, `<g transform="translate(0 -30)">` +
  l('M120 30V60M120 60L40 112M120 60L200 112', 4, INK) +
  sh.lit(fxEll(120, 118, 96, 16), WOOD, { outline: 4, shadow: 4, light: 2, lightColor: WOODL }) +
  [36, 78, 120, 162, 204].map((x) =>
    sh.lit(fxRect(x - 6, 82, 12, 30, 3), CREAM, { outline: 3, shadow: 2, light: 1 }) +
    `<path d="M${x} 82C${x - 7} 74 ${x - 2} 66 ${x} 60C${x + 2} 66 ${x + 7} 74 ${x} 82Z" fill="#ffd27a" stroke="${INK}" stroke-width="2.5"/>`,
  ).join('') +
  sh.lit(fxCirc(120, 140, 10), MUST, { outline: 3, shadow: 2, light: 1 }) + '</g>',
);

/** Cheese won back from the mice, stacked beside the dais. */
export const cheeseStack: Art = (() => {
  const wheel = (cx: number, cy: number, rx: number) =>
    sh.lit(`M${cx - rx} ${cy}V${cy + 22}Q${cx} ${cy + 36} ${cx + rx} ${cy + 22}V${cy}Z`, MUST, { outline: 3.5, shadow: 4, light: 1.5 }) +
    sh.lit(fxEll(cx, cy, rx, rx * 0.32), MUSTL, { outline: 3.5, shadow: 2, light: 1, shadowColor: MUST });
  return centred(120, 120,
    wheel(60, 70, 52) + wheel(60, 40, 40) +
    sh.lit('M40 22L60 6L84 20Q66 32 40 22Z', MUSTL, { outline: 3, shadow: 2, light: 1, shadowColor: MUST }) +
    [[44, 90], [74, 96], [58, 58]].map(([x, y]) => sh.paint(fxCirc(x, y, 3.5), GOLD)).join(''),
  );
})();

/** Two golden fondue forks crossed above the throne. */
export const goldenForks: Art = centred(220, 120,
  ['M20 110L190 16', 'M200 110L30 16'].map((d) => l(d, 9, INK) + hl(d, MUSTL, 5)).join('') +
  sh.lit('M182 6L204 4L198 28Z', MUST, { outline: 3, shadow: 2, light: 1 }) +
  sh.lit('M38 6L16 4L22 28Z', MUST, { outline: 3, shadow: 2, light: 1 }) +
  sh.lit(fxCirc(110, 64, 12), RED, { outline: 3, shadow: 2, light: 1.5, lightColor: REDL }),
);

/** Victory: bunting in the keep's colours across the hall (anchor at the top). */
export const garland: Art = (() => {
  const cols = [RED, MUSTL, TEAL, CREAM, FOREST, RUST];
  let flags = '';
  for (let i = 0; i < 28; i++) {
    const x = 20 + i * 56;
    const y = 56 + Math.sin((i / 27) * Math.PI) * 40;
    flags += sh.lit(`M${x - 18} ${sh.r1(y)}H${x + 18}L${x} ${sh.r1(y + 34)}Z`, cols[i % cols.length], { outline: 3, shadow: 2, light: 1 });
  }
  return art(1600, 140, 800, 0,
    l('M0 50Q800 140 1600 50', 4, INK) + flags +
    sh.paint(fxCirc(300, 20, 4), WHITE) + sh.paint(fxCirc(1300, 20, 4), WHITE),
  );
})();

/** The cloth banner above the throne that carries the game's name (written by the scene). */
export const nameBanner: Art = centred(420, 110,
  l('M10 8H410', 8, INK) + hl('M10 8H410', WOODL, 4) +
  sh.lit('M24 10H396V84L410 104H10L24 84Z', RUSTD, { outline: 4, shadow: 7, light: 3 }) +
  sh.stroke('M30 20H390M30 78H390', MUST, 3, 0.9) +
  sh.paint(fxRect(36, 26, 348, 46, 6), sh.tone(RUSTD, -0.2), 0.4) +
  sh.lit(fxCirc(10, 8, 7), GOLD, { outline: 3, shadow: 1.5, light: 1, lightColor: MUSTL }) +
  sh.lit(fxCirc(410, 8, 7), GOLD, { outline: 3, shadow: 1.5, light: 1, lightColor: MUSTL }),
);
