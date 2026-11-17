/**
 * Risk 2 of the v0.4 build plan: a v0.3 save taken over with a raised (or already high) castle tier
 * must not queue several slot introductions at once. Slots open by castle tier in v0.4, so every slot
 * the imported castle opens counts as introduced; later castle tiers bring their introduction as usual.
 */
import { describe, expect, it } from 'vitest';
import { completeTutorial } from '../../src/modes/progress';
import { pendingIntros } from '../../src/modes/tutorial';
import { openSlots } from '../../src/modes/unlocks';
import { MemoryProfileStore, Profile, V3_PROFILE_KEY, migrateV3ToV4 } from '../../src/profile';

const W = 'fondue';
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** A v0.3 profile as v0.3 stored it (profile version 1). */
function v3Profile(levelsDone: number[], castleTier: number, slotIntros: number[], loadout: (string | null)[] = ['wheel', null, null, null, null], weapons: Record<string, { tier: number }> = { wheel: { tier: 1 } }) {
  return {
    format: 'fondue-profile', version: 1, profileId: 'v3-save',
    createdAt: '2026-11-10T10:00:00.000Z', updatedAt: '2026-11-16T10:00:00.000Z', name: 'Tim',
    wallet: { cheese: 0, gold: 0, crests: 0 }, earned: { cheese: 0, gold: 0, crests: 0 },
    keep: { castleTier, handTier: 1, stations: { cauldron: 0, perch: 0 }, weapons, loadout },
    worlds: { fondue: { levelsDone, cheese: {}, storyRead: [], scores: [], endlessBest: {} } },
    seen: { tutorial: true, enemies: [], tips: [], slotIntros, v3Notice: true },
  };
}

/** Loads a v0.4 profile from a store that holds only this v0.3 save. */
async function imported(v3: object): Promise<Profile> {
  const store = new MemoryProfileStore();
  store.entries.set(V3_PROFILE_KEY, JSON.stringify(v3));
  return Profile.load(store);
}

const slotIntrosPending = (p: Profile) => pendingIntros(p, W).filter((i) => i.kind === 'slot');

describe('v0.3 import and slot introductions (risk 2)', () => {
  it('a v0.3 save at level 7 (four slots, intros seen) is lifted to castle tier 4 with no slot intro pending', async () => {
    const p = await imported(v3Profile(range(7), 1, [1, 2, 3]));
    expect(p.data.keep.castleTier).toBe(4);
    expect(openSlots(p, W)).toEqual([true, true, true, true, false]);
    expect(slotIntrosPending(p)).toEqual([]);
  });

  it('a v0.3 save at level 3 with castle tier 5 bought keeps tier 5 and queues no slot intros', async () => {
    const p = await imported(v3Profile(range(3), 5, [1]));
    expect(p.data.keep.castleTier).toBe(5);
    expect(openSlots(p, W)).toEqual([true, true, true, true, true]);
    expect(slotIntrosPending(p)).toEqual([]);
  });

  it('a v0.3 save with a weapon in a slot whose intro it never saw queues no intro either', async () => {
    const p = await imported(v3Profile(range(1), 1, [], ['wheel', 'cheese', null, null, null], { wheel: { tier: 1 }, cheese: { tier: 1 } }));
    expect(p.data.keep.castleTier).toBe(2);
    expect(slotIntrosPending(p)).toEqual([]);
  });

  it('after the import, the next castle tier still brings exactly one new slot intro', async () => {
    const p = await imported(v3Profile(range(7), 1, [1, 2, 3]));
    completeTutorial(p, W);
    p.edit((d) => { d.keep.castleTier = 5; });
    expect(slotIntrosPending(p)).toEqual([{ kind: 'slot', slot: 4 }]);
  });

  it('the pure migration marks exactly the slots the castle opens', () => {
    const out = migrateV3ToV4(v3Profile(range(2), 3, [1]) as never) as { seen: { slotIntros: number[] }; keep: { castleTier: number } };
    expect(out.keep.castleTier).toBe(3);
    expect(out.seen.slotIntros).toEqual([1, 2]);
  });
});
