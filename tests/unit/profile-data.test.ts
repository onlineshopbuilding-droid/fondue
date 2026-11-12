import { describe, expect, it } from 'vitest';
import { defaultFlags } from '../../src/config/flags';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import {
  LocalProfileStore, MIGRATION_STEPS, PROFILE_VERSION, exportCode, freshProfile, importCode, importLegacy, migrate,
  type MigrationStep, type ProfileData,
} from '../../src/profile';

function filledProfile(): ProfileData {
  return {
    ...freshProfile(),
    name: 'Jörg Müßig 🧀🏰 山',
    stars: 14,
    starsEarned: 40,
    unlockedWeapons: ['crossbow', 'cheese-wheel'],
    unlockedSlots: [0, 1],
    unlockedStations: ['market'],
    weaponTiers: { crossbow: 3 },
    handTier: 2,
    tutorialDone: true,
    seenEnemies: ['raider'],
    seenTips: ['shake'],
    claimedRuns: ['run-1', 'run-2'],
    worlds: {
      fondue: {
        levelsDone: [1, 2, 3],
        guestStarLevels: [2],
        storyRead: ['intro'],
        endlessMilestones: { hard: [10, 20] },
        scores: [{ names: 'Jörg & Zoë', coop: true, day: 9, score: 1234, kills: 88, difficulty: 'hard', date: '2026-11-11', mode: 'endless' }],
      },
    },
    devRatings: { crossbow: { checked: true, verdict: 'good', note: 'fühlt sich gut an 👍' } },
    pendingRun: { level: 4, seed: 99, nested: [1, 'two', null] },
    coopCampaign: { reserved: true },
  };
}

describe('migrate', () => {
  it('keeps a valid profile exactly as it is', () => {
    const data = filledProfile();
    expect(migrate(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it.each([null, undefined, 7, 'text', [1, 2], true])('returns a fresh profile for %j', (raw) => {
    const data = migrate(raw);
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.stars).toBe(0);
    expect(data.settings.tuning).toEqual(TUNING_DEFAULT);
  });

  it('replaces every field of the wrong type with its default', () => {
    const data = migrate({
      version: 1,
      profileId: 12,
      createdAt: null,
      updatedAt: {},
      name: ['Tim'],
      settings: 'loud',
      stars: 'viele',
      starsEarned: -5,
      unlockedWeapons: 'crossbow',
      unlockedSlots: [1, '2', 2.5, 1, null],
      unlockedStations: [1, 'market', 'market'],
      weaponTiers: [3],
      handTier: 'big',
      tutorialDone: 'yes',
      seenEnemies: { raider: true },
      seenTips: null,
      claimedRuns: 5,
      worlds: null,
      devRatings: 'fine',
      coopCampaign: [],
    });
    expect(data.profileId.length).toBeGreaterThan(8);
    expect(typeof data.createdAt).toBe('string');
    expect(typeof data.updatedAt).toBe('string');
    expect(data.name).toBe('');
    expect(data.settings).toEqual(freshProfile().settings);
    expect(data.stars).toBe(0);
    expect(data.starsEarned).toBe(0);
    expect(data.unlockedWeapons).toEqual([]);
    expect(data.unlockedSlots).toEqual([1]);
    expect(data.unlockedStations).toEqual(['market']);
    expect(data.weaponTiers).toEqual({});
    expect(data.handTier).toBe(1);
    expect(data.tutorialDone).toBe(false);
    expect(data.seenEnemies).toEqual([]);
    expect(data.seenTips).toEqual([]);
    expect(data.claimedRuns).toEqual([]);
    expect(data.worlds).toEqual({});
    expect(data.devRatings).toEqual({});
    expect(data.pendingRun).toBeNull();
    expect(data.coopCampaign).toEqual({});
  });

  it('limits weapon tiers to 1..5 and the hand tier to 1..3', () => {
    const data = migrate({ version: 1, weaponTiers: { low: 0, high: 9, text: 'x', fine: 4, odd: 2.6, nan: Number.NaN }, handTier: 12 });
    expect(data.weaponTiers).toEqual({ low: 1, high: 5, fine: 4, odd: 3 });
    expect(data.handTier).toBe(3);
  });

  it('cleans settings field by field', () => {
    const data = migrate({
      version: 1,
      settings: {
        difficulty: 'impossible',
        musicVolume: 7,
        sfxVolume: '0.3',
        muted: 1,
        relayAddress: 42,
        tuning: { gravity: 'heavy', throwMult: 2, knockOthers: 'yes', notATuningValue: 5 },
        flags: { cauldron: 'back', dayEnd: 5 },
      },
    });
    expect(data.settings).toEqual({
      difficulty: 'medium',
      musicVolume: 1,
      sfxVolume: 0.8,
      muted: false,
      relayAddress: '',
      tuning: { ...TUNING_DEFAULT, throwMult: 2 },
      flags: defaultFlags(),
    });
  });

  it('cleans worlds, scores and ratings entry by entry', () => {
    const data = migrate({
      version: 1,
      worlds: {
        fondue: {
          levelsDone: [1, 'x', 2],
          guestStarLevels: 'none',
          storyRead: ['intro', 4],
          endlessMilestones: { hard: [10, 'x'], easy: 'all' },
          scores: [{ score: 5 }, 'junk', { score: 'high' }, { names: 'Tim', score: 50, difficulty: 'hard', mode: 'endless' }],
        },
        broken: 17,
      },
      devRatings: { a: { checked: 'yes', verdict: 'great', note: 3 }, b: { checked: true, verdict: 'bad', note: 'slow' }, c: null },
    });
    expect(data.worlds.fondue.levelsDone).toEqual([1, 2]);
    expect(data.worlds.fondue.guestStarLevels).toEqual([]);
    expect(data.worlds.fondue.storyRead).toEqual(['intro']);
    expect(data.worlds.fondue.endlessMilestones).toEqual({ hard: [10], easy: [] });
    expect(data.worlds.fondue.scores).toEqual([
      { names: 'Tim', coop: false, day: 0, score: 50, kills: 0, difficulty: 'hard', date: '', mode: 'endless' },
      { names: '', coop: false, day: 0, score: 5, kills: 0, difficulty: 'medium', date: '' },
    ]);
    expect(data.worlds.broken).toEqual({ levelsDone: [], guestStarLevels: [], storyRead: [], endlessMilestones: {}, scores: [] });
    expect(data.devRatings).toEqual({
      a: { checked: false, verdict: null, note: '' },
      b: { checked: true, verdict: 'bad', note: 'slow' },
      c: { checked: false, verdict: null, note: '' },
    });
  });

  it('cuts claimed runs to the last 200 and scores to the best 30', () => {
    const runs = Array.from({ length: 230 }, (_, i) => `run-${i}`);
    const scores = Array.from({ length: 40 }, (_, i) => ({ score: i }));
    const data = migrate({ version: 1, claimedRuns: runs, worlds: { fondue: { scores } } });
    expect(data.claimedRuns).toHaveLength(200);
    expect(data.claimedRuns[0]).toBe('run-30');
    expect(data.worlds.fondue.scores).toHaveLength(30);
    expect(data.worlds.fondue.scores[0].score).toBe(39);
  });

  it('does not let stored keys replace the prototype', () => {
    const raw = JSON.parse('{"version":1,"weaponTiers":{"__proto__":4,"bow":2},"worlds":{"__proto__":{"levelsDone":[1]}}}');
    const data = migrate(raw);
    expect(data.weaponTiers).toEqual({ bow: 2 });
    expect(Object.getPrototypeOf(data.worlds)).toBe(Object.prototype);
    expect(Object.keys(data.worlds)).toEqual([]);
  });

  it('keeps what it can read from a future higher version', () => {
    const data = migrate({
      version: PROFILE_VERSION + 6,
      profileId: 'from-the-future',
      name: 'Lenny',
      stars: 33,
      unlockedWeapons: ['crossbow', { id: 'new-kind-of-entry' }],
      weaponTiers: { crossbow: 8 },
      somethingNew: { a: 1 },
      worlds: { fondue: { levelsDone: [1, 2], newWorldField: true } },
    });
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.profileId).toBe('from-the-future');
    expect(data.name).toBe('Lenny');
    expect(data.stars).toBe(33);
    expect(data.unlockedWeapons).toEqual(['crossbow']);
    expect(data.weaponTiers).toEqual({ crossbow: 5 });
    expect(data.worlds.fondue.levelsDone).toEqual([1, 2]);
    expect(data).not.toHaveProperty('somethingNew');
  });

  it('has exactly one step per version jump', () => {
    expect(MIGRATION_STEPS).toHaveLength(PROFILE_VERSION);
  });

  it('runs an artificial 0 -> 1 step from a list of steps', () => {
    // An invented version 0 that called the stars "cheese" and kept the name inside "player".
    const zeroToOne: MigrationStep = (data) => {
      const player = data.player as { nick?: string } | undefined;
      return { ...data, version: 1, stars: data.cheese, starsEarned: data.cheese, name: player?.nick ?? '' };
    };
    const calls: number[] = [];
    const steps: MigrationStep[] = [(data) => { calls.push(0); return zeroToOne(data); }];
    const old = { version: 0, cheese: 21, player: { nick: 'Tim' }, unlockedWeapons: ['crossbow'] };

    const data = migrate(old, steps);
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.stars).toBe(21);
    expect(data.starsEarned).toBe(21);
    expect(data.name).toBe('Tim');
    expect(data.unlockedWeapons).toEqual(['crossbow']);
    expect(calls).toEqual([0]);
    expect(old).toEqual({ version: 0, cheese: 21, player: { nick: 'Tim' }, unlockedWeapons: ['crossbow'] });

    // Data without a version counts as version 0; current data skips the step.
    expect(migrate({ cheese: 4 }, steps).stars).toBe(4);
    expect(migrate({ version: 1, cheese: 4, stars: 2 }, steps).stars).toBe(2);
    expect(calls).toEqual([0, 0]);
  });

  it('falls back to the stored data when a step throws', () => {
    const steps: MigrationStep[] = [() => { throw new Error('bad step'); }];
    const data = migrate({ version: 0, name: 'Tim', stars: 3 }, steps);
    expect(data.name).toBe('Tim');
    expect(data.stars).toBe(3);
  });
});

describe('importLegacy', () => {
  it('returns nothing for missing or unreadable data', () => {
    expect(importLegacy(null, null)).toEqual({});
    expect(importLegacy('not json', '{"a":1}')).toEqual({});
    expect(importLegacy('[1]', '[]')).toEqual({});
  });

  it('reads the name, cleaned settings and sorted scores', () => {
    const legacy = importLegacy(
      JSON.stringify({ name: 'Lenny', difficulty: 'easy', musicVolume: 'loud', tuning: { maxThrow: 3000 }, flags: { dayEnd: 'retreat' } }),
      JSON.stringify([{ names: 'Lenny', coop: false, day: 2, score: 10, kills: 4, difficulty: 'easy', date: 'd' }, { score: 70 }, 'junk']),
    );
    expect(legacy.name).toBe('Lenny');
    expect(legacy.settings?.difficulty).toBe('easy');
    expect(legacy.settings?.musicVolume).toBe(0.5);
    expect(legacy.settings?.tuning).toEqual({ ...TUNING_DEFAULT, maxThrow: 3000 });
    expect(legacy.settings?.flags).toEqual({ ...defaultFlags(), dayEnd: 'retreat' });
    expect(legacy.worlds?.fondue.scores.map((entry) => entry.score)).toEqual([70, 10]);
    expect(legacy.worlds?.fondue.levelsDone).toEqual([]);
  });
});

describe('profile code', () => {
  it('gives back the same data after export and import, umlauts and emoji included', () => {
    const data = filledProfile();
    const code = exportCode(data);
    expect(code).toMatch(/^FONDUE1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
    expect(importCode(code)).toEqual(data);
  });

  it('round-trips names of every byte length', () => {
    for (const name of ['', 'a', 'ab', 'abc', 'ä', 'äö', '🧀', 'a🧀ß', '\u0000\u007f￿']) {
      const data = { ...freshProfile(), name };
      expect(importCode(exportCode(data)).name).toBe(name);
    }
  });

  it('accepts a code with spaces and line breaks around and inside it', () => {
    const data = filledProfile();
    const code = exportCode(data);
    const wrapped = `  ${code.slice(0, 40)}\n${code.slice(40, 90)} \r\n${code.slice(90)}\n`;
    expect(importCode(wrapped)).toEqual(data);
  });

  it('rejects a code that was changed', () => {
    const code = exportCode(filledProfile());
    const [prefix, payload, sum] = code.split('.');
    const at = Math.floor(payload.length / 2);
    const swapped = payload[at] === 'A' ? 'B' : 'A';
    const tampered = `${prefix}.${payload.slice(0, at)}${swapped}${payload.slice(at + 1)}.${sum}`;
    expect(() => importCode(tampered)).toThrow(/checksum/);
    expect(() => importCode(`${prefix}.${payload}.${sum === '00000000' ? '00000001' : '00000000'}`)).toThrow(/checksum/);
  });

  it('rejects a code that was cut off', () => {
    const code = exportCode(filledProfile());
    for (const length of [code.length - 1, code.length - 4, code.length - 9, code.length - 10, Math.floor(code.length / 2), 12, 8, 3]) {
      expect(() => importCode(code.slice(0, length)), `cut to ${length}`).toThrow(Error);
    }
  });

  it('rejects anything that is no profile code, with a clear message', () => {
    expect(() => importCode('')).toThrow('This is not a Fondue profile code.');
    expect(() => importCode('hello world')).toThrow('This is not a Fondue profile code.');
    expect(() => importCode('FONDUE2.abcd.00000000')).toThrow('This is not a Fondue profile code.');
    expect(() => importCode('FONDUE1.ab$d.00000000')).toThrow(/characters/);
    expect(() => importCode('FONDUE1..00000000')).toThrow(/incomplete/);
    expect(() => importCode(undefined as unknown as string)).toThrow(Error);
  });

  it('rejects a well-formed code that holds no profile', () => {
    const bytes = new TextEncoder().encode('[1,2,3]');
    let hash = 0x811c9dc5;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    const code = `FONDUE1.WzEsMiwzXQ.${hash.toString(16).padStart(8, '0')}`;
    expect(() => importCode(code)).toThrow('Profile code does not contain a profile.');
  });

  it('cleans the data of an imported code like stored data', () => {
    const odd = { ...freshProfile(), stars: 'viele', handTier: 9 } as unknown as ProfileData;
    const data = importCode(exportCode(odd));
    expect(data.stars).toBe(0);
    expect(data.handTier).toBe(3);
  });
});

describe('LocalProfileStore', () => {
  it('does not throw where no localStorage exists', async () => {
    expect(typeof localStorage).toBe('undefined');
    const store = new LocalProfileStore();
    await expect(store.read('fondue.profile')).resolves.toBeNull();
    await expect(store.write('fondue.profile', '{}')).rejects.toBeInstanceOf(Error);
    await expect(store.remove('fondue.profile')).resolves.toBeUndefined();
  });

  it('reads, writes and removes through localStorage, and survives its errors', async () => {
    const memory = new Map<string, string>();
    let blocked = false;
    const fake = {
      getItem: (key: string) => { if (blocked) throw new Error('blocked'); return memory.get(key) ?? null; },
      setItem: (key: string, value: string) => { if (blocked) throw new Error('quota'); memory.set(key, value); },
      removeItem: (key: string) => { if (blocked) throw new Error('blocked'); memory.delete(key); },
    };
    (globalThis as { localStorage?: unknown }).localStorage = fake;
    try {
      const store = new LocalProfileStore();
      await store.write('k', 'v');
      expect(await store.read('k')).toBe('v');
      await store.remove('k');
      expect(await store.read('k')).toBeNull();

      blocked = true;
      await expect(store.read('k')).resolves.toBeNull();
      await expect(store.write('k', 'v')).rejects.toThrow('Local storage refused to save.');
      await expect(store.remove('k')).resolves.toBeUndefined();
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
