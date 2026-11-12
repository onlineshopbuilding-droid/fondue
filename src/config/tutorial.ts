/**
 * The numbers of the first minutes: the prelude fight a new player is dropped into, when the King
 * walks in and what the guide waits for, and the one-time hint for throwing into the pot on day 2
 * of level 1. Read by src/modes/tutorial.ts and src/render/tutorialGuide.ts.
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
  /** Seconds the King praises the first throw before he walks off. */
  praiseSeconds: 2.4,
  /** The raider for the gesture walks between these x: past the gate, and on screen. */
  targetMinX: WORLD.gateX + 240,
  targetInsetRight: 320,
  /** Without any raider in reach the freeze waits this long before giving up on it. */
  maxWaitSeconds: 14,
} as const;

/** The hint to throw into the pot on day 2 of level 1. */
export const POT_HINT = {
  /** The King's sentence stays this long. */
  lineSeconds: 4.6,
  /** The arrow to the pot stays at most this long, or until a raider lands in the pot. */
  arrowSeconds: 14,
} as const;
