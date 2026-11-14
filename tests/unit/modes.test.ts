/**
 * The three game modes: what run each builds (rules, loadout, last wave), what a finished run pays
 * into the profile, and where the game goes next. (Keep, gold and cheese in detail: campaignWaves.test.ts.)
 */
import { describe, expect, it } from 'vitest';
import { SLOT_COUNT } from '../../src/config/slots';
import { levelOf, worldById } from '../../src/config/worlds';
import { CAMPAIGN, ENDLESS, TUTORIAL, completeTutorial, type RunEnv } from '../../src/modes';
import type { Profile } from '../../src/profile';
import { emptyStats, type RunResult, type RunRules } from '../../src/sim/rules';
import { newProfile } from './helpers';

const W = 'fondue';
const env = (names = ['A'], handTiers = names.map(() => 1)): RunEnv => ({ names, fieldW: 1280, handTiers });

function result(rules: RunRules, won: boolean, extra: Partial<RunResult> = {}): RunResult {
  return { runId: rules.runId, won, devRun: false, names: ['A'], wave: rules.lastWave ?? 1, score: 1000, kills: 10, gateShare: 0.3, stats: emptyStats(), ...extra };
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
  it('builds a one-wave prelude for one player: only the damage slot with the free Rolling Wheel (C4), a gate that cannot fall', async () => {
    const p = await newProfile();
    const setup = TUTORIAL.buildRun(p, { world: W }, env(['A', 'B']));
    expect(setup.rules.mode).toBe('tutorial');
    expect(setup.rules.lastWave).toBe(1);
    expect(setup.rules.players).toBe(1);
    expect(setup.names).toEqual(['A']);
    expect(setup.rules.gateCannotFall).toBe(true);
    expect(setup.rules.slotsOpen).toEqual([true, false, false, false, false]);
    expect(setup.start.loadout.slotWeapon).toEqual(['wheel', null, null, null, null]);
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
  it('ends on the level\'s last wave and starts with the permanent keep at its lasting tiers', async () => {
    const p = await newProfile();
    completeTutorial(p, W);
    p.setWeaponTier('wheel', 3);
    const level = levelOf(W, 5)!;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 5 }, env(['A'], [2]));
    expect(setup.rules.lastWave).toBe(level.waves.length);
    expect(setup.rules.level).toBe(5);
    expect(setup.rules.maxAlive).toBe(level.maxAlive);
    expect(setup.rules.slotsOpen).toEqual(Array.from({ length: SLOT_COUNT }, (_, i) => i === 0));
    // Only what the profile owns and wears comes along; nothing is offered or bought in the run.
    expect(setup.start.loadout.slotWeapon).toEqual(['wheel', null, null, null, null]);
    expect(setup.start.loadout.weaponTier).toEqual({ wheel: 3 });
    expect(setup.start.loadout.handTier).toEqual([2]);
    expect(setup.start.wave).toBe(1);
    expect(setup.start.gold).toBe(0);
    expect(setup.devRun).toBe(false);
  });

  it('plays the same every attempt: the seed comes from the level', async () => {
    const p = await newProfile();
    const a = CAMPAIGN.buildRun(p, { world: W, level: 3 }, env());
    const b = CAMPAIGN.buildRun(p, { world: W, level: 3 }, env());
    expect(a.seed).toBe(b.seed);
    expect(a.rules.runId).not.toBe(b.rules.runId);
  });

  it('a developer jump to a later wave is clamped to the last wave and counts as a developer run', async () => {
    const p = await newProfile();
    const waves = levelOf(W, 2)!.waves.length;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 2, wave: 99 }, env());
    expect(setup.start.wave).toBe(waves);
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

  it('a lost run pays its gold but no cheese and no progress; a developer run pays nothing (E-066)', async () => {
    const p = await newProfile();
    const lost = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const lostReward = CAMPAIGN.reward(result(lost.rules, false, { stats: { ...emptyStats(), goldEarned: 40 } }), lost.rules, p, 'solo');
    expect(lostReward.counted).toBe(true);
    expect(lostReward.gold).toBe(40);
    expect(lostReward.cheese).toBe(0);
    expect(lostReward.firstWin).toBe(false);
    expect(lostReward.nextLevel).toBeNull();
    const dev = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const devReward = CAMPAIGN.reward(result(dev.rules, true, { devRun: true, stats: { ...emptyStats(), goldEarned: 99 } }), dev.rules, p, 'solo');
    expect(devReward.counted).toBe(false);
    expect(p.data.wallet.gold).toBe(40);
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
  it('never ends and is played with the permanent keep of the profile: its open slots and worn weapons, nothing bought', async () => {
    const p = await newProfile();
    const fresh = ENDLESS.buildRun(p, { world: W, difficulty: 'hard' }, env());
    expect(fresh.rules.lastWave).toBeNull();
    expect(fresh.rules.level).toBeNull();
    expect(fresh.rules.difficulty).toBe('hard');
    expect(fresh.rules.slotsOpen.every((open) => !open)).toBe(true);
    expect(fresh.start.loadout.slotWeapon.every((w) => w === null)).toBe(true);
    expect(fresh.start.wave).toBe(1);
    expect(fresh.start.gold).toBe(0);
    expect(fresh.devRun).toBe(false);
    // Endless opens with the fifth slot (E1); see campaignWaves.test.ts for the exact level.
    expect(ENDLESS.isAvailable(p, W)).toBe(false);
    const won = await profileAt(11);
    won.setWeaponTier('wheel', 4);
    const setup = ENDLESS.buildRun(won, { world: W, difficulty: 'medium' }, env());
    expect(ENDLESS.isAvailable(won, W)).toBe(true);
    expect(setup.rules.slotsOpen.every((open) => open)).toBe(true);
    expect(setup.start.loadout.slotWeapon[0]).toBe('wheel');
    expect(setup.start.loadout.weaponTier.wheel).toBe(4);
  });

  it('the developer menu\'s free wave starts a developer run at that wave; belongings come from the latest quick start before it', async () => {
    const p = await newProfile();
    const late = ENDLESS.buildRun(p, { world: W, devDay: 45 }, env());
    expect(late.start.wave).toBe(45);
    expect(late.devRun).toBe(true);
    expect(late.start.loadout.slotWeapon.some((w) => w !== null)).toBe(true);
    const early = ENDLESS.buildRun(p, { world: W, devDay: 5 }, env());
    expect(early.start.wave).toBe(5);
    expect(early.devRun).toBe(true);
    expect(early.start.loadout.slotWeapon.every((w) => w === null)).toBe(true);
    expect(ENDLESS.buildRun(p, { world: W, devDay: 500 }, env()).start.wave).toBe(99);
  });

  it('pays no cheese, remembers the best wave and adds the run to the score list', async () => {
    const p = await newProfile();
    const run = (wavesCleared: number) => {
      const setup = ENDLESS.buildRun(p, { world: W, difficulty: 'medium' }, env());
      const stats = { ...emptyStats(), wavesCleared };
      return ENDLESS.reward(result(setup.rules, false, { stats, wave: wavesCleared + 1 }), setup.rules, p, 'solo');
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
    const reward = ENDLESS.reward(result(setup.rules, false, { devRun: true, stats: { ...emptyStats(), wavesCleared: 30 } }), setup.rules, p, 'solo');
    expect(reward.counted).toBe(false);
    expect(p.data.wallet.cheese).toBe(0);
    expect(p.scores(W)).toHaveLength(0);
    expect(ENDLESS.next()).toEqual({ to: 'lobby' });
  });
});
