// The low mound with a round stone plinth that the Great Cauldron stands on, behind the road beside the keep.
// 220 x 90 art; the anchor is the middle of the plinth's top face, where the pot's feet rest.
import { INK, STONE, STONED, STONEL, ink, hl, art, litPath, n } from '../draw';
import { tone } from '../shade';
import { rand, fx } from './kit';

const EARTH = '#7a5a3a';
const GRASS = '#5a8a4c';

function plinth(): string {
  const R = rand(91);
  const side = 'M38 22V42Q110 60 182 42V22Q110 38 38 22Z';
  const top = 'M38 22a72 11 0 1 0 144 0a72 11 0 1 0 -144 0Z';
  // Joints of two courses of stone on the curved side.
  let joints = 'M38 32Q110 49 182 32';
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 20 + R() * 6;
    const y0 = i % 2 ? 22 + (x - 110) * (x - 110) * -0.0012 + 12 : 22 + (x - 110) * (x - 110) * -0.0012 + 22;
    joints += `M${fx(x)} ${fx(y0)}v${fx(9 + R() * 2)}`;
  }
  return (
    litPath(side, STONE, { shadow: 4, light: 1.4, lightColor: STONEL }) +
    hl(joints, STONED, 1.6, 0.8) +
    litPath(top, STONEL, { shadow: 2.5, light: 1.2, lightColor: '#d8d2bf' }) +
    hl('M52 20Q110 12 168 20', '#e6e0cc', 1.4, 0.6)
  );
}

function earth(): string {
  const R = rand(92);
  const body = 'M0 90Q14 56 46 44Q110 30 174 44Q206 56 220 90Z';
  let pebbles = '';
  for (let i = 0; i < 9; i++) {
    const x = 20 + R() * 180;
    const y = 62 + R() * 22;
    const r = 2.5 + R() * 3;
    pebbles += litPath(`M${fx(x - r)} ${fx(y)}a${fx(r)} ${fx(r * 0.7)} 0 1 0 ${fx(r * 2)} 0a${fx(r)} ${fx(r * 0.7)} 0 1 0 ${fx(-r * 2)} 0Z`, i % 2 ? STONE : STONED, { outline: 2, shadow: 1.2, light: 0.6 });
  }
  const tuft = (x: number, y: number) =>
    `<path d="M${x - 7} ${y}Q${x - 6} ${y - 9} ${x - 2} ${y - 12}Q${x - 1} ${y - 5} ${x} ${y - 3}Q${x + 2} ${y - 11} ${x + 7} ${y - 13}Q${x + 5} ${y - 5} ${x + 8} ${y}Z" fill="${GRASS}" stroke="${INK}" stroke-width="2"/>`;
  return (
    litPath(body, EARTH, { shadow: 6, light: 2, lightColor: '#a07a52' }) +
    n('M0 90Q60 76 110 80Q170 76 220 90Z', tone(EARTH, -0.35), 0.8) +
    pebbles +
    tuft(26, 72) + tuft(196, 70) + tuft(60, 50) + tuft(160, 50)
  );
}

export const potMound = art(220, 90, 110, 22, ink(earth() + plinth(), 3));
