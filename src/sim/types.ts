import type { Tuning } from '../config/tuning';
import type { EnemyType } from '../config/enemies';
import type { Difficulty } from '../config/waves';
import type { WeaponSlot } from '../config/shop';

export type EnemyState =
  | 'walk' // moving toward the gate
  | 'attack' // standing at its range and striking
  | 'hop' // pogo bandit mid-bounce
  | 'float' // balloonist or crow
  | 'held' // in a hand
  | 'air' // thrown, flying, falling
  | 'stun' // landed softly, dazed
  | 'frozen'
  | 'hooked' // hanging on the eagle perch
  | 'flee'; // day is over

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
  armed: boolean;
  crow: boolean;
  /** Fuse when a keg was dropped, otherwise 0. */
  kegFuse: number;
  altitude: number;
  thrownBy: number;
  dead: boolean;
  /** Was frozen at the moment it was grabbed. */
  frozenHeld: boolean;
  maxHp: number;
  /** How far right a single hand may drag a yeti. */
  tugLimit: number;
}

export type ProjectileKind = 'bomb' | 'stone' | 'bolt' | 'wheel' | 'comet' | 'slab' | 'roofBolt' | 'shell';

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  /** Seconds alive, or fuse for bombs. */
  t: number;
  /** Tier-dependent size value used by rendering and damage. */
  size: number;
  damage: number;
  /** Player holding this, or -1. */
  heldBy: number;
  /** Player credited with what this hits, or -1. */
  owner: number;
  /** Comet swing path in px. */
  charge: number;
  pierce: boolean;
  /** Enemy ids already hit by a piercing projectile. */
  hit: number[];
  /** Most enemies this may hit. */
  maxHits: number;
  /** A bomb the player has touched: only those hurt raiders. */
  byPlayer: boolean;
  landed: boolean;
}

export interface Flame {
  id: number;
  x: number;
  halfWidth: number;
  t: number;
  dur: number;
}

export type HandMode = 'none' | 'stomper' | 'comet' | 'horn';

export interface Hand {
  x: number;
  y: number;
  down: boolean;
  mode: HandMode;
  /** Enemy id held, or -1. */
  holding: number;
  /** Projectile id held, or -1. */
  holdingProj: number;
  pressX: number;
  pressY: number;
  pressTick: number;
  /** The current press began after the weapon mode started, so its release may fire. */
  modePress: boolean;
  connected: boolean;
}

export type Phase = 'banner' | 'battle' | 'victory' | 'intermission' | 'defeat' | 'gameover';

export interface DayStats {
  day: number;
  kills: number;
  goldEarned: number;
  offeringsEarned: number;
  score: number;
  gatePct: number;
}

export interface SpawnEntry {
  t: number;
  type: EnemyType;
}

export interface Meta {
  rev: number;
  difficulty: Difficulty;
  owned: string[];
  hornEquipped: string | null;
  names: string[];
  ready: boolean[];
  lastDay: DayStats | null;
  totalScore: number;
  totalKills: number;
  newTipTypes: EnemyType[];
  pausedBy: string | null;
  tuning: Tuning;
}

export interface SimState {
  tick: number;
  phase: Phase;
  phaseT: number;
  day: number;
  dayT: number;
  gold: number;
  offerings: number;
  gateHp: number;
  gateMax: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  flames: Flame[];
  hands: Hand[];
  cooldowns: Record<WeaponSlot, number>;
  cooldownMax: Record<WeaponSlot, number>;
  spawnQueue: SpawnEntry[];
  spawned: number;
  perchBusy: number;
  nextId: number;
  rngState: number;
  dayKills: number;
  dayGold: number;
  dayOfferings: number;
  dayScore: number;
  paused: boolean;
  seenTypes: EnemyType[];
  meta: Meta;
}

export type DeathCause = 'impact' | 'blast' | 'crush' | 'fire' | 'bolt' | 'shatter' | 'cauldron' | 'eagle' | 'tap';

/** Things the renderer and audio need to hear about, in order. */
export type SimEvent =
  | { e: 'grab'; id: number; p: number; x: number; y: number; etype: EnemyType }
  | { e: 'release'; id: number; p: number; speed: number; x: number; y: number }
  | { e: 'impact'; id: number; x: number; y: number; speed: number; etype: EnemyType; lethal: boolean }
  | { e: 'death'; id: number; x: number; y: number; etype: EnemyType; cause: DeathCause; gold: number; p: number }
  | { e: 'gateHit'; x: number; y: number; amount: number; etype: EnemyType }
  | { e: 'explosion'; x: number; y: number; radius: number }
  | { e: 'throwKeg'; x: number; y: number }
  | { e: 'kegDrop'; x: number; y: number }
  | { e: 'strike'; x: number; y: number; etype: EnemyType }
  | { e: 'shoot'; x: number; y: number; kind: ProjectileKind }
  | { e: 'wheel'; size: number }
  | { e: 'slam'; x: number; y: number; halfWidth: number }
  | { e: 'freeze'; x: number; y: number; radius: number }
  | { e: 'shatter'; x: number; y: number }
  | { e: 'flame'; x: number; halfWidth: number }
  | { e: 'bellows'; x: number; halfWidth: number }
  | { e: 'mortar'; x: number; y: number }
  | { e: 'bolters' }
  | { e: 'eagle'; x: number; y: number; id: number }
  | { e: 'splash'; x: number; y: number; etype: EnemyType }
  | { e: 'crow'; x: number; y: number }
  | { e: 'shieldUp'; x: number; y: number }
  | { e: 'shieldBlock'; x: number; y: number }
  | { e: 'tapCart'; x: number; y: number; hp: number }
  | { e: 'dayStart'; day: number }
  | { e: 'victory' }
  | { e: 'defeat' }
  | { e: 'buy'; p: number; item: string; name: string }
  | { e: 'denied'; p: number }
  | { e: 'weaponReady'; slot: WeaponSlot };

/** Everything players can ask the simulation to do. */
export type Command =
  | { k: 'press'; p: number; x: number; y: number }
  | { k: 'release'; p: number; x: number; y: number; vx: number; vy: number }
  | { k: 'activate'; p: number; slot: WeaponSlot }
  | { k: 'cancelMode'; p: number }
  | { k: 'buy'; p: number; item: string }
  | { k: 'equip'; p: number; item: string }
  | { k: 'ready'; p: number; ready: boolean }
  | { k: 'forceStart'; p: number }
  | { k: 'pause'; p: number; paused: boolean };

export interface SimOptions {
  seed: number;
  difficulty: Difficulty;
  names: string[];
  tuning: Tuning;
}
