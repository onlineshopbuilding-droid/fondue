/**
 * Collects the gate leaves, crack overlays and the road cauldron as `KEEP_PROPS`.
 * props/index.ts registers them in `PROPS` under their old names.
 */
import { art } from '../draw';
import { clip } from './kit';
import { potBack, potFront, cauldronShadow } from './cauldron';
import { LEAF_D, gate0, gate1, gate2, gate3, gate4, crack1, crack2, crack3 } from './gates';

/**
 * Gate leaf and crack bodies (each fills a 74x150 canvas) and the road cauldron. props/index.ts registers
 * them in `PROPS` under their old names.
 */
export const KEEP_PROPS = {
  gate0: gate0(),
  gate1: gate1(),
  gate2: gate2(),
  gate3: gate3(),
  gate4: gate4(),
  // Splits stay on the leaf; they never spill over its edge.
  crack1Body: clip(LEAF_D, crack1),
  crack2Body: clip(LEAF_D, crack2),
  crack3Body: clip(LEAF_D, crack3),
  // A hair smaller than the canvas, so the rim's outline never touches its edge.
  cauldronBack: art(150, 90, 75, 90, `<g transform="translate(75 88)scale(.96)translate(-75 -88)">${potBack()}</g>`),
  cauldronFront: art(150, 90, 75, 90, cauldronShadow + `<g transform="translate(75 88)scale(.96)translate(-75 -88)">${potFront('stones')}</g>`),
};
