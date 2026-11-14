/**
 * The market between days: what can be bought under the rules of this run, what it costs, and
 * buying it. `quote` is a pure calculation, so the market screen of host and guest can use it too.
 */
import { CASTLE_TIERS, STATIONS as STATION_DEFS, type StationId } from '../config/keep';
import { HANDS as HAND_TIERS } from '../config/hand';
import { SLOTS } from '../config/slots';
import { weaponTierGold } from '../config/tiers';
import { MAX_TIER, weaponById, type WeaponDef } from '../config/weapons';
import type { SimContext } from './context';
import type { Loadout, RunRules } from './rules';

// F2: remove with the market. In-run prices of the old market, read from the permanent tables
// (no offerings any more), only so the run keeps working until F2 removes buying during a run.
const GATES = CASTLE_TIERS.map((t) => ({ name: t.name, gold: t.gold, offerings: 0, hp: t.hp }));
const STATIONS: Record<StationId, { name: string; gold: number; offerings: number }> = {
  cauldron: { name: STATION_DEFS.cauldron.name, gold: 250, offerings: 0 },
  perch: { name: STATION_DEFS.perch.name, gold: 12000, offerings: 0 },
};
const HANDS = HAND_TIERS.map((h) => ({ gold: h.gold, offerings: 0 }));
/** F2: remove with the market. In-run price of putting a weapon into a slot, and of its next tier. */
export const runWeaponGold = (def: WeaponDef): number => Math.round((def.goldScale * 600) / 50) * 50;
export const runUpgradeGold = (def: WeaponDef, tier: number): number => weaponTierGold(tier, def.goldScale);

export type QuoteReason = 'ok' | 'unknown' | 'owned' | 'locked' | 'max' | 'gold' | 'offerings';

/** What the market says about one item: its name and price, and whether it can be bought right now. */
export interface Quote {
  name: string;
  gold: number;
  offerings: number;
  reason: QuoteReason;
}

const no = (name: string, reason: QuoteReason): Quote => ({ name, gold: 0, offerings: 0, reason });

function afford(q: { name: string; gold: number; offerings: number }, gold: number, offerings: number): Quote {
  return { ...q, reason: gold < q.gold ? 'gold' : offerings < q.offerings ? 'offerings' : 'ok' };
}

/** Is this item allowed in a run that restricts its market (level 1 sells only the cauldron)? */
function allowed(rules: RunRules, item: string): boolean {
  return rules.marketOnly === null || rules.marketOnly.includes(item);
}

/**
 * Names an item ('gate', 'station:<id>', 'weapon:<slot>:<id>', 'upgrade:<id>', 'hand') and tells
 * whether it can be bought with the given purse.
 */
export function quote(rules: RunRules, loadout: Loadout, gold: number, offerings: number, item: string): Quote {
  const [kind, a, b] = item.split(':');
  if (!allowed(rules, item)) return no(item, 'locked');
  if (kind === 'gate') {
    const next = loadout.gateTier + 1;
    if (next >= GATES.length) return no(GATES[GATES.length - 1].name, 'max');
    if (next > rules.maxGateTier) return no(GATES[next].name, 'locked');
    return afford(GATES[next], gold, offerings);
  }
  if (kind === 'station') {
    const def = STATIONS[a as StationId];
    if (!def) return no(item, 'unknown');
    if (loadout.stations[a as StationId]) return no(def.name, 'owned');
    if (!rules.stationsOffered.includes(a as StationId)) return no(def.name, 'locked');
    return afford(def, gold, offerings);
  }
  if (kind === 'weapon') {
    const slot = Number(a);
    const def = weaponById(b);
    if (!def || !SLOTS[slot]) return no(item, 'unknown');
    if (!def.enabled || !rules.slotsOpen[slot] || !rules.weapons[def.id]?.offered || SLOTS[slot].role !== def.slot) return no(def.name, 'locked');
    if (loadout.slotWeapon[slot] === def.id) return no(def.name, 'owned');
    // A weapon bought earlier in this run goes back into its slot for free.
    if (loadout.weaponTier[def.id] !== undefined) return { name: def.name, gold: 0, offerings: 0, reason: 'ok' };
    return afford({ name: def.name, gold: runWeaponGold(def), offerings: 0 }, gold, offerings);
  }
  if (kind === 'upgrade') {
    const def = weaponById(a);
    if (!def) return no(item, 'unknown');
    const tier = loadout.weaponTier[def.id];
    if (!rules.tierUpgrades || tier === undefined) return no(def.name, 'locked');
    if (tier >= MAX_TIER) return no(def.name, 'max');
    return afford({ name: `${def.name} ${tier + 1}`, gold: runUpgradeGold(def, tier + 1), offerings: 0 }, gold, offerings);
  }
  if (kind === 'hand') {
    const tier = Math.max(...loadout.handTier);
    if (!rules.handBuyable) return no('Hand', 'locked');
    if (tier >= HANDS.length) return no('Hand', 'max');
    return afford({ name: `Stronger Hand ${tier + 1}`, gold: HANDS[tier].gold, offerings: HANDS[tier].offerings }, gold, offerings);
  }
  return no(item, 'unknown');
}

export class Shop {
  constructor(private ctx: SimContext) {}

  quote(item: string): Quote {
    const s = this.ctx.s;
    return quote(this.ctx.rules, this.ctx.loadout, s.gold, s.offerings, item);
  }

  canBuy(item: string): boolean { return this.quote(item).reason === 'ok'; }

  buy(p: number, item: string) {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    const q = this.quote(item);
    if (q.reason !== 'ok') { this.ctx.emit({ e: 'denied', p }); return; }
    s.gold -= q.gold;
    s.offerings -= q.offerings;
    this.apply(item);
    this.ctx.touchMeta();
    this.ctx.emit({ e: 'buy', p, item, name: q.name });
  }

  private apply(item: string) {
    const s = this.ctx.s;
    const l = this.ctx.loadout;
    const [kind, a, b] = item.split(':');
    if (kind === 'gate') {
      l.gateTier += 1;
      s.gateMax = GATES[l.gateTier].hp;
      s.gateHp = s.gateMax;
    } else if (kind === 'station') {
      l.stations[a as StationId] = true;
    } else if (kind === 'weapon') {
      l.slotWeapon[Number(a)] = b;
      if (l.weaponTier[b] === undefined) l.weaponTier[b] = this.ctx.rules.weapons[b]?.fixedTier ?? 1;
    } else if (kind === 'upgrade') {
      l.weaponTier[a] += 1;
    } else if (kind === 'hand') {
      // One purchase strengthens every hand of the team.
      const next = Math.max(...l.handTier) + 1;
      l.handTier = l.handTier.map(() => next);
    }
  }
}
