/**
 * Endless mode: no last day, difficulty to choose, everything bought during the run.
 * Good runs pay stars once per milestone day and enter the score list.
 */
import { ENEMY_TYPES } from '../config/enemies';
import { quickStartFor } from '../config/quickstart';
import { SLOT_COUNT } from '../config/slots';
import { TUNING_DEFAULT } from '../config/tuning';
import { DAY, DIFFICULTIES, type Difficulty } from '../config/waves';
import { WEAPONS } from '../config/weapons';
import { worldById } from '../config/worlds';
import type { Profile } from '../profile';
import { freshStart, type RunResult, type RunRules, type RunSetup, type RunStart, type WeaponRule } from '../sim/rules';
import { endlessRolls, EndlessPlanner } from './endlessPlanner';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type Role, type RunChoice, type RunEnv } from './mode';

export class EndlessMode implements GameMode {
  readonly id = 'endless';

  isAvailable(profile: Profile, world: string): boolean {
    return profile.highestLevelDone(world) >= worldById(world).endless.availableFromLevel;
  }

  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup {
    const world = worldById(choice.world);
    const table = world.endless;
    const difficulty: Difficulty = choice.difficulty ?? 'medium';
    const diff = DIFFICULTIES[difficulty];
    const tuning = env.tuning ?? TUNING_DEFAULT;
    const players = env.names.length;
    const restricted = table.onlyUnlockedWeapons;

    const weapons: Record<string, WeaponRule> = {};
    for (const w of WEAPONS) weapons[w.id] = { offered: w.enabled && (!restricted || profile.hasWeapon(w.id)), fixedTier: null };
    const rules: RunRules = {
      runId: newRunId('endless'), mode: this.id, world: world.id, level: null, difficulty, lastDay: null, players,
      scaling: {
        count: diff.count, speed: diff.speed, damage: diff.damage, hp: 1, gold: diff.gold,
        damageGrowth: DAY.damageGrowth, speedGrowth: DAY.speedGrowth, hpGrowth: DAY.hpGrowth,
      },
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => !restricted || profile.hasSlot(i)),
      weapons,
      stationsOffered: world.stations.filter((s) => !restricted || profile.hasStation(s)),
      maxGateTier: 4,
      handStart: env.names.map(() => 1),
      handBuyable: true, tierUpgrades: true, hasMarket: true, gateCannotFall: false, marketOnly: null,
    };
    const seed = env.seed ?? Math.floor(Math.random() * 0x7fffffff);
    const quick = choice.quickStart ? quickStartFor(choice.quickStart) : null;
    let start: RunStart = freshStart(rules);
    if (quick) {
      const rolls = endlessRolls(table, seed);
      start = {
        ...start, day: quick.day, gold: quick.gold, offerings: quick.offerings,
        loadout: {
          gateTier: quick.gateTier, slotWeapon: [...quick.slots], weaponTier: { ...quick.tiers },
          stations: { cauldron: quick.cauldron, perch: quick.perch }, handTier: env.names.map(() => quick.hand),
        },
        // Nobody needs the "New enemy" windows for everything that appeared on the skipped days.
        seenTypes: ENEMY_TYPES.filter((t) => rolls.firstDay[t] < quick.day),
      };
    }
    return {
      seed, names: env.names, tuning, flags: env.flags, fieldW: env.fieldW, rules, start,
      planner: new EndlessPlanner(table, diff.count * tuning.spawnRate),
      devRun: !!env.devRun || !!quick,
    };
  }

  reward(result: RunResult, rules: RunRules, profile: Profile, _role: Role): Reward {
    if (result.devRun || !profile.claimRun(result.runId)) return noReward();
    const difficulty = rules.difficulty ?? 'medium';
    let stars = 0;
    for (const m of worldById(rules.world).endless.milestones[difficulty]) {
      if (result.stats.daysCleared >= m.day && profile.claimEndlessMilestone(rules.world, difficulty, m.day)) stars += m.stars;
    }
    if (stars > 0) profile.addStars(stars);
    const score = {
      names: result.names.join(' & '), coop: rules.players > 1, day: result.day, score: result.score, kills: result.kills,
      difficulty, date: new Date().toISOString().slice(0, 10), mode: this.id,
    };
    profile.addScore(rules.world, score);
    return { counted: true, stars, firstWin: false, unlocks: [], story: '', score, nextLevel: null };
  }

  next(): NextStep { return { to: 'lobby' }; }
}
