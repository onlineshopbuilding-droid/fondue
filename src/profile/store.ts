// Where the profile text is kept: the browser today, app storage or an own service later.
// The interface is asynchronous on purpose, so a slower store can replace localStorage without changes elsewhere.

export interface ProfileStore {
  /** The stored text, or null if there is none or it cannot be read. */
  read(key: string): Promise<string | null>;
  /** Rejects if the text could not be stored. */
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Optional: stores at once, before returning. Used when the page is hidden or closed. Throws on failure. */
  writeSync?(key: string, value: string): void;
}

/** Keeps the profile in the browser's localStorage. */
export class LocalProfileStore implements ProfileStore {
  async read(key: string): Promise<string | null> {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      // Private windows may refuse storage.
      return null;
    }
  }

  async write(key: string, value: string): Promise<void> {
    this.writeSync(key, value);
  }

  writeSync(key: string, value: string): void {
    if (typeof localStorage === 'undefined') throw new Error('No local storage available.');
    try {
      localStorage.setItem(key, value);
    } catch (cause) {
      throw new Error('Local storage refused to save.', { cause });
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      // Nothing to remove if storage is not reachable.
    }
  }
}

/** Keeps everything in memory. For tests, and as a stand-in where no storage exists. */
export class MemoryProfileStore implements ProfileStore {
  readonly entries = new Map<string, string>();
  /** While true, every write is rejected, as a full or blocked storage would do. */
  failWrites = false;
  /** How many writes were stored successfully. */
  writeCount = 0;

  constructor(initial: Record<string, string> = {}, options: { failWrites?: boolean } = {}) {
    for (const [key, value] of Object.entries(initial)) this.entries.set(key, value);
    this.failWrites = options.failWrites ?? false;
  }

  async read(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async write(key: string, value: string): Promise<void> {
    this.writeSync(key, value);
  }

  writeSync(key: string, value: string): void {
    if (this.failWrites) throw new Error('Simulated write failure.');
    this.entries.set(key, value);
    this.writeCount += 1;
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
