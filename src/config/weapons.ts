/**
 * Every weapon of the keep as data. One entry per weapon; adding or removing a weapon happens here.
 * How a kind of weapon behaves lives in src/sim/weapons/behaviours/<kind>.ts.
 *
 * Columns of an entry:
 *   id          short name used everywhere (save files, art names `weapon:<id>:<tier>`)
 *   name        shown to players
 *   slot        which slot of the keep takes it (`SlotRole`, see src/config/slots.ts); five weapons per role
 *   kind        which behaviour class runs it
 *   target      what it aims at on its own: 'none', 'front' (raider closest to the gate),
 *               'crowd' (densest group), 'tough' (most hit points)
 *   enabled     false removes the weapon from the game without deleting it
 *   desc        one sentence for the shop
 *   unlockLevel the campaign level from which it can be unlocked with cheese
 *   cheesePrice cheese to unlock it for good (all weapons + Great Cauldron + Eagle Perch = 500)
 *   goldScale   factor on the gold price of its tiers (src/config/tiers.ts)
 *   tiers       exactly seven tiers. Each has `cooldown` (seconds), `note` (what this tier adds, shown
 *               in the shop and the developer overview) and the numbers of its kind.
 *
 * Rule A5 (unit test): from one tier to the next either a switch changes, or at least one number
 * changes by 15 % or more. Tier 7 is always a highlight.
 *
 * Damage, Slow, Support and Gate weapons fire when tapped. Passive weapons (slot 'passive') fire on
 * their own whenever they are reloaded and have a target; the reload ring shows their rhythm.
 */
import type { SlotRole } from './slots';

export type { SlotRole } from './slots';
export type TargetRule = 'none' | 'front' | 'crowd' | 'tough';

interface TierBase { cooldown: number; note: string }

/** Wheels that roll down the whole road. */
export interface RollTier extends TierBase { speed: number; radius: number; damage: number; maxHits: number; fireTrail: number; wheels: number }
/** Sticky cheese on the road: slows, later also burns; at the top it covers the whole road. */
export interface PuddleTier extends TierBase { halfWidth: number; seconds: number; slow: number; dps: number; wholeRoad: boolean }
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
/** Lightning that jumps from the toughest raider to its neighbours; `strikes` bolts start at once. */
export interface ChainTier extends TierBase { damage: number; jumps: number; jumpRange: number; falloff: number; stun: number; strikes: number }
/** For a while every kill pays more. */
export interface GoldTier extends TierBase { seconds: number; factor: number }
/** A shell fired in an arc: 'blast' explodes, 'freeze' turns to ice, 'flame' sets the road on fire. */
export interface ShellTier extends TierBase { effect: 'blast' | 'freeze' | 'flame'; radius: number; damage: number; seconds: number; shells: number; shatterSpread: number }
/** Spikes on the gate: hurts whoever strikes it, and a tap bursts them outwards (and dazes on high tiers). */
export interface ThornsTier extends TierBase { reflect: number; burstDamage: number; burstReach: number; burstStun: number }
/** A fan of bolts that covers the whole height, balloons above and runners below. */
export interface VolleyTier extends TierBase { bolts: number; damage: number; pierce: boolean; volleys: number }
/** Shoots on its own at the `targets` raiders closest to the gate; a tap fires a quick burst. */
export interface SentryTier extends TierBase { every: number; damage: number; burst: number; targets: number }
/** While it burns, raiders you throw explode where they land. */
export interface BeaconTier extends TierBase { seconds: number; radius: number; damage: number; flameSeconds: number }
/** Snowballs that leave slowing drifts on the road; at the top a blizzard over the whole road. */
export interface DriftTier extends TierBase { halfWidth: number; seconds: number; slow: number; drifts: number; wholeRoad: boolean }
/** A bell stroke that dazes everyone in a circle around the thickest group, `tolls` times in a row. */
export interface TollTier extends TierBase { radius: number; stun: number; tolls: number; damage: number; hitsAir: boolean }
/** Every player gets a second hand for a while (state only; two-finger grabbing comes with P-Hände). */
export interface HelperTier extends TierBase { seconds: number; strength: number }
/** For a while every hand is stronger and a hard throw kills more easily (`lethal` scales the lethal speed). */
export interface GripTier extends TierBase { seconds: number; strength: number; lethal: number }
/** Heals the gate at once by `heal` of its full strength, then `regen` per second for `seconds`. */
export interface MendTier extends TierBase { heal: number; regen: number; seconds: number }
/** Lobs pinecones on the thickest group on its own. */
export interface LobTier extends TierBase { cones: number; radius: number; damage: number; stun: number }
/** A swarm of hornets flies out on its own and stings the raiders closest to the gate. */
export interface SwarmTier extends TierBase { hornets: number; damage: number; stings: number }
/** Hot cheese pours from the gate arch: a scalding, slowing stretch right in front of the gate. */
export interface CascadeTier extends TierBase { halfWidth: number; seconds: number; dps: number; slow: number; stun: number }
/** A trunk swings out of the gate and knocks back whoever stands close, `swings` times. */
export interface SwingTier extends TierBase { reach: number; damage: number; push: number; swings: number; stun: number }

interface DefBase {
  id: string;
  name: string;
  slot: SlotRole;
  target: TargetRule;
  enabled: boolean;
  desc: string;
  unlockLevel: number;
  cheesePrice: number;
  goldScale: number;
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
  | { kind: 'drift'; tiers: DriftTier[] }
  | { kind: 'toll'; tiers: TollTier[] }
  | { kind: 'helper'; tiers: HelperTier[] }
  | { kind: 'grip'; tiers: GripTier[] }
  | { kind: 'mend'; tiers: MendTier[] }
  | { kind: 'lob'; tiers: LobTier[] }
  | { kind: 'swarm'; tiers: SwarmTier[] }
  | { kind: 'cascade'; tiers: CascadeTier[] }
  | { kind: 'swing'; tiers: SwingTier[] }
);

export type WeaponKind = WeaponDef['kind'];
/** Highest tier of every weapon (same as TIER_MAX in src/config/tiers.ts). */
export const MAX_TIER = 7;

export const WEAPONS: WeaponDef[] = [
  // ----- Damage (bottom left): hurt raiders on the road -----
  {
    id: 'wheel', name: 'Rolling Wheel', slot: 'damage', kind: 'roll', target: 'none', enabled: true,
    unlockLevel: 0, cheesePrice: 0, goldScale: 0.8,
    desc: 'A stone wheel rolls down the whole road and flattens what stands in it.',
    tiers: [
      { cooldown: 16, speed: 560, radius: 34, damage: 160, maxHits: 8, fireTrail: 0, wheels: 1, note: 'A plain stone wheel.' },
      { cooldown: 15, speed: 600, radius: 40, damage: 260, maxHits: 14, fireTrail: 0, wheels: 1, note: 'Iron-shod: hits harder and rolls through more raiders.' },
      { cooldown: 14, speed: 640, radius: 44, damage: 380, maxHits: 22, fireTrail: 0, wheels: 1, note: 'Spiked rim: almost nothing stops it.' },
      { cooldown: 13, speed: 680, radius: 46, damage: 480, maxHits: 30, fireTrail: 2.2, wheels: 1, note: 'Burning: leaves a trail of fire behind.' },
      { cooldown: 12, speed: 720, radius: 48, damage: 560, maxHits: 40, fireTrail: 2.6, wheels: 2, note: 'Twin wheels: a second one follows the first.' },
      { cooldown: 11.5, speed: 760, radius: 54, damage: 700, maxHits: 60, fireTrail: 3, wheels: 2, note: 'Bigger, heavier twins.' },
      { cooldown: 10, speed: 800, radius: 58, damage: 850, maxHits: 999, fireTrail: 3.6, wheels: 3, note: 'Three flaming wheels: the road is swept clean.' },
    ],
  },
  {
    id: 'forks', name: 'Fondue Forks', slot: 'damage', kind: 'spikes', target: 'crowd', enabled: true,
    unlockLevel: 14, cheesePrice: 8, goldScale: 0.9,
    desc: 'Giant forks spring out of the road under the thickest group and pin it.',
    tiers: [
      { cooldown: 12, halfWidth: 100, damage: 110, pin: 1, pulses: 1, note: 'One row of forks.' },
      { cooldown: 11.5, halfWidth: 120, damage: 150, pin: 1.2, pulses: 1, note: 'A longer row, sharper forks.' },
      { cooldown: 11, halfWidth: 130, damage: 170, pin: 1.3, pulses: 2, note: 'They stab twice.' },
      { cooldown: 10.5, halfWidth: 150, damage: 220, pin: 1.5, pulses: 2, note: 'Barbed: raiders stay pinned longer.' },
      { cooldown: 10, halfWidth: 165, damage: 250, pin: 1.6, pulses: 3, note: 'They stab three times.' },
      { cooldown: 9.5, halfWidth: 190, damage: 300, pin: 1.8, pulses: 3, note: 'Silver forks along a longer row.' },
      { cooldown: 8.5, halfWidth: 240, damage: 360, pin: 2.2, pulses: 4, note: 'The whole fondue set: four stabs along a wide stretch.' },
    ],
  },
  {
    id: 'stomper', name: 'Stomper', slot: 'damage', kind: 'slam', target: 'crowd', enabled: true,
    unlockLevel: 29, cheesePrice: 16, goldScale: 1.05,
    desc: 'A heavy block drops on the thickest group.',
    tiers: [
      { cooldown: 10, halfWidth: 90, damage: 260, slams: 1, shockRadius: 0, shockStun: 0, note: 'A timber block on a chain.' },
      { cooldown: 9.5, halfWidth: 95, damage: 380, slams: 1, shockRadius: 190, shockStun: 1, note: 'Iron-shod: the tremor dazes raiders nearby.' },
      { cooldown: 9, halfWidth: 100, damage: 460, slams: 2, shockRadius: 200, shockStun: 1.1, note: 'It bounces and lands a second time on the next group.' },
      { cooldown: 8.5, halfWidth: 105, damage: 620, slams: 2, shockRadius: 230, shockStun: 1.5, note: 'A granite head: harder hits, longer daze.' },
      { cooldown: 8, halfWidth: 110, damage: 760, slams: 3, shockRadius: 250, shockStun: 1.7, note: 'Three strikes in a row.' },
      { cooldown: 7.5, halfWidth: 125, damage: 900, slams: 3, shockRadius: 280, shockStun: 2, note: 'A wider head and a deeper tremor.' },
      { cooldown: 7, halfWidth: 140, damage: 1100, slams: 4, shockRadius: 320, shockStun: 2.4, note: 'Four strikes: the mountain itself shakes.' },
    ],
  },
  {
    id: 'comet', name: 'Comet', slot: 'damage', kind: 'sky', target: 'crowd', enabled: true,
    unlockLevel: 44, cheesePrice: 23, goldScale: 1.15,
    desc: 'A comet falls on the thickest group and leaves fire.',
    tiers: [
      { cooldown: 13, radius: 115, damage: 175, flameSeconds: 2.5, shards: 0, note: 'A burning rock from the sky.' },
      { cooldown: 12, radius: 135, damage: 290, flameSeconds: 3.2, shards: 0, note: 'Bigger, and the fire lasts longer.' },
      { cooldown: 11, radius: 150, damage: 420, flameSeconds: 3.8, shards: 2, note: 'It breaks apart: two shards land beside it.' },
      { cooldown: 10, radius: 165, damage: 560, flameSeconds: 4.4, shards: 3, note: 'Three shards.' },
      { cooldown: 9, radius: 185, damage: 720, flameSeconds: 5.2, shards: 4, note: 'A falling star with four shards.' },
      { cooldown: 8.5, radius: 200, damage: 860, flameSeconds: 5.8, shards: 5, note: 'Five shards and a longer blaze.' },
      { cooldown: 8, radius: 220, damage: 1050, flameSeconds: 6.5, shards: 6, note: 'A meteor shower: six shards rain down.' },
    ],
  },
  {
    id: 'bellows', name: 'Dragon Bellows', slot: 'damage', kind: 'shell', target: 'crowd', enabled: true,
    unlockLevel: 64, cheesePrice: 30, goldScale: 1.3,
    desc: 'Sets the road under the thickest group on fire.',
    tiers: [
      { cooldown: 11, effect: 'flame', radius: 150, damage: 90, seconds: 2.2, shells: 1, shatterSpread: 0, note: 'A stretch of burning road.' },
      { cooldown: 10.5, effect: 'flame', radius: 170, damage: 115, seconds: 2.8, shells: 1, shatterSpread: 0, note: 'Hotter and longer.' },
      { cooldown: 10, effect: 'flame', radius: 160, damage: 120, seconds: 3, shells: 2, shatterSpread: 0, note: 'Two fires at once.' },
      { cooldown: 9.5, effect: 'flame', radius: 175, damage: 150, seconds: 3.4, shells: 2, shatterSpread: 0, note: 'White-hot.' },
      { cooldown: 9, effect: 'flame', radius: 180, damage: 180, seconds: 3.8, shells: 3, shatterSpread: 0, note: 'Three fires: most of the road burns.' },
      { cooldown: 8.5, effect: 'flame', radius: 190, damage: 220, seconds: 4.4, shells: 3, shatterSpread: 0, note: 'Blue flames that burn longer.' },
      { cooldown: 8, effect: 'flame', radius: 200, damage: 270, seconds: 5, shells: 4, shatterSpread: 0, note: "Dragon's breath: four fires, the road is ablaze." },
    ],
  },

  // ----- Slow (left middle): hold raiders back -----
  {
    id: 'cheese', name: 'Sticky Fondue', slot: 'slow', kind: 'puddle', target: 'front', enabled: true,
    unlockLevel: 2, cheesePrice: 3, goldScale: 0.85,
    desc: 'Pours molten cheese on the road. Raiders wade through it slowly.',
    tiers: [
      { cooldown: 15, halfWidth: 140, seconds: 5, slow: 0.5, dps: 0, wholeRoad: false, note: 'Slows everyone in the puddle.' },
      { cooldown: 14, halfWidth: 170, seconds: 6.5, slow: 0.42, dps: 0, wholeRoad: false, note: 'A wider puddle that lasts longer.' },
      { cooldown: 13, halfWidth: 200, seconds: 7, slow: 0.36, dps: 25, wholeRoad: false, note: 'Hot cheese: it also burns.' },
      { cooldown: 12, halfWidth: 240, seconds: 8, slow: 0.3, dps: 45, wholeRoad: false, note: 'Thicker: raiders barely move.' },
      { cooldown: 11, halfWidth: 280, seconds: 9, slow: 0.26, dps: 70, wholeRoad: false, note: 'Boiling: a long, deadly stretch of road.' },
      { cooldown: 10.5, halfWidth: 340, seconds: 10, slow: 0.22, dps: 90, wholeRoad: false, note: 'A whole lake of fondue.' },
      { cooldown: 10, halfWidth: 340, seconds: 11, slow: 0.2, dps: 110, wholeRoad: true, note: 'Sticky fondue across the whole road.' },
    ],
  },
  {
    id: 'frost', name: 'Frost Horn', slot: 'slow', kind: 'shell', target: 'crowd', enabled: true,
    unlockLevel: 17, cheesePrice: 10, goldScale: 1,
    desc: 'Freezes the thickest group. Tap a frozen raider to shatter it.',
    tiers: [
      { cooldown: 9, effect: 'freeze', radius: 130, damage: 0, seconds: 6, shells: 1, shatterSpread: 0, note: 'A patch of ice.' },
      { cooldown: 8.7, effect: 'freeze', radius: 150, damage: 0, seconds: 7, shells: 1, shatterSpread: 0, note: 'A wider patch that holds longer.' },
      { cooldown: 8.4, effect: 'freeze', radius: 160, damage: 0, seconds: 7.5, shells: 1, shatterSpread: 70, note: 'Shattering one also breaks its close neighbours.' },
      { cooldown: 8, effect: 'freeze', radius: 175, damage: 0, seconds: 8, shells: 1, shatterSpread: 110, note: 'The cracks run further.' },
      { cooldown: 7.5, effect: 'freeze', radius: 195, damage: 0, seconds: 9, shells: 1, shatterSpread: 160, note: 'One tap can break a whole frozen group.' },
      { cooldown: 7, effect: 'freeze', radius: 215, damage: 0, seconds: 10, shells: 1, shatterSpread: 200, note: 'Glacier ice: wider and deeper cracks.' },
      { cooldown: 6.5, effect: 'freeze', radius: 230, damage: 0, seconds: 11, shells: 2, shatterSpread: 260, note: 'Two ice shells: one tap breaks a whole frozen column.' },
    ],
  },
  {
    id: 'cuckoo', name: 'Cuckoo Clock', slot: 'slow', kind: 'stop', target: 'none', enabled: true,
    unlockLevel: 32, cheesePrice: 18, goldScale: 1.1,
    desc: 'The cuckoo calls and every raider on the road stands still for a moment.',
    tiers: [
      { cooldown: 22, seconds: 2, hitsAir: false, breaksGuards: false, note: 'Time stops for raiders on the ground.' },
      { cooldown: 21, seconds: 2.35, hitsAir: false, breaksGuards: false, note: 'A longer pause.' },
      { cooldown: 20.5, seconds: 2.35, hitsAir: true, breaksGuards: false, note: 'Fliers hang still too.' },
      { cooldown: 20, seconds: 2.75, hitsAir: true, breaksGuards: false, note: 'An even longer pause.' },
      { cooldown: 19.5, seconds: 2.75, hitsAir: true, breaksGuards: true, note: 'Bubbles burst and shades show themselves.' },
      { cooldown: 19, seconds: 3.2, hitsAir: true, breaksGuards: true, note: 'The pendulum swings slower still.' },
      { cooldown: 18, seconds: 4, hitsAir: true, breaksGuards: true, note: 'The great clock: everything holds for four seconds.' },
    ],
  },
  {
    id: 'snowdrift', name: 'Snowdrift Cannon', slot: 'slow', kind: 'drift', target: 'crowd', enabled: true,
    unlockLevel: 48, cheesePrice: 24, goldScale: 1.1,
    desc: 'Fires snowballs that pile into drifts on the road. Raiders trudge through slowly.',
    tiers: [
      { cooldown: 13, halfWidth: 130, seconds: 5, slow: 0.55, drifts: 1, wholeRoad: false, note: 'One snowdrift.' },
      { cooldown: 12.5, halfWidth: 160, seconds: 6, slow: 0.5, drifts: 1, wholeRoad: false, note: 'A deeper, wider drift.' },
      { cooldown: 12, halfWidth: 170, seconds: 7, slow: 0.45, drifts: 2, wholeRoad: false, note: 'Two drifts side by side.' },
      { cooldown: 11.5, halfWidth: 200, seconds: 8, slow: 0.4, drifts: 2, wholeRoad: false, note: 'Packed snow: slower going.' },
      { cooldown: 11, halfWidth: 210, seconds: 9.5, slow: 0.36, drifts: 3, wholeRoad: false, note: 'Three drifts.' },
      { cooldown: 10.5, halfWidth: 250, seconds: 11, slow: 0.32, drifts: 3, wholeRoad: false, note: 'Wide drifts that last.' },
      { cooldown: 10, halfWidth: 250, seconds: 12, slow: 0.28, drifts: 3, wholeRoad: true, note: 'A blizzard: snow over the whole road.' },
    ],
  },
  {
    id: 'cowbell', name: 'Cowbell Toll', slot: 'slow', kind: 'toll', target: 'crowd', enabled: true,
    unlockLevel: 68, cheesePrice: 32, goldScale: 1.25,
    desc: 'A great cowbell tolls over the thickest group and dazes everyone around it.',
    tiers: [
      { cooldown: 14, radius: 150, stun: 1.2, tolls: 1, damage: 20, hitsAir: false, note: 'One toll dazes a group.' },
      { cooldown: 13.5, radius: 175, stun: 1.4, tolls: 1, damage: 30, hitsAir: false, note: 'A louder toll, wider and longer.' },
      { cooldown: 13, radius: 185, stun: 1.5, tolls: 2, damage: 35, hitsAir: false, note: 'It tolls twice.' },
      { cooldown: 12.5, radius: 215, stun: 1.7, tolls: 2, damage: 45, hitsAir: false, note: 'A bronze bell: further and longer.' },
      { cooldown: 12, radius: 225, stun: 1.8, tolls: 2, damage: 50, hitsAir: true, note: 'The sound also shakes fliers.' },
      { cooldown: 11.5, radius: 240, stun: 2, tolls: 3, damage: 60, hitsAir: true, note: 'Three tolls.' },
      { cooldown: 11, radius: 300, stun: 2.4, tolls: 4, damage: 80, hitsAir: true, note: 'The great bell: four tolls over half the road.' },
    ],
  },

  // ----- Support (left top): help the hands and the gate -----
  {
    id: 'midas', name: 'Golden Fondue', slot: 'support', kind: 'gold', target: 'none', enabled: true,
    unlockLevel: 7, cheesePrice: 5, goldScale: 0.9,
    desc: 'For a short while every raider you beat pays more gold.',
    tiers: [
      { cooldown: 24, seconds: 6, factor: 1.5, note: 'Half again as much gold.' },
      { cooldown: 23, seconds: 7, factor: 1.7, note: 'A little longer, a little richer.' },
      { cooldown: 22, seconds: 8, factor: 2, note: 'Double gold.' },
      { cooldown: 21, seconds: 9.5, factor: 2.2, note: 'Even longer.' },
      { cooldown: 20, seconds: 11, factor: 2.4, note: 'Even richer.' },
      { cooldown: 19, seconds: 12, factor: 2.8, note: 'Nearly triple gold.' },
      { cooldown: 18, seconds: 14, factor: 3.2, note: 'A golden rain: more than triple gold for fourteen seconds.' },
    ],
  },
  {
    id: 'beacon', name: 'Ember Beacon', slot: 'support', kind: 'beacon', target: 'none', enabled: true,
    unlockLevel: 23, cheesePrice: 12, goldScale: 1,
    desc: 'While the beacon burns, every raider you throw explodes where it lands.',
    tiers: [
      { cooldown: 20, seconds: 6, radius: 70, damage: 130, flameSeconds: 0, note: 'Thrown raiders burst on landing.' },
      { cooldown: 19, seconds: 7, radius: 80, damage: 190, flameSeconds: 0, note: 'Bigger bursts.' },
      { cooldown: 18, seconds: 8, radius: 90, damage: 260, flameSeconds: 0, note: 'Burns longer.' },
      { cooldown: 17, seconds: 9, radius: 100, damage: 330, flameSeconds: 1.5, note: 'Each burst leaves a little fire.' },
      { cooldown: 16, seconds: 10, radius: 115, damage: 420, flameSeconds: 2.2, note: 'Your throws become a bombardment.' },
      { cooldown: 15, seconds: 11, radius: 130, damage: 520, flameSeconds: 2.8, note: 'Bigger fires.' },
      { cooldown: 14, seconds: 12, radius: 160, damage: 650, flameSeconds: 3.5, note: 'Every throw lands like a comet.' },
    ],
  },
  {
    id: 'mender', name: 'Mending Horn', slot: 'support', kind: 'mend', target: 'none', enabled: true,
    unlockLevel: 38, cheesePrice: 20, goldScale: 1.05,
    desc: 'A warm note mends the gate. It needs a damaged gate.',
    tiers: [
      { cooldown: 28, heal: 0.08, regen: 0, seconds: 0, note: 'Mends a little of the gate.' },
      { cooldown: 27, heal: 0.1, regen: 0, seconds: 0, note: 'Mends more.' },
      { cooldown: 26, heal: 0.12, regen: 0.01, seconds: 5, note: 'The gate keeps mending for a while.' },
      { cooldown: 25, heal: 0.14, regen: 0.012, seconds: 6, note: 'Longer and stronger.' },
      { cooldown: 24, heal: 0.16, regen: 0.015, seconds: 7, note: 'A deep, healing chord.' },
      { cooldown: 23, heal: 0.18, regen: 0.018, seconds: 8, note: 'The planks grow back while you watch.' },
      { cooldown: 22, heal: 0.22, regen: 0.022, seconds: 10, note: 'The great chord: a big mend, then ten seconds of healing.' },
    ],
  },
  {
    id: 'grip', name: 'Iron Grip', slot: 'support', kind: 'grip', target: 'none', enabled: true,
    unlockLevel: 56, cheesePrice: 27, goldScale: 1.2,
    desc: 'For a while every hand grips harder and a hard throw kills more easily.',
    tiers: [
      { cooldown: 25, seconds: 6, strength: 1.3, lethal: 0.9, note: 'Stronger hands for a moment.' },
      { cooldown: 24, seconds: 7, strength: 1.4, lethal: 0.87, note: 'A little longer.' },
      { cooldown: 23, seconds: 8.2, strength: 1.5, lethal: 0.84, note: 'Throws kill more easily.' },
      { cooldown: 22, seconds: 9.5, strength: 1.65, lethal: 0.8, note: 'Iron knuckles.' },
      { cooldown: 21, seconds: 11, strength: 1.8, lethal: 0.76, note: 'Steel knuckles.' },
      { cooldown: 20, seconds: 12.7, strength: 2, lethal: 0.72, note: 'Hands of a mountain giant.' },
      { cooldown: 18, seconds: 15, strength: 2.4, lethal: 0.65, note: 'Iron fists: a Yeti flies, and every hard throw kills.' },
    ],
  },
  {
    id: 'helper', name: 'Helping Hand', slot: 'support', kind: 'helper', target: 'none', enabled: true,
    unlockLevel: 76, cheesePrice: 35, goldScale: 1.35,
    desc: 'Every player gets a second hand for a few seconds.',
    tiers: [
      { cooldown: 30, seconds: 5, strength: 0.6, note: 'A weak second hand for five seconds.' },
      { cooldown: 29, seconds: 6, strength: 0.7, note: 'A little longer.' },
      { cooldown: 28, seconds: 7, strength: 0.8, note: 'A firmer second hand.' },
      { cooldown: 27, seconds: 8.2, strength: 0.9, note: 'Longer still.' },
      { cooldown: 26, seconds: 9.5, strength: 1, note: 'The second hand is as strong as the first.' },
      { cooldown: 25, seconds: 11, strength: 1, note: 'Eleven seconds of two hands.' },
      { cooldown: 23, seconds: 14, strength: 1.2, note: 'A strong second hand for fourteen seconds.' },
    ],
  },

  // ----- Passive (right top): fire on their own -----
  {
    id: 'sentry', name: 'Marmot Sentry', slot: 'passive', kind: 'sentry', target: 'front', enabled: true,
    unlockLevel: 11, cheesePrice: 6, goldScale: 0.95,
    desc: 'A marmot with a crossbow shoots on its own. Tap it for a quick burst.',
    tiers: [
      { cooldown: 12, every: 2.4, damage: 45, burst: 4, targets: 1, note: 'Shoots now and then.' },
      { cooldown: 11.5, every: 2, damage: 60, burst: 5, targets: 1, note: 'Shoots more often.' },
      { cooldown: 11, every: 1.65, damage: 75, burst: 6, targets: 1, note: 'A quicker reload.' },
      { cooldown: 10.5, every: 1.4, damage: 95, burst: 7, targets: 1, note: 'Heavier bolts.' },
      { cooldown: 10, every: 1.2, damage: 120, burst: 8, targets: 2, note: 'A second marmot: two targets at once.' },
      { cooldown: 9.5, every: 1, damage: 140, burst: 9, targets: 2, note: 'Faster crossbows.' },
      { cooldown: 9, every: 0.8, damage: 170, burst: 12, targets: 3, note: 'The whole marmot family: three crossbows.' },
    ],
  },
  {
    id: 'bolter', name: 'Roof Bolter', slot: 'passive', kind: 'volley', target: 'none', enabled: true,
    unlockLevel: 26, cheesePrice: 14, goldScale: 1,
    desc: 'Fires a wide fan of bolts over the whole height on its own: balloons above, runners below.',
    tiers: [
      { cooldown: 7, bolts: 6, damage: 90, pierce: false, volleys: 1, note: 'Six bolts.' },
      { cooldown: 6.6, bolts: 9, damage: 110, pierce: false, volleys: 1, note: 'Nine bolts.' },
      { cooldown: 6.2, bolts: 10, damage: 130, pierce: true, volleys: 1, note: 'Bolts fly through their targets.' },
      { cooldown: 5.8, bolts: 12, damage: 160, pierce: true, volleys: 1, note: 'A dozen heavy bolts.' },
      { cooldown: 5.4, bolts: 12, damage: 170, pierce: true, volleys: 2, note: 'Two volleys in quick succession.' },
      { cooldown: 5, bolts: 14, damage: 200, pierce: true, volleys: 2, note: 'Fourteen bolts a volley.' },
      { cooldown: 4.5, bolts: 16, damage: 230, pierce: true, volleys: 3, note: 'A storm of bolts: three volleys of sixteen.' },
    ],
  },
  {
    id: 'bell', name: 'Storm Bell', slot: 'passive', kind: 'chain', target: 'tough', enabled: true,
    unlockLevel: 41, cheesePrice: 22, goldScale: 1.15,
    desc: 'On its own, lightning strikes the toughest raider and jumps to its neighbours.',
    tiers: [
      { cooldown: 9, damage: 280, jumps: 2, jumpRange: 180, falloff: 0.6, stun: 0, strikes: 1, note: 'One bolt, two jumps.' },
      { cooldown: 8.6, damage: 380, jumps: 3, jumpRange: 190, falloff: 0.65, stun: 0, strikes: 1, note: 'A stronger bolt, three jumps.' },
      { cooldown: 8.2, damage: 480, jumps: 4, jumpRange: 200, falloff: 0.7, stun: 0.8, strikes: 1, note: 'Whoever survives is dazed.' },
      { cooldown: 7.8, damage: 600, jumps: 5, jumpRange: 220, falloff: 0.75, stun: 1, strikes: 1, note: 'Five jumps.' },
      { cooldown: 7.4, damage: 720, jumps: 6, jumpRange: 240, falloff: 0.78, stun: 1.2, strikes: 1, note: 'Six jumps.' },
      { cooldown: 7, damage: 860, jumps: 7, jumpRange: 260, falloff: 0.8, stun: 1.4, strikes: 1, note: 'A whole storm.' },
      { cooldown: 6.5, damage: 1000, jumps: 8, jumpRange: 300, falloff: 0.82, stun: 1.6, strikes: 2, note: 'Twin storm: two bolts strike at once.' },
    ],
  },
  {
    id: 'catapult', name: 'Pinecone Catapult', slot: 'passive', kind: 'lob', target: 'crowd', enabled: true,
    unlockLevel: 60, cheesePrice: 28, goldScale: 1.2,
    desc: 'Lobs pinecones on the thickest group on its own.',
    tiers: [
      { cooldown: 6, cones: 1, radius: 90, damage: 120, stun: 0, note: 'One pinecone.' },
      { cooldown: 5.7, cones: 1, radius: 105, damage: 160, stun: 0, note: 'A bigger cone.' },
      { cooldown: 5.4, cones: 2, radius: 105, damage: 170, stun: 0, note: 'Two cones a throw.' },
      { cooldown: 5.1, cones: 2, radius: 120, damage: 210, stun: 0, note: 'Heavy fir cones.' },
      { cooldown: 4.8, cones: 3, radius: 125, damage: 240, stun: 0, note: 'Three cones a throw.' },
      { cooldown: 4.5, cones: 3, radius: 140, damage: 290, stun: 0, note: 'Stone pine cones.' },
      { cooldown: 4, cones: 5, radius: 150, damage: 340, stun: 1, note: 'Five golden cones that daze: the crowd is buried.' },
    ],
  },
  {
    id: 'hive', name: 'Hornet Hive', slot: 'passive', kind: 'swarm', target: 'front', enabled: true,
    unlockLevel: 80, cheesePrice: 36, goldScale: 1.4,
    desc: 'On its own, a swarm of hornets flies out and stings the raiders closest to the gate.',
    tiers: [
      { cooldown: 7, hornets: 2, damage: 30, stings: 3, note: 'Two hornets.' },
      { cooldown: 6.6, hornets: 3, damage: 35, stings: 3, note: 'Three hornets.' },
      { cooldown: 6.2, hornets: 3, damage: 45, stings: 4, note: 'Sharper stings, more of them.' },
      { cooldown: 5.8, hornets: 4, damage: 50, stings: 4, note: 'Four hornets.' },
      { cooldown: 5.4, hornets: 5, damage: 60, stings: 5, note: 'Five angry hornets.' },
      { cooldown: 5, hornets: 6, damage: 70, stings: 5, note: 'Six hornets.' },
      { cooldown: 4.5, hornets: 8, damage: 85, stings: 6, note: 'The whole hive swarms out.' },
    ],
  },

  // ----- Gate (above the gate): close defence -----
  {
    id: 'mortar', name: 'Gate Mortar', slot: 'gate', kind: 'shell', target: 'front', enabled: true,
    unlockLevel: 4, cheesePrice: 4, goldScale: 0.9,
    desc: 'Lobs a shell at the raider closest to the gate.',
    tiers: [
      { cooldown: 6, effect: 'blast', radius: 95, damage: 150, seconds: 0, shells: 1, shatterSpread: 0, note: 'One shell.' },
      { cooldown: 5.8, effect: 'blast', radius: 105, damage: 230, seconds: 0, shells: 1, shatterSpread: 0, note: 'A bigger charge.' },
      { cooldown: 5.6, effect: 'blast', radius: 100, damage: 240, seconds: 0, shells: 2, shatterSpread: 0, note: 'Two shells, one behind the other.' },
      { cooldown: 5.3, effect: 'blast', radius: 105, damage: 300, seconds: 0, shells: 3, shatterSpread: 0, note: 'Three shells.' },
      { cooldown: 5, effect: 'blast', radius: 115, damage: 380, seconds: 0, shells: 4, shatterSpread: 0, note: 'Four shells.' },
      { cooldown: 4.7, effect: 'blast', radius: 125, damage: 460, seconds: 0, shells: 4, shatterSpread: 0, note: 'Heavier charges.' },
      { cooldown: 4.4, effect: 'blast', radius: 140, damage: 560, seconds: 0, shells: 6, shatterSpread: 0, note: 'A full battery: six shells up the column.' },
    ],
  },
  {
    id: 'thorns', name: 'Hedgehog Gate', slot: 'gate', kind: 'thorns', target: 'none', enabled: true,
    unlockLevel: 20, cheesePrice: 10, goldScale: 0.9,
    desc: 'Spikes on the gate hurt whoever strikes it. Tap to burst them outwards.',
    tiers: [
      { cooldown: 12, reflect: 12, burstDamage: 120, burstReach: 130, burstStun: 0, note: 'Raiders hurt themselves on the gate.' },
      { cooldown: 11.5, reflect: 20, burstDamage: 180, burstReach: 145, burstStun: 0, note: 'Longer spikes.' },
      { cooldown: 11, reflect: 30, burstDamage: 250, burstReach: 160, burstStun: 0, note: 'Barbed spikes.' },
      { cooldown: 10.5, reflect: 42, burstDamage: 330, burstReach: 180, burstStun: 0.8, note: 'Steel spikes: the burst dazes.' },
      { cooldown: 10, reflect: 58, burstDamage: 430, burstReach: 200, burstStun: 1, note: 'Longer steel.' },
      { cooldown: 9.5, reflect: 75, burstDamage: 540, burstReach: 220, burstStun: 1.2, note: 'A forest of spikes.' },
      { cooldown: 9, reflect: 100, burstDamage: 680, burstReach: 260, burstStun: 1.6, note: 'Nobody touches this gate twice: a ring of steel.' },
    ],
  },
  {
    id: 'alphorn', name: 'Alphorn', slot: 'gate', kind: 'push', target: 'none', enabled: true,
    unlockLevel: 35, cheesePrice: 18, goldScale: 1,
    desc: 'One mighty note throws every raider near the keep back down the road.',
    tiers: [
      { cooldown: 14, reach: 420, push: 260, damage: 20, hitsAir: false, note: 'Blows back whoever stands close to the gate.' },
      { cooldown: 13, reach: 520, push: 320, damage: 40, hitsAir: false, note: 'Louder: reaches further and throws them further.' },
      { cooldown: 12, reach: 620, push: 380, damage: 60, hitsAir: true, note: 'Balloons and crows are blown back too.' },
      { cooldown: 11, reach: 740, push: 440, damage: 90, hitsAir: true, note: 'Half the road flies.' },
      { cooldown: 10, reach: 900, push: 520, damage: 130, hitsAir: true, note: 'A deep, long note.' },
      { cooldown: 9.5, reach: 1050, push: 600, damage: 170, hitsAir: true, note: 'It echoes off the peaks.' },
      { cooldown: 9, reach: 1400, push: 700, damage: 220, hitsAir: true, note: 'The whole valley hears it: the whole road flies.' },
    ],
  },
  {
    id: 'cascade', name: 'Cheese Cascade', slot: 'gate', kind: 'cascade', target: 'none', enabled: true,
    unlockLevel: 52, cheesePrice: 25, goldScale: 1.15,
    desc: 'Hot cheese pours from the gate arch and scalds whoever stands in front of the gate.',
    tiers: [
      { cooldown: 14, halfWidth: 110, seconds: 4, dps: 60, slow: 1, stun: 0, note: 'A scalding pool before the gate.' },
      { cooldown: 13.5, halfWidth: 130, seconds: 4.5, dps: 80, slow: 1, stun: 0, note: 'Hotter and wider.' },
      { cooldown: 13, halfWidth: 140, seconds: 5, dps: 95, slow: 0.7, stun: 0, note: 'Sticky: raiders slow down in it.' },
      { cooldown: 12.5, halfWidth: 165, seconds: 5.5, dps: 115, slow: 0.6, stun: 0, note: 'A longer pool.' },
      { cooldown: 12, halfWidth: 175, seconds: 6, dps: 140, slow: 0.55, stun: 0.6, note: 'The pour dazes whoever it lands on.' },
      { cooldown: 11.5, halfWidth: 200, seconds: 7, dps: 165, slow: 0.5, stun: 0.8, note: 'Boiling cheese.' },
      { cooldown: 11, halfWidth: 260, seconds: 8, dps: 210, slow: 0.4, stun: 1.2, note: 'A cheese waterfall: a long, scalding moat.' },
    ],
  },
  {
    id: 'log', name: 'Battering Log', slot: 'gate', kind: 'swing', target: 'none', enabled: true,
    unlockLevel: 72, cheesePrice: 34, goldScale: 1.3,
    desc: 'A trunk swings out of the gate and knocks raiders back down the road.',
    tiers: [
      { cooldown: 11, reach: 160, damage: 120, push: 200, swings: 1, stun: 0, note: 'One mighty swing.' },
      { cooldown: 10.5, reach: 185, damage: 170, push: 230, swings: 1, stun: 0, note: 'A heavier trunk.' },
      { cooldown: 10, reach: 195, damage: 200, push: 240, swings: 2, stun: 0, note: 'It swings back again.' },
      { cooldown: 9.5, reach: 225, damage: 260, push: 280, swings: 2, stun: 0, note: 'Iron bands: harder hits.' },
      { cooldown: 9, reach: 240, damage: 300, push: 300, swings: 2, stun: 0.8, note: 'Raiders land dazed.' },
      { cooldown: 8.5, reach: 270, damage: 360, push: 340, swings: 3, stun: 1, note: 'Three swings.' },
      { cooldown: 8, reach: 320, damage: 450, push: 400, swings: 4, stun: 1.2, note: 'A great iron-banded trunk: four swings.' },
    ],
  },
];

/** Ground flames deal this much damage per second unless the weapon says otherwise. */
export const FLAME_DPS = 90;
/** Seconds a mortar shell flies, and a comet falls. */
export const SHELL_FLIGHT = 0.6;
export const SKY_FALL = 0.55;

export const weaponById = (id: string): WeaponDef | undefined => WEAPONS.find((w) => w.id === id);
export const activeWeapons = (): WeaponDef[] => WEAPONS.filter((w) => w.enabled);
export const weaponsForSlot = (role: SlotRole): WeaponDef[] => WEAPONS.filter((w) => w.enabled && w.slot === role);

/**
 * True for the weapons that fire on their own whenever they are reloaded (all passive weapons except
 * the Marmot Sentry, which keeps its own rhythm and uses a tap for a burst).
 */
export const firesOnItsOwn = (def: WeaponDef): boolean => def.slot === 'passive' && def.kind !== 'sentry';

/** One tier of a weapon (1 to MAX_TIER, clamped). */
export const tierOf = (def: WeaponDef, tier: number) => def.tiers[Math.max(1, Math.min(def.tiers.length, Math.round(tier) || 1)) - 1];
