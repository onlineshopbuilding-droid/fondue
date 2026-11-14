/**
 * How a campaign level's `power` (from the world's level table) turns into the raiders' numbers,
 * and how they grow from wave to wave inside a level. Read by src/modes/campaign.ts.
 */
export const CAMPAIGN_SCALING = {
  /** Share of the power above 1 that reaches gate damage and walk speed; hit points get all of it. */
  damageShare: 0.8,
  speedShare: 0.12,
  /** Later levels pay more gold per kill, so the bigger keep stays affordable. */
  goldPerPower: 0.7,
  /**
   * Growth over a whole level, from its first wave to its last, as a share (0.6 = +60 % gate damage
   * in the last wave): damage, walk speed, hit points. Split evenly over the level's waves.
   */
  damageOverLevel: 0.6,
  speedOverLevel: 0.06,
  hpOverLevel: 0.3,
  /** Share of a level's extra strength in its first waves. */
  easeIn: [0.3, 0.6, 0.85],
};
