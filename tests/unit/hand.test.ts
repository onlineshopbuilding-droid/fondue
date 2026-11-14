// Hand tiers 1 to 7 (C8), the Yeti rule, and the second hand in both variants (C9).
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config/enemies';
import { HANDS, HAND_RULES, MAX_HAND_TIER } from '../../src/config/hand';
import { WORLD } from '../../src/config/field';
import { ECONOMY } from '../../src/config/economy';
import { handIndex, handStrength, isSecondHand, playerOfHand } from '../../src/sim/physics';
import type { Sim } from '../../src/sim/sim';
import type { Enemy } from '../../src/sim/types';
import { battleSim, eventsOf, place, runUntil } from './helpers';

/** Presses one of player p's hands on the middle of a raider. */
function grab(sim: Sim, p: number, e: Enemy, hand = 0) {
  const y = e.y - ENEMIES[e.type].height * 0.5;
  if (hand === 0) sim.setHand(p, e.x, y);
  else sim.command({ k: 'move', p, hand, x: e.x, y });
  sim.command({ k: 'press', p, hand, x: e.x, y });
}

const yetiSim = (handTiers: number[], names = handTiers.map((_, i) => 'P' + i)) => {
  const sim = battleSim({ names, handTiers });
  sim.s.meta.tuning.walkSpeed = 0;
  const y = place(sim, 'yeti', 800);
  return { sim, y };
};

describe('hand tiers (C8)', () => {
  it('has seven tiers whose strength rises in small steps', () => {
    expect(MAX_HAND_TIER).toBe(7);
    for (let i = 1; i < HANDS.length; i++) {
      const step = HANDS[i].strength / HANDS[i - 1].strength;
      expect(step).toBeGreaterThan(1.1);
      expect(step).toBeLessThan(1.35);
    }
    expect(HANDS[6].crests).toBeGreaterThan(0);
    expect(HANDS.slice(0, 6).every((h) => h.crests === 0)).toBe(true);
  });

  it('a hand of tier 3 alone cannot lift a Yeti, it only drags it', () => {
    const { sim, y } = yetiSim([3]);
    expect(handStrength(3)).toBeLessThan(HAND_RULES.yetiLift);
    grab(sim, 0, y);
    expect(y.heldBy).toEqual([0]);
    expect(y.st).not.toBe('held');
  });

  it('a hand of tier 4 alone lifts a Yeti', () => {
    const { sim, y } = yetiSim([4]);
    expect(handStrength(4)).toBeGreaterThanOrEqual(HAND_RULES.yetiLift);
    grab(sim, 0, y);
    expect(y.st).toBe('held');
  });

  it('two tier-1 hands of two players lift it together (co-op)', () => {
    const { sim, y } = yetiSim([1, 1]);
    grab(sim, 0, y);
    expect(y.st).not.toBe('held');
    grab(sim, 1, y);
    expect(y.heldBy).toEqual([0, 1]);
    expect(y.st).toBe('held');
  });

  it('a stronger hand throws a heavy raider further', () => {
    const speeds = [1, 4, 7].map((tier) => {
      const sim = battleSim({ handTiers: [tier] });
      const g = place(sim, 'goatRider', 700);
      grab(sim, 0, g);
      sim.step();
      const ev = (sim.command({ k: 'release', p: 0, x: 700, y: 300, vx: 900, vy: -900 }), sim.drainEvents());
      return eventsOf(ev, 'release')[0].speed;
    });
    expect(speeds[1]).toBeGreaterThan(speeds[0]);
    expect(speeds[2]).toBeGreaterThanOrEqual(speeds[1]);
  });
});

describe('hand numbers', () => {
  it('player p has hand p and second hand p + players', () => {
    expect(handIndex(0, 0, 1)).toBe(0);
    expect(handIndex(0, 1, 1)).toBe(1);
    expect(handIndex(1, 1, 2)).toBe(3);
    expect(playerOfHand(3, 2)).toBe(1);
    expect(playerOfHand(2, 2)).toBe(0);
    expect(isSecondHand(1, 1)).toBe(true);
    expect(isSecondHand(1, 2)).toBe(false);
  });
});

describe('second hand from tier 7 (C9, variant 1)', () => {
  it('two fingers each grab their own raider at the same time', () => {
    const sim = battleSim({ handTiers: [7] });
    const a = place(sim, 'grunt', 600);
    const b = place(sim, 'grunt', 900);
    grab(sim, 0, a, 0);
    grab(sim, 0, b, 1);
    expect(a.heldBy).toEqual([0]);
    expect(b.heldBy).toEqual([1]);
    expect(a.st).toBe('held');
    expect(b.st).toBe('held');
    // Each follows its own finger.
    sim.setHand(0, 500, 200);
    sim.command({ k: 'move', p: 0, hand: 1, x: 1000, y: 220 });
    for (let i = 0; i < 30; i++) sim.step();
    expect(a.x).toBeLessThan(560);
    expect(b.x).toBeGreaterThan(940);
    // Both throws count for player 0.
    sim.command({ k: 'release', p: 0, x: 500, y: 200, vx: 0, vy: -1500 });
    sim.command({ k: 'release', p: 0, hand: 1, x: 1000, y: 220, vx: 0, vy: -1500 });
    expect(a.st).toBe('air');
    expect(b.st).toBe('air');
    expect(a.thrownBy).toBe(0);
    expect(b.thrownBy).toBe(0);
    const ev = runUntil(sim, () => a.dead && b.dead, 400);
    expect(eventsOf(ev, 'death').every((d) => d.p === 0)).toBe(true);
  });

  it('both own hands on one raider add their strength: a tier-1 pair lifts a Yeti only together', () => {
    const sim = battleSim({ handTiers: [1], flags: { secondHand: 'on' } });
    sim.s.meta.tuning.walkSpeed = 0;
    const y = place(sim, 'yeti', 800);
    grab(sim, 0, y, 0);
    expect(y.st).not.toBe('held');
    grab(sim, 0, y, 1);
    // 1 + 1 = 2 = the Yeti lift.
    expect(y.heldBy).toEqual([0, 1]);
    expect(y.st).toBe('held');
  });

  it('both own hands on an ordinary raider throw it with both strengths', () => {
    const one = battleSim({ handTiers: [7] });
    const two = battleSim({ handTiers: [7] });
    const speed = (sim: Sim, both: boolean) => {
      const g = place(sim, 'goatRider', 700);
      grab(sim, 0, g, 0);
      if (both) grab(sim, 0, g, 1);
      sim.step();
      sim.command({ k: 'release', p: 0, x: 700, y: 300, vx: 1200, vy: -1200 });
      expect(sim.s.hands.every((h) => h.holding !== g.id)).toBe(true);
      return eventsOf(sim.drainEvents(), 'release')[0].speed;
    };
    expect(speed(two, true)).toBeGreaterThanOrEqual(speed(one, false));
  });

  it('another player cannot take a raider held by me, but my second hand can join', () => {
    const sim = battleSim({ names: ['A', 'B'], handTiers: [7, 1] });
    const g = place(sim, 'grunt', 700);
    grab(sim, 0, g, 0);
    grab(sim, 1, g, 0);
    expect(g.heldBy).toEqual([0]);
    grab(sim, 0, g, 1);
    expect(g.heldBy).toEqual([0, 2]);
  });
});

describe('without a second hand', () => {
  it('a second finger does nothing', () => {
    const sim = battleSim({ handTiers: [6] });
    const a = place(sim, 'grunt', 600);
    const b = place(sim, 'grunt', 900);
    grab(sim, 0, a, 0);
    const before = sim.s.hands.length;
    grab(sim, 0, b, 1);
    sim.command({ k: 'release', p: 0, hand: 1, x: 900, y: 200, vx: 0, vy: -1500 });
    expect(b.heldBy).toEqual([]);
    expect(b.st).not.toBe('held');
    expect(a.st).toBe('held');
    expect(sim.s.hands.length).toBe(before);
  });
});

describe('Helping Hand (C9, variant 2)', () => {
  it('lends a second hand for a while; when it runs out, that hand lets go', () => {
    const sim = battleSim({ handTiers: [1] });
    const b = place(sim, 'grunt', 900);
    sim.s.extraHandT[0] = 1;
    sim.s.extraHandStrength = 0.8;
    grab(sim, 0, b, 1);
    expect(b.heldBy).toEqual([1]);
    expect(sim.ctx.hands.strengthOf([1])).toBeCloseTo(HANDS[0].strength * 0.8, 5);
    sim.s.extraHandT[0] = 0;
    sim.step();
    expect(b.heldBy).toEqual([]);
    expect(sim.s.hands[1].holding).toBe(-1);
    expect(sim.s.hands[1].down).toBe(false);
    // And no new grab after that.
    const c = place(sim, 'grunt', 1000);
    grab(sim, 0, c, 1);
    expect(c.heldBy).toEqual([]);
  });
});

describe('Great Cauldron (C5)', () => {
  it('a raider thrown into it pays double gold', () => {
    const sim = battleSim();
    sim.loadout.stations.cauldron = true;
    sim.s.meta.tuning.walkSpeed = 0;
    const e = place(sim, 'grunt', 700);
    const gold = sim.s.gold;
    grab(sim, 0, e);
    sim.setHand(0, WORLD.cauldron.x, WORLD.cauldron.rimY - 10);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.cauldron.x, y: WORLD.cauldron.rimY - 10, vx: 0, vy: 0 });
    const ev = runUntil(sim, () => e.dead, 600);
    const death = eventsOf(ev, 'death')[0];
    expect(death.cause).toBe('cauldron');
    expect(ECONOMY.cauldronGoldFactor).toBe(2);
    expect(death.gold).toBe(sim.ctx.combat.goldFor(e) * 2);
    expect(sim.s.gold - gold).toBe(death.gold);
  });
});
