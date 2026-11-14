// How a scripted player judges weapons: a rough strength from the table and which weapon of a slot it picks.
// Nothing is bought during a run any more (F2: waves); the buying between runs lives in armoury.ts.
import type { WeaponDef } from '../config/weapons';
import { weaponCheesePrice } from '../modes/unlocks';
import type { BotSkill } from './skills';

/** Most raiders a single shot is counted against when guessing a weapon's strength. */
const hits = (reach: number) => Math.max(1, Math.min(6, reach / 45));

/**
 * A rough strength of a weapon at a tier, read off its table row: expected damage per second of
 * reload, with slowing, stopping and gold counted as a little damage. Only used to rank the weapons
 * of one slot type against each other, the way a player reads the slot window.
 */
export function weaponStrength(def: WeaponDef, tier: number): number {
  const i = Math.max(1, Math.min(def.tiers.length, tier)) - 1;
  const cd = def.tiers[i].cooldown;
  switch (def.kind) {
    case 'roll': { const r = def.tiers[i]; return (r.damage * Math.min(r.maxHits, 6) * r.wheels + r.fireTrail * 90 * 2) / cd; }
    case 'puddle': { const r = def.tiers[i]; return (hits(r.halfWidth * 2) * r.seconds * (r.dps + (1 - r.slow) * 20)) / cd; }
    case 'spikes': { const r = def.tiers[i]; return (hits(r.halfWidth * 2) * (r.damage * r.pulses + r.pin * 20)) / cd; }
    case 'slam': { const r = def.tiers[i]; return (hits(r.halfWidth * 2) * r.damage * r.slams + hits(r.shockRadius) * r.shockStun * 20) / cd; }
    case 'push': { const r = def.tiers[i]; return (hits(r.reach) * (r.damage + r.push * 0.1)) / cd; }
    case 'stop': { const r = def.tiers[i]; return (6 * r.seconds * 20 * (r.hitsAir ? 1.2 : 1)) / cd; }
    case 'sky': { const r = def.tiers[i]; return (hits(r.radius * 2) * (r.damage * (1 + r.shards * 0.5) + r.flameSeconds * 45)) / cd; }
    case 'chain': { const r = def.tiers[i]; return (r.damage * (1 + r.jumps * r.falloff) + r.stun * 20) / cd; }
    case 'gold': { const r = def.tiers[i]; return (r.seconds * (r.factor - 1) * 30) / cd; }
    case 'shell': {
      const r = def.tiers[i];
      const n = hits(r.radius * 2) * r.shells;
      if (r.effect === 'blast') return (n * r.damage) / cd;
      if (r.effect === 'freeze') return (n * r.seconds * 15 + r.shatterSpread) / cd;
      return (n * r.damage * r.seconds) / cd;
    }
    case 'thorns': { const r = def.tiers[i]; return (hits(r.burstReach) * r.burstDamage) / cd + r.reflect * 0.5; }
    case 'volley': { const r = def.tiers[i]; return (r.bolts * r.damage * r.volleys * (r.pierce ? 0.7 : 0.5)) / cd; }
    case 'sentry': { const r = def.tiers[i]; return r.damage / r.every + (r.burst * r.damage) / cd; }
    case 'beacon': { const r = def.tiers[i]; return (hits(r.radius * 2) * r.damage * r.seconds * 0.8 + r.flameSeconds * 45) / cd; }
    case 'drift': { const r = def.tiers[i]; return (hits(r.halfWidth * 2) * r.drifts * r.seconds * (1 - r.slow) * 20 * (r.wholeRoad ? 2 : 1)) / cd; }
    case 'toll': { const r = def.tiers[i]; return (hits(r.radius * 2) * r.tolls * (r.damage + r.stun * 20)) / cd; }
    case 'helper': { const r = def.tiers[i]; return (r.seconds * r.strength * 30) / cd; }
    case 'grip': { const r = def.tiers[i]; return (r.seconds * (r.strength - 1 + (1 - r.lethal)) * 40) / cd; }
    case 'mend': { const r = def.tiers[i]; return ((r.heal + r.regen * r.seconds) * 1500) / cd; }
    case 'lob': { const r = def.tiers[i]; return (hits(r.radius * 2) * r.cones * (r.damage + r.stun * 20)) / cd; }
    case 'swarm': { const r = def.tiers[i]; return (r.hornets * r.damage * r.stings) / cd; }
    case 'cascade': { const r = def.tiers[i]; return (hits(r.halfWidth * 2) * r.seconds * (r.dps + (1 - r.slow) * 20)) / cd; }
    case 'swing': { const r = def.tiers[i]; return (hits(r.reach) * r.swings * (r.damage + r.push * 0.1)) / cd; }
  }
}

/**
 * The weapon a player of this skill puts into a slot of this type, from the ones on offer.
 *   random (Poor): the cheapest to unlock, it takes what it can pay.
 *   order (Mid): the first of the list, the one it already knows (Wheel, Stomper, Comet, Mortar, Bolter).
 *   plan (Great): the strongest by the table at the tier it would get.
 */
export function preferredWeapon(shop: BotSkill['shop'], offered: WeaponDef[], tierOf: (id: string) => number): WeaponDef | null {
  if (offered.length === 0) return null;
  if (shop === 'random') return [...offered].sort((a, b) => weaponCheesePrice(a) - weaponCheesePrice(b))[0];
  if (shop === 'order') return offered[0];
  let best = offered[0];
  for (const w of offered) if (weaponStrength(w, tierOf(w.id)) > weaponStrength(best, tierOf(best.id))) best = w;
  return best;
}
