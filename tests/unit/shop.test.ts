/**
 * The market between days (src/sim/shop.ts): what an item costs, what is refused, and what a purchase changes.
 * Brought back from the old shop tests of sim.test.ts, which checked the same rules on the old upgrade list.
 */
import { describe, expect, it } from 'vitest';
import { CASTLE_TIERS as GATES, STATIONS } from '../../src/config/keep';
import { SLOTS } from '../../src/config/slots';
import { MAX_TIER, weaponById } from '../../src/config/weapons';
import { runUpgradeGold, runWeaponGold } from '../../src/sim/shop';
import type { Sim } from '../../src/sim/sim';
import { battleSim, eventsOf, runUntil, skipToMarket, slotFor } from './helpers';

/** An endless run standing in the market after day 1, with the given purse. */
function market(gold: number, offerings: number, o: Parameters<typeof battleSim>[0] = {}): Sim {
  const sim = battleSim(o);
  skipToMarket(sim);
  expect(sim.s.phase).toBe('intermission');
  sim.s.gold = gold;
  sim.s.offerings = offerings;
  sim.drainEvents();
  return sim;
}

const buy = (sim: Sim, item: string) => {
  sim.command({ k: 'buy', p: 0, item });
  return sim.drainEvents();
};

describe('market', () => {
  it('charges gold and offerings and puts the weapon into its slot', () => {
    const def = weaponById('wheel')!;
    const slot = slotFor('wheel');
    const sim = market(runWeaponGold(def) + 100, 3);
    const ev = buy(sim, `weapon:${slot}:wheel`);
    expect(eventsOf(ev, 'buy')).toHaveLength(1);
    expect(sim.loadout.slotWeapon[slot]).toBe('wheel');
    expect(sim.loadout.weaponTier.wheel).toBe(1);
    expect(sim.s.gold).toBe(100);
    expect(sim.s.offerings).toBe(3);
  });

  it('refuses what is owned, locked or too dear, and then takes nothing', () => {
    const def = weaponById('wheel')!;
    const slot = slotFor('wheel');
    const sim = market(runWeaponGold(def), 1000);
    buy(sim, `weapon:${slot}:wheel`);
    expect(sim.s.gold).toBe(0);
    // Owned: the same weapon in the same slot again.
    expect(sim.quote(`weapon:${slot}:wheel`).reason).toBe('owned');
    expect(eventsOf(buy(sim, `weapon:${slot}:wheel`), 'denied')).toHaveLength(1);
    // Too dear: a gate with an empty purse.
    expect(sim.quote('gate').reason).toBe('gold');
    expect(eventsOf(buy(sim, 'gate'), 'denied')).toHaveLength(1);
    expect(sim.loadout.gateTier).toBe(0);
    // Locked: a weapon in a slot of the wrong type.
    const wrong = SLOTS.findIndex((x) => x.role !== def.slot);
    expect(sim.quote(`weapon:${wrong}:wheel`).reason).toBe('locked');
    expect(sim.s.offerings).toBe(1000);
  });

  it('weapons cost no offerings any more: gold alone buys them', () => {
    const def = weaponById('bellows')!;
    const sim = market(1e6, 0);
    expect(sim.quote(`weapon:${slotFor('bellows')}:bellows`)).toMatchObject({ reason: 'ok', offerings: 0, gold: runWeaponGold(def) });
  });

  it('sells nothing during the fight', () => {
    const sim = battleSim({ gold: 1e6, offerings: 1000 });
    sim.command({ k: 'buy', p: 0, item: 'gate' });
    expect(sim.loadout.gateTier).toBe(0);
    expect(sim.s.gold).toBe(1e6);
  });

  it('a better gate raises the maximum and stands at full strength', () => {
    const sim = market(1e7, 1000);
    for (let tier = 1; tier < GATES.length; tier++) {
      buy(sim, 'gate');
      expect(sim.loadout.gateTier).toBe(tier);
      expect(sim.s.gateMax).toBe(GATES[tier].hp);
      expect(sim.s.gateHp).toBe(GATES[tier].hp);
    }
    expect(sim.quote('gate').reason).toBe('max');
  });

  it('gates come one tier after the other, up to what the run allows', () => {
    const sim = market(1e7, 1000, { rules: { maxGateTier: 2 } });
    buy(sim, 'gate');
    buy(sim, 'gate');
    expect(sim.loadout.gateTier).toBe(2);
    expect(sim.quote('gate').reason).toBe('locked');
  });

  it('upgrades go one tier at a time, at the price of the next tier', () => {
    const sim = market(1e7, 1000);
    const slot = slotFor('wheel');
    expect(sim.quote('upgrade:wheel').reason).toBe('locked');
    buy(sim, `weapon:${slot}:wheel`);
    for (let tier = 2; tier <= MAX_TIER; tier++) {
      const gold = sim.s.gold;
      buy(sim, 'upgrade:wheel');
      expect(sim.loadout.weaponTier.wheel).toBe(tier);
      expect(gold - sim.s.gold).toBe(runUpgradeGold(weaponById('wheel')!, tier));
    }
    expect(sim.quote('upgrade:wheel').reason).toBe('max');
  });

  it('swapping weapons in a slot: a weapon bought before goes back in for free and keeps its tier', () => {
    const sim = market(1e7, 1000);
    const slot = slotFor('wheel');
    expect(weaponById('forks')!.slot).toBe(weaponById('wheel')!.slot);
    buy(sim, `weapon:${slot}:wheel`);
    buy(sim, 'upgrade:wheel');
    buy(sim, `weapon:${slot}:forks`);
    expect(sim.loadout.slotWeapon[slot]).toBe('forks');
    const gold = sim.s.gold;
    expect(sim.quote(`weapon:${slot}:wheel`).gold).toBe(0);
    buy(sim, `weapon:${slot}:wheel`);
    expect(sim.loadout.slotWeapon[slot]).toBe('wheel');
    expect(sim.loadout.weaponTier.wheel).toBe(2);
    expect(sim.s.gold).toBe(gold);
  });

  it('a station is bought once and only where the run offers it', () => {
    const sim = market(1e7, 1000);
    buy(sim, 'station:cauldron');
    expect(sim.loadout.stations.cauldron).toBe(true);
    expect(sim.quote('station:cauldron').reason).toBe('owned');
    const closed = market(1e7, 1000, { rules: { stationsOffered: [] } });
    expect(closed.quote('station:perch').reason).toBe('locked');
    expect(closed.quote('station:perch').name).toBe(STATIONS.perch.name);
  });

  it('a market limited to some items refuses the rest', () => {
    const sim = market(1e7, 1000, { rules: { marketOnly: ['station:cauldron'] } });
    expect(sim.quote('gate').reason).toBe('locked');
    expect(sim.quote('station:cauldron').reason).toBe('ok');
  });

  it('a purchase reaches the next day', () => {
    const sim = market(1e7, 1000);
    buy(sim, 'gate');
    sim.command({ k: 'ready', p: 0, ready: true });
    runUntil(sim, () => sim.s.phase === 'battle', 1000);
    expect(sim.s.day).toBe(2);
    expect(sim.s.gateMax).toBe(GATES[1].hp);
  });
});
