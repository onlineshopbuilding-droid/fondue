/**
 * Every weapon of the keep as data. One entry per weapon; adding or removing a weapon happens here.
 * How a kind of weapon behaves lives in src/sim/weapons/behaviours/<kind>.ts.
 *
 * Columns of an entry:
 *   id        short name used everywhere (save files, art names `weapon:<id>:<tier>`)
 *   name      shown to players
 *   slotType  which kind of slot on the keep takes it (see src/config/slots.ts)
 *   kind      which behaviour class runs it
 *   target    what a tap aims at on its own: 'none', 'front' (raider closest to the gate),
 *             'crowd' (densest group), 'tough' (most hit points)
 *   enabled   false removes the weapon from the game without deleting it
 *   buyGold / buyOfferings   price of putting it into a slot during a run
 *   desc      one sentence for the slot window
 *   tiers     exactly five tiers. Each has `cooldown` (seconds), `note` (what this tier adds, shown
 *             in the armoury) and the numbers of its kind.
 * Prices of the tiers: UPGRADE_COST (gold and offerings in endless), stars in src/config/stars.ts.
 */
export type SlotType = 'foot' | 'wall' | 'shrine' | 'gate' | 'tower';
export type TargetRule = 'none' | 'front' | 'crowd' | 'tough';

interface TierBase { cooldown: number; note: string }

/** A wheel that rolls down the road. */
export interface RollTier extends TierBase { speed: number; radius: number; damage: number; maxHits: number; fireTrail: number; wheels: number }
/** Sticky cheese on the road: slows, later also burns. */
export interface PuddleTier extends TierBase { halfWidth: number; seconds: number; slow: number; dps: number }
/** Forks that spring out of the road: damage and a short pin, in several pulses on higher tiers. */
export interface SpikesTier extends TierBase { halfWidth: number; damage: number; pin: number; pulses: number }
/** A block that drops on a group; later it shakes the ground and strikes more than once. */
export interface SlamTier extends TierBase { halfWidth: number; damage: number; slams: number; shockRadius: number; shockStun: number }
/** A blast of sound that throws raiders back down the road. */
export interface PushTier extends TierBase { reach: number; push: number; damage: number; hitsAir: boolean }
/** Everything on the field stands still for a moment. */
export interface StopTier extends TierBase { seconds: number; hitsAir: boolean; breaksGuards: boolean }
/** Something falls from the sky and leaves fire. */
export interface SkyTier extends TierBase { radius: number; damage: number; flameSeconds: number; shards: number }
/** Lightning that jumps from the toughest raider to its neighbours. */
export interface ChainTier extends TierBase { damage: number; jumps: number; jumpRange: number; falloff: number; stun: number }
/** For a while every kill pays more. */
export interface GoldTier extends TierBase { seconds: number; factor: number }
/** A shell fired in an arc: 'blast' explodes, 'freeze' turns to ice, 'flame' sets the road on fire. */
export interface ShellTier extends TierBase { effect: 'blast' | 'freeze' | 'flame'; radius: number; damage: number; seconds: number; shells: number; shatterSpread: number }
/** Spikes on the gate: hurts whoever strikes it, and a tap bursts them outwards. */
export interface ThornsTier extends TierBase { reflect: number; burstDamage: number; burstReach: number }
/** A fan of bolts that covers the whole height, balloons above and runners below. */
export interface VolleyTier extends TierBase { bolts: number; damage: number; pierce: boolean; volleys: number }
/** Shoots on its own; a tap fires a quick burst. */
export interface SentryTier extends TierBase { every: number; damage: number; burst: number }
/** While it burns, raiders you throw explode where they land. */
export interface BeaconTier extends TierBase { seconds: number; radius: number; damage: number; flameSeconds: number }

interface DefBase {
  id: string;
  name: string;
  slotType: SlotType;
  target: TargetRule;
  enabled: boolean;
  buyGold: number;
  buyOfferings: number;
  desc: string;
}

export type WeaponDef = DefBase & (
  | { kind: 'roll'; tiers: RollTier[] }
  | { kind: 'puddle'; tiers: PuddleTier[] }
  | { kind: 'spikes'; tiers: SpikesTier[] }
  | { kind: 'slam'; tiers: SlamTier[] }
  | { kind: 'push'; tiers: PushTier[] }
  | { kind: 'stop'; tiers: StopTier[] }
  | { kind: 'sky'; tiers: SkyTier[] }
  | { kind: 'chain'; tiers: ChainTier[] }
  | { kind: 'gold'; tiers: GoldTier[] }
  | { kind: 'shell'; tiers: ShellTier[] }
  | { kind: 'thorns'; tiers: ThornsTier[] }
  | { kind: 'volley'; tiers: VolleyTier[] }
  | { kind: 'sentry'; tiers: SentryTier[] }
  | { kind: 'beacon'; tiers: BeaconTier[] }
);

export type WeaponKind = WeaponDef['kind'];
export const MAX_TIER = 5;

export const WEAPONS: WeaponDef[] = [
  // ----- Wall foot: things that work on the road itself -----
  {
    id: 'wheel', name: 'Rolling Wheel', slotType: 'foot', kind: 'roll', target: 'none', enabled: true, buyGold: 600, buyOfferings: 0,
    desc: 'A stone wheel rolls down the whole road and flattens what stands in it.',
    tiers: [
      { cooldown: 17, speed: 520, radius: 34, damage: 160, maxHits: 8, fireTrail: 0, wheels: 1, note: 'A plain stone wheel.' },
      { cooldown: 16, speed: 540, radius: 40, damage: 260, maxHits: 14, fireTrail: 0, wheels: 1, note: 'Iron-shod: hits harder and rolls through more raiders.' },
      { cooldown: 15, speed: 560, radius: 44, damage: 380, maxHits: 22, fireTrail: 0, wheels: 1, note: 'Spiked rim: almost nothing stops it.' },
      { cooldown: 14, speed: 580, radius: 46, damage: 480, maxHits: 30, fireTrail: 2.2, wheels: 1, note: 'Burning: leaves a trail of fire behind.' },
      { cooldown: 13, speed: 600, radius: 48, damage: 600, maxHits: 999, fireTrail: 2.6, wheels: 2, note: 'Twin wheels: a second one follows the first.' },
    ],
  },
  {
    id: 'cheese', name: 'Sticky Fondue', slotType: 'foot', kind: 'puddle', target: 'front', enabled: true, buyGold: 500, buyOfferings: 2,
    desc: 'Pours molten cheese on the road. Raiders wade through it slowly.',
    tiers: [
      { cooldown: 15, halfWidth: 120, seconds: 5, slow: 0.5, dps: 0, note: 'Slows everyone in the puddle.' },
      { cooldown: 14, halfWidth: 150, seconds: 6.5, slow: 0.42, dps: 0, note: 'A wider puddle that lasts longer.' },
      { cooldown: 13, halfWidth: 170, seconds: 7, slow: 0.36, dps: 25, note: 'Hot cheese: it also burns.' },
      { cooldown: 12, halfWidth: 200, seconds: 8, slow: 0.3, dps: 45, note: 'Thicker: raiders barely move.' },
      { cooldown: 11, halfWidth: 240, seconds: 9, slow: 0.24, dps: 80, note: 'Boiling: a long, deadly stretch of road.' },
    ],
  },
  {
    id: 'forks', name: 'Fondue Forks', slotType: 'foot', kind: 'spikes', target: 'crowd', enabled: true, buyGold: 800, buyOfferings: 4,
    desc: 'Giant forks spring out of the road under the thickest group and pin it.',
    tiers: [
      { cooldown: 12, halfWidth: 90, damage: 110, pin: 1, pulses: 1, note: 'One row of forks.' },
      { cooldown: 11.5, halfWidth: 105, damage: 170, pin: 1.2, pulses: 1, note: 'Longer row, sharper forks.' },
      { cooldown: 11, halfWidth: 115, damage: 200, pin: 1.3, pulses: 2, note: 'They stab twice.' },
      { cooldown: 10.5, halfWidth: 130, damage: 260, pin: 1.5, pulses: 2, note: 'Barbed: raiders stay pinned longer.' },
      { cooldown: 10, halfWidth: 150, damage: 300, pin: 1.6, pulses: 3, note: 'They stab three times.' },
    ],
  },

  // ----- Wall: heavy machines -----
  {
    id: 'stomper', name: 'Stomper', slotType: 'wall', kind: 'slam', target: 'crowd', enabled: true, buyGold: 900, buyOfferings: 6,
    desc: 'A heavy block drops on the thickest group.',
    tiers: [
      { cooldown: 10, halfWidth: 90, damage: 260, slams: 1, shockRadius: 0, shockStun: 0, note: 'A timber block on a chain.' },
      { cooldown: 9.5, halfWidth: 95, damage: 380, slams: 1, shockRadius: 190, shockStun: 1, note: 'Iron-shod: the tremor dazes raiders nearby.' },
      { cooldown: 9, halfWidth: 100, damage: 460, slams: 2, shockRadius: 200, shockStun: 1.1, note: 'It bounces and lands a second time on the next group.' },
      { cooldown: 8.5, halfWidth: 105, damage: 620, slams: 2, shockRadius: 230, shockStun: 1.5, note: 'A granite head: harder hits, longer daze.' },
      { cooldown: 8, halfWidth: 110, damage: 760, slams: 3, shockRadius: 250, shockStun: 1.7, note: 'Three strikes in a row.' },
    ],
  },
  {
    id: 'alphorn', name: 'Alphorn', slotType: 'wall', kind: 'push', target: 'none', enabled: true, buyGold: 700, buyOfferings: 3,
    desc: 'One mighty note throws every raider near the keep back down the road.',
    tiers: [
      { cooldown: 14, reach: 420, push: 260, damage: 20, hitsAir: false, note: 'Blows back whoever stands close to the gate.' },
      { cooldown: 13, reach: 520, push: 320, damage: 40, hitsAir: false, note: 'Louder: reaches further and throws them further.' },
      { cooldown: 12, reach: 620, push: 380, damage: 60, hitsAir: true, note: 'Balloons and crows are blown back too.' },
      { cooldown: 11, reach: 740, push: 440, damage: 90, hitsAir: true, note: 'Half the road flies.' },
      { cooldown: 10, reach: 900, push: 520, damage: 130, hitsAir: true, note: 'The whole valley hears it.' },
    ],
  },
  {
    id: 'cuckoo', name: 'Cuckoo Clock', slotType: 'wall', kind: 'stop', target: 'none', enabled: true, buyGold: 1200, buyOfferings: 8,
    desc: 'The cuckoo calls and every raider on the road stands still for a moment.',
    tiers: [
      { cooldown: 22, seconds: 2, hitsAir: false, breaksGuards: false, note: 'Time stops for raiders on the ground.' },
      { cooldown: 21, seconds: 2.6, hitsAir: false, breaksGuards: false, note: 'A longer pause.' },
      { cooldown: 20, seconds: 3.1, hitsAir: true, breaksGuards: false, note: 'Fliers hang still too.' },
      { cooldown: 19, seconds: 3.6, hitsAir: true, breaksGuards: true, note: 'Bubbles burst and shades show themselves.' },
      { cooldown: 17, seconds: 4.4, hitsAir: true, breaksGuards: true, note: 'The longest pause.' },
    ],
  },

  // ----- Shrine: help from above -----
  {
    id: 'comet', name: 'Comet', slotType: 'shrine', kind: 'sky', target: 'crowd', enabled: true, buyGold: 700, buyOfferings: 8,
    desc: 'A comet falls on the thickest group and leaves fire.',
    tiers: [
      { cooldown: 13, radius: 115, damage: 175, flameSeconds: 2.5, shards: 0, note: 'A burning rock from the sky.' },
      { cooldown: 12, radius: 135, damage: 290, flameSeconds: 3.2, shards: 0, note: 'Bigger, and the fire lasts longer.' },
      { cooldown: 11, radius: 150, damage: 420, flameSeconds: 3.8, shards: 2, note: 'It breaks apart: two shards land beside it.' },
      { cooldown: 10, radius: 165, damage: 560, flameSeconds: 4.4, shards: 3, note: 'Three shards.' },
      { cooldown: 9, radius: 185, damage: 720, flameSeconds: 5.2, shards: 4, note: 'A falling star with four shards.' },
    ],
  },
  {
    id: 'bell', name: 'Storm Bell', slotType: 'shrine', kind: 'chain', target: 'tough', enabled: true, buyGold: 1100, buyOfferings: 10,
    desc: 'Lightning strikes the toughest raider and jumps to its neighbours.',
    tiers: [
      { cooldown: 12, damage: 320, jumps: 2, jumpRange: 170, falloff: 0.6, stun: 0, note: 'One bolt, two jumps.' },
      { cooldown: 11.5, damage: 480, jumps: 3, jumpRange: 180, falloff: 0.65, stun: 0, note: 'A stronger bolt, three jumps.' },
      { cooldown: 11, damage: 650, jumps: 4, jumpRange: 190, falloff: 0.7, stun: 0.8, note: 'Whoever survives is dazed.' },
      { cooldown: 10, damage: 850, jumps: 5, jumpRange: 210, falloff: 0.75, stun: 1, note: 'Five jumps.' },
      { cooldown: 9, damage: 1100, jumps: 7, jumpRange: 230, falloff: 0.8, stun: 1.2, note: 'A whole storm.' },
    ],
  },
  {
    id: 'midas', name: 'Golden Fondue', slotType: 'shrine', kind: 'gold', target: 'none', enabled: true, buyGold: 900, buyOfferings: 6,
    desc: 'For a short while every raider you beat pays more gold.',
    tiers: [
      { cooldown: 24, seconds: 6, factor: 1.5, note: 'Half again as much gold.' },
      { cooldown: 23, seconds: 7, factor: 1.7, note: 'A little longer, a little richer.' },
      { cooldown: 22, seconds: 8, factor: 2, note: 'Double gold.' },
      { cooldown: 21, seconds: 9, factor: 2.3, note: 'Even richer.' },
      { cooldown: 20, seconds: 10, factor: 2.6, note: 'A golden ten seconds.' },
    ],
  },

  // ----- Gate: arms over the door -----
  {
    id: 'mortar', name: 'Gate Mortar', slotType: 'gate', kind: 'shell', target: 'front', enabled: true, buyGold: 1000, buyOfferings: 0,
    desc: 'Lobs a shell at the raider closest to the gate.',
    tiers: [
      { cooldown: 6, effect: 'blast', radius: 95, damage: 150, seconds: 0, shells: 1, shatterSpread: 0, note: 'One shell.' },
      { cooldown: 5.8, effect: 'blast', radius: 105, damage: 230, seconds: 0, shells: 1, shatterSpread: 0, note: 'A bigger charge.' },
      { cooldown: 5.6, effect: 'blast', radius: 100, damage: 240, seconds: 0, shells: 2, shatterSpread: 0, note: 'Two shells, one behind the other.' },
      { cooldown: 5.3, effect: 'blast', radius: 105, damage: 300, seconds: 0, shells: 3, shatterSpread: 0, note: 'Three shells.' },
      { cooldown: 5, effect: 'blast', radius: 115, damage: 380, seconds: 0, shells: 4, shatterSpread: 0, note: 'A whole battery.' },
    ],
  },
  {
    id: 'frost', name: 'Frost Horn', slotType: 'gate', kind: 'shell', target: 'crowd', enabled: true, buyGold: 1500, buyOfferings: 6,
    desc: 'Freezes the thickest group. Tap a frozen raider to shatter it.',
    tiers: [
      { cooldown: 9, effect: 'freeze', radius: 130, damage: 0, seconds: 6, shells: 1, shatterSpread: 0, note: 'A patch of ice.' },
      { cooldown: 8.7, effect: 'freeze', radius: 150, damage: 0, seconds: 7, shells: 1, shatterSpread: 0, note: 'A wider patch that holds longer.' },
      { cooldown: 8.4, effect: 'freeze', radius: 160, damage: 0, seconds: 7.5, shells: 1, shatterSpread: 70, note: 'Shattering one also breaks its close neighbours.' },
      { cooldown: 8, effect: 'freeze', radius: 175, damage: 0, seconds: 8, shells: 1, shatterSpread: 110, note: 'The cracks run further.' },
      { cooldown: 7.5, effect: 'freeze', radius: 195, damage: 0, seconds: 9, shells: 1, shatterSpread: 160, note: 'One tap can break a whole frozen group.' },
    ],
  },
  {
    id: 'bellows', name: 'Dragon Bellows', slotType: 'gate', kind: 'shell', target: 'crowd', enabled: true, buyGold: 1800, buyOfferings: 12,
    desc: 'Sets the road under the thickest group on fire.',
    tiers: [
      { cooldown: 11, effect: 'flame', radius: 150, damage: 90, seconds: 2.2, shells: 1, shatterSpread: 0, note: 'A stretch of burning road.' },
      { cooldown: 10.5, effect: 'flame', radius: 170, damage: 110, seconds: 2.8, shells: 1, shatterSpread: 0, note: 'Hotter and longer.' },
      { cooldown: 10, effect: 'flame', radius: 160, damage: 120, seconds: 3, shells: 2, shatterSpread: 0, note: 'Two fires at once.' },
      { cooldown: 9.5, effect: 'flame', radius: 175, damage: 150, seconds: 3.4, shells: 2, shatterSpread: 0, note: 'White-hot.' },
      { cooldown: 9, effect: 'flame', radius: 180, damage: 180, seconds: 3.8, shells: 3, shatterSpread: 0, note: 'Three fires: most of the road burns.' },
    ],
  },
  {
    id: 'thorns', name: 'Hedgehog Gate', slotType: 'gate', kind: 'thorns', target: 'none', enabled: true, buyGold: 1100, buyOfferings: 4,
    desc: 'Spikes on the gate hurt whoever strikes it. Tap to burst them outwards.',
    tiers: [
      { cooldown: 12, reflect: 12, burstDamage: 120, burstReach: 110, note: 'Raiders hurt themselves on the gate.' },
      { cooldown: 11.5, reflect: 20, burstDamage: 180, burstReach: 125, note: 'Longer spikes.' },
      { cooldown: 11, reflect: 30, burstDamage: 250, burstReach: 140, note: 'Barbed spikes.' },
      { cooldown: 10.5, reflect: 42, burstDamage: 330, burstReach: 160, note: 'Steel spikes.' },
      { cooldown: 10, reflect: 58, burstDamage: 430, burstReach: 180, note: 'Nobody touches this gate twice.' },
    ],
  },

  // ----- Tower: eyes on the whole field -----
  {
    id: 'bolter', name: 'Roof Bolter', slotType: 'tower', kind: 'volley', target: 'none', enabled: true, buyGold: 1400, buyOfferings: 0,
    desc: 'A wide fan of bolts over the whole height: balloons above, runners below.',
    tiers: [
      { cooldown: 9, bolts: 6, damage: 90, pierce: false, volleys: 1, note: 'Six bolts.' },
      { cooldown: 8.6, bolts: 9, damage: 110, pierce: false, volleys: 1, note: 'Nine bolts.' },
      { cooldown: 8.2, bolts: 10, damage: 130, pierce: true, volleys: 1, note: 'Bolts fly through their targets.' },
      { cooldown: 7.8, bolts: 12, damage: 160, pierce: true, volleys: 1, note: 'A dozen heavy bolts.' },
      { cooldown: 7.2, bolts: 12, damage: 170, pierce: true, volleys: 2, note: 'Two volleys in quick succession.' },
    ],
  },
  {
    id: 'sentry', name: 'Marmot Sentry', slotType: 'tower', kind: 'sentry', target: 'front', enabled: true, buyGold: 1300, buyOfferings: 5,
    desc: 'A marmot with a crossbow shoots on its own. Tap it for a quick burst.',
    tiers: [
      { cooldown: 12, every: 2.6, damage: 45, burst: 4, note: 'Shoots now and then.' },
      { cooldown: 11.5, every: 2.2, damage: 60, burst: 5, note: 'Shoots more often.' },
      { cooldown: 11, every: 1.8, damage: 75, burst: 6, note: 'A second marmot reloads.' },
      { cooldown: 10.5, every: 1.5, damage: 95, burst: 7, note: 'Heavier bolts.' },
      { cooldown: 10, every: 1.2, damage: 120, burst: 9, note: 'A whole marmot family.' },
    ],
  },
  {
    id: 'beacon', name: 'Ember Beacon', slotType: 'tower', kind: 'beacon', target: 'none', enabled: true, buyGold: 1200, buyOfferings: 6,
    desc: 'While the beacon burns, every raider you throw explodes where it lands.',
    tiers: [
      { cooldown: 20, seconds: 6, radius: 70, damage: 130, flameSeconds: 0, note: 'Thrown raiders burst on landing.' },
      { cooldown: 19, seconds: 7, radius: 80, damage: 190, flameSeconds: 0, note: 'Bigger bursts.' },
      { cooldown: 18, seconds: 8, radius: 90, damage: 260, flameSeconds: 0, note: 'Burns longer.' },
      { cooldown: 17, seconds: 9, radius: 100, damage: 330, flameSeconds: 1.5, note: 'Each burst leaves a little fire.' },
      { cooldown: 16, seconds: 10, radius: 115, damage: 420, flameSeconds: 2.2, note: 'Your throws become a bombardment.' },
    ],
  },
];

/**
 * Price of raising a weapon to tier 2, 3, 4, 5 during an endless run, as multiples of its buy price
 * (gold) and as offerings on top.
 */
export const UPGRADE_COST = {
  goldFactor: [0, 1.6, 3.4, 7, 13],
  offerings: [0, 8, 20, 38, 60],
};

/** Ground flames deal this much damage per second unless the weapon says otherwise. */
export const FLAME_DPS = 90;
/** Seconds a mortar shell flies, and a comet falls. */
export const SHELL_FLIGHT = 0.6;
export const SKY_FALL = 0.55;

export const weaponById = (id: string): WeaponDef | undefined => WEAPONS.find((w) => w.id === id);
export const activeWeapons = (): WeaponDef[] => WEAPONS.filter((w) => w.enabled);
export const weaponsForSlot = (type: SlotType): WeaponDef[] => WEAPONS.filter((w) => w.enabled && w.slotType === type);

/** Gold and offerings for the step up to `tier` (2 to 5) in an endless run. */
export function upgradePrice(def: WeaponDef, tier: number): { gold: number; offerings: number } {
  return { gold: Math.round((def.buyGold * UPGRADE_COST.goldFactor[tier - 1]) / 50) * 50, offerings: UPGRADE_COST.offerings[tier - 1] };
}
