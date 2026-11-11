/**
 * The unlock table of world 1: what winning a level makes available for good.
 * One line per unlock. Change a level number here and the map, the armoury and the rules follow.
 *
 * Columns: level = winning this level unlocks it; kind = what it is;
 *   slot: number of the weapon slot (0 wall foot, 1 wall, 2 gate arm, 3 shrine, 4 tower roof)
 *   weapon: id from src/config/weapons.ts
 *   station: 'cauldron' or 'perch'
 *   gate: highest gate tier that can be built in a level (0 oak ... 4 adamant)
 *   hand: hand tier that can then be bought with stars in the armoury
 * Level 0 means: there from the very start.
 */
import type { UnlockDef } from '../types';

export const UNLOCKS: UnlockDef[] = [
  { level: 0, kind: 'station', station: 'cauldron' },
  { level: 1, kind: 'slot', slot: 0 },
  { level: 1, kind: 'weapon', weapon: 'wheel' },
  { level: 2, kind: 'gate', tier: 1 },
  { level: 5, kind: 'weapon', weapon: 'cheese' },
  { level: 8, kind: 'gate', tier: 2 },
  { level: 9, kind: 'slot', slot: 1 },
  { level: 9, kind: 'weapon', weapon: 'stomper' },
  { level: 12, kind: 'weapon', weapon: 'alphorn' },
  { level: 14, kind: 'hand', tier: 2 },
  { level: 15, kind: 'weapon', weapon: 'forks' },
  { level: 19, kind: 'slot', slot: 2 },
  { level: 19, kind: 'weapon', weapon: 'mortar' },
  { level: 21, kind: 'gate', tier: 3 },
  { level: 23, kind: 'weapon', weapon: 'frost' },
  { level: 27, kind: 'weapon', weapon: 'cuckoo' },
  { level: 29, kind: 'slot', slot: 3 },
  { level: 29, kind: 'weapon', weapon: 'comet' },
  { level: 32, kind: 'station', station: 'perch' },
  { level: 34, kind: 'weapon', weapon: 'bellows' },
  { level: 39, kind: 'slot', slot: 4 },
  { level: 39, kind: 'weapon', weapon: 'bolter' },
  { level: 42, kind: 'gate', tier: 4 },
  { level: 44, kind: 'weapon', weapon: 'bell' },
  { level: 47, kind: 'hand', tier: 3 },
  { level: 49, kind: 'weapon', weapon: 'sentry' },
  { level: 54, kind: 'weapon', weapon: 'thorns' },
  { level: 59, kind: 'weapon', weapon: 'beacon' },
  { level: 69, kind: 'weapon', weapon: 'midas' },
];
