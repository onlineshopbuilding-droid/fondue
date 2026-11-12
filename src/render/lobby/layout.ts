/**
 * Where everything stands in the lobby, the hall inside the keep, and what the hall shows at which
 * point of the campaign. Pure data and small pure functions; the scene only draws what is here.
 *
 * The room is ROOM.w x ROOM.h world units. Every screen sees at least the middle SAFE_W x ROOM.h,
 * so all stations stand inside that part; wider screens see more of the side walls.
 */

export const ROOM = { w: 1600, h: 720 } as const;
/** Width of the middle part every screen shows. */
export const SAFE_W = 1280;
export const SAFE_LEFT = (ROOM.w - SAFE_W) / 2;

/** The ids are the actions of the main menu buttons (`data-a`), plus the storybook. */
export type StationId = 'continueLevel' | 'campaign' | 'play' | 'coop' | 'armoury' | 'storybook' | 'options' | 'scores' | 'help' | 'credits';

export interface StationDef {
  id: StationId;
  /** Short English label shown in the room. */
  label: string;
  /** Lobby art name of the object, or '' if the room picture already shows it (the door). */
  art: string;
  /** Centre of the object and of its tap circle, in room units. */
  x: number;
  y: number;
  /** Radius of the tap circle in room units (at least 82, i.e. 44 CSS px on a 393 px tall phone). */
  r: number;
  /** Where the label sits. */
  lx: number;
  ly: number;
  /** A quieter, smaller label (the storybook is meant to be found, not shouted about). */
  quiet?: boolean;
}

export const STATIONS: readonly StationDef[] = [
  { id: 'continueLevel', label: 'Continue', art: '', x: 250, y: 470, r: 96, lx: 250, ly: 640 },
  { id: 'options', label: 'Options', art: 'cogPlaque', x: 250, y: 196, r: 82, lx: 250, ly: 104 },
  { id: 'storybook', label: 'Storybook', art: 'storybook', x: 418, y: 196, r: 82, lx: 418, ly: 292, quiet: true },
  { id: 'help', label: 'Help', art: 'helpScroll', x: 560, y: 236, r: 82, lx: 560, ly: 336 },
  { id: 'campaign', label: 'Campaign', art: 'mapTable', x: 452, y: 528, r: 118, lx: 452, ly: 640 },
  { id: 'play', label: 'Endless', art: 'pot', x: 800, y: 614, r: 100, lx: 800, ly: 694 },
  { id: 'credits', label: 'Credits', art: 'painting', x: 1010, y: 214, r: 84, lx: 1010, ly: 306 },
  { id: 'scores', label: 'Scores', art: 'slate', x: 1186, y: 222, r: 82, lx: 1186, ly: 312 },
  { id: 'coop', label: 'Co-op', art: 'feastTable', x: 1136, y: 540, r: 118, lx: 1136, ly: 640 },
  { id: 'armoury', label: 'Armoury', art: 'armourStand', x: 1350, y: 466, r: 104, lx: 1350, ly: 640 },
];

/** The King sits here (feet of the throne at the bottom); a tap on him brings a remark. */
export const KING_SPOT = { x: 800, y: 412, r: 90 };
/** Where the name banner hangs above the throne. */
export const NAME_BANNER = { x: 800, y: 106 };

/**
 * The hall gets more splendid with the campaign (highest level beaten), independent of how far the
 * keep is built inside a level. One line per piece; `hides` swaps a plainer piece for a finer one.
 */
export interface DecorDef { id: string; art: string; x: number; y: number; minLevel: number; flipX?: boolean; depth?: number; hides?: string }

export const DECOR: readonly DecorDef[] = [
  { id: 'throne', art: 'throne', x: 800, y: 430, minLevel: 0, depth: 3 },
  { id: 'rug', art: 'rug', x: 800, y: 668, minLevel: 3, depth: 1 },
  { id: 'bannerL', art: 'banner', x: 640, y: 214, minLevel: 8, depth: 2 },
  { id: 'bannerR', art: 'banner', x: 960, y: 214, minLevel: 8, depth: 2, flipX: true },
  { id: 'shieldL', art: 'trophyShield', x: 640, y: 452, minLevel: 15, depth: 2 },
  { id: 'chandelierL', art: 'chandelier', x: 470, y: 0, minLevel: 25, depth: 6 },
  { id: 'chandelierR', art: 'chandelier', x: 1130, y: 0, minLevel: 25, depth: 6 },
  { id: 'shieldR', art: 'trophyShield', x: 960, y: 452, minLevel: 35, depth: 2, flipX: true },
  { id: 'cheeseL', art: 'cheeseStack', x: 636, y: 570, minLevel: 45, depth: 4 },
  { id: 'cheeseR', art: 'cheeseStack', x: 964, y: 570, minLevel: 55, depth: 4, flipX: true },
  { id: 'throneGold', art: 'throneGold', x: 800, y: 430, minLevel: 70, depth: 3, hides: 'throne' },
  { id: 'forks', art: 'goldenForks', x: 800, y: 200, minLevel: 85, depth: 2 },
  { id: 'garland', art: 'garland', x: 800, y: 0, minLevel: 100, depth: 6 },
];

/** The pieces of decor the hall shows after `levelDone` beaten levels. */
export function decorFor(levelDone: number): DecorDef[] {
  const shown = DECOR.filter((d) => levelDone >= d.minLevel);
  const hidden = new Set(shown.map((d) => d.hides).filter(Boolean));
  return shown.filter((d) => !hidden.has(d.id));
}

/** Pegs along the walls where every unlocked weapon hangs, in the order of the weapon table. */
export const WEAPON_PEGS: readonly { x: number; y: number }[] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: 360 + i * 34, y: 402 })),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: 1002 + i * 34, y: 402 })),
];
/** Largest side of a weapon picture on its peg, in room units. */
export const WEAPON_SIZE = 34;
/** Torches on the two pillars beside the throne: where their flames burn. */
export const TORCHES: readonly { x: number; y: number }[] = [{ x: 640, y: 356 }, { x: 960, y: 356 }];

/** Lines whose level range contains `levelDone`. */
export function linesFor<T extends { minLevel: number; maxLevel: number }>(lines: readonly T[], levelDone: number): T[] {
  return lines.filter((l) => levelDone >= l.minLevel && levelDone <= l.maxLevel);
}

/** A random remark, never the same as the last one if there is a choice. */
export function pickLine(lines: readonly string[], last: string, rnd: () => number = Math.random): string {
  if (lines.length === 0) return '';
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/** Storybook pages open once their level is beaten. */
export function pagesFor<T extends { unlockLevel: number }>(book: readonly T[], levelDone: number): T[] {
  return book.filter((p) => levelDone >= p.unlockLevel);
}

/** The part of the room a canvas of `gw` x `gh` pixels shows: the safe part always fits, centred. */
export function fitRoom(gw: number, gh: number): { zoom: number; x: number; y: number; w: number; h: number } {
  const zoom = Math.min(gw / SAFE_W, gh / ROOM.h);
  const w = gw / zoom;
  const h = gh / zoom;
  return { zoom, x: ROOM.w / 2 - w / 2, y: ROOM.h / 2 - h / 2, w, h };
}
