/**
 * The numbers of the first minutes: the prelude fight a new player is dropped into, when the King
 * walks in and what the guide waits for, the Rolling Wheel lesson at the end of the prelude, and the
 * one-time King hint a level can give in one of its waves. Read by src/modes/tutorial.ts and
 * src/render/tutorialGuide.ts.
 */
import { WORLD } from './field';

/** The prelude fight. */
export const PRELUDE = {
  /** How many Pothelms come, and within how many seconds. */
  pothelms: 13,
  seconds: 34,
  /** Their walk speed and gate damage, as factors (1 = as in the raider table). */
  speed: 0.9,
  damage: 0.5,
  /** Fixed random seed, so every new player meets the same prelude. */
  seed: 7,
  /** The free Rolling Wheel stands in the damage slot from the first second, at this tier (C4). */
  wheelTier: 1,
};

/** The guide of the prelude: the King, his lines and the gesture to learn. */
export const GUIDE = {
  /** Seconds the King takes to walk in or out. */
  walk: 0.9,
  /** Seconds each prelude line stays in the bubble. */
  lineSeconds: 2.1,
  /** A release at least this fast counts as a throw (world units per second). */
  flingSpeed: 550,
  /** A raider let go at least this far above the road counts as well: the fall does the rest. */
  liftHeight: 150,
  /** Seconds the King praises the first throw before he shows the wheel. */
  praiseSeconds: 2.4,
  /** The raider for the gesture walks between these x: past the gate, and on screen. */
  targetMinX: WORLD.gateX + 240,
  targetInsetRight: 320,
  /** Without any raider in reach the freeze waits this long before giving up on it. */
  maxWaitSeconds: 14,
  /** The wheel lesson waits this long for a tap on the wheel, then the King lets the player be. */
  wheelMaxSeconds: 18,
  /** Seconds the King praises the wheel before he walks off. */
  wheelPraiseSeconds: 2.2,
} as const;

/** A King hint a level gives in one of its waves (`hints` of a level): the line and the arrow to the pot. */
export const POT_HINT = {
  /** The King's sentence stays this long. */
  lineSeconds: 4.6,
  /** The arrow to the pot stays at most this long, or until a raider lands in the pot. */
  arrowSeconds: 14,
} as const;

/**
 * The guided first upgrade after level 1 (D4): the shop opens on the damage slot, the wheel and its
 * upgrade button glow, and the King says what to do. Done once the wheel reaches `toTier` (or the
 * tip id is seen).
 */
export const FIRST_UPGRADE = {
  /** Won level after which the guide starts. */
  afterLevel: 1,
  weapon: 'wheel',
  toTier: 2,
  /** Id in `seen.tips` once the guide is over. */
  tipId: 'firstUpgrade',
} as const;
