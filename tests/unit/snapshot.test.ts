import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from '../../src/net/snapshot';
import { battleSim } from './helpers';

// Two players with two hands each can hold one raider with up to four hands at once (C8, C9).
describe('snapshot holders', () => {
  it('carries all four holders of one raider to the guest', () => {
    const sim = battleSim();
    const e = sim.spawnEnemy('grunt', 700);
    e.heldBy = [0, 1, 2, 3];
    e.hp = e.maxHp / 2;
    const view = decodeSnapshot(JSON.parse(JSON.stringify(encodeSnapshot(sim.s))));
    expect(view.enemies[0].heldBy).toEqual([0, 1, 2, 3]);
    expect(view.enemies[0].hpFrac).toBe(0.5);
    expect(view.enemies[0].type).toBe('grunt');
  });

  it('keeps one, three or no holders exactly', () => {
    const sim = battleSim();
    const a = sim.spawnEnemy('grunt', 600);
    const b = sim.spawnEnemy('grunt', 650);
    const c = sim.spawnEnemy('grunt', 700);
    a.heldBy = [2];
    b.heldBy = [3, 0, 1];
    c.heldBy = [];
    const view = decodeSnapshot(encodeSnapshot(sim.s));
    const byId = new Map(view.enemies.map((v) => [v.id, v]));
    expect(byId.get(a.id)?.heldBy).toEqual([2]);
    expect(byId.get(b.id)?.heldBy).toEqual([3, 0, 1]);
    expect(byId.get(c.id)?.heldBy).toEqual([]);
    expect(byId.get(c.id)?.hpFrac).toBe(1);
  });
});
