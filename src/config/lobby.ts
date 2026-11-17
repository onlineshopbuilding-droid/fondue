/**
 * The lobby, the hall inside the keep: timing of the camera move, where every station stands, and
 * how the hall looks at each castle tier (HALL_LOOK). Read by src/render/lobby/*.
 *
 * The room is 1600 x 720 world units, side view: ceiling band y 0..70, back wall y 62..442, floor
 * y 440..720 (the back of the floor at the top). Every screen sees at least the middle 1280 units
 * (x 160..1440), so all stations stand inside that part; wider screens see more of the side walls.
 */
export const LOBBY_MOVE = {
  /** Seconds of the whole move, in or out. */
  seconds: 0.9,
  /** At the end of the dive the view is this fraction of its normal width (the gate fills the screen). */
  diveEnd: 0.09,
  /** The dive into the gate takes this first share of the move. */
  diveShare: 0.8,
  /** The hall fades in from this point of the move, over this share of it. */
  fadeFrom: 0.45,
  fadeShare: 0.4,
};

export const LOBBY_HALL = {
  /** How much closer the hall starts when it fades in (and ends when it fades out). */
  arriveZoom: 0.22,
  /** Seconds a remark of the King stays up. */
  lineSeconds: 5.5,
  /** Milliseconds of the little animations: the speech bubble popping up, the King's nod, a tapped station's bounce. */
  bubblePopMs: 180,
  kingNodMs: 90,
  stationBounceMs: 80,
};

export const ROOM = { w: 1600, h: 720 } as const;
/** Width of the middle part every screen shows. */
export const SAFE_W = 1280;
/** Where the back wall starts and ends, and where the floor starts (room units). */
export const HALL_LINES = { ceilingH: 72, wallTop: 62, wallH: 380, floorTop: 440, floorH: 280, tileW: 400 } as const;

/** The ids are the actions of the main menu (`data-a`). */
export type StationId = 'continueLevel' | 'campaign' | 'armoury' | 'coop' | 'play' | 'options';

export interface StationDef {
  id: StationId;
  /** Short English label shown in the room. */
  label: string;
  /**
   * Lobby art name of the object; with `tiered` the castle tier is appended (`mapTable3`); '' if the
   * hall already shows it (the door).
   */
  art: string;
  tiered?: boolean;
  /** Art while the station is still closed (the broken tables). */
  brokenArt?: string;
  /** Size of the picture (1 = as drawn). */
  scale?: number;
  /** Drawing order among the furniture: higher is further in front. */
  depth?: number;
  /** Centre of the object and of its tap circle, in room units. */
  x: number;
  y: number;
  /** Radius of the tap circle in room units (at least 82, i.e. 44 CSS px on a 393 px tall phone). */
  r: number;
  /** Where the label sits. */
  lx: number;
  ly: number;
  /** Label size in room units. A tap on the label counts as a tap on the station. */
  size?: number;
  /** Stands in the top right corner of what the screen shows (x and y are then the distance from it). */
  corner?: boolean;
}

/**
 * Left: the endless table at the back and the co-op table in front of it, each with its sign right
 * at the table. Then the door back out to the gate (Continue) in the back wall, the campaign table
 * in the middle (the biggest), the shop right beside it, then the King with his guards at the cauldron. The cog for the options sits in the top right
 * corner of whatever the screen shows.
 */
export const STATIONS: readonly StationDef[] = [
  { id: 'continueLevel', label: 'Continue', art: '', x: 540, y: 318, r: 100, lx: 540, ly: 150, size: 32 },
  { id: 'play', label: 'Endless', art: 'endlessTable', tiered: true, brokenArt: 'endlessTableBroken', scale: 0.8, depth: 4, x: 312, y: 466, r: 85, lx: 312, ly: 376 },
  { id: 'coop', label: 'Co-op', art: 'coopTable', tiered: true, brokenArt: 'coopTableBroken', scale: 0.8, depth: 6, x: 312, y: 632, r: 85, lx: 312, ly: 672 },
  { id: 'campaign', label: 'Campaign', art: 'mapTable', tiered: true, scale: 1.05, depth: 5, x: 680, y: 580, r: 150, lx: 680, ly: 668, size: 38 },
  { id: 'armoury', label: 'Shop', art: 'armourStand', scale: 1.15, depth: 6, x: 985, y: 556, r: 120, lx: 985, ly: 668, size: 34 },
  { id: 'options', label: 'Options', art: 'cogPlaque', scale: 0.62, depth: 8, x: 66, y: 66, r: 82, lx: 66, ly: 128, size: 20, corner: true },
];

/** The King sits here, behind the cauldron; a tap on him brings a remark. */
export const KING_SPOT = { x: 1252, y: 420, r: 96 };
/** The throne behind the King, the cauldron in front of him, and his two guards. */
export const KING_GROUP = {
  throne: { x: 1252, y: 452, scale: 0.8 },
  /** Feet of the King (seated on the throne). */
  king: { x: 1252, y: 552 },
  cauldron: { x: 1252, y: 704, scale: 0.92 },
  guards: [{ x: 1122, y: 704, scale: 0.76, flipX: false }, { x: 1398, y: 704, scale: 0.76, flipX: true }],
};
/** The banner above the King with the castle's name and tier. */
export const NAME_BANNER = { x: 1196, y: 112, scale: 0.86 };
/** The door out to the gate (bottom centre on the floor line) and the two windows of the back wall. */
export const HALL_PIECES = { door: { x: 540, y: 442 }, windows: [{ x: 770, y: 236 }, { x: 970, y: 236 }] };

/** Pegs in one row high on the back wall where every unlocked weapon hangs, in the order of the weapon table. */
export const WEAPON_PEGS: readonly { x: number; y: number }[] = Array.from({ length: 25 }, (_, i) => ({ x: 372 + i * 27, y: 104 }));
/** Largest side of a weapon picture on its peg, in room units. */
export const WEAPON_SIZE = 26;

/** Free places for decor, so the pieces never stand on a station. */
const SPOT = {
  farL: { x: 84, y: 610 },
  farR: { x: 1522, y: 610 },
  wallA: { x: 330, y: 236 },
  wallB: { x: 870, y: 292 },
  wallC: { x: 1520, y: 250 },
  wallD: { x: 84, y: 250 },
  footA: { x: 440, y: 452 },
  footB: { x: 1040, y: 452 },
} as const;

export interface DecorDef { art: string; x: number; y: number; scale?: number; flipX?: boolean; depth?: number }
type Spot = keyof typeof SPOT;
const at = (art: string, spot: Spot, more: Omit<DecorDef, 'art' | 'x' | 'y'> = {}): DecorDef => ({ art, ...SPOT[spot], ...more });
/** Things hanging from the ceiling (chandeliers, garland): their top sits at the ceiling. */
const hang = (art: string, x: number, more: Omit<DecorDef, 'art' | 'x' | 'y'> = {}): DecorDef => ({ art, x, y: 58, depth: 9, ...more });

export interface HallLook {
  /** Shown in the banner with the tier number. */
  name: string;
  /** Throne of the King: plain or golden. */
  throne: 'throne' | 'throneGold';
  /** A string of pennants under the ceiling. */
  pennants: boolean;
  decor: readonly DecorDef[];
}

/**
 * The hall at each castle tier (index 0 = tier 1). Walls, floor, ceiling, windows, door, cauldron and
 * tables come as tier pictures (`wall3`, `mapTable3`, …, src/art/lobby); this adds what stands around.
 */
export const HALL_LOOK: readonly HallLook[] = [
  { name: 'Oak Gate', throne: 'throne', pennants: false, decor: [
    at('hayBale', 'farL', { depth: 3 }), at('barrel', 'farR', { depth: 3 }), at('straw', 'footA', { depth: 2 }), at('straw', 'footB', { depth: 2, flipX: true }),
  ] },
  { name: 'Iron-Bound Gate', throne: 'throne', pennants: false, decor: [
    at('barrel', 'farL', { depth: 3 }), at('barrel', 'farR', { depth: 3, flipX: true }), at('hayBale', 'footB', { depth: 2, scale: 0.8 }), at('trophyShield', 'wallB', { scale: 0.8 }),
  ] },
  { name: 'Stone Keep', throne: 'throne', pennants: false, decor: [
    at('trophyShield', 'wallA'), at('trophyShield', 'wallB', { flipX: true }), at('barrel', 'farL', { depth: 3 }), at('banner', 'wallC'), at('banner', 'wallD', { flipX: true }),
  ] },
  { name: 'Bannered Keep', throne: 'throne', pennants: true, decor: [
    at('banner', 'wallA'), at('banner', 'wallB', { flipX: true }), at('banner', 'wallC'), at('banner', 'wallD'), at('trophyShield', 'footB', { scale: 0.7, depth: 2 })
  ] },
  { name: 'Gilded Keep', throne: 'throneGold', pennants: true, decor: [
    hang('chandelier', 320), hang('chandelier', 870), at('banner', 'wallA'), at('trophyShield', 'wallB'), at('candelabra', 'farL', { depth: 3 }), at('candelabra', 'farR', { depth: 3 }),
    at('goldPile', 'footA', { depth: 2, scale: 0.8 }), at('cheeseStack', 'footB', { depth: 2, scale: 0.8 }),
  ] },
  { name: 'Runic Fortress', throne: 'throneGold', pennants: false, decor: [
    hang('chandelier', 320), hang('chandelier', 870), at('stainedBanner', 'wallA', { scale: 0.9 }), at('stainedBanner', 'wallB', { scale: 0.9 }),
    at('runeStone', 'farL', { depth: 3 }), at('runeStone', 'farR', { depth: 3, flipX: true }), at('goldPile', 'footA', { depth: 2 }), at('cheeseStack', 'footB', { depth: 2 }),
    at('stainedBanner', 'wallC', { scale: 0.9 }), at('stainedBanner', 'wallD', { scale: 0.9 }),
  ] },
  { name: 'Alpine Citadel', throne: 'throneGold', pennants: true, decor: [
    hang('chandelier', 320), hang('chandelier', 870), at('stainedBanner', 'wallA', { scale: 0.9 }), at('goldenForks', 'wallB', { scale: 0.8 }),
    at('cheeseChest', 'farL', { depth: 3, scale: 0.8 }), at('cheeseChest', 'farR', { depth: 3, scale: 0.8, flipX: true }), at('goldPile', 'footA', { depth: 2 }), at('cheeseStack', 'footB', { depth: 2 }),
    at('stainedBanner', 'wallC', { scale: 0.9 }), at('stainedBanner', 'wallD', { scale: 0.9 }),
  ] },
];

/** What the King says when a still broken table is tapped (`n` = the level that mends it). */
export const TABLE_LOCKED_LINES = {
  coop: (n: number) => `Win level ${n} and the carpenters will fix this table for a feast with a friend.`,
  endless: (n: number) => `Win level ${n} and the carpenters will fix this table for endless waves and gold.`,
};
