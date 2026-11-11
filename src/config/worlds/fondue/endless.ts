/**
 * Endless mode of world 1: the light randomness that makes every run a little different.
 * The random numbers come from the simulation's seeded generator: same seed, same run.
 *
 * `types` columns, per raider:
 *   firstDay     earliest and latest day of its first appearance (decided once per run)
 *   firstCount   how many arrive on that day
 *   extraChance  chance that one more arrives on that day (Yeti: 0.2 = two Yetis one run in five)
 *   weight       share among the raiders afterwards
 *   maxPerDay    most per day before scaling; grows 15 % per day after its first
 */
import type { EndlessDef } from '../types';

export const ENDLESS: EndlessDef = {
  countSpread: 0.1,
  types: {
    grunt: { firstDay: [1, 1], firstCount: 3, extraChance: 0, weight: 10, maxPerDay: 999 },
    bomber: { firstDay: [2, 3], firstCount: 3, extraChance: 0.3, weight: 3, maxPerDay: 40 },
    goatRider: { firstDay: [3, 4], firstCount: 3, extraChance: 0.3, weight: 3, maxPerDay: 40 },
    pogo: { firstDay: [4, 6], firstCount: 3, extraChance: 0.3, weight: 3, maxPerDay: 40 },
    hexer: { firstDay: [5, 7], firstCount: 3, extraChance: 0.3, weight: 2, maxPerDay: 24 },
    slinger: { firstDay: [6, 8], firstCount: 3, extraChance: 0.3, weight: 2.5, maxPerDay: 30 },
    siegeCart: { firstDay: [7, 10], firstCount: 1, extraChance: 0.25, weight: 0.5, maxPerDay: 5 },
    balloonist: { firstDay: [8, 11], firstCount: 3, extraChance: 0.3, weight: 1.5, maxPerDay: 18 },
    shade: { firstDay: [10, 13], firstCount: 3, extraChance: 0.3, weight: 1.5, maxPerDay: 20 },
    crowcaller: { firstDay: [11, 15], firstCount: 3, extraChance: 0.3, weight: 1.2, maxPerDay: 16 },
    yeti: { firstDay: [13, 17], firstCount: 1, extraChance: 0.2, weight: 0.35, maxPerDay: 4 },
  },
  landscapes: ['meadow', 'canyon', 'marsh', 'snowpine'],
  daysPerLandscape: 3,
  onlyUnlockedWeapons: false,
  availableFromLevel: 0,
  milestones: {
    easy: [{ day: 10, stars: 1 }, { day: 20, stars: 2 }, { day: 30, stars: 2 }],
    medium: [{ day: 5, stars: 1 }, { day: 10, stars: 2 }, { day: 15, stars: 2 }, { day: 20, stars: 3 }, { day: 25, stars: 3 }, { day: 30, stars: 4 }, { day: 40, stars: 5 }, { day: 50, stars: 6 }],
    hard: [{ day: 5, stars: 2 }, { day: 10, stars: 3 }, { day: 15, stars: 4 }, { day: 20, stars: 5 }, { day: 30, stars: 6 }, { day: 40, stars: 8 }],
  },
};
