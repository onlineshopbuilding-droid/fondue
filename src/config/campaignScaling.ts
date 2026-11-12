/**
 * How a campaign level's `power` (from the world's level table) turns into the raiders' numbers,
 * and how they grow from day to day inside a level. Read by src/modes/campaign.ts.
 */
export const CAMPAIGN_SCALING = {
  /** Share of the power above 1 that reaches gate damage and walk speed; hit points get all of it. */
  damageShare: 0.8,
  speedShare: 0.12,
  /** Later levels pay more gold per kill, so a fresh start can still afford the bigger keep. */
  goldPerPower: 0.7,
  /** Added per day after the first, as a share (0.14 = +14 % gate damage each day): damage, walk speed, hit points. */
  damageGrowth: 0.14,
  speedGrowth: 0.015,
  hpGrowth: 0.05,
  /** Share of a level's extra strength on its first days: every level starts with bare hands. */
  easeIn: [0.2, 0.55, 0.85],
};
