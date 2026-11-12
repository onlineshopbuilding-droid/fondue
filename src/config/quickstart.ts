/**
 * Developer quick start: drops an endless run on a later day with roughly what a player would own
 * by then. Quick-start runs are developer runs: they reach neither the scores nor the stars.
 *
 * Columns: day; gold and offerings in the purse; gateTier (0 to 4); slots = weapon id per slot
 * (wall foot, wall, gate arm, shrine, tower roof) or null; tiers = tier of each owned weapon;
 * cauldron and perch = offering sites built; hand = hand tier.
 */
export interface QuickStart {
  day: number;
  gold: number;
  offerings: number;
  gateTier: number;
  slots: (string | null)[];
  tiers: Record<string, number>;
  cauldron: boolean;
  perch: boolean;
  hand: number;
}

export const QUICK_STARTS: QuickStart[] = [
  {
    day: 10, gold: 850, offerings: 40, gateTier: 1,
    slots: ['wheel', 'stomper', 'mortar', 'comet', null],
    tiers: { wheel: 1, stomper: 1, mortar: 1, comet: 2 },
    cauldron: true, perch: false, hand: 1,
  },
  {
    day: 20, gold: 2100, offerings: 45, gateTier: 2,
    slots: ['wheel', 'stomper', 'bellows', 'comet', 'bolter'],
    tiers: { wheel: 3, stomper: 3, bellows: 2, comet: 3, bolter: 1 },
    cauldron: true, perch: false, hand: 2,
  },
  {
    day: 30, gold: 15000, offerings: 100, gateTier: 3,
    slots: ['wheel', 'stomper', 'bellows', 'comet', 'bolter'],
    tiers: { wheel: 4, stomper: 4, bellows: 4, comet: 4, bolter: 4 },
    cauldron: true, perch: true, hand: 2,
  },
];

export const quickStartFor = (day: number): QuickStart | null => QUICK_STARTS.find((q) => q.day === day) ?? null;

/** The latest endless day the developer menu can start on. */
export const QUICK_START_MAX_DAY = 99;

/**
 * Belongings for an endless start on any later day: those of the latest quick start on or before
 * it, moved to that day. Null before the first quick start: the run then starts empty-handed.
 */
export function quickStartAt(day: number): QuickStart | null {
  let base: QuickStart | null = null;
  for (const q of QUICK_STARTS) if (q.day <= day && (!base || q.day > base.day)) base = q;
  return base ? { ...base, day } : null;
}
