/**
 * Collects every prop as `PROPS`: gates, cracks, cauldron, projectiles, hand, effects, signboard and
 * icons, plus all castle art. Props are in Fondue's folk-art felt puppet style: chunky rounded
 * shapes, a thick dark outline, flat fills and at most one simple highlight.
 */
import type { Art } from '../types';
import { CASTLE_ART, KEEP_PROPS } from '../castle';
import { art } from '../draw';
import { wheel, slab, comet, bomb, stone, shell, bolt, roofBolt } from './projectiles';
import { handOpen, handClosed } from './hand';
import { gibHelmet, gibPlate, gibBoot, gibStick, coin, offering, splat1, splat2, splat3, drop1, dust, spark, star, flame1, flame2, flame3, iceBlock, shieldBubble } from './effects';
import { banner } from './signboard';
import { snowball, snowDrift, pinecone, hornet, cheeseStream, cheesePool, swingLog } from './weaponFx';
import { KING_ART } from '../king';
import { iconWheel, iconStomper, iconComet, iconMortar, iconFrost, iconBellows, iconBolter, iconPause, iconLocked, iconCastle } from './icons';

// ---------------------------------------------------------------------------------------------
// Gates, crack overlays and the road cauldron are drawn in ../castle with the rest of the keep.
// ---------------------------------------------------------------------------------------------

const { gate0, gate1, gate2, gate3, gate4, crack1Body, crack2Body, crack3Body, cauldronBack, cauldronFront } = KEEP_PROPS;

// ---------------------------------------------------------------------------------------------

export const PROPS: Record<string, Art> = {
  gate0: art(74, 150, 0, 150, gate0),
  gate1: art(74, 150, 0, 150, gate1),
  gate2: art(74, 150, 0, 150, gate2),
  gate3: art(74, 150, 0, 150, gate3),
  gate4: art(74, 150, 0, 150, gate4),
  crack1: art(74, 150, 0, 150, crack1Body),
  crack2: art(74, 150, 0, 150, crack2Body),
  crack3: art(74, 150, 0, 150, crack3Body),
  cauldronBack,
  cauldronFront,
  wheel,
  slab,
  comet,
  bomb,
  stone,
  shell,
  bolt,
  roofBolt,
  snowball,
  snowDrift,
  pinecone,
  hornet,
  cheeseStream,
  cheesePool,
  swingLog,
  handOpen,
  handClosed,
  gibHelmet,
  gibPlate,
  gibBoot,
  gibStick,
  coin,
  offering,
  splat1,
  splat2,
  splat3,
  drop1,
  dust,
  spark,
  star,
  flame1,
  flame2,
  flame3,
  iceBlock,
  shieldBubble,
  banner,
  iconWheel,
  iconStomper,
  iconComet,
  iconMortar,
  iconFrost,
  iconBellows,
  iconBolter,
  iconPause,
  iconLocked,
  iconCastle,
  ...KING_ART,
  ...CASTLE_ART,
};
