/**
 * The keep itself: its gates (each gate is also a build stage of the whole keep) and the two
 * offering sites.
 *
 * GATES columns: name; gold and offerings = price during a run; hp = gate strength.
 * STATIONS columns: name; gold and offerings = price during a run; desc = one sentence for the market.
 */
export interface GateDef { name: string; gold: number; offerings: number; hp: number; desc: string }

export const GATES: GateDef[] = [
  { name: 'Oak Gate', gold: 0, offerings: 0, hp: 800, desc: 'Plain, honest wood.' },
  { name: 'Iron-Bound Gate', gold: 900, offerings: 0, hp: 1400, desc: 'Double the strength.' },
  { name: 'Gilded Gate', gold: 2200, offerings: 6, hp: 2200, desc: 'Heavy, shiny and stubborn.' },
  { name: 'Runic Gate', gold: 6000, offerings: 14, hp: 3400, desc: 'Glows when struck.' },
  { name: 'Adamant Gate', gold: 24000, offerings: 30, hp: 5200, desc: 'Nothing has ever dented it.' },
];

export type StationId = 'cauldron' | 'perch';

export interface StationDef { name: string; gold: number; offerings: number; desc: string; /** Reserved for later upgrades of the site. */ tier: number }

export const STATIONS: Record<StationId, StationDef> = {
  cauldron: { name: 'Great Cauldron', gold: 250, offerings: 0, tier: 1, desc: 'Throw a raider into the pot behind the keep and it melts into cheese for +1 offering.' },
  perch: { name: 'Eagle Perch', gold: 12000, offerings: 0, tier: 1, desc: 'Fling a raider onto the hook in the top right. The great eagle eats it for +1 offering.' },
};

export const STATION_IDS = Object.keys(STATIONS) as StationId[];

/** The eagle's hook: how long the catch hangs, and how much of that is the eagle eating. */
export const PERCH = { hangSeconds: 1.1, eatSeconds: 0.65, /** Feet below the hook, in body heights: it hangs by the collar. */ hangDrop: 1.02 };
