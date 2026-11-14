/**
 * The first minutes of a new player, without any drawing:
 * - the prelude a new player is dropped into before any menu: a handful of Pothelms, a gate that
 *   cannot fall, one wave, and the free Rolling Wheel already in the damage slot (C4). It teaches
 *   the grab, the fling and the tap on the wheel; level 1 of the campaign follows;
 * - the guided first upgrade after level 1 (D4): when it is due and when it is over;
 * - the King's introductions of slots and stations at their place in the campaign (C2), each once.
 */
import { FIRST_UPGRADE, PRELUDE } from '../config/tutorial';
import { TUNING_DEFAULT } from '../config/tuning';
import { SLOT_COUNT, slotOfRole } from '../config/slots';
import { STATION_IDS, type StationId } from '../config/keep';
import { DEFAULT_WORLD } from '../config/worlds';
import type { Profile } from '../profile';
import { FixedPlanner } from '../sim/plan';
import { emptyLoadout, freshStart, type Loadout, type RunResult, type RunRules, type RunSetup } from '../sim/rules';
import { completeTutorial, quote } from './progress';
import { STARTER_WEAPON, levelsReached, slotOpen, stationAvailable } from './unlocks';
import { newRunId, noReward, type GameMode, type NextStep, type Reward, type RunChoice, type RunEnv } from './mode';

/** The prelude's numbers live in src/config/tutorial.ts; re-exported here for older imports. */
export { PRELUDE };

/** The slot of the free Rolling Wheel (the damage slot). */
export const PRELUDE_WHEEL_SLOT = Math.max(0, slotOfRole('damage'));

/** The keep of the prelude: the free Rolling Wheel in the damage slot, nothing else. */
export function preludeLoadout(players = 1): Loadout {
  const loadout = emptyLoadout(players);
  loadout.slotWeapon[PRELUDE_WHEEL_SLOT] = STARTER_WEAPON;
  loadout.weaponTier = { [STARTER_WEAPON]: PRELUDE.wheelTier };
  return loadout;
}

export class TutorialMode implements GameMode {
  readonly id = 'tutorial';

  isAvailable(): boolean { return true; }

  buildRun(_profile: Profile, choice: RunChoice, env: RunEnv): RunSetup {
    const rules: RunRules = {
      runId: newRunId('tutorial'), mode: this.id, world: choice.world, level: null, difficulty: null, lastWave: 1, players: 1,
      scaling: { count: 1, speed: PRELUDE.speed, damage: PRELUDE.damage, hp: 1, gold: 1, damageGrowth: 0, speedGrowth: 0, hpGrowth: 0 },
      maxAlive: PRELUDE.pothelms,
      slotsOpen: Array.from({ length: SLOT_COUNT }, (_, i) => i === PRELUDE_WHEEL_SLOT),
      gateCannotFall: true,
    };
    return {
      seed: PRELUDE.seed, names: env.names.slice(0, 1), tuning: TUNING_DEFAULT, fieldW: env.fieldW, rules, start: freshStart(rules, preludeLoadout()),
      planner: new FixedPlanner([{ counts: { grunt: PRELUDE.pothelms }, spawnSeconds: PRELUDE.seconds, packs: 3, pauseAfter: 0 }], 'meadow'),
    };
  }

  /** The prelude pays nothing but the free Rolling Wheel, which is now owned for good; it is remembered as seen. */
  reward(_result: RunResult, rules: RunRules, profile: Profile): Reward {
    completeTutorial(profile, rules.world || DEFAULT_WORLD);
    return noReward();
  }

  next(_result: RunResult, rules: RunRules): NextStep {
    return { to: 'level', world: rules.world || DEFAULT_WORLD, level: 1 };
  }
}

// --- The guided first upgrade (D4) ----------------------------------------------------------------

/**
 * The shop should guide the first upgrade: level 1 is won, the guide was never finished, the wheel
 * is still below the guide's tier and the gold is there to buy it.
 */
export function firstUpgradeDue(profile: Profile, world: string = DEFAULT_WORLD): boolean {
  const d = profile.data;
  if (!d.seen.tutorial || d.seen.tips.includes(FIRST_UPGRADE.tipId)) return false;
  if (levelsReached(profile, world) < FIRST_UPGRADE.afterLevel) return false;
  if (!profile.hasWeapon(FIRST_UPGRADE.weapon) || profile.weaponTier(FIRST_UPGRADE.weapon) >= FIRST_UPGRADE.toTier) return false;
  return quote(profile, { kind: 'weapon', id: FIRST_UPGRADE.weapon }, world).allowed;
}

/** The guide is over (the upgrade was bought): remembered, so it never comes again. True the first time. */
export function finishFirstUpgrade(profile: Profile): boolean {
  return profile.markTipSeen(FIRST_UPGRADE.tipId);
}

/** The won screen after this level leads into the shop instead of the hall. */
export function shopAfterWin(profile: Profile, world: string, level: number | null): boolean {
  return level === FIRST_UPGRADE.afterLevel && firstUpgradeDue(profile, world);
}

// --- Introductions of slots and stations (C2) -----------------------------------------------------

export type Intro = { kind: 'slot'; slot: number } | { kind: 'station'; station: StationId };

const stationTip = (id: StationId) => `intro:station:${id}`;

/** Slots that are open and stations that can be unlocked whose King introduction was not shown yet. */
export function pendingIntros(profile: Profile, world: string = DEFAULT_WORLD): Intro[] {
  const seen = profile.data.seen;
  const out: Intro[] = [];
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    // The damage slot is introduced by the prelude itself.
    if (slot === PRELUDE_WHEEL_SLOT) continue;
    if (slotOpen(profile, world, slot) && !seen.slotIntros.includes(slot)) out.push({ kind: 'slot', slot });
  }
  for (const id of STATION_IDS) {
    if (stationAvailable(profile, world, id) && !seen.tips.includes(stationTip(id))) out.push({ kind: 'station', station: id });
  }
  return out;
}

/** Remembers that an introduction was shown. True the first time. */
export function markIntroSeen(profile: Profile, intro: Intro): boolean {
  return intro.kind === 'slot' ? profile.markSlotIntroSeen(intro.slot) : profile.markTipSeen(stationTip(intro.station));
}
