/**
 * The 100 campaign levels of world 1. They are built from the rules below (a curve over all levels,
 * fixed points where raiders first appear, boss levels, landscapes, special levels) and can then be
 * changed one by one in LEVEL_OVERRIDES at the bottom. `buildCampaign()` returns the finished table;
 * `docs/KAMPAGNE-TABELLE.md` and the developer page show it in readable form.
 *
 * The campaign is fixed, not random: the same level always brings the same raiders.
 */
import type { EnemyType } from '../../enemies';
import { DAY, type Landscape } from '../../waves';
import { STARS } from '../../stars';
import type { BossDef, DayDef, LevelDef, TwistDef } from '../types';
import { BOSSES, LEVEL_NAMES, LEVEL_STORY, TUTORIAL_HINTS } from './story';
import { UNLOCKS } from './unlocks';

export const LEVEL_COUNT = 100;

/** The curve over all levels. */
export const CURVE = {
  /** Raiders on day 1 of level 1, and how many more each level adds. */
  baseCount: 24,
  countPerLevel: 0.8,
  /** Each further day of a level brings this share more than the day before. */
  countPerDay: 0.14,
  /** Strength of the raiders: 1 in level 1, growing by this much per level. */
  powerPerLevel: 0.035,
  /** The last day of a boss level brings this many times the usual raiders, besides the boss. */
  bossDayCount: 1.25,
};

/** Level in which each raider appears for the first time. */
export const FIRST_LEVEL: Record<EnemyType, number> = {
  grunt: 1, bomber: 3, goatRider: 7, pogo: 12, hexer: 17, slinger: 23, siegeCart: 29, balloonist: 36, shade: 44, crowcaller: 52, yeti: 61,
};

/** Share of each raider among the arrivals once it is known. */
const SHARE: Record<EnemyType, number> = {
  grunt: 10, bomber: 2.5, goatRider: 2.5, pogo: 2.5, hexer: 1.8, slinger: 2.2, siegeCart: 0.35, balloonist: 1.3, shade: 1.3, crowcaller: 1, yeti: 0.2,
};
/** Rare, heavy raiders: at most this many per day, plus one more every `per` levels after their first. */
const RARE: Partial<Record<EnemyType, { max: number; per: number }>> = { siegeCart: { max: 1, per: 18 }, yeti: { max: 1, per: 16 } };

/** From which level on the army comes through which landscape. */
const LANDSCAPE_FROM: [number, Landscape][] = [
  [1, 'meadow'], [13, 'canyon'], [26, 'marsh'], [39, 'snowpine'], [51, 'canyon'], [63, 'marsh'], [76, 'meadow'], [89, 'snowpine'],
];

/** Boss levels: which oversized raiders walk in on the last day. Names and lines come from story.ts. */
const BOSS_BIG: Record<number, Partial<Record<EnemyType, number>>> = {
  10: { grunt: 1 },
  20: { bomber: 1 },
  30: { goatRider: 1 },
  40: { hexer: 1 },
  50: {},
  60: { balloonist: 1 },
  70: {},
  80: { shade: 1 },
  90: { crowcaller: 1 },
  100: { grunt: 1, goatRider: 1, hexer: 1 },
};
/** Extra raiders on the last day of a boss level, on top of the usual mix. */
const BOSS_EXTRA: Record<number, Partial<Record<EnemyType, number>>> = {
  30: { goatRider: 14 },
  50: { siegeCart: 5 },
  60: { balloonist: 12 },
  70: { yeti: 2 },
  90: { crowcaller: 10 },
  100: { yeti: 2, siegeCart: 2 },
};

/** Special levels, so that the hundred do not feel alike. */
const TWISTS: Record<number, TwistDef> = {
  9: { kind: 'onlyTypes', types: ['goatRider'], label: 'Riders only' },
  14: { kind: 'onlyTypes', types: ['pogo'], label: 'Hoppers only' },
  18: { kind: 'night', label: 'Night raid' },
  22: { kind: 'flood', type: 'bomber', label: 'Keg parade' },
  27: { kind: 'night', label: 'Night raid' },
  34: { kind: 'flood', type: 'siegeCart', label: 'Heavy day' },
  38: { kind: 'onlyTypes', types: ['balloonist', 'grunt'], label: 'Air raid' },
  47: { kind: 'night', label: 'Night of shades' },
  56: { kind: 'flood', type: 'crowcaller', label: 'Day of crows' },
  66: { kind: 'night', label: 'Night raid' },
  73: { kind: 'onlyTypes', types: ['pogo', 'goatRider'], label: 'Hop and gallop' },
  80: { kind: 'night', label: 'Midnight' },
  85: { kind: 'night', label: 'Night raid' },
  95: { kind: 'allTypes', label: 'All at once' },
};

/** A fixed pseudo-random number between 0 and 1 from two whole numbers: the same every time. */
function chance(a: number, b: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function landscapeOf(level: number): Landscape {
  let land: Landscape = 'meadow';
  for (const [from, l] of LANDSCAPE_FROM) if (level >= from) land = l;
  return land;
}

function dayCountOf(level: number): number {
  if (level === 1) return 2;
  if (level <= 4) return 3;
  if (level <= 9) return 4;
  const base = 5 + Math.floor(chance(level, 7) * 3) + Math.floor(level / 45);
  return Math.min(10, base + (level % 10 === 0 ? 1 : 0));
}

function knownTypes(level: number): EnemyType[] {
  return (Object.keys(FIRST_LEVEL) as EnemyType[]).filter((t) => FIRST_LEVEL[t] <= level);
}

/** Splits a day's total among the raider types of this level. */
function mixFor(level: number, day: number, total: number, twist: TwistDef | null): Partial<Record<EnemyType, number>> {
  let types = knownTypes(level);
  if (twist?.kind === 'onlyTypes') types = twist.types;
  const weights = types.map((t) => {
    // A new raider eases in over its first levels; on its very first level it starts on day 2.
    const age = level - FIRST_LEVEL[t];
    if (t !== 'grunt' && age === 0 && day === 1 && level > 1) return 0;
    let w = SHARE[t] * Math.min(1, (age + 1.5) / 4);
    if (twist?.kind === 'onlyTypes') w = 1;
    if (twist?.kind === 'flood' && twist.type === t) w *= t === 'siegeCart' ? 6 : 5;
    if (twist?.kind === 'allTypes' && t !== 'grunt') w *= 1.6;
    return w;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts: Partial<Record<EnemyType, number>> = {};
  let used = 0;
  types.forEach((t, i) => {
    if (t === types[0]) return;
    let n = Math.floor((total * weights[i]) / sum + chance(level * 31 + day, i));
    const rare = RARE[t];
    if (rare && !(twist?.kind === 'flood' && twist.type === t)) n = Math.min(n, rare.max + Math.floor((level - FIRST_LEVEL[t]) / rare.per));
    if (rare && twist?.kind === 'flood' && twist.type === t) n = Math.min(n, 3 + day);
    // A raider on its first level shows up for sure, so the "New enemy" window is no lie.
    if (level === FIRST_LEVEL[t] && day >= 2) n = Math.max(n, rare ? 1 : 2 + day);
    if (n > 0) { counts[t] = n; used += n; }
  });
  counts[types[0]] = Math.max(types.length === 1 ? total : 4, total - used);
  return counts;
}

function buildLevel(level: number): LevelDef {
  const twist = TWISTS[level] ?? null;
  const bossInfo = BOSSES[level];
  const boss: BossDef | null = level % 10 === 0 && bossInfo ? bossInfo : null;
  const dayCount = dayCountOf(level);
  const days: DayDef[] = [];
  for (let day = 1; day <= dayCount; day++) {
    const last = day === dayCount;
    let total = (CURVE.baseCount + CURVE.countPerLevel * (level - 1)) * (1 + CURVE.countPerDay * (day - 1));
    if (boss && last) total *= CURVE.bossDayCount;
    const counts = mixFor(level, day, Math.round(total), twist);
    if (boss && last) for (const [t, n] of Object.entries(BOSS_EXTRA[level] ?? {}) as [EnemyType, number][]) counts[t] = (counts[t] ?? 0) + n;
    days.push({
      counts,
      night: twist?.kind === 'night',
      seconds: level === 1 ? 40 : DAY.seconds,
      big: boss && last ? BOSS_BIG[level] ?? {} : {},
    });
  }
  const newEnemies = (Object.keys(FIRST_LEVEL) as EnemyType[]).filter((t) => FIRST_LEVEL[t] === level);
  const unlocksSomething = UNLOCKS.some((u) => u.level === level);
  const special = twist !== null || newEnemies.length > 0 || unlocksSomething;
  return {
    id: level,
    name: LEVEL_NAMES[level - 1] ?? `Level ${level}`,
    landscape: landscapeOf(level),
    days,
    power: 1 + CURVE.powerPerLevel * (level - 1),
    boss,
    twist,
    stars: boss ? STARS.level.boss : special ? STARS.level.special : STARS.level.normal,
    story: LEVEL_STORY[level - 1] ?? '',
    marketOnly: null,
    startGold: 0,
    hints: [],
    newEnemies,
  };
}

/**
 * Changes to single levels, applied on top of the rules. Any field of a level can be replaced.
 * Example: 37: { stars: 5, days: [...] }
 */
export const LEVEL_OVERRIDES: Record<number, Partial<LevelDef>> = {
  // Level 1 is the rest of the tutorial: two easy days, and the first market sells only the cauldron.
  1: {
    marketOnly: ['station:cauldron'],
    startGold: 60,
    hints: [
      { day: 1, when: 'market', text: TUTORIAL_HINTS.cauldronMarket },
      { day: 2, when: 'battle', text: TUTORIAL_HINTS.cauldronThrow },
    ],
  },
};

let cache: LevelDef[] | null = null;

/** The finished level table, levels 1 to 100 in order. */
export function buildCampaign(): LevelDef[] {
  if (cache) return cache;
  cache = [];
  for (let level = 1; level <= LEVEL_COUNT; level++) cache.push({ ...buildLevel(level), ...(LEVEL_OVERRIDES[level] ?? {}) });
  return cache;
}
