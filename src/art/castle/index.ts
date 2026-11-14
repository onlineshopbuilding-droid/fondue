/**
 * Collects all castle art as `CASTLE_ART`: the seven keep stages (castle tiers 1 to 7, see tiers.ts), the west wing, night windows, ground, foreground, weather,
 * mounted weapons, the rear cauldron and the eagle perch. Keep art coordinates = world + (40, 20);
 * everything left of art x=40 is off-screen, and the light comes from the upper left.
 */
import type { Art } from '../types';
import { ink, art, centred } from '../draw';
import { type Win, windowsGlow } from './kit';
import { WINS0, tier0, WINS1, tier1, WINS2, tier2, WINS3, tier3, WINS4, tier4, keepShadow } from './keepStages';
import { tier5, tier6, glowGilded, glowTop } from './keepStagesGrand';
import { gate5, gate6 } from './gates';
import { groundMeadow, groundCanyon, groundMarsh, groundSnow, groundMeadowWest, groundCanyonWest, groundMarshWest, groundSnowWest } from './ground';
import { WEST_ART } from './westWing';
import { footMeadow, footCanyon, footMarsh, footSnow } from './foreground';
import { bolter, mortar, frost, bellows, stomper, shrine, wheelRamp } from './mounts';
import { potLedge, potRearBack, potRearFront, cheese, steam } from './cauldron';
import { potMound } from './mound';
// Gates and KEEP_PROPS are evaluated here, between cauldron and perch, exactly as in the old single file.
export { KEEP_PROPS } from './keepProps';
export { CASTLE_ART_TIERS, clampCastleTier, castleArtIndex } from './tiers';
import { hookChain, perchHook, eagleHead } from './perch';
import { SNOW_TIERS, canyonWeather, marshWeather } from './weather';

// ---------------------------------------------------------------------------------------------

const keep = (b: string): Art => art(300, 660, 0, 660, b);
export const glow = (list: Win[]): Art => art(300, 660, 0, 660, windowsGlow(list));
/** Soft shadow of the weapon's own silhouette, cast down-right onto the wall behind it. */
const WALL_SHADOW =
  '<defs><filter id="ws" x="-15%" y="-15%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>' +
  '<feOffset in="b" dx="5" dy="6" result="o"/><feComponentTransfer in="o" result="a"><feFuncA type="linear" slope=".5"/></feComponentTransfer>' +
  '<feMerge><feMergeNode in="a"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
/** Drawn on a 120 grid, placed on a 140 canvas with the same centre so the cast shadow has room. */
const mount = (b: string): Art => centred(140, 140, `${WALL_SHADOW}<g transform="translate(10 10)" filter="url(#ws)">${b}</g>`);
const weather = (b: string): Art => art(300, 660, 0, 660, ink(b));
const eagle = (open: boolean): Art => art(520, 240, 20, 120, eagleHead(open));

export const CASTLE_ART: Record<string, Art> = {
  keep0: keep(tier0()),
  keep1: keep(tier1()),
  keep2: keep(tier2()),
  keep3: keep(tier3()),
  keep4: keep(tier4()),
  keep5: keep(tier5()),
  keep6: keep(tier6()),
  keepGlow0: glow(WINS0),
  keepGlow1: glow(WINS1),
  keepGlow2: glow(WINS2),
  keepGlow3: glow(WINS3),
  keepGlow4: glow(WINS4),
  keepGlow5: keep(glowGilded()),
  keepGlow6: keep(glowTop()),
  // Gate leaves of tiers 1 to 5 are registered with the other props (props/index.ts, KEEP_PROPS).
  gate5: art(74, 150, 0, 150, gate5()),
  gate6: art(74, 150, 0, 150, gate6()),
  keepShadow,
  keepWeather_snowpine_0: weather(SNOW_TIERS[0]),
  keepWeather_snowpine_1: weather(SNOW_TIERS[1]),
  keepWeather_snowpine_2: weather(SNOW_TIERS[2]),
  keepWeather_snowpine_3: weather(SNOW_TIERS[3]),
  keepWeather_snowpine_4: weather(SNOW_TIERS[4]),
  keepWeather_snowpine_5: weather(SNOW_TIERS[5]),
  keepWeather_snowpine_6: weather(SNOW_TIERS[6]),
  keepWeather_canyon: weather(canyonWeather()),
  keepWeather_marsh: weather(marshWeather()),
  keepGround_meadow: groundMeadow,
  keepGround_canyon: groundCanyon,
  keepGround_marsh: groundMarsh,
  keepGround_snowpine: groundSnow,
  // The west wing left of the keep, seen only in the market.
  ...WEST_ART,
  keepWestGround_meadow: groundMeadowWest,
  keepWestGround_canyon: groundCanyonWest,
  keepWestGround_marsh: groundMarshWest,
  keepWestGround_snowpine: groundSnowWest,
  foot_meadow: footMeadow,
  foot_canyon: footCanyon,
  foot_marsh: footMarsh,
  foot_snowpine: footSnow,
  mountBolterReady: mount(bolter(true)),
  mountBolterEmpty: mount(bolter(false)),
  mountMortarReady: mount(mortar(true)),
  mountMortarEmpty: mount(mortar(false)),
  mountFrostReady: mount(frost(true)),
  mountFrostEmpty: mount(frost(false)),
  mountBellowsReady: mount(bellows(true)),
  mountBellowsEmpty: mount(bellows(false)),
  mountStomperReady: mount(stomper(true)),
  mountStomperEmpty: mount(stomper(false)),
  mountCometReady: mount(shrine(true)),
  mountCometEmpty: mount(shrine(false)),
  mountWheelReady: mount(wheelRamp(true)),
  mountWheelEmpty: mount(wheelRamp(false)),
  potLedge,
  potMound,
  potRearBack,
  potRearFront,
  cheese,
  steam,
  hookChain,
  perchHook,
  eagleHeadOpen: eagle(true),
  eagleHeadShut: eagle(false),
};
