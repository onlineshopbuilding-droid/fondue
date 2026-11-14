import { describe, expect, it } from 'vitest';
import { defaultFlags } from '../../src/config/flags';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import {
  LocalProfileStore, MIGRATION_STEPS, PROFILE_KEY, PROFILE_VERSION, STORAGE_PREFIX, exportCode, freshProfile, importCode, migrate,
  type MigrationStep, type ProfileData,
} from '../../src/profile';

function filledProfile(): ProfileData {
  return {
    ...freshProfile(),
    name: 'Jörg Müßig 🧀🏰 山',
    wallet: { cheese: 14, gold: 2500, crests: 3 },
    earned: { cheese: 40, gold: 9000, crests: 3 },
    keep: {
      castleTier: 3, handTier: 2, stations: { cauldron: 2, perch: 0 },
      weapons: { wheel: { tier: 3 }, cheese: { tier: 1 } },
      loadout: ['wheel', 'cheese', null, null, null],
    },
    seen: { tutorial: true, enemies: ['grunt'], tips: ['shake'], slotIntros: [0, 1], v3Notice: true },
    claimedRuns: ['run-1', 'run-2'],
    worlds: {
      fondue: {
        levelsDone: [1, 2, 3],
        cheese: { 1: 31, 2: 3, 3: 1 },
        storyRead: ['intro'],
        scores: [{ names: 'Jörg & Zoë', coop: true, wave: 9, score: 1234, kills: 88, difficulty: 'hard', date: '2026-11-11', mode: 'endless' }],
        endlessBest: { hard: 9 },
      },
    },
    devRatings: { wheel: { checked: true, verdict: 'good', note: 'fühlt sich gut an 👍' } },
    cheats: { used: true, log: ['gold +100'] },
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
    expect(data.format).toBe('fondue-profile');
    expect(data.wallet).toEqual({ cheese: 0, gold: 0, crests: 0 });
    expect(data.settings.tuning).toEqual(TUNING_DEFAULT);
  });

  it('starts fresh for an object of another format under the key', () => {
    const data = migrate({ format: 'something-else', name: 'Tim', wallet: { gold: 5 } });
    expect(data.name).toBe('');
    expect(data.wallet.gold).toBe(0);
  });

  it('replaces every field of the wrong type with its default', () => {
    const data = migrate({
      version: 1,
      profileId: 12,
      createdAt: null,
      updatedAt: {},
      name: ['Tim'],
      settings: 'loud',
      wallet: { cheese: 'viele', gold: -5, crests: 2.7 },
      earned: 'lots',
      keep: { castleTier: 'big', handTier: null, stations: { cauldron: 'yes', perch: 9 }, weapons: [3], loadout: 'wheel' },
      seen: { tutorial: 'yes', enemies: { grunt: true }, tips: null, slotIntros: [1, '2', 2.5, 1], v3Notice: 1 },
      claimedRuns: 5,
      worlds: null,
      devRatings: 'fine',
      cheats: { used: 'no', log: [1, 'x'] },
      coopCampaign: [],
    });
    expect(data.profileId.length).toBeGreaterThan(8);
    expect(typeof data.createdAt).toBe('string');
    expect(typeof data.updatedAt).toBe('string');
    expect(data.name).toBe('');
    expect(data.settings).toEqual(freshProfile().settings);
    expect(data.wallet).toEqual({ cheese: 0, gold: 0, crests: 2 });
    expect(data.earned).toEqual({ cheese: 0, gold: 0, crests: 0 });
    expect(data.keep).toEqual({ castleTier: 1, handTier: 1, stations: { cauldron: 0, perch: 1 }, weapons: {}, loadout: [null, null, null, null, null] });
    expect(data.seen).toEqual({ tutorial: false, enemies: [], tips: [], slotIntros: [1], v3Notice: false });
    expect(data.claimedRuns).toEqual([]);
    expect(data.worlds).toEqual({});
    expect(data.devRatings).toEqual({});
    expect(data.cheats).toEqual({ used: false, log: ['x'] });
    expect(data.pendingRun).toBeNull();
    expect(data.coopCampaign).toEqual({});
  });

  it('limits weapon, castle and hand tiers to 1..7', () => {
    const data = migrate({
      version: 1,
      keep: {
        castleTier: 12, handTier: -3,
        weapons: { low: { tier: 0 }, high: { tier: 9 }, text: { tier: 'x' }, fine: { tier: 4 }, odd: { tier: 2.6 }, nan: { tier: Number.NaN }, bare: 5 },
      },
    });
    expect(data.keep.weapons).toEqual({ low: { tier: 1 }, high: { tier: 7 }, fine: { tier: 4 }, odd: { tier: 3 }, bare: { tier: 5 } });
    expect(data.keep.castleTier).toBe(7);
    expect(data.keep.handTier).toBe(1);
  });

  it('keeps only owned weapons in the loadout, each at most once, always five slots', () => {
    const data = migrate({
      version: 1,
      keep: { weapons: { wheel: { tier: 2 }, cheese: { tier: 1 } }, loadout: ['wheel', 'wheel', 'notOwned', 7, 'cheese', 'extra'] },
    });
    expect(data.keep.loadout).toEqual(['wheel', null, null, null, 'cheese']);
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
        flags: { cauldron: 'back', secondHand: 5 },
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

  it('cleans worlds, cheese masks, scores and ratings entry by entry', () => {
    const data = migrate({
      version: 1,
      worlds: {
        fondue: {
          levelsDone: [1, 'x', 2, -4, 0],
          cheese: { 1: 31, 2: 255, 3: 'all', x: 3, 4: 0, 5: 2.9 },
          storyRead: ['intro', 4],
          endlessBest: { hard: 12.7, easy: 'far' },
          scores: [{ score: 5 }, 'junk', { score: 'high' }, { names: 'Tim', score: 50, day: 7, difficulty: 'hard', mode: 'endless' }],
        },
        broken: 17,
      },
      devRatings: { a: { checked: 'yes', verdict: 'great', note: 3 }, b: { checked: true, verdict: 'bad', note: 'slow' }, c: null },
    });
    expect(data.worlds.fondue.levelsDone).toEqual([1, 2]);
    // Only the five known bits survive; empty masks are dropped.
    expect(data.worlds.fondue.cheese).toEqual({ 1: 31, 2: 31, 5: 2 });
    expect(data.worlds.fondue.storyRead).toEqual(['intro']);
    expect(data.worlds.fondue.endlessBest).toEqual({ hard: 12 });
    expect(data.worlds.fondue.scores).toEqual([
      { names: 'Tim', coop: false, wave: 7, score: 50, kills: 0, difficulty: 'hard', date: '', mode: 'endless' },
      { names: '', coop: false, wave: 0, score: 5, kills: 0, difficulty: 'medium', date: '' },
    ]);
    expect(data.worlds.broken).toEqual({ levelsDone: [], cheese: {}, storyRead: [], scores: [], endlessBest: {} });
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
    const raw = JSON.parse('{"version":1,"keep":{"weapons":{"__proto__":{"tier":4},"bow":{"tier":2}}},"worlds":{"__proto__":{"levelsDone":[1]}}}');
    const data = migrate(raw);
    expect(data.keep.weapons).toEqual({ bow: { tier: 2 } });
    expect(Object.getPrototypeOf(data.worlds)).toBe(Object.prototype);
    expect(Object.keys(data.worlds)).toEqual([]);
  });

  it('keeps what it can read from a future higher version', () => {
    const data = migrate({
      version: PROFILE_VERSION + 6,
      profileId: 'from-the-future',
      name: 'Lenny',
      wallet: { cheese: 33, gold: 1, crests: 0 },
      keep: { weapons: { wheel: { tier: 8, glow: true } } },
      somethingNew: { a: 1 },
      worlds: { fondue: { levelsDone: [1, 2], newWorldField: true } },
    });
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.profileId).toBe('from-the-future');
    expect(data.name).toBe('Lenny');
    expect(data.wallet.cheese).toBe(33);
    expect(data.keep.weapons).toEqual({ wheel: { tier: 7 } });
    expect(data.worlds.fondue.levelsDone).toEqual([1, 2]);
    expect(data).not.toHaveProperty('somethingNew');
  });

  it('has exactly one step per version jump', () => {
    expect(MIGRATION_STEPS).toHaveLength(PROFILE_VERSION);
  });

  it('runs a chain of steps from the stored version upwards (skeleton for v1 -> v2 -> ...)', () => {
    // An invented version 0 that kept the gold as "coins" and the name inside "player".
    const zeroToOne: MigrationStep = (data) => {
      const player = data.player as { nick?: string } | undefined;
      return { ...data, version: 1, wallet: { gold: data.coins }, name: player?.nick ?? '' };
    };
    const calls: number[] = [];
    const steps: MigrationStep[] = [(data) => { calls.push(0); return zeroToOne(data); }];
    const old = { version: 0, coins: 21, player: { nick: 'Tim' } };

    const data = migrate(old, steps);
    expect(data.version).toBe(PROFILE_VERSION);
    expect(data.wallet.gold).toBe(21);
    expect(data.name).toBe('Tim');
    expect(calls).toEqual([0]);
    expect(old).toEqual({ version: 0, coins: 21, player: { nick: 'Tim' } });

    // Data without a version counts as version 0; current data skips the step.
    expect(migrate({ coins: 4 }, steps).wallet.gold).toBe(4);
    expect(migrate({ version: 1, coins: 4, wallet: { gold: 2 } }, steps).wallet.gold).toBe(2);
    expect(calls).toEqual([0, 0]);
  });

  it('falls back to the stored data when a step throws', () => {
    const steps: MigrationStep[] = [() => { throw new Error('bad step'); }];
    const data = migrate({ version: 0, name: 'Tim', wallet: { gold: 3 } }, steps);
    expect(data.name).toBe('Tim');
    expect(data.wallet.gold).toBe(3);
  });
});

describe('storage keys', () => {
  it('every key of v0.3 starts with fondue.v3.', () => {
    expect(STORAGE_PREFIX).toBe('fondue.v3.');
    expect(PROFILE_KEY).toBe('fondue.v3.profile');
    expect(PROFILE_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
  });
});

describe('profile code', () => {
  it('gives back the same data after export and import, umlauts and emoji included', () => {
    const data = filledProfile();
    const code = exportCode(data);
    expect(code).toMatch(/^FONDUE3\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
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
    expect(() => importCode('FONDUE9.abcd.00000000')).toThrow('This is not a Fondue profile code.');
    expect(() => importCode('FONDUE3.ab$d.00000000')).toThrow(/characters/);
    expect(() => importCode('FONDUE3..00000000')).toThrow(/incomplete/);
    expect(() => importCode(undefined as unknown as string)).toThrow(Error);
  });

  it('rejects a code of v0.2 cleanly, with its own message', () => {
    const bytes = new TextEncoder().encode('{"version":1,"name":"Tim","stars":20}');
    let hash = 0x811c9dc5;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    expect(() => importCode(`FONDUE1.eyJ2.${hash.toString(16).padStart(8, '0')}`)).toThrow(/older version/);
  });

  it('rejects a well-formed code that holds no profile, or JSON without the format marker', () => {
    const codeOf = (json: string, b64: string) => {
      const bytes = new TextEncoder().encode(json);
      let hash = 0x811c9dc5;
      for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
      return `FONDUE3.${b64}.${hash.toString(16).padStart(8, '0')}`;
    };
    expect(() => importCode(codeOf('[1,2,3]', 'WzEsMiwzXQ'))).toThrow('Profile code does not contain a profile.');
    expect(() => importCode(codeOf('{"a":1}', 'eyJhIjoxfQ'))).toThrow('Profile code does not contain a profile.');
  });

  it('cleans the data of an imported code like stored data', () => {
    const odd = { ...freshProfile(), wallet: { cheese: 'viele', gold: 5, crests: -1 }, keep: { handTier: 9 } } as unknown as ProfileData;
    const data = importCode(exportCode(odd));
    expect(data.wallet).toEqual({ cheese: 0, gold: 5, crests: 0 });
    expect(data.keep.handTier).toBe(7);
  });
});

describe('LocalProfileStore', () => {
  it('does not throw where no localStorage exists', async () => {
    expect(typeof localStorage).toBe('undefined');
    const store = new LocalProfileStore();
    await expect(store.read(PROFILE_KEY)).resolves.toBeNull();
    await expect(store.write(PROFILE_KEY, '{}')).rejects.toBeInstanceOf(Error);
    expect(() => store.writeSync(PROFILE_KEY, '{}')).toThrow(Error);
    await expect(store.remove(PROFILE_KEY)).resolves.toBeUndefined();
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
      store.writeSync('k', 'w');
      expect(await store.read('k')).toBe('w');
      await store.remove('k');
      expect(await store.read('k')).toBeNull();

      blocked = true;
      await expect(store.read('k')).resolves.toBeNull();
      await expect(store.write('k', 'v')).rejects.toThrow('Local storage refused to save.');
      expect(() => store.writeSync('k', 'v')).toThrow('Local storage refused to save.');
      await expect(store.remove('k')).resolves.toBeUndefined();
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
