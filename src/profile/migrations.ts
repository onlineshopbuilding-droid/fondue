// Brings stored profiles of any version to the current shape.
// A future version jump is one more function in MIGRATION_STEPS. Of the saves of earlier game versions
// only the v0.3 profile is read, once, and imported (migrateV3ToV4); the v0.2 save is never read.
import { stepV3ToV4 } from './fromV3';
import { PROFILE_FORMAT, PROFILE_VERSION, freshProfile, type ProfileData } from './schema';
import { isRecord, sanitizeProfile, type RawRecord } from './sanitize';

/** Turns the raw data of one version into the raw data of the next one. */
export type MigrationStep = (data: RawRecord) => RawRecord;

/**
 * One step per version jump: the entry at index N turns version N into version N + 1.
 * For version 3, raise PROFILE_VERSION and append the function for 2 -> 3 here.
 */
export const MIGRATION_STEPS: MigrationStep[] = [
  // 0 -> 1: no version 0 was ever released; data without a version is read as it is.
  (data) => data,
  // 1 -> 2: v0.3 -> v0.4. Slots open by castle tier now; the castle tier is raised to keep v0.3's open slots.
  stepV3ToV4,
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
  // Something else under our key (not a Fondue profile): start fresh rather than guess.
  if (raw.format !== undefined && raw.format !== PROFILE_FORMAT) return freshProfile();
  const data = storedVersion(raw) > PROFILE_VERSION ? raw : runSteps(raw, steps);
  return sanitizeProfile(data);
}

/**
 * A v0.3 profile (as stored under fondue.v3.profile, or as a FONDUE3 code of v0.3) in the v0.4 shape.
 * Pure: the input is not changed. Without a readable v0.3 profile the result is a fresh profile.
 */
export function migrateV3ToV4(v3Profile: unknown): ProfileData {
  if (!isRecord(v3Profile)) return freshProfile();
  const copy: unknown = JSON.parse(JSON.stringify(v3Profile));
  if (!isRecord(copy)) return freshProfile();
  // A v0.3 save is version 1; one without a version is read as one.
  return migrate({ ...copy, version: Math.min(storedVersion(copy), 1) });
}
