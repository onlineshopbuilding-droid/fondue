// Spending between runs for a scripted player, through the progress API only (nothing is bought during a run):
// unlocks with cheese (weapons for open slots, then stations), then tiers with gold (hand, castle, the weapons it
// plays or plans to play), and the weapon it likes best in each open slot is worn.
// Etappe 4 (balance): every bot has a personality (a taste per weapon from a seed), so different runs build
// different keeps and several weapons per slot get played (C3). A "no upgrades" player never spends gold.
import { STATION_IDS } from '../config/keep';
import { SLOTS } from '../config/slots';
import { WEAPONS, type WeaponDef } from '../config/weapons';
import { buy, equip, quote, type Price, type Target } from '../modes/progress';
import { slotOpen, slotRole, tierCap, weaponRole } from '../modes/unlocks';
import type { Profile } from '../profile';
import { weaponStrength } from './shopper';
import { skillOf, type BotSkill } from './skills';

/** One thing bought between levels. */
export interface ArmouryBuy { item: string; tier: number; price: Price }

/** How a player spends: its taste in weapons and whether it buys tiers with gold at all. */
export interface SpendStyle {
  /** Seed of the taste; 0 = no taste, every weapon counts as it reads in the table. */
  personality: number;
  /** False: unlocks and wears weapons, but never spends gold (the "no upgrades" player of B5). */
  upgrades: boolean;
}

export const DEFAULT_STYLE: SpendStyle = { personality: 0, upgrades: true };

/** How much a player likes a weapon beyond its numbers, between 0.55 and 1.6; the same for the same personality. */
export function taste(personality: number, weaponId: string): number {
  if (!personality) return 1;
  let h = Math.imul(personality, 2654435761);
  for (const ch of weaponId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  const u = ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  return 0.55 + 1.05 * u;
}

/** Strength of a weapon once raised as far as the campaign allows now, as a player reading the shop judges it. */
const potential = (profile: Profile, def: WeaponDef, world: string) => weaponStrength(def, tierCap(profile, world));

/**
 * The weapon this player aims for in each slot (null for a closed slot or none owned), from what it owns:
 *   random (Poor): the one it likes, numbers do not matter.
 *   order (Mid): the best by taste and potential, but it only changes for one clearly (25 %) better than the one worn.
 *   plan (Great): the best by taste and potential.
 */
export function plannedLoadout(profile: Profile, skill: BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): (string | null)[] {
  return SLOTS.map((_, i) => {
    if (!slotOpen(profile, world, i)) return null;
    const offered = WEAPONS.filter((w) => w.enabled && weaponRole(w) === slotRole(i) && profile.hasWeapon(w.id));
    if (offered.length === 0) return null;
    // The table numbers of different kinds of weapon are only rough, so a player weighs them softly against taste:
    // Mid reads them loosely, Great more closely, and a weapon at half the best number or less only counts as half.
    const top = Math.max(...offered.map((w) => potential(profile, w, world)), 1e-9);
    const weight = skill.shop === 'random' ? 0 : skill.shop === 'order' ? 0.35 : 0.6;
    const score = (w: WeaponDef) => taste(style.personality, w.id) * Math.pow(Math.max(0.5, potential(profile, w, world) / top), weight);
    let best = offered[0];
    for (const w of offered) if (score(w) > score(best)) best = w;
    const worn = profile.data.keep.loadout[i];
    const wornDef = offered.find((w) => w.id === worn);
    if (skill.shop === 'order' && wornDef && score(best) < score(wornDef) * 1.25) return wornDef.id;
    return best.id;
  });
}

/**
 * What it actually wears: the planned weapon once it is within one tier of the one worn now (a player does
 * not swap a tier-5 weapon for a fresh tier-1 one), otherwise the worn one stays while the new one is raised.
 */
export function preferredLoadout(profile: Profile, skill: BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): (string | null)[] {
  const plan = plannedLoadout(profile, skill, world, style);
  return plan.map((id, i) => {
    const worn = profile.data.keep.loadout[i];
    if (!id || !worn || worn === id || !profile.hasWeapon(worn)) return id;
    return profile.weaponTier(id) >= profile.weaponTier(worn) - 1 || !style.upgrades ? id : worn;
  });
}

/** The weapons this player plays or plans to play, with what the profile owns. */
export function weaponsInUse(profile: Profile, skill: BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): string[] {
  const ids = [...preferredLoadout(profile, skill, world, style), ...plannedLoadout(profile, skill, world, style)];
  return [...new Set(ids.filter((id): id is string => id !== null))];
}

/** Wears the preferred weapon in every open slot. */
export function equipPreferred(profile: Profile, skill: BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): void {
  preferredLoadout(profile, skill, world, style).forEach((id, slot) => { if (id) equip(profile, slot, id, world); });
}

const label = (t: Target): string => (t.kind === 'weapon' || t.kind === 'station' ? t.id : t.kind);

/**
 * Spends cheese, gold and crests of a profile and returns what was bought.
 *   Cheese: every weapon and station it can unlock, cheapest first.
 *   Gold (unless style.upgrades is off): the cheapest step among hand, castle and the weapons it plays or plans, until nothing fits.
 */
export function spendProgress(profile: Profile, skillArg: string | BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): ArmouryBuy[] {
  const skill = skillOf(skillArg);
  const bought: ArmouryBuy[] = [];
  for (let guard = 0; guard < 400; guard++) {
    const targets: Target[] = [
      ...WEAPONS.filter((w) => w.enabled && !profile.hasWeapon(w.id)).map((w): Target => ({ kind: 'weapon', id: w.id })),
      ...STATION_IDS.map((id): Target => ({ kind: 'station', id })),
      ...(style.upgrades ? [{ kind: 'hand' } as Target, { kind: 'castle' } as Target, ...weaponsInUse(profile, skill, world, style).map((id): Target => ({ kind: 'weapon', id }))] : []),
    ];
    const options = targets.map((t) => quote(profile, t, world)).filter((q) => q.allowed && (style.upgrades || q.action === 'unlock'));
    if (options.length === 0) break;
    options.sort((a, b) => (a.price.cheese - b.price.cheese) || (a.price.gold - b.price.gold));
    const pick = options.find((q) => q.price.cheese > 0) ?? options[0];
    const done = buy(profile, pick.target, world);
    if (!done.allowed) break;
    bought.push({ item: label(pick.target), tier: done.toTier, price: done.price });
    // A new weapon may change the plan; wear what it prefers before deciding which tiers to raise.
    if (pick.target.kind === 'weapon' && done.action === 'unlock') equipPreferred(profile, skill, world, style);
  }
  equipPreferred(profile, skill, world, style);
  return bought;
}

/** Gold still wanted: the cheapest step the player would buy that only lacks gold (0 when gold is not what holds it back). */
export function goldWanted(profile: Profile, skillArg: string | BotSkill, world = 'fondue', style: SpendStyle = DEFAULT_STYLE): number {
  if (!style.upgrades) return 0;
  const skill = skillOf(skillArg);
  const targets: Target[] = [{ kind: 'hand' }, { kind: 'castle' }, ...weaponsInUse(profile, skill, world, style).map((id): Target => ({ kind: 'weapon', id }))];
  const short = targets.map((t) => quote(profile, t, world)).filter((q) => q.reason === 'gold');
  return short.length ? Math.min(...short.map((q) => q.price.gold)) : 0;
}
