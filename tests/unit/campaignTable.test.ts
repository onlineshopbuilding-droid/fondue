import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as worlds from '../../src/config/worlds';
import * as campaign from '../../src/config/worlds/fondue/campaign';
import * as enemies from '../../src/config/enemies';
import * as weapons from '../../src/config/weapons';
import * as keep from '../../src/config/keep';
import * as slots from '../../src/config/slots';
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

  it('docs/KAMPAGNE-TABELLE.md shows the levels as they are now (run: node scripts/campaign-table.ts)', () => {
    const doc = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
    expect(withTable(doc, campaignTable(data))).toBe(doc);
  });
});
