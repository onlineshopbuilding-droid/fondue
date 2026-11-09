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
  gold: number;
  score: number;
  /** False means it cannot be picked up at all. */
  grabbable: boolean;
  /** First day it can appear in endless mode. */
  firstDay: number;
  /** Spawn weight once unlocked. */
  weight: number;
  /** Most of this type per day, before scaling. */
  maxPerDay: number;
  /** Shown once before the first day it appears. */
  tip: string;
}

/** All enemy numbers. Change them here, nothing else needs to know. */
export const ENEMIES: Record<EnemyType, EnemyDef> = {
  grunt: {
    name: 'Pothelm',
    speed: 96, strike: 5, strikeEvery: 1.1, range: 22, hp: 40, radius: 26, height: 87,
    gold: 10, score: 100, grabbable: true, firstDay: 1, weight: 10, maxPerDay: 999,
    tip: 'Grab a Pothelm and fling it skyward. What goes up comes down hard.',
  },
  bomber: {
    name: 'Keg Hauler',
    speed: 85, strike: 26, strikeEvery: 3.2, range: 225, hp: 40, radius: 28, height: 90,
    gold: 15, score: 160, grabbable: true, firstDay: 2, weight: 3, maxPerDay: 40,
    tip: 'Keg Haulers lob bombs at the gate. A quick click makes them drop the keg. Pick up a thrown bomb and send it back.',
  },
  goatRider: {
    name: 'Goat Rider',
    speed: 230, strike: 8, strikeEvery: 1.0, range: 30, hp: 70, radius: 40, height: 109,
    gold: 15, score: 180, grabbable: true, firstDay: 3, weight: 3, maxPerDay: 40,
    tip: 'Goat Riders charge fast. Grab them early or they reach the gate first.',
  },
  pogo: {
    name: 'Pogo Bandit',
    speed: 150, strike: 9, strikeEvery: 1.0, range: 8, hp: 40, radius: 26, height: 99,
    gold: 15, score: 180, grabbable: true, firstDay: 4, weight: 3, maxPerDay: 40,
    tip: 'Pogo Bandits bounce over the crowd. Snatch them out of the air.',
  },
  hexer: {
    name: 'Hexer',
    speed: 78, strike: 6, strikeEvery: 1.3, range: 24, hp: 60, radius: 26, height: 97,
    gold: 20, score: 220, grabbable: true, firstDay: 5, weight: 2, maxPerDay: 24,
    tip: 'A Hexer inside its amber bubble cannot be touched. Wait for the bubble to burst, or use a weapon.',
  },
  slinger: {
    name: 'Slinger',
    speed: 90, strike: 7, strikeEvery: 1.7, range: 330, hp: 40, radius: 26, height: 85,
    gold: 15, score: 170, grabbable: true, firstDay: 6, weight: 2.5, maxPerDay: 30,
    tip: 'Slingers stop far out and pelt the gate from range.',
  },
  siegeCart: {
    name: 'Siege Cart',
    speed: 50, strike: 34, strikeEvery: 3.6, range: 470, hp: 260, radius: 71, height: 113,
    gold: 60, score: 600, grabbable: false, firstDay: 7, weight: 0.5, maxPerDay: 5,
    tip: 'Too heavy to lift! Click a Siege Cart again and again to smash it apart.',
  },
  balloonist: {
    name: 'Balloonist',
    speed: 108, strike: 14, strikeEvery: 2.2, range: 40, hp: 40, radius: 33, height: 142,
    gold: 20, score: 240, grabbable: true, firstDay: 8, weight: 1.5, maxPerDay: 18,
    tip: 'Balloonists float above the fray and drop bombs on the gate. Pull them down.',
  },
  shade: {
    name: 'Shade',
    speed: 170, strike: 9, strikeEvery: 0.9, range: 22, hp: 40, radius: 26, height: 87,
    gold: 25, score: 300, grabbable: true, firstDay: 10, weight: 1.5, maxPerDay: 20,
    tip: 'Shades fade from sight. You can only grab them while they are visible.',
  },
  crowcaller: {
    name: 'Crowcaller',
    speed: 110, strike: 7, strikeEvery: 1.0, range: 22, hp: 60, radius: 26, height: 92,
    gold: 25, score: 320, grabbable: true, firstDay: 12, weight: 1.2, maxPerDay: 16,
    tip: 'Kill a Crowcaller and it comes back as a crow. Catch it a second time.',
  },
  yeti: {
    name: 'Yeti',
    speed: 40, strike: 60, strikeEvery: 2.2, range: 46, hp: 1400, radius: 78, height: 224,
    gold: 120, score: 1500, grabbable: true, firstDay: 14, weight: 0.35, maxPerDay: 4,
    tip: 'One hand cannot lift a Yeti. With two players, grab it together. Alone, weapons will have to do.',
  },
};

export const ENEMY_TYPES = Object.keys(ENEMIES) as EnemyType[];

/** Numbers for special behaviours. */
export const BEHAVIOUR = {
  stunSeconds: 1,
  bomb: { fuse: 2.6, gateDamage: 26, blastRadius: 120, blastDamage: 220 },
  kegDropFuse: 0.75,
  hexerShield: { on: 3.2, off: 3.4 },
  shade: { hidden: 2.2, visible: 1.5 },
  pogo: { hopSpeed: 1150, restAtGate: 0.5 },
  balloon: { altitudeMin: 200, altitudeMax: 300, dropEvery: 2.2 },
  crow: { speed: 260, altitude: 110, grabPad: 18 },
  /** Clicks needed to break a siege cart, on any day. */
  siegeCartTaps: 7,
  yeti: { tugSpeed: 90, slowWhileHeld: 0.35, tugReach: 70 },
  frozen: { seconds: 6 },
  tapMaxSeconds: 0.2,
  tapMaxMove: 14,
};
