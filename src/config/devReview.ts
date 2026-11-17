/**
 * The decision and rating list of the developer menu: everything Tim and Lenny still have to decide or rate.
 * The ids match docs/OFFENE-ENTSCHEIDUNGEN.md (D3-01 ..., W-01 ...); ratings are stored in the profile under these ids.
 * The decisions themselves (options, choice, reason) live in src/config/decisions.ts.
 *
 * Columns: id = the number in the document; title = short English name shown in the menu;
 * weapon = for a weapon entry, its id in weapons.ts (picture and description come from there).
 */
import { DECISIONS_V3 } from './decisions';
import { WEAPONS } from './weapons';

export interface ReviewItem {
  id: string;
  title: string;
  weapon?: string;
}

/** The decisions of v0.3, in the order of src/config/decisions.ts and the document. */
export const DECISIONS: ReviewItem[] = DECISIONS_V3.map((d) => ({ id: d.id, title: d.title }));

/** Every weapon of the weapon table, numbered W-01 ... in its order. */
export const WEAPON_REVIEWS: ReviewItem[] = WEAPONS.map((w, i) => ({
  id: `W-${String(i + 1).padStart(2, '0')}`, title: w.name, weapon: w.id,
}));

export const REVIEW_ITEMS: ReviewItem[] = [...DECISIONS, ...WEAPON_REVIEWS];

/** Id to "D-01 Endless offers every weapon", the labels for the text export. */
export const reviewLabels = (): Record<string, string> =>
  Object.fromEntries(REVIEW_ITEMS.map((r) => [r.id, `${r.id} ${r.title}`]));
