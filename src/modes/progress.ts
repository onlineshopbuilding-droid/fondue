/**
 * Progression in one place (no DOM): what an upgrade or unlock costs, buying it, wearing weapons,
 * and paying out cheese, gold and Raider Crests. The shop, bots, cheats and tests use only these.
 *
 * Targets: a weapon (unlock with cheese, then tiers 2..7 with gold, tier 7 also crests), the castle
 * and the hand (tiers 2..7 with gold, tier 7 also crests), a station (unlock with cheese, then tiers with gold).
 * Every purchase and every level result is saved at once (flushSync).
 */
import { CHEESE, cheeseCount } from '../config/currencies';
import { HANDS } from '../config/hand';
import { CASTLE_TIERS, STATIONS, type StationId } from '../config/keep';
import { SLOT_COUNT } from '../config/slots';
import { TIER_MAX, tierCrests, weaponTierGold } from '../config/tiers';
import { weaponById } from '../config/weapons';
import { DEFAULT_WORLD } from '../config/worlds';
import type { Profile, ProfileData } from '../profile';
import {
  STARTER_WEAPON, dataOf, slotOpen, slotRole, stationAvailable, syncUnlocks, tierCap, weaponAvailable,
  weaponCheesePrice, weaponGoldScale, weaponRole, type ProfileLike,
} from './unlocks';

export type Target =
  | { kind: 'weapon'; id: string }
  | { kind: 'castle' }
  | { kind: 'hand' }
  | { kind: 'station'; id: StationId };

export interface Price { cheese: number; gold: number; crests: number }

/**
 * ok = can be bought now; max = already at the top; locked = the campaign has not reached it yet;
 * cap = the tier cap of this campaign section stops it; cheese/gold/crests = not enough of that;
 * unknown = no such thing.
 */
export type QuoteReason = 'ok' | 'max' | 'locked' | 'cap' | 'cheese' | 'gold' | 'crests' | 'unknown';

export interface Quote {
  target: Target;
  name: string;
  /** unlock = first purchase (cheese), upgrade = next tier. */
  action: 'unlock' | 'upgrade';
  price: Price;
  allowed: boolean;
  reason: QuoteReason;
  /** Tier now (0 = not owned) and after the purchase. */
  fromTier: number;
  toTier: number;
  /** The value that changes, before and after (gate hp, hand strength, tier for weapons and stations). */
  before: number;
  after: number;
  /** One line for the shop about the next tier. */
  note: string;
}

const NO_PRICE: Price = { cheese: 0, gold: 0, crests: 0 };

function finish(d: Readonly<ProfileData>, q: Omit<Quote, 'allowed' | 'reason'>, blocked: QuoteReason | null): Quote {
  let reason: QuoteReason = blocked ?? 'ok';
  if (reason === 'ok') {
    if (d.wallet.cheese < q.price.cheese) reason = 'cheese';
    else if (d.wallet.gold < q.price.gold) reason = 'gold';
    else if (d.wallet.crests < q.price.crests) reason = 'crests';
  }
  return { ...q, allowed: reason === 'ok', reason };
}

/** The price of the next step of a target, whether it can be bought, and why not. */
export function quote(p: ProfileLike, target: Target, world: string = DEFAULT_WORLD): Quote {
  const d = dataOf(p);
  const cap = tierCap(d, world);
  switch (target.kind) {
    case 'weapon': {
      const def = weaponById(target.id);
      const base = { target, name: def?.name ?? target.id, before: 0, after: 0, note: '' };
      if (!def || !def.enabled) return finish(d, { ...base, action: 'unlock', price: NO_PRICE, fromTier: 0, toTier: 0 }, 'unknown');
      const owned = Object.hasOwn(d.keep.weapons, def.id) ? d.keep.weapons[def.id].tier : 0;
      if (owned === 0) {
        const price = { ...NO_PRICE, cheese: weaponCheesePrice(def) };
        const locked = weaponAvailable(d, world, def.id) ? null : 'locked';
        return finish(d, { ...base, action: 'unlock', price, fromTier: 0, toTier: 1, after: 1 }, locked);
      }
      const next = owned + 1;
      const tiers = (def as { tiers?: { note?: string }[] }).tiers;
      const note = tiers?.[next - 1]?.note ?? '';
      const step = { ...base, action: 'upgrade' as const, fromTier: owned, toTier: Math.min(next, TIER_MAX), before: owned, after: Math.min(next, TIER_MAX), note };
      if (owned >= TIER_MAX) return finish(d, { ...step, price: NO_PRICE }, 'max');
      const price = { cheese: 0, gold: weaponTierGold(next, weaponGoldScale(def)), crests: tierCrests(next) };
      return finish(d, { ...step, price }, next > cap ? 'cap' : null);
    }
    case 'castle':
    case 'hand': {
      const isCastle = target.kind === 'castle';
      const now = isCastle ? d.keep.castleTier : d.keep.handTier;
      const table = isCastle ? CASTLE_TIERS : HANDS;
      const value = (tier: number) => (isCastle ? CASTLE_TIERS[tier - 1]?.hp : HANDS[tier - 1]?.strength) ?? 0;
      const nextDef = table[now];
      const name = isCastle ? (nextDef as (typeof CASTLE_TIERS)[number] | undefined)?.name ?? CASTLE_TIERS[now - 1].name : 'Hand';
      const note = isCastle ? (nextDef as (typeof CASTLE_TIERS)[number] | undefined)?.desc ?? '' : (nextDef as (typeof HANDS)[number] | undefined)?.note ?? '';
      const base = { target, name, action: 'upgrade' as const, fromTier: now, toTier: Math.min(now + 1, table.length), before: value(now), note };
      if (!nextDef || now >= TIER_MAX) return finish(d, { ...base, after: value(now), price: NO_PRICE }, 'max');
      const price = { cheese: 0, gold: nextDef.gold, crests: nextDef.crests };
      return finish(d, { ...base, after: value(now + 1), price }, now + 1 > cap ? 'cap' : null);
    }
    case 'station': {
      const def = STATIONS[target.id];
      const base = { target, name: def?.name ?? String(target.id), before: 0, after: 0, note: '' };
      if (!def) return finish(d, { ...base, action: 'unlock', price: NO_PRICE, fromTier: 0, toTier: 0 }, 'unknown');
      const now = d.keep.stations[target.id] ?? 0;
      if (now === 0) {
        const price = { ...NO_PRICE, cheese: def.cheesePrice };
        const locked = stationAvailable(d, world, target.id) ? null : 'locked';
        return finish(d, { ...base, action: 'unlock', price, fromTier: 0, toTier: 1, after: 1, note: def.tiers[0]?.note ?? '' }, locked);
      }
      const nextDef = def.tiers[now];
      const step = { ...base, action: 'upgrade' as const, fromTier: now, toTier: nextDef ? now + 1 : now, before: now, after: nextDef ? now + 1 : now, note: nextDef?.note ?? '' };
      if (!nextDef) return finish(d, { ...step, price: NO_PRICE }, 'max');
      return finish(d, { ...step, price: { ...NO_PRICE, gold: nextDef.gold } }, null);
    }
  }
}

function pay(d: ProfileData, price: Price): void {
  d.wallet.cheese -= price.cheese;
  d.wallet.gold -= price.gold;
  d.wallet.crests -= price.crests;
}

/**
 * Buys the next step of a target if `quote` allows it. Returns the quote it acted on (`allowed`
 * says whether it was bought). A newly unlocked weapon goes into its slot when that is open and empty.
 */
export function buy(profile: Profile, target: Target, world: string = DEFAULT_WORLD): Quote {
  const q = quote(profile, target, world);
  if (!q.allowed) return q;
  profile.edit((d) => {
    pay(d, q.price);
    if (target.kind === 'weapon') {
      d.keep.weapons[target.id] = { tier: q.toTier };
      if (q.action === 'unlock') {
        const def = weaponById(target.id);
        const role = def ? weaponRole(def) : null;
        for (let slot = 0; slot < SLOT_COUNT; slot++) {
          if (slotRole(slot) === role && d.keep.loadout[slot] === null && slotOpen(d, world, slot)) { d.keep.loadout[slot] = target.id; break; }
        }
      }
    } else if (target.kind === 'castle') d.keep.castleTier = q.toTier;
    else if (target.kind === 'hand') d.keep.handTier = q.toTier;
    else d.keep.stations[target.id] = q.toTier;
  });
  profile.flushSync();
  return q;
}

/** Unlocks a weapon with cheese (the first purchase). True if it is owned afterwards. */
export function unlockWeapon(profile: Profile, id: string, world: string = DEFAULT_WORLD): boolean {
  if (profile.hasWeapon(id)) return true;
  return buy(profile, { kind: 'weapon', id }, world).allowed;
}

/**
 * Wears a weapon in a slot, or empties the slot with null. Only an owned weapon of the slot's role
 * fits an open slot; a weapon worn elsewhere moves. The weapon keeps its tier either way.
 */
export function equip(profile: Profile, slot: number, weaponId: string | null, world: string = DEFAULT_WORLD): boolean {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) return false;
  if (weaponId !== null) {
    const def = weaponById(weaponId);
    if (!def || !profile.hasWeapon(weaponId) || weaponRole(def) !== slotRole(slot) || !slotOpen(profile, world, slot)) return false;
  }
  return profile.edit((d) => {
    if (d.keep.loadout[slot] === weaponId) return false;
    if (weaponId !== null) d.keep.loadout = d.keep.loadout.map((id) => (id === weaponId ? null : id));
    d.keep.loadout[slot] = weaponId;
    return true;
  });
}

/** The cheese of a level as a bit mask, from how it ended. Nothing for a lost level. */
export function cheeseMask(result: { won: boolean; gateShare: number; challenges?: [boolean, boolean] | boolean[] }): number {
  if (!result.won) return 0;
  const b = CHEESE.bits;
  let mask = 1 << b.win;
  if (result.gateShare > CHEESE.gateHalf) mask |= 1 << b.gateHalf;
  if (result.gateShare > CHEESE.gateHigh) mask |= 1 << b.gateHigh;
  if (result.challenges?.[0]) mask |= 1 << b.challenge1;
  if (result.challenges?.[1]) mask |= 1 << b.challenge2;
  return mask;
}

/** The cheese mask already earned in a level. */
export function levelCheese(p: ProfileLike, world: string, level: number): number {
  const w = dataOf(p).worlds[world];
  return w && Object.hasOwn(dataOf(p).worlds, world) ? w.cheese[String(level)] ?? 0 : 0;
}

/**
 * Pays the cheese of a level result: only bits not set before count. Returns how many cheese are new.
 * Saved at once.
 */
export function applyLevelCheese(profile: Profile, world: string, level: number, mask: number): number {
  const before = levelCheese(profile, world, level);
  const fresh = mask & ~before & ((1 << CHEESE.perLevel) - 1);
  const n = cheeseCount(fresh);
  if (n === 0) return 0;
  profile.world(world);
  profile.edit((d) => {
    d.worlds[world].cheese[String(level)] = before | fresh;
    d.wallet.cheese += n;
    d.earned.cheese += n;
  });
  profile.flushSync();
  return n;
}

function addAmount(profile: Profile, kind: 'gold' | 'crests' | 'cheese', n: number): number {
  const amount = Number.isFinite(n) ? Math.floor(n) : 0;
  if (amount <= 0) return 0;
  profile.edit((d) => {
    d.wallet[kind] += amount;
    d.earned[kind] += amount;
  });
  return amount;
}

/** Pays gold for good (end of a run, in every mode). Returns the amount added. */
export const addGold = (profile: Profile, n: number): number => addAmount(profile, 'gold', n);

/** Pays Raider Crests for good. Returns the amount added. */
export const addCrests = (profile: Profile, n: number): number => addAmount(profile, 'crests', n);

/** Developer cheat: free cheese. Marks the profile as changed by cheats. */
export function cheatCheese(profile: Profile, n: number): number {
  const added = addAmount(profile, 'cheese', n);
  if (added > 0) profile.noteCheat(`cheese +${added}`);
  return added;
}

/** End of a run: saves at once. Call after paying everything a level brought. */
export function levelEnded(profile: Profile): void {
  profile.flushSync();
}

/** The tutorial is done: remembered, and the free Rolling Wheel is owned and worn in slot 0. */
export function completeTutorial(profile: Profile, world: string = DEFAULT_WORLD): void {
  profile.markTutorialDone();
  syncUnlocks(profile, world);
  profile.flushSync();
}

export { STARTER_WEAPON };
