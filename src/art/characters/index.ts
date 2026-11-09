import type { EnemyType } from '../../config/enemies';
import type { CharacterRig } from '../types';
import { balloonistRig } from './balloonist';
import { bomberRig } from './bomber';
import { crowRig, crowcallerRig } from './crowcaller';
import { goatRiderRig } from './goatRider';
import { gruntRig } from './grunt';
import { hexerRig } from './hexer';
import { pogoRig } from './pogo';
import { shadeRig } from './shade';
import { siegeCartRig } from './siegeCart';
import { slingerRig } from './slinger';
import { yetiRig } from './yeti';

export const RIGS: Record<EnemyType | 'crow', CharacterRig> = {
  grunt: gruntRig,
  bomber: bomberRig,
  goatRider: goatRiderRig,
  pogo: pogoRig,
  hexer: hexerRig,
  slinger: slingerRig,
  siegeCart: siegeCartRig,
  balloonist: balloonistRig,
  shade: shadeRig,
  crowcaller: crowcallerRig,
  yeti: yetiRig,
  crow: crowRig,
};
