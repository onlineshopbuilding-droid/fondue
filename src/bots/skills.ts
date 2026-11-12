// The three kinds of scripted player for balance runs: how fast, how precise and how clever they are.
// Every value is something a person has too; nothing here lets a bot see or do more than a person.

/** How a scripted player behaves. All of it is what a person could do or see. */
export interface BotSkill {
  name: string;
  /** Pause between finishing one action and starting the next, seconds. */
  reaction: number;
  /** Hand speed across the screen, px/s. */
  handSpeed: number;
  /** How long a grabbed raider is held before letting go, seconds. */
  holdTime: number;
  /** The press lands where the target was this long ago, seconds. */
  aimLag: number;
  /** Spread of a press around its aim point, px. */
  clickNoise: number;
  /** Chance a press goes clearly wide. */
  misclick: number;
  /** Chance a throw is too weak to kill. */
  weakThrow: number;
  /** Spread of a throw at the pot or the hook, px. */
  throwNoise: number;
  /** 0 = whatever is nearest the hand, 1 = whoever hurts the gate most. */
  tactics: number;
  /** Reads bubbles and only goes for what can be grabbed right now. */
  readsShields: boolean;
  /** Share of kills aimed at the pot when it is free. */
  potRate: number;
  /** Share of kills aimed at the hook when it is free. */
  perchRate: number;
  /** Seconds between looks at the weapon row. */
  weaponEvery: number;
  /** Chance a ready weapon is noticed at such a look. */
  weaponUse: number;
  /** Raiders that must be in a weapon's reach before it is tapped. */
  minCrowd: number;
  /**
   * Taps helper weapons (Golden Fondue, Ember Beacon, Cuckoo Clock, Alphorn, Hedgehog Gate) at the
   * right moment. Without it they are tapped as soon as anything is on the road.
   */
  weaponWise: boolean;
  /** Seconds between taps on a siege cart. */
  tapEvery: number;
  /** Taps on a cart before losing interest. */
  tapsPerCart: number;
  /** Chance per decision of joining a yeti with the other hand, 0 = never. */
  yetiTeamwork: number;
  /** Chance of shaking a Keg Hauler that still carries its keg, instead of just throwing it. */
  shakeTry: number;
  /** Seconds of shaking before the keg comes loose. */
  shakeSeconds: number;
  /**
   * How well the swipe makes up for a heavy raider: 0 swipes as for a Pothelm (heavy ones fly short),
   * 1 swipes exactly as much harder as the weight needs.
   */
  heavyThrow: number;
  /** Fastest swipe this player makes, px/s. Caps the extra force for heavy raiders. */
  swipeMax: number;
  shop: 'random' | 'order' | 'plan';
}

export const BOT_SKILLS: Record<string, BotSkill> = {
  poor: {
    name: 'Poor', reaction: 0.29, handSpeed: 1500, holdTime: 0.24, aimLag: 0.16, clickNoise: 20, misclick: 0.09, weakThrow: 0.12,
    throwNoise: 120, tactics: 0, readsShields: false, potRate: 0.12, perchRate: 0, weaponEvery: 5, weaponUse: 0.5, minCrowd: 1,
    weaponWise: false, tapEvery: 0.5, tapsPerCart: 3, yetiTeamwork: 0,
    shakeTry: 0.25, shakeSeconds: 1.5, heavyThrow: 0.3, swipeMax: 2000, shop: 'random',
  },
  mid: {
    name: 'Mid', reaction: 0.27, handSpeed: 1900, holdTime: 0.22, aimLag: 0.12, clickNoise: 13, misclick: 0.05, weakThrow: 0.08,
    throwNoise: 60, tactics: 0.6, readsShields: true, potRate: 0.45, perchRate: 0.15, weaponEvery: 1.8, weaponUse: 0.8, minCrowd: 3,
    weaponWise: true, tapEvery: 0.3, tapsPerCart: 7, yetiTeamwork: 0.35,
    shakeTry: 0.6, shakeSeconds: 1.1, heavyThrow: 0.7, swipeMax: 2500, shop: 'order',
  },
  great: {
    name: 'Great', reaction: 0.16, handSpeed: 2700, holdTime: 0.16, aimLag: 0.07, clickNoise: 7, misclick: 0.02, weakThrow: 0.025,
    throwNoise: 28, tactics: 1, readsShields: true, potRate: 0.8, perchRate: 0.5, weaponEvery: 0.9, weaponUse: 0.95, minCrowd: 4,
    weaponWise: true, tapEvery: 0.2, tapsPerCart: 7, yetiTeamwork: 1,
    shakeTry: 0.9, shakeSeconds: 0.7, heavyThrow: 1, swipeMax: 3000, shop: 'plan',
  },
};

export const SKILL_IDS = ['poor', 'mid', 'great'] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const skillOf = (s: string | BotSkill): BotSkill => (typeof s === 'string' ? BOT_SKILLS[s] : s);
