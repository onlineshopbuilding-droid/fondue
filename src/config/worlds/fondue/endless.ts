/**
 * Endless mode of world 1: the light randomness that makes every run a little different.
 * The random numbers come from the simulation's seeded generator: same seed, same run.
 *
 * `types` columns, per raider:
 *   firstWave    earliest and latest wave of its first appearance (decided once per run)
 *   firstCount   how many arrive in that wave
 *   extraChance  chance that one more arrives in that wave (Yeti: 0.2 = two Yetis one run in five)
 *   weight       share among the raiders afterwards
 *   maxPerWave   most per wave before scaling; grows by capGrowth per wave after its first
 */
import type { EndlessDef } from '../types';

export const ENDLESS: EndlessDef = {
  countSpread: 0.15,
  types: {
    grunt: { firstWave: [1, 1], firstCount: 2, extraChance: 0, weight: 10, maxPerWave: 999 },
    bomber: { firstWave: [3, 5], firstCount: 2, extraChance: 0.3, weight: 3, maxPerWave: 8 },
    goatRider: { firstWave: [5, 8], firstCount: 2, extraChance: 0.3, weight: 3, maxPerWave: 8 },
    pogo: { firstWave: [7, 11], firstCount: 2, extraChance: 0.3, weight: 3, maxPerWave: 8 },
    hexer: { firstWave: [9, 13], firstCount: 2, extraChance: 0.3, weight: 2, maxPerWave: 6 },
    slinger: { firstWave: [11, 15], firstCount: 2, extraChance: 0.3, weight: 2.5, maxPerWave: 6 },
    siegeCart: { firstWave: [13, 19], firstCount: 1, extraChance: 0.25, weight: 0.5, maxPerWave: 1 },
    balloonist: { firstWave: [15, 21], firstCount: 2, extraChance: 0.3, weight: 1.5, maxPerWave: 4 },
    shade: { firstWave: [19, 25], firstCount: 2, extraChance: 0.3, weight: 1.5, maxPerWave: 5 },
    crowcaller: { firstWave: [21, 29], firstCount: 2, extraChance: 0.3, weight: 1.2, maxPerWave: 4 },
    yeti: { firstWave: [25, 33], firstCount: 1, extraChance: 0.2, weight: 0.35, maxPerWave: 1 },
  },
  landscapes: ['meadow', 'canyon', 'marsh', 'snowpine'],
  wavesPerLandscape: 8,
  capGrowth: 0.08,
  onlyUnlockedWeapons: true,
};
