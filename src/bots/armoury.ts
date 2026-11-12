// Spending stars between campaign levels for a scripted player: weapon tiers and the hand.
// It buys only what the armoury offers: tiers of unlocked weapons it actually uses, the hand once the campaign allows it.
import { HANDS } from '../config/hand';
import { SLOTS } from '../config/slots';
import { weaponTierPrice } from '../config/stars';
import { MAX_TIER, weaponsForSlot } from '../config/weapons';
import { maxHandTier } from '../modes/unlocks';
import type { Profile } from '../profile';
import { preferredWeapon } from './shopper';
import { skillOf, type BotSkill } from './skills';

/** One thing bought in the armoury. */
export interface ArmouryBuy { item: string; tier: number; stars: number }

/** The weapons this player would put into the slots it has, with what the profile has unlocked. */
export function weaponsInUse(profile: Profile, skill: BotSkill): string[] {
  const out: string[] = [];
  SLOTS.forEach((slot, i) => {
    if (!profile.hasSlot(i)) return;
    const offered = weaponsForSlot(slot.type).filter((w) => profile.hasWeapon(w.id));
    const w = preferredWeapon(skill.shop, offered, (id) => profile.weaponTier(id));
    if (w) out.push(w.id);
  });
  return out;
}

/**
 * Spends the stars of a profile in a sensible way and returns what was bought.
 *   Mid and Great: a stronger hand first once the campaign allows it (they save for it), then
 *   the weapons in use, always the lowest tier first so they rise evenly.
 *   Poor: whatever is cheapest right now, weapon tiers before the hand.
 */
export function spendStars(profile: Profile, skillArg: string | BotSkill, world = 'fondue'): ArmouryBuy[] {
  const skill = skillOf(skillArg);
  const bought: ArmouryBuy[] = [];
  for (let guard = 0; guard < 100; guard++) {
    const handNext = profile.data.handTier + 1;
    const handOpen = handNext <= HANDS.length && handNext <= maxHandTier(profile, world);
    const handPrice = handOpen ? HANDS[handNext - 1].stars : Infinity;
    const used = weaponsInUse(profile, skill).filter((id) => profile.weaponTier(id) < MAX_TIER);
    used.sort((a, b) => profile.weaponTier(a) - profile.weaponTier(b));
    const weapon = used[0] ?? null;
    const weaponPrice = weapon ? weaponTierPrice(profile.weaponTier(weapon) + 1) : Infinity;
    const stars = profile.data.stars;

    let pick: 'hand' | 'weapon' | null = null;
    if (skill.shop === 'random') {
      if (weaponPrice <= stars && weaponPrice <= handPrice) pick = 'weapon';
      else if (handPrice <= stars) pick = 'hand';
    } else if (handOpen) {
      // Saves for the hand: it makes every heavy raider easier.
      if (handPrice <= stars) pick = 'hand';
    } else if (weaponPrice <= stars) pick = 'weapon';
    if (!pick) break;

    if (pick === 'hand') {
      if (!profile.spendStars(handPrice)) break;
      profile.setHandTier(handNext);
      bought.push({ item: 'hand', tier: handNext, stars: handPrice });
    } else {
      const next = profile.weaponTier(weapon!) + 1;
      if (!profile.spendStars(weaponPrice)) break;
      profile.setWeaponTier(weapon!, next);
      bought.push({ item: weapon!, tier: next, stars: weaponPrice });
    }
  }
  return bought;
}
