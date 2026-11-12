import { describe, expect, it, vi } from 'vitest';
import { defaultFlags } from '../../src/config/flags';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import {
  LEGACY_SCORES_KEY, LEGACY_SETTINGS_KEY, MemoryProfileStore, PROFILE_KEY, PROFILE_VERSION, Profile,
  type ProfileStore, type ScoreEntry,
} from '../../src/profile';

const LEGACY_SETTINGS = JSON.stringify({
  name: 'Tim',
  difficulty: 'hard',
  musicVolume: 0.2,
  sfxVolume: 0.4,
  muted: true,
  relayAddress: 'wss://relay.example',
  tuning: { gravity: 2000, knockOthers: true },
  flags: { dayEnd: 'retreat', cauldron: 'back', unknown: 'x' },
});

function score(points: number, extra: Partial<ScoreEntry> = {}): ScoreEntry {
  return { names: 'Tim', coop: false, day: 3, score: points, kills: 10, difficulty: 'medium', date: '2026-11-11', ...extra };
}

const LEGACY_SCORES = JSON.stringify([score(500), score(900, { coop: true, names: 'Tim & Lenny' })]);

function storedProfile(store: MemoryProfileStore) {
  return JSON.parse(store.entries.get(PROFILE_KEY) ?? 'null');
}

function brokenKeys(store: MemoryProfileStore): string[] {
  return [...store.entries.keys()].filter((key) => key.startsWith(`${PROFILE_KEY}.broken.`));
}

describe('Profile: loading and saving', () => {
  it('starts fresh when nothing is stored', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    const data = profile.data;
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.profileId.length).toBeGreaterThan(8);
    expect(data.name).toBe('');
    expect(data.stars).toBe(0);
    expect(data.starsEarned).toBe(0);
    expect(data.unlockedWeapons).toEqual([]);
    expect(data.handTier).toBe(1);
    expect(data.tutorialDone).toBe(false);
    expect(data.worlds).toEqual({});
    expect(data.pendingRun).toBeNull();
    expect(data.settings.tuning).toEqual(TUNING_DEFAULT);
    expect(data.settings.flags).toEqual(defaultFlags());
    expect(storedProfile(store).profileId).toBe(data.profileId);
  });

  it('saves changes and loads them again', async () => {
    const store = new MemoryProfileStore();
    const first = await Profile.load(store);
    first.setName('Lenny');
    first.addStars(7);
    first.unlockWeapon('crossbow');
    first.setWeaponTier('crossbow', 3);
    first.markLevelDone('fondue', 2);
    first.setPendingRun({ level: 3, seed: 42 });
    await first.flush();

    const second = await Profile.load(store);
    expect(second.data).toEqual(first.data);
    expect(second.data.name).toBe('Lenny');
    expect(second.weaponTier('crossbow')).toBe(3);
    expect(second.isLevelDone('fondue', 2)).toBe(true);
    expect(second.data.pendingRun).toEqual({ level: 3, seed: 42 });
  });

  it('writes once for several changes in the same tick', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    const before = store.writeCount;
    profile.setName('Tim');
    profile.addStars(3);
    profile.unlockSlot(1);
    profile.markTutorialDone();
    expect(store.writeCount).toBe(before);
    await profile.flush();
    expect(store.writeCount).toBe(before + 1);
    expect(storedProfile(store).stars).toBe(3);
  });

  it('saves a change that arrives while a write is running', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    profile.setName('first');
    await Promise.resolve();
    profile.setName('second');
    await profile.flush();
    expect(storedProfile(store).name).toBe('second');
  });

  it('stamps updatedAt on a change', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const profile = await Profile.load(new MemoryProfileStore());
      const created = profile.data.updatedAt;
      vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
      profile.addStars(1);
      expect(profile.data.updatedAt).not.toBe(created);
      expect(profile.data.updatedAt).toBe('2026-01-02T00:00:00.000Z');
      expect(profile.data.createdAt).toBe(created);
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells listeners about changes until they unsubscribe', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    const seen: number[] = [];
    const stop = profile.onChange((data) => seen.push(data.stars));
    profile.onChange(() => { throw new Error('a broken listener'); });
    profile.addStars(2);
    profile.addStars(3);
    stop();
    profile.addStars(4);
    expect(seen).toEqual([2, 5]);
  });
});

describe('Profile: data of the old game version', () => {
  it('takes over name, settings, partial tuning and the leaderboard', async () => {
    const store = new MemoryProfileStore({ [LEGACY_SETTINGS_KEY]: LEGACY_SETTINGS, [LEGACY_SCORES_KEY]: LEGACY_SCORES });
    const profile = await Profile.load(store);
    const { name, settings } = profile.data;
    expect(name).toBe('Tim');
    expect(settings.difficulty).toBe('hard');
    expect(settings.musicVolume).toBe(0.2);
    expect(settings.sfxVolume).toBe(0.4);
    expect(settings.muted).toBe(true);
    expect(settings.relayAddress).toBe('wss://relay.example');
    expect(settings.tuning).toEqual({ ...TUNING_DEFAULT, gravity: 2000, knockOthers: true });
    expect(settings.flags).toEqual({ ...defaultFlags(), dayEnd: 'retreat' });
    expect(profile.scores('fondue').map((entry) => entry.score)).toEqual([900, 500]);
    expect(profile.scores('fondue')[0].names).toBe('Tim & Lenny');
  });

  it('leaves the old keys exactly as they were', async () => {
    const store = new MemoryProfileStore({ [LEGACY_SETTINGS_KEY]: LEGACY_SETTINGS, [LEGACY_SCORES_KEY]: LEGACY_SCORES });
    const profile = await Profile.load(store);
    profile.setName('Someone else');
    profile.addScore('fondue', score(5000));
    profile.reset();
    await profile.flush();
    expect(store.entries.get(LEGACY_SETTINGS_KEY)).toBe(LEGACY_SETTINGS);
    expect(store.entries.get(LEGACY_SCORES_KEY)).toBe(LEGACY_SCORES);
  });

  it('takes the old data over only while no profile exists', async () => {
    const store = new MemoryProfileStore({ [LEGACY_SETTINGS_KEY]: LEGACY_SETTINGS, [LEGACY_SCORES_KEY]: LEGACY_SCORES });
    const first = await Profile.load(store);
    first.setName('Renamed');
    await first.flush();

    store.entries.set(LEGACY_SETTINGS_KEY, JSON.stringify({ name: 'Classic player', difficulty: 'easy' }));
    store.entries.set(LEGACY_SCORES_KEY, JSON.stringify([score(99999)]));
    const second = await Profile.load(store);
    expect(second.data.name).toBe('Renamed');
    expect(second.data.settings.difficulty).toBe('hard');
    expect(second.scores('fondue').map((entry) => entry.score)).toEqual([900, 500]);
    expect(second.data.profileId).toBe(first.data.profileId);
  });

  it('ignores unreadable old data', async () => {
    const store = new MemoryProfileStore({ [LEGACY_SETTINGS_KEY]: '{oops', [LEGACY_SCORES_KEY]: '"no list"' });
    const profile = await Profile.load(store);
    expect(profile.data.name).toBe('');
    expect(profile.data.worlds).toEqual({});
  });
});

describe('Profile: damaged storage', () => {
  it.each([['broken JSON', '{"stars": 12, "name": '], ['a list', '[1,2,3]'], ['a bare value', '"hello"'], ['empty text', '']])(
    'sets %s aside and starts fresh',
    async (_label, text) => {
      const store = new MemoryProfileStore({ [PROFILE_KEY]: text, [LEGACY_SETTINGS_KEY]: LEGACY_SETTINGS });
      const profile = await Profile.load(store);
      expect(profile.data.stars).toBe(0);
      expect(profile.data.name).toBe('Tim');
      const keys = brokenKeys(store);
      expect(keys).toHaveLength(1);
      expect(store.entries.get(keys[0])).toBe(text);
      expect(storedProfile(store).profileId).toBe(profile.data.profileId);
    },
  );

  it('keeps running when the storage refuses to write', async () => {
    const store = new MemoryProfileStore({}, { failWrites: true });
    const profile = await Profile.load(store);
    expect(profile.lastError).toBeInstanceOf(Error);
    profile.addStars(5);
    await expect(profile.flush()).resolves.toBeUndefined();
    expect(profile.data.stars).toBe(5);
    expect(store.entries.has(PROFILE_KEY)).toBe(false);

    store.failWrites = false;
    profile.addStars(1);
    await profile.flush();
    expect(profile.lastError).toBeNull();
    expect(storedProfile(store).stars).toBe(6);
  });

  it('survives a store that throws on every call', async () => {
    const hostile: ProfileStore = {
      read: () => { throw new Error('no read'); },
      write: () => { throw new Error('no write'); },
      remove: () => { throw new Error('no remove'); },
    };
    const profile = await Profile.load(hostile);
    profile.setName('Tim');
    await profile.flush();
    expect(profile.data.name).toBe('Tim');
    expect(profile.lastError).toBeInstanceOf(Error);
  });

  it('does not fail on a pending run that cannot be written as JSON', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    profile.setPendingRun(loop);
    await profile.flush();
    expect(profile.lastError).toBeInstanceOf(Error);
    profile.clearPendingRun();
    await profile.flush();
    expect(profile.lastError).toBeNull();
    expect(storedProfile(store).pendingRun).toBeNull();
  });
});

describe('Profile: stars, unlocks and tiers', () => {
  it('adds and spends stars', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.addStars(10);
    expect(profile.spendStars(4)).toBe(true);
    expect(profile.data.stars).toBe(6);
    expect(profile.data.starsEarned).toBe(10);
  });

  it('refuses to spend more stars than there are', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.addStars(3);
    expect(profile.spendStars(4)).toBe(false);
    expect(profile.data.stars).toBe(3);
    expect(profile.spendStars(3)).toBe(true);
    expect(profile.spendStars(1)).toBe(false);
    expect(profile.data.stars).toBe(0);
  });

  it('ignores amounts that are no positive whole number', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.addStars(5);
    for (const bad of [-2, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      profile.addStars(bad);
      expect(profile.spendStars(bad)).toBe(false);
    }
    expect(profile.data.stars).toBe(5);
    expect(profile.data.starsEarned).toBe(5);
  });

  it('unlocks weapons, slots and stations only once', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.hasWeapon('crossbow')).toBe(false);
    expect(profile.unlockWeapon('crossbow')).toBe(true);
    expect(profile.unlockWeapon('crossbow')).toBe(false);
    expect(profile.hasWeapon('crossbow')).toBe(true);

    expect(profile.hasSlot(2)).toBe(false);
    expect(profile.unlockSlot(2)).toBe(true);
    expect(profile.unlockSlot(2)).toBe(false);
    expect(profile.hasSlot(2)).toBe(true);

    expect(profile.hasStation('market')).toBe(false);
    expect(profile.unlockStation('market')).toBe(true);
    expect(profile.unlockStation('market')).toBe(false);
    expect(profile.hasStation('market')).toBe(true);

    expect(profile.data.unlockedWeapons).toEqual(['crossbow']);
    expect(profile.data.unlockedSlots).toEqual([2]);
    expect(profile.data.unlockedStations).toEqual(['market']);
  });

  it('keeps weapon and hand tiers inside their limits', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.weaponTier('never-upgraded')).toBe(1);
    profile.setWeaponTier('crossbow', 4);
    expect(profile.weaponTier('crossbow')).toBe(4);
    profile.setWeaponTier('crossbow', 99);
    expect(profile.weaponTier('crossbow')).toBe(5);
    profile.setWeaponTier('crossbow', -1);
    expect(profile.weaponTier('crossbow')).toBe(1);
    profile.setHandTier(2);
    expect(profile.data.handTier).toBe(2);
    profile.setHandTier(7);
    expect(profile.data.handTier).toBe(3);
    profile.setHandTier(0);
    expect(profile.data.handTier).toBe(1);
  });

  it('merges settings and cleans wrong values', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.updateSettings({ musicVolume: 3, difficulty: 'easy', tuning: { gravity: 1234 }, flags: { dayEnd: 'retreat' } });
    expect(profile.data.settings.flags).toEqual({ ...defaultFlags(), dayEnd: 'retreat' });
    profile.updateSettings({ muted: true, flags: { dayEnd: 'nonsense', cauldron: 'back' } });
    const settings = profile.data.settings;
    expect(settings.musicVolume).toBe(1);
    expect(settings.difficulty).toBe('easy');
    expect(settings.muted).toBe(true);
    expect(settings.tuning).toEqual({ ...TUNING_DEFAULT, gravity: 1234 });
    expect(settings.flags).toEqual(defaultFlags());
  });
});

describe('Profile: progress', () => {
  it('marks levels once and knows the highest', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.highestLevelDone('fondue')).toBe(0);
    expect(profile.isLevelDone('fondue', 3)).toBe(false);
    expect(profile.markLevelDone('fondue', 3)).toBe(true);
    expect(profile.markLevelDone('fondue', 3)).toBe(false);
    expect(profile.markLevelDone('fondue', 1)).toBe(true);
    expect(profile.isLevelDone('fondue', 3)).toBe(true);
    expect(profile.highestLevelDone('fondue')).toBe(3);
    expect(profile.highestLevelDone('another-world')).toBe(0);
    expect(profile.data.worlds['another-world']).toBeUndefined();
  });

  it('creates a world on demand', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    const world = profile.world('glacier');
    expect(world).toEqual({ levelsDone: [], guestStarLevels: [], storyRead: [], endlessMilestones: {}, scores: [] });
    expect(profile.world('glacier')).toBe(world);
  });

  it('pays every one-time reward only once', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.claimGuestStars('fondue', 4)).toBe(true);
    expect(profile.claimGuestStars('fondue', 4)).toBe(false);
    expect(profile.claimRun('run-a')).toBe(true);
    expect(profile.claimRun('run-a')).toBe(false);
    expect(profile.markEnemySeen('raider')).toBe(true);
    expect(profile.markEnemySeen('raider')).toBe(false);
    expect(profile.markTipSeen('shake')).toBe(true);
    expect(profile.markTipSeen('shake')).toBe(false);
    expect(profile.markStoryRead('fondue', 'page-1')).toBe(true);
    expect(profile.markStoryRead('fondue', 'page-1')).toBe(false);
    expect(profile.claimEndlessMilestone('fondue', 'hard', 10)).toBe(true);
    expect(profile.claimEndlessMilestone('fondue', 'hard', 10)).toBe(false);
    expect(profile.claimEndlessMilestone('fondue', 'easy', 10)).toBe(true);
    expect(profile.claimEndlessMilestone('glacier', 'hard', 10)).toBe(true);
    expect(profile.world('fondue').endlessMilestones).toEqual({ hard: [10], easy: [10] });
  });

  it('does not write again when a one-time method changes nothing', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    profile.claimRun('run-a');
    await profile.flush();
    const writes = store.writeCount;
    profile.claimRun('run-a');
    profile.unlockWeapon('crossbow');
    profile.unlockWeapon('crossbow');
    await profile.flush();
    expect(store.writeCount).toBe(writes + 1);
  });

  it('remembers only the last 200 runs', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    for (let i = 0; i < 250; i++) profile.claimRun(`run-${i}`);
    expect(profile.data.claimedRuns).toHaveLength(200);
    expect(profile.data.claimedRuns[0]).toBe('run-50');
    expect(profile.data.claimedRuns[199]).toBe('run-249');
    expect(profile.claimRun('run-249')).toBe(false);
    expect(profile.claimRun('run-0')).toBe(true);
  });

  it('keeps the leaderboard sorted and at 30 entries', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    for (let i = 1; i <= 35; i++) profile.addScore('fondue', score(i * 10, { mode: 'endless' }));
    const list = profile.addScore('fondue', score(175));
    expect(list).toHaveLength(30);
    expect(list[0].score).toBe(350);
    expect(list.map((entry) => entry.score)).toEqual([...list.map((entry) => entry.score)].sort((a, b) => b - a));
    expect(list.some((entry) => entry.score === 175 && entry.mode === undefined)).toBe(true);
    expect(profile.scores('fondue')).toEqual(list);
    expect(profile.scores('glacier')).toEqual([]);
  });

  it('switches the tutorial on and off', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.markTutorialDone();
    expect(profile.data.tutorialDone).toBe(true);
    profile.resetTutorial();
    expect(profile.data.tutorialDone).toBe(false);
  });

  it('keeps and clears an interrupted level', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.setPendingRun({ level: 5 });
    expect(profile.data.pendingRun).toEqual({ level: 5 });
    profile.clearPendingRun();
    expect(profile.data.pendingRun).toBeNull();
  });
});

describe('Profile: developer ratings', () => {
  it('stores ratings and exports them as text', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    expect(profile.ratingsAsText({ crossbow: 'Crossbow' })).toBe('No ratings yet.');
    profile.setRating('level-3', { verdict: 'bad', note: '  too many raiders ' });
    profile.setRating('crossbow', { checked: true });
    profile.setRating('crossbow', { verdict: 'good' });
    expect(profile.data.devRatings.crossbow).toEqual({ checked: true, verdict: 'good', note: '' });
    const text = profile.ratingsAsText({ crossbow: 'Crossbow', catapult: 'Catapult' });
    expect(text).toBe('[x] Crossbow: good\n[ ] level-3: bad - too many raiders');
  });
});

describe('Profile: reset, export and import', () => {
  it('resets to a fresh profile with a new id', async () => {
    const store = new MemoryProfileStore();
    const profile = await Profile.load(store);
    const oldId = profile.data.profileId;
    profile.setName('Tim');
    profile.addStars(9);
    profile.markLevelDone('fondue', 1);
    profile.reset();
    await profile.flush();
    expect(profile.data.profileId).not.toBe(oldId);
    expect(profile.data.name).toBe('');
    expect(profile.data.stars).toBe(0);
    expect(profile.data.worlds).toEqual({});
    expect(storedProfile(store)).toEqual(profile.data);
  });

  it('replaces everything on import and keeps nothing of the old state', async () => {
    const source = await Profile.load(new MemoryProfileStore());
    source.setName('Jörg 🧀');
    source.addStars(12);
    source.markLevelDone('fondue', 4);
    const code = source.exportCode();

    const store = new MemoryProfileStore();
    const target = await Profile.load(store);
    target.unlockWeapon('only-here');
    target.markLevelDone('glacier', 9);
    target.importCode(code);
    await target.flush();
    expect(target.data).toEqual(source.data);
    expect(target.hasWeapon('only-here')).toBe(false);
    expect(storedProfile(store)).toEqual(source.data);
  });

  it('keeps the profile when an imported code is broken', async () => {
    const profile = await Profile.load(new MemoryProfileStore());
    profile.setName('Tim');
    expect(() => profile.importCode('FONDUE1.abc.00000000')).toThrow(Error);
    expect(profile.data.name).toBe('Tim');
  });
});
