/**
 * The two challenges of every level (A2, cheese 4 and 5), built from templates. A template only
 * asks for what the player can have at that point of the campaign: raider types that come in that
 * level, weapons and slots open after winning the level before, the Great Cauldron and Eagle Perch
 * once they can be unlocked. Whether a challenge is met is judged on the run's counts only
 * (src/modes/challenges.ts); this file holds the data and the texts.
 *
 * CHALLENGE_TEMPLATES columns: id; needs = what must be available (see `available`); stat = which
 * count of the run is compared (see src/modes/challenges.ts); amount(level, have) = how many are
 * asked (have = raiders of the needed type in the level, or 0); text(n, param) = the game text.
 * A later package refines the texts; the system stays.
 */
import { ENEMIES, type EnemyType } from '../../enemies';
import { STATIONS } from '../../keep';
import { SLOTS, slotOfRole } from '../../slots';
import { WEAPONS } from '../../weapons';
import type { ChallengeDef } from '../types';
import { slotUnlockLevel, weaponUnlockLevel } from './unlocks';

/** A whole number from 0 to 1 from two whole numbers, the same every time. */
function pick(a: number, b: number): number {
  let h = Math.imul(a ^ 0x5bd1e995, 2246822519) ^ Math.imul(b, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 668265263);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const plural = (type: EnemyType) => (type === 'grunt' ? 'Pothelms' : `${ENEMIES[type].name}s`);

/** Won levels before this level: what the player can own when starting it. */
const wonBefore = (level: number) => level - 1;

/** A weapon can be worn in this level: unlockable after the level before, and its slot open. */
export function weaponUsableIn(level: number, weaponId: string): boolean {
  const def = WEAPONS.find((w) => w.id === weaponId);
  const unlock = weaponUnlockLevel(weaponId);
  if (!def || unlock === null) return false;
  const slot = slotOfRole(def.slot);
  return slot >= 0 && wonBefore(level) >= unlock && wonBefore(level) >= slotUnlockLevel(slot);
}

/** A station can be owned in this level. */
export const stationUsableIn = (level: number, id: keyof typeof STATIONS): boolean => wonBefore(level) >= STATIONS[id].unlockLevel;

export interface ChallengeTemplate {
  id: string;
  /** Raiders of the level the template is about, if any. */
  enemy?: EnemyType | 'any';
  /** Builds the challenge, or null when the level cannot offer it. */
  make(level: number, counts: Partial<Record<EnemyType, number>>, salt: number): ChallengeDef | null;
}

const total = (counts: Partial<Record<EnemyType, number>>) => Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
/** A share of what the level offers, at least `min`, rounded to a friendly number. */
const shareOf = (have: number, share: number, min = 1) => Math.max(min, Math.floor(have * share));

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'throwKills',
    make: (_level, counts) => {
      const n = Math.min(60, shareOf(total(counts), 0.35, 3));
      return { template: 'throwKills', params: { n }, text: `Defeat ${n} raiders by throwing them` };
    },
  },
  {
    id: 'throws',
    make: (_level, counts) => {
      const n = Math.min(80, shareOf(total(counts), 0.5, 5));
      return { template: 'throws', params: { n }, text: `Throw ${n} raiders` };
    },
  },
  {
    id: 'killType',
    make: (level, counts, salt) => {
      const types = (Object.keys(counts) as EnemyType[]).filter((t) => t !== 'grunt' && (counts[t] ?? 0) >= 2);
      if (types.length === 0) return null;
      const type = types[Math.floor(pick(level, salt) * types.length)];
      // Every raider must fall to win, so the challenge asks for the hand: thrown to death.
      const n = Math.min(12, shareOf(counts[type] ?? 0, 0.4, 1));
      return { template: 'killType', params: { n, type }, text: `Defeat ${n} ${n === 1 ? ENEMIES[type].name : plural(type)} by throwing` };
    },
  },
  {
    id: 'kegBlasts',
    make: (_level, counts) => {
      const have = counts.bomber ?? 0;
      if (have < 2) return null;
      const n = Math.min(10, shareOf(have, 0.4, 1));
      return { template: 'kegBlasts', params: { n }, text: `Let ${n} ${n === 1 ? 'keg' : 'kegs'} explode among the raiders` };
    },
  },
  {
    id: 'kegsShaken',
    make: (_level, counts) => {
      const have = counts.bomber ?? 0;
      if (have < 3) return null;
      const n = Math.min(10, shareOf(have, 0.3, 1));
      return { template: 'kegsShaken', params: { n }, text: `Shake the keg off ${n} Keg ${n === 1 ? 'Hauler' : 'Haulers'}` };
    },
  },
  {
    id: 'weaponShots',
    make: (level, _counts, salt) => {
      // Tapped weapons only: passive ones fire on their own.
      const usable = WEAPONS.filter((w) => w.enabled && w.slot !== 'passive' && weaponUsableIn(level, w.id));
      if (usable.length === 0) return null;
      const w = usable[Math.floor(pick(level * 3, salt) * usable.length)];
      const n = Math.min(12, 3 + Math.floor(level / 12));
      return { template: 'weaponShots', params: { n, weapon: w.id }, text: `Use the ${w.name} ${n} times` };
    },
  },
  {
    id: 'cauldron',
    make: (level) => {
      if (!stationUsableIn(level, 'cauldron')) return null;
      const n = Math.min(10, 2 + Math.floor((level - STATIONS.cauldron.unlockLevel) / 12));
      return { template: 'cauldron', params: { n }, text: `Throw ${n} raiders into the cauldron` };
    },
  },
  {
    id: 'eagle',
    make: (level) => {
      if (!stationUsableIn(level, 'perch')) return null;
      const n = Math.min(4, 1 + Math.floor((level - STATIONS.perch.unlockLevel) / 10));
      return { template: 'eagle', params: { n }, text: `Give ${n} ${n === 1 ? 'raider' : 'raiders'} to the eagle` };
    },
  },
];

/** Slot names, for tests and tables. */
export const SLOT_NAMES = SLOTS.map((s) => s.name);

/**
 * The two challenges of a level: two different templates, picked in a fixed way from those the level
 * can offer. Templates about the level's own raiders and newly reachable stations come first, so the
 * challenges change with the campaign.
 */
export function challengesFor(level: number, waveCounts: Partial<Record<EnemyType, number>> | EnemyType[]): [ChallengeDef, ChallengeDef] {
  const counts: Partial<Record<EnemyType, number>> = Array.isArray(waveCounts) ? Object.fromEntries(waveCounts.map((t) => [t, 3])) : waveCounts;
  const offers = CHALLENGE_TEMPLATES.map((t, i) => t.make(level, counts, i)).filter((c): c is ChallengeDef => c !== null);
  const order = offers.map((c, i) => [pick(level, i + 17) + (c.template === 'throwKills' || c.template === 'throws' ? 0.6 : 0), c] as const)
    .sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const first = order[0];
  const second = order.find((c) => c.template !== first.template) ?? order[1] ?? first;
  return [first, second];
}
