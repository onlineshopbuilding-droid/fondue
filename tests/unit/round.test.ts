import { describe, expect, it } from 'vitest';
import { FLAG_DEFS, cleanFlags, defaultFlags } from '../../src/config/flags';
import { QUICK_STARTS } from '../../src/config/quickstart';
import { CASTLE_TIERS as GATES, CAULDRON_SECONDS, PERCH } from '../../src/config/keep';
import { CRESTS } from '../../src/config/crests';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import { meltSeconds, perchHitRate } from '../../src/sim/stations';
import { SLOTS } from '../../src/config/slots';
import { ECONOMY } from '../../src/config/economy';
import { ENEMIES } from '../../src/config/enemies';
import { MAX_TIER, weaponById } from '../../src/config/weapons';
import { FIELD, WORLD, fieldEntry, fieldForAspect, fieldSpeedFactor, fieldWall, perchX } from '../../src/config/field';
import { decodeSnapshot, encodeSnapshot } from '../../src/net/snapshot';
import { ENDLESS } from '../../src/modes';
import { PROPS } from '../../src/art/props';
import { slotAt } from '../../src/sim/slots';
import { Sim } from '../../src/sim/sim';
import type { SimEvent } from '../../src/sim/types';
import { PROFILE, arm, battleSim, carryTo, fire, makeSim, throwOntoHook, wave, type SimOpts } from './helpers';

const battle = (o: SimOpts = {}) => battleSim(o);

function run(sim: Sim, cond: () => boolean, max = 2000): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < max && !cond(); i++) { sim.step(); out.push(...sim.drainEvents()); }
  return out;
}

// The end of the day (nightfall, the retreat rule) is gone with v0.3: a level ends after its last wave.
describe('end of the level', () => {
  /** A one-wave level whose single raider has already arrived. */
  const lastWaveSim = (o: SimOpts = {}) => {
    const sim = makeSim({ waves: [wave(1, 1, 2)], ...o });
    run(sim, () => sim.s.phase === 'battle' && sim.s.waveDone, 2000);
    expect(sim.s.enemies).toHaveLength(1);
    return { sim, e: sim.s.enemies[0] };
  };

  it('ends only when the last raider is dead', () => {
    const { sim, e } = lastWaveSim();
    run(sim, () => false, 120);
    expect(sim.s.phase).toBe('battle');
    carryTo(sim, e, e.x, 80, 0, 1400);
    run(sim, () => sim.s.phase === 'runWon', 300);
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.meta.result?.kills).toBe(1);
  });

  it('the gate can still fall after the last wave has arrived', () => {
    const { sim, e } = lastWaveSim();
    sim.s.gateHp = 1;
    e.x = WORLD.gateX + 30;
    run(sim, () => sim.s.phase === 'gameover', 1500);
    expect(sim.s.phase).toBe('gameover');
    expect(sim.s.meta.result?.won).toBe(false);
  });

  it('a raider being melted or eaten counts as still there, and then pays out', () => {
    const { sim, e } = lastWaveSim();
    sim.loadout.stations.cauldron = true;
    const gold = sim.s.gold;
    carryTo(sim, e, WORLD.cauldron.x, WORLD.cauldron.rimY + 40);
    run(sim, () => e.st === 'cooking', 200);
    sim.step();
    expect(sim.s.phase).toBe('battle');
    run(sim, () => sim.s.phase === 'runWon', 400);
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.gold - gold).toBe(ENEMIES.grunt.gold * ECONOMY.cauldronGoldFactor);
  });

  it('no raider runs away at the end, whatever the old retreat switch says', () => {
    const { sim, e } = lastWaveSim({ flags: { dayEnd: 'retreat' } });
    run(sim, () => false, 30);
    expect(sim.s.phase).toBe('battle');
    expect(e.st).not.toBe('flee');
  });
});

describe('cauldron', () => {
  // The pot on the road ("front") is gone; these were the "back" variants of a front/back pair.
  const drop = (sim: Sim, e: Parameters<typeof carryTo>[1]) => carryTo(sim, e, WORLD.cauldron.x, WORLD.cauldron.rimY + 40);
  const pot = () => battle();

  it('melts one raider at a time, pays after the melt, frees up at once', () => {
    const sim = pot();
    sim.loadout.stations.cauldron = true;
    const a = sim.spawnEnemy('grunt', 700);
    const b = sim.spawnEnemy('grunt', 760);
    drop(sim, a);
    const seen = [...sim.drainEvents(), ...run(sim, () => a.st === 'cooking', 200)];
    expect(seen.some((x) => x.e === 'splash')).toBe(true);
    expect(sim.s.potBusy).toBeGreaterThan(0);
    // Paid after the melt, not when it goes in.
    expect(sim.s.gold).toBe(0);

    // A second raider finds the pot taken while the first one melts.
    drop(sim, b);
    expect(b.st).not.toBe('cooking');
    for (let i = 0; i < 10; i++) { sim.step(); seen.push(...sim.drainEvents()); expect(b.st).not.toBe('cooking'); }

    seen.push(...run(sim, () => a.dead, 200));
    expect(seen.some((x) => x.e === 'cheese')).toBe(true);
    expect(seen.some((x) => x.e === 'death' && x.cause === 'cauldron')).toBe(true);
    expect(sim.s.gold).toBe(ENEMIES.grunt.gold * ECONOMY.cauldronGoldFactor);
    expect(sim.s.potBusy).toBe(0);
  });

  it('a raider in the pot cannot be grabbed or blown up', () => {
    const sim = pot();
    sim.loadout.stations.cauldron = true;
    const a = sim.spawnEnemy('grunt', 700);
    drop(sim, a);
    run(sim, () => a.st === 'cooking', 200);
    sim.setHand(0, a.x, a.y - 20);
    sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 20 });
    expect(a.heldBy).toEqual([]);
    sim.blast(a.x, a.y, 200, 9999, -1);
    expect(a.dead).toBe(false);
  });

  // Replaced "the melt time comes from the tuning panel": the cauldron tier sets it now (C5), the
  // slider only scales it.
  for (const tier of [1, 2, 3]) {
    it('melts in the time of its tier ' + tier + ', scaled by the tuning panel', () => {
      const sim = pot();
      sim.setTuning({ ...sim.tuning, cauldronSeconds: TUNING_DEFAULT.cauldronSeconds * 0.5 });
      sim.loadout.stations.cauldron = true;
      sim.loadout.stationTier = { cauldron: tier, perch: 0 };
      const a = sim.spawnEnemy('grunt', 700);
      drop(sim, a);
      run(sim, () => a.st === 'cooking', 200);
      let ticks = 0;
      while (!a.dead && ticks < 400) { sim.step(); ticks++; }
      expect(ticks / 60).toBeCloseTo(CAULDRON_SECONDS[tier - 1] * 0.5, 1);
    });
  }

  it('each cauldron tier melts faster than the one before', () => {
    for (let i = 1; i < CAULDRON_SECONDS.length; i++) expect(CAULDRON_SECONDS[i]).toBeLessThan(CAULDRON_SECONDS[i - 1]);
    expect(meltSeconds(1, TUNING_DEFAULT)).toBe(CAULDRON_SECONDS[0]);
  });

  it('rear: pulls in a throw headed near it, even a sloppy one', () => {
    const sim = battle();
    sim.loadout.stations.cauldron = true;
    const e = sim.spawnEnemy('grunt', 620);
    const { x, rimY } = WORLD.cauldron;
    // From road height out on the field, a lob aimed roughly at the pot.
    carryTo(sim, e, 520, 470, -780, -500);
    expect(e.st).toBe('air');
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).toBe('cooking');
    expect(e.x).toBe(x);
    expect(e.y).toBe(rimY);
  });

  it('rear: ignores what merely flies past or walks by underneath', () => {
    const sim = battle();
    sim.loadout.stations.cauldron = true;
    const away = sim.spawnEnemy('grunt', 500);
    carryTo(sim, away, 330, 430, 900, -300);
    run(sim, () => away.st !== 'air', 200);
    expect(away.st).not.toBe('cooking');
    const walker = sim.spawnEnemy('grunt', WORLD.cauldron.x + 40);
    run(sim, () => walker.st === 'attack', 400);
    expect(walker.st).toBe('attack');
    expect(sim.s.potBusy).toBe(0);
  });

  // Replaced "rear pot is not there in the front variant, and the other way round": there is one pot only.
  it('there is no pot on the road any more: a raider set down where the front pot stood just lands', () => {
    const sim = battle();
    sim.loadout.stations.cauldron = true;
    const a = sim.spawnEnemy('grunt', 700);
    // Where the old pot on the road stood (x 345), at road height.
    carryTo(sim, a, 345 + 120, WORLD.groundY - 10);
    run(sim, () => a.st !== 'air', 200);
    expect(a.st).not.toBe('cooking');
    expect(sim.s.potBusy).toBe(0);
  });

  it('the cauldron switch is gone from the experiment switches', () => {
    expect(FLAG_DEFS.map((f) => f.id)).not.toContain('cauldron');
  });
});

// v0.3 (C6): the hook is a small target that wants an aimed throw. Replaced "catches a throw that
// flies past it" and "a throw that is headed for the hook gets there, even from far away" (the old
// wide catch and strong aim assist); every "carried to the hook and let go" setup now throws with
// `throwOntoHook`. New tests below pin the harder rule and the hit rate.
describe('eagle hook', () => {
  it('hangs at the top right of the field, also on a wider field', () => {
    for (const w of [1280, 1560, 1760]) {
      const sim = battle({ fieldW: w });
      sim.loadout.stations.perch = true;
      const e = sim.spawnEnemy('grunt', 900);
      throwOntoHook(sim, e);
      run(sim, () => e.st !== 'air', 120);
      expect(e.st).toBe('hooked');
      expect(e.x).toBe(perchX(w));
      expect(perchX(w)).toBeGreaterThan(w * 0.8);
    }
  });

  it('catches an aimed throw from further away', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const e = sim.spawnEnemy('grunt', 760);
    throwOntoHook(sim, e, 0, 320, 1300);
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).toBe('hooked');
    expect(sim.s.stats.perchHits).toBe(1);
  });

  it('a sloppy throw from far away misses now (v0.2 caught it)', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const e = sim.spawnEnemy('grunt', 500);
    carryTo(sim, e, 700, 420, 1600, -500);
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).not.toBe('hooked');
  });

  it('carried up to the hook and let go is no sacrifice: it needs a throw', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const e = sim.spawnEnemy('grunt', 900);
    carryTo(sim, e, perchX(1280), WORLD.perch.hookY);
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).not.toBe('hooked');
    expect(sim.s.crests).toBe(0);
  });

  it('the hook is smaller than in v0.2 and the aim assist much weaker', () => {
    expect(CRESTS.hookRadius).toBeLessThan(WORLD.perch.flySnapRadius * 0.6);
    expect(CRESTS.assistRadius).toBeLessThan(WORLD.perch.assistRadius * 0.5);
    expect(CRESTS.headingCos).toBeGreaterThan(WORLD.perch.headingCos);
  });

  it('an ordinary fling up and away is not caught by the hook', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const e = sim.spawnEnemy('grunt', 800);
    carryTo(sim, e, 860, 500, 100, -1500);
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).not.toBe('hooked');
  });

  it('counts tries and hits, so bots can measure the hit rate', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const hit = sim.spawnEnemy('grunt', 760);
    throwOntoHook(sim, hit);
    run(sim, () => hit.st !== 'air', 120);
    expect(hit.st).toBe('hooked');
    run(sim, () => hit.dead, 300);
    // A near miss: the same throw a little too low.
    const miss = sim.spawnEnemy('grunt', 760);
    throwOntoHook(sim, miss);
    miss.y += 60;
    run(sim, () => miss.st !== 'air', 200);
    expect(miss.st).not.toBe('hooked');
    expect(sim.s.stats.perchTries).toBe(2);
    expect(sim.s.stats.perchHits).toBe(1);
    expect(perchHitRate(sim.s.stats)).toBeCloseTo(0.5, 5);
    expect(perchHitRate({ perchTries: 0, perchHits: 0 })).toBeNull();
  });

  it('holds one at a time, the eagle eats it, then the hook is free at once', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const a = sim.spawnEnemy('grunt', 700);
    const b = sim.spawnEnemy('grunt', 760);
    throwOntoHook(sim, a);
    run(sim, () => a.st !== 'air', 120);
    expect(a.st).toBe('hooked');
    expect(sim.s.perchBusy).toBeGreaterThan(PERCH.hangSeconds + PERCH.eatSeconds - 0.3);
    throwOntoHook(sim, b);
    const flown = run(sim, () => b.st !== 'air', 120);
    expect(b.st).not.toBe('hooked');
    const ev = [...flown, ...run(sim, () => a.dead, 300)];
    expect(ev.some((x) => x.e === 'eagle')).toBe(true);
    expect(sim.s.crests).toBe(1);
    expect(sim.s.perchBusy).toBe(0);
    const c = sim.spawnEnemy('grunt', 760);
    throwOntoHook(sim, c);
    run(sim, () => c.st !== 'air', 120);
    expect(c.st).toBe('hooked');
  });

  it('the eagle comes during the wait, not before', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const a = sim.spawnEnemy('grunt', 700);
    throwOntoHook(sim, a);
    run(sim, () => a.st !== 'air', 120);
    const hung = run(sim, () => a.t <= PERCH.eatSeconds + 0.02, 300);
    expect(hung.some((x) => x.e === 'eagle')).toBe(false);
    const eaten = run(sim, () => a.dead, 300);
    expect(eaten.some((x) => x.e === 'eagle')).toBe(true);
  });

  it('a hanging raider is safe from weapons and tells the snapshot', () => {
    const sim = battle();
    sim.loadout.stations.perch = true;
    const a = sim.spawnEnemy('grunt', 700);
    throwOntoHook(sim, a);
    run(sim, () => a.st !== 'air', 120);
    sim.blast(a.x, a.y, 200, 9999, -1);
    expect(a.dead).toBe(false);
    const view = decodeSnapshot(encodeSnapshot(sim.s));
    expect(view.perchBusy).toBeGreaterThan(0);
    expect(view.enemies[0].st).toBe('hooked');
  });
});

// "aiming at the keep": the pull-to-aim tests are replaced by weapons.test.ts and targeting.test.ts.
describe('weapons on the keep', () => {
  it('a press on a weapon never grabs a raider at the gate, and the other way round', () => {
    const sim = battle();
    const slot = arm(sim, 'mortar', 1);
    const e = sim.spawnEnemy('grunt', WORLD.gateX + 22);
    e.st = 'attack';
    // Grip zones stop before the road, however fat the finger.
    expect(slotAt(WORLD.slotZoneMaxX + 1, SLOTS[slot].y, 200, () => true)).toBe(-1);
    expect(slotAt(e.x, e.y - 40, 200, () => true)).toBe(-1);
    // A tap on the weapon fires it and leaves the raider alone.
    const ev = fire(sim, slot);
    expect(ev.some((x) => x.e === 'fire')).toBe(true);
    expect(e.heldBy).toEqual([]);
    expect(sim.s.hands[0].holding).toBe(-1);

    sim.setHand(0, e.x, e.y - 40);
    sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 40 });
    expect(e.heldBy).toEqual([0]);
  });

  it('a weapon that is reloading refuses and grabs nothing', () => {
    const sim = battle();
    const slot = arm(sim, 'bolter', 1);
    sim.spawnEnemy('grunt', 600);
    sim.s.cooldowns[slot] = 3;
    const ev = fire(sim, slot);
    expect(ev.some((x) => x.e === 'denied')).toBe(true);
    expect(sim.s.projectiles).toHaveLength(0);
    expect(sim.s.hands[0].holding).toBe(-1);
  });

  it('slotAt picks the nearest weapon you own and nothing you do not', () => {
    const tower = SLOTS.findIndex((s) => s.role === 'passive');
    const shrine = SLOTS.findIndex((s) => s.role === 'support');
    const owned = (s: number) => s === tower;
    const { x, y } = SLOTS[tower];
    expect(slotAt(x + 4, y, 60, owned)).toBe(tower);
    expect(slotAt(SLOTS[shrine].x, SLOTS[shrine].y, 60, owned)).toBe(-1);
    expect(slotAt(SLOTS[shrine].x, SLOTS[shrine].y, 60, () => true)).toBe(shrine);
  });

  it('every mounted weapon is drawn ready and reloading', () => {
    for (const n of ['Bolter', 'Mortar', 'Frost', 'Bellows', 'Stomper', 'Comet', 'Wheel']) {
      expect(PROPS[`mount${n}Ready`], n).toBeDefined();
      expect(PROPS[`mount${n}Empty`], n).toBeDefined();
    }
  });
});

describe('keep upgrades', () => {
  it('every gate has a keep of its own', () => {
    expect(GATES).toHaveLength(7);
    GATES.forEach((_, i) => {
      expect(PROPS[`keep${i}`]).toBeDefined();
      expect(PROPS[`keepGlow${i}`]).toBeDefined();
    });
  });
  // "the build stage follows the best gate owned" and "a weapon stands on the keep once owned"
  // come from the keep of the profile now; a run keeps its loadout (waves.test.ts).
});

describe('quick start', () => {
  const quick = (wave: number, names = ['A']) => new Sim(ENDLESS.buildRun(PROFILE, { world: 'fondue', difficulty: 'medium', quickStart: wave }, {
    names, fieldW: 1280, handTiers: names.map(() => 1), seed: 3,
  }));

  for (const q of QUICK_STARTS) {
    it(`wave ${q.wave}: starts there with what a run would own`, () => {
      const sim = quick(q.wave);
      expect(sim.s.wave).toBe(q.wave);
      expect(sim.s.gold).toBe(q.gold);
      // A quick start is a developer run: no scores, no stars.
      expect(sim.s.meta.devRun).toBe(true);
      expect(sim.loadout.slotWeapon).toEqual(q.slots);
      expect(sim.loadout.weaponTier).toEqual(q.tiers);
      expect(sim.loadout.gateTier).toBe(q.gateTier);
      expect(sim.loadout.stations).toEqual({ cauldron: q.cauldron, perch: q.perch });
      expect(sim.loadout.handTier).toEqual([q.hand]);
      expect(sim.s.gateHp).toBe(sim.s.gateMax);
      expect(sim.s.gateMax).toBe(GATES[q.gateTier].hp);
      // A later wave of endless brings a crowd, not the handful of wave 1.
      expect(sim.s.spawnQueue.length).toBeGreaterThan(10);
    });

    it(`wave ${q.wave}: every weapon is real, fits its slot and has a tier`, () => {
      expect(q.slots).toHaveLength(SLOTS.length);
      q.slots.forEach((id, slot) => {
        if (id === null) return;
        const def = weaponById(id);
        expect(def, id).toBeDefined();
        expect(def!.slot, id).toBe(SLOTS[slot].role);
        expect(q.tiers[id], id).toBeGreaterThanOrEqual(1);
        expect(q.tiers[id], id).toBeLessThanOrEqual(MAX_TIER);
      });
      for (const id of Object.keys(q.tiers)) expect(q.slots, `${id} has a tier but no slot`).toContain(id);
    });
  }

  it('works for two players', () => {
    const sim = quick(20, ['A', 'B']);
    expect(sim.s.wave).toBe(20);
    expect(sim.s.hands).toHaveLength(2);
    expect(sim.loadout.handTier).toHaveLength(2);
  });

  it('an unknown wave is a normal run', () => {
    const sim = quick(13);
    expect(sim.s.wave).toBe(1);
    expect(sim.s.meta.devRun).toBe(false);
  });

  it('does not repeat the tips for waves that were skipped', () => {
    const sim = quick(20);
    expect(sim.s.meta.wave.newTypes).toEqual([]);
  });
});

describe('experiment switches', () => {
  it('every switch has a default among its options', () => {
    for (const f of FLAG_DEFS) expect(f.options.map((o) => o.value)).toContain(f.value);
    expect(FLAG_DEFS.map((f) => f.id)).toContain('secondHand');
  });

  it('old settings and unknown values fall back to the default', () => {
    expect(cleanFlags({ secondHand: 'sideways', nonsense: 'x' })).toEqual(defaultFlags());
    expect(cleanFlags(undefined)).toEqual(defaultFlags());
    expect(cleanFlags({ secondHand: 'on' }).secondHand).toBe('on');
    // The end-of-day switch went with the days: an old saved value is dropped.
    expect(cleanFlags({ dayEnd: 'retreat' })).toEqual(defaultFlags());
  });

  it('are part of the shared game state, so the guest gets the host values', () => {
    const sim = battle();
    const rev = sim.s.meta.rev;
    sim.setFlags({ secondHand: 'on' });
    expect(sim.flag('secondHand')).toBe('on');
    expect(sim.s.meta.rev).toBeGreaterThan(rev);
  });
});

describe('field width', () => {
  it('follows the host screen within its limits', () => {
    expect(fieldForAspect(16 / 9)).toBe(FIELD.min);
    expect(fieldForAspect(4 / 3)).toBe(FIELD.min);
    expect(fieldForAspect(2.17)).toBeGreaterThan(1500);
    expect(fieldForAspect(2.8)).toBe(FIELD.max);
  });

  it('a wider field buys only a little walking time, and never takes any away', () => {
    const walk = (fieldW: number) => {
      const sim = battle({ fieldW });
      const e = sim.spawnEnemy('grunt', fieldEntry(fieldW));
      let ticks = 0;
      while (e.st === 'walk' && ticks < 5000) { sim.step(); ticks++; }
      return ticks;
    };
    const base = walk(1280);
    for (const w of [1440, 1560, 1760]) {
      expect(walk(w)).toBeGreaterThanOrEqual(base);
      expect(walk(w)).toBeLessThanOrEqual(base * 1.2);
    }
    expect(fieldSpeedFactor(1280)).toBe(1);
  });

  it('thrown raiders bounce off the wall of the wider field', () => {
    const sim = battle({ fieldW: 1600 });
    const e = sim.spawnEnemy('grunt', 1500);
    carryTo(sim, e, 1500, 300, 1700, 0);
    run(sim, () => e.vx < 0 || e.dead, 200);
    expect(e.x).toBeLessThanOrEqual(fieldWall(1600));
  });

  it('raiders start out of sight and reach the edge within moments', () => {
    const sim = battle({ fieldW: 1560 });
    const e = sim.spawnEnemy('grunt');
    expect(e.x).toBeGreaterThan(fieldEntry(1560));
    run(sim, () => e.x <= fieldEntry(1560), 60);
    expect(e.x).toBeLessThanOrEqual(fieldEntry(1560));
  });

  it('solo follows a rotated phone, raiders outside walk back in', () => {
    const sim = battle({ fieldW: 1560 });
    const e = sim.spawnEnemy('grunt', 1500);
    sim.setFieldWidth(1280);
    expect(sim.s.meta.fieldW).toBe(1280);
    run(sim, () => e.x <= fieldEntry(1280), 60);
    expect(e.x).toBeLessThanOrEqual(fieldEntry(1280));
  });
});
