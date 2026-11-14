/**
 * The three game modes: what run each builds (rules, loadout, last day), what a finished run pays
 * into the profile, and where the game goes next.
 */
import { describe, expect, it } from 'vitest';
import { SLOT_COUNT } from '../../src/config/slots';
import { activeWeapons } from '../../src/config/weapons';
import { levelOf, worldById } from '../../src/config/worlds';
import { CAMPAIGN, ENDLESS, TUTORIAL, completeTutorial, type RunEnv } from '../../src/modes';
import type { Profile } from '../../src/profile';
import { emptyStats, type RunResult, type RunRules } from '../../src/sim/rules';
import { newProfile } from './helpers';

const W = 'fondue';
const env = (names = ['A'], handTiers = names.map(() => 1)): RunEnv => ({ names, fieldW: 1280, handTiers });

function result(rules: RunRules, won: boolean, extra: Partial<RunResult> = {}): RunResult {
  return { runId: rules.runId, won, devRun: false, names: ['A'], day: rules.lastDay ?? 1, score: 1000, kills: 10, stats: emptyStats(), ...extra };
}

/** Wins every level up to and including `level` in the profile, as the reward would. */
async function profileAt(level: number): Promise<Profile> {
  const p = await newProfile();
  for (let l = 1; l <= level; l++) {
    const setup = CAMPAIGN.buildRun(p, { world: W, level: l }, env());
    CAMPAIGN.reward(result(setup.rules, true), setup.rules, p, 'solo');
  }
  return p;
}

describe('tutorial mode', () => {
  it('builds a one-day prelude for one player: no market, no slots, a gate that cannot fall', async () => {
    const p = await newProfile();
    const setup = TUTORIAL.buildRun(p, { world: W }, env(['A', 'B']));
    expect(setup.rules.mode).toBe('tutorial');
    expect(setup.rules.lastDay).toBe(1);
    expect(setup.rules.players).toBe(1);
    expect(setup.names).toEqual(['A']);
    expect(setup.rules.gateCannotFall).toBe(true);
    expect(setup.rules.hasMarket).toBe(false);
    expect(setup.rules.slotsOpen.every((open) => !open)).toBe(true);
    expect(setup.start.loadout.slotWeapon.every((w) => w === null)).toBe(true);
  });

  it('pays nothing, marks the tutorial as done and leads into level 1', async () => {
    const p = await newProfile();
    const setup = TUTORIAL.buildRun(p, { world: W }, env());
    const reward = TUTORIAL.reward(result(setup.rules, true), setup.rules, p);
    expect(reward.counted).toBe(false);
    expect(reward.cheese).toBe(0);
    expect(p.data.wallet.cheese).toBe(0);
    expect(p.data.seen.tutorial).toBe(true);
    // C4: after the prelude the profile owns exactly the Rolling Wheel, worn in the damage slot.
    expect(Object.keys(p.data.keep.weapons)).toEqual(['wheel']);
    expect(p.data.keep.loadout[0]).toBe('wheel');
    expect(TUTORIAL.next(result(setup.rules, true), setup.rules)).toEqual({ to: 'level', world: W, level: 1 });
  });
});

describe('campaign mode: building a run', () => {
  it('ends on the level\'s last day and starts with the permanent keep at its lasting tiers', async () => {
    const p = await newProfile();
    completeTutorial(p, W);
    p.setWeaponTier('wheel', 3);
    const level = levelOf(W, 5)!;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 5 }, env(['A'], [2]));
    expect(setup.rules.lastDay).toBe(level.days.length);
    expect(setup.rules.weapons.wheel).toEqual({ offered: true, fixedTier: 3 });
    for (const w of activeWeapons().filter((x) => x.id !== 'wheel')) expect(setup.rules.weapons[w.id].offered).toBe(false);
    expect(setup.rules.slotsOpen).toEqual(Array.from({ length: SLOT_COUNT }, (_, i) => i === 0));
    expect(setup.rules.tierUpgrades).toBe(false);
    expect(setup.rules.handBuyable).toBe(false);
    expect(setup.rules.handStart).toEqual([2]);
    expect(setup.start.loadout.slotWeapon[0]).toBe('wheel');
    expect(setup.start.loadout.weaponTier.wheel).toBe(3);
    expect(setup.start.day).toBe(1);
    expect(setup.start.gold).toBe(level.startGold);
    expect(setup.devRun).toBe(false);
  });

  it('plays the same every attempt: the seed comes from the level', async () => {
    const p = await newProfile();
    const a = CAMPAIGN.buildRun(p, { world: W, level: 3 }, env());
    const b = CAMPAIGN.buildRun(p, { world: W, level: 3 }, env());
    expect(a.seed).toBe(b.seed);
    expect(a.rules.runId).not.toBe(b.rules.runId);
  });

  it('a developer jump to a later day is clamped to the last day and counts as a developer run', async () => {
    const p = await newProfile();
    const days = levelOf(W, 2)!.days.length;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 2, day: 99 }, env());
    expect(setup.start.day).toBe(days);
    expect(setup.devRun).toBe(true);
  });

  it('a level opens only when the one before it is won', async () => {
    const p = await newProfile();
    expect(CAMPAIGN.canPlay(p, W, 1)).toBe(true);
    expect(CAMPAIGN.canPlay(p, W, 2)).toBe(false);
    expect(CAMPAIGN.nextLevel(p, W)).toBe(1);
    const won = await profileAt(1);
    expect(CAMPAIGN.canPlay(won, W, 2)).toBe(true);
    expect(CAMPAIGN.nextLevel(won, W)).toBe(2);
  });
});

describe('campaign mode: reward', () => {
  it('the first win pays the win cheese, marks it done, brings its unlocks and offers the next level', async () => {
    const p = await newProfile();
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const reward = CAMPAIGN.reward(result(setup.rules, true), setup.rules, p, 'solo');
    const level = levelOf(W, 1)!;
    expect(reward.counted).toBe(true);
    expect(reward.firstWin).toBe(true);
    expect(level).toBeDefined();
    expect(reward.cheese).toBe(1);
    expect(p.data.wallet.cheese).toBe(1);
    expect(p.isLevelDone(W, 1)).toBe(true);
    expect(reward.nextLevel).toBe(2);
    expect(reward.unlocks).toEqual(worldById(W).unlocks.filter((u) => u.level === 1));
  });

  it('paying the same run twice pays nothing the second time', async () => {
    const p = await newProfile();
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const r = result(setup.rules, true);
    CAMPAIGN.reward(r, setup.rules, p, 'solo');
    const cheese = p.data.wallet.cheese;
    const again = CAMPAIGN.reward(r, setup.rules, p, 'solo');
    expect(again.counted).toBe(false);
    expect(p.data.wallet.cheese).toBe(cheese);
  });

  it('winning a level again pays no cheese a second time', async () => {
    const p = await profileAt(1);
    const cheese = p.data.wallet.cheese;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const reward = CAMPAIGN.reward(result(setup.rules, true), setup.rules, p, 'solo');
    expect(reward.firstWin).toBe(false);
    expect(reward.cheese).toBe(0);
    expect(p.data.wallet.cheese).toBe(cheese);
  });

  it('a lost run and a developer run pay nothing', async () => {
    const p = await newProfile();
    const lost = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    expect(CAMPAIGN.reward(result(lost.rules, false), lost.rules, p, 'solo').counted).toBe(false);
    const dev = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    expect(CAMPAIGN.reward(result(dev.rules, true, { devRun: true }), dev.rules, p, 'solo').counted).toBe(false);
    expect(p.data.wallet.cheese).toBe(0);
    expect(p.isLevelDone(W, 1)).toBe(false);
  });

  it('a co-op guest gets no cheese and no level progress (cheese and progress belong to the host)', async () => {
    const host = await newProfile();
    const guest = await newProfile();
    const setup = CAMPAIGN.buildRun(host, { world: W, level: 10 }, env(['A', 'B']));
    const first = CAMPAIGN.reward(result(setup.rules, true), setup.rules, guest, 'guest');
    expect(first.counted).toBe(true);
    expect(first.cheese).toBe(0);
    expect(guest.data.wallet.cheese).toBe(0);
    expect(guest.highestLevelDone(W)).toBe(0);
  });

  it('the last level offers no next level, and every campaign run goes back to the lobby', async () => {
    const p = await newProfile();
    const last = worldById(W).campaign.length;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: last }, env());
    const r = result(setup.rules, true);
    expect(CAMPAIGN.reward(r, setup.rules, p, 'solo').nextLevel).toBeNull();
    expect(CAMPAIGN.next()).toEqual({ to: 'lobby' });
  });
});

describe('endless mode', () => {
  it('never ends, upgrades during the run, and offers every weapon and slot from the start', async () => {
    const p = await newProfile();
    const setup = ENDLESS.buildRun(p, { world: W, difficulty: 'hard' }, env());
    expect(setup.rules.lastDay).toBeNull();
    expect(setup.rules.difficulty).toBe('hard');
    expect(setup.rules.tierUpgrades).toBe(true);
    expect(setup.rules.handBuyable).toBe(true);
    for (const w of activeWeapons()) expect(setup.rules.weapons[w.id]).toEqual({ offered: true, fixedTier: null });
    expect(setup.rules.slotsOpen.every((open) => open)).toBe(true);
    expect(setup.start.day).toBe(1);
    expect(setup.devRun).toBe(false);
    expect(ENDLESS.isAvailable(p, W)).toBe(true);
  });

  it('the developer menu\'s free day starts a developer run on that day; belongings come from the latest quick start before it', async () => {
    const p = await newProfile();
    const late = ENDLESS.buildRun(p, { world: W, devDay: 45 }, env());
    expect(late.start.day).toBe(45);
    expect(late.devRun).toBe(true);
    expect(late.start.loadout.slotWeapon.some((w) => w !== null)).toBe(true);
    const early = ENDLESS.buildRun(p, { world: W, devDay: 5 }, env());
    expect(early.start.day).toBe(5);
    expect(early.devRun).toBe(true);
    expect(early.start.loadout.slotWeapon.every((w) => w === null)).toBe(true);
    expect(ENDLESS.buildRun(p, { world: W, devDay: 500 }, env()).start.day).toBe(99);
  });

  it('pays no cheese, remembers the best wave and adds the run to the score list', async () => {
    const p = await newProfile();
    const run = (daysCleared: number) => {
      const setup = ENDLESS.buildRun(p, { world: W, difficulty: 'medium' }, env());
      const stats = { ...emptyStats(), daysCleared };
      return ENDLESS.reward(result(setup.rules, false, { stats, day: daysCleared + 1 }), setup.rules, p, 'solo');
    };
    const first = run(5);
    expect(first.counted).toBe(true);
    expect(first.cheese).toBe(0);
    expect(run(5).cheese).toBe(0);
    run(10);
    expect(p.data.wallet.cheese).toBe(0);
    expect(p.data.worlds[W].endlessBest.medium).toBe(11);
    expect(p.scores(W)).toHaveLength(3);
    expect(p.scores(W)[0].mode).toBe('endless');
  });

  it('a developer run pays nothing and stays off the score list; endless leads back to the lobby', async () => {
    const p = await newProfile();
    const setup = ENDLESS.buildRun(p, { world: W }, env());
    const reward = ENDLESS.reward(result(setup.rules, false, { devRun: true, stats: { ...emptyStats(), daysCleared: 30 } }), setup.rules, p, 'solo');
    expect(reward.counted).toBe(false);
    expect(p.data.wallet.cheese).toBe(0);
    expect(p.scores(W)).toHaveLength(0);
    expect(ENDLESS.next()).toEqual({ to: 'lobby' });
  });
});
