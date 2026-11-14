/** Feel parameters. All of these can be changed live in the tuning panel (F1). */
export interface Tuning {
  /** Downward acceleration in px/s². */
  gravity: number;
  /** Multiplies the measured pointer velocity at release. */
  throwMult: number;
  /** Maximum release speed in px/s. */
  maxThrow: number;
  /** How many ms of pointer history feed the release velocity. */
  velWindowMs: number;
  /** Impact speed in px/s at which a landing kills. */
  lethalImpact: number;
  /** Freeze frame length for a strong impact, in ms. */
  hitstopMs: number;
  /** Screen shake multiplier. */
  shake: number;
  /** Spring stiffness pulling a held enemy to the hand. */
  holdSpring: number;
  /** Extra grab distance around an enemy, in px. */
  grabRadius: number;
  /** Multiplies every enemy's walk speed. */
  walkSpeed: number;
  /** Multiplies the number of enemies per wave. */
  spawnRate: number;
  /** Seconds a raider takes to melt into cheese; the pot is busy meanwhile. */
  cauldronSeconds: number;
  /** If true, thrown enemies knock over those they land on. */
  knockOthers: boolean;
}

export const TUNING_DEFAULT: Tuning = {
  gravity: 3400,
  throwMult: 1.0,
  maxThrow: 1700,
  velWindowMs: 110,
  lethalImpact: 900,
  hitstopMs: 60,
  shake: 1,
  holdSpring: 1600,
  grabRadius: 34,
  walkSpeed: 1,
  spawnRate: 1,
  cauldronSeconds: 1.4,
  knockOthers: false,
};

export const TUNING_ARCADE: Tuning = {
  ...TUNING_DEFAULT,
  gravity: 2600,
  throwMult: 1.25,
  maxThrow: 3400,
  lethalImpact: 520,
  hitstopMs: 85,
  shake: 1.5,
  grabRadius: 48,
  knockOthers: true,
};

export const TUNING_PRESETS: Record<string, Tuning> = {
  Default: TUNING_DEFAULT,
  Arcade: TUNING_ARCADE,
};

export interface TuningSlider {
  key: Exclude<keyof Tuning, 'knockOthers'>;
  label: string;
  min: number;
  max: number;
  step: number;
}

export const TUNING_SLIDERS: TuningSlider[] = [
  { key: 'gravity', label: 'Gravity', min: 800, max: 8000, step: 50 },
  { key: 'throwMult', label: 'Throw multiplier', min: 0.3, max: 2.5, step: 0.05 },
  { key: 'maxThrow', label: 'Max throw speed', min: 800, max: 6000, step: 50 },
  { key: 'velWindowMs', label: 'Velocity window (ms)', min: 30, max: 200, step: 5 },
  { key: 'lethalImpact', label: 'Lethal impact speed', min: 150, max: 2000, step: 10 },
  { key: 'hitstopMs', label: 'Hitstop (ms)', min: 0, max: 160, step: 5 },
  { key: 'shake', label: 'Shake strength', min: 0, max: 3, step: 0.1 },
  { key: 'holdSpring', label: 'Hold spring', min: 100, max: 6000, step: 50 },
  { key: 'grabRadius', label: 'Grab radius', min: 0, max: 120, step: 2 },
  { key: 'walkSpeed', label: 'Enemy walk speed', min: 0.2, max: 3, step: 0.05 },
  { key: 'spawnRate', label: 'Spawn rate', min: 0.2, max: 4, step: 0.05 },
  { key: 'cauldronSeconds', label: 'Cauldron melt (s)', min: 0.4, max: 3, step: 0.1 },
];
