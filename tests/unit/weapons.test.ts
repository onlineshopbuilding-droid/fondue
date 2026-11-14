/**
 * The 25 weapons of the keep: five per slot role, seven tiers each. A tap fires (passive weapons fire
 * on their own), the weapon aims on its own (src/sim/weapons/targeting.ts), and every tier does what
 * its row in src/config/weapons.ts says.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { WORLD } from '../../src/config/field';
import { STATIONS } from '../../src/config/keep';
import { SLOTS, SLOT_ROLES } from '../../src/config/slots';
import {
  MAX_TIER, WEAPONS, activeWeapons, firesOnItsOwn, weaponById, weaponsForSlot,
  type BeaconTier, type CascadeTier, type ChainTier, type DriftTier, type GoldTier, type GripTier, type HelperTier,
  type LobTier, type MendTier, type PuddleTier, type PushTier, type RollTier, type SentryTier, type ShellTier, type SkyTier,
  type SlamTier, type SpikesTier, type StopTier, type SwarmTier, type SwingTier, type ThornsTier, type TollTier,
  type VolleyTier, type WeaponDef,
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
const TIERS = Array.from({ length: MAX_TIER }, (_, i) => i + 1);

describe('the weapon table', () => {
  it('has 25 weapons with unique ids, each with exactly seven tiers', () => {
    expect(WEAPONS).toHaveLength(25);
    expect(MAX_TIER).toBe(7);
    for (const w of WEAPONS) expect(w.tiers, w.id).toHaveLength(7);
    expect(new Set(WEAPONS.map((w) => w.id)).size).toBe(25);
  });

  it('every weapon sits in exactly one slot role, five per role, and every role has a slot', () => {
    expect([...SLOT_ROLES].sort()).toEqual(['damage', 'gate', 'passive', 'slow', 'support']);
    for (const role of SLOT_ROLES) expect(weaponsForSlot(role).length, role).toBe(5);
    for (const w of WEAPONS) expect(SLOTS.filter((s) => s.role === w.slot), w.id).toHaveLength(1);
  });

  it('the slots open at levels 0, 2, 4, 7 and 11 and the first weapon of each comes with its slot', () => {
    const open: Record<string, number> = { damage: 0, slow: 2, gate: 4, support: 7, passive: 11 };
    for (const s of SLOTS) {
      expect(s.unlockLevel, s.role).toBe(open[s.role]);
      expect(s.intro.length, s.role).toBeGreaterThan(10);
      const first = Math.min(...weaponsForSlot(s.role).map((w) => w.unlockLevel));
      expect(first, s.role).toBe(s.unlockLevel);
    }
  });

  it('the Rolling Wheel is free from the start', () => {
    const wheel = weaponById('wheel')!;
    expect(wheel.unlockLevel).toBe(0);
    expect(wheel.cheesePrice).toBe(0);
    expect(wheel.slot).toBe('damage');
    for (const w of WEAPONS) if (w.id !== 'wheel') expect(w.cheesePrice, w.id).toBeGreaterThan(0);
  });

  it('cheese prices of all weapons, the Great Cauldron and the Eagle Perch add up to exactly 500', () => {
    const weapons = WEAPONS.reduce((n, w) => n + w.cheesePrice, 0);
    expect(weapons + STATIONS.cauldron.cheesePrice + STATIONS.perch.cheesePrice).toBe(500);
  });

  it('unlocks spread over the campaign: something new every few levels, up to about level 80', () => {
    const levels = WEAPONS.map((w) => w.unlockLevel).sort((a, b) => a - b);
    expect(new Set(levels).size).toBe(levels.length);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `after level ${levels[i - 1]}`).toBeLessThanOrEqual(4);
    expect(levels[levels.length - 1]).toBeGreaterThanOrEqual(75);
    expect(levels[levels.length - 1]).toBeLessThanOrEqual(85);
  });

  it('early weapons are cheap, late ones dear, and a later unlock never costs less', () => {
    const byLevel = [...WEAPONS].sort((a, b) => a.unlockLevel - b.unlockLevel);
    for (let i = 1; i < byLevel.length; i++) expect(byLevel[i].cheesePrice, byLevel[i].id).toBeGreaterThanOrEqual(byLevel[i - 1].cheesePrice);
    for (const w of byLevel.slice(1, 6)) expect(w.cheesePrice, w.id).toBeLessThanOrEqual(10);
    for (const w of byLevel.slice(-5)) expect(w.cheesePrice, w.id).toBeGreaterThanOrEqual(25);
  });

  it('every weapon has a gold price factor between 0.8 and 1.4, a description and a note on every tier', () => {
    for (const w of WEAPONS) {
      expect(w.goldScale, w.id).toBeGreaterThanOrEqual(0.8);
      expect(w.goldScale, w.id).toBeLessThanOrEqual(1.4);
      expect(w.desc.length, w.id).toBeGreaterThan(10);
      for (const t of w.tiers) expect(t.note.length, w.id).toBeGreaterThan(3);
      expect(new Set(w.tiers.map((t) => t.note)).size, `${w.id} notes repeat`).toBe(MAX_TIER);
    }
  });

  it('rule A5: every tier step changes a switch, or at least one number by 15 % or more', () => {
    for (const w of WEAPONS) {
      for (let i = 1; i < w.tiers.length; i++) {
        const a = w.tiers[i - 1] as unknown as Record<string, unknown>;
        const b = w.tiers[i] as unknown as Record<string, unknown>;
        const keys = Object.keys(b).filter((k) => k !== 'note');
        expect(Object.keys(a).filter((k) => k !== 'note').sort(), `${w.id} tier ${i + 1} has other fields`).toEqual([...keys].sort());
        const enough = keys.some((k) => {
          const x = a[k];
          const y = b[k];
          if (typeof x !== 'number' || typeof y !== 'number') return x !== y;
          if (x === 0) return y !== 0;
          return Math.abs(y - x) / Math.abs(x) >= 0.15 - 1e-9;
        });
        expect(enough, `${w.id} tier ${i + 1} changes too little`).toBe(true);
      }
    }
  });

  /** What makes a tier stronger, per kind: each value must never go down from one tier to the next. */
  const power = (w: WeaponDef, i: number): number[] => {
    const t = w.tiers[i] as unknown as Record<string, number & boolean>;
    const b = (v: boolean) => (v ? 1 : 0);
    switch (w.kind) {
      case 'roll': return [t.damage * t.wheels, t.maxHits, t.radius, t.fireTrail, t.wheels];
      case 'puddle': return [t.halfWidth, t.seconds, -t.slow, t.dps, b(t.wholeRoad)];
      case 'spikes': return [t.damage * t.pulses, t.pin, t.halfWidth, t.pulses];
      case 'slam': return [t.damage * t.slams, t.halfWidth, t.shockRadius, t.shockStun, t.slams];
      case 'push': return [t.reach, t.push, t.damage, b(t.hitsAir)];
      case 'stop': return [t.seconds, b(t.hitsAir), b(t.breaksGuards)];
      case 'sky': return [t.damage, t.radius, t.flameSeconds, t.shards];
      case 'chain': return [t.damage, t.jumps, t.jumpRange, t.falloff, t.stun, t.strikes];
      case 'gold': return [t.seconds, t.factor];
      case 'shell': return [t.damage * t.shells * Math.max(1, t.seconds), t.radius * t.shells, t.seconds, t.shatterSpread, t.shells];
      case 'thorns': return [t.reflect, t.burstDamage, t.burstReach, t.burstStun];
      case 'volley': return [t.bolts * t.volleys * t.damage, t.bolts * t.volleys, b(t.pierce)];
      case 'sentry': return [t.damage / t.every, t.damage, t.burst, -t.every, t.targets];
      case 'beacon': return [t.seconds, t.radius, t.damage, t.flameSeconds];
      case 'drift': return [t.halfWidth * t.drifts, t.seconds, -t.slow, t.drifts, b(t.wholeRoad)];
      case 'toll': return [t.radius, t.stun, t.tolls, t.damage, b(t.hitsAir)];
      case 'helper': return [t.seconds, t.strength];
      case 'grip': return [t.seconds, t.strength, -t.lethal];
      case 'mend': return [t.heal, t.regen, t.seconds];
      case 'lob': return [t.cones * t.damage, t.radius, t.cones, t.stun];
      case 'swarm': return [t.hornets * t.damage * t.stings, t.hornets, t.damage, t.stings];
      case 'cascade': return [t.halfWidth, t.seconds, t.dps, -t.slow, t.stun];
      case 'swing': return [t.reach, t.damage * t.swings, t.push, t.swings, t.stun];
    }
  };

  it('tier N is never weaker than tier N-1, and its reload is never longer', () => {
    for (const w of WEAPONS) {
      for (let i = 1; i < w.tiers.length; i++) {
        const before = power(w, i - 1);
        const now = power(w, i);
        now.forEach((v, k) => expect(v, `${w.id} tier ${i + 1} value ${k}`).toBeGreaterThanOrEqual(before[k] - 1e-9));
        expect(w.tiers[i].cooldown, `${w.id} tier ${i + 1} cooldown`).toBeLessThanOrEqual(w.tiers[i - 1].cooldown);
      }
    }
  });

  describe('a weapon switched off', () => {
    const id = 'cuckoo';
    afterEach(() => { weaponById(id)!.enabled = true; });

    it('leaves the slot lists and the rules of both modes', () => {
      weaponById(id)!.enabled = false;
      expect(activeWeapons().map((w) => w.id)).not.toContain(id);
      expect(weaponsForSlot('slow').map((w) => w.id)).not.toContain(id);
      const endless = ENDLESS.buildRun(PROFILE, { world: 'fondue' }, { names: ['A'], fieldW: 1280, handTiers: [1], seed: 1 });
      expect(endless.rules.weapons[id].offered).toBe(false);
      const sim = battleSim();
      sim.s.meta.rules.weapons[id].offered = false;
      expect(sim.quote(`weapon:${slotFor(id)}:${id}`).reason).toBe('locked');
      const campaign = CAMPAIGN.buildRun(PROFILE, { world: 'fondue', level: 1 }, { names: ['A'], fieldW: 1280, handTiers: [1] });
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

describe('every weapon on every tier', () => {
  /** A damaged gate, raiders right at the gate, a group in the middle of the road and a balloon. */
  function scene(id: string, tier: number) {
    const { sim, slot } = rig(id, tier);
    sim.s.gateHp = Math.round(sim.s.gateMax * 0.5);
    const raiders = [WORLD.gateX + 60, WORLD.gateX + 120, 600, 640, 680].map((x) => tough(place(sim, 'grunt', x)));
    raiders.push(tough(place(sim, 'balloonist', 700)));
    return { sim, slot, raiders };
  }

  for (const w of WEAPONS) {
    it(`${w.id}: fires and has an effect on all ${MAX_TIER} tiers`, () => {
      for (const tier of TIERS) {
        const { sim, slot, raiders } = scene(w.id, tier);
        const gate0 = sim.s.gateHp;
        const isHeld = () => raiders.some((e) => e.st === 'stun' || e.st === 'frozen' || e.st === 'air');
        const tapped = fire(sim, slot);
        const heldAtOnce = isHeld();
        const ev = [...tapped, ...runFor(sim, 3)];
        expect(firedOk(ev), `${w.id} ${tier} fired`).toBe(true);
        const hurt = raiders.some((e) => lost(e) > 0);
        const held = heldAtOnce || isHeld();
        const zones = eventsOf(ev, 'zone').length > 0;
        const s = sim.s;
        const buff = s.goldRushT > 0 || s.beaconT > 0 || s.gripT > 0 || s.extraHandT[0] > 0 || s.gateHp > gate0;
        expect(hurt || held || zones || buff, `${w.id} tier ${tier} did nothing`).toBe(true);
      }
    });
  }

  it('the top tier does more than the first: more damage dealt or a longer, wider effect', () => {
    const dealt = (id: string, tier: number) => {
      const { sim, slot, raiders } = scene(id, tier);
      fire(sim, slot);
      runFor(sim, 4);
      return raiders.reduce((n, e) => n + lost(e), 0);
    };
    for (const w of WEAPONS) {
      const one = dealt(w.id, 1);
      if (one > 0) expect(dealt(w.id, MAX_TIER), w.id).toBeGreaterThan(one);
    }
  });
});

describe('a tap on a weapon', () => {
  /** Weapons that need something to act on; buffs (gold, beacon, helper, grip) always work. */
  const NEEDS_TARGET = WEAPONS.filter((w) => !['gold', 'beacon', 'helper', 'grip'].includes(w.kind));

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

  it('the Mending Horn on a whole gate costs nothing either', () => {
    const { sim, slot } = rig('mender', 7);
    place(sim, 'grunt', 600);
    expect(sim.s.gateHp).toBe(sim.s.gateMax);
    expect(denied(fire(sim, slot))).toBe(true);
    expect(sim.s.cooldowns[slot]).toBe(0);
  });

  it('starts the reload only when it fired, at the time of its tier', () => {
    for (const w of WEAPONS) {
      for (const tier of [1, MAX_TIER]) {
        const { sim, slot } = rig(w.id, tier);
        sim.s.gateHp = sim.s.gateMax * 0.5;
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

describe('passive weapons', () => {
  const AUTO = WEAPONS.filter(firesOnItsOwn);

  it('are the passive slot role, except the Marmot Sentry which keeps its own rhythm', () => {
    expect(AUTO.map((w) => w.id).sort()).toEqual(['bell', 'bolter', 'catapult', 'hive']);
    for (const w of AUTO) expect(w.slot).toBe('passive');
  });

  it('fire on their own once there is a target, start the reload ring, and fire again after it', () => {
    for (const w of AUTO) {
      const { sim, slot } = rig(w.id, 1);
      expect(runFor(sim, 0.5).some((x) => x.e === 'fire'), `${w.id} on an empty field`).toBe(false);
      tough(place(sim, 'grunt', 600));
      tough(place(sim, 'grunt', 640));
      const ev = runFor(sim, 0.1);
      expect(eventsOf(ev, 'fire').filter((x) => x.slot === slot), w.id).toHaveLength(1);
      expect(sim.s.cooldownMax[slot], w.id).toBe(w.tiers[0].cooldown);
      expect(sim.s.cooldowns[slot], w.id).toBeGreaterThan(0);
      const later = runFor(sim, w.tiers[0].cooldown + 0.1);
      expect(eventsOf(later, 'fire').filter((x) => x.slot === slot).length, w.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('wait while the game is paused or held', () => {
    const { sim } = rig('bolter', 1);
    place(sim, 'grunt', 600);
    sim.s.hold = true;
    expect(runFor(sim, 0.5).some((x) => x.e === 'fire')).toBe(false);
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
    expect(sim.s.delayed).toHaveLength(1);
    const ev = runFor(sim, 2);
    expect(lost(a)).toBeGreaterThanOrEqual(2 * t.damage);
    expect(lost(a)).toBeLessThan(3 * t.damage);
    expect(eventsOf(ev, 'zone').filter((z) => z.kind === 'fire').length).toBeGreaterThan(2);
  });

  it('tier 7: three flaming wheels', () => {
    const t = tierOf<RollTier>('wheel', 7);
    expect(t.wheels).toBe(3);
    const { sim, slot } = rig('wheel', 7);
    const a = tough(place(sim, 'grunt', 700));
    fire(sim, slot);
    expect(sim.s.delayed).toHaveLength(2);
    const ev = runFor(sim, 2.5);
    expect(eventsOf(ev, 'wheel')).toHaveLength(2);
    expect(lost(a)).toBeGreaterThanOrEqual(3 * t.damage);
    expect(lost(a)).toBeLessThan(4 * t.damage);
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

  it('tier 6: wider, slower and it burns', () => {
    const t = tierOf<PuddleTier>('cheese', 6);
    const { sim, slot } = rig('cheese', 6);
    const front = tough(place(sim, 'grunt', 600));
    fire(sim, slot);
    const z = sim.s.zones.find((q) => q.kind === 'cheese')!;
    expect(z).toMatchObject({ halfWidth: t.halfWidth, slow: t.slow, dps: t.dps });
    runFor(sim, 2);
    expect(lost(front)).toBeGreaterThan(t.dps * 1.9);
    expect(lost(front)).toBeLessThan(t.dps * 2.1);
  });

  it('tier 7: sticky fondue across the whole road', () => {
    const t = tierOf<PuddleTier>('cheese', 7);
    const { sim, slot } = rig('cheese', 7);
    const near = place(sim, 'grunt', WORLD.gateX + 40);
    const far = place(sim, 'grunt', sim.s.meta.fieldW - 20);
    fire(sim, slot);
    const z = sim.s.zones.find((q) => q.kind === 'cheese')!;
    expect(z.slow).toBe(t.slow);
    for (const e of [near, far]) expect(Math.abs(e.x - z.x)).toBeLessThanOrEqual(z.halfWidth);
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

  it('tier 7: four stabs in a row at the same spot', () => {
    const t = tierOf<SpikesTier>('forks', 7);
    const { sim, slot } = rig('forks', 7);
    const e = tough(place(sim, 'grunt', 700));
    const ev = [...fire(sim, slot), ...runFor(sim, 2.2)];
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

  it('tier 7: four strikes, and the tremor dazes raiders beside the block', () => {
    const t = tierOf<SlamTier>('stomper', 7);
    const { sim, slot } = rig('stomper', 7);
    const hit = tough(place(sim, 'grunt', 800));
    const beside = tough(place(sim, 'grunt', 800 + t.halfWidth * 2 + 15));
    expect(t.halfWidth * 2 + 15).toBeLessThanOrEqual(t.shockRadius);
    const ev = [...fire(sim, slot), ...runFor(sim, 0.4)];
    expect(eventsOf(ev, 'slam')).toHaveLength(1);
    expect(lost(beside)).toBe(0);
    expect(beside.st).toBe('stun');
    const later = runFor(sim, 2.2);
    expect(eventsOf(ev, 'slam').length + eventsOf(later, 'slam').length).toBe(t.slams);
    expect(lost(hit)).toBeGreaterThanOrEqual(t.damage * 2);
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

  it('tier 7: a meteor shower of shards on both sides, smaller and weaker', () => {
    const t = tierOf<SkyTier>('comet', 7);
    const { sim, slot } = rig('comet', 7);
    const centre = tough(place(sim, 'grunt', 800));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'comet')).toHaveLength(1 + t.shards);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const blasts = eventsOf(ev, 'explosion');
    expect(blasts).toHaveLength(1 + t.shards);
    const big = blasts.filter((b) => b.radius === t.radius);
    const small = blasts.filter((b) => b.radius < t.radius);
    expect(big).toHaveLength(1);
    expect(small).toHaveLength(t.shards);
    for (const s of small) expect(s.radius).toBeCloseTo(t.radius * 0.55, 5);
    expect(small.some((s) => s.x > big[0].x) && small.some((s) => s.x < big[0].x)).toBe(true);
    expect(lost(centre)).toBeGreaterThanOrEqual(t.damage);
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

  it('tier 7: four fires on both sides, hotter', () => {
    const t = tierOf<ShellTier>('bellows', 7);
    const { sim, slot } = rig('bellows', 7);
    tough(place(sim, 'grunt', 800));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const fires = sim.s.zones.filter((z) => z.kind === 'fire');
    expect(fires).toHaveLength(t.shells);
    for (const f of fires) expect(f.dps).toBe(t.damage);
    const xs = fires.map((f) => f.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(800);
    expect(xs[xs.length - 1]).toBeGreaterThan(800);
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
    const [a, b] = group;
    sim.setHand(0, a.x, a.y - 40);
    sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 40 });
    sim.command({ k: 'release', p: 0, x: a.x, y: a.y - 40, vx: 0, vy: 0 });
    expect(a.dead).toBe(true);
    expect(b.dead).toBe(false);
    expect(b.st).toBe('frozen');
  });

  it('tier 7: two ice shells, and the cracks of one break its frozen neighbours', () => {
    const t = tierOf<ShellTier>('frost', 7);
    const { sim, slot } = rig('frost', 7);
    const xs = [700, 760, 800, 700 + t.shatterSpread + 20];
    const list = xs.map((x) => place(sim, 'grunt', x));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'frostShell')).toHaveLength(2);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    for (const e of list) expect(e.st).toBe('frozen');
    const a = list[0];
    sim.setHand(0, a.x, a.y - 40);
    sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 40 });
    sim.command({ k: 'release', p: 0, x: a.x, y: a.y - 40, vx: 0, vy: 0 });
    expect(list.slice(0, 3).every((e) => e.dead)).toBe(true);
    expect(list[3].dead).toBe(false);
    expect(sim.s.stats.killsByCause.shatter).toBe(3);
  });

  it('does not freeze siege carts', () => {
    const { sim, slot } = rig('frost', 5);
    const cart = place(sim, 'siegeCart', 800);
    const g = place(sim, 'grunt', 820);
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(g.st).toBe('frozen');
    expect(cart.st).not.toBe('frozen');
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

  it('tier 7: everything holds for four seconds, bubbles burst and shades show', () => {
    const t = tierOf<StopTier>('cuckoo', 7);
    expect(t.seconds).toBe(4);
    const { sim, slot } = rig('cuckoo', 7, false);
    const hexer = place(sim, 'hexer', 700);
    hexer.shieldOn = true;
    const crow = place(sim, 'balloonist', 900);
    const shade = place(sim, 'shade', 800);
    shade.hidden = true;
    const cx = crow.x;
    fire(sim, slot);
    expect(hexer.shieldOn).toBe(false);
    expect(shade.hidden).toBe(false);
    expect(sim.s.airStopT).toBe(t.seconds);
    runFor(sim, t.seconds - 0.2);
    expect(crow.x).toBe(cx);
    grabAt(sim, 0, hexer);
    expect(hexer.st).toBe('held');
  });

  it('a shield is not broken on the tiers before breaksGuards', () => {
    const def = weaponById('cuckoo')!;
    const before = def.tiers.findIndex((x) => (x as StopTier).breaksGuards);
    const { sim, slot } = rig('cuckoo', before, false);
    const hexer = place(sim, 'hexer', 700);
    hexer.shieldOn = true;
    fire(sim, slot);
    expect(hexer.shieldOn).toBe(true);
  });
});

describe('Snowdrift Cannon', () => {
  it('tier 1: a snowball lands on the group and leaves a slowing drift', () => {
    const t = tierOf<DriftTier>('snowdrift', 1);
    const sim = battleSim();
    const slot = arm(sim, 'snowdrift', 1);
    const e = place(sim, 'grunt', 800);
    sim.s.meta.tuning.walkSpeed = 0;
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'snowball')).toHaveLength(1);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    const z = sim.s.zones.filter((q) => q.kind === 'snow');
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ halfWidth: t.halfWidth, slow: t.slow, dur: t.seconds, dps: 0 });
    expect(Math.abs(e.x - z[0].x)).toBeLessThanOrEqual(t.halfWidth);
    expect(eventsOf(ev, 'snowdrift')).toHaveLength(1);
    sim.s.meta.tuning.walkSpeed = 1;
    const free = 1;
    expect(sim.ctx.zones.slowAt(e)).toBeCloseTo(t.slow * free, 5);
  });

  it('tier 3 and up: several drifts side by side', () => {
    const t = tierOf<DriftTier>('snowdrift', 5);
    const { sim, slot } = rig('snowdrift', 5);
    place(sim, 'grunt', 800);
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(sim.s.zones.filter((q) => q.kind === 'snow')).toHaveLength(t.drifts);
  });

  it('tier 7: a blizzard over the whole road', () => {
    const { sim, slot } = rig('snowdrift', 7);
    const near = place(sim, 'grunt', WORLD.gateX + 30);
    const far = place(sim, 'grunt', sim.s.meta.fieldW - 10);
    fire(sim, slot);
    const whole = sim.s.zones.find((q) => q.kind === 'snow')!;
    for (const e of [near, far]) expect(Math.abs(e.x - whole.x)).toBeLessThanOrEqual(whole.halfWidth);
  });
});

describe('Cowbell Toll', () => {
  it('tier 1: one toll hurts a little and dazes the group around it, not the raider far away', () => {
    const t = tierOf<TollTier>('cowbell', 1);
    const { sim, slot } = rig('cowbell', 1);
    const group = [800, 830, 860].map((x) => tough(place(sim, 'grunt', x)));
    const far = tough(place(sim, 'grunt', 300));
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'toll')).toHaveLength(1);
    for (const e of group) { expect(lost(e)).toBe(t.damage); expect(e.st).toBe('stun'); expect(e.t).toBeCloseTo(t.stun, 5); }
    expect(lost(far)).toBe(0);
    expect(eventsOf(runFor(sim, 2), 'toll')).toHaveLength(0);
  });

  it('tier 7: four tolls, and fliers are hit too', () => {
    const t = tierOf<TollTier>('cowbell', 7);
    const { sim, slot } = rig('cowbell', 7);
    const g = tough(place(sim, 'grunt', 800));
    const b = tough(place(sim, 'balloonist', 820));
    const ev = [...fire(sim, slot), ...runFor(sim, 3)];
    expect(eventsOf(ev, 'toll')).toHaveLength(t.tolls);
    expect(lost(g)).toBe(t.damage * t.tolls);
    expect(lost(b)).toBeGreaterThan(0);
  });
});

describe('Golden Fondue', () => {
  const killPays = (sim: Sim) => {
    const e = place(sim, 'grunt', 800);
    const before = sim.s.gold;
    sim.hurt(e, 1e9, 'blast', 0);
    return sim.s.gold - before;
  };

  for (const tier of [1, MAX_TIER]) {
    it(`tier ${tier}: for its seconds every kill pays its factor, then plain gold again`, () => {
      const t = tierOf<GoldTier>('midas', tier);
      const { sim, slot } = rig('midas', tier);
      const plain = killPays(sim);
      expect(plain).toBeGreaterThan(0);
      const ev = fire(sim, slot);
      expect(eventsOf(ev, 'goldRush')[0].seconds).toBe(t.seconds);
      expect(sim.s.goldRushT).toBe(t.seconds);
      expect(killPays(sim)).toBe(Math.round(plain * t.factor));
      runFor(sim, t.seconds - 0.5);
      expect(killPays(sim)).toBe(Math.round(plain * t.factor));
      runFor(sim, 0.6);
      expect(sim.s.goldRushT).toBe(0);
      expect(killPays(sim)).toBe(plain);
    });
  }
});

describe('Ember Beacon', () => {
  /** Throws a raider to its death beside a tough neighbour and reports what the neighbour lost. */
  const throwBeside = (sim: Sim) => {
    const thrown = place(sim, 'grunt', 700);
    const neighbour = tough(place(sim, 'grunt', 730));
    flingUp(sim, thrown, 1800);
    const ev = runUntil(sim, () => thrown.dead, 300);
    return { ev, neighbour, thrown };
  };

  for (const tier of [1, MAX_TIER]) {
    it(`tier ${tier}: while it burns, a raider thrown to its death explodes where it lands`, () => {
      const t = tierOf<BeaconTier>('beacon', tier);
      const { sim, slot } = rig('beacon', tier);
      const ev0 = fire(sim, slot);
      expect(eventsOf(ev0, 'beacon')[0].seconds).toBe(t.seconds);
      const { ev, neighbour } = throwBeside(sim);
      const blasts = eventsOf(ev, 'explosion').filter((b) => b.radius === t.radius);
      expect(blasts).toHaveLength(1);
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
});

describe('Helping Hand', () => {
  for (const tier of [1, MAX_TIER]) {
    it(`tier ${tier}: every player gets a second hand for its seconds, then it is gone`, () => {
      const t = tierOf<HelperTier>('helper', tier);
      const sim = battleSim({ names: ['A', 'B'] });
      const slot = arm(sim, 'helper', tier);
      const ev = fire(sim, slot);
      expect(eventsOf(ev, 'extraHand')[0].seconds).toBe(t.seconds);
      expect(sim.s.extraHandT).toEqual([t.seconds, t.seconds]);
      expect(sim.s.extraHandStrength).toBe(t.strength);
      runFor(sim, t.seconds - 0.5);
      expect(sim.s.extraHandT[1]).toBeGreaterThan(0);
      runFor(sim, 0.6);
      expect(sim.s.extraHandT).toEqual([0, 0]);
    });
  }
});

describe('Iron Grip', () => {
  it('makes every hand stronger and hard throws deadlier for its seconds', () => {
    const t = tierOf<GripTier>('grip', MAX_TIER);
    const { sim, slot } = rig('grip', MAX_TIER);
    const plain = sim.ctx.strengthOf([0]);
    expect(sim.ctx.weapons.lethalFactor()).toBe(1);
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'grip')[0].seconds).toBe(t.seconds);
    expect(sim.ctx.strengthOf([0])).toBeCloseTo(plain * t.strength, 5);
    expect(sim.ctx.weapons.lethalFactor()).toBe(t.lethal);
    runFor(sim, t.seconds + 0.1);
    expect(sim.ctx.strengthOf([0])).toBeCloseTo(plain, 5);
    expect(sim.ctx.weapons.lethalFactor()).toBe(1);
  });

  it('a throw too soft to kill without the grip kills with it', () => {
    const speed = (sim: Sim) => sim.s.meta.tuning.lethalImpact * 0.8;
    const outcome = (withGrip: boolean) => {
      const { sim, slot } = rig('grip', MAX_TIER);
      if (withGrip) fire(sim, slot);
      const e = place(sim, 'grunt', 700);
      e.st = 'air'; e.thrownBy = 0; e.vx = 0; e.vy = speed(sim); e.y = sim.ctx.groundOf(e) - 2;
      runFor(sim, 0.1);
      return e.dead;
    };
    expect(outcome(false)).toBe(false);
    expect(outcome(true)).toBe(true);
  });
});

describe('Mending Horn', () => {
  it('tier 1: mends part of the gate at once', () => {
    const t = tierOf<MendTier>('mender', 1);
    const { sim, slot } = rig('mender', 1);
    sim.s.gateHp = sim.s.gateMax * 0.5;
    fire(sim, slot);
    expect(sim.s.gateHp).toBeCloseTo(sim.s.gateMax * (0.5 + t.heal), 5);
  });

  it('tier 7: a big mend, then the gate keeps healing, never above full', () => {
    const t = tierOf<MendTier>('mender', 7);
    const { sim, slot } = rig('mender', 7);
    sim.s.gateHp = sim.s.gateMax * 0.3;
    fire(sim, slot);
    const after = sim.s.gateHp;
    runFor(sim, t.seconds + 0.5);
    expect(sim.s.gateHp - after).toBeCloseTo(sim.s.gateMax * t.regen * t.seconds, -1);
    sim.s.gateHp = sim.s.gateMax - 1;
    sim.s.mendT = 5; sim.s.mendRate = 0.5;
    runFor(sim, 1);
    expect(sim.s.gateHp).toBe(sim.s.gateMax);
  });
});

describe('Marmot Sentry', () => {
  for (const tier of [1, 4]) {
    it(`tier ${tier}: shoots on its own at the front raider, every few seconds`, () => {
      const t = tierOf<SentryTier>('sentry', tier);
      const { sim } = rig('sentry', tier);
      const front = tough(place(sim, 'grunt', 500));
      const back = tough(place(sim, 'grunt', 900));
      const ev = runFor(sim, 1 + t.every * 3 + 0.05);
      expect(eventsOf(ev, 'sentryShot')).toHaveLength(4);
      expect(lost(front)).toBe(4 * t.damage);
      expect(lost(back)).toBe(0);
    });
  }

  it('tier 7: three marmots shoot the three front raiders at once; a tap fires a burst', () => {
    const t = tierOf<SentryTier>('sentry', 7);
    const { sim, slot } = rig('sentry', 7);
    const row = [500, 600, 700, 800].map((x) => tough(place(sim, 'grunt', x)));
    runFor(sim, 1.05);
    expect(row.slice(0, 3).every((e) => lost(e) === t.damage)).toBe(true);
    expect(lost(row[3])).toBe(0);
    fire(sim, slot);
    const ev = runFor(sim, 0.12 * t.burst + 0.05);
    expect(eventsOf(ev, 'sentryShot')).toHaveLength(t.burst * t.targets);
  });
});

describe('Roof Bolter (passive)', () => {
  it('tier 1: on its own, the fan hits a balloonist above and a runner below', () => {
    const t = tierOf<VolleyTier>('bolter', 1);
    const { sim } = rig('bolter', 1);
    const balloon = tough(place(sim, 'balloonist', 700));
    balloon.altitude = 250;
    const runner = tough(place(sim, 'grunt', 400));
    const ev = runFor(sim, 1.5);
    expect(eventsOf(ev, 'bolters')).toHaveLength(1);
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

  it('tier 7: three volleys from one shot', () => {
    const t = tierOf<VolleyTier>('bolter', 7);
    const { sim, slot } = rig('bolter', 7);
    tough(place(sim, 'grunt', 600));
    const ev = [...fire(sim, slot), ...runFor(sim, 1)];
    expect(eventsOf(ev, 'bolters')).toHaveLength(t.volleys);
    expect(sim.s.stats.weaponShots.bolter).toBe(1);
  });
});

describe('Storm Bell (passive)', () => {
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
    expect(eventsOf(ev, 'lightning')[0].points).toHaveLength(2 + 2 * (1 + t.jumps));
    expect(boss.st).toBe('walk');
  });

  it('tier 6: seven jumps over the whole group, and survivors are dazed', () => {
    const t = tierOf<ChainTier>('bell', 6);
    const { sim, slot } = rig('bell', 6);
    const row = Array.from({ length: 10 }, (_, i) => tough(place(sim, 'grunt', 300 + i * 100), 50000 - i));
    fire(sim, slot);
    const struck = row.filter((e) => lost(e) > 0);
    expect(struck).toHaveLength(1 + t.jumps);
    for (const e of struck) { expect(e.st).toBe('stun'); expect(e.t).toBeCloseTo(t.stun, 5); }
  });

  it('tier 7: two bolts strike at once, the second at the next toughest raider', () => {
    const t = tierOf<ChainTier>('bell', 7);
    const { sim, slot } = rig('bell', 7);
    const a = tough(place(sim, 'grunt', 300), 90000);
    const b = tough(place(sim, 'grunt', 1100), 80000);
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'lightning')).toHaveLength(t.strikes);
    expect(lost(a)).toBe(t.damage);
    expect(lost(b)).toBe(t.damage);
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

describe('Pinecone Catapult (passive)', () => {
  it('tier 1: on its own, one cone on the thickest group', () => {
    const t = tierOf<LobTier>('catapult', 1);
    const { sim, slot } = rig('catapult', 1);
    const group = [800, 830].map((x) => tough(place(sim, 'grunt', x)));
    const lone = tough(place(sim, 'grunt', 400));
    const ev = runFor(sim, 0.05);
    expect(eventsOf(ev, 'fire').filter((x) => x.slot === slot)).toHaveLength(1);
    expect(sim.s.projectiles.filter((q) => q.kind === 'pinecone')).toHaveLength(1);
    runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    for (const e of group) expect(lost(e)).toBe(t.damage);
    expect(lost(lone)).toBe(0);
  });

  it('tier 7: five cones that daze', () => {
    const t = tierOf<LobTier>('catapult', 7);
    const { sim, slot } = rig('catapult', 7);
    const e = tough(place(sim, 'grunt', 800));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'pinecone')).toHaveLength(t.cones);
    runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    expect(lost(e)).toBeGreaterThanOrEqual(t.damage);
    expect(e.st).toBe('stun');
  });
});

describe('Hornet Hive (passive)', () => {
  it('tier 1: two hornets sting the two front raiders until their stings are spent', () => {
    const t = tierOf<SwarmTier>('hive', 1);
    const { sim, slot } = rig('hive', 1);
    const a = tough(place(sim, 'grunt', 500));
    const b = tough(place(sim, 'grunt', 600));
    const back = tough(place(sim, 'grunt', 1000));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'hornet')).toHaveLength(t.hornets);
    runUntil(sim, () => sim.s.projectiles.length === 0, 600);
    expect(lost(a)).toBe(t.damage * t.stings);
    expect(lost(b)).toBe(t.damage * t.stings);
    expect(lost(back)).toBe(0);
  });

  it('a hornet whose raider dies flies on to the next one; fliers are stung too', () => {
    const { sim, slot } = rig('hive', 7);
    const weak = place(sim, 'grunt', 500);
    weak.hp = 1; weak.maxHp = 1;
    const balloon = tough(place(sim, 'balloonist', 700));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 900);
    expect(weak.dead).toBe(true);
    expect(lost(balloon)).toBeGreaterThan(0);
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
    const e = tough(place(sim, 'goatRider', 800));
    fire(sim, slot);
    runUntil(sim, () => sim.s.projectiles.length === 0, 120);
    expect(lost(e)).toBe(tierOf<ShellTier>('mortar', 1).damage);
  });

  it('tier 7: six shells walking up the column behind the first raider', () => {
    const t = tierOf<ShellTier>('mortar', 7);
    const { sim, slot } = rig('mortar', 7);
    const col = Array.from({ length: t.shells }, (_, i) => tough(place(sim, 'grunt', 300 + i * t.radius * 1.1)));
    fire(sim, slot);
    expect(sim.s.projectiles.filter((q) => q.kind === 'shell')).toHaveLength(t.shells);
    const ev = runUntil(sim, () => sim.s.projectiles.length === 0, 200);
    const xs = eventsOf(ev, 'explosion').map((b) => b.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(t.shells);
    xs.forEach((x, i) => expect(Math.abs(x - (300 + i * t.radius * 1.1))).toBeLessThan(6));
    for (const e of col) expect(lost(e)).toBeGreaterThanOrEqual(t.damage);
  });
});

describe('Hedgehog Gate', () => {
  for (const tier of [1, MAX_TIER]) {
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
      expect(close.st).toBe(t.burstStun > 0 ? 'stun' : 'walk');
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
    expect(lost(cart)).toBe(0);
    runUntil(sim, () => near.st !== 'air', 200);
    expect(near.x).toBeGreaterThan(x0 + 60);
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

  it('tier 7: the whole road flies', () => {
    const { sim, slot } = rig('alphorn', 7);
    const far = tough(place(sim, 'grunt', sim.s.meta.fieldW - 20));
    fire(sim, slot);
    expect(far.st).toBe('air');
  });
});

describe('Cheese Cascade', () => {
  it('tier 1: a scalding pool right before the gate that burns but does not slow', () => {
    const t = tierOf<CascadeTier>('cascade', 1);
    const { sim, slot } = rig('cascade', 1);
    const e = tough(place(sim, 'grunt', WORLD.gateX + 60));
    const away = tough(place(sim, 'grunt', WORLD.gateX + t.halfWidth * 2 + 80));
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'cascade')[0].halfWidth).toBe(t.halfWidth);
    const z = sim.s.zones.find((q) => q.kind === 'hotCheese')!;
    expect(z).toMatchObject({ halfWidth: t.halfWidth, dps: t.dps, slow: 1, dur: t.seconds });
    expect(z.x - z.halfWidth).toBeLessThan(WORLD.gateX + 20);
    runFor(sim, 1);
    expect(lost(e)).toBeGreaterThan(t.dps * 0.9);
    expect(lost(e)).toBeLessThan(t.dps * 1.1);
    expect(lost(away)).toBe(0);
  });

  it('only pours when a raider comes near the gate', () => {
    const { sim, slot } = rig('cascade', 1);
    place(sim, 'grunt', 1200);
    expect(denied(fire(sim, slot))).toBe(true);
  });

  it('tier 7: a long moat that slows and dazes whoever it lands on', () => {
    const t = tierOf<CascadeTier>('cascade', 7);
    const { sim, slot } = rig('cascade', 7);
    const e = tough(place(sim, 'grunt', WORLD.gateX + 200));
    fire(sim, slot);
    expect(e.st).toBe('stun');
    expect(sim.ctx.zones.slowAt(e)).toBe(t.slow);
  });
});

describe('Battering Log', () => {
  it('tier 1: one swing hurts raiders close to the gate and knocks them back', () => {
    const t = tierOf<SwingTier>('log', 1);
    const { sim, slot } = rig('log', 1);
    const near = tough(place(sim, 'grunt', WORLD.gateX + 60));
    const far = tough(place(sim, 'grunt', WORLD.gateX + t.reach + 60));
    const x0 = near.x;
    const ev = fire(sim, slot);
    expect(eventsOf(ev, 'logSwing')).toHaveLength(1);
    expect(lost(near)).toBe(t.damage);
    expect(near.st).toBe('air');
    expect(lost(far)).toBe(0);
    runUntil(sim, () => near.st !== 'air', 200);
    expect(near.x).toBeGreaterThan(x0 + 60);
  });

  it('a Yeti or a cart is too heavy to fly: it only takes the blow', () => {
    const { sim, slot } = rig('log', 7);
    const cart = tough(place(sim, 'siegeCart', WORLD.gateX + 80));
    fire(sim, slot);
    expect(lost(cart)).toBeGreaterThan(0);
    expect(cart.st).not.toBe('air');
  });

  it('tier 7: four swings', () => {
    const t = tierOf<SwingTier>('log', 7);
    const { sim, slot } = rig('log', 7, false);
    tough(place(sim, 'grunt', WORLD.gateX + 60));
    const ev = [...fire(sim, slot), ...runFor(sim, 2.5)];
    expect(eventsOf(ev, 'logSwing')).toHaveLength(t.swings);
  });
});
