// Shape of the permanent save file (the profile) and its default values.
// Every change to this shape needs a higher PROFILE_VERSION and a step in migrations.ts.
import { defaultFlags, type Flags } from '../config/flags';
import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import type { Difficulty } from '../config/waves';

export const PROFILE_VERSION = 1;

/** Storage key of the profile. */
export const PROFILE_KEY = 'fondue.profile';
/** Keys of the old game version. They are read once and never written or removed. */
export const LEGACY_SETTINGS_KEY = 'fondue.settings.v1';
export const LEGACY_SCORES_KEY = 'fondue.scores.v1';
/** The world the old leaderboard belongs to. */
export const LEGACY_WORLD_ID = 'fondue';

export const WEAPON_TIER_MIN = 1;
export const WEAPON_TIER_MAX = 5;
export const HAND_TIER_MIN = 1;
export const HAND_TIER_MAX = 3;
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
  day: number;
  score: number;
  kills: number;
  difficulty: Difficulty;
  date: string;
  /** Which mode the score comes from; missing on entries of the old game version. */
  mode?: string;
}

export interface WorldProgress {
  levelsDone: number[];
  /** Levels for which the stars earned as a co-op guest were already paid out. */
  guestStarLevels: number[];
  storyRead: string[];
  /** Difficulty -> milestone days that were already paid out. */
  endlessMilestones: Record<string, number[]>;
  scores: ScoreEntry[];
}

export interface DevRating {
  checked: boolean;
  verdict: 'good' | 'bad' | null;
  note: string;
}

export interface ProfileData {
  version: number;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  settings: ProfileSettings;
  /** Stars the player can spend right now. */
  stars: number;
  /** Stars ever earned, spent ones included. */
  starsEarned: number;
  unlockedWeapons: string[];
  unlockedSlots: number[];
  unlockedStations: string[];
  /** Permanent weapon tiers, 1..5. A missing entry means tier 1. */
  weaponTiers: Record<string, number>;
  /** 1..3 */
  handTier: number;
  tutorialDone: boolean;
  seenEnemies: string[];
  seenTips: string[];
  /** The last run ids whose reward was paid out. */
  claimedRuns: string[];
  worlds: Record<string, WorldProgress>;
  devRatings: Record<string, DevRating>;
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
  return { levelsDone: [], guestStarLevels: [], storyRead: [], endlessMilestones: {}, scores: [] };
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

/** A brand new profile: nothing unlocked, nothing played. */
export function freshProfile(): ProfileData {
  const now = new Date().toISOString();
  return {
    version: PROFILE_VERSION,
    profileId: newProfileId(),
    createdAt: now,
    updatedAt: now,
    name: '',
    settings: freshSettings(),
    stars: 0,
    starsEarned: 0,
    unlockedWeapons: [],
    unlockedSlots: [],
    unlockedStations: [],
    weaponTiers: {},
    handTier: HAND_TIER_MIN,
    tutorialDone: false,
    seenEnemies: [],
    seenTips: [],
    claimedRuns: [],
    worlds: {},
    devRatings: {},
    pendingRun: null,
    coopCampaign: {},
  };
}
