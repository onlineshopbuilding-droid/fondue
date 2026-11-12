/**
 * The asset directory: every piece of art under one fixed name, with its size, anchor, texture
 * scale and loading group. Behind a name there is SVG text today and possibly an image file tomorrow
 * (`src/config/assets.ts`); game logic and scenes only ever use the names.
 */
import type { Anim, Art } from './types';
import { RIGS } from './characters';
import { PROPS } from './props';
import { CLOUDS, LANDSCAPE_ART } from './landscapes';
import { listWeaponArt, weaponKey } from './weapons';
import { ASSET_OVERRIDES } from '../config/assets';

/** Texture pixels per world pixel. Characters stay sharp when the game is scaled up. */
export const TEX_SCALE = 2;

/**
 * Texture pixels per world pixel for the landscape layers. Finer layers looked a little sharper on
 * phones, but drawing them scaled down every frame was too slow without a GPU (GitHub's test
 * machines, weak phones) and slowed loading; 1 keeps world size, as before the art redraw.
 */
export const LAND_SCALE = { far: 1, mid: 1, near: 1, ground: 1 } as const;
export const CLOUD_SCALE = 1;

export const partKey = (rig: string, part: string) => `rig:${rig}:${part}`;
export const propKey = (name: string) => `prop:${name}`;
export const landscapeKey = (land: string, layer: string) => `land:${land}:${layer}`;
export const cloudKey = (i: number) => `cloud:${i}`;
export { weaponKey };

export type LandName = keyof typeof LANDSCAPE_ART;
export const LAND_NAMES = Object.keys(LANDSCAPE_ART) as LandName[];
export const LAND_LAYERS = ['far', 'mid', 'near', 'ground'] as const;

/** Group of the bigger keep stages, which only matter once a gate has been bought. */
export const KEEP_STAGES = 'keepStages';
/** Group of the weapon pictures of tiers 2 to 5; tier 1 is made at boot. */
export const WEAPON_TIERS = 'weaponTiers';
/** Group of everything that is made before the game starts. */
export const BOOT = 'boot';
/**
 * When an asset is turned into a texture: at boot, with a landscape, or with the keep stages. The
 * first landscape of a game is made at boot as well; the other groups follow in the background.
 */
export type AssetGroup = typeof BOOT | typeof KEEP_STAGES | typeof WEAPON_TIERS | LandName;
export type AssetKind = 'rigPart' | 'prop' | 'landscape' | 'cloud' | 'weapon';

export interface AssetEntry {
  /** The texture name used all over the game, e.g. `rig:grunt:body` or `prop:coin`. */
  name: string;
  /** Size, anchor and the picture itself: SVG text, or an image file if `art.image` is set. */
  art: Art;
  /** Texture pixels per world pixel. */
  scale: number;
  group: AssetGroup;
  kind: AssetKind;
  /** Rig parts only, for information: where the part's anchor sits relative to the feet, and how it moves. */
  joint?: { x: number; y: number; anim: Anim };
}

/**
 * Which group a prop belongs to: a landscape for its dressing (`foot_marsh`,
 * `keepWeather_snowpine_2`), the keep stages 1 to 4 with their west wing and window glow, or boot.
 */
export function groupOfProp(name: string): AssetGroup {
  for (const land of LAND_NAMES) if (name.endsWith(`_${land}`) || name.includes(`_${land}_`)) return land;
  if (/^keep(West)?(Glow)?[1-9]$/.test(name)) return KEEP_STAGES;
  return BOOT;
}

/** Reads `?asset=<name>=<url>` pairs (the parameter may be repeated) from an address's query part. */
export function parseAssetParams(search: string): Record<string, string> {
  const table: Record<string, string> = {};
  for (const pair of new URLSearchParams(search).getAll('asset')) {
    const cut = pair.indexOf('=');
    if (cut > 0 && cut < pair.length - 1) table[pair.slice(0, cut)] = pair.slice(cut + 1);
  }
  return table;
}

/**
 * Points the named assets at image files. The entry keeps its size, anchor and SVG (as the fallback);
 * the source `Art` objects are left untouched. Unknown names are reported and skipped.
 */
export function applyOverrides(assets: Record<string, AssetEntry>, table: Record<string, string>): void {
  for (const [name, url] of Object.entries(table)) {
    const entry = assets[name];
    if (!entry) {
      console.warn(`Asset override for unknown name "${name}" ignored`);
      continue;
    }
    entry.art = { ...entry.art, image: url };
  }
}

/** Builds the directory from all art sources, in the order the textures are made. */
export function buildAssets(): Record<string, AssetEntry> {
  const assets: Record<string, AssetEntry> = {};
  const add = (entry: AssetEntry) => {
    if (assets[entry.name]) throw new Error(`Asset name "${entry.name}" is used twice`);
    assets[entry.name] = entry;
  };
  for (const [rig, { parts }] of Object.entries(RIGS)) {
    for (const part of parts) {
      add({ name: partKey(rig, part.name), art: part.art, scale: TEX_SCALE, group: BOOT, kind: 'rigPart', joint: { x: part.x, y: part.y, anim: part.anim } });
    }
  }
  for (const [name, art] of Object.entries(PROPS)) add({ name: propKey(name), art, scale: TEX_SCALE, group: groupOfProp(name), kind: 'prop' });
  // Weapons on the keep: `weapon:<id>:<tier>`. Only tier 1 is needed before the first market.
  for (const w of listWeaponArt()) add({ name: w.name, art: w.art, scale: TEX_SCALE, group: w.tier === 1 ? BOOT : WEAPON_TIERS, kind: 'weapon' });
  CLOUDS.forEach((art, i) => add({ name: cloudKey(i), art, scale: CLOUD_SCALE, group: BOOT, kind: 'cloud' }));
  for (const land of LAND_NAMES) {
    for (const layer of LAND_LAYERS) add({ name: landscapeKey(land, layer), art: LANDSCAPE_ART[land][layer], scale: LAND_SCALE[layer], group: land, kind: 'landscape' });
  }
  return assets;
}

/** Every asset of the game by name. Overrides from the config table and the address are applied. */
export const ASSETS: Record<string, AssetEntry> = buildAssets();
applyOverrides(ASSETS, ASSET_OVERRIDES);
// The address can override at run time, for tests and for trying out a picture.
if (typeof location !== 'undefined') applyOverrides(ASSETS, parseAssetParams(location.search));

/** All assets in the order the textures are made: figures, props, clouds, then the landscape strips. */
export const listAssets = (): AssetEntry[] => Object.values(ASSETS);

/** The assets of one group. A landscape's strips come first, then its props, as they are loaded. */
export function assetsOfGroup(group: AssetGroup): AssetEntry[] {
  const all = listAssets().filter((a) => a.group === group);
  return [...all.filter((a) => a.kind === 'landscape'), ...all.filter((a) => a.kind !== 'landscape')];
}
