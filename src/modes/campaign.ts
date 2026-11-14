/**
 * Campaign mode: one level from the world's table, played with the permanent keep of the profile
 * (castle, worn weapons and their tiers, stations, hand). Winning pays the level's cheese once
 * (each of the five only once) and moves the campaign on.
 * Co-op is "the host's campaign with a helper": the guest brings only a hand.
 */
import { CAMPAIGN_SCALING } from '../config/campaignScaling';
import { SLOT_COUNT } from '../config/slots';
import { TUNING_DEFAULT } from '../config/tuning';
import { COOP } from '../config/waves';
import { WEAPONS } from '../config/weapons';
import { levelOf, worldById } from '../config/worlds';
import type { LevelDef } from '../config/worlds/types';
import type { Profile } from '../profile';
import { FixedPlanner, type DaySpec } from '../sim/plan';
import { freshStart, type RunResult, type RunRules, type RunSetup, type Scaling, type WeaponRule } from '../sim/rules';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type Role, type RunChoice, type RunEnv } from './mode';
import { applyLevelCheese, cheeseMask, levelEnded } from './progress';
import { openSlots, syncUnlocks, unlocksOfLevel } from './unlocks';

/** The numbers live in src/config/campaignScaling.ts; re-exported here for older imports. */
export { CAMPAIGN_SCALING };

export function campaignScaling(level: LevelDef): Scaling {
  const extra = level.power - 1;
  return {
    count: 1, hp: level.power, damage: 1 + extra * CAMPAIGN_SCALING.damageShare, speed: 1 + extra * CAMPAIGN_SCALING.speedShare,
    gold: 1 + extra * CAMPAIGN_SCALING.goldPerPower,
    damageGrowth: CAMPAIGN_SCALING.damageGrowth, speedGrowth: CAMPAIGN_SCALING.speedGrowth, hpGrowth: CAMPAIGN_SCALING.hpGrowth,
    easeIn: CAMPAIGN_SCALING.easeIn,
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
    const keep = profile.data.keep;
    const open = openSlots(profile, choice.world);
    const weapons: Record<string, WeaponRule> = {};
    for (const w of WEAPONS) weapons[w.id] = { offered: w.enabled && profile.hasWeapon(w.id), fixedTier: profile.weaponTier(w.id) };
    const slotWeapon = keep.loadout.map((id, i) => (open[i] && id !== null && profile.hasWeapon(id) ? id : null));
    const weaponTier: Record<string, number> = {};
    for (const id of slotWeapon) if (id !== null) weaponTier[id] = profile.weaponTier(id);
    const rules: RunRules = {
      runId: newRunId(`campaign-${level.id}`), mode: this.id, world: choice.world, level: level.id, difficulty: null,
      lastDay: level.days.length, players,
      scaling: campaignScaling(level),
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => open[i] ?? false),
      weapons,
      stationsOffered: worldById(choice.world).stations.filter((s) => profile.hasStation(s)),
      maxGateTier: keep.castleTier - 1,
      handStart: env.names.map((_, i) => env.handTiers[i] ?? 1),
      handBuyable: false, tierUpgrades: false, hasMarket: true, gateCannotFall: false, marketOnly: level.marketOnly,
    };
    const fresh = freshStart(rules);
    // The permanent keep stands from the first second (F2 removes the in-run market around it).
    const loadout = {
      ...fresh.loadout, gateTier: keep.castleTier - 1, slotWeapon, weaponTier,
      stations: { cauldron: keep.stations.cauldron > 0, perch: keep.stations.perch > 0 },
    };
    const start = { ...fresh, loadout, gold: level.startGold, day: Math.min(choice.day ?? 1, level.days.length) };
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
      // The helper keeps no level progress and no cheese of their own (F2 pays them the run's gold).
      return { counted: true, cheese: 0, firstWin: false, unlocks: [], story: level.story, score: null, nextLevel: null };
    }
    const firstWin = profile.markLevelDone(world, level.id);
    // F2: gate share and challenges come from the wave run; until then a win pays the win cheese.
    const cheese = applyLevelCheese(profile, world, level.id, cheeseMask({ won: true, gateShare: 0 }));
    syncUnlocks(profile, world);
    levelEnded(profile);
    const last = worldById(world).campaign.length;
    return {
      counted: true, cheese, firstWin, unlocks: firstWin ? unlocksOfLevel(world, level.id) : [], story: level.story, score: null,
      nextLevel: level.id < last ? level.id + 1 : null,
    };
  }

  next(): NextStep { return { to: 'lobby' }; }
}
