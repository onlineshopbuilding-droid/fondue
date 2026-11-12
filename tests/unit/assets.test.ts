import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { RIGS } from '../../src/art/characters';
import { CLOUDS, LANDSCAPE_ART } from '../../src/art/landscapes';
import { PROPS } from '../../src/art/props';
import { LOBBY_ART, lobbyKey } from '../../src/art/lobby';
import {
  ASSETS, applyOverrides, assetsOfGroup, buildAssets, cloudKey, landscapeKey, listAssets, parseAssetParams, partKey, propKey, weaponKey,
} from '../../src/art/registry';
import { MAX_TIER, WEAPONS } from '../../src/config/weapons';
import { ASSET_OVERRIDES } from '../../src/config/assets';
import { assetTables, DOC, withTables } from '../../scripts/list-assets';

/** Every texture name the game asks for, built from the art sources themselves. */
function expectedNames(): string[] {
  const names: string[] = [];
  for (const [rig, { parts }] of Object.entries(RIGS)) for (const part of parts) names.push(partKey(rig, part.name));
  for (const name of Object.keys(PROPS)) names.push(propKey(name));
  for (const w of WEAPONS) for (let tier = 1; tier <= MAX_TIER; tier++) names.push(weaponKey(w.id, tier));
  for (const land of Object.keys(LANDSCAPE_ART)) for (const layer of ['far', 'mid', 'near', 'ground']) names.push(landscapeKey(land, layer));
  CLOUDS.forEach((_, i) => names.push(cloudKey(i)));
  for (const name of Object.keys(LOBBY_ART)) names.push(lobbyKey(name));
  return names;
}

describe('asset directory', () => {
  it('holds every figure part, prop, weapon tier, landscape layer and cloud under its texture name', () => {
    const expected = expectedNames();
    expect(expected.length).toBeGreaterThan(150);
    expect(Object.keys(ASSETS).sort()).toEqual([...expected].sort());
    for (const [name, entry] of Object.entries(ASSETS)) expect(entry.name).toBe(name);
  });

  it('has no name twice', () => {
    const expected = expectedNames();
    expect(new Set(expected).size).toBe(expected.length);
    const names = listAssets().map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(expected.length);
  });

  it('gives every asset a size, a scale, an anchor and its picture', () => {
    for (const a of listAssets()) {
      expect(a.art.w, a.name).toBeGreaterThan(0);
      expect(a.art.h, a.name).toBeGreaterThan(0);
      expect(a.scale, a.name).toBeGreaterThan(0);
      expect(Number.isFinite(a.art.px) && Number.isFinite(a.art.py), a.name).toBe(true);
      expect(a.art.svg.startsWith('<svg'), a.name).toBe(true);
    }
  });

  it('points at the very art objects of the sources and describes the joints of figure parts', () => {
    expect(ASSETS[propKey('coin')].art).toBe(PROPS.coin);
    expect(ASSETS[landscapeKey('marsh', 'near')].art).toBe(LANDSCAPE_ART.marsh.near);
    const body = RIGS.grunt.parts.find((p) => p.name === 'body')!;
    expect(ASSETS['rig:grunt:body']).toMatchObject({ kind: 'rigPart', group: 'boot', scale: 2, joint: { x: body.x, y: body.y, anim: body.anim } });
    expect(ASSETS['rig:grunt:body'].art).toBe(body.art);
    for (const a of listAssets()) expect(a.joint !== undefined, a.name).toBe(a.kind === 'rigPart');
  });

  it('sorts assets into the loading groups', () => {
    expect(ASSETS['prop:coin'].group).toBe('boot');
    expect(ASSETS['prop:keep0'].group).toBe('boot');
    expect(ASSETS['prop:keep3'].group).toBe('keepStages');
    expect(ASSETS['prop:keepGlow1'].group).toBe('keepStages');
    expect(ASSETS['prop:foot_marsh'].group).toBe('marsh');
    expect(ASSETS['prop:keepWeather_snowpine_2'].group).toBe('snowpine');
    expect(ASSETS['land:canyon:far'].group).toBe('canyon');
    expect(ASSETS['cloud:0'].group).toBe('boot');
    // Weapons: tier 1 is there before the first market, the higher tiers load in the background.
    expect(ASSETS['weapon:wheel:1'].group).toBe('boot');
    expect(ASSETS['weapon:wheel:5'].group).toBe('weaponTiers');
    // A landscape's strips are made first, then its props; every asset is in exactly one group.
    expect(assetsOfGroup('meadow').slice(0, 4).map((a) => a.name)).toEqual(['land:meadow:far', 'land:meadow:mid', 'land:meadow:near', 'land:meadow:ground']);
    const grouped = (['boot', 'keepStages', 'weaponTiers', 'meadow', 'canyon', 'marsh', 'snowpine'] as const).flatMap((g) => assetsOfGroup(g));
    expect(grouped.length).toBe(listAssets().length);
  });

  it('ships without overrides, so the normal game shows the built-in art', () => {
    expect(ASSET_OVERRIDES).toEqual({});
    for (const a of listAssets()) expect(a.art.image, a.name).toBeUndefined();
  });

  it('an override sets the image and leaves size, anchor, SVG and the source art alone', () => {
    const assets = buildAssets();
    const before = { ...assets['rig:grunt:body'].art };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyOverrides(assets, { 'rig:grunt:body': '/assets/grunt-body.png', 'prop:noSuchThing': '/assets/x.png' });
    expect(assets['rig:grunt:body'].art).toEqual({ ...before, image: '/assets/grunt-body.png' });
    expect(assets['rig:grunt:head'].art.image).toBeUndefined();
    expect(RIGS.grunt.parts.find((p) => p.name === 'body')!.art.image).toBeUndefined();
    expect(assets['prop:noSuchThing']).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('prop:noSuchThing');
    warn.mockRestore();
  });

  it('reads overrides from the address, also several and with "=" inside the URL', () => {
    const data = 'data:image/png;base64,AAAA+/8=';
    const search = `?seed=4&asset=${encodeURIComponent(`rig:grunt:body=${data}`)}&asset=prop:coin=/assets/coin.webp?v=2&asset=broken`;
    expect(parseAssetParams(search)).toEqual({ 'rig:grunt:body': data, 'prop:coin': '/assets/coin.webp?v=2' });
    expect(parseAssetParams('')).toEqual({});
  });

  it('docs/GRAFIK-AUSTAUSCHEN.md lists the assets as they are now (run: node scripts/list-assets.ts)', () => {
    const doc = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
    expect(withTables(doc, assetTables(listAssets()))).toBe(doc);
    for (const a of listAssets()) expect(doc, a.name).toContain(`\`${a.name}\``);
  });
});
