/**
 * The hand and how strong it is. A stronger hand throws heavy raiders further (see `mass` in
 * enemies.ts). Campaign: tiers are bought with stars between levels. Endless: with gold during a run.
 *
 * HANDS columns: strength = compared with a raider's mass; gold, offerings = price in an endless
 * run; stars = price in the armoury; note = shown to players.
 * The list is one hand today; more hands can become more lists later.
 */
export interface HandTier { strength: number; gold: number; offerings: number; stars: number; note: string }

export const HANDS: HandTier[] = [
  { strength: 1, gold: 0, offerings: 0, stars: 0, note: 'Throws a Pothelm with ease. Heavy raiders fly short.' },
  { strength: 1.5, gold: 2500, offerings: 10, stars: 12, note: 'Heavy raiders fly almost like light ones.' },
  { strength: 2.2, gold: 9000, offerings: 35, stars: 30, note: 'Lifts a Yeti alone.' },
];

export const MAX_HAND_TIER = HANDS.length;

export const HAND_RULES = {
  /** Throw speed is multiplied by (strength / mass) ^ power, never above 1 and never below `minThrow`. */
  power: 0.5,
  minThrow: 0.45,
  /** The spring that pulls a held raider to the hand is multiplied by strength / mass, at least this. */
  minFollow: 0.3,
  /** Combined strength of the hands on a Yeti that lifts it off the ground. */
  yetiLift: 2,
};
