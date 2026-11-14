// Every raider of the game with its numbers (speed, strength, weight, gold), plus the numbers of their special behaviours.
// Which raiders appear when is decided by the worlds' campaign and endless tables, not here.
export type EnemyType =
  | 'grunt'
  | 'bomber'
  | 'goatRider'
  | 'pogo'
  | 'hexer'
  | 'slinger'
  | 'siegeCart'
  | 'balloonist'
  | 'shade'
  | 'crowcaller'
  | 'yeti';

export interface EnemyDef {
  /** Name shown in the game. */
  name: string;
  /** Walk speed in px/s at walkSpeed tuning 1. */
  speed: number;
  /** Damage per strike on the gate. */
  strike: number;
  /** Seconds between strikes. */
  strikeEvery: number;
  /** Distance from the gate at which it stops and attacks. */
  range: number;
  /** Hit points against weapons. Throwing ignores these. */
  hp: number;
  /** Half width used for grabbing and blasts. */
  radius: number;
  /** Body height in px; the grab box extends from the feet to this height. */
  height: number;
  /** Gold paid for a kill, before difficulty and level factors. */
  gold: number;
  /** Points for the score list per kill. */
  score: number;
  /** False means it cannot be picked up at all. */
  grabbable: boolean;
  /** Weight compared with a Pothelm (1). Heavier raiders fly shorter for the same swipe; see hand.ts. */
  mass: number;
  /** Shown in the "New enemy" window the first time it appears: what it does and how to beat it. */
  tip: string;
}

/**
 * v0.3: fewer but faster raiders (B4). Every walk speed of v0.2 times `fast`; the slow and ranged
 * types (Keg Hauler, Slinger, Siege Cart, Balloonist) only times `slow`, so they do not feel wrong.
 * A level brings about 40 % of the v0.2 raiders (CURVE.countShare in worlds/fondue/campaign.ts), so
 * every raider pays twice the gold of v0.2 (`V3_GOLD`).
 */
export const V3_SPEED = { fast: 2.5, slow: 1.4 };
export const V3_GOLD = 2;

/**
 * Grabbing fast raiders (B4): the grab reach grows with a raider's walk speed, so a running raider
 * can be caught. Extra reach in world units = (speed - from) * perSpeed, at most max. Host
 * (`Hands.tryGrabEnemy`) and guest (`GuestSession.pickEnemy`) use the same `grabBonus` in physics.ts.
 */
export const GRAB_SPEED_BONUS = { from: 150, perSpeed: 0.06, max: 30 };

/**
 * The directory of all raiders with their numbers. A world picks from it (src/config/worlds/).
 * Columns are explained at EnemyDef above. When and how often a type appears is not decided here:
 * the campaign table and the endless table of a world do that.
 */
export const ENEMIES: Record<EnemyType, EnemyDef> = {
  grunt: {
    name: 'Pothelm',
    speed: 96 * V3_SPEED.fast, strike: 4, strikeEvery: 1.1, range: 22, hp: 40, radius: 26, height: 87,
    gold: 10 * V3_GOLD, score: 100, grabbable: true, mass: 1,
    tip: 'Grab a Pothelm and fling it skyward. What goes up comes down hard.',
  },
  bomber: {
    name: 'Keg Hauler',
    speed: 85 * V3_SPEED.slow, strike: 16, strikeEvery: 3.2, range: 225, hp: 40, radius: 28, height: 90,
    gold: 15 * V3_GOLD, score: 160, grabbable: true, mass: 1.3,
    tip: 'Keg Haulers lob bombs at the gate. Lift one and shake it until the keg falls off. Pick up a thrown bomb and send it back.',
  },
  goatRider: {
    name: 'Goat Rider',
    speed: 230 * V3_SPEED.fast, strike: 8, strikeEvery: 1.0, range: 30, hp: 70, radius: 40, height: 109,
    gold: 15 * V3_GOLD, score: 180, grabbable: true, mass: 2,
    tip: 'Goat Riders charge fast. Grab them early or they reach the gate first.',
  },
  pogo: {
    name: 'Pogo Bandit',
    speed: 150 * V3_SPEED.fast, strike: 6, strikeEvery: 1.0, range: 8, hp: 40, radius: 26, height: 99,
    gold: 15 * V3_GOLD, score: 180, grabbable: true, mass: 1.15,
    tip: 'Pogo Bandits bounce over the crowd. Snatch them out of the air.',
  },
  hexer: {
    name: 'Hexer',
    speed: 78 * V3_SPEED.fast, strike: 6, strikeEvery: 1.3, range: 24, hp: 60, radius: 26, height: 97,
    gold: 20 * V3_GOLD, score: 220, grabbable: true, mass: 1.2,
    tip: 'A Hexer inside its amber bubble cannot be touched. Wait for the bubble to burst, or use a weapon.',
  },
  slinger: {
    name: 'Slinger',
    speed: 90 * V3_SPEED.slow, strike: 7, strikeEvery: 1.7, range: 330, hp: 40, radius: 26, height: 85,
    gold: 15 * V3_GOLD, score: 170, grabbable: true, mass: 1,
    tip: 'Slingers stop far out and pelt the gate from range.',
  },
  siegeCart: {
    name: 'Siege Cart',
    speed: 50 * V3_SPEED.slow, strike: 34, strikeEvery: 3.6, range: 470, hp: 260, radius: 71, height: 113,
    gold: 60 * V3_GOLD, score: 600, grabbable: false, mass: 9,
    tip: 'Too heavy to lift! Tap a Siege Cart again and again to smash it apart.',
  },
  balloonist: {
    name: 'Balloonist',
    speed: 108 * V3_SPEED.slow, strike: 14, strikeEvery: 2.2, range: 40, hp: 40, radius: 33, height: 142,
    gold: 20 * V3_GOLD, score: 240, grabbable: true, mass: 1.25,
    tip: 'Balloonists float above the fray and drop bombs on the gate. Pull them down.',
  },
  shade: {
    name: 'Shade',
    speed: 170 * V3_SPEED.fast, strike: 9, strikeEvery: 0.9, range: 22, hp: 40, radius: 26, height: 87,
    gold: 25 * V3_GOLD, score: 300, grabbable: true, mass: 0.9,
    tip: 'Shades fade from sight. You can only grab them while they are visible.',
  },
  crowcaller: {
    name: 'Crowcaller',
    speed: 110 * V3_SPEED.fast, strike: 7, strikeEvery: 1.0, range: 22, hp: 60, radius: 26, height: 92,
    gold: 25 * V3_GOLD, score: 320, grabbable: true, mass: 1.1,
    tip: 'Kill a Crowcaller and it comes back as a crow. Catch it a second time.',
  },
  yeti: {
    name: 'Yeti',
    speed: 40 * V3_SPEED.fast, strike: 30, strikeEvery: 2.4, range: 46, hp: 600, radius: 78, height: 224,
    gold: 120 * V3_GOLD, score: 1500, grabbable: true, mass: 5,
    tip: 'A Yeti is very heavy. A hand of tier 3 lifts it alone; with two players, grab it together and lift it.',
  },
};

export const ENEMY_TYPES = Object.keys(ENEMIES) as EnemyType[];

/**
 * How weapons that pick the thickest group count raiders: a type listed here counts as that many,
 * every other as one; an oversized boss raider counts `bigWeight`.
 */
export const TARGETING: { crowdWeight: Partial<Record<EnemyType, number>>; bigWeight: number } = {
  crowdWeight: { yeti: 5, siegeCart: 3, goatRider: 1.5 },
  bigWeight: 6,
};

/** Numbers for special behaviours. */
export const BEHAVIOUR = {
  /** Seconds a raider lies stunned after a landing it survives. */
  stunSeconds: 1,
  /** A keg bomb: seconds until it bursts, damage to the gate, blast radius in px, and blast damage to raiders when a player sent it. */
  bomb: { fuse: 2.6, gateDamage: 16, blastRadius: 90, blastDamage: 190 },
  /** A keg shaken loose: direction changes needed, the least hand travel between two of them, and the time they must fit into. */
  kegShake: { reversals: 4, minTravel: 36, windowSeconds: 1.6 },
  /** A thrown Keg Hauler bursts weaker than a keg: share of the keg blast. */
  carrierBlast: { radius: 0.75, damage: 0.6 },
  /** Seconds the Hexer's bubble is up, and down. */
  hexerShield: { on: 3.2, off: 3.4 },
  /** Seconds a Shade stays out of sight, and in sight. */
  shade: { hidden: 2.2, visible: 1.5 },
  /** Upward speed of a Pogo Bandit's hop (px/s), and seconds it rests at the gate between hops. */
  pogo: { hopSpeed: 1150, restAtGate: 0.5 },
  /** Height of a Balloonist above the road (px, picked between min and max), and seconds between its bombs. */
  balloon: { altitudeMin: 200, altitudeMax: 300, dropEvery: 2.2 },
  /**
   * The crow a Crowcaller turns into: flight speed (px/s), flying height above the road (px), extra grab
   * margin (px), lethalShare: it dies at this share of the usual landing speed, strike: its damage to the gate.
   */
  crow: { speed: 260, altitude: 110, grabPad: 18, lethalShare: 0.4, strike: 6 },
  /** Speed factor of a raider running off the field (developer flag "retreat"). */
  fleeSpeed: 1.9,
  /** Taps needed to break a siege cart, in any wave. */
  siegeCartTaps: 7,
  /** A Yeti held by a hand too weak to lift it: how fast it can be dragged (px/s), its walk speed factor while held, how far back one hand can drag it (px). */
  yeti: { tugSpeed: 90, slowWhileHeld: 0.35, tugReach: 70 },
  /** Oversized raiders of boss waves: factors on hit points, strike, mass, drawn size, gold and speed. */
  /** landingDamage: share of its hit points a hard landing takes off. */
  big: { hp: 14, strike: 2.5, mass: 2.4, scale: 1.75, gold: 10, speed: 0.7, landingDamage: 0.34 },
  /** Weight of a crow, which is not in the table above. */
  crowMass: 0.4,
  /** Seconds a frozen raider stays frozen, unless a weapon says otherwise. */
  frozen: { seconds: 6 },
  /** A press counts as a tap (not a grab) if it is let go within this many seconds and moved at most this many px. */
  tapMaxSeconds: 0.2,
  tapMaxMove: 14,
};
