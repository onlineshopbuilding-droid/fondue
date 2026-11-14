/**
 * Keg Hauler (order 14.2): the keg comes loose only when the hauler is lifted and shaken (`shake`),
 * or when it hangs on the eagle hook. The keg falls and bursts on the road below, sparing the gate.
 * A quick tap no longer drops it.
 */
import { describe, expect, it } from 'vitest';
import { crestsFor } from '../../src/config/crests';
import { BEHAVIOUR, ENEMIES } from '../../src/config/enemies';
import { WORLD, perchX } from '../../src/config/field';
import type { Sim } from '../../src/sim/sim';
import type { Enemy } from '../../src/sim/types';
import { battleSim, eventsOf, flingUp, grabAt, place, runUntil, throwOntoHook } from './helpers';

const kegs = (sim: Sim) => sim.s.projectiles.filter((q) => q.kind === 'bomb');

/** Lifts a Keg Hauler to (x, y) and holds it there. */
function lift(sim: Sim, e: Enemy, x = e.x, y = 330) {
  grabAt(sim, 0, e);
  sim.setHand(0, x, y);
  for (let i = 0; i < 30; i++) sim.step();
  sim.drainEvents();
}

const shake = (sim: Sim, p = 0) => { sim.command({ k: 'shake', p }); return sim.drainEvents(); };

describe('shaking a Keg Hauler', () => {
  it('a held, armed Keg Hauler loses its keg: it falls straight down', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 700);
    lift(sim, e);
    const ev = shake(sim);
    expect(e.armed).toBe(false);
    expect(e.st).toBe('held');
    const loose = eventsOf(ev, 'kegLoose');
    expect(loose).toHaveLength(1);
    expect(loose[0].p).toBe(0);
    const [keg] = kegs(sim);
    expect(keg.burstOnLand).toBe(true);
    expect(keg.byPlayer).toBe(true);
    expect(keg.owner).toBe(0);
    expect(Math.abs(keg.x - e.x)).toBeLessThan(1);
    expect(keg.vx).toBe(0);
    expect(sim.s.stats.kegsShaken).toBe(1);
  });

  it('does nothing unless an armed Keg Hauler is held', () => {
    const sim = battleSim();
    // Empty hand.
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    // Another raider.
    const g = place(sim, 'grunt', 600);
    lift(sim, g);
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    sim.command({ k: 'release', p: 0, x: 600, y: 330, vx: 0, vy: 0 });
    // A Keg Hauler walking on the road.
    const walker = place(sim, 'bomber', 900);
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    expect(walker.armed).toBe(true);
    // A Keg Hauler already without its keg.
    const empty = place(sim, 'bomber', 800);
    empty.armed = false;
    lift(sim, empty);
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    expect(kegs(sim)).toHaveLength(0);
    expect(sim.s.stats.kegsShaken).toBe(0);
  });

  it('a second shake brings no second keg, and only the holding player can shake', () => {
    const sim = battleSim({ names: ['A', 'B'] });
    const e = place(sim, 'bomber', 700);
    lift(sim, e);
    expect(eventsOf(shake(sim, 1), 'kegLoose')).toHaveLength(0);
    expect(eventsOf(shake(sim, 0), 'kegLoose')).toHaveLength(1);
    expect(eventsOf(shake(sim, 0), 'kegLoose')).toHaveLength(0);
    expect(kegs(sim)).toHaveLength(1);
  });

  it('does nothing while paused or outside the fight', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 700);
    lift(sim, e);
    sim.command({ k: 'pause', p: 0, paused: true });
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    sim.command({ k: 'pause', p: 0, paused: false });
    sim.s.phase = 'runWon';
    expect(eventsOf(shake(sim), 'kegLoose')).toHaveLength(0);
    expect(e.armed).toBe(true);
  });

  it('the keg bursts where it lands, kills raiders below, and the hand cannot catch it', () => {
    const sim = battleSim({ names: ['A', 'B'] });
    sim.s.meta.tuning.walkSpeed = 0;
    const e = place(sim, 'bomber', 700);
    lift(sim, e, 700, 300);
    const below = place(sim, 'grunt', 700);
    const aside = place(sim, 'grunt', 700 + BEHAVIOUR.bomb.blastRadius + 120);
    shake(sim);
    const [keg] = kegs(sim);
    // The hand reaching for the falling keg does not take it.
    sim.setHand(1, keg.x, keg.y);
    sim.command({ k: 'press', p: 1, x: keg.x, y: keg.y });
    expect(keg.heldBy).toBe(-1);
    const ev = runUntil(sim, () => keg.t < 0, 200);
    const boom = eventsOf(ev, 'explosion');
    expect(boom).toHaveLength(1);
    expect(boom[0].y).toBeGreaterThanOrEqual(WORLD.groundY);
    expect(Math.abs(boom[0].x - 700)).toBeLessThan(2);
    expect(below.dead).toBe(true);
    expect(aside.dead).toBe(false);
    expect(e.dead).toBe(false);
    expect(sim.s.stats.kegBlastKills).toBe(1);
    expect(sim.s.stats.killsByCause.blast).toBe(1);
  });

  it('a keg shaken loose right at the gate spares the gate', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 400);
    lift(sim, e, WORLD.gateX + 30, 300);
    const hp = sim.s.gateHp;
    shake(sim);
    const [keg] = kegs(sim);
    const ev = runUntil(sim, () => keg.t < 0, 200);
    expect(eventsOf(ev, 'explosion')).toHaveLength(1);
    expect(eventsOf(ev, 'gateHit')).toHaveLength(0);
    expect(sim.s.gateHp).toBe(hp);
  });

  it('a quick tap on a Keg Hauler no longer drops the keg', () => {
    const sim = battleSim();
    const e = place(sim, 'bomber', 700);
    grabAt(sim, 0, e);
    sim.step();
    sim.command({ k: 'release', p: 0, x: sim.s.hands[0].x, y: sim.s.hands[0].y, vx: 0, vy: 0 });
    expect(e.armed).toBe(true);
    expect(kegs(sim)).toHaveLength(0);
    runUntil(sim, () => e.st === 'walk' || e.st === 'attack', 200);
    expect(e.armed).toBe(true);
    expect(sim.s.stats.kegsShaken).toBe(0);
  });
});

describe('a Keg Hauler on the eagle hook', () => {
  it('its keg falls off and bursts on the road below, counted as shaken loose', () => {
    const sim = battleSim();
    sim.s.meta.tuning.walkSpeed = 0;
    sim.loadout.stations.perch = true;
    const hx = perchX(1280);
    const below = place(sim, 'grunt', hx);
    const e = place(sim, 'bomber', 900);
    const hp = sim.s.gateHp;
    throwOntoHook(sim, e);
    const flown = runUntil(sim, () => e.st !== 'air', 120);
    expect(e.st).toBe('hooked');
    expect(e.armed).toBe(false);
    const ev = [...flown, ...sim.drainEvents(), ...runUntil(sim, () => kegs(sim).length === 0, 200)];
    expect(eventsOf(ev, 'kegLoose')).toHaveLength(1);
    const boom = eventsOf(ev, 'explosion');
    expect(boom).toHaveLength(1);
    expect(Math.abs(boom[0].x - hx)).toBeLessThan(2);
    expect(boom[0].y).toBeGreaterThanOrEqual(WORLD.groundY);
    expect(below.dead).toBe(true);
    expect(sim.s.gateHp).toBe(hp);
    expect(sim.s.stats.kegsShaken).toBe(1);
    expect(sim.s.stats.kegBlastKills).toBe(1);
    // The hauler itself still goes to the eagle.
    runUntil(sim, () => e.dead, 300);
    expect(sim.s.stats.killsByCause.eagle).toBe(1);
    expect(sim.s.crests).toBe(crestsFor('bomber'));
  });

  it('a Keg Hauler without a keg hangs there quietly', () => {
    const sim = battleSim();
    sim.loadout.stations.perch = true;
    const e = place(sim, 'bomber', 900);
    e.armed = false;
    throwOntoHook(sim, e);
    runUntil(sim, () => e.st !== 'air', 120);
    expect(e.st).toBe('hooked');
    expect(eventsOf(sim.drainEvents(), 'kegLoose')).toHaveLength(0);
    expect(kegs(sim)).toHaveLength(0);
  });
});

describe('the bomb is weaker than before', () => {
  it('the keg blast is smaller than in the alpha (95 px, 220 damage)', () => {
    expect(BEHAVIOUR.bomb.blastRadius).toBeLessThan(95);
    expect(BEHAVIOUR.bomb.blastDamage).toBeLessThan(220);
  });

  it('a thrown armed Keg Hauler bursts weaker than a loose keg', () => {
    expect(BEHAVIOUR.carrierBlast.radius).toBeLessThan(1);
    expect(BEHAVIOUR.carrierBlast.damage).toBeLessThan(1);

    // Thrown to its death with the keg on its back.
    const sim = battleSim();
    sim.s.meta.tuning.walkSpeed = 0;
    const e = place(sim, 'bomber', 700);
    const n = place(sim, 'grunt', 700);
    n.hp = n.maxHp = 1e5;
    flingUp(sim, e, 1800);
    const ev = runUntil(sim, () => e.dead, 300);
    const carrier = eventsOf(ev, 'explosion')[0];
    const carrierDamage = n.maxHp - n.hp;
    expect(sim.s.stats.kegBlastKills).toBe(0);

    // A loose keg, shaken off.
    const sim2 = battleSim();
    sim2.s.meta.tuning.walkSpeed = 0;
    const e2 = place(sim2, 'bomber', 700);
    lift(sim2, e2, 700, 300);
    const n2 = place(sim2, 'grunt', 700);
    n2.hp = n2.maxHp = 1e5;
    shake(sim2);
    const ev2 = runUntil(sim2, () => kegs(sim2).length === 0, 200);
    const loose = eventsOf(ev2, 'explosion')[0];
    const looseDamage = n2.maxHp - n2.hp;

    expect(carrier.radius).toBeLessThan(loose.radius);
    expect(carrierDamage).toBeLessThan(looseDamage);
    expect(carrier.radius).toBeCloseTo(BEHAVIOUR.bomb.blastRadius * BEHAVIOUR.carrierBlast.radius, 5);
    expect(looseDamage).toBe(BEHAVIOUR.bomb.blastDamage);
    expect(carrierDamage).toBeCloseTo(BEHAVIOUR.bomb.blastDamage * BEHAVIOUR.carrierBlast.damage, 5);
  });

  it('kills by the burst of a thrown hauler count as keg kills', () => {
    const sim = battleSim();
    sim.s.meta.tuning.walkSpeed = 0;
    const e = place(sim, 'bomber', 700);
    place(sim, 'grunt', 700);
    flingUp(sim, e, 1800);
    runUntil(sim, () => e.dead, 300);
    runUntil(sim, () => false, 5);
    expect(sim.s.stats.kegBlastKills).toBe(1);
    expect(sim.s.stats.killsByType.grunt).toBe(1);
    expect(ENEMIES.bomber.tip.toLowerCase()).toContain('shake');
  });
});
