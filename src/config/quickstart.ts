/**
 * Developer quick start: drops an endless run at a later wave with a keep
 * instead of the profile's. Quick-start runs are developer runs: they reach neither the scores nor the rewards.
 *
 * Columns: wave = the endless wave it starts at; gold earned at the start; gateTier (0 to 6); slots = weapon id per slot
 * (damage, slow, gate, support, passive; see src/config/slots.ts) or null; tiers = tier of each owned weapon;
 * cauldron and perch = stations built; hand = hand tier.
 */
export interface QuickStart {
  wave: number;
  gold: number;
  gateTier: number;
  slots: (string | null)[];
  tiers: Record<string, number>;
  cauldron: boolean;
  perch: boolean;
  hand: number;
}

export const QUICK_STARTS: QuickStart[] = [
  {
    wave: 10, gold: 850, gateTier: 1,
    slots: ['wheel', 'cheese', 'mortar', 'midas', null],
    tiers: { wheel: 1, cheese: 1, mortar: 1, midas: 2 },
    cauldron: true, perch: false, hand: 1,
  },
  {
    wave: 20, gold: 2100, gateTier: 2,
    slots: ['comet', 'frost', 'mortar', 'beacon', 'bolter'],
    tiers: { comet: 3, frost: 2, mortar: 3, beacon: 2, bolter: 1 },
    cauldron: true, perch: false, hand: 2,
  },
  {
    wave: 30, gold: 15000, gateTier: 3,
    slots: ['stomper', 'cuckoo', 'alphorn', 'mender', 'bell'],
    tiers: { stomper: 4, cuckoo: 4, alphorn: 4, mender: 4, bell: 4 },
    cauldron: true, perch: true, hand: 2,
  },
];

export const quickStartFor = (wave: number): QuickStart | null => QUICK_STARTS.find((q) => q.wave === wave) ?? null;

/** The latest endless wave the developer menu can start at. */
export const QUICK_START_MAX_WAVE = 99;

/**
 * Belongings for an endless start at any later wave: those of the latest quick start on or before
 * it, moved to that wave. Null before the first quick start: the run then starts empty-handed.
 */
export function quickStartAt(wave: number): QuickStart | null {
  let base: QuickStart | null = null;
  for (const q of QUICK_STARTS) if (q.wave <= wave && (!base || q.wave > base.wave)) base = q;
  return base ? { ...base, wave } : null;
}
