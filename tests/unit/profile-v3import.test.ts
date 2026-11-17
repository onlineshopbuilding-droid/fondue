/**
 * The one-time import of the v0.3 save into v0.4 (V2): migrateV3ToV4 as a pure function, the castle
 * tier per slot (CASTLE_TIER_FOR_SLOT), and Profile.load reading fondue.v3.profile once without ever
 * changing it or the v0.2 save (fondue.profile).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CASTLE_TIER_FOR_SLOT } from '../../src/config/slotTiers';
import { addGold } from '../../src/modes/progress';
import {
  LocalProfileStore, MemoryProfileStore, PROFILE_KEY, PROFILE_VERSION, Profile, STORAGE_PREFIX, V3_IMPORT_KEY,
  V3_PROFILE_KEY, exportCode, freshProfile, importCode, migrateV3ToV4,
} from '../../src/profile';

/** A v0.3 profile as v0.3 stored it (profile version 1). */
function v3Profile(levelsDone: number[], keep: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    format: 'fondue-profile',
    version: 1,
    profileId: 'v3-save',
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-16T10:00:00.000Z',
    name: 'Tim',
    settings: { difficulty: 'hard', musicVolume: 0.2, sfxVolume: 0.4, muted: true, relayAddress: '', tuning: {}, flags: {} },
    wallet: { cheese: 7, gold: 1234, crests: 2 },
    earned: { cheese: 30, gold: 5000, crests: 2 },
    keep: { castleTier: 1, handTier: 2, stations: { cauldron: 0, perch: 0 }, weapons: { wheel: { tier: 3 } }, loadout: ['wheel', null, null, null, null], ...keep },
    worlds: { fondue: { levelsDone, cheese: { 1: 31 }, storyRead: ['intro'], scores: [], endlessBest: {} } },
    seen: { tutorial: true, enemies: ['grunt'], tips: [], slotIntros: [1, 2], v3Notice: true },
    claimedRuns: ['run-1'],
    devRatings: {},
    cheats: { used: false, log: [] },
    pendingRun: null,
    coopCampaign: {},
    ...extra,
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('castle tier per slot (config)', () => {
  it('has exactly the fixed values: Damage 1, Slow 2, Gate 3, Support 4, Passive 5', () => {
    expect(CASTLE_TIER_FOR_SLOT).toEqual({ damage: 1, slow: 2, gate: 3, support: 4, passive: 5 });
  });
});

describe('migrateV3ToV4', () => {
  it('raises castle tier 1 to 5 when all five slots were open (level 11 won)', () => {
    const data = migrateV3ToV4(v3Profile(range(11)));
    expect(data.keep.castleTier).toBe(5);
    expect(data.version).toBe(PROFILE_VERSION);
  });

  it.each([
    [[], 1],
    [range(1), 1],
    [range(2), 2],
    [range(3), 2],
    [range(4), 3],
    [range(6), 3],
    [range(7), 4],
    [range(10), 4],
    [range(11), 5],
    [range(40), 5],
  ])('levels %j won, castle tier 1 -> %i', (levels, tier) => {
    expect(migrateV3ToV4(v3Profile(levels)).keep.castleTier).toBe(tier);
  });

  it('never lowers a castle tier that is already high enough', () => {
    expect(migrateV3ToV4(v3Profile(range(11), { castleTier: 7 })).keep.castleTier).toBe(7);
    expect(migrateV3ToV4(v3Profile(range(2), { castleTier: 4 })).keep.castleTier).toBe(4);
  });

  it('keeps a slot open that still wears a weapon, even without the level', () => {
    const keep = { weapons: { wheel: { tier: 1 }, bolter: { tier: 2 } }, loadout: ['wheel', null, null, 'bolter', null] };
    expect(migrateV3ToV4(v3Profile(range(1), keep)).keep.castleTier).toBe(4);
  });

  it('takes nothing away: wallet, earned, weapons, loadout, progress and settings stay', () => {
    const before = v3Profile(range(11));
    const data = migrateV3ToV4(before);
    expect(data.wallet).toEqual(before.wallet);
    expect(data.earned).toEqual(before.earned);
    expect(data.keep.weapons).toEqual(before.keep.weapons);
    expect(data.keep.loadout).toEqual(before.keep.loadout);
    expect(data.keep.handTier).toBe(2);
    expect(data.worlds.fondue.levelsDone).toEqual(range(11));
    expect(data.worlds.fondue.cheese).toEqual({ 1: 31 });
    expect(data.seen.slotIntros).toEqual([1, 2]);
    expect(data.settings.difficulty).toBe('hard');
    expect(data.settings.muted).toBe(true);
    expect(data.name).toBe('Tim');
    expect(data.profileId).toBe('v3-save');
  });

  it('is pure: the v0.3 data passed in is not changed', () => {
    const before = v3Profile(range(11));
    const copy = JSON.parse(JSON.stringify(before));
    migrateV3ToV4(before);
    expect(before).toEqual(copy);
  });

  it('gives a fresh profile without a readable v0.3 profile', () => {
    for (const nothing of [null, undefined, 'text', 12, [1, 2], { format: 'something-else', wallet: { gold: 9 } }]) {
      const data = migrateV3ToV4(nothing);
      const fresh = freshProfile();
      expect(data.keep).toEqual(fresh.keep);
      expect(data.wallet).toEqual(fresh.wallet);
      expect(data.worlds).toEqual({});
      expect(data.seen.tutorial).toBe(false);
    }
  });

  it('a v0.3 profile code (FONDUE3, version 1) is imported with the same rule', () => {
    const code = exportCode(v3Profile(range(7)) as never);
    expect(importCode(code).keep.castleTier).toBe(4);
  });
});

/** A store that records every key read, written or removed. */
class RecordingStore extends MemoryProfileStore {
  reads: string[] = [];
  writes: string[] = [];
  removes: string[] = [];
  override async read(key: string) { this.reads.push(key); return super.read(key); }
  override writeSync(key: string, value: string) { this.writes.push(key); super.writeSync(key, value); }
  override async remove(key: string) { this.removes.push(key); return super.remove(key); }
}

describe('Profile.load: one-time import of the v0.3 save', () => {
  const V3_TEXT = JSON.stringify(v3Profile(range(11)));
  const V2_TEXT = JSON.stringify({ version: 1, name: 'Tim', stars: 120, unlockedWeapons: ['wheel'], handTier: 3 });
  const OLD = { [V3_PROFILE_KEY]: V3_TEXT, 'fondue.profile': V2_TEXT };

  it('imports the v0.3 save, stores it under fondue.v4.profile and marks the import', async () => {
    const store = new RecordingStore(OLD);
    const profile = await Profile.load(store);
    expect(profile.data.name).toBe('Tim');
    expect(profile.data.wallet.gold).toBe(1234);
    expect(profile.data.keep.castleTier).toBe(5);
    expect(JSON.parse(store.entries.get(PROFILE_KEY)!).keep.castleTier).toBe(5);
    expect(JSON.parse(store.entries.get(V3_IMPORT_KEY)!).imported).toBe(true);
  });

  it('leaves fondue.v3.* and fondue.profile byte for byte unchanged through load, import, save, reset and reload', async () => {
    const store = new RecordingStore({ ...OLD, 'fondue.v3.profile.broken.1': '{oops', 'fondue.v3.dev.decisions': '{"D3-09":{"choice":"a"}}' });
    const before = new Map(store.entries);
    const profile = await Profile.load(store);
    addGold(profile, 50);
    profile.flushSync();
    profile.reset();
    await profile.flush();
    await Profile.load(store);
    for (const [key, value] of before) expect(store.entries.get(key)).toBe(value);
    for (const key of [...store.writes, ...store.removes]) expect(key.startsWith(STORAGE_PREFIX)).toBe(true);
    for (const key of store.reads) expect(key.startsWith(STORAGE_PREFIX) || key === V3_PROFILE_KEY).toBe(true);
    expect(store.reads).not.toContain('fondue.profile');
  });

  it('imports only once: after a reset the next start does not import again', async () => {
    const store = new RecordingStore(OLD);
    const first = await Profile.load(store);
    first.reset();
    await first.flush();
    const again = await Profile.load(store);
    expect(again.data.wallet.gold).toBe(0);
    expect(again.data.keep.castleTier).toBe(1);
    expect(again.data.worlds).toEqual({});
  });

  it('does not import again while the mark is there, even if the v0.4 profile is gone', async () => {
    const store = new RecordingStore(OLD);
    await Profile.load(store);
    await store.remove(PROFILE_KEY);
    const again = await Profile.load(store);
    expect(again.data.wallet.gold).toBe(0);
    expect(again.data.name).toBe('');
  });

  it('starts fresh without a v0.3 save and marks the import as done', async () => {
    const store = new RecordingStore({ 'fondue.profile': V2_TEXT });
    const profile = await Profile.load(store);
    expect(profile.data.keep).toEqual(freshProfile().keep);
    expect(profile.data.wallet).toEqual(freshProfile().wallet);
    expect(profile.data.worlds).toEqual({});
    expect(JSON.parse(store.entries.get(V3_IMPORT_KEY)!).imported).toBe(false);
    // A v0.3 save that appears later is not imported any more.
    await store.write(V3_PROFILE_KEY, V3_TEXT);
    await store.remove(PROFILE_KEY);
    expect((await Profile.load(store)).data.wallet.gold).toBe(0);
  });

  it('a damaged v0.4 profile is set aside, not replaced by an import', async () => {
    const store = new RecordingStore({ ...OLD, [PROFILE_KEY]: '{oops' });
    const profile = await Profile.load(store);
    expect(profile.data.wallet.gold).toBe(0);
    expect(store.reads).not.toContain(V3_PROFILE_KEY);
    expect(store.entries.get(V3_PROFILE_KEY)).toBe(V3_TEXT);
  });

  it('a damaged v0.3 profile gives a fresh v0.4 profile and stays as it is', async () => {
    const store = new RecordingStore({ [V3_PROFILE_KEY]: '{not json' });
    const profile = await Profile.load(store);
    expect(profile.data.wallet.gold).toBe(0);
    expect(store.entries.get(V3_PROFILE_KEY)).toBe('{not json');
  });

  it('an in-memory profile (?fresh=1, bots) never sees the browser storage', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.data.wallet.gold).toBe(0);
    expect(profile.data.keep.castleTier).toBe(1);
  });
});

describe('Profile.load with localStorage', () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('imports from the real key and leaves it untouched', async () => {
    const memory = new Map<string, string>([[V3_PROFILE_KEY, JSON.stringify(v3Profile(range(4)))], ['fondue.profile', 'old']]);
    const before = new Map(memory);
    const changed: string[] = [];
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { changed.push(key); memory.set(key, value); },
      removeItem: (key: string) => { changed.push(key); memory.delete(key); },
    };
    const profile = await Profile.load(new LocalProfileStore());
    expect(profile.data.keep.castleTier).toBe(3);
    profile.reset();
    profile.flushSync();
    await Profile.load(new LocalProfileStore());
    for (const [key, value] of before) expect(memory.get(key)).toBe(value);
    expect(changed.length).toBeGreaterThan(0);
    for (const key of changed) expect(key.startsWith(STORAGE_PREFIX)).toBe(true);
  });
});
