// Spending between runs for a scripted player, through the progress API only (nothing is bought during a run):
// unlocks with cheese (weapons for open slots, then stations), then tiers with gold (hand, castle, weapons in use),
// and the preferred weapon of each open slot is worn.
// F2/balance: the bots get real progression logic later (Etappe 4); this keeps them buying sensibly.
import { STATION_IDS } from '../config/keep';
import { SLOTS } from '../config/slots';
import { WEAPONS } from '../config/weapons';
import { buy, equip, quote, type Price, type Target } from '../modes/progress';
import { slotOpen, slotRole, weaponRole } from '../modes/unlocks';
import type { Profile } from '../profile';
import { preferredWeapon } from './shopper';
import { skillOf, type BotSkill } from './skills';

/** One thing bought between levels. */
export interface ArmouryBuy { item: string; tier: number; price: Price }

/** The weapon this player would put into each slot (null for a closed slot or none owned). */
export function preferredLoadout(profile: Profile, skill: BotSkill, world = 'fondue'): (string | null)[] {
  return SLOTS.map((_, i) => {
    if (!slotOpen(profile, world, i)) return null;
    const offered = WEAPONS.filter((w) => w.enabled && weaponRole(w) === slotRole(i) && profile.hasWeapon(w.id));
    return preferredWeapon(skill.shop, offered, (id) => profile.weaponTier(id))?.id ?? null;
  });
}

/** The weapons this player would put into the slots it has, with what the profile owns. */
export function weaponsInUse(profile: Profile, skill: BotSkill, world = 'fondue'): string[] {
  return preferredLoadout(profile, skill, world).filter((id): id is string => id !== null);
}

/** Wears the preferred weapon in every open slot. */
export function equipPreferred(profile: Profile, skill: BotSkill, world = 'fondue'): void {
  preferredLoadout(profile, skill, world).forEach((id, slot) => { if (id) equip(profile, slot, id, world); });
}

const label = (t: Target): string => (t.kind === 'weapon' || t.kind === 'station' ? t.id : t.kind);

/**
 * Spends cheese, gold and crests of a profile and returns what was bought.
 *   Cheese: every weapon and station it can unlock, cheapest first.
 *   Gold: the cheapest step among hand, castle and the weapons in use, until nothing fits.
 */
export function spendProgress(profile: Profile, skillArg: string | BotSkill, world = 'fondue'): ArmouryBuy[] {
  const skill = skillOf(skillArg);
  const bought: ArmouryBuy[] = [];
  for (let guard = 0; guard < 400; guard++) {
    const targets: Target[] = [
      ...WEAPONS.filter((w) => w.enabled && !profile.hasWeapon(w.id)).map((w): Target => ({ kind: 'weapon', id: w.id })),
      ...STATION_IDS.map((id): Target => ({ kind: 'station', id })),
      { kind: 'hand' }, { kind: 'castle' },
      ...weaponsInUse(profile, skill, world).map((id): Target => ({ kind: 'weapon', id })),
    ];
    const options = targets.map((t) => quote(profile, t, world)).filter((q) => q.allowed);
    if (options.length === 0) break;
    options.sort((a, b) => (a.price.cheese - b.price.cheese) || (a.price.gold - b.price.gold));
    const pick = options.find((q) => q.price.cheese > 0) ?? options[0];
    const done = buy(profile, pick.target, world);
    if (!done.allowed) break;
    bought.push({ item: label(pick.target), tier: done.toTier, price: done.price });
    // A new weapon may beat the one worn; wear it before deciding which tiers to raise.
    if (pick.target.kind === 'weapon' && done.action === 'unlock') equipPreferred(profile, skill, world);
  }
  equipPreferred(profile, skill, world);
  return bought;
}
