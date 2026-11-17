/**
 * Every playable version of the game, newest first, for the Versions tab of the Options and the
 * developer overview. All versions live on the same site (same origin, so they share browser
 * storage); each keeps its own save under its own storage prefix, and a newer version only reads
 * the previous one's save once to take it over, never changing it.
 *
 * Columns: version = "0.4" (shown as "v0.4"); name = short English name for the game text;
 * path = address on the site; current = this build. /fondue/classic/ stays as an old link to v0.1.
 * When v0.5 ships: v0.4 moves to /fondue/v0.4/, the new one takes /fondue/ (docs/HANDBUCH.md).
 */
import { GAME_VERSION } from './game';

export interface VersionEntry {
  version: string;
  name: string;
  path: string;
  current: boolean;
}

/** The site all versions are published on. */
export const SITE_ORIGIN = 'https://onlineshopbuilding-droid.github.io';

export const VERSIONS: readonly VersionEntry[] = Object.freeze([
  { version: GAME_VERSION, name: 'Castle tiers', path: '/fondue/', current: true },
  { version: '0.3', name: 'The lasting castle', path: '/fondue/v0.3/', current: false },
  { version: '0.2', name: 'The big update', path: '/fondue/v0.2/', current: false },
  { version: '0.1', name: 'Classic', path: '/fondue/v0.1/', current: false },
]);

/** The one sentence shown with the list. */
export const VERSIONS_NOTE = 'Every version keeps its own save, so playing an older one never changes your progress here.';

/** Full address of a version, for pages outside the site (the developer overview). */
export const versionUrl = (v: VersionEntry): string => `${SITE_ORIGIN}${v.path}`;
