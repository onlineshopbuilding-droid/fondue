/**
 * Tiers 1 to 7 of weapons, castle and hand: what a step costs and how far the campaign lets you build.
 * Everything here is a starting value; the bots may change it (reasons in docs/balance.md).
 */

export const TIER_MIN = 1;
export const TIER_MAX = 7;

/**
 * Gold base price of a weapon's step up to tier 2, 3, 4, 5, 6 and 7, before the weapon's own
 * `goldScale`. Index = tier - 1; index 0 (tier 1) is the unlock and costs cheese, not gold.
 */
export const WEAPON_TIER_GOLD = [0, 300, 900, 3000, 9000, 24000, 50000];

/** Raider Crests every step up to tier 7 needs on top of its gold (weapon, castle and hand alike). */
export const CREST_COST = 40;

/**
 * Highest tier that can be bought for weapons, castle and hand, by campaign progress.
 * `afterLevel`: from the moment this level is won. The last step (tier 7) needs the Eagle Perch.
 * This keeps gold from endless runs from rolling over a part of the campaign.
 */
export const TIER_CAP_BY_LEVEL: { afterLevel: number; cap: number }[] = [
  { afterLevel: 0, cap: 3 },
  { afterLevel: 10, cap: 4 },
  { afterLevel: 25, cap: 5 },
  { afterLevel: 45, cap: 6 },
];

/** Tier 7 opens once this station is unlocked (it is the only source of Raider Crests). */
export const TIER_MAX_NEEDS_STATION = 'perch' as const;

/** Gold for a weapon's step up to `tier` (2..7) with the weapon's price factor. 0 for tier 1 or below. */
export function weaponTierGold(tier: number, goldScale = 1): number {
  if (tier <= TIER_MIN || tier > TIER_MAX) return 0;
  return Math.round(WEAPON_TIER_GOLD[tier - 1] * goldScale);
}

/** Raider Crests for a step up to `tier`: only tier 7 asks for them. */
export const tierCrests = (tier: number): number => (tier === TIER_MAX ? CREST_COST : 0);
