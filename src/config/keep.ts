/**
 * The keep itself, kept for good in the profile: the castle (it is also the gate) in seven tiers,
 * and the two stations that are unlocked with cheese later in the campaign.
 *
 * CASTLE_TIERS columns: name; hp = gate strength; gold and crests = price of the step up to this
 * tier (tier 1 is there from the start); desc = one sentence for the shop.
 * STATIONS columns: name; unlockLevel = becomes buyable once this level is won; cheesePrice = the
 * unlock (gives tier 1); tiers = gold for each further step and what it changes; desc.
 */
export interface CastleTierDef { name: string; hp: number; gold: number; crests: number; desc: string }

export const CASTLE_TIERS: CastleTierDef[] = [
  { name: 'Oak Gate', hp: 800, gold: 0, crests: 0, desc: 'Plain, honest wood.' },
  { name: 'Iron-Bound Gate', hp: 1250, gold: 400, crests: 0, desc: 'Iron bands hold the planks together.' },
  { name: 'Stone Keep', hp: 1900, gold: 1200, crests: 0, desc: 'A stone tower rises behind the gate.' },
  { name: 'Bannered Keep', hp: 2800, gold: 3000, crests: 0, desc: 'Flags on every tower, and thicker walls.' },
  { name: 'Gilded Keep', hp: 4000, gold: 7000, crests: 0, desc: 'Heavy, shiny and stubborn.' },
  { name: 'Runic Fortress', hp: 5600, gold: 15000, crests: 0, desc: 'Old runes glow when the gate is struck.' },
  { name: 'Alpine Citadel', hp: 7800, gold: 30000, crests: 40, desc: 'The pride of the mountains. Nothing has ever dented it.' },
];

export type StationId = 'cauldron' | 'perch';

export interface StationTierDef { gold: number; note: string }

export interface StationDef {
  name: string;
  unlockLevel: number;
  cheesePrice: number;
  /** Index 0 = tier 1 (the unlock, gold 0); further entries are bought with gold. */
  tiers: StationTierDef[];
  desc: string;
}

export const STATIONS: Record<StationId, StationDef> = {
  cauldron: {
    name: 'Great Cauldron', unlockLevel: 16, cheesePrice: 12,
    tiers: [
      { gold: 0, note: 'Melts a raider in 2.4 seconds.' },
      { gold: 2500, note: 'Melts a raider in 1.6 seconds.' },
      { gold: 8000, note: 'Melts a raider in 1 second.' },
    ],
    desc: 'Throw a raider into the pot behind the keep: it pays double gold.',
  },
  perch: {
    name: 'Eagle Perch', unlockLevel: 70, cheesePrice: 28,
    tiers: [{ gold: 0, note: 'A small hook: aim well.' }],
    desc: 'Fling a raider onto the hook in the top right. The great eagle leaves its Raider Crest.',
  },
};

export const STATION_IDS = Object.keys(STATIONS) as StationId[];

/** Melting time of the Great Cauldron per tier, in seconds (index = tier - 1). */
export const CAULDRON_SECONDS = [2.4, 1.6, 1];

/** The eagle's hook: how long the catch hangs, and how much of that is the eagle eating. */
export const PERCH = { hangSeconds: 1.1, eatSeconds: 0.65, /** Feet below the hook, in body heights: it hangs by the collar. */ hangDrop: 1.02 };
