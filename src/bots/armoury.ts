// Spending between campaign levels for a scripted player, through the progress API only:
// unlocks with cheese (weapons for open slots, then stations), then tiers with gold (hand, castle, weapons in use).
// F2/balance: the bots get real progression logic later (Etappe 4); this keeps them buying sensibly.
import { STATION_IDS } from '../config/keep';
import { SLOTS } from '../config/slots';
import { WEAPONS } from '../config/weapons';
import { buy, quote, type Price, type Target } from '../modes/progress';
import { slotOpen, slotRole, weaponRole } from '../modes/unlocks';
import type { Profile } from '../profile';
import { preferredWeapon } from './shopper';
import { skillOf, type BotSkill } from './skills';

/** One thing bought between levels. */
export interface ArmouryBuy { item: string; tier: number; price: Price }

/** The weapons this player would put into the slots it has, with what the profile owns. */
export function weaponsInUse(profile: Profile, skill: BotSkill, world = 'fondue'): string[] {
  const out: string[] = [];
  SLOTS.forEach((_, i) => {
    if (!slotOpen(profile, world, i)) return;
    const offered = WEAPONS.filter((w) => w.enabled && weaponRole(w) === slotRole(i) && profile.hasWeapon(w.id));
    const w = preferredWeapon(skill.shop, offered, (id) => profile.weaponTier(id));
    if (w) out.push(w.id);
  });
  return out;
}

const label = (t: Target): string => (t.kind === 'weapon' || t.kind === 'station' ? t.id : t.kind);

/**
 * Spends cheese and gold of a profile and returns what was bought.
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
  }
  return bought;
}
