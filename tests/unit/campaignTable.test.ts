import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as worlds from '../../src/config/worlds';
import * as campaign from '../../src/config/worlds/fondue/campaign';
import * as enemies from '../../src/config/enemies';
import * as weapons from '../../src/config/weapons';
import * as keep from '../../src/config/keep';
import * as slots from '../../src/config/slots';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { campaignData, campaignTable, DOC, withTable } from '../../scripts/campaign-table';

describe('campaign table', () => {
  const data = campaignData({ worlds, campaign, enemies, weapons, keep, slots });

  it('has one row per level, with every unlock and boss in it', () => {
    const table = campaignTable(data);
    expect(data.levels.length).toBe(campaign.LEVEL_COUNT);
    for (const l of data.levels) expect(table).toContain(`| ${l.id}`);
    for (const l of data.levels.filter((x) => x.boss)) expect(table).toContain(l.boss!.name);
    for (const w of data.unlocks.filter((u) => u.kind === 'weapon')) expect(table).toContain(data.weaponNames[w.weapon]);
  });

  it('shows from which level every castle tier can be built, with its price and the slot it opens', () => {
    const table = campaignTable(data);
    expect(data.castle.length).toBe(keep.CASTLE_TIERS.length);
    for (const c of data.castle.slice(1)) {
      expect(c.level).toBe(CASTLE_TIER_LEVEL[c.tier - 1]);
      expect(table).toContain(`| ${c.tier} | ${c.name} | ${c.level} | ${c.gold} |`);
    }
    for (const sl of slots.SLOTS) expect(data.castle[sl.castleTier - 1].opens).toContain(sl.name);
  });

  it('docs/KAMPAGNE-TABELLE.md shows the levels as they are now (run: node scripts/campaign-table.ts)', () => {
    const doc = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
    expect(withTable(doc, campaignTable(data))).toBe(doc);
  });
});
