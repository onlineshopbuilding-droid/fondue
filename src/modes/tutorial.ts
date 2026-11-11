/**
 * The prelude a new player is dropped into before any menu: a handful of Pothelms, a gate that
 * cannot fall, no market. It only teaches the grab and the fling; level 1 of the campaign follows.
 */
import { TUNING_DEFAULT } from '../config/tuning';
import { DEFAULT_WORLD } from '../config/worlds';
import type { Profile } from '../profile';
import { FixedPlanner } from '../sim/plan';
import { freshStart, type RunResult, type RunRules, type RunSetup } from '../sim/rules';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type RunChoice, type RunEnv } from './mode';

/** The prelude: how many Pothelms come, and within how many seconds. */
export const PRELUDE = { pothelms: 13, seconds: 34 };

export class TutorialMode implements GameMode {
  readonly id = 'tutorial';

  isAvailable(): boolean { return true; }

  buildRun(_profile: Profile, choice: RunChoice, env: RunEnv): RunSetup {
    const rules: RunRules = {
      runId: newRunId('tutorial'), mode: this.id, world: choice.world, level: null, difficulty: null, lastDay: 1, players: 1,
      scaling: { count: 1, speed: 0.9, damage: 0.5, hp: 1, gold: 1, damageGrowth: 0, speedGrowth: 0, hpGrowth: 0 },
      slotsOpen: [false, false, false, false, false], weapons: {}, stationsOffered: [], maxGateTier: 0,
      handStart: [1], handBuyable: false, tierUpgrades: false, hasMarket: false, gateCannotFall: true, marketOnly: null,
    };
    return {
      seed: 7, names: env.names.slice(0, 1), tuning: TUNING_DEFAULT, fieldW: env.fieldW, rules, start: freshStart(rules),
      planner: new FixedPlanner([{ counts: { grunt: PRELUDE.pothelms }, seconds: PRELUDE.seconds }], 'meadow'),
    };
  }

  /** The prelude pays nothing; it is only remembered as seen. */
  reward(_result: RunResult, _rules: RunRules, profile: Profile): Reward {
    profile.markTutorialDone();
    return noReward();
  }

  next(_result: RunResult, rules: RunRules): NextStep {
    return { to: 'level', world: rules.world || DEFAULT_WORLD, level: 1 };
  }
}
