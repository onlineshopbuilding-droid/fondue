/**
 * The decision and rating list of the developer menu: everything Tim and Lenny still have to decide or rate.
 * The ids match docs/OFFENE-ENTSCHEIDUNGEN.md (D-01 ..., W-01 ...); ratings are stored in the profile under these ids.
 *
 * Columns: id = the number in the document; title = short English name shown in the menu;
 * weapon = for a weapon entry, its id in weapons.ts (picture and description come from there).
 */
import { WEAPONS } from './weapons';

export interface ReviewItem {
  id: string;
  title: string;
  weapon?: string;
}

/** Open decisions, in the order of the document. */
export const DECISIONS: ReviewItem[] = [
  { id: 'D-01', title: 'Endless offers every weapon' },
  { id: 'D-02', title: 'Look of the hall inside the keep' },
  { id: 'D-03', title: 'Co-op invite link and the tutorial' },
  { id: 'D-04', title: 'Stars for replaying a level' },
  { id: 'D-05', title: 'Stars for a co-op guest' },
  { id: 'D-06', title: 'Continuing an interrupted level' },
  { id: 'D-07', title: 'Yeti and hand tiers' },
  { id: 'D-08', title: 'How Stomper and Comet aim' },
  { id: 'D-09', title: 'Stars, tiers and hand across worlds' },
  { id: 'D-10', title: 'Endless only after some levels' },
  { id: 'D-11', title: 'Stars for the first unlock of a weapon' },
  { id: 'D-12', title: 'Length of the early levels' },
  { id: 'D-13', title: 'Start gold in level 1' },
  { id: 'D-14', title: 'Boss levels' },
  { id: 'D-15', title: 'The name "stars"' },
  { id: 'D-16', title: 'Co-op factor of the campaign' },
  { id: 'D-17', title: 'The new Stomper' },
  { id: 'D-18', title: 'Eagle hook late and costly' },
  { id: 'D-19', title: 'Win window covers the victory banner' },
  { id: 'D-20', title: '"New enemy" window on phones' },
  { id: 'D-21', title: 'Unlock for a boss win' },
];

/** Every weapon of the weapon table, numbered W-01 ... in its order. */
export const WEAPON_REVIEWS: ReviewItem[] = WEAPONS.map((w, i) => ({
  id: `W-${String(i + 1).padStart(2, '0')}`, title: w.name, weapon: w.id,
}));

export const REVIEW_ITEMS: ReviewItem[] = [...DECISIONS, ...WEAPON_REVIEWS];

/** Id to "D-01 Endless offers every weapon", the labels for the text export. */
export const reviewLabels = (): Record<string, string> =>
  Object.fromEntries(REVIEW_ITEMS.map((r) => [r.id, `${r.id} ${r.title}`]));
