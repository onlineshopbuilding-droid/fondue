/** How weapons pick their target on their own (src/sim/weapons/targeting.ts). */
import { describe, expect, it } from 'vitest';
import { WORLD } from '../../src/config/field';
import { ENEMIES } from '../../src/config/enemies';
import { allTargets, bodyY, crowdX, frontTarget, groundTargets, leadX, targetable, toughTarget } from '../../src/sim/weapons/targeting';
import { battleSim, grabAt, place } from './helpers';

function field() {
  const sim = battleSim();
  sim.s.meta.tuning.walkSpeed = 0;
  return sim;
}

describe('frontTarget', () => {
  it('is the raider closest to the gate', () => {
    const sim = field();
    place(sim, 'grunt', 900);
    const near = place(sim, 'grunt', 420);
    place(sim, 'goatRider', 600);
    expect(frontTarget(sim.ctx, false)).toBe(near);
  });

  it('is null on an empty road', () => {
    expect(frontTarget(field().ctx, false)).toBeNull();
    expect(frontTarget(field().ctx, true)).toBeNull();
  });

  it('counts fliers only when asked', () => {
    const sim = field();
    const b = place(sim, 'balloonist', 300);
    const g = place(sim, 'grunt', 600);
    expect(frontTarget(sim.ctx, false)).toBe(g);
    expect(frontTarget(sim.ctx, true)).toBe(b);
  });

  it('skips hidden, held, hooked, cooking and dead raiders', () => {
    const sim = field();
    sim.loadout.stations.cauldron = true;
    const hidden = place(sim, 'shade', 300);
    hidden.hidden = true;
    const held = place(sim, 'grunt', 320);
    grabAt(sim, 0, held);
    const hooked = place(sim, 'grunt', 340);
    hooked.st = 'hooked';
    const cooking = place(sim, 'grunt', 360);
    sim.enterPot(cooking);
    const dead = place(sim, 'grunt', 380);
    dead.dead = true;
    const fleeing = place(sim, 'grunt', 390);
    fleeing.st = 'flee';
    const ok = place(sim, 'grunt', 800);
    for (const e of [hidden, held, hooked, cooking, dead, fleeing]) expect(targetable(sim.ctx, e), e.type + e.st).toBe(false);
    expect(frontTarget(sim.ctx, true)).toBe(ok);
    expect(allTargets(sim.ctx)).toEqual([ok]);
  });

  it('ignores raiders still beyond the right edge of the field', () => {
    const sim = field();
    place(sim, 'grunt', 1280 + 40);
    expect(frontTarget(sim.ctx, false)).toBeNull();
    const inside = place(sim, 'grunt', 1280 + 5);
    expect(frontTarget(sim.ctx, false)).toBe(inside);
  });

  it('a raider flying through the air is no ground target', () => {
    const sim = field();
    const e = place(sim, 'grunt', 600);
    e.st = 'air';
    expect(groundTargets(sim.ctx)).toEqual([]);
    expect(allTargets(sim.ctx)).toEqual([e]);
  });
});

describe('crowdX', () => {
  it('finds the middle of the densest group', () => {
    const sim = field();
    place(sim, 'grunt', 350);
    for (const x of [800, 830, 860, 890]) place(sim, 'grunt', x);
    place(sim, 'grunt', 1150);
    expect(crowdX(sim.ctx, 60)).toBe(845);
  });

  it('a bigger group beats a nearer one', () => {
    const sim = field();
    for (const x of [400, 420]) place(sim, 'grunt', x);
    for (const x of [900, 910, 920]) place(sim, 'grunt', x);
    expect(crowdX(sim.ctx, 50)).toBe(910);
  });

  it('with equal groups the one nearer the gate wins', () => {
    const sim = field();
    for (const x of [900, 930]) place(sim, 'grunt', x);
    for (const x of [500, 530]) place(sim, 'grunt', x);
    expect(crowdX(sim.ctx, 40)).toBe(515);
  });

  it('a single raider is a group of one; an empty road gives null', () => {
    const sim = field();
    expect(crowdX(sim.ctx, 100)).toBeNull();
    place(sim, 'grunt', 640);
    expect(crowdX(sim.ctx, 100)).toBe(640);
  });

  it('the window decides what counts as one group', () => {
    const sim = field();
    for (const x of [500, 600, 700]) place(sim, 'grunt', x);
    for (const x of [1000, 1010]) place(sim, 'grunt', x);
    expect(crowdX(sim.ctx, 20)).toBe(1005);
    expect(crowdX(sim.ctx, 100)).toBe(600);
  });

  it('leaves out fliers and hidden raiders', () => {
    const sim = field();
    for (const x of [400, 410, 420]) place(sim, 'balloonist', x);
    for (const x of [500, 510, 520]) { const s = place(sim, 'shade', x); s.hidden = true; }
    place(sim, 'grunt', 900);
    expect(crowdX(sim.ctx, 50)).toBe(900);
  });

  it('with a lead, aims where walking raiders will be, never past the gate', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt', 800);
    const v = sim.ctx.speedOf(e);
    expect(leadX(sim.ctx, e, 0.5)).toBeCloseTo(800 - v * 0.5, 5);
    expect(crowdX(sim.ctx, 50, 0.5)).toBeCloseTo(800 - v * 0.5, 5);
    const close = place(sim, 'grunt', WORLD.gateX + 30);
    expect(leadX(sim.ctx, close, 5)).toBe(WORLD.gateX + ENEMIES.grunt.range);
    close.st = 'stun';
    expect(leadX(sim.ctx, close, 5)).toBe(close.x);
  });
});

describe('toughTarget', () => {
  it('is the raider with the most hit points left, in the air or on the ground', () => {
    const sim = field();
    place(sim, 'grunt', 400);
    const cart = place(sim, 'siegeCart', 900);
    place(sim, 'hexer', 600);
    expect(toughTarget(sim.ctx)).toBe(cart);
    const b = place(sim, 'balloonist', 500);
    b.hp = 5000;
    expect(toughTarget(sim.ctx)).toBe(b);
  });

  it('counts what is left, not what it started with', () => {
    const sim = field();
    const yeti = place(sim, 'yeti', 900);
    const cart = place(sim, 'siegeCart', 600);
    expect(toughTarget(sim.ctx)).toBe(yeti);
    yeti.hp = 10;
    expect(toughTarget(sim.ctx)).toBe(cart);
  });

  it('skips a held or hidden giant and is null on an empty field', () => {
    const sim = field();
    expect(toughTarget(sim.ctx)).toBeNull();
    const yeti = place(sim, 'yeti', 900);
    yeti.st = 'held';
    const g = place(sim, 'grunt', 500);
    expect(toughTarget(sim.ctx)).toBe(g);
    yeti.st = 'walk';
    yeti.hidden = true;
    expect(toughTarget(sim.ctx)).toBe(g);
  });

  it('bolts and lightning hit the middle of the body', () => {
    const sim = field();
    const e = place(sim, 'grunt', 500);
    expect(bodyY(e)).toBeCloseTo(e.y - ENEMIES.grunt.height / 2, 6);
  });
});
