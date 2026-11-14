// The market between days for a scripted player: what it buys and in which order, by skill.
// It reads only what the market screen shows (prices, locks, what stands on the keep) and buys with `buy`.
import { SLOTS } from '../config/slots';
import { weaponsForSlot, type SlotRole, type WeaponDef } from '../config/weapons';
import { runWeaponGold } from '../sim/shop';
import type { Sim } from '../sim/sim';
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
 *   random (Poor): the cheapest, it buys what it can pay.
 *   order (Mid): the first of the list, the one it already knows (Wheel, Stomper, Comet, Mortar, Bolter).
 *   plan (Great): the strongest by the table at the tier it would get.
 */
export function preferredWeapon(shop: BotSkill['shop'], offered: WeaponDef[], tierOf: (id: string) => number): WeaponDef | null {
  if (offered.length === 0) return null;
  if (shop === 'random') return [...offered].sort((a, b) => runWeaponGold(a) - runWeaponGold(b))[0];
  if (shop === 'order') return offered[0];
  let best = offered[0];
  for (const w of offered) if (weaponStrength(w, tierOf(w.id)) > weaponStrength(best, tierOf(best.id))) best = w;
  return best;
}

/** Steps of a shopping list. 'slot:N' fills slot N, 'up:N' raises the weapon in slot N by one tier. */
type Step = string;

const ups = (slots: number[], rounds: number): Step[] => {
  const out: Step[] = [];
  for (let r = 0; r < rounds; r++) for (const s of slots) out.push(`up:${s}`);
  return out;
};

/** A sensible order for a player who buys whatever is next and in reach. */
const ORDER_MID: Step[] = [
  'station:cauldron', 'slot:0', 'gate', 'slot:1', 'slot:3', 'slot:2', 'gate', 'up:0', 'slot:4', 'up:1', 'up:3', 'gate',
  'up:2', 'up:4', 'hand', ...ups([0, 1, 3, 2, 4], 1), 'hand', 'gate', 'station:perch', ...ups([0, 1, 3, 2, 4], 2),
];
/** Offerings first, then area damage, gates when they are due; saves for the next item instead of spending on whatever is in reach. */
const ORDER_GREAT: Step[] = [
  'station:cauldron', 'slot:0', 'slot:3', 'gate', 'slot:1', 'up:0', 'slot:2', 'up:3', 'gate', 'slot:4', 'up:1', 'hand',
  'up:2', 'up:0', 'up:3', 'hand', 'gate', 'up:4', 'up:1', 'station:perch', ...ups([0, 3, 1, 2, 4], 2), 'gate',
];

export class BotShopper {
  /** Weapon chosen per slot by a random shopper, so it does not change its mind every day. */
  private randomPick: (string | null)[] = [null, null, null, null, null];
  /** Every purchase of this shopper, in order. */
  readonly bought: string[] = [];

  constructor(private p: number, private skill: BotSkill, private rand: () => number) {}

  private buy(sim: Sim, item: string): boolean {
    if (sim.quote(item).reason !== 'ok') return false;
    sim.command({ k: 'buy', p: this.p, item });
    this.bought.push(item);
    return true;
  }

  private offeredFor(sim: Sim, slot: number): WeaponDef[] {
    const type: SlotRole = SLOTS[slot].role;
    return weaponsForSlot(type).filter((w) => {
      const r = sim.quote(`weapon:${slot}:${w.id}`).reason;
      return r !== 'locked' && r !== 'unknown';
    });
  }

  private tierIn(sim: Sim) {
    return (id: string) => sim.loadout.weaponTier[id] ?? sim.rules.weapons[id]?.fixedTier ?? 1;
  }

  /** Turns a step into a market item, or null when the step has nothing left to do. */
  private resolve(sim: Sim, step: Step): string | null {
    const [kind, n] = step.split(':');
    if (kind === 'slot') {
      const slot = Number(n);
      if (!sim.rules.slotsOpen[slot] || sim.loadout.slotWeapon[slot] !== null) return null;
      const w = preferredWeapon(this.skill.shop, this.offeredFor(sim, slot), this.tierIn(sim));
      return w ? `weapon:${slot}:${w.id}` : null;
    }
    if (kind === 'up') {
      const id = sim.loadout.slotWeapon[Number(n)];
      return id ? `upgrade:${id}` : null;
    }
    return step;
  }

  shop(sim: Sim) {
    if (this.skill.shop === 'random') { this.shopRandom(sim); return; }
    const order = this.skill.shop === 'order' ? ORDER_MID : ORDER_GREAT;
    const saves = this.skill.shop === 'plan';
    // Tier steps already done count off the list: the first 'up:0' is the step to tier 2, and so on.
    const done: Record<string, number> = {};
    for (const step of order) {
      const item = this.resolve(sim, step);
      if (!item) continue;
      if (item.startsWith('upgrade:')) {
        const id = item.slice(8);
        const k = (done[id] ?? 0) + 1;
        done[id] = k;
        // Only take this step when the weapon is still below the tier it marks.
        if ((sim.loadout.weaponTier[id] ?? 1) > k) continue;
      }
      if (step === 'gate') {
        done.gate = (done.gate ?? 0) + 1;
        if (sim.loadout.gateTier >= done.gate) continue;
      }
      if (step === 'hand') {
        done.hand = (done.hand ?? 0) + 1;
        if (Math.max(...sim.loadout.handTier) > done.hand) continue;
      }
      const q = sim.quote(item);
      if (q.reason === 'ok') { this.buy(sim, item); continue; }
      // Saves gold for the next item; when offerings are what is missing, saving gold would not help.
      if (saves && q.reason === 'gold') return;
    }
    // The list is done: what is left goes to the cheapest open step, again and again.
    for (let guard = 0; guard < 40; guard++) {
      const left = this.leftovers(sim).filter((i) => sim.quote(i).reason === 'ok');
      if (left.length === 0) return;
      left.sort((a, b) => sim.quote(a).gold - sim.quote(b).gold);
      if (!this.buy(sim, left[0])) return;
    }
  }

  private leftovers(sim: Sim): string[] {
    const out = ['gate', 'hand', 'station:cauldron', 'station:perch'];
    for (let slot = 0; slot < SLOTS.length; slot++) {
      const id = sim.loadout.slotWeapon[slot];
      if (id) out.push(`upgrade:${id}`);
      else { const item = this.resolve(sim, `slot:${slot}`); if (item) out.push(item); }
    }
    return out;
  }

  /** Buys whatever is in reach, in a shuffled order. */
  private shopRandom(sim: Sim) {
    const items = ['gate', 'hand', 'station:cauldron', 'station:perch'];
    for (let slot = 0; slot < SLOTS.length; slot++) {
      const id = sim.loadout.slotWeapon[slot];
      if (id) { items.push(`upgrade:${id}`); continue; }
      if (!sim.rules.slotsOpen[slot]) continue;
      let pick = this.randomPick[slot];
      const offered = this.offeredFor(sim, slot);
      if (!pick || !offered.some((w) => w.id === pick)) {
        pick = offered.length ? offered[Math.floor(this.rand() * offered.length)].id : null;
        this.randomPick[slot] = pick;
      }
      if (pick) items.push(`weapon:${slot}:${pick}`);
    }
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    for (const item of items) this.buy(sim, item);
  }
}
