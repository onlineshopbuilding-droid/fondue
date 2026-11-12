// Plays the campaign level by level with one profile, the way a person would: win, collect stars, spend them, go on.
// A lost level is tried again with a fresh bot stream; the level itself plays out the same every time.
import { WORLD } from '../config/field';
import { levelOf, worldById } from '../config/worlds';
import { CAMPAIGN, syncUnlocks } from '../modes';
import { MemoryProfileStore, Profile } from '../profile';
import { spendStars, type ArmouryBuy } from './armoury';
import { runGame, type GameResult } from './harness';
import { skillOf, type BotSkill } from './skills';

export interface CampaignOptions {
  /** One skill per player; two make a co-op run (the host's campaign with a helper). */
  skills: (string | BotSkill)[];
  world?: string;
  /** First and last level to play, both included. Levels before `from` count as won without playing. */
  from?: number;
  to?: number;
  /** Attempts per level before giving up. */
  maxTries?: number;
  /** Mark a level won after `maxTries` failures, so the measurement goes on to the end. */
  forceThrough?: boolean;
  /** Start of the bots' random streams. */
  seed?: number;
  fieldW?: number;
  /** Called after each level, for progress output. */
  onLevel?: (r: LevelRun) => void;
}

export interface LevelRun {
  level: number;
  boss: boolean;
  days: number;
  /** Attempts played, and whether one of them won. */
  tries: number;
  won: boolean;
  /** Not won within maxTries but counted as won to go on. */
  forced: boolean;
  /** Day reached in each attempt. */
  dayPerTry: number[];
  /** Of the last attempt: gate hit points left in percent, gold and offerings held at the end. */
  gatePct: number;
  gold: number;
  offerings: number;
  /** Stars paid for this level, and the balance after spending in the armoury. */
  starsEarned: number;
  starsLeft: number;
  armoury: ArmouryBuy[];
  /** What the profile owns after this level. */
  handTier: number;
  weaponTiers: Record<string, number>;
  slots: number[];
  /** What stood on the keep at the end of the last attempt. */
  keep: GameResult['loadout'];
  bought: string[];
  stuck: string | null;
  seconds: number;
}

export interface CampaignRun {
  skills: string[];
  levels: LevelRun[];
  /** Stopped at this level because it was never won and forceThrough was off. */
  stoppedAt: number | null;
  seconds: number;
}

export class CampaignRunner {
  constructor(private opts: CampaignOptions) {}

  async run(): Promise<CampaignRun> {
    const o = this.opts;
    const world = o.world ?? 'fondue';
    const skills = o.skills.map(skillOf);
    const names = skills.length > 1 ? ['A', 'B'] : ['A'];
    const last = Math.min(o.to ?? worldById(world).campaign.length, worldById(world).campaign.length);
    const from = Math.max(1, o.from ?? 1);
    const maxTries = o.maxTries ?? 6;
    const seed = o.seed ?? 1;
    const profile = await Profile.load(new MemoryProfileStore());
    syncUnlocks(profile, world);
    // Levels skipped at the front count as won, with their stars, so the profile is where it would be.
    for (let l = 1; l < from; l++) { this.markWon(profile, world, l); spendStars(profile, skills[0], world); }
    const t0 = Date.now();
    const levels: LevelRun[] = [];
    let stoppedAt: number | null = null;

    for (let level = from; level <= last; level++) {
      const def = levelOf(world, level)!;
      const lt0 = Date.now();
      const dayPerTry: number[] = [];
      let game: GameResult | null = null;
      let starsEarned = 0;
      let won = false;
      let stuck: string | null = null;
      for (let attempt = 0; attempt < maxTries && !won; attempt++) {
        // The co-op helper brings its own hand; here it grows with the host, as two friends who play together would.
        const hand = profile.data.handTier;
        const setup = CAMPAIGN.buildRun(profile, { world, level }, { names, fieldW: o.fieldW ?? WORLD.width, handTiers: names.map(() => hand) });
        game = runGame(setup, skills, { botSeed: seed * 100003 + level * 1009 + attempt * 7919 });
        dayPerTry.push(game.day);
        if (game.stuck && !stuck) stuck = game.stuckInfo;
        if (game.result) {
          const reward = CAMPAIGN.reward(game.result, setup.rules, profile, 'solo');
          starsEarned += reward.stars;
        }
        won = game.won;
      }
      const forced = !won && !!o.forceThrough;
      if (forced) starsEarned += this.markWon(profile, world, level);
      const armoury = won || forced ? spendStars(profile, skills[0], world) : [];
      const g = game!;
      const r: LevelRun = {
        level, boss: !!def.boss, days: def.days.length, tries: dayPerTry.length, won, forced, dayPerTry,
        gatePct: g.gatePct, gold: g.goldEnd, offerings: g.offeringsEnd, starsEarned, starsLeft: profile.data.stars, armoury,
        handTier: profile.data.handTier, weaponTiers: { ...profile.data.weaponTiers }, slots: [...profile.data.unlockedSlots].sort(),
        keep: g.loadout, bought: g.bought, stuck, seconds: (Date.now() - lt0) / 1000,
      };
      levels.push(r);
      o.onLevel?.(r);
      if (!won && !forced) { stoppedAt = level; break; }
    }
    return { skills: skills.map((s) => s.name), levels, stoppedAt, seconds: (Date.now() - t0) / 1000 };
  }

  /** Counts a level as won without playing it: progress, its stars and its unlocks. Returns the stars. */
  private markWon(profile: Profile, world: string, level: number): number {
    const def = levelOf(world, level);
    if (!def || !profile.markLevelDone(world, level)) return 0;
    profile.addStars(def.stars);
    syncUnlocks(profile, world);
    return def.stars;
  }
}
