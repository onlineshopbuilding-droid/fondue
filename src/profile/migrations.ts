// Brings stored profiles of any version to the current shape.
// A future version jump is one more function in MIGRATION_STEPS. Save data of earlier game versions
// (other storage keys) is never read: v0.3 starts with fresh progress.
import { PROFILE_VERSION, freshProfile, type ProfileData } from './schema';
import { isRecord, sanitizeProfile, type RawRecord } from './sanitize';

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
