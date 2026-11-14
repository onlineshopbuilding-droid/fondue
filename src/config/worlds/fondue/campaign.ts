/**
 * The 100 campaign levels of world 1. Each level is one fight made of waves (B1, B2). They are built
 * from the rules below (a curve over all levels, fixed points where raiders first appear, boss
 * levels, landscapes, special levels) and can then be changed one by one in LEVEL_OVERRIDES at the
 * bottom. `buildCampaign()` returns the finished table; `docs/KAMPAGNE-TABELLE.md` and the developer
 * page show it in readable form.
 *
 * The campaign is fixed, not random: the same level always brings the same raiders.
 */
import type { EnemyType } from '../../enemies';
import { WAVES, type Landscape } from '../../waves';
import type { BossDef, LevelDef, TwistDef, WaveDef } from '../types';
import { challengesFor } from './challenges';
import { BOSSES, LEVEL_NAMES, LEVEL_STORY } from './story';

export const LEVEL_COUNT = 100;

/** The curve over all levels. */
export const CURVE = {
  /**
   * Raider count of a level. It follows the sum of the old v0.2 days (a day of level L had
   * baseCount * (1 + countPerDay * (day - 1)) + countPerLevel * (L - 1) ^ countPower * share raiders)
   * times `countShare`: v0.3 brings about 40 % of the raiders, at 2.5 times the speed (B4).
   */
  baseCount: 24,
  countPerLevel: 6,
  countPower: 0.75,
  countPerDay: 0.14,
  levelShareDay1: 0.3,
  levelSharePerDay: 0.35,
  levelShareMax: 1.7,
  countShare: 0.4,
  /**
   * Strength of the raiders: 1 in level 1, growing by powerPerLevel per level, and from level powerLateFrom on
   * by powerLate more, growing with the square (the late campaign asks for tier 6 and 7, balance.md).
   */
  powerPerLevel: 0.05,
  powerLateFrom: 40,
  powerLate: 3,
  /** Raiders of a boss level are this much stronger than the curve says. */
  bossPower: 1.45,
  /** Planned length in seconds: levels 1 to 5, the ramp to level 20, the middle, boss and special levels. */
  secondsFirst: 70,
  secondsPerEarlyLevel: 11,
  secondsAt20: 200,
  secondsMiddleMin: 180,
  secondsMiddleMax: 300,
  secondsBossMin: 450,
  secondsBossMax: 600,
  secondsSpecialMin: 430,
  secondsSpecialMax: 560,
  /** Seconds per wave on average (arrival plus pause); the level's length decides how many waves. */
  secondsPerWave: 15,
  /** Share of the planned length that is arrivals and pauses; the rest is fighting the last raiders. */
  plannedShare: 0.9,
  /** Wave sizes follow this pattern, so tension goes up and down: small, big, medium, spike. */
  wavePattern: [0.6, 1.35, 0.85, 1.75],
  /** The last wave of a level is this big (relative), the boss wave of a boss level too. */
  lastWave: 1.9,
};

/** Level in which each raider appears for the first time. */
export const FIRST_LEVEL: Record<EnemyType, number> = {
  grunt: 1, bomber: 3, goatRider: 7, pogo: 12, hexer: 17, slinger: 23, siegeCart: 29, balloonist: 36, shade: 44, crowcaller: 52, yeti: 61,
};

/** Share of each raider among the arrivals once it is known. */
const SHARE: Record<EnemyType, number> = {
  grunt: 10, bomber: 2.5, goatRider: 2.5, pogo: 2.5, hexer: 1.8, slinger: 2.2, siegeCart: 0.35, balloonist: 1.3, shade: 1.3, crowcaller: 1, yeti: 0.2,
};
/** Rare, heavy raiders: at most this many per level (before countShare), plus one more every `per` levels after their first. */
const RARE: Partial<Record<EnemyType, { max: number; per: number }>> = { siegeCart: { max: 3, per: 12 }, yeti: { max: 2, per: 12 } };

/** From which level on the army comes through which landscape. */
const LANDSCAPE_FROM: [number, Landscape][] = [
  [1, 'meadow'], [13, 'canyon'], [26, 'marsh'], [39, 'snowpine'], [51, 'canyon'], [63, 'marsh'], [76, 'meadow'], [89, 'snowpine'],
];

/** Boss levels: which oversized raiders walk in with the boss wave. Names and lines come from story.ts. */
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
/** Extra raiders in the boss wave, on top of the usual mix. */
const BOSS_EXTRA: Record<number, Partial<Record<EnemyType, number>>> = {
  30: { goatRider: 6 },
  50: { siegeCart: 2 },
  60: { balloonist: 5 },
  70: { yeti: 1 },
  90: { crowcaller: 4 },
  100: { yeti: 1, siegeCart: 1 },
};

/** Special levels, so that the hundred do not feel alike. */
const TWISTS: Record<number, TwistDef> = {
  9: { kind: 'onlyTypes', types: ['goatRider'], label: 'Riders only' },
  14: { kind: 'onlyTypes', types: ['pogo'], label: 'Hoppers only' },
  18: { kind: 'night', label: 'Night raid' },
  22: { kind: 'flood', type: 'bomber', label: 'Keg parade' },
  27: { kind: 'night', label: 'Night raid' },
  34: { kind: 'flood', type: 'siegeCart', label: 'Heavy siege' },
  38: { kind: 'night', label: 'Night raid' },
  // After the Passive slot (level 11) there is an answer to balloons.
  43: { kind: 'onlyTypes', types: ['balloonist', 'grunt'], label: 'Air raid' },
  47: { kind: 'night', label: 'Night of shades' },
  56: { kind: 'flood', type: 'crowcaller', label: 'Crow storm' },
  66: { kind: 'night', label: 'Night raid' },
  73: { kind: 'onlyTypes', types: ['pogo', 'goatRider'], label: 'Hop and gallop' },
  80: { kind: 'night', label: 'Midnight' },
  85: { kind: 'night', label: 'Night raid' },
  95: { kind: 'allTypes', label: 'All at once' },
};

/** A fixed pseudo-random number between 0 and 1 from two whole numbers: the same every time. */
export function chance(a: number, b: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function landscapeOf(level: number): Landscape {
  let land: Landscape = 'meadow';
  for (const [from, l] of LANDSCAPE_FROM) if (level >= from) land = l;
  return land;
}

/** Number of days a level had in v0.2; only used to keep the raider count of the old curve. */
function legacyDays(level: number): number {
  if (level === 1) return 2;
  if (level <= 9) return 5;
  const base = 5 + Math.floor(chance(level, 7) * 3) + Math.floor(level / 45);
  return Math.min(10, base + (level % 10 === 0 ? 1 : 0));
}

/** Raiders of the whole level in v0.2 (all days together). */
function legacyTotal(level: number): number {
  let total = 0;
  for (let day = 1; day <= legacyDays(level); day++) {
    const share = Math.min(CURVE.levelShareMax, CURVE.levelShareDay1 + CURVE.levelSharePerDay * (day - 1));
    total += CURVE.baseCount * (1 + CURVE.countPerDay * (day - 1)) + CURVE.countPerLevel * Math.pow(level - 1, CURVE.countPower) * share;
  }
  return total;
}

export function knownTypes(level: number): EnemyType[] {
  return (Object.keys(FIRST_LEVEL) as EnemyType[]).filter((t) => FIRST_LEVEL[t] <= level);
}

/** Splits a level's raiders among the types of this level. */
function mixFor(level: number, total: number, twist: TwistDef | null): Partial<Record<EnemyType, number>> {
  let types = knownTypes(level);
  if (twist?.kind === 'onlyTypes') types = twist.types;
  const weights = types.map((t) => {
    const age = level - FIRST_LEVEL[t];
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
    let n = Math.floor((total * weights[i]) / sum + chance(level * 31, i));
    const rare = RARE[t];
    const flooded = twist?.kind === 'flood' && twist.type === t;
    if (rare && !flooded) n = Math.min(n, rare.max + Math.floor((level - FIRST_LEVEL[t]) / rare.per));
    if (rare && flooded) n = Math.min(n, 6);
    // A raider on its first level shows up for sure, so the "New enemy" window is no lie.
    if (level === FIRST_LEVEL[t]) n = Math.max(n, rare ? 1 : 3);
    if (n > 0) { counts[t] = n; used += n; }
  });
  counts[types[0]] = Math.max(types.length === 1 ? total : 3, total - used);
  return counts;
}

/** Planned length of a level in seconds (B1: early 1-2 min, middle 3-5, boss and special 6-10). */
function targetSecondsOf(level: number, boss: boolean, twist: TwistDef | null): number {
  const c = CURVE;
  const r = chance(level, 101);
  if (boss) return Math.round(c.secondsBossMin + (c.secondsBossMax - c.secondsBossMin) * Math.min(1, (level / 100) * 0.7 + r * 0.3));
  if (twist) return Math.round(c.secondsSpecialMin + (c.secondsSpecialMax - c.secondsSpecialMin) * r);
  if (level <= 5) return c.secondsFirst + c.secondsPerEarlyLevel * (level - 1) + Math.round(r * 8);
  if (level <= 20) {
    const u = (level - 5) / 15;
    return Math.round(120 + (c.secondsAt20 - 120) * u + (r - 0.5) * 30);
  }
  // The middle varies on purpose: a quick level, then a long one.
  return Math.round(c.secondsMiddleMin + (c.secondsMiddleMax - c.secondsMiddleMin) * (0.15 + 0.55 * r + 0.3 * (level / 100)));
}

/** Splits n into parts by weights, keeping the sum exact (largest remainder). */
function split(n: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map((_, i) => (i === weights.length - 1 ? n : 0));
  const raw = weights.map((w) => (n * w) / sum);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++;
  return out;
}

/** The waves of a level: sizes rise and fall (B2), pauses of 2 to 4 s, the boss in the last wave. */
function wavesOf(level: number, target: number, counts: Partial<Record<EnemyType, number>>, boss: boolean): WaveDef[] {
  const c = CURVE;
  const n = Math.max(3, Math.round(target / c.secondsPerWave));
  const weights = Array.from({ length: n }, (_, i) => {
    if (i === n - 1) return c.lastWave;
    const base = i === 0 ? 0.5 : c.wavePattern[i % c.wavePattern.length];
    return base * (0.85 + 0.3 * chance(level * 13, i));
  });
  const pauses = weights.map((_, i) => (i === n - 1 ? 0 : Math.round((WAVES.pauseMin + (WAVES.pauseMax - WAVES.pauseMin) * chance(level * 7, i)) * 10) / 10));
  const active = Math.max(n * 3, target * c.plannedShare - pauses.reduce((a, b) => a + b, 0));
  const spans = split(Math.round(active * 10), weights.map((w) => 0.6 + 0.4 * w)).map((v) => Math.max(2, v / 10));
  const waves: WaveDef[] = weights.map((_, i) => ({ counts: {}, spawnSeconds: spans[i], packs: 1, pauseAfter: pauses[i] }));
  for (const [type, total] of Object.entries(counts) as [EnemyType, number][]) {
    // A newcomer waits for the second wave, so the first wave is the familiar warm-up.
    const fresh = level > 1 && FIRST_LEVEL[type] === level && type !== 'grunt';
    const parts = split(total, weights.map((w, i) => (fresh && i === 0 ? 0 : w)));
    parts.forEach((k, i) => { if (k > 0) waves[i].counts[type] = k; });
  }
  for (const w of waves) {
    const size = Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0);
    if (size === 0) w.counts.grunt = 1;
    w.packs = Math.max(1, Math.min(4, Math.round(size / 6)));
  }
  if (boss) {
    const last = waves[n - 1];
    last.boss = true;
    last.big = BOSS_BIG[level] ?? {};
    for (const [t, k] of Object.entries(BOSS_EXTRA[level] ?? {}) as [EnemyType, number][]) last.counts[t] = (last.counts[t] ?? 0) + k;
  }
  return waves;
}

/** Strength of a level's raiders before the boss factor. */
export function powerOf(level: number): number {
  const late = Math.max(0, level - CURVE.powerLateFrom) / (LEVEL_COUNT - CURVE.powerLateFrom);
  return 1 + CURVE.powerPerLevel * (level - 1) + CURVE.powerLate * late * late;
}

function buildLevel(level: number): LevelDef {
  const twist = TWISTS[level] ?? null;
  const bossInfo = BOSSES[level];
  const boss: BossDef | null = level % 10 === 0 && bossInfo ? bossInfo : null;
  const total = Math.max(8, Math.round(legacyTotal(level) * CURVE.countShare));
  const counts = mixFor(level, total, twist);
  const targetSeconds = targetSecondsOf(level, !!boss, twist);
  const waves = wavesOf(level, targetSeconds, counts, !!boss);
  const newEnemies = (Object.keys(FIRST_LEVEL) as EnemyType[]).filter((t) => FIRST_LEVEL[t] === level);
  const levelCounts: Partial<Record<EnemyType, number>> = {};
  for (const w of waves) for (const [t, k] of Object.entries(w.counts) as [EnemyType, number][]) levelCounts[t] = (levelCounts[t] ?? 0) + k;
  return {
    id: level,
    name: LEVEL_NAMES[level - 1] ?? `Level ${level}`,
    landscape: landscapeOf(level),
    night: twist?.kind === 'night',
    waves,
    targetSeconds,
    challenges: challengesFor(level, levelCounts),
    power: powerOf(level) * (boss ? CURVE.bossPower : 1),
    boss,
    twist,
    story: LEVEL_STORY[level - 1] ?? '',
    hints: [],
    newEnemies,
    maxAlive: Math.round(WAVES.maxAliveMin + ((WAVES.maxAliveMax - WAVES.maxAliveMin) * (level - 1)) / (LEVEL_COUNT - 1)),
  };
}

/**
 * Changes to single levels, applied on top of the rules. Any field of a level can be replaced.
 * Example: 37: { targetSeconds: 240 }
 */
export const LEVEL_OVERRIDES: Record<number, Partial<LevelDef>> = {};

let cache: LevelDef[] | null = null;

/** The finished level table, levels 1 to 100 in order. */
export function buildCampaign(): LevelDef[] {
  if (cache) return cache;
  cache = [];
  for (let level = 1; level <= LEVEL_COUNT; level++) cache.push({ ...buildLevel(level), ...(LEVEL_OVERRIDES[level] ?? {}) });
  return cache;
}

/** Raiders of a whole level. */
export const levelRaiders = (l: LevelDef): number =>
  l.waves.reduce((sum, w) => sum + Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0) + Object.values(w.big ?? {}).reduce((a, b) => a + (b ?? 0), 0), 0);

/** Planned seconds of a level from its waves (arrivals and pauses). */
export const plannedSeconds = (l: LevelDef): number => l.waves.reduce((sum, w) => sum + w.spawnSeconds + w.pauseAfter, 0);
