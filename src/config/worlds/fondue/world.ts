/**
 * World 1, Fondue, as one package: the king, the landscapes, the raiders, the stations,
 * the campaign, what it unlocks, and how endless mode behaves here.
 */
import { ENEMY_TYPES } from '../../enemies';
import type { WorldDef } from '../types';
import { buildCampaign } from './campaign';
import { ENDLESS } from './endless';
import { KING } from './story';
import { UNLOCKS } from './unlocks';

export const FONDUE_WORLD: WorldDef = {
  id: 'fondue',
  name: 'Fondue',
  king: KING,
  landscapes: ['meadow', 'canyon', 'marsh', 'snowpine'],
  enemies: ENEMY_TYPES,
  stations: ['cauldron', 'perch'],
  get campaign() { return buildCampaign(); },
  unlocks: UNLOCKS,
  endless: ENDLESS,
};
