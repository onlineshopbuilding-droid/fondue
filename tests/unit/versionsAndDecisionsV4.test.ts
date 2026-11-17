/**
 * v0.4 (V1, B6, Auftrag Abschnitt 8): the list of playable versions, the v0.4 decision list and the
 * castle-tier helpers of the developer overview, all read from the configuration.
 */
import { describe, expect, it } from 'vitest';
import { castleOpens, castleTiersAt } from '../../scripts/dev-page/page';
import { DECISIONS_V3, DECISIONS_V4 } from '../../src/config/decisions';
import { GAME_VERSION } from '../../src/config/game';
import { CASTLE_TIERS } from '../../src/config/keep';
import { SLOTS } from '../../src/config/slots';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { SITE_ORIGIN, VERSIONS, VERSIONS_NOTE, versionUrl } from '../../src/config/versions';

describe('playable versions', () => {
  it('lists v0.4 (this one, at /fondue/), v0.3, v0.2 and v0.1 newest first', () => {
    expect(VERSIONS.map((v) => v.version)).toEqual([GAME_VERSION, '0.3', '0.2', '0.1']);
    expect(GAME_VERSION).toBe('0.4');
    expect(VERSIONS.map((v) => v.path)).toEqual(['/fondue/', '/fondue/v0.3/', '/fondue/v0.2/', '/fondue/v0.1/']);
    expect(VERSIONS.filter((v) => v.current).map((v) => v.version)).toEqual([GAME_VERSION]);
    expect(VERSIONS.find((v) => v.version === '0.1')?.name).toBe('Classic');
  });

  it('builds full addresses on the one site and says that every version keeps its own save', () => {
    for (const v of VERSIONS) expect(versionUrl(v)).toBe(`${SITE_ORIGIN}${v.path}`);
    expect(new URL(versionUrl(VERSIONS[1])).pathname).toBe('/fondue/v0.3/');
    expect(VERSIONS_NOTE).toMatch(/own save/);
  });
});

describe('decision list v0.4', () => {
  it('has the seven points of Auftrag section 8, each with a provisional choice', () => {
    expect(DECISIONS_V4.map((d) => d.id)).toEqual(['D4-01', 'D4-02', 'D4-03', 'D4-04', 'D4-05', 'D4-06', 'D4-07']);
    const ids = new Set([...DECISIONS_V4, ...DECISIONS_V3].map((d) => d.id));
    expect(ids.size).toBe(DECISIONS_V4.length + DECISIONS_V3.length);
    for (const d of DECISIONS_V4) {
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(d.options.map((o) => o.id)).size).toBe(d.options.length);
      expect(d.choice).not.toBeNull();
      expect(d.options.map((o) => o.id)).toContain(d.choice);
      expect(d.reason.length).toBeGreaterThan(10);
    }
  });

  it('takes the castle tier levels and prices from the configuration, with level 6 and 75 fixed', () => {
    const plan = DECISIONS_V4[0].reason;
    expect(CASTLE_TIER_LEVEL[1]).toBe(6);
    expect(CASTLE_TIER_LEVEL[6]).toBe(75);
    CASTLE_TIERS.slice(1).forEach((c, i) => expect(plan).toContain(`Stufe ${i + 2} ab Level ${CASTLE_TIER_LEVEL[i + 1]} für ${c.gold} Gold`));
  });

  it('states the save import, the guest rule and the options tabs; 4, 6 and 7 point to the report', () => {
    const chosen = (i: number) => DECISIONS_V4[i].options.find((o) => o.id === DECISIONS_V4[i].choice)?.label ?? '';
    expect(chosen(1)).toMatch(/Burg-Stufe kostenlos/);
    expect(chosen(2)).toMatch(/Koop-Tisch/);
    expect(chosen(4)).toBe('Settings, Scores, Help, Credits, Versions');
    for (const i of [3, 5, 6]) expect(DECISIONS_V4[i].reason).toContain('docs/v0.4/BERICHT.md');
  });
});

describe('castle tiers on the developer overview', () => {
  it('names the slot each tier opens and the level from which it can be built', () => {
    for (const s of SLOTS) expect(castleOpens(s.castleTier)).toContain(s.name);
    expect(castleOpens(6)).toBe('');
    expect(castleOpens(7)).toBe('');
    expect(castleTiersAt(6)).toEqual([2]);
    expect(castleTiersAt(75)).toEqual([7]);
    expect(castleTiersAt(1)).toEqual([]);
    CASTLE_TIER_LEVEL.slice(1).forEach((l, i) => expect(castleTiersAt(l)).toContain(i + 2));
  });
});
