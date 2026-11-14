/**
 * Developer cheats (F2), pure and without DOM: the developer menu calls only these. Unlike other
 * developer tools they change the profile for good, on purpose, so Tim and Lenny can test later parts
 * of the game. Every cheat that changes progress notes itself with `Profile.noteCheat`, which sets
 * `cheats.used`: the profile is then shown as "Cheats used" in the developer menu and in Options.
 * Changing tuning, switches or weapon values during a run is not a cheat: such runs stay developer
 * runs and bring nothing (E-059).
 */
import { SECOND_HAND_FLAG } from '../config/flags';
import { CASTLE_TIERS, STATIONS, STATION_IDS, type StationId } from '../config/keep';
import { HANDS } from '../config/hand';
import { SLOT_COUNT } from '../config/slots';
import { TIER_MAX, TIER_MIN } from '../config/tiers';
import { WEAPONS, weaponById } from '../config/weapons';
import { worldById } from '../config/worlds';
import type { Profile, ProfileData } from '../profile';
import { dataOf, slotOpen, slotRole, syncUnlocks, unlockLevelOf, weaponRole, type ProfileLike } from './unlocks';

/** The mark of a profile changed by cheats, shown in the developer menu and in Options. */
export const CHEAT_BADGE = 'Cheats used';

/** Has a cheat ever changed this profile? */
export const cheatsUsed = (p: ProfileLike): boolean => dataOf(p).cheats.used === true;

/** The badge text for a cheated profile, or null. */
export const cheatBadge = (p: ProfileLike): string | null => (cheatsUsed(p) ? CHEAT_BADGE : null);

const whole = (n: number): number => (Number.isFinite(n) ? Math.floor(n) : 0);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, whole(n)));

function give(profile: Profile, kind: 'cheese' | 'gold' | 'crests', n: number): number {
  const amount = whole(n);
  if (amount <= 0) return 0;
  profile.edit((d) => { d.wallet[kind] += amount; });
  profile.noteCheat(`${kind} +${amount}`);
  profile.flushSync();
  return amount;
}

/** Free gold. Not counted as earned. Returns the amount added. */
export const giveGold = (profile: Profile, n: number): number => give(profile, 'gold', n);
/** Free cheese. Not counted as earned (the 500-cheese check stays honest). */
export const giveCheese = (profile: Profile, n: number): number => give(profile, 'cheese', n);
/** Free Raider Crests. Not counted as earned. */
export const giveCrests = (profile: Profile, n: number): number => give(profile, 'crests', n);

/** Levels of a world's campaign (100 if the table cannot be read). */
export function campaignLength(world: string): number {
  try {
    return worldById(world).campaign.length || CAMPAIGN_FALLBACK;
  } catch {
    return CAMPAIGN_FALLBACK;
  }
}
const CAMPAIGN_FALLBACK = 100;

/** Marks campaign levels 1..`upTo` as won, so their slots, weapons and stations become available. */
export function unlockLevels(profile: Profile, world: string, upTo: number): number {
  const last = clamp(upTo, 0, campaignLength(world));
  let added = 0;
  for (let l = 1; l <= last; l++) if (profile.markLevelDone(world, l)) added++;
  profile.noteCheat(`levels 1-${last} won`);
  syncUnlocks(profile, world);
  profile.flushSync();
  return added;
}

/** Wears a weapon in the first open, empty slot of its role. */
function wearIfFree(d: ProfileData, world: string, id: string): void {
  const def = weaponById(id);
  const role = def ? weaponRole(def) : null;
  if (!role || d.keep.loadout.includes(id)) return;
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    if (slotRole(slot) === role && d.keep.loadout[slot] === null && slotOpen(d, world, slot)) { d.keep.loadout[slot] = id; return; }
  }
}

/** Owns a weapon at this tier (1..7), even before its level, and wears it if its slot is open and empty. */
export function setWeaponTier(profile: Profile, world: string, id: string, tier: number): boolean {
  if (!weaponById(id)) return false;
  const t = clamp(tier, TIER_MIN, TIER_MAX);
  profile.edit((d) => {
    d.keep.weapons[id] = { tier: t };
    wearIfFree(d, world, id);
  });
  profile.noteCheat(`weapon ${id} tier ${t}`);
  profile.flushSync();
  return true;
}

/** Sets the castle (gate) tier, 1..7. */
export function setCastleTier(profile: Profile, tier: number): number {
  const t = clamp(tier, TIER_MIN, Math.min(TIER_MAX, CASTLE_TIERS.length));
  profile.edit((d) => { d.keep.castleTier = t; });
  profile.noteCheat(`castle tier ${t}`);
  profile.flushSync();
  return t;
}

/** Sets the hand tier, 1..7 (7 opens the second hand, C9). */
export function setHandTier(profile: Profile, tier: number): number {
  const t = clamp(tier, TIER_MIN, Math.min(TIER_MAX, HANDS.length));
  profile.edit((d) => { d.keep.handTier = t; });
  profile.noteCheat(`hand tier ${t}`);
  profile.flushSync();
  return t;
}

/** Sets a station's tier: 0 = not unlocked, otherwise 1..its number of tiers. */
export function setStationTier(profile: Profile, id: StationId, tier: number): number {
  const def = STATIONS[id];
  if (!def) return 0;
  const t = clamp(tier, 0, def.tiers.length);
  profile.edit((d) => { d.keep.stations[id] = t; });
  profile.noteCheat(`station ${id} tier ${t}`);
  profile.flushSync();
  return t;
}

/** Every slot, weapon and station, as if the campaign were far along (tiers stay as they are). */
export function unlockEverything(profile: Profile, world: string): void {
  let last = 0;
  for (let slot = 0; slot < SLOT_COUNT; slot++) last = Math.max(last, unlockLevelOf(world, 'slot', slot) ?? 0);
  for (let l = 1; l <= last; l++) profile.markLevelDone(world, l);
  profile.edit((d) => {
    for (const w of WEAPONS) {
      if (!w.enabled) continue;
      if (!Object.hasOwn(d.keep.weapons, w.id)) d.keep.weapons[w.id] = { tier: 1 };
      wearIfFree(d, world, w.id);
    }
    for (const s of STATION_IDS) d.keep.stations[s] = Math.max(1, d.keep.stations[s] ?? 0);
  });
  profile.noteCheat('unlock everything');
  syncUnlocks(profile, world);
  profile.flushSync();
}

/** Erases the whole profile (the menu asks first). The new profile is not marked: nothing is cheated in it. */
export function resetProfile(profile: Profile, world: string): void {
  profile.reset();
  syncUnlocks(profile, world);
  profile.flushSync();
}

/**
 * The developer switch that simulates the second hand on the laptop (C9), stored as
 * `settings.flags.secondHand` ('on' / 'off'). Not a cheat: it changes no progress, but like every
 * switch it makes runs developer runs.
 */
export function setSecondHandSimulated(profile: Profile, on: boolean): void {
  profile.updateSettings({ flags: { [SECOND_HAND_FLAG]: on ? 'on' : 'off' } });
  profile.flushSync();
}
