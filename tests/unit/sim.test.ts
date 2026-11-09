import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim/sim';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import { ENEMIES, BEHAVIOUR } from '../../src/config/enemies';
import { COOP, DAY } from '../../src/config/waves';
import { GATE_HP, SHOP_ITEMS, WEAPONS } from '../../src/config/shop';
import { WORLD } from '../../src/config/world';
import type { Enemy, SimEvent } from '../../src/sim/types';
import { buildDayPlan, enemyCountForDay } from '../../src/sim/spawn';
import { Rng } from '../../src/sim/rng';
import { aimShot, pointerFor, type AimSlot } from '../../src/sim/aim';
import { decodeSnapshot, encodeSnapshot } from '../../src/net/snapshot';
import { PROPS } from '../../src/art/props';

function battleSim(names = ['A']) {
  const sim = new Sim({ seed: 42, difficulty: 'medium', names, tuning: { ...TUNING_DEFAULT } });
  // Skip the banner.
  while (sim.s.phase === 'banner') sim.step();
  sim.s.spawnQueue = []; // tests place their own enemies
  sim.drainEvents();
  return sim;
}

function place(sim: Sim, type: Enemy['type'], x = 700): Enemy {
  return sim.spawnEnemy(type, x);
}

function grabAt(sim: Sim, p: number, e: Enemy) {
  const y = e.y - ENEMIES[e.type].height * 0.5;
  sim.setHand(p, e.x, y);
  sim.command({ k: 'press', p, x: e.x, y });
}

function flingUp(sim: Sim, e: Enemy, speed: number, p = 0) {
  grabAt(sim, p, e);
  for (let i = 0; i < 6; i++) sim.step();
  sim.command({ k: 'release', p, x: e.x, y: e.y - 40, vx: 0, vy: -speed });
}

/** Pulls a weapon on the keep so that it lands on targetX, and lets go. */
function fireAt(sim: Sim, slot: AimSlot, targetX: number, p = 0) {
  const horn = sim.s.meta.hornEquipped as Parameters<typeof aimShot>[1];
  const at = pointerFor(slot, horn, targetX, sim.fieldW);
  sim.command({ k: 'pressSlot', p, slot, x: WORLD.slots[slot].x, y: WORLD.slots[slot].y });
  sim.setHand(p, at.x, at.y);
  sim.command({ k: 'release', p, x: at.x, y: at.y, vx: 0, vy: 0 });
  return aimShot(slot, horn, at.x, at.y, sim.fieldW, sim.tuning.gravity);
}

function runUntil(sim: Sim, cond: () => boolean, maxTicks = 2000): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < maxTicks && !cond(); i++) {
    sim.step();
    all.push(...sim.drainEvents());
  }
  return all;
}

describe('throwing and impacts', () => {
  it('a strong upward flick kills on landing and pays gold', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    flingUp(sim, e, 1500);
    expect(e.st).toBe('air');
    const ev = runUntil(sim, () => e.dead);
    expect(ev.some((x) => x.e === 'impact' && x.lethal)).toBe(true);
    expect(ev.some((x) => x.e === 'death' && x.cause === 'impact')).toBe(true);
    expect(sim.s.gold).toBe(ENEMIES.grunt.gold);
  });

  it('a gentle drop bounces, stuns, then walks on', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    flingUp(sim, e, 100);
    runUntil(sim, () => e.st === 'stun');
    expect(e.dead).toBe(false);
    runUntil(sim, () => e.st === 'walk');
    expect(e.st).toBe('walk');
  });

  it('caps throw speed at maxThrow', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    grabAt(sim, 0, e);
    for (let i = 0; i < 6; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 40, vx: 90000, vy: -90000 });
    expect(Math.hypot(e.vx, e.vy)).toBeCloseTo(TUNING_DEFAULT.maxThrow, 0);
  });

  it('a strong throw is airborne about as long as measured (0.75 to 1.6 s)', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    flingUp(sim, e, 2000);
    let ticks = 0;
    while (!e.dead && ticks < 600) { sim.step(); ticks++; }
    const secs = ticks / 60;
    expect(secs).toBeGreaterThan(0.75);
    expect(secs).toBeLessThan(1.6);
  });

  it('thrown enemies leave others alone by default, and knock them when the switch is on', () => {
    for (const knock of [false, true]) {
      const sim = battleSim();
      sim.s.meta.tuning.knockOthers = knock;
      const a = place(sim, 'grunt', 700);
      // b walks about 85 px during the flight, so it arrives where a lands.
      const b = place(sim, 'grunt', 785);
      flingUp(sim, a, 1500);
      runUntil(sim, () => a.dead);
      expect(b.st === 'air').toBe(knock);
    }
  });

  it('held enemies follow the hand', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    grabAt(sim, 0, e);
    sim.setHand(0, 500, 200);
    for (let i = 0; i < 90; i++) sim.step();
    expect(Math.abs(e.x - 500)).toBeLessThan(ENEMIES.grunt.radius + 4);
    expect(e.y).toBeLessThan(320);
  });

  it('first hand keeps the enemy when two grab it', () => {
    const sim = battleSim(['A', 'B']);
    const e = place(sim, 'grunt');
    grabAt(sim, 0, e);
    grabAt(sim, 1, e);
    expect(e.heldBy).toEqual([0]);
    expect(sim.s.hands[1].holding).toBe(-1);
  });
});

describe('day flow', () => {
  it('starts with a banner, then battle, then victory after the day length', () => {
    const sim = new Sim({ seed: 1, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT } });
    expect(sim.s.phase).toBe('banner');
    runUntil(sim, () => sim.s.phase === 'battle');
    sim.s.spawnQueue = [];
    runUntil(sim, () => sim.s.phase === 'victory', 4000);
    expect(sim.s.dayT).toBeCloseTo(DAY.seconds, 0);
    runUntil(sim, () => sim.s.phase === 'intermission');
    expect(sim.s.meta.lastDay?.day).toBe(1);
  });

  it('falls to defeat when the gate breaks and reaches game over', () => {
    const sim = battleSim();
    sim.s.gateHp = 1;
    place(sim, 'grunt', WORLD.gateX + 30);
    const ev = runUntil(sim, () => sim.s.phase === 'gameover', 1200);
    expect(ev.some((x) => x.e === 'defeat')).toBe(true);
  });

  it('refills the gate for the next day and needs all players ready', () => {
    const sim = battleSim(['A', 'B']);
    sim.s.gateHp = 100;
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    sim.command({ k: 'ready', p: 0, ready: true });
    expect(sim.s.phase).toBe('intermission');
    sim.command({ k: 'ready', p: 1, ready: true });
    expect(sim.s.phase).toBe('banner');
    expect(sim.s.day).toBe(2);
    expect(sim.s.gateHp).toBe(sim.s.gateMax);
  });

  it('the host can force the next day', () => {
    const sim = battleSim(['A', 'B']);
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    sim.command({ k: 'forceStart', p: 1 });
    expect(sim.s.phase).toBe('intermission');
    sim.command({ k: 'forceStart', p: 0 });
    expect(sim.s.day).toBe(2);
  });

  it('pause stops time and names who paused', () => {
    const sim = battleSim(['Anna', 'Ben']);
    sim.command({ k: 'pause', p: 1, paused: true });
    const t = sim.s.dayT;
    for (let i = 0; i < 30; i++) sim.step();
    expect(sim.s.dayT).toBe(t);
    expect(sim.s.meta.pausedBy).toBe('Ben');
  });

  it('is deterministic for the same seed and commands', () => {
    const run = () => {
      const sim = new Sim({ seed: 77, difficulty: 'hard', names: ['A'], tuning: { ...TUNING_DEFAULT } });
      for (let i = 0; i < 1500; i++) {
        sim.step();
        const e = sim.s.enemies[0];
        if (i % 50 === 0 && e) flingUp(sim, e, 1600);
      }
      return { gold: sim.s.gold, gate: sim.s.gateHp, n: sim.s.enemies.length, x: sim.s.enemies[0]?.x };
    };
    expect(run()).toEqual(run());
  });
});

describe('spawning', () => {
  it('produces more enemies later, on harder settings, and in co-op', () => {
    const c = (d: number, diff: 'easy' | 'medium' | 'hard', pl: number) => enemyCountForDay(d, diff, pl, 1);
    expect(c(1, 'medium', 1)).toBeGreaterThanOrEqual(20);
    expect(c(1, 'medium', 1)).toBeLessThanOrEqual(50);
    expect(c(7, 'medium', 1)).toBeGreaterThanOrEqual(70);
    expect(c(7, 'medium', 1)).toBeLessThanOrEqual(145);
    expect(c(5, 'hard', 1)).toBeGreaterThan(c(5, 'medium', 1));
    expect(c(5, 'medium', 1)).toBeGreaterThan(c(5, 'easy', 1));
    expect(c(5, 'medium', 2)).toBe(Math.round(c(5, 'medium', 1) * COOP.countFactor));
  });

  it('introduces each type on its day and guarantees it appears', () => {
    const rng = new Rng(5);
    expect(buildDayPlan(1, 'medium', 1, 1, rng).every((p) => p.type === 'grunt')).toBe(true);
    for (const [type, def] of Object.entries(ENEMIES)) {
      expect(buildDayPlan(def.firstDay, 'medium', 1, 1, new Rng(9)).some((p) => p.type === type)).toBe(true);
    }
  });

  it('announces a tip once for a new type', () => {
    const sim = new Sim({ seed: 3, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT } });
    expect(sim.s.meta.newTipTypes).toEqual(['grunt']);
    sim.s.day = 1;
    sim.s.phase = 'intermission';
    sim.command({ k: 'ready', p: 0, ready: true });
    expect(sim.s.meta.newTipTypes).toEqual(['bomber']);
  });
});

describe('enemy behaviours', () => {
  it('melee enemies damage the gate', () => {
    const sim = battleSim();
    place(sim, 'grunt', WORLD.gateX + 30);
    const hp = sim.s.gateHp;
    runUntil(sim, () => sim.s.gateHp < hp, 300);
    expect(sim.s.gateHp).toBe(hp - ENEMIES.grunt.strike);
  });

  it('keg hauler: tap drops the keg, which explodes', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber');
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: sim.s.hands[0].x, y: sim.s.hands[0].y, vx: 0, vy: 0 });
    expect(e.armed).toBe(false);
    expect(e.kegFuse).toBeGreaterThan(0);
    const ev = runUntil(sim, () => e.dead, 200);
    expect(ev.some((x) => x.e === 'explosion')).toBe(true);
  });

  it('keg hauler thrown to its death blasts neighbours', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 700);
    const n = place(sim, 'grunt', 720);
    flingUp(sim, e, 1500);
    runUntil(sim, () => e.dead);
    expect(n.dead).toBe(true);
  });

  it('keg hauler lobs bombs at the gate from range; bombs can be picked up', () => {
    const sim = battleSim();
    place(sim, 'bomber', WORLD.gateX + ENEMIES.bomber.range + 2);
    runUntil(sim, () => sim.s.projectiles.some((q) => q.kind === 'bomb'), 600);
    const b = sim.s.projectiles.find((q) => q.kind === 'bomb')!;
    sim.setHand(0, b.x, b.y);
    sim.command({ k: 'press', p: 0, x: b.x, y: b.y });
    expect(b.heldBy).toBe(0);
    sim.command({ k: 'release', p: 0, x: 900, y: 300, vx: 800, vy: -300 });
    expect(b.heldBy).toBe(-1);
    const hp = sim.s.gateHp;
    runUntil(sim, () => b.t < 0, 400);
    expect(sim.s.gateHp).toBe(hp);
  });

  it('goat rider outruns a grunt', () => {
    const sim = battleSim();
    const a = place(sim, 'goatRider', 1000);
    const b = place(sim, 'grunt', 1000);
    for (let i = 0; i < 120; i++) sim.step();
    expect(a.x).toBeLessThan(b.x - 100);
  });

  it('pogo bandit is grabbable mid-air', () => {
    const sim = battleSim();
    const e = place(sim, 'pogo');
    for (let i = 0; i < 12; i++) sim.step();
    expect(e.y).toBeLessThan(WORLD.groundY + e.lane);
    grabAt(sim, 0, e);
    expect(e.st).toBe('held');
  });

  it('hexer cannot be grabbed while the shield is up', () => {
    const sim = battleSim();
    const e = place(sim, 'hexer');
    e.shieldOn = true;
    grabAt(sim, 0, e);
    expect(e.st).toBe('walk');
    e.shieldOn = false;
    grabAt(sim, 0, e);
    expect(e.st).toBe('held');
  });

  it('hexer shield cycles', () => {
    const sim = battleSim();
    const e = place(sim, 'hexer');
    runUntil(sim, () => e.shieldOn, 400);
    expect(e.shieldOn).toBe(true);
    runUntil(sim, () => !e.shieldOn, 400);
    expect(e.shieldOn).toBe(false);
  });

  it('slinger stops at range and damages the gate with stones', () => {
    const sim = battleSim();
    place(sim, 'slinger', WORLD.gateX + ENEMIES.slinger.range + 2);
    const hp = sim.s.gateHp;
    runUntil(sim, () => sim.s.gateHp < hp, 600);
    expect(sim.s.gateHp).toBeLessThan(hp);
    expect(sim.s.enemies[0].x).toBeGreaterThan(WORLD.gateX + 300);
  });

  it('siege cart cannot be lifted and breaks after repeated clicks', () => {
    const sim = battleSim();
    const e = place(sim, 'siegeCart', 700);
    const taps = BEHAVIOUR.siegeCartTaps;
    for (let i = 0; i < taps; i++) {
      expect(e.dead).toBe(false);
      sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 40 });
      expect(e.st).not.toBe('held');
      sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 40, vx: 0, vy: 0 });
    }
    expect(e.dead).toBe(true);
  });

  it('balloonist floats and falls to its death when pulled down and dropped', () => {
    const sim = battleSim();
    const e = place(sim, 'balloonist', 800);
    expect(e.st).toBe('float');
    expect(e.y).toBeLessThan(WORLD.groundY - 100);
    grabAt(sim, 0, e);
    for (let i = 0; i < 4; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 30, vx: 0, vy: 0 });
    runUntil(sim, () => e.dead || e.st === 'stun', 400);
    expect(e.dead).toBe(true);
  });

  it('shade can only be grabbed while visible', () => {
    const sim = battleSim();
    const e = place(sim, 'shade');
    e.hidden = true;
    grabAt(sim, 0, e);
    expect(e.st).toBe('walk');
    e.hidden = false;
    grabAt(sim, 0, e);
    expect(e.st).toBe('held');
  });

  it('crowcaller returns as a crow and must be caught again', () => {
    const sim = battleSim();
    const e = place(sim, 'crowcaller');
    flingUp(sim, e, 1500);
    const ev = runUntil(sim, () => e.crow, 400);
    expect(ev.some((x) => x.e === 'crow')).toBe(true);
    expect(e.dead).toBe(false);
    expect(sim.s.dayKills).toBe(0);
    expect(e.st).toBe('float');
    grabAt(sim, 0, e);
    for (let i = 0; i < 4; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 60, vx: 0, vy: -900 });
    runUntil(sim, () => e.dead, 400);
    expect(e.dead).toBe(true);
    expect(sim.s.dayKills).toBe(1);
  });

  it('yeti: one hand only tugs, two hands can throw it', () => {
    const sim = battleSim(['A', 'B']);
    const e = place(sim, 'yeti', 800);
    grabAt(sim, 0, e);
    expect(e.st).toBe('walk');
    sim.setHand(0, 1200, 300);
    const x0 = e.x;
    for (let i = 0; i < 60; i++) sim.step();
    expect(e.st).toBe('walk');
    expect(e.x).toBeGreaterThan(x0); // dragged back a bit
    expect(e.y).toBe(WORLD.groundY + e.lane);
    grabAt(sim, 1, e);
    expect(e.st).toBe('held');
    sim.setHand(0, 800, 300);
    sim.setHand(1, 800, 300);
    for (let i = 0; i < 30; i++) sim.step();
    expect(e.y).toBeLessThan(WORLD.groundY - 60);
    sim.command({ k: 'release', p: 0, x: 800, y: 300, vx: 0, vy: -1500 });
    expect(e.st).toBe('air');
    expect(sim.s.hands[1].holding).toBe(-1);
    runUntil(sim, () => e.dead, 500);
    expect(e.dead).toBe(true);
  });
});

describe('offerings', () => {
  it('cauldron consumes a dropped enemy for one offering and gold', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('cauldron');
    const e = place(sim, 'grunt', WORLD.cauldron.x);
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.cauldron.x, y: 300, vx: 0, vy: 0 });
    const ev = runUntil(sim, () => e.dead, 400);
    expect(ev.some((x) => x.e === 'death' && x.cause === 'cauldron')).toBe(true);
    expect(sim.s.offerings).toBe(1);
  });

  it('snap assist steers a near miss into the cauldron', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('cauldron');
    const e = place(sim, 'grunt', 700);
    grabAt(sim, 0, e);
    sim.step();
    const x = WORLD.cauldron.x + WORLD.cauldron.halfWidth + 40;
    sim.command({ k: 'release', p: 0, x, y: 350, vx: 0, vy: 0 });
    runUntil(sim, () => e.dead, 400);
    expect(sim.s.offerings).toBe(1);
  });

  it('no offering without the cauldron', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', WORLD.cauldron.x);
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.cauldron.x, y: 200, vx: 0, vy: 0 });
    runUntil(sim, () => e.dead, 400);
    expect(sim.s.offerings).toBe(0);
  });

  it('eagle perch hangs an enemy, the eagle takes it, one at a time', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('perch');
    const a = place(sim, 'grunt', 700);
    const b = place(sim, 'grunt', 760);
    grabAt(sim, 0, a);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.perch.x, y: WORLD.perch.hookY, vx: 0, vy: 0 });
    expect(a.st).toBe('hooked');
    grabAt(sim, 0, b);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.perch.x, y: WORLD.perch.hookY, vx: 0, vy: 0 });
    expect(b.st).toBe('air');
    const ev = runUntil(sim, () => a.dead, 300);
    expect(ev.some((x) => x.e === 'eagle')).toBe(true);
    expect(sim.s.offerings).toBe(1);
  });
});

describe('shop', () => {
  function shopSim(gold = 1e6, offerings = 1000) {
    const sim = battleSim(['A']);
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    sim.s.gold = gold;
    sim.s.offerings = offerings;
    return sim;
  }

  it('has 22 upgrades', () => { expect(SHOP_ITEMS.length).toBe(22); });

  it('every item can be bought in tier order', () => {
    const sim = shopSim();
    for (const item of SHOP_ITEMS) {
      if (item.id === 'gate0') continue;
      sim.command({ k: 'buy', p: 0, item: item.id });
      expect(sim.owns(item.id)).toBe(true);
    }
  });

  it('charges gold and offerings and refuses repeat or locked or unaffordable items', () => {
    const sim = shopSim(1000, 5);
    sim.command({ k: 'buy', p: 0, item: 'wheel2' }); // needs wheel1
    expect(sim.owns('wheel2')).toBe(false);
    sim.command({ k: 'buy', p: 0, item: 'wheel1' });
    expect(sim.owns('wheel1')).toBe(true);
    expect(sim.s.gold).toBe(1000 - SHOP_ITEMS.find((i) => i.id === 'wheel1')!.gold);
    expect(sim.s.offerings).toBe(1);
    sim.command({ k: 'buy', p: 0, item: 'wheel1' });
    expect(sim.s.gold).toBe(1000 - SHOP_ITEMS.find((i) => i.id === 'wheel1')!.gold);
    sim.command({ k: 'buy', p: 0, item: 'gate1' });
    expect(sim.owns('gate1')).toBe(false);
  });

  it('a better gate raises the maximum', () => {
    const sim = shopSim();
    sim.command({ k: 'buy', p: 0, item: 'gate1' });
    expect(sim.s.gateMax).toBe(GATE_HP.gate1);
  });

  it('buying a gate arm equips it, equip swaps between owned', () => {
    const sim = shopSim();
    sim.command({ k: 'buy', p: 0, item: 'mortar' });
    expect(sim.s.meta.hornEquipped).toBe('mortar');
    sim.command({ k: 'buy', p: 0, item: 'frost' });
    expect(sim.s.meta.hornEquipped).toBe('frost');
    sim.command({ k: 'equip', p: 0, item: 'mortar' });
    expect(sim.s.meta.hornEquipped).toBe('mortar');
  });
});

describe('weapons', () => {
  function armed(items: string[]) {
    const sim = battleSim(['A']);
    sim.s.meta.owned.push(...items);
    return sim;
  }

  it('cannot use what is not owned', () => {
    const sim = armed([]);
    sim.command({ k: 'activate', p: 0, slot: 'wheel' });
    expect(sim.s.projectiles.length).toBe(0);
    expect(sim.drainEvents().some((e) => e.e === 'denied')).toBe(true);
  });

  it('wheel rolls down the road and crushes walkers, with a cooldown', () => {
    const sim = armed(['wheel1']);
    const e = place(sim, 'grunt', 500);
    sim.command({ k: 'activate', p: 0, slot: 'wheel' });
    expect(sim.s.cooldowns.wheel).toBe(WEAPONS.wheel.wheel1.cooldown);
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
    const before = sim.s.projectiles.length;
    sim.command({ k: 'activate', p: 0, slot: 'wheel' });
    expect(sim.s.projectiles.length).toBe(before);
  });

  it('stomper: activate, then release slams at the hand', () => {
    const sim = armed(['stomper1']);
    const e = place(sim, 'grunt', 600);
    sim.command({ k: 'activate', p: 0, slot: 'stomper' });
    expect(sim.s.hands[0].mode).toBe('stomper');
    sim.command({ k: 'press', p: 0, x: 600, y: 200 });
    sim.command({ k: 'release', p: 0, x: 600, y: 260, vx: 0, vy: 1500 });
    expect(sim.s.hands[0].mode).toBe('none');
    const ev = runUntil(sim, () => e.dead, 120);
    expect(ev.some((x) => x.e === 'slam')).toBe(true);
    expect(sim.s.cooldowns.stomper).toBeGreaterThan(0);
  });

  it('activating a mode weapon twice cancels it without cooldown', () => {
    const sim = armed(['stomper1']);
    sim.command({ k: 'activate', p: 0, slot: 'stomper' });
    sim.command({ k: 'activate', p: 0, slot: 'stomper' });
    expect(sim.s.hands[0].mode).toBe('none');
    expect(sim.s.cooldowns.stomper).toBe(0);
  });

  it('comet: a tap on the shrine, a tap on the road, and it falls right there with flames', () => {
    const sim = armed(['comet1']);
    place(sim, 'grunt', 650);
    sim.command({ k: 'pressSlot', p: 0, slot: 'comet', x: WORLD.slots.comet.x, y: WORLD.slots.comet.y });
    sim.command({ k: 'release', p: 0, x: WORLD.slots.comet.x, y: WORLD.slots.comet.y, vx: 0, vy: 0 });
    expect(sim.s.hands[0].mode).toBe('comet');
    expect(sim.s.cooldowns.comet).toBe(0);
    sim.setHand(0, 650, 400);
    sim.command({ k: 'press', p: 0, x: 650, y: 400 });
    sim.command({ k: 'release', p: 0, x: 650, y: 400, vx: 0, vy: 0 });
    expect(sim.s.hands[0].mode).toBe('none');
    expect(sim.s.cooldowns.comet).toBeGreaterThan(0);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    const blast = ev.find((x) => x.e === 'explosion') as Extract<SimEvent, { e: 'explosion' }>;
    expect(blast.x).toBeCloseTo(650, 0);
    expect(blast.radius).toBeCloseTo(WEAPONS.comet.comet1.radius * (1 + WEAPONS.comet.bonus), 3);
    expect(sim.s.flames.length).toBe(1);
  });

  it('gate arm aims with the press and fires on release; shared cooldown', () => {
    const sim = battleSim(['A', 'B']);
    sim.s.meta.owned.push('mortar');
    sim.s.meta.hornEquipped = 'mortar';
    const e = place(sim, 'grunt', 800);
    fireAt(sim, 'horn', 760);
    runUntil(sim, () => e.dead, 120);
    expect(e.dead).toBe(true);
    sim.command({ k: 'activate', p: 1, slot: 'horn' });
    expect(sim.s.hands[1].mode).toBe('none');
  });

  describe('mortar shell', () => {
    function fireMortar(x: number) {
      const sim = battleSim();
      sim.s.meta.owned.push('mortar');
      sim.s.meta.hornEquipped = 'mortar';
      const target = place(sim, 'grunt', x + 20);
      const shot = fireAt(sim, 'horn', x);
      return { sim, target, shot, flightTicks: Math.floor(shot.flight * 60) };
    }

    it('leaves the mortar on release and does no damage on the way', () => {
      const { sim, target, flightTicks } = fireMortar(780);
      expect(sim.s.projectiles.map((q) => q.kind)).toEqual(['shell']);
      expect(sim.s.projectiles[0].x).toBe(WORLD.slots.horn.x);
      expect(sim.s.projectiles[0].y).toBe(WORLD.slots.horn.y);
      expect(sim.s.cooldowns.horn).toBeGreaterThan(0);
      const events = runUntil(sim, () => false, flightTicks - 2);
      expect(target.dead).toBe(false);
      expect(events.some((ev) => ev.e === 'explosion')).toBe(false);
    });

    it('flies in a high arc and explodes where the aim said it would', () => {
      const { sim, target, shot, flightTicks } = fireMortar(780);
      let highest = Infinity;
      const events: SimEvent[] = [];
      for (let i = 0; i < flightTicks + 4; i++) {
        sim.step();
        events.push(...sim.drainEvents());
        for (const q of sim.s.projectiles) highest = Math.min(highest, q.y);
      }
      expect(highest).toBeLessThan(WORLD.slots.horn.y - 150);
      const boom = events.find((ev) => ev.e === 'explosion') as Extract<SimEvent, { e: 'explosion' }>;
      // Stepped flight may overshoot the continuous prediction by a few pixels.
      expect(Math.abs(boom.x - shot.landX)).toBeLessThan(40);
      expect(boom.radius).toBe(WEAPONS.horn.mortar.radius);
      expect(target.dead).toBe(true);
      sim.step();
      expect(sim.s.projectiles).toEqual([]);
    });

    it('still lands on target with other gravity from the tuning panel', () => {
      const sim = battleSim();
      sim.setTuning({ ...sim.tuning, gravity: 1200 });
      sim.s.meta.owned.push('mortar');
      sim.s.meta.hornEquipped = 'mortar';
      const shot = fireAt(sim, 'horn', 600);
      const events = runUntil(sim, () => sim.s.projectiles.length === 0, 400);
      const boom = events.find((ev) => ev.e === 'explosion') as Extract<SimEvent, { e: 'explosion' }>;
      expect(Math.abs(boom.x - shot.landX)).toBeLessThan(40);
      expect(Math.abs(boom.x - 600)).toBeLessThan(40);
    });

    it('reaches the guest in the snapshot', () => {
      const { sim } = fireMortar(780);
      expect(decodeSnapshot(encodeSnapshot(sim.s)).projectiles[0].kind).toBe('shell');
    });

    it('has artwork', () => { expect(PROPS.shell).toBeDefined(); });
  });

  it('frost horn freezes; a click shatters; grabbing and throwing also shatters', () => {
    const sim = armed(['frost']);
    sim.s.meta.hornEquipped = 'frost';
    const a = place(sim, 'grunt', 800);
    const b = place(sim, 'grunt', 820);
    fireAt(sim, 'horn', 810);
    runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    expect(a.st).toBe('frozen');
    expect(b.st).toBe('frozen');
    grabAt(sim, 0, a);
    sim.step();
    sim.command({ k: 'release', p: 0, x: sim.s.hands[0].x, y: sim.s.hands[0].y, vx: 0, vy: 0 });
    expect(a.dead).toBe(true);
    grabAt(sim, 0, b);
    for (let i = 0; i < 20; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: b.x, y: b.y - 300, vx: 0, vy: 100 });
    runUntil(sim, () => b.dead, 200);
    expect(b.dead).toBe(true);
  });

  it('frozen enemies thaw and walk on', () => {
    const sim = armed(['frost']);
    sim.s.meta.hornEquipped = 'frost';
    const a = place(sim, 'grunt', 800);
    fireAt(sim, 'horn', 800);
    runUntil(sim, () => a.st === 'frozen', 200);
    runUntil(sim, () => a.st === 'walk', 500);
    expect(a.st).toBe('walk');
  });

  it('dragon bellows burns a stretch of road', () => {
    const sim = armed(['bellows']);
    sim.s.meta.hornEquipped = 'bellows';
    const a = place(sim, 'grunt', 800);
    fireAt(sim, 'horn', 800);
    runUntil(sim, () => sim.s.flames.length === 1, 200);
    expect(sim.s.flames.length).toBe(1);
    runUntil(sim, () => a.dead, 200);
    expect(a.dead).toBe(true);
  });

  it('roof bolters fire volleys that scale with tier', () => {
    const counts = ['bolter1', 'bolter2', 'bolter3'].map((id) => {
      const sim = armed([id]);
      place(sim, 'grunt', 500);
      fireAt(sim, 'bolter', 500);
      return sim.s.projectiles.filter((q) => q.kind === 'roofBolt').length;
    });
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
  });

  it('roof bolts kill', () => {
    const sim = armed(['bolter1']);
    const e = place(sim, 'grunt', 500);
    fireAt(sim, 'bolter', 500);
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
  });

  it('every shop weapon can be fired without crashing', () => {
    const sim = armed(SHOP_ITEMS.filter((i) => i.id !== 'gate0').map((i) => i.id));
    sim.s.meta.hornEquipped = 'bellows';
    place(sim, 'grunt', 600);
    for (const slot of ['wheel', 'stomper', 'comet', 'horn', 'bolter'] as const) {
      sim.command({ k: 'activate', p: 0, slot });
      sim.command({ k: 'press', p: 0, x: 600, y: 400 });
      sim.step();
      sim.command({ k: 'release', p: 0, x: 600, y: 420, vx: 0, vy: 500 });
      for (let i = 0; i < 90; i++) sim.step();
    }
    expect(sim.s.phase).toBe('battle');
  });
});

describe('regressions from the first playtest', () => {
  it('a flat sideways fling from road height flies in an arc', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', 700);
    grabAt(sim, 0, e);
    sim.setHand(0, 700, e.y);
    for (let i = 0; i < 20; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: 780, y: e.y, vx: 1500, vy: 0 });
    expect(e.st).toBe('air');
    expect(e.vy).toBeLessThan(0);
    for (let i = 0; i < 6; i++) sim.step();
    expect(e.st).toBe('air');
    expect(e.x).toBeGreaterThan(800);
  });

  it('a re-thrown bomb that had landed flies again', () => {
    const sim = battleSim();
    sim.s.projectiles = [];
    const q = (sim as unknown as { spawnProjectile(k: string, x: number, y: number, vx: number, vy: number): any }).spawnProjectile('bomb', 680, 630, 0, 0);
    q.t = 5; q.landed = true;
    sim.setHand(0, q.x, q.y);
    sim.command({ k: 'press', p: 0, x: q.x, y: q.y });
    sim.command({ k: 'release', p: 0, x: 680, y: 400, vx: 200, vy: -500 });
    for (let i = 0; i < 6; i++) sim.step();
    expect(q.x).toBeGreaterThan(690);
  });

  it('picking a weapon mid-press does not fire on release', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('stomper1');
    const e = place(sim, 'grunt', 700);
    grabAt(sim, 0, e);
    sim.command({ k: 'activate', p: 0, slot: 'stomper' });
    sim.command({ k: 'release', p: 0, x: 700, y: 400, vx: 0, vy: 0 });
    expect(sim.s.cooldowns.stomper).toBe(0);
    expect(sim.s.hands[0].mode).toBe('stomper');
  });

  it('one hand cannot hold a yeti back for good', () => {
    const sim = battleSim();
    const e = place(sim, 'yeti', 700);
    grabAt(sim, 0, e);
    sim.setHand(0, 1250, 300);
    for (let i = 0; i < 60 * 3; i++) sim.step();
    expect(e.x).toBeLessThanOrEqual(700 + BEHAVIOUR.yeti.tugReach);
    const x3 = e.x;
    for (let i = 0; i < 60 * 4; i++) sim.step();
    expect(e.x).toBeLessThan(x3);
  });

  it('a frozen balloonist drops and shatters', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('frost');
    sim.s.meta.hornEquipped = 'frost';
    const e = place(sim, 'balloonist', 800);
    e.y = WORLD.groundY - 90; // low enough for the patch of ice on the road to reach it
    e.altitude = 90;
    fireAt(sim, 'horn', e.x - 30);
    runUntil(sim, () => e.st === 'air', 200);
    expect(e.st).toBe('air');
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
  });

  it('letting go during a pause is not a throw', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', 700);
    grabAt(sim, 0, e);
    sim.setHand(0, 700, 200);
    for (let i = 0; i < 30; i++) sim.step();
    sim.command({ k: 'pause', p: 0, paused: true });
    sim.command({ k: 'release', p: 0, x: 700, y: 200, vx: 0, vy: -2000 });
    expect(e.st).toBe('held');
    sim.command({ k: 'pause', p: 0, paused: false });
    expect(e.st).toBe('air');
    expect(e.vy).toBe(0);
  });

  it('with the retreat experiment, pogo bandits stop attacking once the day is over', () => {
    const sim = battleSim();
    sim.setFlags({ dayEnd: 'retreat' });
    const e = place(sim, 'pogo', 300);
    for (let i = 0; i < 40; i++) sim.step();
    sim.s.dayT = DAY.seconds;
    sim.step();
    expect(e.st).toBe('flee');
  });

  it('counts gold from enemies that land after the day ended', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', 700);
    flingUp(sim, e, 2200);
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    expect(e.dead).toBe(true);
    expect(sim.s.meta.lastDay?.goldEarned).toBe(sim.s.gold);
  });

  it('short drops daze, drops from well up kill', () => {
    const heightKills = (h: number) => {
      const sim = battleSim();
      const e = place(sim, 'grunt', 700);
      e.st = 'air'; e.y = WORLD.groundY + e.lane - h; e.vx = 0; e.vy = 0;
      runUntil(sim, () => e.dead || e.st === 'stun', 200);
      return e.dead;
    };
    expect(heightKills(70)).toBe(false);
    expect(heightKills(140)).toBe(true);
  });

  it('siege carts break in the same number of clicks on later days', () => {
    const sim = battleSim();
    sim.s.day = 9;
    const e = place(sim, 'siegeCart', 700);
    for (let i = 0; i < BEHAVIOUR.siegeCartTaps; i++) sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 40 });
    expect(e.dead).toBe(true);
  });
});

describe('regressions from the third playtest', () => {
  it('a small wheel stops after its hit limit', () => {
    const sim = battleSim();
    sim.s.meta.owned.push('wheel1');
    const list = Array.from({ length: 12 }, (_, i) => place(sim, 'grunt', 500 + i * 6));
    sim.command({ k: 'activate', p: 0, slot: 'wheel' });
    for (let i = 0; i < 120; i++) sim.step();
    expect(list.filter((e) => e.dead).length).toBe(WEAPONS.wheel.wheel1.maxHits);
  });

  it('a pogo bandit rests after each hit on the gate', () => {
    const sim = battleSim();
    const e = place(sim, 'pogo', WORLD.gateX + 90);
    const ev = runUntil(sim, () => e.t > 0, 400);
    expect(ev.some((x) => x.e === 'gateHit')).toBe(true);
    expect(e.y).toBe(WORLD.groundY + e.lane);
    const hits: number[] = [];
    for (let t = 0; t < 180; t++) {
      sim.step();
      if (sim.drainEvents().some((x) => x.e === 'gateHit')) hits.push(t);
    }
    for (let i = 1; i < hits.length; i++) expect(hits[i] - hits[i - 1]).toBeGreaterThan(BEHAVIOUR.pogo.restAtGate * 60);
  });

  it('enemy bombs do not blow up their own side, returned ones do', () => {
    const blastOn = (returned: boolean) => {
      const sim = battleSim();
      const n = place(sim, 'grunt', 700);
      sim.s.meta.tuning.walkSpeed = 0;
      const q = (sim as unknown as { spawnProjectile(k: string, x: number, y: number, vx: number, vy: number): any }).spawnProjectile('bomb', 700, n.y - 30, 0, 0);
      q.t = 0.05; q.landed = true; q.byPlayer = returned;
      for (let i = 0; i < 10; i++) sim.step();
      return n.dead;
    };
    expect(blastOn(false)).toBe(false);
    expect(blastOn(true)).toBe(true);
  });
});

describe('disconnect handling', () => {
  it('releases what the leaving player held', () => {
    const sim = battleSim(['A', 'B']);
    const e = place(sim, 'grunt');
    grabAt(sim, 1, e);
    sim.setConnected(1, false);
    expect(e.st).toBe('air');
  });

  it('dropping out clears ready, and starts the day if only that player was missing', () => {
    const sim = battleSim(['A', 'B']);
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    sim.command({ k: 'ready', p: 0, ready: true });
    expect(sim.s.day).toBe(1);
    sim.setConnected(1, false);
    expect(sim.s.day).toBe(2);
  });

  it('a disconnected player does not block ready', () => {
    const sim = battleSim(['A', 'B']);
    sim.s.dayT = DAY.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 400);
    sim.setConnected(1, false);
    sim.command({ k: 'ready', p: 0, ready: true });
    expect(sim.s.day).toBe(2);
  });
});
