// Brings stored profiles of any version to the current shape and takes over the save data of the old game version.
// A future version jump is one more function in MIGRATION_STEPS; the old storage keys are only ever read.
import { LEGACY_WORLD_ID, PROFILE_VERSION, freshProfile, freshWorld, type ProfileData } from './schema';
import { isRecord, sanitizeProfile, sanitizeScores, sanitizeSettings, type RawRecord } from './sanitize';

/** Turns the raw data of one version into the raw data of the next one. */
export type MigrationStep = (data: RawRecord) => RawRecord;

/**
 * One step per version jump: the entry at index N turns version N into version N + 1.
 * For version 2, raise PROFILE_VERSION and append the function for 1 -> 2 here.
 */
export const MIGRATION_STEPS: MigrationStep[] = [
  // 0 -> 1: no version 0 was ever released; data without a version is read as it is.
  (data) => data,
];

function storedVersion(data: RawRecord): number {
  const version = data.version;
  return typeof version === 'number' && Number.isInteger(version) && version >= 0 ? version : 0;
}

/** Runs every step from the stored version upwards. A failing step leaves the data as it was stored. */
function runSteps(data: RawRecord, steps: MigrationStep[]): RawRecord {
  try {
    let current = data;
    for (let version = storedVersion(data); version < steps.length; version++) {
      current = steps[version]({ ...current });
    }
    return isRecord(current) ? current : data;
  } catch {
    return data;
  }
}

/**
 * Valid profile data in the current version, from anything that was stored. Never throws.
 * Data of an unknown higher version is kept as far as this version can read it.
 */
export function migrate(raw: unknown, steps: MigrationStep[] = MIGRATION_STEPS): ProfileData {
  if (!isRecord(raw)) return freshProfile();
  const data = storedVersion(raw) > PROFILE_VERSION ? raw : runSteps(raw, steps);
  return sanitizeProfile(data);
}

function parseJson(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * What the old game version stored under `fondue.settings.v1` and `fondue.scores.v1`,
 * as the matching parts of a profile. Only reads; the old keys stay untouched.
 */
export function importLegacy(settingsRaw: string | null, scoresRaw: string | null): Partial<ProfileData> {
  const out: Partial<ProfileData> = {};
  const settings = parseJson(settingsRaw);
  if (isRecord(settings)) {
    if (typeof settings.name === 'string') out.name = settings.name;
    out.settings = sanitizeSettings(settings);
  }
  const scores = sanitizeScores(parseJson(scoresRaw));
  if (scores.length > 0) out.worlds = { [LEGACY_WORLD_ID]: { ...freshWorld(), scores } };
  return out;
}
