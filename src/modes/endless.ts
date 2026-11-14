/**
 * Endless mode: waves without end, played with the permanent keep of the profile (E1). Nothing is
 * bought in the run. It is the place to earn gold (harder difficulties pay more per raider), never
 * cheese; good runs enter the score list. It opens with the fifth slot.
 */
import { ENEMY_TYPES } from '../config/enemies';
import { QUICK_START_MAX_DAY, quickStartAt, quickStartFor } from '../config/quickstart';
import { SLOT_COUNT } from '../config/slots';
import { TUNING_DEFAULT } from '../config/tuning';
import { DIFFICULTIES, ENDLESS_WAVES, WAVES, type Difficulty } from '../config/waves';
import { worldById } from '../config/worlds';
import type { Profile } from '../profile';
import { freshStart, type RunResult, type RunRules, type RunSetup, type RunStart } from '../sim/rules';
import { keepLoadout, payRun } from './campaign';
import { endlessRolls, EndlessPlanner } from './endlessPlanner';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type Role, type RunChoice, type RunEnv } from './mode';
import { levelEnded } from './progress';
import { endlessOpen, openSlots } from './unlocks';

export class EndlessMode implements GameMode {
  readonly id = 'endless';

  /** Endless opens with the last slot (E1). */
  isAvailable(profile: Profile, world: string): boolean {
    return endlessOpen(profile, world);
  }

  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup {
    const world = worldById(choice.world);
    const table = world.endless;
    const difficulty: Difficulty = choice.difficulty ?? 'medium';
    const diff = DIFFICULTIES[difficulty];
    const tuning = env.tuning ?? TUNING_DEFAULT;
    const players = env.names.length;
    const open = openSlots(profile, world.id);
    const rules: RunRules = {
      runId: newRunId('endless'), mode: this.id, world: world.id, level: null, difficulty, lastWave: null, players,
      scaling: {
        count: diff.count, speed: diff.speed, damage: diff.damage, hp: 1, gold: diff.gold,
        damageGrowth: ENDLESS_WAVES.damageGrowth, speedGrowth: ENDLESS_WAVES.speedGrowth, hpGrowth: ENDLESS_WAVES.hpGrowth,
      },
      maxAlive: WAVES.maxAliveMax,
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => open[i] ?? false),
      gateCannotFall: false,
    };
    const seed = env.seed ?? Math.floor(Math.random() * 0x7fffffff);
    const handTiers = env.names.map((_, i) => env.handTiers[i] ?? 1);
    let start: RunStart = freshStart(rules, keepLoadout(profile, world.id, handTiers));
    // A developer start at a later wave: a quick start's keep instead of the profile's.
    const known = choice.quickStart ? quickStartFor(choice.quickStart) : null;
    const free = (choice.devDay ?? 0) > 1 ? Math.min(QUICK_START_MAX_DAY, Math.round(choice.devDay!)) : 0;
    const quickWave = free || known?.day || 0;
    const quick = quickWave ? quickStartAt(quickWave) : null;
    if (quickWave) {
      const rolls = endlessRolls(table, seed);
      // Nobody needs the "New enemy" windows for everything that appeared in the skipped waves.
      start = { ...start, wave: quickWave, seenTypes: ENEMY_TYPES.filter((t) => rolls.firstWave[t] < quickWave) };
    }
    if (quick) {
      start = {
        ...start, gold: quick.gold,
        loadout: {
          gateTier: quick.gateTier, slotWeapon: [...quick.slots], weaponTier: { ...quick.tiers },
          stations: { cauldron: quick.cauldron, perch: quick.perch }, handTier: env.names.map(() => quick.hand),
        },
      };
      rules.slotsOpen = rules.slotsOpen.map(() => true);
    }
    return {
      seed, names: env.names, tuning, flags: env.flags, fieldW: env.fieldW, viewRight: env.viewRight, rules, start,
      planner: new EndlessPlanner(table, diff.count * tuning.spawnRate),
      devRun: !!env.devRun || quickWave > 0,
    };
  }

  /** Gold and crests of the run, the best wave and the score list. Never cheese. */
  reward(result: RunResult, rules: RunRules, profile: Profile, _role: Role): Reward {
    if (result.devRun || !profile.claimRun(result.runId)) return noReward();
    const paid = payRun(profile, result);
    const difficulty = rules.difficulty ?? 'medium';
    profile.noteEndlessBest(rules.world, difficulty, result.wave);
    const score = {
      names: result.names.join(' & '), coop: rules.players > 1, wave: result.wave, score: result.score, kills: result.kills,
      difficulty, date: new Date().toISOString().slice(0, 10), mode: this.id,
    };
    profile.addScore(rules.world, score);
    levelEnded(profile);
    return { ...noReward(), counted: true, score, ...paid };
  }

  next(): NextStep { return { to: 'lobby' }; }
}
