/**
 * The v0.3 decision list (F3): every entry is well formed, every v0.2 decision D-01..D-21 has a
 * verdict, the lead's new decisions are all there, and the issue addresses built from the answers
 * are valid, carry the [Entscheidungen] prefix and stay short enough.
 */
import { describe, expect, it } from 'vitest';
import { DECISIONS_V3, LEGACY_DECISIONS, ROADMAP } from '../../src/config/decisions';
import { buildIssueUrls, type IssueAnswer } from '../../scripts/dev-page/issues';

const BASE = 'https://github.com/onlineshopbuilding-droid/fondue/issues/new';

describe('decision list v0.3', () => {
  it('has unique ids, options, and a choice that is one of its options or open', () => {
    expect(new Set(DECISIONS_V3.map((d) => d.id)).size).toBe(DECISIONS_V3.length);
    for (const d of DECISIONS_V3) {
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(d.options.map((o) => o.id)).size).toBe(d.options.length);
      if (d.choice !== null) expect(d.options.map((o) => o.id)).toContain(d.choice);
      expect(d.reason.length).toBeGreaterThan(10);
    }
  });

  it('says what became of each of D-01 .. D-21, and every carried one exists', () => {
    expect(LEGACY_DECISIONS.map((l) => l.id)).toEqual(Array.from({ length: 21 }, (_, i) => `D-${String(i + 1).padStart(2, '0')}`));
    const ids = new Set(DECISIONS_V3.map((d) => d.id));
    for (const l of LEGACY_DECISIONS) {
      expect(l.why.length).toBeGreaterThan(5);
      if (l.verdict === 'kept') expect(l.to).toBeDefined();
      if (l.to) expect(ids.has(l.to)).toBe(true);
    }
  });

  it('contains the new decisions of this round', () => {
    const titles = DECISIONS_V3.map((d) => d.title).join('\n');
    for (const t of ['crest currency', 'Shop replaces the Armoury', 'unlock levels and cheese prices', 'Cauldron and Eagle Perch',
      'roll over the campaign', 'Co-op gold', 'Co-op factor', 'Resuming', 'Replayed levels give gold', 'Boss levels unlock',
      'second hand', 'fit no slot', 'Gold kept on defeat']) expect(titles).toContain(t);
    expect(DECISIONS_V3.find((d) => d.title.includes('second hand'))?.choice).toBeNull();
  });

  it('has a roadmap to v1.0', () => {
    expect(ROADMAP.map((r) => r.version)).toContain('v1.0');
    expect(ROADMAP.every((r) => r.items.length > 0)).toBe(true);
  });
});

describe('issue addresses from the answers', () => {
  const answer = (id: string, note = ''): IssueAnswer => ({ id, title: `Title ${id}`, choice: 'So lassen', note });

  it('one short answer gives one valid address with the prefix', () => {
    const urls = buildIssueUrls([answer('D3-01', 'passt so')], { base: BASE, version: 'v0.3', maxLength: 7000 });
    expect(urls).toHaveLength(1);
    const u = new URL(urls[0]);
    expect(`${u.origin}${u.pathname}`).toBe(BASE);
    expect(u.searchParams.get('title')).toMatch(/^\[Entscheidungen\] /);
    expect(u.searchParams.get('body')).toContain('### D3-01 Title D3-01');
    expect(u.searchParams.get('body')).toContain('passt so');
  });

  it('long answers are split over several issues, each address under the limit, nothing lost', () => {
    const long = 'ä Käse & Gold? '.repeat(120);
    const answers = DECISIONS_V3.map((d) => answer(d.id, long));
    const urls = buildIssueUrls(answers, { base: BASE, version: 'v0.3', maxLength: 7000 });
    expect(urls.length).toBeGreaterThan(1);
    const bodies = urls.map((x) => {
      expect(x.length).toBeLessThanOrEqual(7000);
      const u = new URL(x);
      expect(u.searchParams.get('title')).toMatch(new RegExp(`^\\[Entscheidungen\\] .*\\(\\d+/${urls.length}\\)$`));
      return u.searchParams.get('body') ?? '';
    }).join('\n');
    for (const d of DECISIONS_V3) expect(bodies).toContain(`### ${d.id} `);
  });

  it('a single answer longer than one address is shortened, not dropped', () => {
    const urls = buildIssueUrls([answer('D3-02', 'x'.repeat(20000))], { base: BASE, version: 'v0.3', maxLength: 7000 });
    expect(urls).toHaveLength(1);
    expect(urls[0].length).toBeLessThanOrEqual(7000);
    expect(new URL(urls[0]).searchParams.get('body')).toContain('[…]');
  });
});
