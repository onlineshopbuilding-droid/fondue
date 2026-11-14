/**
 * The data the simulation works on: raiders, projectiles, hands, the whole state of a run, the
 * events it reports and the commands it accepts.
 */
import type { Flags } from '../config/flags';
import type { Tuning } from '../config/tuning';
import type { EnemyType } from '../config/enemies';
import type { Loadout, RunResult, RunRules, RunStatsData, WaveInfo } from './rules';

export type EnemyState =
  | 'walk' // moving toward the gate
  | 'attack' // standing at its range and striking
  | 'hop' // pogo bandit mid-bounce
  | 'float' // balloonist or crow
  | 'held' // in a hand
  | 'air' // thrown, flying, falling
  | 'stun' // landed softly, pinned or dazed
  | 'frozen'
  | 'hooked' // hanging on the eagle perch
  | 'cooking' // melting into cheese in the cauldron
  | 'flee'; // runs off the field (developer flag)

export interface Enemy {
  id: number;
  type: EnemyType;
  st: EnemyState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  /** Depth offset added to the ground line. */
  lane: number;
  hp: number;
  /** Generic timer of the current state, in seconds. */
  t: number;
  /** Seconds until the next strike. */
  strikeT: number;
  /** Player indices holding this enemy. Only the yeti can have two. */
  heldBy: number[];
  grabOffX: number;
  grabOffY: number;
  shieldOn: boolean;
  /** Seconds until shield or stealth toggles. */
  cycleT: number;
  hidden: boolean;
  /** A Keg Hauler that still carries its keg. */
  armed: boolean;
  crow: boolean;
  altitude: number;
  thrownBy: number;
  dead: boolean;
  /** Was frozen at the moment it was grabbed. */
  frozenHeld: boolean;
  maxHp: number;
  /** How far right a single weak hand may drag a yeti. */
  tugLimit: number;
  /** An oversized raider of a boss wave: more hit points, harder strikes, much heavier. */
  big: boolean;
}

export type ProjectileKind = 'bomb' | 'stone' | 'bolt' | 'wheel' | 'comet' | 'slab' | 'roofBolt' | 'shell' | 'frostShell' | 'fireShell'
  | 'snowball' | 'pinecone' | 'hornet';

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  /** Seconds alive, or fuse for bombs. Negative means spent. */
  t: number;
  /** Size value used by rendering and damage (radius or half width). */
  size: number;
  damage: number;
  /** Player holding this, or -1. */
  heldBy: number;
  /** Player credited with what this hits, or -1. */
  owner: number;
  pierce: boolean;
  /** Enemy ids already hit by a piercing projectile. */
  hit: number[];
  /** Most enemies this may hit. */
  maxHits: number;
  /** Seconds until a crossbow bolt is spent. */
  ttl: number;
  /** A bomb the player has touched: only those hurt raiders. */
  byPlayer: boolean;
  landed: boolean;
  /** A duration the weapon gave it: seconds of fire it leaves, of ice it makes, or of daze after a slam. */
  seconds: number;
  /** A second value of the weapon that fired it: burn strength of fire, reach of a slam's tremor. */
  aux: number;
  /** A keg shaken loose: it bursts the moment it touches the ground. */
  burstOnLand: boolean;
}

/** A patch of road that does something to whoever stands in it. */
export interface Zone {
  id: number;
  /** fire burns; cheese (Sticky Fondue) slows and may burn; snow (Snowdrift Cannon) slows; hotCheese (Cheese Cascade) scalds before the gate. */
  kind: 'fire' | 'cheese' | 'snow' | 'hotCheese';
  x: number;
  halfWidth: number;
  /** Seconds left, and how long it lasts in total. */
  t: number;
  dur: number;
  /** Damage per second. */
  dps: number;
  /** Walk speed factor inside the zone; 1 means no slowing. */
  slow: number;
}

export interface Hand {
  x: number;
  y: number;
  down: boolean;
  /** Enemy id held, or -1. */
  holding: number;
  /** Projectile id held, or -1. */
  holdingProj: number;
  pressX: number;
  pressY: number;
  pressTick: number;
  connected: boolean;
}

/** banner: level start (raiders already walk); battle: the waves; then runWon, or defeat and gameover. */
export type Phase = 'banner' | 'battle' | 'defeat' | 'gameover' | 'runWon';

export interface SpawnEntry {
  t: number;
  type: EnemyType;
  big?: boolean;
}

/** A follow-up of a weapon that fires more than once per tap: second slam, second wheel, next pulse. */
export interface DelayedShot {
  /** Seconds until it happens. */
  t: number;
  slot: number;
  weapon: string;
  tier: number;
  /** Which follow-up this is, counted from 1. */
  step: number;
  /** Where the first shot went. */
  x: number;
  p: number;
}

/** Rarely changing data of a run. Sent to the guest whenever `rev` rises. */
export interface Meta {
  rev: number;
  names: string[];
  totalScore: number;
  totalKills: number;
  pausedBy: string | null;
  tuning: Tuning;
  /** Experiment switches of the host. */
  flags: Flags;
  /** Width of the field in world units, decided by the host. */
  fieldW: number;
  /** Right edge of the host's visible field in world units; raiders step in here (B3). */
  viewRight: number;
  rules: RunRules;
  loadout: Loadout;
  /** The wave being fought: landscape, night, boss, newcomers. */
  wave: WaveInfo;
  /** A developer tool shaped this run: it reaches neither the scores nor the rewards. */
  devRun: boolean;
  /** Set once the run has ended, won or lost. */
  result: RunResult | null;
}

export interface SimState {
  tick: number;
  phase: Phase;
  phaseT: number;
  /** Current wave (1-based) and seconds since it began. */
  wave: number;
  waveT: number;
  /** Seconds since the level started. */
  runT: number;
  /** All arrivals of the current wave are out; counting the breath before the next one. */
  waveDone: boolean;
  pauseT: number;
  /** Seconds the field has been empty while arrivals are still due (the B2 rule). */
  emptyT: number;
  /** Breath after the current wave, from its plan. */
  pauseAfter: number;
  /** Tests and developer tools: no arrivals and no next wave; the fight goes on with whoever is there. */
  wavesFrozen: boolean;
  /** Gold earned in this run (shown in the HUD, credited to the profile at the end). */
  gold: number;
  /** Raider Crests left at the perch in this run. */
  crests: number;
  gateHp: number;
  gateMax: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  zones: Zone[];
  hands: Hand[];
  /** Seconds until each slot's weapon is ready, and the full reload time of its last shot. */
  cooldowns: number[];
  cooldownMax: number[];
  delayed: DelayedShot[];
  /** Seconds the Golden Fondue still pays extra, and by which factor. */
  goldRushT: number;
  goldRushFactor: number;
  /** Seconds the Ember Beacon still burns. */
  beaconT: number;
  /** Seconds fliers still hang motionless (Cuckoo Clock). */
  airStopT: number;
  /** Seconds until the sentry shoots on its own again, and shots left in a burst. */
  sentryT: number;
  sentryBurst: number;
  /**
   * Helping Hand: seconds each player still has a second hand (index = player), and that hand's
   * strength as a share of the player's own hand. Read by the hand code (package P-Hände).
   */
  extraHandT: number[];
  extraHandStrength: number;
  /** Iron Grip: seconds left, hand strength factor, and factor on the lethal impact speed (below 1 = easier kills). */
  gripT: number;
  gripStrength: number;
  gripLethal: number;
  /** Mending Horn: seconds the gate still mends, and how much of its full strength per second. */
  mendT: number;
  mendRate: number;
  spawnQueue: SpawnEntry[];
  spawned: number;
  /** Seconds until the eagle hook is free. */
  perchBusy: number;
  /** Seconds until the cauldron is free, and how long this melt takes in total. */
  potBusy: number;
  potMax: number;
  /** Everything stands still until `resume` (tutorial); not a pause, no pause window. */
  hold: boolean;
  nextId: number;
  seed: number;
  rngState: number;
  paused: boolean;
  seenTypes: EnemyType[];
  stats: RunStatsData;
  meta: Meta;
}

export type DeathCause = 'impact' | 'blast' | 'crush' | 'fire' | 'bolt' | 'shatter' | 'cauldron' | 'eagle' | 'tap' | 'shock' | 'spike';

/** Things the renderer and audio need to hear about, in order. */
export type SimEvent =
  | { e: 'grab'; id: number; p: number; x: number; y: number; etype: EnemyType }
  | { e: 'release'; id: number; p: number; speed: number; x: number; y: number }
  | { e: 'impact'; id: number; x: number; y: number; speed: number; etype: EnemyType; lethal: boolean }
  | { e: 'death'; id: number; x: number; y: number; etype: EnemyType; cause: DeathCause; gold: number; p: number }
  | { e: 'gateHit'; x: number; y: number; amount: number; etype: EnemyType }
  | { e: 'explosion'; x: number; y: number; radius: number }
  | { e: 'throwKeg'; x: number; y: number }
  | { e: 'kegLoose'; x: number; y: number; p: number }
  | { e: 'strike'; x: number; y: number; etype: EnemyType }
  | { e: 'shoot'; x: number; y: number; kind: ProjectileKind }
  | { e: 'fire'; slot: number; weapon: string; tier: number; p: number }
  | { e: 'wheel'; size: number }
  | { e: 'slam'; x: number; y: number; halfWidth: number; shock: number }
  | { e: 'freeze'; x: number; y: number; radius: number }
  | { e: 'shatter'; x: number; y: number }
  | { e: 'zone'; kind: Zone['kind']; x: number; halfWidth: number }
  | { e: 'bellows'; x: number; halfWidth: number }
  | { e: 'mortar'; x: number; y: number }
  | { e: 'bolters'; x: number; y: number }
  | { e: 'spikes'; x: number; halfWidth: number }
  | { e: 'hornBlast'; reach: number }
  | { e: 'cuckoo'; seconds: number }
  | { e: 'lightning'; points: number[] }
  | { e: 'goldRush'; seconds: number }
  | { e: 'beacon'; seconds: number }
  | { e: 'thorns'; reach: number }
  | { e: 'sentryShot'; x: number; y: number; tx: number; ty: number }
  | { e: 'toll'; x: number; radius: number }
  | { e: 'extraHand'; seconds: number }
  | { e: 'grip'; seconds: number }
  | { e: 'mend'; amount: number }
  | { e: 'cascade'; halfWidth: number }
  | { e: 'logSwing'; reach: number }
  | { e: 'catapult'; x: number; y: number }
  | { e: 'hive'; x: number; y: number }
  | { e: 'snowdrift'; x: number; y: number }
  | { e: 'eagle'; x: number; y: number; id: number }
  | { e: 'splash'; x: number; y: number; etype: EnemyType }
  | { e: 'cheese'; x: number; y: number; etype: EnemyType }
  | { e: 'crow'; x: number; y: number }
  | { e: 'shieldUp'; x: number; y: number }
  | { e: 'shieldBlock'; x: number; y: number }
  | { e: 'tapCart'; x: number; y: number; hp: number }
  | { e: 'waveStart'; wave: number }
  | { e: 'runWon' }
  | { e: 'defeat' }
  | { e: 'crest'; x: number; y: number; amount: number }
  | { e: 'denied'; p: number }
  | { e: 'weaponReady'; slot: number };

/** Everything players can ask the simulation to do. Nothing is bought during a run. */
export type Command =
  | { k: 'press'; p: number; x: number; y: number }
  | { k: 'release'; p: number; x: number; y: number; vx: number; vy: number }
  | { k: 'fireSlot'; p: number; slot: number }
  | { k: 'shake'; p: number }
  | { k: 'pause'; p: number; paused: boolean };
