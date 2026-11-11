// What a screen may see and do in the app; the App itself implements this.
// Screens depend only on this interface, so they stay small and can be replaced one by one.
import type { AudioEngine } from '../../audio/audio';
import type { Session } from '../../game/session';
import type { Reward } from '../../modes';
import type { Profile, ProfileSettings } from '../../profile';
import type { RunResult, RunRules, RunStart } from '../../sim/rules';
import type { CoopRoom } from '../coop/room';
import type { ScreenId } from './screen';

/** An interrupted campaign level, as the app keeps it in the profile. */
export interface PendingRun {
  v: 1;
  rules: RunRules;
  seed: number;
  start: RunStart;
}

export interface ScreenContext {
  /** The permanent save of this device. */
  readonly profile: Profile;
  /** Shortcut to `profile.data.settings`. Change settings through the profile. */
  readonly settings: Readonly<ProfileSettings>;
  /** The world being played (Fondue for now). */
  readonly world: string;
  /** True when nothing is saved (?fresh=1 or ?profile=). */
  readonly temporaryProfile: boolean;
  readonly session: Session | null;
  readonly audio: AudioEngine;
  /** Lobby state and the co-op connection. */
  readonly coop: CoopRoom;
  /** Day the next endless game starts on; above 1 only through the developer menu. */
  readonly startDay: number;
  /** The tip picked for the current results screen. */
  readonly loadingTip: string;
  /** What the run that just ended brought, and how it ended. Null before the first run ends. */
  readonly reward: Reward | null;
  readonly result: RunResult | null;
  readonly resultRules: RunRules | null;
  show(screen: ScreenId, arg?: string): void;
  /** Finds an element inside the visible screen. */
  query<T extends Element>(selector: string): T | null;
  toast(text: string, kind?: string, ms?: number): void;
  /** Applies the volumes after a sound setting changed (the profile saves itself). */
  commitSettings(): void;
  playerName(): string;
  /** The interrupted level that can be continued, or null. */
  pendingRun(): PendingRun | null;
  startCampaign(level: number): void;
  /** An endless run alone, with the difficulty from the settings. */
  startEndless(): void;
  continueLevel(): void;
  /** The same run again from its start (Try again, Play again). */
  restartRun(): void;
  /** Follows the mode's next step after the result screen (Continue). */
  afterRun(): void;
  /** Leaves a lost level towards the campaign list (or the room in co-op). */
  backAfterRun(): void;
  leaveToMenu(): void;
  togglePause(): void;
  openDevMenu(): void;
}
