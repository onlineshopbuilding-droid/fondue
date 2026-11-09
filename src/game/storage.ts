import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import type { Difficulty } from '../config/waves';

export interface Settings {
  name: string;
  difficulty: Difficulty;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  relayAddress: string;
  tuning: Tuning;
}

export interface ScoreEntry {
  names: string;
  coop: boolean;
  day: number;
  score: number;
  kills: number;
  difficulty: Difficulty;
  date: string;
}

const KEY_SETTINGS = 'fondue.settings.v1';
const KEY_SCORES = 'fondue.scores.v1';

const DEFAULTS: Settings = {
  name: '',
  difficulty: 'medium',
  musicVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
  relayAddress: '',
  tuning: { ...TUNING_DEFAULT },
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows may refuse storage; the game simply forgets.
  }
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEY_SETTINGS) ?? {};
  return { ...DEFAULTS, ...s, tuning: { ...TUNING_DEFAULT, ...(s.tuning ?? {}) } };
}

export function saveSettings(s: Settings) { write(KEY_SETTINGS, s); }

export function loadScores(): ScoreEntry[] { return read<ScoreEntry[]>(KEY_SCORES) ?? []; }

export function addScore(e: ScoreEntry): ScoreEntry[] {
  const list = [...loadScores(), e].sort((a, b) => b.score - a.score).slice(0, 30);
  write(KEY_SCORES, list);
  return list;
}
