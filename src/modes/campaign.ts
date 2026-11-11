/**
 * Campaign mode: one level from the world's table, with the weapons, tiers and hand of the profile.
 * Winning pays stars once, unlocks what the table says, and moves the campaign on.
 * Co-op is "the host's campaign with a helper": the guest brings only a hand.
 */
import { SLOT_COUNT } from '../config/slots';
import { STARS } from '../config/stars';
import { TUNING_DEFAULT } from '../config/tuning';
import { COOP } from '../config/waves';
import { WEAPONS } from '../config/weapons';
import { levelOf, worldById } from '../config/worlds';
import type { LevelDef } from '../config/worlds/types';
import type { Profile } from '../profile';
import { FixedPlanner, type DaySpec } from '../sim/plan';
import { freshStart, type RunResult, type RunRules, type RunSetup, type Scaling, type WeaponRule } from '../sim/rules';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type Role, type RunChoice, type RunEnv } from './mode';
import { maxGateTier, syncUnlocks, unlocksOfLevel } from './unlocks';

/** How a level's `power` turns into the raiders' numbers, and how they grow from day to day inside a level. */
export const CAMPAIGN_SCALING = {
  /** Share of the power above 1 that reaches gate damage and walk speed; hit points get all of it. */
  damageShare: 0.8,
  speedShare: 0.12,
  /** Later levels pay more gold per kill, so a fresh start can still afford the bigger keep. */
  goldPerPower: 0.7,
  damageGrowth: 0.1,
  speedGrowth: 0.015,
  hpGrowth: 0.05,
};

export function campaignScaling(level: LevelDef): Scaling {
  const extra = level.power - 1;
  return {
    count: 1, hp: level.power, damage: 1 + extra * CAMPAIGN_SCALING.damageShare, speed: 1 + extra * CAMPAIGN_SCALING.speedShare,
    gold: 1 + extra * CAMPAIGN_SCALING.goldPerPower,
    damageGrowth: CAMPAIGN_SCALING.damageGrowth, speedGrowth: CAMPAIGN_SCALING.speedGrowth, hpGrowth: CAMPAIGN_SCALING.hpGrowth,
  };
}

/** Every attempt of a level starts from the same seed, so the level always plays out the same. */
export const levelSeed = (world: string, level: number): number => {
  let h = 2166136261;
  for (const ch of `${world}:${level}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
};

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
        seed: choice.resume.seed, names: env.names, tuning: TUNING_DEFAULT, fieldW: env.fieldW,
        rules: choice.resume.rules, start: choice.resume.start, planner: this.planner(level),
      };
    }
    const level = levelOf(choice.world, choice.level ?? 1)!;
    const players = env.names.length;
    const weapons: Record<string, WeaponRule> = {};
    for (const w of WEAPONS) weapons[w.id] = { offered: w.enabled && profile.hasWeapon(w.id), fixedTier: profile.weaponTier(w.id) };
    const rules: RunRules = {
      runId: newRunId(`campaign-${level.id}`), mode: this.id, world: choice.world, level: level.id, difficulty: null,
      lastDay: level.days.length, players,
      scaling: campaignScaling(level),
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => profile.hasSlot(i)),
      weapons,
      stationsOffered: worldById(choice.world).stations.filter((s) => profile.hasStation(s)),
      maxGateTier: maxGateTier(profile, choice.world),
      handStart: env.names.map((_, i) => env.handTiers[i] ?? 1),
      handBuyable: false, tierUpgrades: false, hasMarket: true, gateCannotFall: false, marketOnly: level.marketOnly,
    };
    const start = { ...freshStart(rules), gold: level.startGold, day: Math.min(choice.day ?? 1, level.days.length) };
    return {
      seed: levelSeed(choice.world, level.id), names: env.names, tuning: env.tuning ?? TUNING_DEFAULT, flags: env.flags,
      fieldW: env.fieldW, rules, start, planner: this.planner(level), devRun: !!env.devRun || (choice.day ?? 1) > 1,
    };
  }

  private planner(level: LevelDef): FixedPlanner {
    const days: DaySpec[] = level.days.map((d, i) => ({
      counts: d.counts, night: d.night, seconds: d.seconds, big: d.big,
      boss: level.boss && i === level.days.length - 1 ? level.boss.name : null,
    }));
    return new FixedPlanner(days, level.landscape, () => COOP.campaignFactor);
  }

  reward(result: RunResult, rules: RunRules, profile: Profile, role: Role): Reward {
    const world = rules.world;
    const level = levelOf(world, rules.level ?? 0);
    if (role !== 'guest') profile.clearPendingRun();
    if (!level || result.devRun || !result.won || !profile.claimRun(result.runId)) return noReward();

    if (role === 'guest') {
      // The helper is paid once per level and keeps no level progress of their own.
      const stars = profile.claimGuestStars(world, level.id) ? Math.ceil(level.stars * STARS.guestShare) : 0;
      if (stars > 0) profile.addStars(stars);
      return { counted: true, stars, firstWin: false, unlocks: [], story: level.story, score: null, nextLevel: null };
    }
    const firstWin = profile.markLevelDone(world, level.id);
    const stars = firstWin ? level.stars : Math.floor(level.stars * STARS.replayShare);
    if (stars > 0) profile.addStars(stars);
    syncUnlocks(profile, world);
    const last = worldById(world).campaign.length;
    return {
      counted: true, stars, firstWin, unlocks: firstWin ? unlocksOfLevel(world, level.id) : [], story: level.story, score: null,
      nextLevel: level.id < last ? level.id + 1 : null,
    };
  }

  next(): NextStep { return { to: 'lobby' }; }
}
