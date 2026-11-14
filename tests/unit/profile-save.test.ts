/**
 * Reliable saving of the v0.3 profile (A6): debounced background writes, the synchronous flush for
 * page hide / close, a full or blocked storage, reload, and the old key `fondue.profile` untouched.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addGold } from '../../src/modes/progress';
import {
  LocalProfileStore, MemoryProfileStore, PROFILE_KEY, Profile, SAVE_DELAY_MS, SAVE_FAILED_NOTICE,
} from '../../src/profile';

/** A fake localStorage that can be made full; it records every key that is touched. */
function fakeLocalStorage(initial: Record<string, string> = {}) {
  const memory = new Map(Object.entries(initial));
  const touched = new Set<string>();
  const state = { full: false };
  const fake = {
    getItem: (key: string) => { touched.add(key); return memory.get(key) ?? null; },
    setItem: (key: string, value: string) => { touched.add(key); if (state.full) throw new Error('QuotaExceededError'); memory.set(key, value); },
    removeItem: (key: string) => { touched.add(key); memory.delete(key); },
  };
  (globalThis as { localStorage?: unknown }).localStorage = fake;
  return { memory, touched, state };
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
  vi.useRealTimers();
});

describe('saving', () => {
  it('writes a change at most 300 ms later, several changes as one write', async () => {
    expect(SAVE_DELAY_MS).toBeLessThanOrEqual(300);
    const store = new MemoryProfileStore();
    const p = await Profile.load(store);
    vi.useFakeTimers();
    const before = store.writeCount;
    addGold(p, 1);
    addGold(p, 2);
    p.setName('Tim');
    expect(store.writeCount).toBe(before);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 5);
    expect(store.writeCount).toBe(before + 1);
    expect(JSON.parse(store.entries.get(PROFILE_KEY)!).wallet.gold).toBe(3);
  });

  it('flushSync writes at once, without waiting (page hide, app switch, close)', async () => {
    const store = new MemoryProfileStore();
    const p = await Profile.load(store);
    addGold(p, 40);
    p.flushSync();
    expect(JSON.parse(store.entries.get(PROFILE_KEY)!).wallet.gold).toBe(40);
    const writes = store.writeCount;
    p.flushSync();
    expect(store.writeCount).toBe(writes);
  });

  it('save, reload: everything comes back the same', async () => {
    const ls = fakeLocalStorage();
    const p = await Profile.load(new LocalProfileStore());
    addGold(p, 123);
    p.setWeaponTier('wheel', 4);
    p.markLevelDone('fondue', 7);
    p.flushSync();
    const again = await Profile.load(new LocalProfileStore());
    expect(again.data).toEqual(p.data);
    expect(ls.memory.has(PROFILE_KEY)).toBe(true);
  });

  it('a full or blocked storage keeps the game running from memory and says so exactly once', async () => {
    const ls = fakeLocalStorage();
    const p = await Profile.load(new LocalProfileStore());
    expect(p.saveFailed).toBe(false);
    expect(p.takeSaveNotice()).toBeNull();
    ls.state.full = true;
    addGold(p, 10);
    p.flushSync();
    expect(p.saveFailed).toBe(true);
    expect(p.data.wallet.gold).toBe(10);
    expect(p.takeSaveNotice()).toBe(SAVE_FAILED_NOTICE);
    expect(p.takeSaveNotice()).toBeNull();
    addGold(p, 5);
    await p.flush();
    expect(p.data.wallet.gold).toBe(15);
    expect(p.takeSaveNotice()).toBeNull();

    ls.state.full = false;
    addGold(p, 1);
    await p.flush();
    expect(p.saveFailed).toBe(false);
    expect(JSON.parse(ls.memory.get(PROFILE_KEY)!).wallet.gold).toBe(16);
  });

  it('a storage blocked from the start (no localStorage) still loads and plays', async () => {
    const p = await Profile.load(new LocalProfileStore());
    expect(p.saveFailed).toBe(true);
    addGold(p, 3);
    p.flushSync();
    expect(p.data.wallet.gold).toBe(3);
    expect(p.takeSaveNotice()).toBe(SAVE_FAILED_NOTICE);
  });
});

describe('the old save of v0.2 (fondue.profile)', () => {
  it('stays byte for byte identical through load, change, save, reset and reload', async () => {
    const sentinel = JSON.stringify({ version: 1, name: 'Tim', stars: 120, unlockedWeapons: ['wheel'], handTier: 3, note: 'äöü 🧀' });
    const ls = fakeLocalStorage({ 'fondue.profile': sentinel, 'fondue.settings.v1': '{"muted":true}', 'fondue.scores.v1': '[]' });
    const p = await Profile.load(new LocalProfileStore());
    expect(p.data.name).toBe('');
    addGold(p, 50);
    p.flushSync();
    p.reset();
    await p.flush();
    await Profile.load(new LocalProfileStore());
    expect(ls.memory.get('fondue.profile')).toBe(sentinel);
    expect(ls.memory.get('fondue.settings.v1')).toBe('{"muted":true}');
    expect(ls.memory.get('fondue.scores.v1')).toBe('[]');
    for (const key of ls.touched) expect(key.startsWith('fondue.v3.')).toBe(true);
  });
});
