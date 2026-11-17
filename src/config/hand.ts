/**
 * The hand and how strong it is, kept for good in the profile. A stronger hand throws heavy raiders
 * further (see `mass` in enemies.ts). Tiers are bought with gold, tier 7 also with Raider Crests.
 *
 * HANDS columns: strength = compared with a raider's mass; gold, crests = price of the step up to
 * this tier (tier 1 is free); note = shown to players.
 */
import { CREST_COST } from './tiers';
export interface HandTier { strength: number; gold: number; crests: number; note: string }

export const HANDS: HandTier[] = [
  { strength: 1, gold: 0, crests: 0, note: 'Throws a Pothelm with ease. Heavy raiders fly short.' },
  { strength: 1.25, gold: 500, crests: 0, note: 'A firmer grip.' },
  { strength: 1.55, gold: 1500, crests: 0, note: 'Heavy raiders fly almost like light ones.' },
  { strength: 2, gold: 3500, crests: 0, note: 'Lifts a Yeti alone.' },
  { strength: 2.4, gold: 8000, crests: 0, note: 'Yetis fly a fair way.' },
  { strength: 2.8, gold: 16000, crests: 0, note: 'Nothing on the road is too heavy.' },
  { strength: 3.3, gold: 30000, crests: CREST_COST, note: 'A second hand joins the first.' },
];

export const MAX_HAND_TIER = HANDS.length;

export const HAND_RULES = {
  /** Throw speed is multiplied by (strength / mass) ^ power, never above 1 and never below `minThrow`. */
  power: 0.5,
  minThrow: 0.45,
  /** The spring that pulls a held raider to the hand is multiplied by strength / mass, at least this. */
  minFollow: 0.3,
  /** Combined strength of the hands on a Yeti that lifts it off the ground (one hand from tier 4). */
  yetiLift: 2,
  /** From this hand tier on a player has a second hand of their own for good (C9, variant 1). */
  secondHandTier: 7,
};
