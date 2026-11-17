/**
 * The course of a level (src/sim/waveFlow.ts): banner, waves, the never-quiet rule, the win, the
 * fall of the gate, resuming at a wave, where raiders step in, and the money rules of a run
 * (cauldron, crests, co-op gold). Replaces the market tests of the old shop.test.ts: a run keeps
 * the keep it was given and nothing can be bought in it.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { CRESTS } from '../../src/config/crests';
import { ECONOMY } from '../../src/config/economy';
import { ENEMIES, GRAB_SPEED_BONUS } from '../../src/config/enemies';
import { DT } from '../../src/config/field';
import { COOP, WAVES } from '../../src/config/waves';
import { grabBonus } from '../../src/sim/physics';
import { Sim } from '../../src/sim/sim';
import type { Command, SimEvent } from '../../src/sim/types';
import { battleSim, clearWave, eventsOf, makeSetup, makeSim, place, runFor, runUntil, toBattle, wave } from './helpers';

describe('level start', () => {
  it('shows a short banner while the first raiders already walk, then the fight', () => {
    const sim = makeSim({ waves: [wave(3, 2, 3)] });
    expect(sim.s.phase).toBe('banner');
    expect(sim.s.wave).toBe(1);
    let ticks = 0;
    let walked = false;
    while (sim.s.phase === 'banner' && ticks < 500) {
      const e = sim.s.enemies[0];
      const x = e?.x;
      sim.step();
      ticks++;
      if (e && x !== undefined && e.x < x) walked = true;
    }
    expect(sim.s.phase).toBe('battle');
    expect(ticks * DT).toBeCloseTo(WAVES.bannerSeconds, 1);
    expect(walked).toBe(true);
  });
});

describe('wave flow', () => {
  it('the next wave starts once the pause after a wave is over, even with raiders still alive', () => {
    const sim = makeSim({ waves: [wave(1, 1, 3), wave(1, 1, 3)] });
    runUntil(sim, () => sim.s.waveDone, 2000);
    expect(sim.s.wave).toBe(1);
    expect(sim.s.enemies.length).toBeGreaterThan(0);
    const t0 = sim.s.runT;
    const ev = runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(sim.s.runT - t0).toBeCloseTo(3, 1);
    expect(eventsOf(ev, 'waveStart')).toEqual([{ e: 'waveStart', wave: 2 }]);
  });

  it('the next wave starts at most 1.5 s after the field is empty, long before the pause is over', () => {
    const sim = makeSim({ waves: [wave(1, 1, 20), wave(1, 1, 20)] });
    runUntil(sim, () => sim.s.waveDone, 2000);
    sim.s.enemies = [];
    const t0 = sim.s.runT;
    runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(sim.s.runT - t0).toBeLessThanOrEqual(WAVES.clearDelay + DT * 1.5);
  });

  it('an empty field brings the next arrival of a wave early', () => {
    const sim = makeSim({ waves: [{ counts: { grunt: 6 }, spawnSeconds: 30, packs: 2, pauseAfter: 3 }] });
    toBattle(sim);
    runUntil(sim, () => sim.s.spawned > 0, 600);
    const late = sim.s.spawnQueue[sim.s.spawnQueue.length - 1].t;
    expect(late).toBeGreaterThan(10);
    // Keep the field empty: the rest of the wave must come long before its planned times.
    const t0 = sim.s.runT;
    for (let i = 0; i < 60 * 12 && sim.s.spawned < sim.s.spawnQueue.length; i++) { sim.s.enemies = []; sim.step(); }
    expect(sim.s.spawned).toBe(sim.s.spawnQueue.length);
    expect(sim.s.runT - t0).toBeLessThan(late / 2);
  });

  it('a level is never more than 5 s without a living raider (B2), with a player who kills at once', () => {
    const sim = makeSim({ waves: [wave(3, 3, 4), wave(4, 4, 4), wave(2, 2, 2)] });
    let quiet = 0;
    let longest = 0;
    for (let i = 0; i < 60 * 120 && sim.s.phase !== 'runWon'; i++) {
      // The scripted player kills every raider the moment it can be seen.
      for (const e of sim.s.enemies) if (!e.dead && e.x <= sim.s.meta.viewRight) sim.hurt(e, 1e6, 'impact', 0);
      sim.step();
      quiet = sim.s.enemies.some((e) => !e.dead) ? 0 : quiet + DT;
      longest = Math.max(longest, quiet);
    }
    expect(sim.s.phase).toBe('runWon');
    expect(longest).toBeLessThanOrEqual(WAVES.maxQuietSeconds);
    expect(sim.s.stats.kills).toBe(9);
  });

  it('the run is won only after the last wave has fully arrived and nobody is left', () => {
    const sim = makeSim({ waves: [wave(1, 1, 2), wave(2, 1, 2)] });
    toBattle(sim);
    // An empty field during wave 1 is no win.
    runUntil(sim, () => sim.s.waveDone, 2000);
    sim.s.enemies = [];
    runUntil(sim, () => sim.s.wave === 2, 200);
    expect(sim.s.phase).toBe('battle');
    // The last wave has arrived, one raider still stands: no win yet.
    runUntil(sim, () => sim.s.waveDone, 2000);
    const left = sim.s.enemies.find((e) => !e.dead)!;
    sim.s.enemies = [left];
    runFor(sim, 1);
    expect(sim.s.phase).toBe('battle');
    expect(sim.s.meta.result).toBeNull();
    sim.hurt(left, 1e6, 'impact', 0);
    const ev = runUntil(sim, () => sim.s.phase === 'runWon', 10);
    expect(sim.s.phase).toBe('runWon');
    expect(eventsOf(ev, 'runWon')).toHaveLength(1);
    expect(sim.s.meta.result!.won).toBe(true);
  });

  it('a fallen gate shows the defeat, then the run is over and lost', () => {
    const sim = makeSim({ waves: [wave(3), wave(3)] });
    toBattle(sim);
    sim.s.gateHp = 0;
    sim.step();
    expect(sim.s.phase).toBe('defeat');
    expect(sim.s.meta.result).toBeNull();
    let ticks = 0;
    while (sim.s.phase === 'defeat' && ticks < 1000) { sim.step(); ticks++; }
    expect(sim.s.phase).toBe('gameover');
    expect(ticks * DT).toBeCloseTo(WAVES.endBannerSeconds, 1);
    expect(sim.s.meta.result!.won).toBe(false);
    // Nothing moves any more.
    const tick = sim.s.tick;
    runFor(sim, 1);
    expect(sim.s.phase).toBe('gameover');
    expect(sim.s.tick).toBe(tick + 60);
  });
});

describe('resuming at a wave', () => {
  it('a Sim built from the wave-start save starts at that wave with its gate, gold and statistics', () => {
    const waves = [wave(2, 1, 2), wave(3, 2, 2), wave(3, 2, 2)];
    const sim = makeSim({ waves, seed: 9 });
    runUntil(sim, () => sim.s.waveDone, 2000);
    sim.s.gateHp = 123;
    sim.s.gold = 77;
    sim.s.stats.kills = 5;
    sim.s.stats.throws = 4;
    let save = sim.waveStartSave();
    runUntil(sim, () => {
      if (sim.s.wave !== 2) return false;
      save = sim.waveStartSave();
      return true;
    }, 2000);
    expect(save.wave).toBe(2);
    const queue = JSON.parse(JSON.stringify(sim.s.spawnQueue));

    const back = new Sim({ ...makeSetup({ waves, seed: 9 }), start: save });
    expect(back.s.wave).toBe(2);
    expect(back.s.gateHp).toBe(123);
    expect(back.s.gold).toBe(77);
    expect(back.s.stats.kills).toBe(5);
    expect(back.s.stats.throws).toBe(4);
    expect(back.s.stats).toEqual(save.stats);
    expect(back.loadout).toEqual(save.loadout);
    // The planner is pure: the resumed wave brings the same raiders at the same times.
    expect(back.s.spawnQueue).toEqual(queue);
  });
});

describe('where raiders step in', () => {
  it('at the visible right edge: on a wide field seen only in part, the first raider is on screen within 2 s', () => {
    const viewRight = 1280;
    const sim = new Sim({ ...makeSetup({ fieldW: 1760, waves: [wave(2, 2, 3)] }), viewRight });
    expect(sim.s.meta.fieldW).toBe(1760);
    expect(sim.s.meta.viewRight).toBe(viewRight);
    let seen = -1;
    for (let i = 0; i < 60 * 4 && seen < 0; i++) {
      sim.step();
      if (sim.s.enemies.some((e) => e.x <= viewRight)) seen = sim.s.runT;
    }
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThanOrEqual(2);
  });
});

describe('grabbing fast raiders', () => {
  it('a fast raider on the move can be caught a little further away than one standing still', () => {
    const type = 'goatRider';
    expect(ENEMIES[type].speed).toBeGreaterThan(GRAB_SPEED_BONUS.from);
    const bonus = grabBonus(type, 'walk');
    expect(bonus).toBeGreaterThan(10);
    expect(bonus).toBeLessThanOrEqual(GRAB_SPEED_BONUS.max);
    expect(grabBonus(type, 'stun')).toBe(0);
    expect(grabBonus('grunt', 'walk')).toBeLessThan(bonus);

    const tryAt = (st: 'walk' | 'stun') => {
      const sim = battleSim();
      const e = place(sim, type, 900);
      e.st = st;
      // Just outside the plain grab reach, inside the reach with the bonus.
      const x = e.x + ENEMIES[type].radius + sim.tuning.grabRadius + bonus / 2;
      const y = e.y - ENEMIES[type].height * 0.5;
      sim.setHand(0, x, y);
      sim.command({ k: 'press', p: 0, x, y });
      return e.heldBy.includes(0);
    };
    expect(tryAt('walk')).toBe(true);
    expect(tryAt('stun')).toBe(false);
  });
});

describe('gold and crests of a run', () => {
  const deathGold = (ev: SimEvent[]) => eventsOf(ev, 'death')[0].gold;

  it('the Great Cauldron pays double gold', () => {
    const plain = battleSim();
    plain.hurt(place(plain, 'grunt'), 1e6, 'impact', 0);
    const usual = deathGold(plain.drainEvents());
    expect(usual).toBe(ENEMIES.grunt.gold);

    const sim = battleSim();
    sim.loadout.stations.cauldron = true;
    const e = place(sim, 'grunt');
    sim.enterPot(e);
    const ev = runUntil(sim, () => e.dead, 600);
    expect(eventsOf(ev, 'death')[0].cause).toBe('cauldron');
    expect(deathGold(ev)).toBe(usual * ECONOMY.cauldronGoldFactor);
    expect(sim.s.gold).toBe(usual * ECONOMY.cauldronGoldFactor);
  });

  it('the eagle leaves crests, but never more than the limit of one run', () => {
    const sim = battleSim();
    for (let i = 0; i < 10; i++) sim.ctx.combat.kill(place(sim, 'yeti'), 'eagle', 0);
    expect(sim.s.crests).toBe(CRESTS.perRun);
    expect(sim.s.stats.crestsEarned).toBe(CRESTS.perRun);
    const ev = sim.drainEvents();
    expect(eventsOf(ev, 'crest').reduce((n, c) => n + c.amount, 0)).toBe(CRESTS.perRun);
  });

  it('crests already earned before a resumed wave count toward the limit', () => {
    const setup = makeSetup();
    const sim = new Sim({ ...setup, start: { ...setup.start, stats: { ...setup.start.stats, crestsEarned: CRESTS.perRun - 1 } } });
    toBattle(sim);
    sim.freezeWaves();
    sim.ctx.combat.kill(place(sim, 'yeti'), 'eagle', 0);
    expect(sim.s.crests).toBe(CRESTS.perRun);
  });

  it('in co-op a kill pays 60 % of its gold', () => {
    const solo = battleSim();
    solo.hurt(place(solo, 'goatRider'), 1e6, 'impact', 0);
    const coop = battleSim({ names: ['A', 'B'] });
    coop.hurt(place(coop, 'goatRider'), 1e6, 'impact', 1);
    const one = deathGold(solo.drainEvents());
    const two = deathGold(coop.drainEvents());
    expect(COOP.goldPerKill).toBe(0.6);
    expect(two).toBe(Math.round(one * COOP.goldPerKill));
    expect(coop.s.gold).toBe(two);
  });
});

describe('the keep in a run', () => {
  it('there is no buy command: an unknown command does nothing', () => {
    expectTypeOf<Extract<Command['k'], 'buy'>>().toBeNever();
    expectTypeOf<Extract<SimEvent['e'], 'buy'>>().toBeNever();
    const sim = battleSim({ gold: 1e6 });
    const before = JSON.stringify({ loadout: sim.loadout, gold: sim.s.gold, gate: sim.s.gateMax });
    // @ts-expect-error: nothing is bought during a run
    sim.command({ k: 'buy', p: 0, item: 'gate' });
    expect(sim.drainEvents()).toEqual([]);
    expect(JSON.stringify({ loadout: sim.loadout, gold: sim.s.gold, gate: sim.s.gateMax })).toBe(before);
    expect('quote' in sim).toBe(false);
  });

  it('the loadout stays what the setup gave, through every wave to the end', () => {
    const setup = makeSetup({ waves: [wave(2, 1, 2), wave(2, 1, 2)], loadout: { gateTier: 1, slotWeapon: ['wheel', null, null, null, null], weaponTier: { wheel: 2 } } });
    const given = JSON.parse(JSON.stringify(setup.start.loadout));
    const sim = new Sim(setup);
    for (let i = 0; i < 60 * 60 && sim.s.phase !== 'runWon'; i++) { clearWave(sim); sim.step(); }
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.wave).toBe(2);
    expect(sim.loadout).toEqual(given);
    expect(sim.s.meta.loadout).toEqual(given);
  });
});
