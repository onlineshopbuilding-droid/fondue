import { describe, expect, it } from 'vitest';
import { ENEMIES, type EnemyType } from '../../src/config/enemies';
import { SLOTS } from '../../src/config/slots';
import { FIRST_UPGRADE } from '../../src/config/tutorial';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import {
  BOSSES, ENEMY_POPUPS, FIRST_UPGRADE_LINES, FIRST_WIN_LINES, KING_LOBBY_LINES, LEVEL_STORY, PRELUDE_LINES, SLOT_INTROS, STATION_INTROS, TUTORIAL_HINTS,
} from '../../src/config/worlds/fondue/story';
import { buy, quote, TUTORIAL } from '../../src/modes';
import { PRELUDE_WHEEL_SLOT, finishFirstUpgrade, firstUpgradeDue, markIntroSeen, pendingIntros, shopAfterWin } from '../../src/modes/tutorial';
import type { Profile } from '../../src/profile';
import type { RunResult } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';
import type { SimEvent } from '../../src/sim/types';
import { newProfile } from './helpers';

const W = DEFAULT_WORLD;
const env = { names: ['Tester'], fieldW: 1280, handTiers: [1] };

/** Plays the prelude's reward on a profile, as the game does at the end of the prelude. */
function finishPrelude(p: Profile) {
  const setup = TUTORIAL.buildRun(p, { world: W }, env);
  const result: RunResult = { runId: setup.rules.runId, won: true, devRun: false, names: ['Tester'], wave: 1, score: 0, kills: 13, gateShare: 1, stats: setup.start.stats };
  TUTORIAL.reward(result, setup.rules, p);
  return { setup, result };
}

describe('prelude: the Rolling Wheel from the first second (C4, D4)', () => {
  it('stands in the damage slot of the prelude and fires on a tap', async () => {
    const p = await newProfile();
    const setup = TUTORIAL.buildRun(p, { world: W }, env);
    expect(SLOTS[PRELUDE_WHEEL_SLOT].role).toBe('damage');
    expect(setup.rules.slotsOpen.filter(Boolean)).toHaveLength(1);
    expect(setup.rules.slotsOpen[PRELUDE_WHEEL_SLOT]).toBe(true);
    expect(setup.start.loadout.slotWeapon).toEqual(SLOTS.map((_, i) => (i === PRELUDE_WHEEL_SLOT ? 'wheel' : null)));
    const sim = new Sim(setup);
    for (let i = 0; i < 2000 && sim.s.phase !== 'battle'; i++) sim.step();
    sim.drainEvents();
    sim.command({ k: 'fireSlot', p: 0, slot: PRELUDE_WHEEL_SLOT });
    const events: SimEvent[] = [];
    for (let i = 0; i < 5; i++) { sim.step(); events.push(...sim.drainEvents()); }
    expect(events.some((e) => e.e === 'fire' && e.slot === PRELUDE_WHEEL_SLOT && e.weapon === 'wheel')).toBe(true);
  });

  it('a fresh profile owns exactly the Rolling Wheel after the prelude, worn in the damage slot', async () => {
    const p = await newProfile();
    expect(Object.keys(p.data.keep.weapons)).toEqual([]);
    const { setup, result } = finishPrelude(p);
    expect(p.data.seen.tutorial).toBe(true);
    expect(Object.keys(p.data.keep.weapons)).toEqual(['wheel']);
    expect(p.data.keep.weapons.wheel.tier).toBe(1);
    expect(p.data.keep.loadout).toEqual(SLOTS.map((_, i) => (i === PRELUDE_WHEEL_SLOT ? 'wheel' : null)));
    expect(p.data.wallet).toEqual({ cheese: 0, gold: 0, crests: 0 });
    expect(TUTORIAL.next(result, setup.rules)).toEqual({ to: 'level', world: W, level: 1 });
  });
});

describe('the guided first upgrade after level 1 (D4)', () => {
  it('level 1 is short and pays enough gold for the first wheel upgrade', async () => {
    const lv = levelOf(W, 1)!;
    let gold = 0;
    for (const wave of lv.waves) for (const [t, n] of Object.entries(wave.counts)) gold += ENEMIES[t as EnemyType].gold * (n ?? 0);
    expect(lv.targetSeconds).toBeGreaterThanOrEqual(60);
    expect(lv.targetSeconds).toBeLessThanOrEqual(120);
    const p = await newProfile();
    finishPrelude(p);
    expect(gold).toBeGreaterThanOrEqual(quote(p, { kind: 'weapon', id: FIRST_UPGRADE.weapon }, W).price.gold);
  });

  it('is due after level 1 with the gold, leads from the win screen into the shop, and ends with the purchase', async () => {
    const p = await newProfile();
    finishPrelude(p);
    expect(firstUpgradeDue(p, W)).toBe(false);
    p.markLevelDone(W, 1);
    // Without the gold there is nothing to guide to.
    expect(firstUpgradeDue(p, W)).toBe(false);
    p.edit((d) => { d.wallet.gold = 420; return true; });
    expect(firstUpgradeDue(p, W)).toBe(true);
    expect(shopAfterWin(p, W, 1)).toBe(true);
    expect(shopAfterWin(p, W, 2)).toBe(false);
    expect(buy(p, { kind: 'weapon', id: 'wheel' }, W).allowed).toBe(true);
    expect(p.weaponTier('wheel')).toBe(2);
    expect(firstUpgradeDue(p, W)).toBe(false);
    expect(finishFirstUpgrade(p)).toBe(true);
    expect(finishFirstUpgrade(p)).toBe(false);
    // Once finished it never comes back, even with a tier 1 wheel and gold.
    p.setWeaponTier('wheel', 1);
    expect(firstUpgradeDue(p, W)).toBe(false);
  });
});

describe('introductions of slots and stations (C2)', () => {
  it('every slot and station has a King line, and the slot lines name their slot', () => {
    expect(SLOT_INTROS).toHaveLength(SLOTS.length);
    SLOTS.forEach((s, i) => expect(SLOT_INTROS[i]).toContain(`This is your ${s.name} slot.`));
    expect(STATION_INTROS.cauldron).toContain('Great Cauldron');
    expect(STATION_INTROS.perch).toContain('Eagle Perch');
  });

  it('a slot is introduced once, when it opens; stations when they can be unlocked', async () => {
    const p = await newProfile();
    finishPrelude(p);
    expect(pendingIntros(p, W)).toEqual([]);
    p.markLevelDone(W, 1);
    expect(pendingIntros(p, W)).toEqual([]);
    p.markLevelDone(W, 2);
    expect(pendingIntros(p, W)).toEqual([{ kind: 'slot', slot: 1 }]);
    expect(markIntroSeen(p, { kind: 'slot', slot: 1 })).toBe(true);
    expect(markIntroSeen(p, { kind: 'slot', slot: 1 })).toBe(false);
    expect(p.data.seen.slotIntros).toEqual([1]);
    expect(pendingIntros(p, W)).toEqual([]);
    for (let l = 3; l <= 16; l++) p.markLevelDone(W, l);
    expect(pendingIntros(p, W)).toEqual([{ kind: 'slot', slot: 2 }, { kind: 'slot', slot: 3 }, { kind: 'slot', slot: 4 }, { kind: 'station', station: 'cauldron' }]);
  });
});

describe('texts of the first minutes and the story (D3)', () => {
  const all = [
    ...PRELUDE_LINES, ...Object.values(TUTORIAL_HINTS), ...FIRST_WIN_LINES, ...Object.values(FIRST_UPGRADE_LINES),
    ...SLOT_INTROS, ...Object.values(STATION_INTROS), ...LEVEL_STORY, ...Object.values(BOSSES).map((b) => b.line),
    ...Object.values(ENEMY_POPUPS).map((e) => e.text), ...KING_LOBBY_LINES.map((l) => l.text),
    ...Array.from({ length: 100 }, (_, i) => levelOf(W, i + 1)!.challenges.map((c) => c.text)).flat(),
  ];

  it('say nothing of stars, markets, offerings, game days or clicks', () => {
    for (const t of all) {
      expect(t, t).not.toMatch(/\bstars?\b|market|offering|\bclick/i);
      expect(t, t).not.toMatch(/\bday \d|\bnext day|\bdays? (of|in) (the|this) level/i);
    }
  });

  it('challenge texts are short and say what counts', () => {
    for (let l = 1; l <= 100; l++) {
      for (const c of levelOf(W, l)!.challenges) {
        expect(c.text.length, c.text).toBeLessThanOrEqual(48);
        expect(c.text, c.text).toMatch(/^(Defeat|Throw|Let|Shake|Use|Fling) /);
      }
    }
  });
});
