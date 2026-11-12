// Which main menu the page uses: the lobby inside the keep (normal), or the plain HTML menu with
// `?menu=html` (a fallback for tests and a safety net if the lobby ever fails).

export function htmlMenuWanted(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).get('menu') === 'html';
}

/** Screens that are shown over the lobby: the main menu itself and everything it opens. */
export const OVER_LOBBY: ReadonlySet<string> = new Set(['main', 'play', 'coop', 'campaign', 'armoury', 'options', 'scores', 'help', 'credits', 'host', 'join']);
