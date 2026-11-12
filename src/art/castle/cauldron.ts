/**
 * The Great Cauldron: the pot for the road, its scaled copy on the rear ledge, the ledge itself, the cheese and the steam.
 * Back and front are separate pieces, so a raider can drop in between them.
 */
import { INK, MUST, MUSTL, CREAM, STONE, STONED, STONEL, IRON, IRONL, WHITE, GOLD, GOLDD, ink, r, c, e, p, n, hl, art, centred, litPath, litRect, rivets } from '../draw';
import { linear as lin, radial as rad, glint } from '../shade';
import { rand, fx, clip, litTubeBeam, stops, radial, SHADE_DEFS, shade, rock, masonry } from './kit';

// ---------------------------------------------------------------------------------------------
// Great Cauldron, rear position: 2.5D, behind the road, bolted to the castle
// ---------------------------------------------------------------------------------------------

/** Forged knee under the slab, bolted to its front face. */
const ledgeKnee = (x: number) =>
  litPath(`M${x} 170H${x + 34}V180L${x + 12} 198H${x}Z`, IRON, { shadow: 3, light: 1.2, lightColor: IRONL }) +
  hl(`M${x + 4} 174H${x + 30}`, IRONL, 2) +
  rivets([[x + 7, 177], [x + 26, 177], [x + 7, 191]], 1.9, '#5a5f66', '#1d2024');

export const potLedge = art(
  240,
  200,
  0,
  200,
  `<defs><radialGradient id="p">${stops([[0, '#1a120a', 0.6], [0.6, '#1a120a', 0.4], [1, '#1a120a', 0]])}</radialGradient></defs>` +
    SHADE_DEFS +
    ink(
      (() => {
        const top = 'M-10 132H176L198 160H-10Z';
        const front = 'M-10 160H198V176H-10Z';
        return (
          // A flat forged strap from a bolted wall plate out to a post on the slab's outer edge.
          litTubeBeam('M20 40L188 62', IRON, 6) +
          hl('M24 38L184 59', IRONL, 1.8) +
          litTubeBeam('M188 58V146', IRON, 6) +
          hl('M186 66V142', IRONL, 1.8) +
          // Wall plate with four bolts, left end tucked behind the keep.
          litRect(-2, 20, 34, 42, IRON, 3, { shadow: 3.5, light: 1.2, lightColor: IRONL }) +
          hl('M2 24H28', IRONL, 2) +
          rivets([[7, 30], [24, 30], [7, 52], [24, 52]], 2.5, '#5a5f66', '#1d2024') +
          litRect(177, 52, 22, 20, IRON, 3, { shadow: 3, light: 1, lightColor: IRONL }) +
          rivets([[183, 58], [193, 58], [183, 66], [193, 66]], 1.8, '#5a5f66', '#1d2024') +
          // Corbel course, forged knees and a shadow under the slab.
          r(-10, 176, 170, 12, STONED, 2) +
          r(-10, 188, 110, 12, STONED, 2) +
          hl('M-4 180H150M-4 192H90', STONE, 2.5, 0.8) +
          shade('sU', -10, 176, 180, 24, 1) +
          clip(front, masonry(-10, 158, 200, 178, { h: 14, base: '#7f7969', fills: [STONE, '#aca696', '#8e8878'], line: '#6a6559', hi: '#d6d0bd', seed: 77 })) +
          `<path d="${front}" fill="none"/>` +
          ledgeKnee(26) +
          ledgeKnee(124) +
          litPath(top, STONEL, { shadow: 3, light: 1.5, lightColor: '#e2dccb' }) +
          n('M-6 136H168L176 146H-6Z', '#d6d0bd', 0.75) +
          hl('M24 136L18 160M70 136L66 160M116 136L118 160M156 136L164 158M-6 148H192', '#8e8878', 2, 0.7) +
          // The pot's contact shadow on the slab.
          `<ellipse cx="97" cy="152" rx="76" ry="11" fill="url(#p)" stroke="none"/>` +
          litRect(177, 142, 22, 12, IRON, 3, { shadow: 2.5, light: 1, lightColor: IRONL }) +
          rivets([[182, 148], [194, 148]], 1.8, '#5a5f66', '#1d2024')
        );
      })(),
    ),
);

// ---------------------------------------------------------------------------------------------
// The Great Cauldron, drawn once for the road (150x90) and scaled for the rear ledge.
// Figures are drawn between the back piece and the front piece.
// ---------------------------------------------------------------------------------------------

/** Back half of the rim, the inside wall lit by the cheese, and the bubbling cheese itself. */
export function potBack(w = 3.5): string {
  const melt = rad([[0, '#ffe896'], [0.5, MUSTL], [1, MUST]], 0.42, 0.35, 0.65);
  const bubble = (x: number, y: number, rr: number) =>
    litPath(`M${x - rr} ${y}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`, MUSTL, { outline: 2.2, shadow: fx(rr * 0.35), light: 0, shadowColor: MUST }) +
    hl(`M${fx(x - rr * 0.6)} ${fx(y - rr * 0.1)}a${fx(rr * 0.6)} ${fx(rr * 0.6)} 0 0 1 ${fx(rr * 0.5)} ${fx(-rr * 0.5)}`, '#fffbe6', fx(Math.max(1, rr * 0.25)), 0.95);
  return (
    `<defs>${melt.def}</defs>` +
    ink(
      litPath('M4 38a71 25 0 1 1 142 0a71 25 0 1 1 -142 0Z', IRON, { outline: 4, shadow: 0, light: 2.5, lightColor: IRONL }) +
        e(75, 42, 62, 18, '#1d1712') +
        // The far inner wall catches the warm light of the melt.
        n('M13 42a62 18 0 0 1 124 0Q75 26 13 42Z', '#6a4524', 0.8) +
        `<path d="M16 46C34 32 116 32 134 46C118 62 34 62 16 46Z" fill="${melt.url}"/>` +
        n('M34 44C54 37 96 37 116 44C96 49 54 49 34 44Z', '#fff2b8', 0.55) +
        hl('M24 47C40 54 64 56 80 55', GOLD, 1.6, 0.6) +
        hl('M30 41a6 2 0 0 1 10 0M106 46a5 1.8 0 0 1 9 0', MUST, 1.4, 0.8) +
        bubble(52, 44, 7) + bubble(96, 42, 10) + bubble(74, 50, 5) + bubble(116, 47, 3.5) +
        bubble(82, 12, 4) + bubble(58, 22, 3) +
        hl('M10 33Q75 8 140 33', '#a9b0b8', 1.4, 0.7) +
        glint(36, 19, 1.4),
      w,
    )
  );
}

/** Front of the pot: hammered iron with dents and glints, soot towards the bottom, cheese drips. */
export function potFront(stand: 'stones' | 'legs', w = 3.5): string {
  const R = rand(stand === 'stones' ? 41 : 42);
  const belly = 'M8 44C6 66 22 80 42 84H108C128 80 144 66 142 44C118 74 32 74 8 44Z';
  const rimD = 'M4 40C24 72 126 72 146 40C150 50 148 56 142 58C118 84 32 84 8 58C2 56 0 50 4 40Z';
  const iron = lin([[0, '#6d737a'], [0.45, IRON], [1, '#24262a']], 70);
  const soot = lin([[0, '#141210', 0], [1, '#141210', 0.7]], 90);
  let dentsL = '';
  let dentsD = '';
  for (let i = 0; i < 16; i++) {
    const x = 18 + R() * 114;
    const y = 64 + R() * 18;
    const rr = 3 + R() * 3;
    dentsL += `M${fx(x - rr)} ${fx(y)}a${fx(rr)} ${fx(rr * 0.6)} 0 0 1 ${fx(rr * 1.4)} ${fx(-rr * 0.5)}`;
    dentsD += `M${fx(x - rr * 0.3)} ${fx(y + rr * 0.55)}a${fx(rr)} ${fx(rr * 0.6)} 0 0 0 ${fx(rr * 1.3)} ${fx(-rr * 0.6)}`;
  }
  const drip = (d: string, hx: number, hy: number) => litPath(d, MUST, { outline: w, shadow: 2, light: 1, lightColor: '#ffe896' }) + glint(hx, hy, 1.1);
  const base =
    stand === 'stones'
      ? (() => {
          const glow = rad([[0, '#ffb347', 0.85], [0.5, '#ff8a2a', 0.35], [1, '#ff8a2a', 0]]);
          return (
            `<defs>${glow.def}</defs>` +
            [[45, 84], [75, 85], [105, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="5" fill="${glow.url}" stroke="none"/>`).join('') +
            `<g stroke-width="2.8">` +
            rock(14, 75, 12, 7, STONE, STONEL, R) +
            rock(136, 75, 12, 7, STONED, STONEL, R) +
            rock(31, 81, 16, 7, STONED, STONEL, R) +
            rock(59, 82, 16, 6, STONE, STONEL, R) +
            rock(92, 82, 16, 6, STONED, STONEL, R) +
            rock(120, 81, 16, 7, STONE, STONEL, R) +
            `</g>` +
            hl('M44 86h.01M76 87h.01M106 86h.01', '#ffe08a', 2.2, 0.95)
          );
        })()
      : litRect(24, 78, 14, 9, IRON, 2, { outline: w, shadow: 2, light: 1, lightColor: IRONL }) +
        litRect(112, 78, 14, 9, IRON, 2, { outline: w, shadow: 2, light: 1, lightColor: IRONL }) +
        litPath('M22 83a20 4.5 0 1 0 40 0a20 4.5 0 1 0 -40 0Z', STONED, { outline: w, shadow: 1.5, light: 0.8 }) +
        litPath('M88 83a20 4.5 0 1 0 40 0a20 4.5 0 1 0 -40 0Z', STONED, { outline: w, shadow: 1.5, light: 0.8 });
  return (
    `<defs>${iron.def}${soot.def}</defs>` +
    ink(
      (stand === 'legs' ? base : '') +
        `<path d="${belly}" fill="${iron.url}"/>` +
        clip(belly, hl(dentsL, '#9aa1a9', 1.3, 0.55) + hl(dentsD, '#1b1d20', 1.3, 0.5) + `<rect x="0" y="66" width="150" height="20" fill="${soot.url}" stroke="none"/>`) +
        `<path d="${belly}" fill="none"/>` +
        hl('M24 70C44 80 62 81 76 81', '#9aa1a9', 2.5, 0.8) +
        glint(30, 72, 1.5) +
        litPath(rimD, IRONL, { outline: w, shadow: 3, light: 1.4, lightColor: '#b8bfc6' }) +
        hl('M10 47C32 68 118 68 140 47', '#d6dbe0', 1.2, 0.6) +
        glint(22, 55, 1.6) +
        glint(118, 66, 1) +
        drip('M34 66C34 76 38 84 42 84C46 84 46 74 50 72Z', 38, 74) +
        drip('M100 70C102 78 106 80 108 80C112 80 112 72 116 64Z', 106, 72) +
        (stand === 'stones' ? base : ''),
      w,
    )
  );
}

export const cauldronShadow =
  `<defs><radialGradient id="cs"><stop offset="0" stop-color="#1a120a" stop-opacity=".55"/><stop offset=".7" stop-color="#1a120a" stop-opacity=".3"/><stop offset="1" stop-color="#1a120a" stop-opacity="0"/></radialGradient></defs>` +
  `<ellipse cx="78" cy="81" rx="68" ry="8" fill="url(#cs)"/>`;

export const potRearBack = art(150, 100, 75, 100, `<g transform="translate(75 100)scale(.8)translate(-75 -90)">${potBack(4)}</g>`);
export const potRearFront = art(150, 100, 75, 100, `<g transform="translate(75 100)scale(.8)translate(-75 -90)">${potFront('legs', 4)}</g>`);


export const cheese = centred(
  70,
  60,
  ink(
    p('M32 8C12 8 5 14 5 20V42C5 50 18 56 32 56C40 56 46 55 50 52V36L32 20L58 18C57 12 48 8 32 8Z', MUSTL) +
      p('M32 8C12 8 5 14 5 20C5 25 18 32 32 32V20L58 18C57 12 48 8 32 8Z', CREAM) +
      p('M32 20L50 36V52L32 44Z', MUST) +
      n('M47 41a3.2 3 0 1 0 .1 0Z', GOLDD, 0.5) +
      n('M12 26a2.6 2 0 1 0 .1 0ZM44 13a2.4 1.8 0 1 0 .1 0ZM24 12a2 1.4 0 1 0 .1 0Z', MUSTL) +
      c(17, 38, 2, INK) +
      c(29, 40, 2, INK) +
      hl('M15 45q8 7 16 2', INK, 2.2) +
      n('M9 46a2 1.6 0 1 0 .1 0Z', GOLD, 0.7),
    3,
  ),
);

export const steam = centred(
  60,
  60,
  `<defs>${radial('s', [[0, WHITE, 0.85], [0.55, WHITE, 0.45], [1, WHITE, 0]])}</defs>` +
    `<circle cx="22" cy="36" r="17" fill="url(#s)"/><circle cx="36" cy="24" r="20" fill="url(#s)"/><circle cx="40" cy="40" r="15" fill="url(#s)"/>`,
);
