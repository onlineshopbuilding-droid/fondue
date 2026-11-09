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

  { id: 'cauldron', name: 'Great Cauldron', tab: 'offerings', gold: 250, offerings: 0, desc: 'Drop enemies into the bubbling pot for +1 offering each.' },
  { id: 'perch', name: 'Eagle Perch', tab: 'offerings', gold: 1000, offerings: 0, desc: 'Hang an enemy on the hook. The great eagle takes it for +1 offering.' },

  { id: 'wheel1', name: 'Rolling Wheel', tab: 'wheels', gold: 450, offerings: 4, desc: 'Sends a stone wheel down the road.' },
  { id: 'wheel2', name: 'Heavy Wheel', tab: 'wheels', gold: 1200, offerings: 16, requires: 'wheel1', desc: 'Wider, and it does not stop for much.' },
  { id: 'wheel3', name: 'Colossal Wheel', tab: 'wheels', gold: 3200, offerings: 32, requires: 'wheel2', desc: 'Flattens the whole road.' },

  { id: 'stomper1', name: 'Stomper', tab: 'stompers', gold: 900, offerings: 8, desc: 'Click its icon, hover where it should land, then press to slam.' },
  { id: 'stomper2', name: 'Great Stomper', tab: 'stompers', gold: 2200, offerings: 18, requires: 'stomper1', desc: 'A wider slab, reloaded faster.' },
  { id: 'stomper3', name: 'Titan Stomper', tab: 'stompers', gold: 5200, offerings: 32, requires: 'stomper2', desc: 'The ground remembers this one.' },

  { id: 'comet1', name: 'Comet', tab: 'comets', gold: 600, offerings: 8, desc: 'Grab the comet, swing it, let go. More swing, bigger blast.' },
  { id: 'comet2', name: 'Blazing Comet', tab: 'comets', gold: 1100, offerings: 18, requires: 'comet1', desc: 'Leaves more fire behind.' },
  { id: 'comet3', name: 'Falling Star', tab: 'comets', gold: 3000, offerings: 34, requires: 'comet2', desc: 'A piece of the sky.' },

  { id: 'mortar', name: 'Gate Mortar', tab: 'horns', gold: 1400, offerings: 0, desc: 'Press and move to aim, let go to fire.' },
  { id: 'frost', name: 'Frost Horn', tab: 'horns', gold: 2800, offerings: 8, desc: 'Freezes a patch of enemies. Click a frozen enemy to shatter it.' },
  { id: 'bellows', name: 'Dragon Bellows', tab: 'horns', gold: 3800, offerings: 30, desc: 'Sets a long stretch of road on fire.' },

  { id: 'bolter1', name: 'Roof Bolter I', tab: 'bolters', gold: 2300, offerings: 0, desc: 'A volley from the keep roof at the nearest enemies.' },
  { id: 'bolter2', name: 'Roof Bolter II', tab: 'bolters', gold: 4800, offerings: 18, requires: 'bolter1', desc: 'Twice the bolts.' },
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
    wheel1: { speed: 520, radius: 34, damage: 160, cooldown: 17 },
    wheel2: { speed: 560, radius: 52, damage: 320, cooldown: 15 },
    wheel3: { speed: 620, radius: 74, damage: 700, cooldown: 13 },
  },
  stomper: {
    stomper1: { halfWidth: 60, damage: 260, cooldown: 12 },
    stomper2: { halfWidth: 90, damage: 480, cooldown: 10 },
    stomper3: { halfWidth: 130, damage: 900, cooldown: 8 },
  },
  comet: {
    comet1: { radius: 80, damage: 120, flameSeconds: 2.5, cooldown: 13 },
    comet2: { radius: 105, damage: 220, flameSeconds: 3.5, cooldown: 11 },
    comet3: { radius: 140, damage: 420, flameSeconds: 5, cooldown: 9 },
    /** Swing path length in px that gives the full size bonus. */
    fullChargePath: 900,
    maxChargeBonus: 0.9,
    idleCancelSeconds: 20,
  },
  horn: {
    mortar: { kind: 'blast', radius: 95, damage: 150, cooldown: 5 },
    frost: { kind: 'freeze', radius: 130, cooldown: 9 },
    bellows: { kind: 'flame', halfWidth: 150, flameSeconds: 2.2, cooldown: 11 },
  },
  bolter: {
    bolter1: { bolts: 4, damage: 60, pierce: false, cooldown: 9 },
    bolter2: { bolts: 8, damage: 80, pierce: false, cooldown: 8 },
    bolter3: { bolts: 12, damage: 120, pierce: true, cooldown: 7 },
  },
  /** Ground flames deal this much damage per second. */
  flameDps: 90,
} as const;

/** Share of the cooldown charged when a mode is cancelled without use. */
export const CANCEL_COOLDOWN = 0;

export const ECONOMY = {
  offeringGold: 10,
  /** Gate fraction restored at the start of each day. */
  gateRefill: 1,
};
