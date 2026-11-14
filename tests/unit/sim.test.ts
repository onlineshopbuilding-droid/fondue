import { describe, expect, it } from 'vitest';
import { ENEMIES, BEHAVIOUR } from '../../src/config/enemies';
import { COOP, DIFFICULTIES, WAVES } from '../../src/config/waves';
import { crestsFor } from '../../src/config/crests';
import { ECONOMY } from '../../src/config/economy';
import { WEAPONS, SHELL_FLIGHT, weaponById, type RollTier, type VolleyTier } from '../../src/config/weapons';
import { WORLD } from '../../src/config/field';
import { SLOTS } from '../../src/config/slots';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import { enemyCountForWave } from '../../src/sim/spawn';
import { decodeSnapshot, encodeSnapshot } from '../../src/net/snapshot';
import { PROPS } from '../../src/art/props';
import { arm, battleSim, clearWave, eventsOf, fire, flingUp, grabAt, makeSim, place, runFor, runUntil, slotFor, throwOntoHook, wave } from './helpers';

/** How far a Pothelm walks while a strong upward fling is in the air (about 0.89 s). */
const WALK_IN_FLIGHT = ENEMIES.grunt.speed * 0.885;

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
      // b walks during the flight, so it arrives where a lands.
      const b = place(sim, 'grunt', 700 + WALK_IN_FLIGHT);
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
    const sim = battleSim({ names: ['A', 'B'] });
    const e = place(sim, 'grunt');
    grabAt(sim, 0, e);
    grabAt(sim, 1, e);
    expect(e.heldBy).toEqual([0]);
    expect(sim.s.hands[1].holding).toBe(-1);
  });
});

describe('wave flow', () => {
  it('starts with a banner, then battle, then wave after wave until the last one is cleared', () => {
    const sim = makeSim({ seed: 1, waves: [wave(2, 1, 2), wave(2, 1, 2)] });
    expect(sim.s.phase).toBe('banner');
    expect(sim.s.wave).toBe(1);
    runUntil(sim, () => sim.s.phase === 'battle');
    expect(sim.s.runT).toBeCloseTo(WAVES.bannerSeconds, 1);
    const ev = runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(eventsOf(ev, 'waveStart')).toHaveLength(1);
    expect(sim.s.phase).toBe('battle');
    for (let i = 0; i < 2000 && sim.s.phase !== 'runWon'; i++) { clearWave(sim); sim.step(); }
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.meta.result?.wave).toBe(2);
  });

  it('falls to defeat when the gate breaks and reaches game over', () => {
    const sim = battleSim();
    sim.s.gateHp = 1;
    place(sim, 'grunt', WORLD.gateX + 30);
    const ev = runUntil(sim, () => sim.s.phase === 'gameover', 1200);
    expect(ev.some((x) => x.e === 'defeat')).toBe(true);
  });

  it('the gate is not refilled between waves', () => {
    const sim = makeSim({ names: ['A', 'B'], waves: [wave(1, 1, 1), wave(1, 1, 1)] });
    runUntil(sim, () => sim.s.phase === 'battle');
    sim.s.gateHp = 100;
    runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(sim.s.wave).toBe(2);
    expect(sim.s.gateHp).toBeLessThanOrEqual(100);
    expect(sim.s.gateHp).toBeLessThan(sim.s.gateMax);
  });

  it('the next wave needs nobody to press anything', () => {
    const sim = makeSim({ names: ['A', 'B'], waves: [wave(1, 1, 1), wave(1, 1, 1), wave(1, 1, 1)] });
    // No command at all: the waves follow one another on their own.
    runUntil(sim, () => sim.s.wave === 3, 3000);
    expect(sim.s.wave).toBe(3);
  });

  it('pause stops time and names who paused', () => {
    const sim = battleSim({ names: ['Anna', 'Ben'] });
    sim.command({ k: 'pause', p: 1, paused: true });
    const t = sim.s.runT;
    const tick = sim.s.tick;
    for (let i = 0; i < 30; i++) sim.step();
    expect(sim.s.runT).toBe(t);
    expect(sim.s.tick).toBe(tick);
    expect(sim.s.meta.pausedBy).toBe('Ben');
  });

  it('is deterministic for the same seed and commands', () => {
    const run = () => {
      const sim = makeSim({ seed: 77, difficulty: 'hard' });
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
    const c = (w: number, diff: 'easy' | 'medium' | 'hard', pl: number) => enemyCountForWave(w, DIFFICULTIES[diff].count, pl);
    // v0.3: fewer raiders per wave, but waves follow one another without a break.
    expect(c(1, 'medium', 1)).toBeGreaterThanOrEqual(4);
    expect(c(1, 'medium', 1)).toBeLessThanOrEqual(12);
    expect(c(7, 'medium', 1)).toBeGreaterThan(c(1, 'medium', 1));
    expect(c(21, 'medium', 1)).toBeGreaterThan(c(7, 'medium', 1));
    expect(c(5, 'hard', 1)).toBeGreaterThan(c(5, 'medium', 1));
    expect(c(5, 'medium', 1)).toBeGreaterThan(c(5, 'easy', 1));
    expect(Math.abs(c(5, 'medium', 2) - c(5, 'medium', 1) * COOP.countFactor)).toBeLessThanOrEqual(1);
  });

  // Replaced "introduces each type on its day": the endless planner decides the first wave of each type (endlessRandom.test.ts).

  it('announces a new type once, in the wave it first comes', () => {
    const sim = makeSim({ seed: 3, waves: [
      { counts: { grunt: 2 }, spawnSeconds: 1, packs: 1, pauseAfter: 1 },
      { counts: { grunt: 2, bomber: 1 }, spawnSeconds: 1, packs: 1, pauseAfter: 1 },
      { counts: { grunt: 2, bomber: 1 }, spawnSeconds: 1, packs: 1, pauseAfter: 1 },
    ] });
    expect(sim.s.meta.wave.newTypes).toEqual(['grunt']);
    runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(sim.s.meta.wave.newTypes).toEqual(['bomber']);
    runUntil(sim, () => sim.s.wave === 3, 2000);
    expect(sim.s.wave).toBe(3);
    expect(sim.s.meta.wave.newTypes).toEqual([]);
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

  // Replaced "keg hauler: tap drops the keg, which explodes": the keg is shaken loose now (shake.test.ts).

  it('keg hauler thrown to its death blasts neighbours', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 700);
    // The neighbour walks into the (smaller) blast while the hauler is in the air.
    const n = place(sim, 'grunt', 700 + WALK_IN_FLIGHT);
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
    expect(sim.s.stats.kills).toBe(0);
    expect(e.st).toBe('float');
    grabAt(sim, 0, e);
    for (let i = 0; i < 4; i++) sim.step();
    sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 60, vx: 0, vy: -900 });
    runUntil(sim, () => e.dead, 400);
    expect(e.dead).toBe(true);
    expect(sim.s.stats.kills).toBe(1);
  });

  it('yeti: one hand only tugs, two hands can throw it', () => {
    const sim = battleSim({ names: ['A', 'B'] });
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

// Offerings are gone with v0.3: the cauldron pays double gold, the eagle leaves crests.
describe('stations', () => {
  it('cauldron consumes a dropped enemy for double gold', () => {
    const sim = battleSim();
    sim.loadout.stations.cauldron = true;
    const e = place(sim, 'grunt', WORLD.cauldron.x);
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.cauldron.x, y: 300, vx: 0, vy: 0 });
    const ev = runUntil(sim, () => e.dead, 400);
    expect(ev.some((x) => x.e === 'death' && x.cause === 'cauldron')).toBe(true);
    expect(sim.s.gold).toBe(ENEMIES.grunt.gold * ECONOMY.cauldronGoldFactor);
  });

  // Replaced "snap assist steers a near miss into the cauldron" (it belonged to the pot on the road):
  it('letting go of a raider close beside the rim puts it into the pot', () => {
    const sim = battleSim();
    sim.loadout.stations.cauldron = true;
    const e = place(sim, 'grunt', 700);
    grabAt(sim, 0, e);
    sim.step();
    const { x, rimY, snapRadius } = WORLD.cauldron;
    // Hand beside the rim: the body ends up within the snap radius but not on the rim.
    const hx = x + snapRadius * 0.6;
    const hy = rimY + ENEMIES.grunt.height * 0.45 - ENEMIES.grunt.height * 0.5;
    sim.setHand(0, hx, hy);
    sim.command({ k: 'release', p: 0, x: hx, y: hy, vx: 0, vy: 0 });
    expect(e.st).toBe('cooking');
    runUntil(sim, () => e.dead, 400);
    expect(sim.s.stats.killsByCause.cauldron).toBe(1);
  });

  it('no pot and no double gold without the cauldron', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', WORLD.cauldron.x);
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: WORLD.cauldron.x, y: 200, vx: 0, vy: 0 });
    const ev = runUntil(sim, () => e.dead, 400);
    expect(sim.s.stats.killsByCause.cauldron ?? 0).toBe(0);
    for (const d of eventsOf(ev, 'death')) expect(d.gold).toBe(ENEMIES.grunt.gold);
  });

  it('eagle perch hangs an enemy, the eagle takes it, one at a time', () => {
    const sim = battleSim();
    sim.loadout.stations.perch = true;
    const a = place(sim, 'grunt', 700);
    const b = place(sim, 'grunt', 760);
    // v0.3 (C6): the hook wants an aimed throw; carrying a raider up and letting go is not enough.
    throwOntoHook(sim, a);
    runUntil(sim, () => a.st !== 'air', 120);
    expect(a.st).toBe('hooked');
    throwOntoHook(sim, b);
    const flown = runUntil(sim, () => b.st !== 'air', 120);
    expect(b.st).not.toBe('hooked');
    const ev = [...flown, ...runUntil(sim, () => a.dead, 300)];
    expect(ev.some((x) => x.e === 'eagle')).toBe(true);
    expect(sim.s.crests).toBe(crestsFor('grunt'));
  });
});

// The old "shop" block is gone: nothing is bought in a run (waves.test.ts, "the keep in a run"); buying happens in the keep (progress.test.ts).

describe('weapons', () => {
  it('cannot use what is not owned', () => {
    const sim = battleSim();
    place(sim, 'grunt', 600);
    const ev = fire(sim, 0);
    expect(sim.s.projectiles.length).toBe(0);
    expect(ev.some((e) => e.e === 'denied')).toBe(true);
  });

  it('wheel rolls down the road and crushes walkers, with a cooldown', () => {
    const sim = battleSim();
    const slot = arm(sim, 'wheel', 1);
    const e = place(sim, 'grunt', 500);
    fire(sim, slot);
    expect(sim.s.cooldowns[slot]).toBe((weaponById('wheel')!.tiers[0] as RollTier).cooldown);
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
    const before = sim.s.projectiles.length;
    fire(sim, slot);
    expect(sim.s.projectiles.length).toBe(before);
  });

  describe('mortar shell', () => {
    function fireMortar(x: number) {
      const sim = battleSim();
      const slot = arm(sim, 'mortar', 1);
      const target = place(sim, 'grunt', x + 20);
      fire(sim, slot);
      return { sim, slot, target, flightTicks: Math.floor(SHELL_FLIGHT * 60) };
    }

    it('leaves the mortar on the tap and does no damage on the way', () => {
      const { sim, slot, target, flightTicks } = fireMortar(780);
      expect(sim.s.projectiles.map((q) => q.kind)).toEqual(['shell']);
      expect(sim.s.projectiles[0].x).toBe(SLOTS[slot].x);
      expect(sim.s.projectiles[0].y).toBe(SLOTS[slot].y);
      expect(sim.s.cooldowns[slot]).toBeGreaterThan(0);
      const events = runUntil(sim, () => false, flightTicks - 2);
      expect(target.dead).toBe(false);
      expect(events.some((ev) => ev.e === 'explosion')).toBe(false);
    });

    it('still lands on target with other gravity from the tuning panel', () => {
      const sim = battleSim();
      sim.setTuning({ ...sim.tuning, gravity: 1200 });
      const slot = arm(sim, 'mortar', 1);
      const e = place(sim, 'grunt', 600);
      sim.s.meta.tuning.walkSpeed = 0;
      fire(sim, slot);
      const events = runUntil(sim, () => sim.s.projectiles.length === 0, 400);
      const boom = eventsOf(events, 'explosion')[0];
      expect(Math.abs(boom.x - 600)).toBeLessThan(40);
      expect(e.dead).toBe(true);
    });

    it('reaches the guest in the snapshot', () => {
      const { sim } = fireMortar(780);
      expect(decodeSnapshot(encodeSnapshot(sim.s)).projectiles[0].kind).toBe('shell');
    });

    it('has artwork', () => { expect(PROPS.shell).toBeDefined(); });
  });

  it('frost horn freezes; a click shatters; grabbing and throwing also shatters', () => {
    const sim = battleSim();
    const slot = arm(sim, 'frost', 1);
    const a = place(sim, 'grunt', 800);
    const b = place(sim, 'grunt', 820);
    fire(sim, slot);
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
    const sim = battleSim();
    const slot = arm(sim, 'frost', 1);
    const a = place(sim, 'grunt', 800);
    fire(sim, slot);
    runUntil(sim, () => a.st === 'frozen', 200);
    runUntil(sim, () => a.st === 'walk', 800);
    expect(a.st).toBe('walk');
  });

  it('dragon bellows burns a stretch of road', () => {
    const sim = battleSim();
    const slot = arm(sim, 'bellows', 1);
    const a = place(sim, 'grunt', 800);
    fire(sim, slot);
    runUntil(sim, () => sim.s.zones.some((z) => z.kind === 'fire'), 200);
    expect(sim.s.zones.filter((z) => z.kind === 'fire').length).toBe(1);
    runUntil(sim, () => a.dead, 200);
    expect(a.dead).toBe(true);
  });

  it('roof bolters fire volleys that scale with tier', () => {
    const counts = [1, 2, 3].map((tier) => {
      const sim = battleSim();
      const slot = arm(sim, 'bolter', tier);
      place(sim, 'grunt', 500);
      fire(sim, slot);
      return sim.s.projectiles.filter((q) => q.kind === 'roofBolt').length;
    });
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[0]).toBe((weaponById('bolter')!.tiers[0] as VolleyTier).bolts);
  });

  it('roof bolts kill', () => {
    const sim = battleSim();
    const slot = arm(sim, 'bolter', 1);
    const e = place(sim, 'grunt', 500);
    fire(sim, slot);
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
  });

  it('every weapon can be fired on every tier without crashing', () => {
    for (let tier = 1; tier <= 5; tier++) {
      const sim = battleSim();
      for (let i = 0; i < 8; i++) place(sim, 'grunt', 450 + i * 70);
      place(sim, 'balloonist', 700);
      for (const w of WEAPONS) {
        const slot = arm(sim, w.id, tier);
        sim.s.cooldowns[slot] = 0;
        fire(sim, slot);
        for (let i = 0; i < 30; i++) sim.step();
      }
      for (let i = 0; i < 300; i++) sim.step();
      expect(sim.s.phase).toBe('battle');
    }
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
    const q = sim.spawnProjectile('bomb', 680, 630, 0, 0);
    q.t = 5; q.landed = true;
    sim.setHand(0, q.x, q.y);
    sim.command({ k: 'press', p: 0, x: q.x, y: q.y });
    sim.command({ k: 'release', p: 0, x: 680, y: 400, vx: 200, vy: -500 });
    for (let i = 0; i < 6; i++) sim.step();
    expect(q.x).toBeGreaterThan(690);
  });

  // Replaced "picking a weapon mid-press does not fire on release" (no hand modes any more):
  it('tapping a weapon while holding a raider keeps the raider, and letting go only throws', () => {
    const sim = battleSim();
    const slot = arm(sim, 'stomper', 1);
    const e = place(sim, 'grunt', 700);
    place(sim, 'grunt', 900);
    grabAt(sim, 0, e);
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'fire')).toHaveLength(1);
    expect(e.st).toBe('held');
    expect(sim.s.hands[0].holding).toBe(e.id);
    sim.command({ k: 'release', p: 0, x: 700, y: 400, vx: 0, vy: -900 });
    expect(e.st).toBe('air');
    expect(eventsOf(sim.drainEvents(), 'fire')).toHaveLength(0);
    expect(sim.s.stats.weaponShots.stomper).toBe(1);
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
    const slot = arm(sim, 'frost', 1);
    const e = place(sim, 'balloonist', 800);
    e.y = WORLD.groundY - 90; // low enough for the patch of ice on the road to reach it
    e.altitude = 90;
    // The horn aims at raiders on the road; one stands right under the balloon.
    const under = place(sim, 'grunt', 770);
    sim.s.meta.tuning.walkSpeed = 0;
    fire(sim, slot);
    runUntil(sim, () => e.st === 'air', 200);
    expect(e.st).toBe('air');
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
    expect(under.st).toBe('frozen');
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

  it('the old retreat switch no longer sends raiders away', () => {
    const sim = battleSim();
    sim.setFlags({ dayEnd: 'retreat' });
    const e = place(sim, 'pogo', 300);
    for (let i = 0; i < 40; i++) sim.step();
    expect(e.st).not.toBe('flee');
  });

  it('counts gold from enemies that land after the last wave has arrived', () => {
    const sim = makeSim({ waves: [wave(1, 1, 2)] });
    runUntil(sim, () => sim.s.phase === 'battle' && sim.s.waveDone, 2000);
    const e = sim.s.enemies[0];
    flingUp(sim, e, 2200);
    runUntil(sim, () => sim.s.phase === 'runWon', 400);
    expect(e.dead).toBe(true);
    expect(sim.s.gold).toBeGreaterThan(0);
    expect(sim.s.meta.result?.stats.goldEarned).toBe(sim.s.gold);
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

  it('siege carts break in the same number of clicks in later waves', () => {
    const sim = battleSim();
    sim.s.wave = 9;
    const e = place(sim, 'siegeCart', 700);
    for (let i = 0; i < BEHAVIOUR.siegeCartTaps; i++) sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 40 });
    expect(e.dead).toBe(true);
  });
});

describe('regressions from the third playtest', () => {
  it('a small wheel stops after its hit limit', () => {
    const sim = battleSim();
    const slot = arm(sim, 'wheel', 1);
    const list = Array.from({ length: 12 }, (_, i) => place(sim, 'grunt', 500 + i * 6));
    fire(sim, slot);
    for (let i = 0; i < 120; i++) sim.step();
    expect(list.filter((e) => e.dead).length).toBe((weaponById('wheel')!.tiers[0] as RollTier).maxHits);
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
      const q = sim.spawnProjectile('bomb', 700, n.y - 30, 0, 0);
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
    const sim = battleSim({ names: ['A', 'B'] });
    const e = place(sim, 'grunt');
    grabAt(sim, 1, e);
    sim.setConnected(1, false);
    expect(e.st).toBe('air');
  });

  // Ready and forceStart are gone with v0.3: nobody has to agree to the next wave.
  it('the waves go on without a player who dropped out', () => {
    const sim = makeSim({ names: ['A', 'B'], waves: [wave(1, 1, 1), wave(1, 1, 1), wave(1, 1, 1)] });
    runUntil(sim, () => sim.s.phase === 'battle');
    sim.setConnected(1, false);
    runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(sim.s.wave).toBe(2);
    expect(sim.s.paused).toBe(false);
  });

  it('a player who returns plays on in the same wave', () => {
    const sim = battleSim({ names: ['A', 'B'] });
    const w = sim.s.wave;
    sim.setConnected(1, false);
    runFor(sim, 0.5);
    sim.setConnected(1, true);
    const e = place(sim, 'grunt');
    grabAt(sim, 1, e);
    expect(e.heldBy).toEqual([1]);
    expect(sim.s.wave).toBe(w);
  });
});

// The mortar's slot is the gate arm: sanity check for the helpers used above.
it('helpers put each weapon into a slot of its own type', () => {
  for (const w of WEAPONS) expect(SLOTS[slotFor(w.id)].role).toBe(w.slot);
});
