/**
 * The 16 weapons of the keep: a tap fires, the weapon aims on its own (src/sim/weapons/targeting.ts),
 * and every tier does what its row in src/config/weapons.ts says.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { WORLD } from '../../src/config/field';
import { SLOTS, type SlotDef } from '../../src/config/slots';
import {
  MAX_TIER, WEAPONS, activeWeapons, weaponById, weaponsForSlot,
  type BeaconTier, type ChainTier, type GoldTier, type PuddleTier, type PushTier, type RollTier, type SentryTier,
  type ShellTier, type SkyTier, type SlamTier, type SpikesTier, type StopTier, type ThornsTier, type VolleyTier, type WeaponDef,
} from '../../src/config/weapons';
import { ENDLESS } from '../../src/modes';
import { CAMPAIGN } from '../../src/modes';
import type { Sim } from '../../src/sim/sim';
import type { Enemy } from '../../src/sim/types';
import { PROFILE, arm, battleSim, denied, eventsOf, fire, firedOk, flingUp, grabAt, place, runFor, runUntil, slotFor } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tierOf = <T>(id: string, tier: number): T => weaponById(id)!.tiers[tier - 1] as any as T;

/** A raider that survives everything, so damage can be read off its hit points. */
function tough(e: Enemy, hp = 100000): Enemy {
  e.hp = hp; e.maxHp = hp;
  return e;
}

/** A fight with one weapon on the keep and raiders that stand still where they are put. */
function rig(id: string, tier: number, still = true) {
  const sim = battleSim();
  if (still) sim.s.meta.tuning.walkSpeed = 0;
  const slot = arm(sim, id, tier);
  return { sim, slot };
}

const lost = (e: Enemy) => e.maxHp - e.hp;

describe('the weapon table', () => {
  it('has 16 weapons, each with exactly five tiers', () => {
    expect(WEAPONS).toHaveLength(16);
    expect(MAX_TIER).toBe(5);
    for (const w of WEAPONS) expect(w.tiers, w.id).toHaveLength(5);
    expect(new Set(WEAPONS.map((w) => w.id)).size).toBe(16);
  });

  it('every slot type has at least three active weapons', () => {
    for (const type of new Set(SLOTS.map((s: SlotDef) => s.type))) expect(weaponsForSlot(type).length, type).toBeGreaterThanOrEqual(3);
  });

  it('every weapon fits a slot of the keep and has a price and a description', () => {
    for (const w of WEAPONS) {
      expect(SLOTS.some((s) => s.type === w.slotType), w.id).toBe(true);
      expect(w.buyGold, w.id).toBeGreaterThan(0);
      expect(w.desc.length, w.id).toBeGreaterThan(10);
      for (const t of w.tiers) expect(t.note.length, w.id).toBeGreaterThan(3);
    }
  });

  /** What makes a tier stronger, per kind: each value must never go down from one tier to the next. */
  const power = (w: WeaponDef, i: number): number[] => {
    const t = w.tiers[i] as unknown as Record<string, number & boolean>;
    const b = (v: boolean) => (v ? 1 : 0);
    switch (w.kind) {
      case 'roll': return [t.damage * t.wheels, t.maxHits, t.radius, t.fireTrail, t.wheels];
      case 'puddle': return [t.halfWidth, t.seconds, -t.slow, t.dps];
      case 'spikes': return [t.damage * t.pulses, t.pin, t.halfWidth, t.pulses];
      case 'slam': return [t.damage * t.slams, t.halfWidth, t.shockRadius, t.shockStun, t.slams];
      case 'push': return [t.reach, t.push, t.damage, b(t.hitsAir)];
      case 'stop': return [t.seconds, b(t.hitsAir), b(t.breaksGuards)];
      case 'sky': return [t.damage, t.radius, t.flameSeconds, t.shards];
      case 'chain': return [t.damage, t.jumps, t.jumpRange, t.falloff, t.stun];
      case 'gold': return [t.seconds, t.factor];
      case 'shell': return [t.damage * t.shells * Math.max(1, t.seconds), t.radius * t.shells, t.seconds, t.shatterSpread, t.shells];
      case 'thorns': return [t.reflect, t.burstDamage, t.burstReach];
      case 'volley': return [t.bolts * t.volleys * t.damage, t.bolts * t.volleys, b(t.pierce)];
      case 'sentry': return [t.damage / t.every, t.damage, t.burst, -t.every];
      case 'beacon': return [t.seconds, t.radius, t.damage, t.flameSeconds];
    }
  };

  it('tier N is never weaker than tier N-1, and its reload is never longer', () => {
    for (const w of WEAPONS) {
      for (let i = 1; i < w.tiers.length; i++) {
        const before = power(w, i - 1);
        const now = power(w, i);
        now.forEach((v, k) => expect(v, `${w.id} tier ${i + 1} value ${k}`).toBeGreaterThanOrEqual(before[k] - 1e-9));
        expect(w.tiers[i].cooldown, `${w.id} tier ${i + 1} cooldown`).toBeLessThanOrEqual(w.tiers[i - 1].cooldown);
        // Each step must bring something: a stronger value or a shorter reload.
        const better = now.some((v, k) => v > before[k] + 1e-9) || w.tiers[i].cooldown < w.tiers[i - 1].cooldown;
        expect(better, `${w.id} tier ${i + 1} adds nothing`).toBe(true);
      }
    }
  });

  describe('a weapon switched off', () => {
    const id = 'cuckoo';
    afterEach(() => { weaponById(id)!.enabled = true; });

    it('leaves the market, the slot lists and the rules of both modes', async () => {
      weaponById(id)!.enabled = false;
      expect(activeWeapons().map((w) => w.id)).not.toContain(id);
      expect(weaponsForSlot('wall').map((w) => w.id)).not.toContain(id);
      const endless = ENDLESS.buildRun(PROFILE, { world: 'fondue' }, { names: ['A'], fieldW: 1280, handTiers: [1], seed: 1 });
      expect(endless.rules.weapons[id].offered).toBe(false);
      const sim = battleSim();
      sim.s.meta.rules.weapons[id].offered = false;
      expect(sim.quote(`weapon:${slotFor(id)}:${id}`).reason).toBe('locked');
      const profile = PROFILE;
      const campaign = CAMPAIGN.buildRun(profile, { world: 'fondue', level: 1 }, { names: ['A'], fieldW: 1280, handTiers: [1] });
      expect(campaign.rules.weapons[id].offered).toBe(false);
    });

    it('cannot be bought even when the rules of a run still offered it', () => {
      const sim = battleSim();
      weaponById(id)!.enabled = false;
      expect(sim.s.meta.rules.weapons[id].offered).toBe(true);
      expect(sim.quote(`weapon:${slotFor(id)}:${id}`).reason).toBe('locked');
    });
  });
});

describe('a tap on a weapon', () => {
  /** Weapons that need someone to aim at; buffs (gold, beacon) always work. */
  const NEEDS_TARGET = WEAPONS.filter((w) => w.kind !== 'gold' && w.kind !== 'beacon' && w.kind !== 'roll');

  it('without a target costs nothing: denied, and no reload starts', () => {
    for (const w of NEEDS_TARGET) {
      const { sim, slot } = rig(w.id, 1);
      const ev = fire(sim, slot);
      expect(denied(ev), w.id).toBe(true);
      expect(firedOk(ev), w.id).toBe(false);
      expect(sim.s.cooldowns[slot], w.id).toBe(0);
      expect(sim.s.stats.weaponShots[w.id] ?? 0, w.id).toBe(0);
    }
  });

  it('the wheel on an empty road costs nothing either', () => {
    const { sim, slot } = rig('wheel', 1);
    const ev = fire(sim, slot);
    expect(denied(ev)).toBe(true);
    expect(sim.s.cooldowns[slot]).toBe(0);
  });

  it('starts the reload only when it fired, at the time of its tier', () => {
    for (const w of WEAPONS) {
      for (const tier of [1, 5]) {
        const { sim, slot } = rig(w.id, tier);
        place(sim, 'grunt', WORLD.gateX + 60);
        place(sim, 'grunt', 600);
        place(sim, 'grunt', 640);
        const ev = fire(sim, slot);
        expect(firedOk(ev), `${w.id} ${tier}`).toBe(true);
        expect(sim.s.cooldowns[slot], `${w.id} ${tier}`).toBe(w.tiers[tier - 1].cooldown);
        expect(sim.s.cooldownMax[slot], `${w.id} ${tier}`).toBe(w.tiers[tier - 1].cooldown);
        expect(eventsOf(ev, 'fire')[0]).toMatchObject({ slot, weapon: w.id, tier });
        // A second tap while it reloads is refused and changes nothing.
        const again = fire(sim, slot);
        expect(denied(again), w.id).toBe(true);
        expect(sim.s.cooldowns[slot]).toBe(w.tiers[tier - 1].cooldown);
      }
    }
  });

  it('is ready again after the reload and says so', () => {
    const { sim, slot } = rig('mortar', 1);
    place(sim, 'grunt', 600);
    fire(sim, slot);
    const ev = runFor(sim, tierOf<ShellTier>('mortar', 1).cooldown + 0.05);
    expect(eventsOf(ev, 'weaponReady').some((x) => x.slot === slot)).toBe(true);
    expect(sim.s.cooldowns[slot]).toBe(0);
  });

  it('the reload is shared: the second player cannot fire it again', () => {
    const sim = battleSim({ names: ['A', 'B'] });
    const slot = arm(sim, 'mortar', 1);
    place(sim, 'grunt', 700);
    expect(firedOk(fire(sim, slot, 0))).toBe(true);
    expect(denied(fire(sim, slot, 1))).toBe(true);
  });

  it('does nothing outside the fight', () => {
    const sim = battleSim();
    const slot = arm(sim, 'mortar', 1);
    place(sim, 'grunt', 700);
    sim.s.phase = 'intermission';
    expect(firedOk(fire(sim, slot))).toBe(false);
    expect(sim.s.cooldowns[slot]).toBe(0);
  });
});

describe('Rolling Wheel', () => {
  it('tier 1: one stone wheel with the damage and hit limit of its row', () => {
    const t = tierOf<RollTier>('wheel', 1);
    const { sim, slot } = rig('wheel', 1);
    const a = tough(place(sim, 'grunt', 500));
    fire(sim, slot);
    const wheels = sim.s.projectiles.filter((q) => q.kind === 'wheel');
    expect(wheels).toHaveLength(1);
    expect(wheels[0]).toMatchObject({ damage: t.damage, size: t.radius, maxHits: t.maxHits, seconds: 0 });
    const ev = runFor(sim, 1.5);
    expect(lost(a)).toBe(t.damage);
    expect(eventsOf(ev, 'zone')).toHaveLength(0);
  });

  it('tier 5: twin wheels a moment apart, and a trail of fire', () => {
    const t = tierOf<RollTier>('wheel', 5);
    const { sim, slot } = rig('wheel', 5);
    const a = tough(place(sim, 'grunt', 700));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'wheel')).toHaveLength(1);
    expect(sim.s.delayed).toHaveLength(1);
    const ev = runFor(sim, 2);
    expect(eventsOf(ev, 'wheel')).toHaveLength(1);
    // Both wheels hit; the burning trail adds a little more.
    expect(lost(a)).toBeGreaterThanOrEqual(2 * t.damage);
    expect(lost(a)).toBeLessThan(3 * t.damage);
    expect(eventsOf(ev, 'zone').filter((z) => z.kind === 'fire').length).toBeGreaterThan(2);
  });
});

describe('Sticky Fondue', () => {
  it('tier 1: a puddle in front of the foremost raider that slows but does not burn', () => {
    const t = tierOf<PuddleTier>('cheese', 1);
    const sim = battleSim();
    const slot = arm(sim, 'cheese', 1);
    const front = place(sim, 'grunt', 600);
    const back = place(sim, 'grunt', 1100);
    const free = sim.ctx.speedOf(front);
    fire(sim, slot);
    const z = sim.s.zones.find((q) => q.kind === 'cheese')!;
    expect(z).toMatchObject({ halfWidth: t.halfWidth, t: t.seconds, slow: t.slow, dps: 0 });
    expect(Math.abs(front.x - z.x)).toBeLessThanOrEqual(z.halfWidth);
    expect(Math.abs(back.x - z.x)).toBeGreaterThan(z.halfWidth);
    expect(sim.ctx.speedOf(front)).toBeCloseTo(free * t.slow, 5);
    runFor(sim, 1);
    expect(front.hp).toBe(front.maxHp);
    runFor(sim, t.seconds);
    expect(sim.s.zones).toHaveLength(0);
  });

  it('tier 5: wider, slower and it burns', () => {
    const t = tierOf<PuddleTier>('cheese', 5);
    const { sim, slot } = rig('cheese', 5);
    const front = tough(place(sim, 'grunt', 600));
    fire(sim, slot);
    const z = sim.s.zones.find((q) => q.kind === 'cheese')!;
    expect(z).toMatchObject({ halfWidth: t.halfWidth, slow: t.slow, dps: t.dps });
    runFor(sim, 2);
    expect(lost(front)).toBeGreaterThan(t.dps * 1.9);
    expect(lost(front)).toBeLessThan(t.dps * 2.1);
  });
});

describe('Fondue Forks', () => {
  it('tier 1: one stab under the thickest group that hurts and pins', () => {
    const t = tierOf<SpikesTier>('forks', 1);
    const { sim, slot } = rig('forks', 1);
    const lone = tough(place(sim, 'grunt', 350));
    const group = [700, 730, 760].map((x) => tough(place(sim, 'grunt', x)));
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'spikes')).toHaveLength(1);
    for (const e of group) { expect(lost(e)).toBe(t.damage); expect(e.st).toBe('stun'); expect(e.t).toBeCloseTo(t.pin, 5); }
    expect(lost(lone)).toBe(0);
    expect(runFor(sim, 2).filter((x) => x.e === 'spikes')).toHaveLength(0);
  });

  it('tier 5: three stabs in a row at the same spot', () => {
    const t = tierOf<SpikesTier>('forks', 5);
    const { sim, slot } = rig('forks', 5);
    const e = tough(place(sim, 'grunt', 700));
    const ev = [...fire(sim, slot), ...runFor(sim, 2)];
    expect(eventsOf(ev, 'spikes')).toHaveLength(t.pulses);
    expect(lost(e)).toBe(t.damage * t.pulses);
  });
});

describe('Stomper', () => {
  it('tier 1: one block on the thickest group, no tremor', () => {
    const t = tierOf<SlamTier>('stomper', 1);
    const { sim, slot } = rig('stomper', 1);
    const group = [800, 820, 840].map((x) => tough(place(sim, 'grunt', x)));
    const lone = tough(place(sim, 'grunt', 400));
    const near = tough(place(sim, 'grunt', 820 + t.halfWidth + 100));
    const ev = [...fire(sim, slot), ...runFor(sim, 1.5)];
    const slams = eventsOf(ev, 'slam');
    expect(slams).toHaveLength(1);
    expect(Math.abs(slams[0].x - 820)).toBeLessThan(5);
    for (const e of group) expect(lost(e)).toBe(t.damage);
    expect(lost(lone)).toBe(0);
    expect(near.st).not.toBe('stun');
  });

  it('tier 5: three strikes, and the tremor dazes raiders beside the block', () => {
    const t = tierOf<SlamTier>('stomper', 5);
    const { sim, slot } = rig('stomper', 5);
    const hit = tough(place(sim, 'grunt', 800));
    // Outside the block's window, so not part of the same group, but within the tremor.
    const beside = tough(place(sim, 'grunt', 800 + t.halfWidth * 2 + 15));
    expect(800 + t.halfWidth * 2 + 15 - 800).toBeLessThanOrEqual(t.shockRadius);
    const ev = [...fire(sim, slot), ...runFor(sim, 0.4)];
    expect(eventsOf(ev, 'slam')).toHaveLength(1);
    expect(lost(beside)).toBe(0);
    expect(beside.st).toBe('stun');
    const later = runFor(sim, 2);
    expect(eventsOf(ev, 'slam').length + eventsOf(later, 'slam').length).toBe(t.slams);
    expect(lost(hit)).toBeGreaterThanOrEqual(t.damage * 2);
  });
});

describe('Alphorn', () => {
  it('tier 1: throws back whoever is near the gate, but not balloons, siege carts or yetis', () => {
    const t = tierOf<PushTier>('alphorn', 1);
    const { sim, slot } = rig('alphorn', 1);
    const near = tough(place(sim, 'grunt', WORLD.gateX + 100));
    const far = tough(place(sim, 'grunt', WORLD.gateX + t.reach + 80));
    const balloon = tough(place(sim, 'balloonist', WORLD.gateX + 150));
    const cart = tough(place(sim, 'siegeCart', WORLD.gateX + 200));
    const x0 = near.x;
    const bx = balloon.x;
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'hornBlast')[0].reach).toBe(t.reach);
    expect(near.st).toBe('air');
    expect(lost(near)).toBe(t.damage);
    expect(lost(far)).toBe(0);
    expect(balloon.x).toBe(bx);
    expect(lost(balloon)).toBe(0);
    expect(lost(cart)).toBe(0);
    runUntil(sim, () => near.st !== 'air', 200);
    expect(near.x).toBeGreaterThan(x0 + 60);
  });

  it('tier 5: reaches half the road, hurts more, blows fliers back too', () => {
    const t1 = tierOf<PushTier>('alphorn', 1);
    const t = tierOf<PushTier>('alphorn', 5);
    const { sim, slot } = rig('alphorn', 5);
    const e = tough(place(sim, 'grunt', WORLD.gateX + 100));
    const mid = tough(place(sim, 'grunt', WORLD.gateX + t.reach - 50));
    const balloon = tough(place(sim, 'balloonist', WORLD.gateX + 150));
    const bx = balloon.x;
    const x0 = e.x;
    fire(sim, slot);
    expect(lost(e)).toBe(t.damage);
    expect(mid.st).toBe('air');
    expect(balloon.x).toBe(bx + t.push);
    runUntil(sim, () => e.st !== 'air', 200);
    // Compare with tier 1 from the same spot.
    const { sim: s1, slot: one } = rig('alphorn', 1);
    const e1 = tough(place(s1, 'grunt', WORLD.gateX + 100));
    fire(s1, one);
    runUntil(s1, () => e1.st !== 'air', 200);
    expect(e.x - x0).toBeGreaterThan(e1.x - x0);
    expect(t.push).toBeGreaterThan(t1.push);
  });

  it('the first tier that reaches fliers is the first with hitsAir', () => {
    const def = weaponById('alphorn')!;
    const first = def.tiers.findIndex((x) => (x as PushTier).hitsAir) + 1;
    expect(first).toBeGreaterThan(1);
    for (const tier of [first - 1, first]) {
      const { sim, slot } = rig('alphorn', tier);
      place(sim, 'grunt', WORLD.gateX + 80);
      const b = tough(place(sim, 'balloonist', WORLD.gateX + 150));
      const bx = b.x;
      fire(sim, slot);
      expect(b.x > bx, `tier ${tier}`).toBe(tier >= first);
    }
  });
});

describe('Cuckoo Clock', () => {
  it('tier 1: raiders on the road stand still, fliers fly on', () => {
    const t = tierOf<StopTier>('cuckoo', 1);
    const { sim, slot } = rig('cuckoo', 1, false);
    const g = place(sim, 'grunt', 800);
    const b = place(sim, 'balloonist', 900);
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'cuckoo')[0].seconds).toBe(t.seconds);
    const gx = g.x;
    const bx = b.x;
    runFor(sim, t.seconds - 0.2);
    expect(g.x).toBe(gx);
    expect(g.st).toBe('stun');
    expect(b.x).toBeLessThan(bx - 50);
    expect(sim.s.airStopT).toBe(0);
    runFor(sim, 0.5);
    expect(g.st).toBe('walk');
  });

  it('time stops for fliers from the first tier with hitsAir', () => {
    const def = weaponById('cuckoo')!;
    const first = def.tiers.findIndex((x) => (x as StopTier).hitsAir) + 1;
    expect(first).toBeGreaterThan(1);
    for (const tier of [first - 1, first]) {
      const t = tierOf<StopTier>('cuckoo', tier);
      const { sim, slot } = rig('cuckoo', tier, false);
      const b = place(sim, 'balloonist', 900);
      runFor(sim, 0.1);
      const bx = b.x;
      fire(sim, slot);
      runFor(sim, t.seconds - 0.3);
      if (tier >= first) expect(b.x, `tier ${tier}`).toBe(bx);
      else expect(b.x, `tier ${tier}`).toBeLessThan(bx - 30);
    }
  });

  it('tier 5: the longest pause, and it bursts bubbles and shows shades', () => {
    const t = tierOf<StopTier>('cuckoo', 5);
    const { sim, slot } = rig('cuckoo', 5, false);
    const hexer = place(sim, 'hexer', 700);
    hexer.shieldOn = true;
    const crow = place(sim, 'balloonist', 900);
    const cx = crow.x;
    fire(sim, slot);
    expect(hexer.shieldOn).toBe(false);
    expect(hexer.st).toBe('stun');
    expect(sim.s.airStopT).toBe(t.seconds);
    runFor(sim, t.seconds - 0.2);
    expect(crow.x).toBe(cx);
    expect(hexer.shieldOn).toBe(false);
    // A shielded raider stays grabbable for the whole pause.
    grabAt(sim, 0, hexer);
    expect(hexer.st).toBe('held');
  });

  it('tier 5: a hidden shade shows itself', () => {
    const { sim, slot } = rig('cuckoo', 5, false);
    place(sim, 'grunt', 600);
    const shade = place(sim, 'shade', 800);
    shade.hidden = true;
    fire(sim, slot);
    expect(shade.hidden).toBe(false);
  });

  it('a shield is not broken on the tiers before breaksGuards', () => {
    const { sim, slot } = rig('cuckoo', 3, false);
    const hexer = place(sim, 'hexer', 700);
    hexer.shieldOn = true;
    fire(sim, slot);
    expect(hexer.shieldOn).toBe(true);
  });
});

describe('Comet', () => {
  it('tier 1: one comet on the thickest group, a blast and a patch of fire', () => {
    const t = tierOf<SkyTier>('comet', 1);
    const { sim, slot } = rig('comet', 1);
    const group = [800, 830, 860].map((x) => tough(place(sim, 'grunt', x)));
    tough(place(sim, 'grunt', 400));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'comet')).toHaveLength(1);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const blasts = eventsOf(ev, 'explosion');
    expect(blasts).toHaveLength(1);
    expect(Math.abs(blasts[0].x - 830)).toBeLessThan(3);
    expect(blasts[0].radius).toBe(t.radius);
    for (const e of group) expect(lost(e)).toBeGreaterThanOrEqual(t.damage);
    const fires = sim.s.zones.filter((z) => z.kind === 'fire');
    expect(fires).toHaveLength(1);
    expect(fires[0].dur).toBe(t.flameSeconds);
  });

  it('tier 5: the comet breaks into shards that land beside it, smaller and weaker', () => {
    const t = tierOf<SkyTier>('comet', 5);
    const { sim, slot } = rig('comet', 5);
    const centre = tough(place(sim, 'grunt', 800));
    const step = t.radius * 0.95;
    const shardSpot = tough(place(sim, 'grunt', 800 + step * 2));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'comet')).toHaveLength(1 + t.shards);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const blasts = eventsOf(ev, 'explosion');
    expect(blasts).toHaveLength(1 + t.shards);
    const big = blasts.filter((b) => b.radius === t.radius);
    const small = blasts.filter((b) => b.radius < t.radius);
    expect(big).toHaveLength(1);
    expect(small).toHaveLength(t.shards);
    const centreX = big[0].x;
    for (const s of small) {
      expect(s.radius).toBeCloseTo(t.radius * 0.55, 5);
      expect(Math.abs(s.x - centreX)).toBeGreaterThan(t.radius * 0.5);
    }
    // Shards land on both sides.
    expect(small.some((s) => s.x > centreX) && small.some((s) => s.x < centreX)).toBe(true);
    expect(lost(centre)).toBeGreaterThanOrEqual(t.damage);
    expect(lost(shardSpot)).toBeGreaterThanOrEqual(t.damage * 0.45 - 1e-6);
    expect(sim.s.zones.filter((z) => z.kind === 'fire')).toHaveLength(1 + t.shards);
  });
});

describe('Storm Bell', () => {
  it('tier 1: strikes the toughest raider and jumps twice, weaker each time, no daze', () => {
    const t = tierOf<ChainTier>('bell', 1);
    const { sim, slot } = rig('bell', 1);
    const row = [600, 700, 800, 900].map((x) => tough(place(sim, 'grunt', x), 50000));
    const boss = tough(place(sim, 'grunt', 500), 90000);
    const ev = fire(sim, slot);
    expect(lost(boss)).toBe(t.damage);
    expect(lost(row[0])).toBeCloseTo(t.damage * t.falloff, 5);
    expect(lost(row[1])).toBeCloseTo(t.damage * t.falloff * t.falloff, 5);
    expect(lost(row[2])).toBe(0);
    const bolt = eventsOf(ev, 'lightning')[0];
    expect(bolt.points).toHaveLength(2 + 2 * (1 + t.jumps));
    expect(boss.st).toBe('walk');
  });

  it('tier 5: seven jumps over the whole group, and survivors are dazed', () => {
    const t = tierOf<ChainTier>('bell', 5);
    const { sim, slot } = rig('bell', 5);
    const row = Array.from({ length: 9 }, (_, i) => tough(place(sim, 'grunt', 400 + i * 100), 50000 - i));
    fire(sim, slot);
    const struck = row.filter((e) => lost(e) > 0);
    expect(struck).toHaveLength(1 + t.jumps);
    expect(lost(row[0])).toBe(t.damage);
    expect(lost(row[t.jumps])).toBeCloseTo(t.damage * t.falloff ** t.jumps, 3);
    for (const e of struck) { expect(e.st).toBe('stun'); expect(e.t).toBeCloseTo(t.stun, 5); }
  });

  it('a jump never goes further than its range', () => {
    const t = tierOf<ChainTier>('bell', 1);
    const { sim, slot } = rig('bell', 1);
    const a = tough(place(sim, 'grunt', 500), 90000);
    const far = tough(place(sim, 'grunt', 500 + t.jumpRange + 40), 50000);
    fire(sim, slot);
    expect(lost(a)).toBe(t.damage);
    expect(lost(far)).toBe(0);
  });
});

describe('Golden Fondue', () => {
  const killPays = (sim: Sim) => {
    const e = place(sim, 'grunt', 800);
    const before = sim.s.gold;
    sim.hurt(e, 1e9, 'blast', 0);
    return sim.s.gold - before;
  };

  for (const tier of [1, 5]) {
    it(`tier ${tier}: for its seconds every kill pays its factor, then plain gold again`, () => {
      const t = tierOf<GoldTier>('midas', tier);
      const { sim, slot } = rig('midas', tier);
      expect(killPays(sim)).toBe(10);
      const ev = fire(sim, slot);
      expect(eventsOf(ev, 'goldRush')[0].seconds).toBe(t.seconds);
      expect(sim.s.goldRushT).toBe(t.seconds);
      expect(killPays(sim)).toBe(Math.round(10 * t.factor));
      runFor(sim, t.seconds - 0.5);
      expect(killPays(sim)).toBe(Math.round(10 * t.factor));
      runFor(sim, 0.6);
      expect(sim.s.goldRushT).toBe(0);
      expect(killPays(sim)).toBe(10);
    });
  }

  it('the rush ends with the day', () => {
    const { sim, slot } = rig('midas', 5);
    fire(sim, slot);
    sim.s.dayT = sim.s.meta.today.seconds;
    runUntil(sim, () => sim.s.phase === 'intermission', 600);
    sim.command({ k: 'ready', p: 0, ready: true });
    expect(sim.s.goldRushT).toBe(0);
    expect(sim.s.goldRushFactor).toBe(1);
  });
});

describe('Gate Mortar', () => {
  it('tier 1: one shell at the raider closest to the gate, not at the crowd', () => {
    const t = tierOf<ShellTier>('mortar', 1);
    const { sim, slot } = rig('mortar', 1);
    const front = tough(place(sim, 'grunt', 420));
    [900, 920, 940, 960].forEach((x) => tough(place(sim, 'grunt', x)));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'shell')).toHaveLength(1);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const boom = eventsOf(ev, 'explosion');
    expect(boom).toHaveLength(1);
    expect(Math.abs(boom[0].x - 420)).toBeLessThan(6);
    expect(boom[0].radius).toBe(t.radius);
    expect(lost(front)).toBe(t.damage);
  });

  it('aims where a walking raider will be when the shell comes down', () => {
    const sim = battleSim();
    const slot = arm(sim, 'mortar', 1);
    const e = place(sim, 'goatRider', 800);
    tough(e);
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(lost(e)).toBe(tierOf<ShellTier>('mortar', 1).damage);
  });

  it('tier 5: four shells walking up the column behind the first raider', () => {
    const t = tierOf<ShellTier>('mortar', 5);
    const { sim, slot } = rig('mortar', 5);
    const col = [400, 400 + t.radius * 1.1, 400 + t.radius * 2.2, 400 + t.radius * 3.3].map((x) => tough(place(sim, 'grunt', x)));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'shell')).toHaveLength(t.shells);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    const xs = eventsOf(ev, 'explosion').map((b) => b.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(t.shells);
    xs.forEach((x, i) => expect(Math.abs(x - (400 + i * t.radius * 1.1))).toBeLessThan(6));
    for (const e of col) expect(lost(e)).toBeGreaterThanOrEqual(t.damage);
  });

  it('ignores balloons when it picks its target', () => {
    const { sim, slot } = rig('mortar', 1);
    place(sim, 'balloonist', 300);
    const g = tough(place(sim, 'grunt', 700));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(lost(g)).toBeGreaterThan(0);
  });
});

describe('Frost Horn', () => {
  it('tier 1: ice on the thickest group; breaking one breaks only that one', () => {
    const t = tierOf<ShellTier>('frost', 1);
    const { sim, slot } = rig('frost', 1);
    const lone = place(sim, 'grunt', 380);
    const group = [800, 840, 880].map((x) => place(sim, 'grunt', x));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    for (const e of group) { expect(e.st).toBe('frozen'); expect(e.t).toBeCloseTo(t.seconds, 1); }
    expect(lone.st).toBe('walk');
    // A tap on a frozen raider breaks it.
    const [a, b] = group;
    sim.setHand(0, a.x, a.y - 40);
    sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 40 });
    sim.command({ k: 'release', p: 0, x: a.x, y: a.y - 40, vx: 0, vy: 0 });
    expect(a.dead).toBe(true);
    expect(b.dead).toBe(false);
    expect(b.st).toBe('frozen');
  });

  it('tier 5: a wider, longer freeze, and the cracks of one break its frozen neighbours', () => {
    const t = tierOf<ShellTier>('frost', 5);
    const { sim, slot } = rig('frost', 5);
    const xs = [700, 760, 800, 700 + t.shatterSpread + 20];
    const list = xs.map((x) => place(sim, 'grunt', x));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    for (const e of list) expect(e.st).toBe('frozen');
    expect(list[0].t).toBeCloseTo(t.seconds, 1);
    const a = list[0];
    sim.setHand(0, a.x, a.y - 40);
    sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 40 });
    sim.command({ k: 'release', p: 0, x: a.x, y: a.y - 40, vx: 0, vy: 0 });
    expect(list.slice(0, 3).every((e) => e.dead)).toBe(true);
    expect(list[3].dead).toBe(false);
    expect(list[3].st).toBe('frozen');
    expect(sim.s.stats.killsByCause.shatter).toBe(3);
  });

  it('does not freeze siege carts or big raiders', () => {
    const { sim, slot } = rig('frost', 5);
    const cart = place(sim, 'siegeCart', 800);
    const g = place(sim, 'grunt', 820);
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(g.st).toBe('frozen');
    expect(cart.st).not.toBe('frozen');
  });
});

describe('Dragon Bellows', () => {
  it('tier 1: one stretch of burning road under the thickest group', () => {
    const t = tierOf<ShellTier>('bellows', 1);
    const { sim, slot } = rig('bellows', 1);
    const e = tough(place(sim, 'grunt', 800));
    tough(place(sim, 'grunt', 820));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const fires = sim.s.zones.filter((z) => z.kind === 'fire');
    expect(fires).toHaveLength(1);
    expect(fires[0]).toMatchObject({ halfWidth: t.radius, dps: t.damage, dur: t.seconds });
    runFor(sim, 1);
    expect(lost(e)).toBeGreaterThan(t.damage * 0.9);
    expect(lost(e)).toBeLessThan(t.damage * 1.1);
  });

  it('tier 5: three fires side by side, hotter', () => {
    const t = tierOf<ShellTier>('bellows', 5);
    const { sim, slot } = rig('bellows', 5);
    tough(place(sim, 'grunt', 800));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const fires = sim.s.zones.filter((z) => z.kind === 'fire');
    expect(fires).toHaveLength(t.shells);
    for (const f of fires) expect(f.dps).toBe(t.damage);
    const xs = fires.map((f) => f.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(800);
    expect(xs[2]).toBeGreaterThan(800);
  });
});

describe('Hedgehog Gate', () => {
  for (const tier of [1, 5]) {
    it(`tier ${tier}: whoever strikes the gate is hurt by the spikes`, () => {
      const t = tierOf<ThornsTier>('thorns', tier);
      const { sim } = rig('thorns', tier);
      const e = tough(place(sim, 'grunt', WORLD.gateX + 22));
      e.st = 'attack';
      e.strikeT = 0.01;
      const ev = runFor(sim, 0.1);
      expect(eventsOf(ev, 'gateHit')).toHaveLength(1);
      expect(lost(e)).toBe(t.reflect);
    });

    it(`tier ${tier}: a tap bursts the spikes outwards into raiders close to the gate`, () => {
      const t = tierOf<ThornsTier>('thorns', tier);
      const { sim, slot } = rig('thorns', tier);
      const close = tough(place(sim, 'grunt', WORLD.gateX + t.burstReach - 10));
      const away = tough(place(sim, 'grunt', WORLD.gateX + t.burstReach + 30));
      const balloon = tough(place(sim, 'balloonist', WORLD.gateX + 40));
      const ev = fire(sim, slot);
      expect(eventsOf(ev, 'thorns')[0].reach).toBe(t.burstReach);
      expect(lost(close)).toBe(t.burstDamage);
      expect(lost(away)).toBe(0);
      expect(lost(balloon)).toBe(0);
    });
  }

  it('no reflection without the thorns on the gate', () => {
    const sim = battleSim();
    sim.s.meta.tuning.walkSpeed = 0;
    const e = tough(place(sim, 'grunt', WORLD.gateX + 22));
    e.st = 'attack';
    e.strikeT = 0.01;
    runFor(sim, 0.1);
    expect(lost(e)).toBe(0);
  });
});

describe('Roof Bolter', () => {
  it('tier 1: the fan hits a balloonist above and a runner below with one tap', () => {
    const t = tierOf<VolleyTier>('bolter', 1);
    const { sim, slot } = rig('bolter', 1);
    const balloon = tough(place(sim, 'balloonist', 700));
    balloon.altitude = 250;
    const runner = tough(place(sim, 'grunt', 400));
    runFor(sim, 0.05);
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'roofBolt')).toHaveLength(t.bolts);
    runFor(sim, 1.5);
    expect(lost(balloon)).toBeGreaterThanOrEqual(t.damage);
    expect(lost(runner)).toBeGreaterThanOrEqual(t.damage);
  });

  it('tier 1 bolts stop at the first raider, tier 3 and up fly through', () => {
    for (const tier of [1, 3]) {
      const t = tierOf<VolleyTier>('bolter', tier);
      const { sim, slot } = rig('bolter', tier);
      const line = [380, 420, 460, 500].map((x) => tough(place(sim, 'grunt', x)));
      for (const e of line) e.lane = 0;
      fire(sim, slot);
      runFor(sim, 1.5);
      const total = line.reduce((n, e) => n + lost(e), 0);
      if (t.pierce) expect(total, `tier ${tier}`).toBeGreaterThan(t.damage * 1.5);
      expect(t.pierce).toBe(tier >= 3);
    }
  });

  it('tier 5: two volleys of twelve, the second fills the gaps', () => {
    const t = tierOf<VolleyTier>('bolter', 5);
    const { sim, slot } = rig('bolter', 5);
    tough(place(sim, 'grunt', 600));
    const ev = [...fire(sim, slot), ...runFor(sim, 0.5)];
    expect(eventsOf(ev, 'bolters')).toHaveLength(t.volleys);
    expect(sim.s.stats.weaponShots.bolter).toBe(1);
  });
});

describe('Marmot Sentry', () => {
  for (const tier of [1, 5]) {
    it(`tier ${tier}: shoots on its own at the front raider, every few seconds`, () => {
      const t = tierOf<SentryTier>('sentry', tier);
      const { sim } = rig('sentry', tier);
      const front = tough(place(sim, 'grunt', 500));
      const back = tough(place(sim, 'grunt', 900));
      const ev = runFor(sim, 1 + t.every * 3 + 0.05);
      const shots = eventsOf(ev, 'sentryShot');
      expect(shots).toHaveLength(4);
      expect(lost(front)).toBe(4 * t.damage);
      expect(lost(back)).toBe(0);
      expect(sim.s.cooldowns[slotFor('sentry')]).toBe(0);
    });

    it(`tier ${tier}: a tap fires a quick burst`, () => {
      const t = tierOf<SentryTier>('sentry', tier);
      const { sim, slot } = rig('sentry', tier);
      const front = tough(place(sim, 'grunt', 500));
      fire(sim, slot);
      const ev = runFor(sim, 0.12 * t.burst + 0.05);
      expect(eventsOf(ev, 'sentryShot')).toHaveLength(t.burst);
      expect(lost(front)).toBe(t.burst * t.damage);
      expect(sim.s.cooldowns[slot]).toBeGreaterThan(0);
    });
  }

  it('also shoots at fliers, and rests while the field is empty', () => {
    const { sim } = rig('sentry', 1);
    const b = tough(place(sim, 'balloonist', 500));
    const ev = runFor(sim, 1.2);
    expect(eventsOf(ev, 'sentryShot')).toHaveLength(1);
    expect(lost(b)).toBeGreaterThan(0);
    sim.s.enemies = [];
    expect(eventsOf(runFor(sim, 5), 'sentryShot')).toHaveLength(0);
  });
});

describe('Ember Beacon', () => {
  /** Throws a Pothelm to its death beside a tough neighbour and reports what the neighbour lost. */
  const throwBeside = (sim: Sim) => {
    const thrown = place(sim, 'grunt', 700);
    const neighbour = tough(place(sim, 'grunt', 730));
    flingUp(sim, thrown, 1800);
    const ev = runUntil(sim, () => thrown.dead, 300);
    return { ev, neighbour, thrown };
  };

  for (const tier of [1, 5]) {
    it(`tier ${tier}: while it burns, a raider thrown to its death explodes where it lands`, () => {
      const t = tierOf<BeaconTier>('beacon', tier);
      const { sim, slot } = rig('beacon', tier);
      const ev0 = fire(sim, slot);
      expect(eventsOf(ev0, 'beacon')[0].seconds).toBe(t.seconds);
      const { ev, neighbour } = throwBeside(sim);
      const blasts = eventsOf(ev, 'explosion').filter((b) => b.radius === t.radius);
      expect(blasts).toHaveLength(1);
      // The blast, plus a little fire on the tiers that leave some.
      expect(lost(neighbour)).toBeGreaterThanOrEqual(t.damage);
      expect(lost(neighbour)).toBeLessThan(t.damage + 10);
      expect(sim.s.zones.filter((z) => z.kind === 'fire').length).toBe(t.flameSeconds > 0 ? 1 : 0);
    });
  }

  it('no burst before the tap, and none once the beacon has burnt down', () => {
    const t = tierOf<BeaconTier>('beacon', 1);
    const { sim, slot } = rig('beacon', 1);
    expect(lost(throwBeside(sim).neighbour)).toBe(0);
    fire(sim, slot);
    runFor(sim, t.seconds + 0.1);
    expect(sim.s.beaconT).toBe(0);
    expect(lost(throwBeside(sim).neighbour)).toBe(0);
  });

  it('a raider that only falls (no hand threw it) does not burst', () => {
    const { sim, slot } = rig('beacon', 5);
    fire(sim, slot);
    const e = place(sim, 'grunt', 700);
    const n = tough(place(sim, 'grunt', 730));
    e.st = 'air'; e.y = WORLD.groundY - 300; e.vx = 0; e.vy = 0; e.thrownBy = -1;
    runUntil(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
    expect(lost(n)).toBe(0);
  });
});
