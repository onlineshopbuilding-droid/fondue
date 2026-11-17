// Art of every weapon on the keep at each of its seven tiers, named `weapon:<id>:<tier>`.
// One figure per weapon on a 120 grid (files per slot); the shared ornaments in ./kit make every
// tier grander than the one before: wood, iron, brass, gold, then gems and a pennant, cheese,
// laurel and a second pennant, and at tier 7 a halo with rays and a crown.
import type { Art } from '../types';
import { STONED, STONEL, ink, hl, art, litBall } from '../draw';
import { type Trim, WEAPON_ART_TIERS, trimOf, shelf, ornamentBack, ornamentFront, f } from './kit';
import { wheelFigure, forksFigure, stomperFigure, cometFigure, bellowsFigure } from './damage';
import { cheeseFigure, frostFigure, cuckooFigure, snowdriftFigure, cowbellFigure } from './slow';
import { midasFigure, beaconFigure, helperFigure, gripFigure, menderFigure } from './support';
import { sentryFigure, bolterFigure, bellFigure, catapultFigure, hiveFigure } from './passive';
import { mortarFigure, thornsFigure, alphornFigure, cascadeFigure, logFigure } from './gate';

export { WEAPON_ART_TIERS };
/** Same as WEAPON_ART_TIERS; kept under the old name for callers. */
export const WEAPON_TIERS = WEAPON_ART_TIERS;

/** World size of a weapon picture; the figure itself is about 94 px at tier 1. */
export const WEAPON_ART_SIZE = 120;
/** Figure scale at tier 1 and the growth per tier (tier 7: +21 %). */
const BASE_SCALE = 0.78;
const GROWTH_PER_TIER = 0.035;

/** Texture name of a weapon picture. */
export const weaponKey = (id: string, tier: number) => `weapon:${id}:${tier}`;

/** The figures by slot, in the order of docs/v0.3/BAUPLAN.md section 7. */
export const WEAPON_ART_BY_SLOT = {
  damage: ['wheel', 'forks', 'stomper', 'comet', 'bellows'],
  slow: ['cheese', 'frost', 'cuckoo', 'snowdrift', 'cowbell'],
  support: ['midas', 'beacon', 'helper', 'grip', 'mender'],
  passive: ['sentry', 'bolter', 'bell', 'catapult', 'hive'],
  gate: ['mortar', 'thorns', 'alphorn', 'cascade', 'log'],
} as const;

const FIGURES: Record<string, (t: Trim) => string> = {
  wheel: wheelFigure,
  forks: forksFigure,
  stomper: stomperFigure,
  comet: cometFigure,
  bellows: bellowsFigure,
  cheese: cheeseFigure,
  frost: frostFigure,
  cuckoo: cuckooFigure,
  snowdrift: snowdriftFigure,
  cowbell: cowbellFigure,
  midas: midasFigure,
  beacon: beaconFigure,
  helper: helperFigure,
  grip: gripFigure,
  mender: menderFigure,
  sentry: sentryFigure,
  bolter: bolterFigure,
  bell: bellFigure,
  catapult: catapultFigure,
  hive: hiveFigure,
  mortar: mortarFigure,
  thorns: thornsFigure,
  alphorn: alphornFigure,
  cascade: cascadeFigure,
  log: logFigure,
};

/** Every weapon id with its own art (25: five per slot). */
export const WEAPON_ART_IDS: readonly string[] = Object.values(WEAPON_ART_BY_SLOT).flat();

/** Any other weapon id gets a plain placeholder plank, so a new id never breaks the game. */
function placeholder(t: Trim): string {
  return shelf(70, t) + litBall(60, 52, 16, STONED, 3) + hl('M54 46q6 -6 12 0', STONEL, 2, 0.7);
}

/** The picture of a weapon at a tier (1 to 7, clamped), 120 x 120 world pixels, anchored in the middle. */
export function weaponArt(id: string, tier: number): Art {
  const tr = Math.max(1, Math.min(WEAPON_ART_TIERS, Math.round(tier) || 1));
  const t = trimOf(tr);
  const s = f(BASE_SCALE * (1 + GROWTH_PER_TIER * (tr - 1)));
  const figure = (FIGURES[id] ?? placeholder)(t);
  const S = WEAPON_ART_SIZE;
  return art(S, S, S / 2, S / 2,
    `<g transform="translate(60 60)scale(${s})translate(-60 -60)">${ink(ornamentBack(t))}${ink(figure)}${ink(ornamentFront(t))}</g>`);
}

/** Every weapon picture for the asset directory: each id at each tier. */
export function listWeaponArt(): { id: string; tier: number; name: string; art: Art }[] {
  const out: { id: string; tier: number; name: string; art: Art }[] = [];
  for (const id of WEAPON_ART_IDS) {
    for (let tier = 1; tier <= WEAPON_ART_TIERS; tier++) out.push({ id, tier, name: weaponKey(id, tier), art: weaponArt(id, tier) });
  }
  return out;
}
