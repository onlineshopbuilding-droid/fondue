/**
 * Stars: the lasting currency between levels. What they are earned for and what they buy.
 * Everything here is a first balanced guess; change the numbers freely.
 */
export const STARS = {
  /** Stars for the first win of a level, by kind of level. A level table may override single levels. */
  level: { normal: 3, special: 4, boss: 8 },
  /** Winning a level again pays this share of its stars (0 = nothing, so replaying is no farm). */
  replayShare: 0,
  /** A co-op guest gets this share of a level's stars, once per level, rounded up. */
  guestShare: 0.5,
  /** Price of raising a weapon to tier 2, 3, 4, 5 in the armoury. Index 0 is tier 1 and costs nothing. */
  weaponTier: [0, 5, 12, 21, 32],
  /** Price of the first unlock of a weapon that the campaign has made available. 0 = free. */
  weaponUnlock: 0,
};

/** Stars to pay for the step up to `tier` (2 to 5). */
export const weaponTierPrice = (tier: number): number => STARS.weaponTier[tier - 1] ?? 0;
