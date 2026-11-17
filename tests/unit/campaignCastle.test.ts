import { describe, expect, it } from 'vitest';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { STORYBOOK } from '../../src/config/worlds/fondue/story';
import { castleTierAtLevel } from '../../src/ui/screens/campaign';
import { pagesFor } from '../../src/ui/lobby/storybook';

describe('campaign map: castle tier marks', () => {
  it('marks exactly the levels of CASTLE_TIER_LEVEL, with their tier', () => {
    for (let tier = 2; tier <= CASTLE_TIER_LEVEL.length; tier++) expect(castleTierAtLevel(CASTLE_TIER_LEVEL[tier - 1])).toBe(tier);
    const marked = Array.from({ length: 100 }, (_, i) => i + 1).filter((l) => castleTierAtLevel(l) > 0);
    expect(marked).toEqual(CASTLE_TIER_LEVEL.slice(1));
    expect(castleTierAtLevel(0)).toBe(0);
  });
});

describe('storybook pages', () => {
  it('opens a page once its level is won', () => {
    expect(pagesFor(STORYBOOK, 0).every((p) => p.unlockLevel === 0)).toBe(true);
    expect(pagesFor(STORYBOOK, 100)).toHaveLength(STORYBOOK.length);
    const some = pagesFor(STORYBOOK, 7);
    expect(some.length).toBeGreaterThan(pagesFor(STORYBOOK, 0).length);
    expect(some.every((p) => p.unlockLevel <= 7)).toBe(true);
  });
});
