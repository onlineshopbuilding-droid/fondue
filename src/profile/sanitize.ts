// Turns anything that was read from storage into valid profile data, field by field.
// A field with the wrong type gets its default value; nothing in here ever throws.
import { cleanFlags, type Flags } from '../config/flags';
import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import { DIFFICULTIES, type Difficulty } from '../config/waves';
import {
  CLAIMED_RUNS_LIMIT, HAND_TIER_MAX, HAND_TIER_MIN, PROFILE_VERSION, SCORES_LIMIT, WEAPON_TIER_MAX, WEAPON_TIER_MIN,
  freshProfile, freshSettings,
  type DevRating, type ProfileData, type ProfileSettings, type ScoreEntry, type WorldProgress,
} from './schema';

export type RawRecord = Record<string, unknown>;

/** True for plain objects, false for arrays, null and everything else. */
export function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Own entries of an object, without the key that would replace the prototype. */
function entriesOf(value: unknown): [string, unknown][] {
  return isRecord(value) ? Object.entries(value).filter(([key]) => key !== '__proto__') : [];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A whole number within the limits; anything that is not a number becomes the fallback. */
export function asTier(value: unknown, min: number, max: number, fallback = min): number {
  return isFiniteNumber(value) ? clamp(Math.round(value), min, max) : fallback;
}

function asCount(value: unknown): number {
  return isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : 0;
}

function asVolume(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? clamp(value, 0, 1) : fallback;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

function integerList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is number => Number.isInteger(item)))];
}

function asDifficulty(value: unknown, fallback: Difficulty): Difficulty {
  return typeof value === 'string' && Object.hasOwn(DIFFICULTIES, value) ? (value as Difficulty) : fallback;
}

/** Every known tuning value, each taken from storage only if it has the right type. */
export function sanitizeTuning(value: unknown): Tuning {
  const out: Record<string, number | boolean> = { ...TUNING_DEFAULT };
  const stored = isRecord(value) ? value : {};
  for (const [key, standard] of Object.entries(TUNING_DEFAULT)) {
    const candidate = stored[key];
    if (typeof standard === 'boolean' && typeof candidate === 'boolean') out[key] = candidate;
    if (typeof standard === 'number' && isFiniteNumber(candidate)) out[key] = candidate;
  }
  return out as unknown as Tuning;
}

export function sanitizeSettings(value: unknown): ProfileSettings {
  const base = freshSettings();
  const raw = isRecord(value) ? value : {};
  return {
    difficulty: asDifficulty(raw.difficulty, base.difficulty),
    musicVolume: asVolume(raw.musicVolume, base.musicVolume),
    sfxVolume: asVolume(raw.sfxVolume, base.sfxVolume),
    muted: asBoolean(raw.muted, base.muted),
    relayAddress: asString(raw.relayAddress, base.relayAddress),
    tuning: sanitizeTuning(raw.tuning),
    flags: cleanFlags(isRecord(raw.flags) ? (raw.flags as Partial<Flags>) : null),
  };
}

function sanitizeScore(value: unknown): ScoreEntry | null {
  if (!isRecord(value) || !isFiniteNumber(value.score)) return null;
  const entry: ScoreEntry = {
    names: asString(value.names, ''),
    coop: asBoolean(value.coop, false),
    day: asCount(value.day),
    score: value.score,
    kills: asCount(value.kills),
    difficulty: asDifficulty(value.difficulty, 'medium'),
    date: asString(value.date, ''),
  };
  if (typeof value.mode === 'string') entry.mode = value.mode;
  return entry;
}

/** Valid entries only, best first, cut to the leaderboard length. */
export function sanitizeScores(value: unknown): ScoreEntry[] {
  if (!Array.isArray(value)) return [];
  const entries = value.map(sanitizeScore).filter((entry): entry is ScoreEntry => entry !== null);
  return entries.sort((a, b) => b.score - a.score).slice(0, SCORES_LIMIT);
}

function sanitizeMilestones(value: unknown): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [difficulty, days] of entriesOf(value)) out[difficulty] = integerList(days);
  return out;
}

export function sanitizeWorld(value: unknown): WorldProgress {
  const raw = isRecord(value) ? value : {};
  return {
    levelsDone: integerList(raw.levelsDone),
    guestStarLevels: integerList(raw.guestStarLevels),
    storyRead: stringList(raw.storyRead),
    endlessMilestones: sanitizeMilestones(raw.endlessMilestones),
    scores: sanitizeScores(raw.scores),
  };
}

function sanitizeWorlds(value: unknown): Record<string, WorldProgress> {
  const out: Record<string, WorldProgress> = {};
  for (const [worldId, world] of entriesOf(value)) out[worldId] = sanitizeWorld(world);
  return out;
}

function sanitizeWeaponTiers(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [weaponId, tier] of entriesOf(value)) {
    if (isFiniteNumber(tier)) out[weaponId] = asTier(tier, WEAPON_TIER_MIN, WEAPON_TIER_MAX);
  }
  return out;
}

export function sanitizeRating(value: unknown): DevRating {
  const raw = isRecord(value) ? value : {};
  const verdict = raw.verdict === 'good' || raw.verdict === 'bad' ? raw.verdict : null;
  return { checked: asBoolean(raw.checked, false), verdict, note: asString(raw.note, '') };
}

function sanitizeRatings(value: unknown): Record<string, DevRating> {
  const out: Record<string, DevRating> = {};
  for (const [id, rating] of entriesOf(value)) out[id] = sanitizeRating(rating);
  return out;
}

function sanitizeCoopCampaign(value: unknown): Record<string, unknown> {
  return Object.fromEntries(entriesOf(value));
}

/** A complete, valid profile in the current shape, built from whatever could be read. */
export function sanitizeProfile(value: unknown): ProfileData {
  const base = freshProfile();
  const raw = isRecord(value) ? value : {};
  return {
    version: PROFILE_VERSION,
    profileId: asString(raw.profileId, '') || base.profileId,
    createdAt: asString(raw.createdAt, '') || base.createdAt,
    updatedAt: asString(raw.updatedAt, '') || base.updatedAt,
    name: asString(raw.name, base.name),
    settings: sanitizeSettings(raw.settings),
    stars: asCount(raw.stars),
    starsEarned: asCount(raw.starsEarned),
    unlockedWeapons: stringList(raw.unlockedWeapons),
    unlockedSlots: integerList(raw.unlockedSlots),
    unlockedStations: stringList(raw.unlockedStations),
    weaponTiers: sanitizeWeaponTiers(raw.weaponTiers),
    handTier: asTier(raw.handTier, HAND_TIER_MIN, HAND_TIER_MAX),
    tutorialDone: asBoolean(raw.tutorialDone, false),
    seenEnemies: stringList(raw.seenEnemies),
    seenTips: stringList(raw.seenTips),
    claimedRuns: stringList(raw.claimedRuns).slice(-CLAIMED_RUNS_LIMIT),
    worlds: sanitizeWorlds(raw.worlds),
    devRatings: sanitizeRatings(raw.devRatings),
    pendingRun: raw.pendingRun === undefined ? null : raw.pendingRun,
    coopCampaign: sanitizeCoopCampaign(raw.coopCampaign),
  };
}
