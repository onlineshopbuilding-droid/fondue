/**
 * The three lasting currencies of v0.3 and the cheese rules.
 *   Cheese: unlocks (weapons, Great Cauldron, Eagle Perch). 1 to 5 per level, each only once; 500 in all.
 *   Gold: tiers 2 to 6 of weapons, the castle and the hand; also station tiers. Earned in every mode.
 *   Raider Crests: only from the Eagle Perch; every step to tier 7 needs them on top of gold.
 */
export type Currency = 'cheese' | 'gold' | 'crests';

export const CURRENCIES: Record<Currency, { name: string; icon: string; short: string }> = {
  cheese: { name: 'Cheese', icon: '🧀', short: 'Unlocks weapons and stations. Win levels to earn it.' },
  gold: { name: 'Gold', icon: '🪙', short: 'Upgrades weapons, castle and hand.' },
  crests: { name: 'Raider Crests', icon: '🛡️', short: 'Left behind at the Eagle Perch. Needed for tier 7.' },
};

export const CURRENCY_IDS = Object.keys(CURRENCIES) as Currency[];

/**
 * The five cheese of a level. Each is one bit of the level's mask in the profile and is paid only
 * the first time its bit is set.
 */
export const CHEESE = {
  /** Bit numbers of the five cheese. */
  bits: { win: 0, gateHalf: 1, gateHigh: 2, challenge1: 3, challenge2: 4 },
  perLevel: 5,
  /** Gate health share at the end of a won level for cheese 2 and 3 (strictly above). */
  gateHalf: 0.5,
  gateHigh: 0.9,
  /** Every cheese price together; the most a player can ever earn (100 levels × 5). */
  total: 500,
};

/** Number of set bits in a cheese mask (only the five known bits count). */
export function cheeseCount(mask: number): number {
  let n = 0;
  for (let bit = 0; bit < CHEESE.perLevel; bit++) if (mask & (1 << bit)) n++;
  return n;
}

/** All five bits. */
export const CHEESE_FULL_MASK = (1 << CHEESE.perLevel) - 1;
