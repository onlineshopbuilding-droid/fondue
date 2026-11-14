// Shape of the permanent save file (the profile) and its default values.
// Every change to this shape needs a higher PROFILE_VERSION and a step in migrations.ts.
// Plain JSON with a header (format, version, id, times) and then topic blocks, so it can move one to one into a cloud account later.
import { defaultFlags, type Flags } from '../config/flags';
import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import type { Difficulty } from '../config/waves';
import type { StationId } from '../config/keep';
import { TIER_MAX, TIER_MIN } from '../config/tiers';

export const PROFILE_VERSION = 1;

/**
 * Prefix of every storage key of v0.3. All builds on the site (/fondue/, /fondue/next/, /fondue/classic/)
 * share one browser storage, so v0.3 never reads or writes a key outside this prefix.
 */
export const STORAGE_PREFIX = 'fondue.v3.';
/** Storage key of the profile. A damaged profile is set aside under `${PROFILE_KEY}.broken.<time>`. */
export const PROFILE_KEY = `${STORAGE_PREFIX}profile`;

export const WEAPON_TIER_MIN = TIER_MIN;
export const WEAPON_TIER_MAX = TIER_MAX;
export const HAND_TIER_MIN = TIER_MIN;
export const HAND_TIER_MAX = TIER_MAX;
export const CASTLE_TIER_MIN = TIER_MIN;
export const CASTLE_TIER_MAX = TIER_MAX;
/** Marks the JSON as a Fondue profile; a code or file without it is not one. */
export const PROFILE_FORMAT = 'fondue-profile';
/** Number of weapon slots the loadout keeps. */
export const LOADOUT_LENGTH = 5;
/** How many run ids are remembered to stop a reward from being paid twice. */
export const CLAIMED_RUNS_LIMIT = 200;
/** Leaderboard length per world. */
export const SCORES_LIMIT = 30;

export interface ProfileSettings {
  difficulty: Difficulty;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  relayAddress: string;
  tuning: Tuning;
  /** Experiment switches, from the developer menu. */
  flags: Flags;
}

export interface ScoreEntry {
  names: string;
  coop: boolean;
  /** Wave reached. */
  wave: number;
  score: number;
  kills: number;
  difficulty: Difficulty;
  date: string;
  /** Which mode the score comes from; missing on entries of the old game version. */
  mode?: string;
}

export interface WorldProgress {
  /** Won levels. */
  levelsDone: number[];
  /** Level -> bit mask of its five cheese (see CHEESE in config/currencies.ts). */
  cheese: Record<string, number>;
  storyRead: string[];
  /** Endless leaderboard, best first. */
  scores: ScoreEntry[];
  /** Difficulty -> best wave reached in endless. */
  endlessBest: Record<string, number>;
}

export interface Wallet { cheese: number; gold: number; crests: number }

export interface OwnedWeapon { tier: number }

export interface KeepData {
  /** 1..7; the castle is also the gate. */
  castleTier: number;
  /** 1..7; tier 7 brings the second hand. */
  handTier: number;
  /** 0 = not unlocked, otherwise its tier. */
  stations: Record<StationId, number>;
  /** Only unlocked weapons are listed; tier 1..7. */
  weapons: Record<string, OwnedWeapon>;
  /** Length 5, index = slot (SLOTS); the weapon id worn there or null. */
  loadout: (string | null)[];
}

export interface SeenData { tutorial: boolean; enemies: string[]; tips: string[]; slotIntros: number[]; v3Notice: boolean }

export interface DevRating {
  checked: boolean;
  verdict: 'good' | 'bad' | null;
  note: string;
}

export interface ProfileData {
  format: typeof PROFILE_FORMAT;
  version: number;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  settings: ProfileSettings;
  /** What can be spent right now. */
  wallet: Wallet;
  /** Everything ever earned, spent amounts included. */
  earned: Wallet;
  keep: KeepData;
  worlds: Record<string, WorldProgress>;
  seen: SeenData;
  /** The last run ids whose reward was paid out. */
  claimedRuns: string[];
  devRatings: Record<string, DevRating>;
  /** Permanent developer cheats mark the profile visibly. */
  cheats: { used: boolean; log: string[] };
  /** An interrupted level. The content belongs to the app; the profile only keeps it. */
  pendingRun: unknown | null;
  /** Reserved for a later co-op campaign. */
  coopCampaign: Record<string, unknown>;
}

export function freshSettings(): ProfileSettings {
  return {
    difficulty: 'medium',
    musicVolume: 0.5,
    sfxVolume: 0.8,
    muted: false,
    relayAddress: '',
    tuning: { ...TUNING_DEFAULT },
    flags: defaultFlags(),
  };
}

export function freshWorld(): WorldProgress {
  return { levelsDone: [], cheese: {}, storyRead: [], scores: [], endlessBest: {} };
}

export function freshRating(): DevRating {
  return { checked: false, verdict: null, note: '' };
}

/** A random id for this profile. Not a secret, only a name for the save file. */
export function newProfileId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const part = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${part()}-${part()}-${part()}-${part()}`;
}

export const freshWallet = (): Wallet => ({ cheese: 0, gold: 0, crests: 0 });

export function freshKeep(): KeepData {
  return {
    castleTier: CASTLE_TIER_MIN, handTier: HAND_TIER_MIN, stations: { cauldron: 0, perch: 0 }, weapons: {},
    loadout: Array.from({ length: LOADOUT_LENGTH }, () => null),
  };
}

/** A brand new profile: nothing unlocked, nothing played. The Rolling Wheel comes with the tutorial. */
export function freshProfile(): ProfileData {
  const now = new Date().toISOString();
  return {
    format: PROFILE_FORMAT,
    version: PROFILE_VERSION,
    profileId: newProfileId(),
    createdAt: now,
    updatedAt: now,
    name: '',
    settings: freshSettings(),
    wallet: freshWallet(),
    earned: freshWallet(),
    keep: freshKeep(),
    worlds: {},
    seen: { tutorial: false, enemies: [], tips: [], slotIntros: [], v3Notice: false },
    claimedRuns: [],
    devRatings: {},
    cheats: { used: false, log: [] },
    pendingRun: null,
    coopCampaign: {},
  };
}
