/**
 * The campaign as waves on the permanent keep (F2): the field is never quiet for long, levels last
 * as long as planned, the keep of the profile goes into every run, gold stays, cheese is paid once,
 * endless opens with the fifth slot, every challenge can be met in its level, and every raider
 * appears first where the table says.
 */
import { describe, expect, it } from 'vitest';
import { runGame } from '../../src/bots/harness';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../src/config/enemies';
import { DIFFICULTIES, WAVES } from '../../src/config/waves';
import { WEAPONS } from '../../src/config/weapons';
import { levelOf, worldById } from '../../src/config/worlds';
import { FIRST_LEVEL, plannedSeconds } from '../../src/config/worlds/fondue/campaign';
import { stationUsableIn, weaponUsableIn } from '../../src/config/worlds/fondue/challenges';
import type { ChallengeDef, LevelDef } from '../../src/config/worlds/types';
import { CAMPAIGN, ENDLESS, completeTutorial, type RunEnv } from '../../src/modes';
import { levelSeed } from '../../src/modes/campaign';
import { challengesDone } from '../../src/modes/challenges';
import { equip, levelCheese } from '../../src/modes/progress';
import { slotRole, weaponRole } from '../../src/modes/unlocks';
import { MemoryProfileStore, Profile } from '../../src/profile';
import { waveSeed } from '../../src/sim/plan';
import { Rng } from '../../src/sim/rng';
import { emptyStats, type RunResult, type RunRules, type RunStatsData } from '../../src/sim/rules';
import { Sim } from '../../src/sim/sim';

const W = 'fondue';
const LEVELS = worldById(W).campaign;
const env = (names = ['A'], handTiers = names.map(() => 1)): RunEnv => ({ names, fieldW: 1280, handTiers });

const waveCount = (w: LevelDef['waves'][number]) =>
  Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0) + Object.values(w.big ?? {}).reduce((a, b) => a + (b ?? 0), 0);
const levelCounts = (l: LevelDef): Partial<Record<EnemyType, number>> => {
  const c: Partial<Record<EnemyType, number>> = {};
  for (const w of l.waves) for (const rec of [w.counts, w.big ?? {}]) for (const [t, n] of Object.entries(rec) as [EnemyType, number][]) c[t] = (c[t] ?? 0) + n;
  return c;
};
const levelTotal = (l: LevelDef) => l.waves.reduce((a, w) => a + waveCount(w), 0);

function result(rules: RunRules, won: boolean, extra: Partial<RunResult> = {}): RunResult {
  return { runId: rules.runId, won, devRun: false, names: ['A'], wave: rules.lastWave ?? 1, score: 1000, kills: 10, gateShare: 0.3, stats: emptyStats(), ...extra };
}

/** A profile that has done the tutorial and won every level up to `level` (only the progress mark). */
async function profileWith(level: number, store = new MemoryProfileStore()): Promise<Profile> {
  const p = await Profile.load(store);
  completeTutorial(p, W);
  if (level > 0) p.markLevelDone(W, level);
  p.flushSync();
  return p;
}

/** Run stats that meet a challenge exactly. */
function statsMeeting(c: ChallengeDef, base: RunStatsData = emptyStats()): RunStatsData {
  const s: RunStatsData = JSON.parse(JSON.stringify(base));
  const n = Number(c.params.n);
  switch (c.template) {
    case 'throwKills': s.killsByCause.impact = Math.max(s.killsByCause.impact ?? 0, n); break;
    case 'throws': s.throws = Math.max(s.throws, n); break;
    case 'killType': s.throwKillsByType[String(c.params.type)] = n; break;
    case 'kegBlasts': s.kegBlasts = n; break;
    case 'kegsShaken': s.kegsShaken = n; break;
    case 'weaponShots': s.weaponShots[String(c.params.weapon)] = n; break;
    case 'cauldron': s.killsByCause.cauldron = n; break;
    case 'eagle': s.killsByCause.eagle = n; break;
    default: throw new Error(`unknown template ${c.template}`);
  }
  return s;
}

/**
 * Longest stretch without a living raider by the WaveFlow rules, if every raider died the moment it
 * arrived (the worst case): inside a wave a gap is cut at `clearDelay` (the next arrival is pulled
 * forward); after a wave the next starts when the pause is over or after `clearDelay` on an empty
 * field, and its first arrival is again cut at `clearDelay`. The first wave waits `firstWaveDelay`.
 */
function plannedQuiet(level: LevelDef): { quiet: number; wave: number } {
  const planner = CAMPAIGN.planner(level);
  const seed = levelSeed(W, level.id);
  const cd = WAVES.clearDelay;
  let worst = { quiet: 0, wave: 0 };
  const note = (q: number, wave: number) => { if (q > worst.quiet) worst = { quiet: q, wave }; };
  let carry = WAVES.firstWaveDelay;
  for (let wave = 1; wave <= level.waves.length; wave++) {
    const plan = planner.plan(wave, { seed, players: 1 }, new Rng(waveSeed(seed, wave)));
    const times = plan.entries.map((e) => e.t).sort((a, b) => a - b);
    expect(times.length, `level ${level.id} wave ${wave} brings nobody`).toBeGreaterThan(0);
    note(carry + Math.min(Math.max(0, times[0]), cd), wave);
    for (let i = 1; i < times.length; i++) note(Math.min(times[i] - times[i - 1], cd), wave);
    carry = Math.min(plan.pauseAfter, cd);
  }
  return worst;
}

/** Plays a level with no hands: every raider that walks past x < 900 dies at once. Measures the quiet stretches. */
async function playScripted(levelId: number) {
  const prof = await profileWith(levelId - 1);
  const setup = CAMPAIGN.buildRun(prof, { world: W, level: levelId }, env());
  const sim = new Sim(setup);
  let quiet = 0;
  let longest = 0;
  let longestWave = 0;
  for (let t = 0; t < 60 * 60 * 20; t++) {
    for (const e of sim.s.enemies) if (!e.dead && e.x < 900) sim.hurt(e, 1e9, 'impact', 0);
    sim.step();
    sim.drainEvents();
    const s = sim.s;
    if (s.phase === 'banner' || s.phase === 'battle') {
      if (s.enemies.some((e) => !e.dead)) quiet = 0;
      else {
        quiet += 1 / 60;
        if (quiet > longest) { longest = quiet; longestWave = s.wave; }
      }
    }
    if (s.phase === 'runWon' || s.phase === 'gameover') break;
  }
  return { quiet: longest, wave: longestWave, won: sim.s.phase === 'runWon', seconds: sim.s.runT };
}

describe('the field is never quiet for long (B2)', () => {
  it(`by the plan and the WaveFlow rules, no level of 100 has a stretch over ${WAVES.maxQuietSeconds} s without a raider`, () => {
    const bad: string[] = [];
    for (const l of LEVELS) {
      const q = plannedQuiet(l);
      if (q.quiet > WAVES.maxQuietSeconds) bad.push(`level ${l.id} wave ${q.wave}: ${q.quiet.toFixed(2)} s`);
    }
    expect(bad).toEqual([]);
  });

  it.each([1, 2, 10, 23, 50, 77, 100])('level %i played in the simulation with every raider killed early: never quiet for long', async (id) => {
    const r = await playScripted(id);
    expect(r.won, `level ${id} did not end`).toBe(true);
    // The level really ran its waves: at least most of the planned arrivals and pauses.
    expect(r.seconds, `level ${id} ran ${r.seconds.toFixed(1)} s`).toBeGreaterThan(plannedSeconds(levelOf(W, id)!) * 0.5);
    expect(r.quiet, `level ${id}: ${r.quiet.toFixed(2)} s quiet in wave ${r.wave}`).toBeLessThanOrEqual(WAVES.maxQuietSeconds);
  }, 60_000);

  it.each([1, 2])('level %i played by a bot: the harness measures no quiet stretch over the limit', async (id) => {
    const prof = await profileWith(id - 1);
    const setup = CAMPAIGN.buildRun(prof, { world: W, level: id }, env());
    const r = runGame(setup, ['great'], { botSeed: 7, targetSeconds: levelOf(W, id)!.targetSeconds });
    expect(r.stuck, r.stuckInfo ?? '').toBe(false);
    expect(r.longestQuiet, `wave ${r.longestQuietWave}`).toBeLessThanOrEqual(WAVES.maxQuietSeconds);
  }, 60_000);
});

describe('planned length of the levels (B1)', () => {
  const isBoss = (l: LevelDef) => l.id % 10 === 0;
  it('levels 1 to 5 last 60 to 120 s', () => {
    for (const l of LEVELS.slice(0, 5)) {
      expect(l.targetSeconds, `level ${l.id}`).toBeGreaterThanOrEqual(60);
      expect(l.targetSeconds, `level ${l.id}`).toBeLessThanOrEqual(120);
    }
  });

  it('the middle levels (21 on, no boss, no twist) last 180 to 300 s; levels 6 to 20 ramp up in between', () => {
    for (const l of LEVELS.filter((x) => x.id > 5 && !isBoss(x) && !x.twist)) {
      const [lo, hi] = l.id > 20 ? [180, 300] : [100, 300];
      expect(l.targetSeconds, `level ${l.id}`).toBeGreaterThanOrEqual(lo);
      expect(l.targetSeconds, `level ${l.id}`).toBeLessThanOrEqual(hi);
    }
  });

  it('boss levels (every tenth) and twist levels last 360 to 600 s', () => {
    for (const l of LEVELS.filter((x) => isBoss(x) || x.twist)) {
      expect(l.targetSeconds, `level ${l.id}`).toBeGreaterThanOrEqual(360);
      expect(l.targetSeconds, `level ${l.id}`).toBeLessThanOrEqual(600);
    }
  });

  it('the waves fill the planned length: plannedSeconds is within 20 % of targetSeconds', () => {
    const bad = LEVELS.filter((l) => Math.abs(plannedSeconds(l) / l.targetSeconds - 1) > 0.2)
      .map((l) => `level ${l.id}: planned ${plannedSeconds(l).toFixed(1)} s, target ${l.targetSeconds} s`);
    expect(bad).toEqual([]);
  });
});

describe('the permanent keep goes into the run (A1)', () => {
  /** A profile at level 7 won (slots 0 to 3 open), with one owned weapon per open slot at a tier. */
  async function keptProfile(store = new MemoryProfileStore()) {
    const p = await profileWith(7, store);
    const worn: { slot: number; id: string; tier: number }[] = [];
    for (let slot = 0; slot < 4; slot++) {
      const def = WEAPONS.find((w) => w.enabled && weaponRole(w) === slotRole(slot));
      if (!def) continue;
      const tier = 2 + slot;
      p.edit((d) => { d.keep.weapons[def.id] = { tier }; });
      // The Rolling Wheel is already worn in slot 0 after the tutorial; equip then changes nothing.
      expect(equip(p, slot, def.id, W) || p.data.keep.loadout[slot] === def.id, `equip ${def.id} in slot ${slot}`).toBe(true);
      worn.push({ slot, id: def.id, tier });
    }
    // A passive weapon written into the closed fifth slot must not come along.
    const passive = WEAPONS.find((w) => w.enabled && weaponRole(w) === slotRole(4));
    p.edit((d) => {
      d.keep.castleTier = 3;
      d.keep.handTier = 2;
      d.keep.stations.cauldron = 2;
      if (passive) { d.keep.weapons[passive.id] = { tier: 4 }; d.keep.loadout[4] = passive.id; }
    });
    p.flushSync();
    return { p, worn, passive: passive?.id ?? null, store };
  }

  it('buildRun puts the worn weapons of open slots with their tiers, the castle, the stations and the hand into the start loadout', async () => {
    const { p, worn, passive } = await keptProfile();
    expect(worn.length).toBeGreaterThan(1);
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 8 }, env(['A'], [p.data.keep.handTier]));
    const lo = setup.start.loadout;
    for (const w of worn) {
      expect(lo.slotWeapon[w.slot]).toBe(w.id);
      expect(lo.weaponTier[w.id]).toBe(w.tier);
    }
    expect(lo.slotWeapon[4]).toBeNull();
    if (passive) expect(lo.weaponTier[passive]).toBeUndefined();
    expect(setup.rules.slotsOpen).toEqual([true, true, true, true, false]);
    expect(lo.gateTier).toBe(2);
    expect(lo.stations.cauldron).toBe(true);
    expect(lo.stations.perch).toBe(false);
    expect(lo.stationTier?.cauldron).toBe(2);
    expect(lo.handTier).toEqual([2]);
    expect(setup.start.wave).toBe(1);
    expect(setup.start.gold).toBe(0);
  });

  it('a weapon keeps its tier after unequip and equip, in another level and after a reload', async () => {
    const { p, worn, store } = await keptProfile();
    const { slot, id, tier } = worn[0];
    expect(equip(p, slot, null, W)).toBe(true);
    expect(CAMPAIGN.buildRun(p, { world: W, level: 8 }, env()).start.loadout.slotWeapon[slot]).toBeNull();
    expect(p.weaponTier(id)).toBe(tier);
    expect(equip(p, slot, id, W)).toBe(true);
    for (const level of [2, 5, 8]) expect(CAMPAIGN.buildRun(p, { world: W, level }, env()).start.loadout.weaponTier[id]).toBe(tier);
    p.flushSync();
    const again = await Profile.load(store);
    const lo = CAMPAIGN.buildRun(again, { world: W, level: 8 }, env()).start.loadout;
    expect(lo.slotWeapon[slot]).toBe(id);
    expect(lo.weaponTier[id]).toBe(tier);
    expect(lo.gateTier).toBe(2);
  });
});

describe('gold of a run stays (E-066)', () => {
  it.each([true, false])('won = %s: the run\'s gold is in the wallet after the level and after a reload', async (won) => {
    const store = new MemoryProfileStore();
    const p = await profileWith(0, store);
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const stats = { ...emptyStats(), goldEarned: 137, crestsEarned: 2 };
    const reward = CAMPAIGN.reward(result(setup.rules, won, { stats, gateShare: won ? 0.7 : 0 }), setup.rules, p, 'solo');
    expect(reward.counted).toBe(true);
    expect(reward.gold).toBe(137);
    expect(reward.crests).toBe(2);
    expect(p.data.wallet.gold).toBe(137);
    const again = await Profile.load(store);
    expect(again.data.wallet.gold).toBe(137);
    expect(again.data.wallet.crests).toBe(2);
    expect(again.isLevelDone(W, 1)).toBe(won);
    expect(again.data.wallet.cheese).toBe(won ? 2 : 0);
  });

  it('a co-op guest keeps the gold but gets no cheese and no level progress', async () => {
    const host = await profileWith(0);
    const guest = await profileWith(0);
    const setup = CAMPAIGN.buildRun(host, { world: W, level: 1 }, env(['A', 'B']));
    const level = levelOf(W, 1)!;
    const stats = statsMeeting(level.challenges[1], statsMeeting(level.challenges[0], { ...emptyStats(), goldEarned: 80 }));
    const r = CAMPAIGN.reward(result(setup.rules, true, { stats, gateShare: 1 }), setup.rules, guest, 'guest');
    expect(r.counted).toBe(true);
    expect(r.gold).toBe(80);
    expect(r.cheese).toBe(0);
    expect(guest.data.wallet.gold).toBe(80);
    expect(guest.data.wallet.cheese).toBe(0);
    expect(guest.highestLevelDone(W)).toBe(0);
    expect(levelCheese(guest, W, 1)).toBe(0);
  });

  it('paying the same run twice pays nothing the second time', async () => {
    const p = await profileWith(0);
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const r = result(setup.rules, false, { stats: { ...emptyStats(), goldEarned: 50 } });
    expect(CAMPAIGN.reward(r, setup.rules, p, 'solo').gold).toBe(50);
    const again = CAMPAIGN.reward(r, setup.rules, p, 'solo');
    expect(again.counted).toBe(false);
    expect(again.gold).toBe(0);
    expect(p.data.wallet.gold).toBe(50);
  });
});

describe('the five cheese of a level are paid once each', () => {
  it('winning twice with the same result pays the cheese only the first time', async () => {
    const p = await profileWith(0);
    const level = levelOf(W, 1)!;
    const stats = statsMeeting(level.challenges[1], statsMeeting(level.challenges[0]));
    expect(challengesDone(level.challenges, stats)).toEqual([true, true]);
    const play = () => {
      const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
      return CAMPAIGN.reward(result(setup.rules, true, { stats, gateShare: 0.95 }), setup.rules, p, 'solo');
    };
    const first = play();
    expect(first.cheese).toBe(5);
    expect(first.challenges).toEqual([true, true]);
    expect(p.data.wallet.cheese).toBe(5);
    const second = play();
    expect(second.counted).toBe(true);
    expect(second.cheese).toBe(0);
    expect(second.cheeseBits).toBe(0);
    expect(p.data.wallet.cheese).toBe(5);
  });

  it('the gate cheese come from result.gateShare (> 50 %, > 90 %), the challenge cheese from result.stats', async () => {
    const p = await profileWith(0);
    const level = levelOf(W, 1)!;
    const play = (gateShare: number, stats: RunStatsData) => {
      const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
      return CAMPAIGN.reward(result(setup.rules, true, { stats, gateShare }), setup.rules, p, 'solo');
    };
    expect(play(0.5, emptyStats())).toMatchObject({ cheese: 1, cheeseBits: 0b00001, challenges: [false, false] });
    expect(play(0.9, emptyStats())).toMatchObject({ cheese: 1, cheeseBits: 0b00010 });
    expect(play(0.91, emptyStats())).toMatchObject({ cheese: 1, cheeseBits: 0b00100 });
    expect(play(1, statsMeeting(level.challenges[0]))).toMatchObject({ cheese: 1, cheeseBits: 0b01000, challenges: [true, false] });
    expect(play(1, statsMeeting(level.challenges[1]))).toMatchObject({ cheese: 1, cheeseBits: 0b10000, challenges: [false, true] });
    expect(levelCheese(p, W, 1)).toBe(0b11111);
    expect(p.data.wallet.cheese).toBe(5);
  });

  it('a lost level pays no cheese, whatever the gate and the challenges', async () => {
    const p = await profileWith(0);
    const level = levelOf(W, 1)!;
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env());
    const stats = statsMeeting(level.challenges[1], statsMeeting(level.challenges[0]));
    const r = CAMPAIGN.reward(result(setup.rules, false, { stats, gateShare: 1 }), setup.rules, p, 'solo');
    expect(r.cheese).toBe(0);
    expect(levelCheese(p, W, 1)).toBe(0);
  });
});

describe('endless (E1)', () => {
  it('is locked until the fifth slot opens: not after 10 won levels, open after 11', async () => {
    expect(ENDLESS.isAvailable(await profileWith(0), W)).toBe(false);
    expect(ENDLESS.isAvailable(await profileWith(10), W)).toBe(false);
    expect(ENDLESS.isAvailable(await profileWith(11), W)).toBe(true);
  });

  it('pays gold but never cheese', async () => {
    const p = await profileWith(11);
    const cheese = p.data.wallet.cheese;
    const setup = ENDLESS.buildRun(p, { world: W, difficulty: 'hard' }, env());
    const r = ENDLESS.reward(result(setup.rules, false, { stats: { ...emptyStats(), goldEarned: 300 }, gateShare: 1, wave: 12 }), setup.rules, p, 'solo');
    expect(r.counted).toBe(true);
    expect(r.cheese).toBe(0);
    expect(r.gold).toBe(300);
    expect(p.data.wallet.cheese).toBe(cheese);
    expect(p.data.wallet.gold).toBe(300);
  });

  it('the gold factor grows with the difficulty, and the run uses it', async () => {
    expect(DIFFICULTIES.easy.gold).toBeLessThan(DIFFICULTIES.medium.gold);
    expect(DIFFICULTIES.medium.gold).toBeLessThan(DIFFICULTIES.hard.gold);
    const p = await profileWith(11);
    for (const d of ['easy', 'medium', 'hard'] as const) expect(ENDLESS.buildRun(p, { world: W, difficulty: d }, env()).rules.scaling.gold).toBe(DIFFICULTIES[d].gold);
  });
});

describe('every challenge can be met in its own level (A2)', () => {
  it('needed raiders come in the level\'s waves, needed weapons and stations are usable, and n fits what the level offers', () => {
    const bad: string[] = [];
    for (const l of LEVELS) {
      const counts = levelCounts(l);
      const total = levelTotal(l);
      expect(l.challenges[0].template, `level ${l.id}: two different challenges`).not.toBe(l.challenges[1].template);
      for (const c of l.challenges) {
        const n = Number(c.params.n);
        const say = (why: string) => bad.push(`level ${l.id} ${c.template} ${JSON.stringify(c.params)}: ${why}`);
        if (!(n >= 1)) say('n is not a positive number');
        switch (c.template) {
          case 'throwKills':
          case 'throws':
            if (n > total) say(`asks ${n}, the level brings ${total} raiders`);
            break;
          case 'killType': {
            const type = String(c.params.type) as EnemyType;
            if (!ENEMIES[type]) { say('unknown raider'); break; }
            if (!ENEMIES[type].grabbable) say(`${type} cannot be grabbed, so it cannot be thrown to death`);
            if ((counts[type] ?? 0) < n) say(`asks ${n}, the level brings ${counts[type] ?? 0} ${type}`);
            break;
          }
          case 'kegBlasts':
          case 'kegsShaken':
            if ((counts.bomber ?? 0) < n) say(`asks ${n}, the level brings ${counts.bomber ?? 0} bombers`);
            break;
          case 'weaponShots': {
            const id = String(c.params.weapon);
            if (!weaponUsableIn(l.id, id)) say(`${id} cannot be worn in this level`);
            if (WEAPONS.find((w) => w.id === id)?.slot === 'passive') say(`${id} is passive and cannot be used by hand`);
            break;
          }
          case 'cauldron':
            if (!stationUsableIn(l.id, 'cauldron')) say('the Great Cauldron cannot be owned yet');
            if (n > total) say(`asks ${n}, the level brings ${total} raiders`);
            break;
          case 'eagle':
            if (!stationUsableIn(l.id, 'perch')) say('the Eagle Perch cannot be owned yet');
            if (n > total) say(`asks ${n}, the level brings ${total} raiders`);
            break;
          default:
            say('unknown template');
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('"New enemy": every raider first appears in its FIRST_LEVEL', () => {
  const typesOfWave = (w: LevelDef['waves'][number]) =>
    new Set((Object.entries({ ...w.counts }) as [EnemyType, number][]).concat(Object.entries(w.big ?? {}) as [EnemyType, number][]).filter(([, n]) => n > 0).map(([t]) => t));

  it('appears in the waves of its first level, not in wave 1 (except level 1), and never earlier', () => {
    for (const t of ENEMY_TYPES) {
      const first = FIRST_LEVEL[t];
      const level = LEVELS[first - 1];
      expect(level.newEnemies, `${t} announced in level ${first}`).toContain(t);
      const waves = level.waves.map(typesOfWave);
      expect(waves.some((s) => s.has(t)), `${t} in level ${first}`).toBe(true);
      if (first > 1) expect(waves[0].has(t), `${t} in wave 1 of level ${first}`).toBe(false);
      for (const l of LEVELS.slice(0, first - 1)) expect(l.waves.some((w) => typesOfWave(w).has(t)), `${t} in level ${l.id}`).toBe(false);
      for (const l of LEVELS.filter((x) => x.id !== first)) expect(l.newEnemies, `level ${l.id}`).not.toContain(t);
    }
  });
});
