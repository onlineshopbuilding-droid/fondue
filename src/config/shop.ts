export type ShopTab = 'gates' | 'offerings' | 'wheels' | 'stompers' | 'comets' | 'horns' | 'bolters';

export type WeaponSlot = 'wheel' | 'stomper' | 'comet' | 'horn' | 'bolter';
export const WEAPON_SLOTS: WeaponSlot[] = ['wheel', 'stomper', 'comet', 'horn', 'bolter'];

export interface ShopItem {
  id: string;
  name: string;
  tab: ShopTab;
  gold: number;
  offerings: number;
  /** Item that must be owned first. */
  requires?: string;
  desc: string;
}

export const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: 'gates', label: 'Gates' },
  { id: 'offerings', label: 'Offerings' },
  { id: 'wheels', label: 'Wheels' },
  { id: 'stompers', label: 'Stompers' },
  { id: 'comets', label: 'Comets' },
  { id: 'horns', label: 'Gate Arms' },
  { id: 'bolters', label: 'Roof Bolters' },
];

/** Every upgrade. 22 entries: 5 gates, 2 shrines, 9 tower weapons, 3 gate arms, 3 roof bolters. */
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'gate0', name: 'Oak Gate', tab: 'gates', gold: 0, offerings: 0, desc: 'Plain, honest wood.' },
  { id: 'gate1', name: 'Iron-Bound Gate', tab: 'gates', gold: 900, offerings: 0, requires: 'gate0', desc: 'Double the strength.' },
  { id: 'gate2', name: 'Gilded Gate', tab: 'gates', gold: 2200, offerings: 6, requires: 'gate1', desc: 'Heavy, shiny and stubborn.' },
  { id: 'gate3', name: 'Runic Gate', tab: 'gates', gold: 9000, offerings: 18, requires: 'gate2', desc: 'Glows when struck.' },
  { id: 'gate4', name: 'Adamant Gate', tab: 'gates', gold: 32000, offerings: 35, requires: 'gate3', desc: 'Nothing has ever dented it.' },

  { id: 'cauldron', name: 'Great Cauldron', tab: 'offerings', gold: 250, offerings: 0, desc: 'Throw a raider in and it melts into cheese for +1 offering. The pot is busy while it does.' },
  { id: 'perch', name: 'Eagle Perch', tab: 'offerings', gold: 1000, offerings: 0, desc: 'Fling a raider onto the hook in the top right. The great eagle eats it for +1 offering.' },

  { id: 'wheel1', name: 'Rolling Wheel', tab: 'wheels', gold: 700, offerings: 4, desc: 'Tap it at the wall foot and a stone wheel rolls down the road.' },
  { id: 'wheel2', name: 'Heavy Wheel', tab: 'wheels', gold: 1200, offerings: 11, requires: 'wheel1', desc: 'Wider, and it does not stop for much.' },
  { id: 'wheel3', name: 'Colossal Wheel', tab: 'wheels', gold: 3200, offerings: 32, requires: 'wheel2', desc: 'Flattens the whole road.' },

  { id: 'stomper1', name: 'Stomper', tab: 'stompers', gold: 900, offerings: 8, desc: 'Tap the winch on the wall, then tap where the slab should land.' },
  { id: 'stomper2', name: 'Great Stomper', tab: 'stompers', gold: 2200, offerings: 12, requires: 'stomper1', desc: 'A wider slab, reloaded faster.' },
  { id: 'stomper3', name: 'Titan Stomper', tab: 'stompers', gold: 5200, offerings: 32, requires: 'stomper2', desc: 'The ground remembers this one.' },

  { id: 'comet1', name: 'Comet', tab: 'comets', gold: 600, offerings: 8, desc: 'Tap the shrine on the keep, then tap where the comet should fall.' },
  { id: 'comet2', name: 'Blazing Comet', tab: 'comets', gold: 1100, offerings: 12, requires: 'comet1', desc: 'Leaves more fire behind.' },
  { id: 'comet3', name: 'Falling Star', tab: 'comets', gold: 3000, offerings: 34, requires: 'comet2', desc: 'A piece of the sky.' },

  { id: 'mortar', name: 'Gate Mortar', tab: 'horns', gold: 1400, offerings: 0, desc: 'Pull away from the mortar over the gate and let go. A high arc that lands with a boom.' },
  { id: 'frost', name: 'Frost Horn', tab: 'horns', gold: 2800, offerings: 8, desc: 'Pull away from the horn and let go. Freezes a patch of raiders; tap one to shatter it.' },
  { id: 'bellows', name: 'Dragon Bellows', tab: 'horns', gold: 3800, offerings: 30, desc: 'Pull away from the bellows and let go. Sets a long stretch of road on fire.' },

  { id: 'bolter1', name: 'Roof Bolter I', tab: 'bolters', gold: 2300, offerings: 0, desc: 'Pull away from the tower crossbow and let go. A flat, fast volley where you point.' },
  { id: 'bolter2', name: 'Roof Bolter II', tab: 'bolters', gold: 4800, offerings: 18, requires: 'bolter1', desc: 'Twice the bolts in the same volley.' },
  { id: 'bolter3', name: 'Roof Bolter III', tab: 'bolters', gold: 8800, offerings: 45, requires: 'bolter2', desc: 'Bolts pass through their targets.' },
];

export const STARTING_ITEMS = ['gate0'];

/** Gate strength per tier. */
export const GATE_HP: Record<string, number> = {
  gate0: 800,
  gate1: 1400,
  gate2: 2200,
  gate3: 3400,
  gate4: 5200,
};

export const WEAPONS = {
  wheel: {
    wheel1: { speed: 520, radius: 34, damage: 160, cooldown: 17, maxHits: 8 },
    wheel2: { speed: 560, radius: 52, damage: 320, cooldown: 15, maxHits: 16 },
    wheel3: { speed: 620, radius: 74, damage: 700, cooldown: 13, maxHits: 999 },
  },
  stomper: {
    stomper1: { halfWidth: 95, damage: 260, cooldown: 10 },
    stomper2: { halfWidth: 125, damage: 480, cooldown: 9 },
    stomper3: { halfWidth: 170, damage: 900, cooldown: 8 },
  },
  comet: {
    comet1: { radius: 80, damage: 120, flameSeconds: 2.5, cooldown: 13 },
    comet2: { radius: 105, damage: 220, flameSeconds: 3.5, cooldown: 11 },
    comet3: { radius: 140, damage: 420, flameSeconds: 5, cooldown: 9 },
    /** Added to size and damage of every comet. */
    bonus: 0.45,
    /** Seconds from the tap to the impact. */
    fallSeconds: 0.55,
  },
  horn: {
    mortar: { kind: 'blast', radius: 95, damage: 150, cooldown: 6, flightSeconds: 0.6 },
    frost: { kind: 'freeze', radius: 130, cooldown: 9 },
    bellows: { kind: 'flame', halfWidth: 150, flameSeconds: 2.2, cooldown: 11 },
  },
  bolter: {
    bolter1: { bolts: 4, damage: 100, pierce: false, cooldown: 9 },
    bolter2: { bolts: 8, damage: 130, pierce: false, cooldown: 8 },
    bolter3: { bolts: 12, damage: 180, pierce: true, cooldown: 7 },
  },
  /** Ground flames deal this much damage per second. */
  flameDps: 90,
} as const;

export type HornId = keyof typeof WEAPONS.horn;

/** The sling gesture of the weapons you aim on the keep. Distances are world units, angles degrees. */
export const AIM = {
  /** Shorter pulls do nothing, so moving back to the weapon cancels. */
  deadzone: 42,
  /** Pulling further than this adds nothing. */
  maxPull: 430,
  /** How far an arc lands at the shortest pull, measured from the weapon. */
  minReach: 90,
  /** The flat, fast one. Positive angles point down. */
  bolter: { minDownDeg: -28, maxDownDeg: 78, minSpeed: 950, maxSpeed: 2000, minRange: 420, minPower: 0.75, maxPower: 1.2, spreadDeg: 2.4 },
  /** The high one: elevation in degrees above the horizon. Pull length alone sets the landing spot; a steeper pull only flies higher and longer. */
  mortar: { minDeg: 58, maxDeg: 84 },
  /** Low, quick lobs. */
  frost: { minDeg: 30, maxDeg: 62 },
  bellows: { minDeg: 34, maxDeg: 66 },
} as const;

/** The eagle's hook: how long the catch hangs, and how much of that is the eagle eating. */
export const PERCH = { hangSeconds: 1.1, eatSeconds: 0.65, /** Feet below the hook, in body heights: it hangs by the collar. */ hangDrop: 1.02 };

export const ECONOMY = {
  offeringGold: 10,
  /** Gate fraction restored at the start of each day. */
  gateRefill: 1,
};
