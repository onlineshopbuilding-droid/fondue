/**
 * The developer weapon editor's override layer (F1): changed numbers for any weapon and tier, laid
 * over the values of src/config/weapons.ts. The simulation reads a tier through `effectiveTier`, so a
 * change works in the running game at the next shot. No DOM, no randomness: the same overrides give
 * the same run. A run that plays with any override marks itself as a developer run (WeaponSystem.tick),
 * so it never brings lasting progress. The layer lives in memory only; "Export" turns it into text.
 */
import { WEAPONS, weaponById, type WeaponDef } from '../../config/weapons';

/** weapon id -> tier (1..7, as text) -> field -> number. */
export type WeaponOverrides = Record<string, Record<string, Record<string, number>>>;

let layer: WeaponOverrides = {};
/** Merged tiers, rebuilt after every change. */
let cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

const tierRow = (def: WeaponDef, tier: number): Record<string, unknown> | undefined =>
  (def.tiers as unknown as Record<string, unknown>[])[tier - 1];

/** The numeric fields of a weapon's tier that the editor may change (everything but switches and the note). */
export function editableFields(def: WeaponDef, tier: number): string[] {
  const row = tierRow(def, tier);
  return row ? Object.keys(row).filter((k) => typeof row[k] === 'number') : [];
}

function changed() {
  cache = new Map();
  for (const l of listeners) l();
}

/** Calls back after every change of the layer; returns a function that stops it. */
export function onOverridesChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Sets one number. A value equal to the default removes the override. Unknown weapons, tiers,
 * fields, switches and values that are not finite are refused (false).
 */
export function setWeaponOverride(id: string, tier: number, field: string, value: number): boolean {
  const def = weaponById(id);
  if (!def || !Number.isInteger(tier) || !Number.isFinite(value)) return false;
  const row = tierRow(def, tier);
  if (!row || typeof row[field] !== 'number') return false;
  const key = String(tier);
  const forWeapon = Object.hasOwn(layer, id) ? layer[id] : (layer[id] = {});
  const forTier = Object.hasOwn(forWeapon, key) ? forWeapon[key] : (forWeapon[key] = {});
  if (value === row[field]) delete forTier[field];
  else forTier[field] = value;
  if (Object.keys(forTier).length === 0) delete forWeapon[key];
  if (Object.keys(forWeapon).length === 0) delete layer[id];
  changed();
  return true;
}

/** Back to the defaults: one tier, one weapon, or (no arguments) everything. */
export function resetWeaponOverrides(id?: string, tier?: number): void {
  if (id === undefined) layer = {};
  else if (tier === undefined) delete layer[id];
  else if (Object.hasOwn(layer, id)) {
    delete layer[id][String(tier)];
    if (Object.keys(layer[id]).length === 0) delete layer[id];
  }
  changed();
}

/** A copy of all overrides. */
export function weaponOverrides(): WeaponOverrides {
  return JSON.parse(JSON.stringify(layer)) as WeaponOverrides;
}

/** Number of changed values. */
export function overrideCount(): number {
  let n = 0;
  for (const tiers of Object.values(layer)) for (const fields of Object.values(tiers)) n += Object.keys(fields).length;
  return n;
}

export const hasWeaponOverrides = (): boolean => overrideCount() > 0;

/** The override of one value, or undefined. */
export function overrideOf(id: string, tier: number, field: string): number | undefined {
  return Object.hasOwn(layer, id) ? layer[id][String(tier)]?.[field] : undefined;
}

/**
 * The numbers a weapon fires with at a tier: its config row with the editor's changes on top.
 * Without changes this is the config row itself. Used by the simulation (src/sim/weapons/system.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function effectiveTier(def: WeaponDef, tier: number): any {
  const t = Math.max(1, Math.min(def.tiers.length, Math.round(tier) || 1));
  const base = def.tiers[t - 1];
  const patch = Object.hasOwn(layer, def.id) ? layer[def.id][String(t)] : undefined;
  if (!patch) return base;
  const key = `${def.id}:${t}`;
  let merged = cache.get(key);
  if (!merged) { merged = { ...base, ...patch }; cache.set(key, merged); }
  return merged;
}

/** Readable list of all changes, one line each, plus the same as JSON to paste back. */
export function overridesAsText(): string {
  const lines: string[] = [];
  for (const def of WEAPONS) {
    const tiers = layer[def.id];
    if (!tiers) continue;
    for (const [tier, fields] of Object.entries(tiers).sort(([a], [b]) => Number(a) - Number(b))) {
      for (const [field, value] of Object.entries(fields)) {
        lines.push(`${def.name} (${def.id}) tier ${tier}: ${field} ${String(tierRow(def, Number(tier))?.[field])} -> ${value}`);
      }
    }
  }
  if (lines.length === 0) return 'No weapon values changed.';
  return `Changed weapon values (src/config/weapons.ts):\n${lines.join('\n')}\n\nJSON:\n${JSON.stringify(layer)}`;
}

/** Takes the JSON of an export (or the whole export text) back in. Returns how many values were set. */
export function importOverrides(text: string): number {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('no JSON found');
  const data = JSON.parse(text.slice(start)) as unknown;
  if (!data || typeof data !== 'object') throw new Error('not an object');
  layer = {};
  let n = 0;
  for (const [id, tiers] of Object.entries(data as Record<string, unknown>)) {
    if (!tiers || typeof tiers !== 'object') continue;
    for (const [tier, fields] of Object.entries(tiers as Record<string, unknown>)) {
      if (!fields || typeof fields !== 'object') continue;
      for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof value === 'number' && setWeaponOverride(id, Number(tier), field, value)) n++;
      }
    }
  }
  changed();
  return n;
}
