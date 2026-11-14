/**
 * The economy tables of v0.3: everything that costs cheese costs exactly 500 together, prices rise
 * every tier, tier 7 needs Raider Crests, and the crest table covers every raider.
 */
import { describe, expect, it } from 'vitest';
import { CRESTS, crestsFor } from '../../src/config/crests';
import { CHEESE } from '../../src/config/currencies';
import { ENEMY_TYPES } from '../../src/config/enemies';
import { STATIONS, STATION_IDS } from '../../src/config/keep';
import { CREST_COST, TIER_CAP_BY_LEVEL, TIER_MAX, WEAPON_TIER_GOLD, tierCrests, weaponTierGold } from '../../src/config/tiers';
import { WEAPONS } from '../../src/config/weapons';
import { weaponCheesePrice } from '../../src/modes/unlocks';

describe('cheese prices', () => {
  it('all cheese prices (weapons, Great Cauldron, Eagle Perch) add up to exactly 500', () => {
    const weapons = WEAPONS.filter((w) => w.enabled).reduce((sum, w) => sum + weaponCheesePrice(w), 0);
    const stations = STATION_IDS.reduce((sum, id) => sum + STATIONS[id].cheesePrice, 0);
    expect(weapons + stations).toBe(CHEESE.total);
    expect(CHEESE.total).toBe(500);
  });

  it('the Rolling Wheel is free; every other weapon and station costs cheese', () => {
    for (const w of WEAPONS.filter((x) => x.enabled)) {
      if (w.id === 'wheel') expect(weaponCheesePrice(w)).toBe(0);
      else expect(weaponCheesePrice(w)).toBeGreaterThan(0);
    }
    for (const id of STATION_IDS) expect(STATIONS[id].cheesePrice).toBeGreaterThan(0);
  });
});

describe('tier prices', () => {
  it('weapon gold rises every tier from 2 to 7, and only tier 7 needs crests', () => {
    expect(WEAPON_TIER_GOLD).toHaveLength(TIER_MAX);
    for (let tier = 3; tier <= TIER_MAX; tier++) expect(weaponTierGold(tier)).toBeGreaterThan(weaponTierGold(tier - 1));
    expect(weaponTierGold(1)).toBe(0);
    for (let tier = 1; tier < TIER_MAX; tier++) expect(tierCrests(tier)).toBe(0);
    expect(tierCrests(TIER_MAX)).toBe(CREST_COST);
    expect(weaponTierGold(4, 2)).toBe(2 * weaponTierGold(4));
  });

  it('the tier cap rises with the campaign and stays below 7 without the perch', () => {
    for (let i = 1; i < TIER_CAP_BY_LEVEL.length; i++) {
      expect(TIER_CAP_BY_LEVEL[i].afterLevel).toBeGreaterThan(TIER_CAP_BY_LEVEL[i - 1].afterLevel);
      expect(TIER_CAP_BY_LEVEL[i].cap).toBeGreaterThan(TIER_CAP_BY_LEVEL[i - 1].cap);
    }
    expect(Math.max(...TIER_CAP_BY_LEVEL.map((c) => c.cap))).toBeLessThan(TIER_MAX);
  });
});

describe('Raider Crests', () => {
  it('every raider type leaves 1 to 5, the Yeti and bosses the most', () => {
    for (const t of ENEMY_TYPES) {
      expect(crestsFor(t)).toBeGreaterThanOrEqual(1);
      expect(crestsFor(t)).toBeLessThanOrEqual(5);
    }
    expect(crestsFor('yeti')).toBe(5);
    expect(crestsFor('grunt', true)).toBe(CRESTS.boss);
    expect(CRESTS.perRun).toBeGreaterThan(0);
  });
});
