// The player's permanent save: holds the data in memory, offers every way to read and change it, and saves in the background.
// Reading is synchronous; a failing storage never stops the game, the profile then simply lives until the page closes.
import type { Flags } from '../config/flags';
import type { Tuning } from '../config/tuning';
import { exportCode, importCode } from './codec';
import { importLegacy, migrate } from './migrations';
import { asTier, isRecord, sanitizeRating, sanitizeSettings } from './sanitize';
import {
  CLAIMED_RUNS_LIMIT, HAND_TIER_MAX, HAND_TIER_MIN, LEGACY_SCORES_KEY, LEGACY_SETTINGS_KEY, PROFILE_KEY, SCORES_LIMIT,
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

/** Adds a value to a list unless it is already in it. True if it was added. */
function addOnce<T>(list: T[], value: T): boolean {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

function isWholeAmount(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

async function readQuietly(store: ProfileStore, key: string): Promise<string | null> {
  try {
    return await store.read(key);
  } catch {
    return null;
  }
}

/** A new profile that starts with the name, settings and leaderboard of the old game version, if there are any. */
async function freshWithLegacy(store: ProfileStore): Promise<ProfileData> {
  const settingsRaw = await readQuietly(store, LEGACY_SETTINGS_KEY);
  const scoresRaw = await readQuietly(store, LEGACY_SCORES_KEY);
  return { ...freshProfile(), ...importLegacy(settingsRaw, scoresRaw) };
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

  private constructor(store: ProfileStore, data: ProfileData) {
    this.store = store;
    this.current = data;
  }

  /**
   * Reads the profile from the store. Without a stored profile, the old game version's data is
   * taken over once. A damaged profile is set aside under its own key and replaced. Never throws.
   */
  static async load(store: ProfileStore): Promise<Profile> {
    const text = await readQuietly(store, PROFILE_KEY);
    const stored = text === null ? null : parseStored(text);
    if (stored) return new Profile(store, migrate(stored));

    const profile = new Profile(store, await freshWithLegacy(store));
    if (text !== null) await profile.setAside(text);
    profile.scheduleSave();
    await profile.flush();
    return profile;
  }

  /** The whole profile, for reading. Change it only through the methods below. */
  get data(): Readonly<ProfileData> {
    return this.current;
  }

  /** Resolves once every change made so far is saved (or the attempt has failed). */
  flush(): Promise<void> {
    return this.saving ?? Promise.resolve();
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

  // --- Stars ---

  /** Pays out stars: raises the balance and the total ever earned. */
  addStars(n: number): void {
    if (!isWholeAmount(n)) return;
    this.current.stars += n;
    this.current.starsEarned += n;
    this.changed();
  }

  /** Takes stars from the balance. False, and nothing changes, if there are not enough. */
  spendStars(n: number): boolean {
    if (!isWholeAmount(n) || this.current.stars < n) return false;
    this.current.stars -= n;
    this.changed();
    return true;
  }

  // --- Unlocks and tiers ---

  /** Unlocks a weapon. True if it was new. */
  unlockWeapon(id: string): boolean {
    return this.changedIf(addOnce(this.current.unlockedWeapons, id));
  }

  /** Unlocks a weapon slot. True if it was new. */
  unlockSlot(index: number): boolean {
    return this.changedIf(addOnce(this.current.unlockedSlots, index));
  }

  /** Unlocks a station of the castle. True if it was new. */
  unlockStation(id: string): boolean {
    return this.changedIf(addOnce(this.current.unlockedStations, id));
  }

  /** Is this weapon unlocked? */
  hasWeapon(id: string): boolean {
    return this.current.unlockedWeapons.includes(id);
  }

  /** Is this weapon slot unlocked? */
  hasSlot(index: number): boolean {
    return this.current.unlockedSlots.includes(index);
  }

  /** Is this station unlocked? */
  hasStation(id: string): boolean {
    return this.current.unlockedStations.includes(id);
  }

  /** The permanent tier of a weapon, 1..5. A weapon never upgraded is tier 1. */
  weaponTier(id: string): number {
    return Object.hasOwn(this.current.weaponTiers, id) ? this.current.weaponTiers[id] : WEAPON_TIER_MIN;
  }

  /** Sets the permanent tier of a weapon, limited to 1..5. */
  setWeaponTier(id: string, tier: number): void {
    if (id === '__proto__') return;
    this.current.weaponTiers[id] = asTier(tier, WEAPON_TIER_MIN, WEAPON_TIER_MAX);
    this.changed();
  }

  /** Sets the tier of the hand, limited to 1..3. */
  setHandTier(tier: number): void {
    this.current.handTier = asTier(tier, HAND_TIER_MIN, HAND_TIER_MAX);
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

  /** Notes that the stars for helping in this level as a guest were paid. True the first time. */
  claimGuestStars(world: string, level: number): boolean {
    return this.changedIf(addOnce(this.world(world).guestStarLevels, level));
  }

  /** Notes that a story page was read. True the first time. */
  markStoryRead(world: string, pageId: string): boolean {
    return this.changedIf(addOnce(this.world(world).storyRead, pageId));
  }

  /** Notes that an endless milestone was paid out. True the first time. */
  claimEndlessMilestone(world: string, difficulty: string, day: number): boolean {
    const milestones = this.world(world).endlessMilestones;
    if (difficulty === '__proto__') return false;
    if (!Object.hasOwn(milestones, difficulty)) milestones[difficulty] = [];
    return this.changedIf(addOnce(milestones[difficulty], day));
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
    return this.changedIf(addOnce(this.current.seenEnemies, type));
  }

  /** Notes that a tip was shown. True the first time. */
  markTipSeen(id: string): boolean {
    return this.changedIf(addOnce(this.current.seenTips, id));
  }

  /** Notes that the tutorial was played through. */
  markTutorialDone(): void {
    this.current.tutorialDone = true;
    this.changed();
  }

  /** Makes the tutorial start again on the next visit. */
  resetTutorial(): void {
    this.current.tutorialDone = false;
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

  private scheduleSave(): void {
    this.dirty = true;
    this.saving ??= this.saveSoon();
  }

  /** Waits for the end of the current tick, so several changes become one write, then saves until nothing is left. */
  private async saveSoon(): Promise<void> {
    await Promise.resolve();
    while (this.dirty) {
      this.dirty = false;
      try {
        await this.store.write(PROFILE_KEY, JSON.stringify(this.current));
        this.lastError = null;
      } catch (error) {
        this.lastError = error;
      }
    }
    this.saving = null;
  }

  /** Keeps unreadable profile text under its own key, so nothing is lost for good. */
  private async setAside(text: string): Promise<void> {
    try {
      await this.store.write(`${PROFILE_KEY}.broken.${Date.now()}`, text);
    } catch (error) {
      this.lastError = error;
    }
  }
}

function ratingLine(label: string, rating: DevRating): string {
  const box = rating.checked ? '[x]' : '[ ]';
  const verdict = rating.verdict ?? 'no verdict';
  const note = rating.note.trim() ? ` - ${rating.note.trim()}` : '';
  return `${box} ${label}: ${verdict}${note}`;
}
