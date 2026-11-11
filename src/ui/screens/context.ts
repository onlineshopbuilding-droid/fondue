// What a screen may see and do in the app; the App itself implements this.
// Screens depend only on this interface, so they stay small and can be replaced one by one.
import type { AudioEngine } from '../../audio/audio';
import type { Session } from '../../game/session';
import type { Settings } from '../../game/storage';
import type { CoopRoom } from '../coop/room';
import type { ScreenId } from './screen';

export interface ScreenContext {
  readonly settings: Settings;
  readonly session: Session | null;
  readonly audio: AudioEngine;
  /** Lobby state and the co-op connection. */
  readonly coop: CoopRoom;
  /** Day the next game starts on; above 1 only through the developer menu. */
  readonly startDay: number;
  /** The tip picked for the current results screen. */
  readonly loadingTip: string;
  show(screen: ScreenId, arg?: string): void;
  /** Finds an element inside the visible screen. */
  query<T extends Element>(selector: string): T | null;
  toast(text: string, kind?: string, ms?: number): void;
  /** Saves the settings after a change and applies the volumes. */
  commitSettings(): void;
  startSolo(): void;
  leaveToMenu(): void;
  togglePause(): void;
}
