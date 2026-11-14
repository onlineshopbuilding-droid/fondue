// The player's permanent save: holds the data in memory, offers every way to read and change it, and saves in the background.
// Reading is synchronous; a failing storage never stops the game, the profile then simply lives until the page closes.
// Every change is written at most SAVE_DELAY_MS later; flushSync() writes at once (page hide, app switch, close).
import type { Flags } from '../config/flags';
import type { StationId } from '../config/keep';
import type { Tuning } from '../config/tuning';
import { exportCode, importCode } from './codec';
import { migrate } from './migrations';
import { asTier, isRecord, sanitizeProfile, sanitizeRating, sanitizeSettings } from './sanitize';
import {
  CLAIMED_RUNS_LIMIT, HAND_TIER_MAX, HAND_TIER_MIN, PROFILE_KEY, SCORES_LIMIT,
  WEAPON_TIER_MAX, WEAPON_TIER_MIN, freshProfile, freshRating, freshWorld,
  type DevRating, type ProfileData, type ProfileSettings, type ScoreEntry, type WorldProgress,
} from './schema';
import type { ProfileStore } from './store';

/** Settings to change. Tuning and flags may be given in part; the rest stays. */
export type SettingsPatch = Partial<Omit<ProfileSettings, 'tuning' | 'flags'>> & {
  tuning?: Partial<Tuning>;
  flags?: Partial<Flags>;
};

export type ProfileListener = (data: Readonly<ProfileData>) => void;

/** Changes are written at most this long after they happen (several changes become one write). */
export const SAVE_DELAY_MS = 250;

/** Shown once when the device refuses to store the profile. */
export const SAVE_FAILED_NOTICE = 'Progress can’t be saved on this device right now.';

/** Adds a value to a list unless it is already in it. True if it was added. */
function addOnce<T>(list: T[], value: T): boolean {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

async function readQuietly(store: ProfileStore, key: string): Promise<string | null> {
  try {
    return await store.read(key);
  } catch {
    return null;
  }
}

/** The stored object, or null if the text is no JSON or no object. */
function parseStored(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export class Profile {
  /** The last error of the storage, or null if the last save worked. */
  lastError: unknown = null;

  private current: ProfileData;
  private readonly store: ProfileStore;
  private readonly listeners = new Set<ProfileListener>();
  private dirty = false;
  private saving: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** True once a save failed; the game keeps playing from memory. */
  private failed = false;
  private noticeShown = false;

  private constructor(store: ProfileStore, data: ProfileData) {
    this.store = store;
    this.current = data;
  }

  /**
   * Reads the profile from the store. Without a stored profile, it starts fresh; keys of earlier
   * game versions are never read. A damaged profile is set aside under its own key and replaced. Never throws.
   */
  static async load(store: ProfileStore): Promise<Profile> {
    const text = await readQuietly(store, PROFILE_KEY);
    const stored = text === null ? null : parseStored(text);
    if (stored) return new Profile(store, migrate(stored));

    const profile = new Profile(store, freshProfile());
    if (text !== null) await profile.setAside(text);
    profile.dirty = true;
    profile.saving = profile.saveNow();
    await profile.flush();
    return profile;
  }

  /** The whole profile, for reading. Change it only through the methods below or src/modes/progress.ts. */
  get data(): Readonly<ProfileData> {
    return this.current;
  }

  /** Saves every change made so far now. Resolves once it is stored (or the attempt has failed). */
  flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
      this.saving ??= this.saveNow();
    }
    return this.saving ?? Promise.resolve();
  }

  /**
   * Writes the profile at once, synchronously if the store can (localStorage can). For page hide,
   * app switch and close, when there is no time to wait. Never throws.
   */
  flushSync(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    if (!this.dirty && this.saving === null) return;
    if (!this.store.writeSync) { void this.flush(); return; }
    try {
      this.store.writeSync(PROFILE_KEY, JSON.stringify(this.current));
      this.dirty = false;
      this.noteSaved(null);
    } catch (error) {
      this.noteSaved(error);
    }
  }

  /** True while the device refuses to store the profile; progress then lives in memory only. */
  get saveFailed(): boolean {
    return this.failed;
  }

  /** The notice to show once when saving fails, or null (already shown, or saving works). */
  takeSaveNotice(): string | null {
    if (!this.failed || this.noticeShown) return null;
    this.noticeShown = true;
    return SAVE_FAILED_NOTICE;
  }

  /** Calls the listener after every change. Returns a function that stops it. */
  onChange(listener: ProfileListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Player and settings ---

  /** Sets the player's name. */
  setName(name: string): void {
    this.current.name = String(name);
    this.changed();
  }

  /** Changes some settings; values of the wrong type fall back to the defaults. */
  updateSettings(partial: SettingsPatch): void {
    const before = this.current.settings;
    this.current.settings = sanitizeSettings({
      ...before,
      ...partial,
      tuning: { ...before.tuning, ...partial.tuning },
      flags: { ...before.flags, ...partial.flags },
    });
    this.changed();
  }

  // --- Changes from the progression rules (src/modes/progress.ts) ---

  /**
   * Applies one change to the data and saves it. The function returns false if it changed nothing.
   * Only src/modes/progress.ts and the developer cheats should need this.
   */
  edit(change: (data: ProfileData) => boolean | void): boolean {
    const result = change(this.current);
    if (result === false) return false;
    this.changed();
    return true;
  }

  // --- Keep (read) ---

  /** Is this weapon unlocked (owned)? */
  hasWeapon(id: string): boolean {
    return Object.hasOwn(this.current.keep.weapons, id);
  }

  /** The permanent tier of a weapon, 1..7. A weapon not owned counts as tier 1. */
  weaponTier(id: string): number {
    return Object.hasOwn(this.current.keep.weapons, id) ? this.current.keep.weapons[id].tier : WEAPON_TIER_MIN;
  }

  /** Is this station unlocked? */
  hasStation(id: string): boolean {
    return this.stationTier(id) > 0;
  }

  /** Tier of a station, 0 if not unlocked. */
  stationTier(id: string): number {
    return Object.hasOwn(this.current.keep.stations, id) ? this.current.keep.stations[id as StationId] : 0;
  }

  /** Developer cheat: owns the weapon at this tier (1..7). Marks the profile as changed by cheats. */
  setWeaponTier(id: string, tier: number): void {
    if (id === '__proto__') return;
    this.current.keep.weapons[id] = { tier: asTier(tier, WEAPON_TIER_MIN, WEAPON_TIER_MAX) };
    this.noteCheat(`weapon ${id} tier ${tier}`);
  }

  /** Developer cheat: sets the hand tier (1..7). Marks the profile as changed by cheats. */
  setHandTier(tier: number): void {
    this.current.keep.handTier = asTier(tier, HAND_TIER_MIN, HAND_TIER_MAX);
    this.noteCheat(`hand tier ${tier}`);
  }

  /** Notes a permanent developer cheat; the profile is then marked as changed by cheats. */
  noteCheat(what: string): void {
    this.current.cheats.used = true;
    this.current.cheats.log = [...this.current.cheats.log, `${new Date().toISOString()} ${what}`].slice(-100);
    this.changed();
  }

  // --- Progress per world ---

  /** The progress in one world; an empty entry is created if the world is new. */
  world(id: string): WorldProgress {
    if (!Object.hasOwn(this.current.worlds, id)) {
      Object.defineProperty(this.current.worlds, id, { value: freshWorld(), enumerable: true, writable: true, configurable: true });
    }
    return this.current.worlds[id];
  }

  /** Marks a level as beaten. True the first time. */
  markLevelDone(world: string, level: number): boolean {
    return this.changedIf(addOnce(this.world(world).levelsDone, level));
  }

  /** Was this level beaten? */
  isLevelDone(world: string, level: number): boolean {
    return this.peekWorld(world)?.levelsDone.includes(level) ?? false;
  }

  /** The highest beaten level of a world, 0 if none. */
  highestLevelDone(world: string): number {
    return Math.max(0, ...(this.peekWorld(world)?.levelsDone ?? []));
  }

  /** Notes that a story page was read. True the first time. */
  markStoryRead(world: string, pageId: string): boolean {
    return this.changedIf(addOnce(this.world(world).storyRead, pageId));
  }

  /** Remembers the best endless wave per difficulty. True if it is a new best. */
  noteEndlessBest(world: string, difficulty: string, wave: number): boolean {
    if (difficulty === '__proto__' || !Number.isFinite(wave)) return false;
    const best = this.world(world).endlessBest;
    if ((best[difficulty] ?? 0) >= wave) return false;
    best[difficulty] = Math.floor(wave);
    this.changed();
    return true;
  }

  /** Adds a result to a world's leaderboard. Returns the new list: best first, 30 at most. */
  addScore(world: string, entry: ScoreEntry): ScoreEntry[] {
    const progress = this.world(world);
    progress.scores = [...progress.scores, { ...entry }].sort((a, b) => b.score - a.score).slice(0, SCORES_LIMIT);
    this.changed();
    return [...progress.scores];
  }

  /** The leaderboard of a world, best first. */
  scores(world: string): ScoreEntry[] {
    return [...(this.peekWorld(world)?.scores ?? [])];
  }

  // --- Things that happen only once ---

  /** Notes that the reward of a run was paid. True the first time; only the last 200 runs are remembered. */
  claimRun(runId: string): boolean {
    const runs = this.current.claimedRuns;
    if (!addOnce(runs, runId)) return false;
    if (runs.length > CLAIMED_RUNS_LIMIT) runs.splice(0, runs.length - CLAIMED_RUNS_LIMIT);
    this.changed();
    return true;
  }

  /** Notes that the popup of an enemy type was shown. True the first time. */
  markEnemySeen(type: string): boolean {
    return this.changedIf(addOnce(this.current.seen.enemies, type));
  }

  /** Notes that a tip was shown. True the first time. */
  markTipSeen(id: string): boolean {
    return this.changedIf(addOnce(this.current.seen.tips, id));
  }

  /** Notes that the introduction of a weapon slot was shown. True the first time. */
  markSlotIntroSeen(slot: number): boolean {
    return this.changedIf(addOnce(this.current.seen.slotIntros, slot));
  }

  /** Notes that the one-time v0.3 welcome was shown. True the first time. */
  markV3NoticeSeen(): boolean {
    if (this.current.seen.v3Notice) return false;
    this.current.seen.v3Notice = true;
    this.changed();
    return true;
  }

  /** Notes that the tutorial was played through. (completeTutorial in progress.ts also hands out the Rolling Wheel.) */
  markTutorialDone(): void {
    this.current.seen.tutorial = true;
    this.changed();
  }

  /** Makes the tutorial start again on the next visit. */
  resetTutorial(): void {
    this.current.seen.tutorial = false;
    this.changed();
  }

  // --- Developer ratings ---

  /** Changes the developers' rating of one item (checked, verdict, note). */
  setRating(id: string, patch: Partial<DevRating>): void {
    if (id === '__proto__') return;
    const before = Object.hasOwn(this.current.devRatings, id) ? this.current.devRatings[id] : freshRating();
    this.current.devRatings[id] = sanitizeRating({ ...before, ...patch });
    this.changed();
  }

  /** All ratings as readable text, one line per item, in the order of the labels. */
  ratingsAsText(labels: Record<string, string>): string {
    const ratings = this.current.devRatings;
    const ids = [...new Set([...Object.keys(labels), ...Object.keys(ratings)])].filter((id) => Object.hasOwn(ratings, id));
    if (ids.length === 0) return 'No ratings yet.';
    return ids.map((id) => ratingLine(labels[id] ?? id, ratings[id])).join('\n');
  }

  // --- Interrupted level ---

  /** Keeps an interrupted level so it can be continued. The content must fit into JSON. */
  setPendingRun(run: unknown): void {
    this.current.pendingRun = run ?? null;
    this.changed();
  }

  /** Forgets the interrupted level. */
  clearPendingRun(): void {
    this.current.pendingRun = null;
    this.changed();
  }

  // --- Whole profile ---

  /** Throws everything away and starts with a brand new profile and a new id. */
  reset(): void {
    this.current = freshProfile();
    this.changed(false);
  }

  /** The whole profile as one line of text, as a backup or for another device. */
  exportCode(): string {
    return exportCode(this.current);
  }

  /** Replaces the whole profile with the one from a code. Throws, and changes nothing, if the code is broken. */
  importCode(code: string): void {
    this.current = importCode(code);
    this.changed(false);
  }

  /** Replaces the whole profile with other data (sanitized first). For tests and later cloud accounts. */
  replace(data: unknown): void {
    this.current = sanitizeProfile(data);
    this.changed(false);
  }

  // --- Saving ---

  private peekWorld(id: string): WorldProgress | undefined {
    return Object.hasOwn(this.current.worlds, id) ? this.current.worlds[id] : undefined;
  }

  private changedIf(didChange: boolean): boolean {
    if (didChange) this.changed();
    return didChange;
  }

  /** Call after every change: stamps the time, saves soon and tells the listeners. */
  private changed(stampTime = true): void {
    if (stampTime) this.current.updatedAt = new Date().toISOString();
    this.scheduleSave();
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current);
      } catch {
        // A failing listener must not stop the game or the other listeners.
      }
    }
  }

  /** Marks the profile as changed and writes it at most SAVE_DELAY_MS later. */
  private scheduleSave(): void {
    this.dirty = true;
    if (this.timer !== null || this.saving !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saving ??= this.saveNow();
    }, SAVE_DELAY_MS);
  }

  /** Saves until nothing is left. */
  private async saveNow(): Promise<void> {
    await Promise.resolve();
    while (this.dirty) {
      this.dirty = false;
      try {
        await this.store.write(PROFILE_KEY, JSON.stringify(this.current));
        this.noteSaved(null);
      } catch (error) {
        this.noteSaved(error);
      }
    }
    this.saving = null;
  }

  private noteSaved(error: unknown): void {
    this.lastError = error;
    if (error) {
      this.failed = true;
    } else {
      this.failed = false;
      this.noticeShown = false;
    }
  }

  /** Keeps unreadable profile text under its own key, so nothing is lost for good. */
  private async setAside(text: string): Promise<void> {
    try {
      await this.store.write(`${PROFILE_KEY}.broken.${Date.now()}`, text);
    } catch (error) {
      this.noteSaved(error);
    }
  }
}

function ratingLine(label: string, rating: DevRating): string {
  const box = rating.checked ? '[x]' : '[ ]';
  const verdict = rating.verdict ?? 'no verdict';
  const note = rating.note.trim() ? ` - ${rating.note.trim()}` : '';
  return `${box} ${label}: ${verdict}${note}`;
}
