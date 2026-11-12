/**
 * How a run ends and what it counted: surviving the last day wins, a fallen gate loses, and the
 * statistics of the run travel in the result.
 */
import { describe, expect, it } from 'vitest';
import { arm, battleSim, eventsOf, fire, firedOk, flingUp, makeSim, place, runUntil, skipToMarket, toBattle } from './helpers';

const DAYS = [{ counts: { grunt: 1 } }, { counts: { grunt: 1 } }];

describe('win state', () => {
  it('surviving the last day ends the run as won, with a result', () => {
    const sim = makeSim({ rules: { lastDay: 1 }, days: DAYS });
    expect(sim.s.meta.result).toBeNull();
    skipToMarket(sim);
    expect(sim.s.phase).toBe('runWon');
    const result = sim.s.meta.result!;
    expect(result.won).toBe(true);
    expect(result.runId).toBe(sim.rules.runId);
    expect(result.day).toBe(1);
    expect(result.stats.daysCleared).toBe(1);
  });

  it('a day before the last one leads to the market, not to the end', () => {
    const sim = makeSim({ rules: { lastDay: 2 }, days: DAYS });
    skipToMarket(sim);
    expect(sim.s.phase).toBe('intermission');
    expect(sim.s.meta.result).toBeNull();
    sim.command({ k: 'forceStart', p: 0 });
    skipToMarket(sim);
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.meta.result!.stats.daysCleared).toBe(2);
  });

  it('a run without a last day never ends by surviving', () => {
    const sim = makeSim({ days: DAYS });
    expect(sim.rules.lastDay).toBeNull();
    skipToMarket(sim);
    expect(sim.s.phase).toBe('intermission');
  });

  it('a fallen gate ends the run as lost', () => {
    const sim = makeSim({ rules: { lastDay: 3 }, days: DAYS });
    toBattle(sim);
    sim.s.gateHp = 0;
    const ev = runUntil(sim, () => sim.s.phase === 'gameover', 1000);
    expect(eventsOf(ev, 'defeat')).toHaveLength(1);
    expect(sim.s.phase).toBe('gameover');
    expect(sim.s.meta.result!.won).toBe(false);
    expect(sim.s.meta.result!.stats.daysCleared).toBe(0);
  });

  it('a developer run says so in its result', () => {
    const sim = makeSim({ rules: { lastDay: 1 }, days: DAYS, devRun: true });
    skipToMarket(sim);
    expect(sim.s.meta.result!.devRun).toBe(true);
  });
});

describe('run statistics', () => {
  it('a thrown kill counts as a throw, a kill of its type and cause, and the gold it paid', () => {
    const sim = battleSim();
    const e = place(sim, 'grunt');
    flingUp(sim, e, 1500);
    runUntil(sim, () => e.dead);
    const st = sim.s.stats;
    expect(st.throws).toBe(1);
    expect(st.kills).toBe(1);
    expect(st.killsByType.grunt).toBe(1);
    expect(st.killsByCause.impact).toBe(1);
    expect(st.goldEarned).toBe(sim.s.gold);
    expect(st.offerings).toBe(0);
  });

  it('weapon shots are counted per weapon, and gate damage adds up', () => {
    const sim = battleSim();
    place(sim, 'grunt', 900);
    const slot = arm(sim, 'wheel');
    expect(firedOk(fire(sim, slot))).toBe(true);
    expect(sim.s.stats.weaponShots.wheel).toBe(1);
    const before = sim.s.gateHp;
    sim.ctx.combat.damageGate(10, 100, 500, 'grunt');
    expect(sim.s.stats.gateDamage).toBeGreaterThan(0);
    expect(sim.s.stats.gateDamage).toBeCloseTo(before - sim.s.gateHp);
  });

  it('the result keeps its own copy of the statistics', () => {
    const sim = makeSim({ rules: { lastDay: 1 }, days: DAYS });
    skipToMarket(sim);
    const result = sim.s.meta.result!;
    sim.s.stats.kills += 5;
    expect(result.stats.kills).not.toBe(sim.s.stats.kills);
  });
});
