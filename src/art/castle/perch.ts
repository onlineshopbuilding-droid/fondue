/**
 * The Eagle Perch: the hook on its chain and the great eagle's head and neck.
 * The head comes with the beak open and shut.
 */
import { INK, WOOD, WOODD, IRON, IRONL, WHITE, GOLD, GOLDD, ink, r, c, p, n, hl, art, litPath, litRect, rivets, grain, tubeFast as litTube } from '../draw';
import { glint } from '../shade';
import { rect, clip, linear, SHADOW } from './kit';

// ---------------------------------------------------------------------------------------------
// Eagle Perch, new form: a hook on a chain and the great eagle's head and neck
// ---------------------------------------------------------------------------------------------

/** Period 120: oval links at 30 and 90, edge-on links across the seam at 0, 60 and 120. */
export const hookChain = art(
  34,
  120,
  17,
  0,
  ink(
    [0, 60, 120].map((y) => r(13, y - 21, 8, 42, IRON, 4)).join('') +
      hl('M15 -12V12M15 48V72M15 108V132', '#a9b0b8', 1.6) +
      hl('M19.5 -14V14M19.5 46V74M19.5 106V134', '#25282c', 1.4, 0.8) +
      [30, 90]
        .map(
          (y) =>
            `<ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke-width="10"/><ellipse cx="17" cy="${y}" rx="12" ry="24" fill="none" stroke="${IRONL}" stroke-width="5"/>` +
            // Upper-left of each ring catches the light, lower-right rolls into shade.
            hl(`M7 ${y + 4}C6 ${y - 12} 12 ${y - 22} 19 ${y - 22}`, '#e3e8ec', 1.6, 0.85) +
            hl(`M27 ${y - 4}C28 ${y + 12} 22 ${y + 22} 15 ${y + 22}`, '#3d4147', 1.8, 0.8) +
            glint(9, y - 8, 1),
        )
        .join(''),
    2.5,
  ),
);

export const perchHook = art(
  110,
  130,
  55,
  0,
  ink(
    litPath('M30 2H80L74 22H36Z', WOOD, { shadow: 3.5, light: 1.5 }) +
      grain(36, 8, 74, 18, WOODD, 61, 2, false, 0.6) +
      litRect(44, 0, 22, 14, IRON, 2, { shadow: 3, light: 1, lightColor: IRONL }) +
      rivets([[49, 7], [61, 7]], 1.8, '#5a5f66', '#1d2024') +
      litRect(49, 18, 12, 16, IRON, 3, { shadow: 3, light: 1, lightColor: IRONL }) +
      litTube('M55 32C78 38 88 62 80 86C72 112 42 118 26 104C18 96 18 84 24 78', 9.5, IRON, { outline: 2.75, lightColor: IRONL }) +
      hl('M63 38C78 46 82 66 76 84', '#c4cad0', 2.2, 0.9) +
      hl('M30 98C40 108 58 108 68 98', '#2c2f35', 1.5, 0.7) +
      glint(70, 50, 1.6) +
      litPath('M15 76L33 72L26 94Z', IRONL, { shadow: 2.5, light: 1, lightColor: '#d6dbe0' }) +
      glint(21, 78, 1),
    3.5,
  ),
);

/** Eagle head and neck facing left. Beak anchor at art (20, 120). */
export function eagleHead(open: boolean): string {
  const PALE = '#f2ead6';
  const PALED = '#c9bb9b';
  const CROWN = '#5a3a1e';
  const BEAK = '#f0d67a';
  const BEAKD = '#c9a24a';
  // Everything but the beak sits 34px further left than it is drawn here.
  const neck =
    'M196 44C290 26 410 34 620 14V210L590 200L576 214L548 202L534 216L512 196L500 210L470 198L456 214L428 200L412 216L382 200L368 214L338 198L324 212L294 196L280 208L250 192L232 200L196 180Z';
  const ruffRear =
    'M250 34L276 46L304 30L308 58L340 50L330 80L362 84L338 104L366 122L336 130L352 156L320 154L324 186L294 172L280 200L256 176L224 188Z';
  const ruffBack =
    'M214 36L242 46L272 36L276 62L306 58L296 86L324 92L300 110L328 128L298 134L316 158L284 156L288 186L258 170L244 196L224 172L196 186Z';
  const ruffFront =
    'M176 38L204 46L226 36L232 60L258 58L246 84L272 92L248 108L272 124L246 130L260 154L232 150L234 178L208 164L194 186L176 168Z';
  const head = 'M118 72C136 42 186 34 214 52L206 66L226 76L210 92L230 104L212 118L228 134L208 142L214 160L192 156L188 176C166 180 138 170 122 142Z';
  const crown = 'M118 72C136 42 186 34 214 52L206 66L190 60L184 76L168 66L158 82L146 70L136 86L124 76Z';
  const body = neck + ruffRear + ruffBack + ruffFront + head;
  let plumes = '';
  for (let k = 0, x = 340; x < 600; k++, x += 38) {
    for (const row of [0, 1, 2]) {
      const y = 62 + row * 44 + (k % 2) * 16;
      plumes += `M${x} ${y}q18 6 26 22q-20 2 -26 -22Z`;
    }
  }
  const featherLines = 'M178 96l22 6M186 118l22 2M170 138l22 8M152 148l14 8M226 62l20 16M238 100l22 2M232 134l18 14M270 70l22 12M286 118l26 2M274 150l18 16';
  const upperShut = 'M94 86C76 78 56 80 44 92C32 104 23 116 22 132C28 121 36 115 46 113L94 108Z';
  const lowerShut = 'M46 115Q70 111 94 109L92 120Q68 126 52 122Z';
  const upperOpen = 'M94 80C76 70 56 72 44 84C32 98 23 110 22 126C28 114 36 107 46 105L94 99Z';
  const lowerOpen = 'M40 146Q62 134 94 119L92 132Q68 156 50 156Q40 152 40 146Z';
  return (
    `<defs>${linear('es', 0, 1, [[0, SHADOW, 0], [1, SHADOW, 0.62]])}</defs>` +
    ink(
      `<g transform="translate(-34 0)">` +
        p(neck, WOODD) +
        n('M210 50C300 32 410 42 620 22V44C410 62 300 54 210 72Z', GOLD, 0.8) +
        `<g stroke-width="2.5">${n(plumes, GOLDD)}<path d="${plumes}" fill="none" stroke="#4a2f19"/></g>` +
        hl(plumes.replace(/q18 6 26 22q-20 2 -26 -22Z/g, 'q12 4 18 12'), '#e0a64a', 1.6, 0.6) +
        litPath(ruffRear, GOLDD, { outline: 5, shadow: 6, light: 2.5, lightColor: '#c98a2b' }) +
        litPath(ruffBack, GOLD, { outline: 5, shadow: 6, light: 2.5, lightColor: '#e8ae52' }) +
        litPath(ruffFront, PALED, { outline: 5, shadow: 6, light: 2.5, lightColor: '#e8dcc0' }) +
        litPath(head, PALE, { outline: 5, shadow: 8, light: 3, lightColor: WHITE }) +
        hl(featherLines, GOLDD, 3.5, 0.75) +
        hl(featherLines.replace(/M(\d+) (\d+)/g, (_, x: string, y: string) => `M${Number(x) - 1} ${Number(y) - 1.5}`), '#fff8e8', 1.2, 0.55) +
        p(crown, CROWN) +
        n('M132 62C150 46 182 44 200 54L186 58L176 68L164 60L152 72L142 64Z', '#8e5a22', 0.9) +
        // The strong shadow side: everything below the middle falls off into shade.
        clip(body, n(rect(100, 104, 560, 120), 'url(#es)')) +
        `</g>` +
        (open
          ? p('M46 105L94 99L94 119Q62 134 40 146Q42 124 46 105Z', '#6b1f22') + hl('M48 128Q66 120 86 112', '#b3282d', 5) + p(lowerOpen, BEAKD)
          : '') +
        litPath(open ? upperOpen : upperShut, BEAK, { outline: 5, shadow: 5, light: 0, shadowColor: BEAKD }) +
        n(open ? 'M38 94Q52 76 80 76Q58 84 44 102Z' : 'M36 110Q50 84 80 82Q60 94 46 114Z', '#fbeeb8', 0.9) +
        glint(open ? 56 : 54, open ? 82 : 88, 1.8) +
        // Dark hooked tip.
        n(open ? 'M22 126C23 112 30 101 38 93L46 105C36 107 28 114 22 126Z' : 'M22 132C23 118 30 106 38 99L46 113C36 115 28 121 22 132Z', '#5a3312') +
        (open ? '' : p(lowerShut, BEAKD)) +
        // Cere at the base of the beak.
        p(open ? 'M80 74Q92 74 100 84L97 100L80 100Z' : 'M80 80Q92 80 100 90L98 109L80 109Z', '#d9a93f') +
        hl(open ? 'M88 84h.01' : 'M88 92h.01', INK, 4) +
        // Fierce eye under a heavy, overhanging brow.
        c(116, 98, 10, '#f0a92c') +
        n('M108 101a9 9 0 0 0 16 3a10 10 0 0 1 -16 -3Z', '#b8641a', 0.8) +
        c(114, 99, 5, INK) +
        glint(111, 95, 1.8) +
        p('M78 100L108 72L156 62L160 82L120 92Z', '#4a2f19') +
        n('M104 78L152 68L153 74L112 84Z', '#8e5a22', 0.9),
      5,
    )
  );
}
