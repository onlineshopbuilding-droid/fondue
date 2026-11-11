/** The weight of raiders and the strength of the hand (order 10.3), on host and guest alike. */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { WORLD } from '../../src/config/field';
import { HANDS, HAND_RULES } from '../../src/config/hand';
import { GuestSession, HostSession } from '../../src/game/session';
import type { NetMessage } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';
import { followFactor, handStrength, massOfType, throwFactor } from '../../src/sim/physics';
import type { Sim } from '../../src/sim/sim';
import type { Enemy } from '../../src/sim/types';
import { battleSim, eventsOf, grabAt, makeSetup, place, runUntil } from './helpers';

/** Throws a raider with a fixed swipe from a fixed point and measures the flight. */
function throwOnce(type: EnemyType, handTier = 1, vx = 1100, vy = -900) {
  const sim = battleSim({ handTiers: [handTier] });
  sim.s.meta.tuning.walkSpeed = 0;
  const e = place(sim, type, 420);
  grabAt(sim, 0, e);
  sim.setHand(0, 420, 380);
  for (let i = 0; i < 40; i++) sim.step();
  sim.command({ k: 'release', p: 0, x: 420, y: 380, vx, vy });
  const x0 = e.x;
  const y0 = e.y;
  let top = e.y;
  let landX = NaN;
  for (let i = 0; i < 400 && Number.isNaN(landX); i++) {
    sim.step();
    top = Math.min(top, e.y);
    const hit = eventsOf(sim.drainEvents(), 'impact').find((x) => x.id === e.id);
    if (hit) landX = hit.x;
  }
  return { distance: landX - x0, height: y0 - top, speed: Math.hypot(e.vx, e.vy) };
}

describe('weight of the raiders', () => {
  it('every raider has a weight; Pothelm light, Keg Hauler heavier, Goat Rider much heavier, Yeti very heavy', () => {
    for (const t of ENEMY_TYPES) expect(ENEMIES[t].mass, t).toBeGreaterThan(0);
    expect(ENEMIES.grunt.mass).toBe(1);
    expect(ENEMIES.bomber.mass).toBeGreaterThan(ENEMIES.grunt.mass);
    expect(ENEMIES.goatRider.mass).toBeGreaterThan(ENEMIES.bomber.mass);
    expect(ENEMIES.yeti.mass).toBeGreaterThan(ENEMIES.goatRider.mass * 2);
  });

  it('the same swipe sends heavier raiders shorter and flatter: Pothelm > Keg Hauler > Goat Rider', () => {
    const [grunt, keg, goat] = (['grunt', 'bomber', 'goatRider'] as const).map((t) => throwOnce(t));
    expect(grunt.distance).toBeGreaterThan(keg.distance + 20);
    expect(keg.distance).toBeGreaterThan(goat.distance + 20);
    expect(grunt.height).toBeGreaterThan(keg.height);
    expect(keg.height).toBeGreaterThan(goat.height);
  });

  it('every hand tier throws a heavy raider further', () => {
    const d = [1, 2, 3].map((tier) => throwOnce('goatRider', tier).distance);
    expect(d[1]).toBeGreaterThan(d[0] + 20);
    expect(d[2]).toBeGreaterThan(d[1] + 20);
    // A Pothelm is thrown at full speed by every hand.
    const g = [1, 2, 3].map((tier) => throwOnce('grunt', tier).distance);
    expect(g[1]).toBeCloseTo(g[0], 0);
    expect(g[2]).toBeCloseTo(g[0], 0);
  });

  it('the throw factor never drops below its floor and never exceeds a full throw', () => {
    expect(throwFactor(100, 1)).toBe(HAND_RULES.minThrow);
    expect(throwFactor(0.4, 1)).toBe(1);
    expect(followFactor(100, 1)).toBe(HAND_RULES.minFollow);
    expect(followFactor(0.5, 2)).toBe(1);
    expect(handStrength(0)).toBe(HANDS[0].strength);
    expect(handStrength(9)).toBe(HANDS[HANDS.length - 1].strength);
    expect(massOfType('grunt', true, false)).toBeGreaterThan(massOfType('grunt', false, false));
    expect(massOfType('yeti', false, true)).toBeLessThan(1);
  });

  /** One hard upward swipe; true when the landing was lethal. */
  function hardThrow(sim: Sim, e: Enemy, holders: number[]): boolean {
    for (const p of holders) grabAt(sim, p, e);
    for (const p of holders) sim.setHand(p, 700, 300);
    for (let i = 0; i < 40; i++) sim.step();
    expect(e.st, e.type).toBe('held');
    sim.command({ k: 'release', p: holders[0], x: 700, y: 300, vx: 0, vy: -4000 });
    const ev = runUntil(sim, () => e.dead || e.crow || e.st === 'stun' || e.st === 'walk', 400);
    return eventsOf(ev, 'impact').some((x) => x.id === e.id && x.lethal);
  }

  it('a hard swipe kills every raider that can be lifted, with every hand tier', () => {
    for (const type of ENEMY_TYPES) {
      if (!ENEMIES[type].grabbable || type === 'yeti') continue;
      for (const tier of [1, 2, 3]) {
        const sim = battleSim({ handTiers: [tier] });
        const e = place(sim, type, 700);
        expect(hardThrow(sim, e, [0]), `${type} hand ${tier}`).toBe(true);
      }
    }
  });

  it('a Yeti dies from a hard throw once the hands on it are strong enough to lift it', () => {
    const alone = battleSim({ handTiers: [3] });
    expect(hardThrow(alone, place(alone, 'yeti', 700), [0])).toBe(true);
    const pair = battleSim({ names: ['A', 'B'], handTiers: [1, 1] });
    expect(hardThrow(pair, place(pair, 'yeti', 700), [0, 1])).toBe(true);
  });
});

describe('the Yeti and the hand', () => {
  const tryLift = (tiers: number[]) => {
    const sim = battleSim({ names: tiers.map((_, i) => `P${i}`), handTiers: tiers });
    const e = place(sim, 'yeti', 800);
    tiers.forEach((_, p) => grabAt(sim, p, e));
    return e.st;
  };

  it('one hand of tier 1 or 2 only pulls it', () => {
    expect(tryLift([1])).toBe('walk');
    expect(tryLift([2])).toBe('walk');
  });

  it('two hands of tier 1 lift it together', () => {
    expect(tryLift([1, 1])).toBe('held');
  });

  it('one hand of tier 3 lifts it alone', () => {
    expect(tryLift([3])).toBe('held');
    expect(HANDS[2].strength).toBeGreaterThanOrEqual(HAND_RULES.yetiLift);
    expect(HANDS[1].strength).toBeLessThan(HAND_RULES.yetiLift);
  });

  it('a weak hand that lets go of a pulled Yeti throws nothing', () => {
    const sim = battleSim();
    const e = place(sim, 'yeti', 800);
    grabAt(sim, 0, e);
    sim.command({ k: 'release', p: 0, x: 900, y: 200, vx: 0, vy: -3000 });
    expect(e.st).toBe('walk');
    expect(e.heldBy).toEqual([]);
  });
});

describe('heavy raiders follow the hand sluggishly', () => {
  const lag = (type: EnemyType, tier = 1) => {
    const sim = battleSim({ handTiers: [tier] });
    sim.s.meta.tuning.walkSpeed = 0;
    const e = place(sim, type, 600);
    grabAt(sim, 0, e);
    const tx = e.x + 300;
    const ty = e.y - ENEMIES[type].height * 0.5 - 200;
    sim.setHand(0, tx, ty);
    // Early on, before the spring has settled: how much of the way is still left.
    for (let i = 0; i < 3; i++) sim.step();
    return Math.hypot(e.x - e.grabOffX - tx, e.y - e.grabOffY - ty);
  };

  it('after a few ticks a Goat Rider is further from the hand than a Pothelm', () => {
    expect(lag('goatRider')).toBeGreaterThan(lag('bomber') + 10);
    expect(lag('bomber')).toBeGreaterThan(lag('grunt') + 5);
  });

  it('a stronger hand pulls a heavy raider along faster', () => {
    expect(lag('goatRider', 1)).toBeGreaterThan(lag('goatRider', 3) + 10);
  });
});

describe('host and guest share one physics', () => {
  it('both import the throw and hold maths from src/sim/physics.ts', () => {
    const session = readFileSync('src/game/session.ts', 'utf8');
    const hands = readFileSync('src/sim/hands.ts', 'utf8');
    for (const fn of ['followFactor', 'launchVelocity', 'liftFlat', 'springStep', 'throwFactor']) {
      expect(session, fn).toMatch(new RegExp(`import \\{[^}]*\\b${fn}\\b[^}]*\\} from '../sim/physics'`));
      expect(hands, fn).toMatch(new RegExp(`import \\{[^}]*\\b${fn}\\b[^}]*\\} from './physics'`));
    }
    expect(session).toMatch(/massOfType/);
  });

  it('the guest prediction lands a heavy raider within a few pixels of where the host lands it', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const toB: NetMessage[] = [];
      const toA: NetMessage[] = [];
      const end = (out: NetMessage[]): Transport => ({
        onMessage: () => {}, onClose: () => {}, send(m) { out.push(JSON.parse(JSON.stringify(m))); }, close() {},
      });
      const a = end(toB);
      const b = end(toA);
      const flush = () => { for (const m of toB.splice(0)) b.onMessage(m); for (const m of toA.splice(0)) a.onMessage(m); };
      const host = new HostSession(makeSetup({ seed: 1, names: ['A', 'B'] }), true);
      host.attach(a);
      const guest = new GuestSession(b);
      const tick = () => { vi.advanceTimersByTime(1000 / 60); host.update(1000 / 60); flush(); guest.update(1000 / 60); flush(); };
      for (let i = 0; i < 400 && host.sim.s.phase !== 'battle'; i++) tick();
      host.sim.s.spawnQueue = [];
      host.sim.s.meta.tuning.walkSpeed = 0;
      const e = host.sim.spawnEnemy('goatRider', 640);
      for (let i = 0; i < 30; i++) tick();
      const seen = guest.view()!.enemies.find((q) => q.id === e.id)!;
      const gy = seen.y - ENEMIES.goatRider.height * 0.5;
      guest.setHand(seen.x, gy);
      guest.localPress(seen.x, gy);
      for (let i = 0; i < 6; i++) tick();
      guest.setHand(seen.x, 380);
      for (let i = 0; i < 30; i++) tick();
      expect(e.heldBy).toEqual([1]);
      guest.localRelease(900, -900);

      let hostLand = NaN;
      let guestLand = NaN;
      const ground = WORLD.groundY + seen.lane;
      for (let i = 0; i < 200 && (Number.isNaN(hostLand) || Number.isNaN(guestLand)); i++) {
        tick();
        const hit = host.drainEvents().find((x) => x.e === 'impact' && x.id === e.id) as { x: number } | undefined;
        if (hit && Number.isNaN(hostLand)) hostLand = hit.x;
        const pred = (guest as unknown as { thrown: { id: number; x: number; y: number }[] }).thrown.find((q) => q.id === e.id);
        if (pred && pred.y >= ground - 0.5 && Number.isNaN(guestLand)) guestLand = pred.x;
      }
      expect(hostLand).toBeGreaterThan(seen.x + 100);
      expect(Math.abs(guestLand - hostLand)).toBeLessThan(6);
    } finally {
      vi.useRealTimers();
    }
  });
});
