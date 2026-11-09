import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config/enemies';
import { FLAG_DEFS, cleanFlags, defaultFlags } from '../../src/config/flags';
import { QUICK_STARTS } from '../../src/config/quickstart';
import { AIM, PERCH, SHOP_ITEMS, type WeaponSlot } from '../../src/config/shop';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import { DAY } from '../../src/config/waves';
import { FIELD, WORLD, fieldEntry, fieldForAspect, fieldSpeedFactor, fieldWall, perchX } from '../../src/config/world';
import { decodeSnapshot, encodeSnapshot } from '../../src/net/snapshot';
import { buildTier, ownsSlot } from '../../src/sim/keep';
import { PROPS } from '../../src/art/props';
import { aimShot, pointerFor, pullStrength, slotAt } from '../../src/sim/aim';
import { Sim } from '../../src/sim/sim';
import type { Enemy, SimEvent, SimOptions } from '../../src/sim/types';

function battle(over: Partial<SimOptions> = {}) {
  const sim = new Sim({ seed: 42, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT }, ...over });
  while (sim.s.phase === 'banner') sim.step();
  sim.s.spawnQueue = [];
  sim.drainEvents();
  return sim;
}

function run(sim: Sim, cond: () => boolean, max = 2000): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < max && !cond(); i++) { sim.step(); out.push(...sim.drainEvents()); }
  return out;
}

function carryTo(sim: Sim, e: Enemy, x: number, y: number, vx = 0, vy = 0, p = 0) {
  const gy = e.y - ENEMIES[e.type].height * 0.5;
  sim.setHand(p, e.x, gy);
  sim.command({ k: 'press', p, x: e.x, y: gy });
  sim.setHand(p, x, y);
  sim.step();
  sim.command({ k: 'release', p, x, y, vx, vy });
}

const pressSlot = (sim: Sim, slot: WeaponSlot, p = 0) => sim.command({ k: 'pressSlot', p, slot, x: WORLD.slots[slot].x, y: WORLD.slots[slot].y });

describe('end of the day', () => {
  it('stops new arrivals at nightfall and keeps the field fighting', () => {
    const sim = battle();
    sim.s.spawnQueue = [{ t: DAY.seconds + 1, type: 'grunt' }];
    const e = sim.spawnEnemy('grunt', 900);
    sim.s.dayT = DAY.seconds - 0.1;
    const ev = run(sim, () => sim.s.nightfall, 60);
    expect(ev.some((x) => x.e === 'nightfall')).toBe(true);
    run(sim, () => false, 200);
    expect(sim.s.phase).toBe('battle');
    expect(sim.s.enemies).toHaveLength(1);
    expect(e.st).not.toBe('flee');
  });

  it('ends only when the last raider is dead', () => {
    const sim = battle();
    const e = sim.spawnEnemy('grunt', 900);
    sim.s.dayT = DAY.seconds + 5;
    run(sim, () => false, 120);
    expect(sim.s.phase).toBe('battle');
    carryTo(sim, e, 900, 80, 0, 1400);
    run(sim, () => sim.s.phase === 'victory', 300);
    expect(sim.s.phase).toBe('victory');
    run(sim, () => sim.s.phase === 'intermission', 400);
    expect(sim.s.meta.lastDay?.kills).toBe(1);
  });

  it('the gate can still fall after nightfall', () => {
    const sim = battle();
    sim.s.gateHp = 1;
    sim.spawnEnemy('grunt', WORLD.gateX + 30);
    sim.s.dayT = DAY.seconds + 5;
    run(sim, () => sim.s.phase === 'gameover', 1500);
    expect(sim.s.phase).toBe('gameover');
  });

  it('a raider being melted or eaten counts as still there, and then pays out', () => {
    const sim = battle();
    sim.s.meta.owned.push('cauldron');
    const e = sim.spawnEnemy('grunt', 700);
    sim.s.dayT = DAY.seconds + 1;
    carryTo(sim, e, WORLD.cauldron.x, 300);
    run(sim, () => e.st === 'cooking', 200);
    sim.step();
    expect(sim.s.phase).toBe('battle');
    run(sim, () => sim.s.phase === 'victory', 200);
    expect(sim.s.offerings).toBe(1);
  });

  it('the retreat experiment keeps the old rule', () => {
    const sim = battle({ flags: { dayEnd: 'retreat' } });
    const e = sim.spawnEnemy('grunt', 900);
    sim.s.dayT = DAY.seconds;
    sim.step();
    expect(sim.s.phase).toBe('victory');
    expect(e.st).toBe('flee');
  });
});

describe('cauldron', () => {
  for (const variant of ['front', 'back'] as const) {
    const drop = (sim: Sim, e: Enemy) => {
      if (variant === 'front') carryTo(sim, e, WORLD.cauldron.x, 300);
      else carryTo(sim, e, WORLD.cauldronBack.x, WORLD.cauldronBack.rimY + 40);
    };
    const pot = () => battle({ flags: { cauldron: variant } });

    it(`${variant}: melts one raider at a time, pays after the melt, frees up at once`, () => {
      const sim = pot();
      sim.s.meta.owned.push('cauldron');
      const a = sim.spawnEnemy('grunt', 700);
      const b = sim.spawnEnemy('grunt', 760);
      drop(sim, a);
      const seen = [...sim.drainEvents(), ...run(sim, () => a.st === 'cooking', 200)];
      expect(seen.some((x) => x.e === 'splash')).toBe(true);
      expect(sim.s.potBusy).toBeGreaterThan(0);
      expect(sim.s.offerings).toBe(0);

      // A second raider finds the pot taken while the first one melts.
      drop(sim, b);
      expect(b.st).not.toBe('cooking');
      for (let i = 0; i < 10; i++) { sim.step(); seen.push(...sim.drainEvents()); expect(b.st).not.toBe('cooking'); }

      seen.push(...run(sim, () => a.dead, 200));
      expect(seen.some((x) => x.e === 'cheese')).toBe(true);
      expect(seen.some((x) => x.e === 'death' && x.cause === 'cauldron')).toBe(true);
      expect(sim.s.offerings).toBe(1);
      expect(sim.s.potBusy).toBe(0);
    });

    it(`${variant}: a raider in the pot cannot be grabbed or blown up`, () => {
      const sim = pot();
      sim.s.meta.owned.push('cauldron');
      const a = sim.spawnEnemy('grunt', 700);
      drop(sim, a);
      run(sim, () => a.st === 'cooking', 200);
      sim.setHand(0, a.x, a.y - 20);
      sim.command({ k: 'press', p: 0, x: a.x, y: a.y - 20 });
      expect(a.heldBy).toEqual([]);
      (sim as unknown as { blast(x: number, y: number, r: number, d: number, p: number): void }).blast(a.x, a.y, 200, 9999, -1);
      expect(a.dead).toBe(false);
    });

    it(`${variant}: the melt time comes from the tuning panel`, () => {
      const sim = pot();
      sim.setTuning({ ...sim.tuning, cauldronSeconds: 0.5 });
      sim.s.meta.owned.push('cauldron');
      const a = sim.spawnEnemy('grunt', 700);
      drop(sim, a);
      run(sim, () => a.st === 'cooking', 200);
      let ticks = 0;
      while (!a.dead && ticks < 300) { sim.step(); ticks++; }
      expect(ticks / 60).toBeCloseTo(0.5, 1);
    });
  }

  it('rear: pulls in a throw headed near it, even a sloppy one', () => {
    const sim = battle({ flags: { cauldron: 'back' } });
    sim.s.meta.owned.push('cauldron');
    const e = sim.spawnEnemy('grunt', 620);
    const { x, rimY } = WORLD.cauldronBack;
    // From road height out on the field, a lob aimed roughly at the pot.
    carryTo(sim, e, 520, 470, -780, -500);
    expect(e.st).toBe('air');
    run(sim, () => e.st !== 'air', 200);
    expect(e.st).toBe('cooking');
    expect(e.x).toBe(x);
    expect(e.y).toBe(rimY);
  });

  it('rear: ignores what merely flies past or walks by underneath', () => {
    const sim = battle({ flags: { cauldron: 'back' } });
    sim.s.meta.owned.push('cauldron');
    const away = sim.spawnEnemy('grunt', 500);
    carryTo(sim, away, 330, 430, 900, -300);
    run(sim, () => away.st !== 'air', 200);
    expect(away.st).not.toBe('cooking');
    const walker = sim.spawnEnemy('grunt', WORLD.cauldronBack.x + 40);
    run(sim, () => walker.st === 'attack', 400);
    expect(walker.st).toBe('attack');
    expect(sim.s.potBusy).toBe(0);
  });

  it('rear pot is not there in the front variant, and the other way round', () => {
    const front = battle();
    front.s.meta.owned.push('cauldron');
    const a = front.spawnEnemy('grunt', 700);
    carryTo(front, a, WORLD.cauldronBack.x, WORLD.cauldronBack.rimY + 40);
    expect(a.st).toBe('air');
    expect(front.s.potBusy).toBe(0);
  });
});

describe('eagle hook', () => {
  const hookY = WORLD.perch.hookY;

  it('hangs at the top right of the field, also on a wider field', () => {
    for (const w of [1280, 1560, 1760]) {
      const sim = battle({ fieldW: w });
      sim.s.meta.owned.push('perch');
      const e = sim.spawnEnemy('grunt', 900);
      carryTo(sim, e, perchX(w), hookY);
      expect(e.st).toBe('hooked');
      expect(e.x).toBe(perchX(w));
      expect(perchX(w)).toBeGreaterThan(w * 0.8);
    }
  });

  it('catches a throw that flies past it', () => {
    const sim = battle();
    sim.s.meta.owned.push('perch');
    const e = sim.spawnEnemy('grunt', 760);
    carryTo(sim, e, 760, 330, 1500, -420);
    run(sim, () => e.st === 'hooked' || e.dead, 200);
    expect(e.st).toBe('hooked');
  });

  it('holds one at a time, the eagle eats it, then the hook is free at once', () => {
    const sim = battle();
    sim.s.meta.owned.push('perch');
    const a = sim.spawnEnemy('grunt', 700);
    const b = sim.spawnEnemy('grunt', 760);
    carryTo(sim, a, perchX(1280), hookY);
    expect(a.st).toBe('hooked');
    expect(sim.s.perchBusy).toBeCloseTo(PERCH.hangSeconds + PERCH.eatSeconds, 3);
    carryTo(sim, b, perchX(1280), hookY);
    expect(b.st).toBe('air');
    const ev = run(sim, () => a.dead, 300);
    expect(ev.some((x) => x.e === 'eagle')).toBe(true);
    expect(sim.s.offerings).toBe(1);
    expect(sim.s.perchBusy).toBe(0);
    const c = sim.spawnEnemy('grunt', 760);
    carryTo(sim, c, perchX(1280), hookY);
    expect(c.st).toBe('hooked');
  });

  it('the eagle comes during the wait, not before', () => {
    const sim = battle();
    sim.s.meta.owned.push('perch');
    const a = sim.spawnEnemy('grunt', 700);
    carryTo(sim, a, perchX(1280), hookY);
    const hung = run(sim, () => a.t <= PERCH.eatSeconds + 0.02, 300);
    expect(hung.some((x) => x.e === 'eagle')).toBe(false);
    const eaten = run(sim, () => a.dead, 300);
    expect(eaten.some((x) => x.e === 'eagle')).toBe(true);
  });

  it('a hanging raider is safe from weapons and tells the snapshot', () => {
    const sim = battle();
    sim.s.meta.owned.push('perch');
    const a = sim.spawnEnemy('grunt', 700);
    carryTo(sim, a, perchX(1280), hookY);
    (sim as unknown as { blast(x: number, y: number, r: number, d: number, p: number): void }).blast(a.x, a.y, 200, 9999, -1);
    expect(a.dead).toBe(false);
    const view = decodeSnapshot(encodeSnapshot(sim.s));
    expect(view.perchBusy).toBeGreaterThan(0);
    expect(view.enemies[0].st).toBe('hooked');
  });
});

describe('aiming at the keep', () => {
  const G = TUNING_DEFAULT.gravity;

  it('a pull inside the dead zone is not a shot and costs nothing', () => {
    const sim = battle();
    sim.s.meta.owned.push('bolter1');
    pressSlot(sim, 'bolter');
    expect(sim.s.hands[0].mode).toBe('bolter');
    const { x, y } = WORLD.slots.bolter;
    sim.command({ k: 'release', p: 0, x: x + 5, y: y + 5, vx: 0, vy: 0 });
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.e === 'aimHint')).toBe(true);
    expect(sim.s.projectiles).toHaveLength(0);
    expect(sim.s.cooldowns.bolter).toBe(0);
    expect(sim.s.hands[0].mode).toBe('none');
  });

  it('pulling further reaches further, from near the gate to the end of the field', () => {
    for (const fieldW of [1280, 1760]) {
      const { x: x0, y: y0 } = WORLD.slots.horn;
      const land = (dist: number) => aimShot('horn', 'mortar', x0 + dist * Math.cos(1.1), y0 - dist * Math.sin(1.1), fieldW, G).landX;
      expect(land(AIM.deadzone + 4)).toBeLessThan(WORLD.gateX + 180);
      expect(land(250)).toBeGreaterThan(land(120));
      expect(land(AIM.maxPull)).toBeGreaterThan(fieldW - 40);
    }
  });

  it('can land on any spot of the road', () => {
    for (const x of [260, 500, 900, 1250]) {
      const p = pointerFor('horn', 'mortar', x, 1280, G);
      expect(Math.abs(aimShot('horn', 'mortar', p.x, p.y, 1280, G).landX - x)).toBeLessThan(6);
    }
  });

  it('the mortar always goes high, the crossbow stays flat and quick', () => {
    const horizontal = aimShot('horn', 'mortar', 700, WORLD.slots.horn.y, 1280, G);
    expect(-horizontal.vy / horizontal.vx).toBeGreaterThan(1.4);
    const bolt = aimShot('bolter', null, 800, 500, 1280, G);
    expect(bolt.kind).toBe('line');
    expect(Math.hypot(bolt.vx, bolt.vy)).toBeGreaterThan(1200);
    expect(pullStrength(AIM.maxPull * 3)).toBe(1);
  });

  it('crossbow bolts fly where the pull points and hit harder at full pull', () => {
    const sim = battle();
    sim.s.meta.owned.push('bolter1');
    const e = sim.spawnEnemy('grunt', 620);
    const at = pointerFor('bolter', null, 620, sim.fieldW, sim.tuning.gravity);
    pressSlot(sim, 'bolter');
    sim.setHand(0, at.x, at.y);
    sim.command({ k: 'release', p: 0, x: at.x, y: at.y, vx: 0, vy: 0 });
    expect(sim.s.projectiles.filter((q) => q.kind === 'roofBolt')).toHaveLength(4);
    expect(sim.s.projectiles[0].damage).toBeGreaterThan(100);
    expect(sim.s.cooldowns.bolter).toBeGreaterThan(0);
    run(sim, () => e.dead, 200);
    expect(e.dead).toBe(true);
  });

  it('a weak pull falls short and is weaker', () => {
    const { x: x0, y: y0 } = WORLD.slots.bolter;
    const weak = aimShot('bolter', null, x0 + 70, y0 + 10, 1280, G);
    const full = aimShot('bolter', null, x0 + AIM.maxPull, y0 + 10, 1280, G);
    expect(weak.range).toBeLessThan(full.range);
    expect(weak.power).toBeLessThan(full.power);
  });

  it('a press on a weapon never grabs a raider at the gate, and the other way round', () => {
    const sim = battle();
    sim.s.meta.owned.push('mortar');
    sim.s.meta.hornEquipped = 'mortar';
    const e = sim.spawnEnemy('grunt', WORLD.gateX + 22);
    e.st = 'attack';
    // Grip zones stop before the road, however fat the finger.
    expect(slotAt(WORLD.slotZoneMaxX + 1, WORLD.slots.horn.y, 200, () => true)).toBe(null);
    expect(slotAt(e.x, e.y - 40, 200, () => true)).toBe(null);
    pressSlot(sim, 'horn');
    expect(e.heldBy).toEqual([]);
    expect(sim.s.hands[0].holding).toBe(-1);
    expect(sim.s.hands[0].mode).toBe('horn');
    sim.command({ k: 'cancelMode', p: 0 });
    sim.command({ k: 'release', p: 0, x: e.x, y: e.y, vx: 0, vy: 0 });

    sim.setHand(0, e.x, e.y - 40);
    sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 40 });
    expect(e.heldBy).toEqual([0]);
    expect(sim.s.hands[0].mode).toBe('none');
  });

  it('a weapon that is reloading refuses and grabs nothing', () => {
    const sim = battle();
    sim.s.meta.owned.push('bolter1');
    sim.s.cooldowns.bolter = 3;
    pressSlot(sim, 'bolter');
    expect(sim.s.hands[0].mode).toBe('none');
    expect(sim.drainEvents().some((x) => x.e === 'denied')).toBe(true);
  });

  it('slotAt picks the nearest weapon you own and nothing you do not', () => {
    const owned = (s: WeaponSlot) => s === 'bolter';
    const { x, y } = WORLD.slots.bolter;
    expect(slotAt(x + 4, y, 60, owned)).toBe('bolter');
    expect(slotAt(WORLD.slots.comet.x, WORLD.slots.comet.y, 60, owned)).toBe(null);
    expect(slotAt(WORLD.slots.comet.x, WORLD.slots.comet.y, 60, () => true)).toBe('comet');
  });

  it('the snapshot tells the other player what is being aimed', () => {
    const sim = battle();
    sim.s.meta.owned.push('bolter1');
    pressSlot(sim, 'bolter');
    const v = decodeSnapshot(encodeSnapshot(sim.s));
    expect(v.hands[0].mode).toBe('bolter');
    expect(v.hands[0].aiming).toBe(true);
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
    const gates = SHOP_ITEMS.filter((i) => i.tab === 'gates');
    expect(gates).toHaveLength(5);
    gates.forEach((_, i) => {
      expect(PROPS[`keep${i}`]).toBeDefined();
      expect(PROPS[`keepGlow${i}`]).toBeDefined();
    });
  });

  it('the build stage follows the best gate owned', () => {
    const sim = battle();
    expect(buildTier(sim.s.meta)).toBe(0);
    sim.s.meta.owned.push('gate1');
    expect(buildTier(sim.s.meta)).toBe(1);
    sim.s.meta.owned.push('gate2', 'gate3', 'gate4');
    expect(buildTier(sim.s.meta)).toBe(4);
  });

  it('a weapon stands on the keep once owned', () => {
    const sim = battle();
    expect(ownsSlot('wheel', sim.s.meta)).toBe(false);
    sim.s.meta.owned.push('wheel1');
    expect(ownsSlot('wheel', sim.s.meta)).toBe(true);
    expect(ownsSlot('horn', sim.s.meta)).toBe(false);
    sim.s.meta.hornEquipped = 'frost';
    expect(ownsSlot('horn', sim.s.meta)).toBe(true);
  });
});

describe('quick start', () => {
  for (const q of QUICK_STARTS) {
    it(`day ${q.day}: starts there with what a run would own`, () => {
      const sim = new Sim({ seed: 3, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT }, quickStart: q.day });
      expect(sim.s.day).toBe(q.day);
      expect(sim.s.gold).toBe(q.gold);
      expect(sim.s.offerings).toBe(q.offerings);
      expect(sim.s.meta.quickStart).toBe(q.day);
      expect(sim.s.meta.hornEquipped).toBe(q.hornEquipped);
      for (const id of q.owned) expect(sim.owns(id), id).toBe(true);
      expect(sim.s.gateHp).toBe(sim.s.gateMax);
      expect(sim.s.spawnQueue.length).toBeGreaterThan(50);
    });

    it(`day ${q.day}: every item is real, and its requirements are owned too`, () => {
      for (const id of q.owned) {
        const item = SHOP_ITEMS.find((i) => i.id === id);
        expect(item, id).toBeDefined();
        if (item?.requires && item.requires !== 'gate0') expect(q.owned, `${id} needs ${item.requires}`).toContain(item.requires);
      }
    });
  }

  it('works for two players', () => {
    const sim = new Sim({ seed: 3, difficulty: 'medium', names: ['A', 'B'], tuning: { ...TUNING_DEFAULT }, quickStart: 20 });
    expect(sim.s.day).toBe(20);
    expect(sim.s.hands).toHaveLength(2);
  });

  it('an unknown day is a normal run', () => {
    const sim = new Sim({ seed: 3, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT }, quickStart: 13 });
    expect(sim.s.day).toBe(1);
    expect(sim.s.meta.quickStart).toBe(0);
  });

  it('does not repeat the tips for days that were skipped', () => {
    const sim = new Sim({ seed: 3, difficulty: 'medium', names: ['A'], tuning: { ...TUNING_DEFAULT }, quickStart: 20 });
    expect(sim.s.meta.newTipTypes).toEqual([]);
  });
});

describe('experiment switches', () => {
  it('every switch has a default among its options', () => {
    for (const f of FLAG_DEFS) expect(f.options.map((o) => o.value)).toContain(f.value);
    expect(FLAG_DEFS.map((f) => f.id)).toContain('cauldron');
  });

  it('old settings and unknown values fall back to the default', () => {
    expect(cleanFlags({ cauldron: 'sideways', nonsense: 'x' })).toEqual(defaultFlags());
    expect(cleanFlags(undefined)).toEqual(defaultFlags());
    expect(cleanFlags({ cauldron: 'back' }).cauldron).toBe('back');
  });

  it('are part of the shared game state, so the guest gets the host values', () => {
    const sim = battle();
    const rev = sim.s.meta.rev;
    sim.setFlags({ cauldron: 'back' });
    expect(sim.flag('cauldron')).toBe('back');
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
