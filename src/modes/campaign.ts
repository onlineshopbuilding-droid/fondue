/**
 * Campaign mode: one level from the world's table, a fight of waves played with the permanent keep
 * of the profile (castle, worn weapons and their tiers, stations, hand). Nothing is bought in a level.
 * The end pays the gold of the run (won or lost, E-066), the Raider Crests, and, for a win, each of
 * the level's five cheese once.
 * Co-op is "the host's campaign with a helper": the guest brings only a hand and keeps the gold.
 */
import { CAMPAIGN_SCALING } from '../config/campaignScaling';
import { SLOT_COUNT } from '../config/slots';
import { TUNING_DEFAULT } from '../config/tuning';
import { COOP } from '../config/waves';
import { levelOf, worldById } from '../config/worlds';
import type { LevelDef } from '../config/worlds/types';
import type { Profile } from '../profile';
import { FixedPlanner } from '../sim/plan';
import { freshStart, type Loadout, type RunResult, type RunRules, type RunSetup, type Scaling } from '../sim/rules';
import { challengesDone } from './challenges';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type Role, type RunChoice, type RunEnv } from './mode';
import { addCrests, addGold, applyLevelCheese, cheeseMask, levelCheese, levelEnded } from './progress';
import { openSlots, syncUnlocks, unlocksOfLevel } from './unlocks';

/** The numbers live in src/config/campaignScaling.ts; re-exported here for older imports. */
export { CAMPAIGN_SCALING };

export function campaignScaling(level: LevelDef): Scaling {
  const extra = level.power - 1;
  const steps = Math.max(1, level.waves.length - 1);
  return {
    count: 1, hp: level.power, damage: 1 + extra * CAMPAIGN_SCALING.damageShare, speed: 1 + extra * CAMPAIGN_SCALING.speedShare,
    gold: 1 + extra * CAMPAIGN_SCALING.goldPerPower,
    damageGrowth: CAMPAIGN_SCALING.damageOverLevel / steps, speedGrowth: CAMPAIGN_SCALING.speedOverLevel / steps, hpGrowth: CAMPAIGN_SCALING.hpOverLevel / steps,
    easeIn: CAMPAIGN_SCALING.easeIn,
  };
}

/** Every attempt of a level starts from the same seed, so the level always plays out the same. */
export const levelSeed = (world: string, level: number): number => {
  let h = 2166136261;
  for (const ch of `${world}:${level}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
};

/**
 * The permanent keep of a profile as the loadout of a run (A1): castle tier, the weapons worn in
 * open slots with their tiers, the stations owned, and the hand of every player.
 */
export function keepLoadout(profile: Profile, world: string, handTiers: number[]): Loadout {
  const keep = profile.data.keep;
  const open = openSlots(profile, world);
  const slotWeapon = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const id = keep.loadout[i] ?? null;
    return open[i] && id !== null && profile.hasWeapon(id) ? id : null;
  });
  const weaponTier: Record<string, number> = {};
  for (const id of slotWeapon) if (id !== null) weaponTier[id] = profile.weaponTier(id);
  return {
    gateTier: Math.max(0, keep.castleTier - 1), slotWeapon, weaponTier,
    stations: { cauldron: (keep.stations.cauldron ?? 0) > 0, perch: (keep.stations.perch ?? 0) > 0 },
    stationTier: { cauldron: keep.stations.cauldron ?? 0, perch: keep.stations.perch ?? 0 },
    handTier: handTiers.map((t) => t || 1),
  };
}

/** Gold and crests of a run go to the profile, in every mode and also for a lost run (E-066). */
export function payRun(profile: Profile, result: RunResult): { gold: number; crests: number } {
  return { gold: addGold(profile, result.stats.goldEarned), crests: addCrests(profile, result.stats.crestsEarned) };
}

export class CampaignMode implements GameMode {
  readonly id = 'campaign';

  isAvailable(): boolean { return true; }

  /** The level a profile plays next: one past its highest win, at most the last one. */
  nextLevel(profile: Profile, world: string): number {
    return Math.min(worldById(world).campaign.length, profile.highestLevelDone(world) + 1);
  }

  /** A level can be played when the one before it is won. */
  canPlay(profile: Profile, world: string, level: number): boolean {
    return level >= 1 && level <= profile.highestLevelDone(world) + 1 && !!levelOf(world, level);
  }

  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup {
    if (choice.resume) {
      const level = levelOf(choice.resume.rules.world, choice.resume.rules.level ?? 1)!;
      return {
        seed: choice.resume.seed, names: env.names, tuning: TUNING_DEFAULT, fieldW: env.fieldW, viewRight: env.viewRight,
        rules: choice.resume.rules, start: choice.resume.start, planner: this.planner(level),
      };
    }
    const level = levelOf(choice.world, choice.level ?? 1)!;
    const players = env.names.length;
    const open = openSlots(profile, choice.world);
    const rules: RunRules = {
      runId: newRunId(`campaign-${level.id}`), mode: this.id, world: choice.world, level: level.id, difficulty: null,
      lastWave: level.waves.length, players,
      scaling: campaignScaling(level),
      maxAlive: Math.round(level.maxAlive * (players > 1 ? Math.sqrt(COOP.countFactor) : 1)),
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => open[i] ?? false),
      gateCannotFall: false,
    };
    const handTiers = env.names.map((_, i) => env.handTiers[i] ?? 1);
    const wave = Math.max(1, Math.min(choice.wave ?? 1, level.waves.length));
    const start = { ...freshStart(rules, keepLoadout(profile, choice.world, handTiers)), wave };
    return {
      seed: levelSeed(choice.world, level.id), names: env.names, tuning: env.tuning ?? TUNING_DEFAULT, flags: env.flags,
      fieldW: env.fieldW, viewRight: env.viewRight, rules, start, planner: this.planner(level), devRun: !!env.devRun || wave > 1,
    };
  }

  planner(level: LevelDef): FixedPlanner {
    return new FixedPlanner(level.waves, level.landscape, { night: level.night, boss: level.boss?.name ?? null, coopFactor: COOP.countFactor });
  }

  reward(result: RunResult, rules: RunRules, profile: Profile, role: Role): Reward {
    const world = rules.world;
    const level = levelOf(world, rules.level ?? 0);
    if (role !== 'guest') profile.clearPendingRun();
    if (!level || result.devRun || !profile.claimRun(result.runId)) return noReward();
    const paid = payRun(profile, result);
    const base = { ...noReward(), counted: true, story: result.won ? level.story : '', ...paid };
    // The helper keeps the gold of the round, but no level progress and no cheese (E2).
    if (role === 'guest' || !result.won) {
      levelEnded(profile);
      return base;
    }
    const firstWin = profile.markLevelDone(world, level.id);
    const challenges = challengesDone(level.challenges, result.stats);
    const before = levelCheese(profile, world, level.id);
    const cheese = applyLevelCheese(profile, world, level.id, cheeseMask({ won: true, gateShare: result.gateShare, challenges }));
    syncUnlocks(profile, world);
    levelEnded(profile);
    const last = worldById(world).campaign.length;
    return {
      ...base, cheese, cheeseBits: levelCheese(profile, world, level.id) & ~before, challenges, firstWin,
      unlocks: firstWin ? unlocksOfLevel(world, level.id) : [], nextLevel: level.id < last ? level.id + 1 : null,
    };
  }

  next(): NextStep { return { to: 'lobby' }; }
}
