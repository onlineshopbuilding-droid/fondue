/**
 * The objects in the lobby that open something: each one is a station (see
 * src/render/lobby/layout.ts). Every picture is centred on its station point.
 */
import { INK, RUST, RUSTD, MUST, MUSTL, CREAM, FOREST, TEAL, WOOD, WOODD, WOODL, IRON, IRONL, GOLD, GOLDD, RED, WHITE, l, hl, centred } from '../draw';
import * as sh from '../shade';
import type { Art } from '../types';
import { fxCirc, fxRect, fxRivet } from '../props/kit';

const COPPER = '#c0703a';
const COPPERL = '#e49a5e';
const SLATE = '#3c4a4c';
const PARCH = '#efdcae';

/** Options: a round oak plaque with a brass cogwheel. */
export const cogPlaque: Art = (() => {
  const teeth: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = 70 + Math.cos(a) * 36;
    const y = 70 + Math.sin(a) * 36;
    teeth.push(`<rect x="${sh.r1(x - 8)}" y="${sh.r1(y - 8)}" width="16" height="16" rx="3" transform="rotate(${sh.r1((a * 180) / Math.PI)} ${sh.r1(x)} ${sh.r1(y)})"/>`);
  }
  return centred(140, 140,
    sh.lit(fxCirc(70, 70, 62), WOOD, { outline: 4, shadow: 7, light: 3 }) +
    sh.stroke(fxCirc(70, 70, 52), WOODD, 3, 0.7) +
    `<g fill="${MUST}" stroke="${INK}" stroke-width="3.5">${teeth.join('')}</g>` +
    sh.lit(fxCirc(70, 70, 34), MUST, { outline: 3.5, shadow: 5, light: 2.5, lightColor: MUSTL }) +
    sh.lit(fxCirc(70, 70, 12), WOODD, { outline: 3.5, shadow: 2, light: 0 }) +
    fxRivet(70, 16, 3) + fxRivet(70, 124, 3),
  );
})();

/** Storybook: a shelf of books; the red one with the golden star is the storybook. */
export const storybook: Art = (() => {
  const book = (x: number, w: number, h: number, col: string, tilt = 0) =>
    `<g transform="rotate(${tilt} ${x + w / 2} 120)">` +
    sh.lit(fxRect(x, 120 - h, w, h, 3), col, { outline: 3.5, shadow: 4, light: 2 }) +
    sh.stroke(`M${x + 3} ${126 - h}H${x + w - 3}M${x + 3} ${112}H${x + w - 3}`, MUSTL, 2, 0.8) + '</g>';
  const STAR = 'M101 62L105 72L116 72L107 79L111 90L101 83L91 90L95 79L86 72L97 72Z';
  return centred(200, 150,
    sh.lit(fxRect(4, 118, 192, 16, 4), WOOD, { outline: 4, shadow: 4, light: 2 }) +
    l('M24 134L36 148M176 134L164 148', 7, INK) + hl('M24 134L36 148M176 134L164 148', WOODD, 3.5) +
    book(16, 22, 70, TEAL) + book(40, 18, 60, FOREST, -4) + book(130, 20, 66, '#6b3a5e') + book(152, 24, 56, WOODL, 8) +
    // The storybook itself, a little bigger, with a star on its cover.
    sh.lit(fxRect(70, 34, 60, 86, 5), RED, { outline: 4, shadow: 6, light: 3 }) +
    sh.stroke('M76 40V114', RUSTD, 4, 0.8) +
    sh.lit(STAR, MUST, { outline: 3, shadow: 2, light: 1.2, lightColor: MUSTL }) +
    sh.lit(fxRect(178, 96, 16, 22, 5), '#e8d38a', { outline: 3, shadow: 2, light: 1 }),
  );
})();

/** Help: a parchment scroll hanging from a nail, with a big question mark. */
export const helpScroll: Art = centred(110, 160,
  l('M55 6L30 30M55 6L80 30', 4, INK) + fxRivet(55, 8, 4) +
  sh.lit(fxRect(18, 26, 74, 14, 7), WOODL, { outline: 3.5, shadow: 2, light: 1 }) +
  sh.lit('M24 36H86V132Q70 140 55 132Q40 124 24 132Z', PARCH, { outline: 3.5, shadow: 5, light: 2 }) +
  `<text x="55" y="112" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="72" fill="${RUST}" stroke="${INK}" stroke-width="2.5">?</text>` +
  sh.lit(fxRect(18, 128, 74, 14, 7), WOODL, { outline: 3.5, shadow: 2, light: 1 }),
);

/** Campaign: a heavy table with the war map, a dotted path, pins and a little flag. */
export const mapTable: Art = (() => {
  const TOP = 'M18 64L46 30H234L262 64Z';
  const MAP = 'M58 58L74 36H208L224 58Z';
  const path = 'M84 52Q104 38 122 48T160 44T206 40';
  const flag = sh.lit('M206 40V14L224 20L206 26', RED, { outline: 3, shadow: 1.5, light: 1 });
  return centred(280, 170,
    sh.lit('M40 70V160H58V70ZM222 70V160H240V70Z', WOODD, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(fxRect(30, 62, 220, 26, 5), WOOD, { outline: 4, shadow: 5, light: 2 }) +
    sh.lit(TOP, WOODL, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(MAP, PARCH, { outline: 3, shadow: 3, light: 1.5 }) +
    sh.within(MAP, sh.paint('M74 58L98 38L120 58Z', '#a9b7c8', 0.9) + sh.paint('M150 58L176 36L196 58Z', '#a9b7c8', 0.9) + sh.paint('M60 56Q140 46 222 56V60H60Z', '#8fb07a', 0.8)) +
    `<path d="${path}" fill="none" stroke="${RUSTD}" stroke-width="2.6" stroke-dasharray="4 4" stroke-linecap="round"/>` +
    [[84, 52], [122, 48], [160, 44]].map(([x, y]) => sh.lit(fxCirc(x, y, 4), MUST, { outline: 2, shadow: 1, light: 0.6 })).join('') +
    flag + l('M206 42V14', 3, INK) +
    sh.lit(fxRect(110, 96, 60, 28, 6), MUST, { outline: 3.5, shadow: 3, light: 1.5, lightColor: MUSTL }),
  );
})();

/** Endless: the great copper fondue pot on its iron stand over the fire. */
export const pot: Art = (() => {
  const BODY = 'M44 56Q40 120 120 124Q200 120 196 56Z';
  const RIM = fxRect(30, 40, 180, 26, 12);
  const flames = 'M84 150C70 138 80 124 90 118C90 128 96 128 98 122C104 132 110 140 102 150ZM118 152C104 136 114 116 124 108C126 122 132 120 134 112C144 128 148 142 136 152ZM152 150C142 140 148 128 156 122C158 130 162 130 164 126C170 136 170 146 162 150Z';
  return centred(240, 160,
    l('M58 112L36 156M182 112L204 156', 9, INK) + hl('M58 112L36 156M182 112L204 156', IRONL, 4.5) +
    `<path d="${flames}" fill="#f08a2c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    sh.paint('M96 146C92 138 98 132 104 130C106 138 110 140 106 146ZM122 148C118 136 124 128 130 124C132 134 138 140 132 148Z', '#ffe08a') +
    sh.lit(BODY, COPPER, { outline: 4, shadow: 12, light: 4, lightColor: COPPERL }) +
    sh.stroke('M60 74Q120 92 180 74', sh.tone(COPPER, -0.25), 4, 0.7) +
    sh.lit(RIM, COPPERL, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit('M40 48Q120 30 200 48Q120 62 40 48Z', MUSTL, { outline: 3, shadow: 3, light: 0, shadowColor: MUST }) +
    sh.paint('M70 44Q90 40 100 46', WHITE, 0.6) +
    l('M30 52Q10 50 12 66M210 52Q230 50 228 66', 7, INK) + hl('M30 52Q10 50 12 66M210 52Q230 50 228 66', IRONL, 3.5) +
    // A long fork with a bread cube, resting in the pot.
    l('M150 44L188 12', 6, INK) + hl('M150 44L188 12', IRONL, 3) +
    sh.lit(fxRect(180, 4, 18, 16, 3), '#e9c27a', { outline: 3, shadow: 2, light: 1 }),
  );
})();

/** Credits: a gilded painting of the keep under the mountains. */
export const painting: Art = (() => {
  const IN = fxRect(22, 22, 116, 86, 3);
  const sky = sh.linear([[0, '#8cc0e0'], [1, '#e7f1ea']], 90);
  return centred(160, 130,
    `<defs>${sky.def}</defs>` +
    sh.lit(fxRect(6, 6, 148, 118, 8), GOLD, { outline: 4, shadow: 6, light: 3, lightColor: MUSTL }) +
    sh.stroke(fxRect(14, 14, 132, 102, 5), GOLDD, 2.5, 0.8) +
    `<path d="${IN}" fill="${sky.url}"/>` +
    sh.within(IN,
      sh.paint('M22 80L56 40L78 66L102 34L138 78V108H22Z', '#8b9bb3') + sh.paint('M56 40L48 52L60 50ZM102 34L94 48L106 46Z', WHITE) +
      sh.paint('M22 90Q80 76 138 92V108H22Z', '#6f9a5c') +
      sh.lit(fxRect(58, 66, 26, 30, 2), WOOD, { outline: 2.5, shadow: 2, light: 1 }) + sh.lit('M56 68L71 54L86 68Z', RUST, { outline: 2.5, shadow: 2, light: 1 })) +
    `<path d="${IN}" fill="none" stroke="${INK}" stroke-width="3"/>`,
  );
})();

/** Scores: a chalk slate with tally marks and a star. */
export const slate: Art = centred(140, 120,
  sh.lit(fxRect(6, 6, 128, 108, 8), WOOD, { outline: 4, shadow: 5, light: 2 }) +
  sh.lit(fxRect(18, 18, 104, 84, 4), SLATE, { outline: 3, shadow: 4, light: 1.5 }) +
  sh.stroke('M30 34v26M38 34v26M46 34v26M54 34v26M26 52L60 40M74 34v26M82 34v26M90 34v26', '#eef2ee', 3, 0.9) +
  sh.stroke('M30 76H66M30 88H54', '#eef2ee', 3, 0.7) +
  `<path d="M100 70L104 80L115 80L106 86L110 97L100 90L90 97L94 86L85 80L96 80Z" fill="none" stroke="${MUSTL}" stroke-width="3" stroke-linejoin="round"/>`,
);

/** Co-op: a feast table for two, with mugs, bread and a cheese wheel. */
export const feastTable: Art = (() => {
  const mug = (x: number) => sh.lit(fxRect(x, 36, 26, 32, 4), WOODL, { outline: 3.5, shadow: 3, light: 1.5 }) +
    l(`M${x + 26} 44Q${x + 38} 52 ${x + 26} 60`, 5, INK) + sh.paint(`M${x + 3} 36Q${x + 13} 28 ${x + 23} 36Z`, CREAM);
  const stool = (x: number) => sh.lit(fxRect(x, 92, 54, 14, 5), WOOD, { outline: 3.5, shadow: 3, light: 1.5 }) +
    l(`M${x + 10} 106L${x + 4} 140M${x + 44} 106L${x + 50} 140`, 7, INK) + hl(`M${x + 10} 106L${x + 4} 140M${x + 44} 106L${x + 50} 140`, WOODD, 3.5);
  return centred(280, 150,
    stool(8) + stool(218) +
    sh.lit('M48 74V140H64V74ZM216 74V140H232V74Z', WOODD, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(fxRect(30, 64, 220, 20, 5), WOOD, { outline: 4, shadow: 5, light: 2 }) +
    mug(62) + mug(192) +
    sh.lit('M108 66Q110 40 140 40Q170 40 172 66Z', MUST, { outline: 3.5, shadow: 4, light: 2, lightColor: MUSTL }) +
    sh.paint('M150 66L156 46L170 66Z', '#f6dd8a') +
    [[124, 56], [140, 50], [132, 62]].map(([x, y]) => sh.paint(fxCirc(x, y, 3), GOLD)).join('') +
    sh.lit(fxRect(90, 54, 22, 14, 6), '#d9a35a', { outline: 3, shadow: 2, light: 1 }),
  );
})();

/** Armoury: a stand with a round shield, crossed spears and the big leather glove. */
export const armourStand: Art = (() => {
  const GLOVE = 'M52 150C46 120 50 104 58 96V74Q58 66 65 66Q72 66 72 74V92V62Q72 54 79 54Q86 54 86 62V90V58Q86 50 93 50Q100 50 100 58V92V68Q100 60 107 60Q114 60 114 68V120Q114 146 92 156Q70 162 52 150Z';
  return centred(160, 270,
    l('M24 30L136 250M136 30L24 250', 7, INK) + hl('M24 30L136 250M136 30L24 250', WOODD, 3.5) +
    sh.lit('M18 18L30 40L36 26ZM142 18L130 40L124 26Z', IRONL, { outline: 3, shadow: 1.5, light: 1 }) +
    sh.lit(fxRect(70, 30, 20, 220, 4), WOOD, { outline: 4, shadow: 4, light: 2 }) +
    sh.lit(fxRect(30, 244, 100, 20, 6), WOODD, { outline: 4, shadow: 3, light: 1.5 }) +
    sh.lit(fxCirc(80, 196, 44), RUST, { outline: 4, shadow: 7, light: 3 }) +
    sh.stroke(fxCirc(80, 196, 34), MUST, 5) + sh.lit(fxCirc(80, 196, 12), IRON, { outline: 3, shadow: 2, light: 1, lightColor: IRONL }) +
    `<g transform="translate(14 -36)">${sh.lit(GLOVE, '#c58b57', { outline: 4, shadow: 7, light: 3 })}` +
    sh.lit(fxRect(52, 140, 64, 22, 6), RUSTD, { outline: 3.5, shadow: 3, light: 1.5 }) + '</g>',
  );
})();
