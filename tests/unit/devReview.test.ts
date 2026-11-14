/**
 * The decision and rating list of the developer menu: one entry per open decision and per weapon,
 * stored in the profile, carried in the export code and readable as text.
 */
import { describe, expect, it } from 'vitest';
import { DECISIONS, REVIEW_ITEMS, WEAPON_REVIEWS, reviewLabels } from '../../src/config/devReview';
import { WEAPONS } from '../../src/config/weapons';
import { importCode } from '../../src/profile';
import { newProfile } from './helpers';

describe('decision and rating list', () => {
  it('has unique ids, every weapon once, and decisions numbered D3-01 upwards', () => {
    expect(new Set(REVIEW_ITEMS.map((r) => r.id)).size).toBe(REVIEW_ITEMS.length);
    expect(WEAPON_REVIEWS.map((r) => r.weapon)).toEqual(WEAPONS.map((w) => w.id));
    DECISIONS.forEach((d, i) => expect(d.id).toBe(`D3-${String(i + 1).padStart(2, '0')}`));
  });

  it('a rating is kept in the profile and travels in its export code', async () => {
    const p = await newProfile();
    p.setRating('D3-04', { checked: true, verdict: 'good', note: 'keep it' });
    const back = importCode(p.exportCode());
    expect(back.devRatings['D3-04']).toEqual({ checked: true, verdict: 'good', note: 'keep it' });
  });

  it('copies as text with the readable titles', async () => {
    const p = await newProfile();
    p.setRating('W-01', { verdict: 'bad', note: 'too slow' });
    const text = p.ratingsAsText(reviewLabels());
    expect(text).toContain(`W-01 ${WEAPONS[0].name}`);
    expect(text).toContain('bad');
    expect(text).toContain('too slow');
  });
});
