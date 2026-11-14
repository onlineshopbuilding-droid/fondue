/**
 * How a run ends and what it counted: clearing the last wave wins, a fallen gate loses, and the
 * statistics of the run travel in the result.
 */
import { describe, expect, it } from 'vitest';
import { arm, battleSim, clearWave, eventsOf, fire, firedOk, flingUp, makeSim, place, runUntil, toBattle, wave } from './helpers';

const WAVES2 = [wave(1, 1, 2), wave(1, 1, 2)];

/** Clears the field wave after wave until the run is over or the ticks run out. */
function clearAll(sim: ReturnType<typeof makeSim>, maxTicks = 3000) {
  for (let i = 0; i < maxTicks && sim.s.phase !== 'runWon' && sim.s.phase !== 'gameover'; i++) {
    clearWave(sim);
    sim.step();
  }
}

describe('win state', () => {
  it('clearing the last wave ends the run as won, with a result', () => {
    const sim = makeSim({ waves: [wave(1, 1, 2)] });
    expect(sim.rules.lastWave).toBe(1);
    expect(sim.s.meta.result).toBeNull();
    clearAll(sim);
    expect(sim.s.phase).toBe('runWon');
    const result = sim.s.meta.result!;
    expect(result.won).toBe(true);
    expect(result.runId).toBe(sim.rules.runId);
    expect(result.wave).toBe(1);
    expect(result.stats.wavesCleared).toBe(1);
  });

  it('a wave before the last one leads to the next wave, not to the end', () => {
    const sim = makeSim({ waves: WAVES2 });
    const ev = runUntil(sim, () => sim.s.wave === 2, 2000);
    expect(eventsOf(ev, 'waveStart').map((e) => e.wave)).toContain(2);
    expect(sim.s.meta.result).toBeNull();
    expect(sim.s.phase).not.toBe('runWon');
    clearAll(sim);
    expect(sim.s.phase).toBe('runWon');
    expect(sim.s.meta.result!.stats.wavesCleared).toBe(2);
  });

  it('a run without a last wave never ends by surviving', () => {
    const sim = makeSim({ waves: WAVES2, rules: { lastWave: null } });
    expect(sim.rules.lastWave).toBeNull();
    for (let i = 0; i < 1200; i++) { clearWave(sim); sim.step(); }
    expect(sim.s.phase).toBe('battle');
    expect(sim.s.wave).toBeGreaterThan(2);
    expect(sim.s.meta.result).toBeNull();
  });

  it('a fallen gate ends the run as lost', () => {
    const sim = makeSim({ waves: [wave(3), wave(3), wave(3)] });
    toBattle(sim);
    sim.s.gateHp = 0;
    const ev = runUntil(sim, () => sim.s.phase === 'gameover', 1000);
    expect(eventsOf(ev, 'defeat')).toHaveLength(1);
    expect(sim.s.phase).toBe('gameover');
    expect(sim.s.meta.result!.won).toBe(false);
    expect(sim.s.meta.result!.stats.wavesCleared).toBe(0);
  });

  it('a developer run says so in its result', () => {
    const sim = makeSim({ waves: [wave(1, 1, 2)], devRun: true });
    clearAll(sim);
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
    expect(st.crestsEarned).toBe(0);
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
    const sim = makeSim({ waves: [wave(1, 1, 2)] });
    clearAll(sim);
    const result = sim.s.meta.result!;
    sim.s.stats.kills += 5;
    expect(result.stats.kills).not.toBe(sim.s.stats.kills);
  });
});
