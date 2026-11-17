/**
 * All pictures of the lobby, the hall inside the keep, by name. The asset directory registers them
 * as `lobby:<name>`. LOBBY_ART is made at boot (pieces every hall uses); LOBBY_HALL_ART holds the
 * pictures of one castle tier each (walls, floor, ceiling, windows, door, cauldron, tables: `wall3`,
 * `mapTable3`, …) and is made when the hall of that tier is first shown.
 */
import type { Art } from '../types';
import { lobbyFlame } from './room';
import { armourStand, cogPlaque } from './furniture';
import { king } from './king';
import { knight } from './guards';
import { banner, chandelier, cheeseStack, garland, goldenForks, nameBanner, rug, throneArt, throneGold, trophyShield } from './decor';
import { HALL_SHELL_ART } from './hall';
import { TABLE_ART } from './tables';
import { TREASURE_ART } from './treasures';

export const lobbyKey = (name: string) => `lobby:${name}`;

/** The hall pieces drawn at world size (texture scale 1): they are big, and plain at that size. */
export const LOBBY_WORLD_SIZE = (name: string) => /^(wall|floor|ceiling)\d$/.test(name);

/** Made at boot. */
export const LOBBY_ART: Record<string, Art> = {
  flame: lobbyFlame,
  cogPlaque, armourStand,
  king, knight,
  throne: throneArt, throneGold, rug, banner, trophyShield, chandelier, cheeseStack, goldenForks, garland, nameBanner,
  ...TREASURE_ART,
  coopTableBroken: TABLE_ART.coopTableBroken,
  endlessTableBroken: TABLE_ART.endlessTableBroken,
};

/** One castle tier each, made on demand (src/render/lobby/hallTextures.ts). */
export const LOBBY_HALL_ART: Record<string, Art> = {
  ...HALL_SHELL_ART,
  ...Object.fromEntries(Object.entries(TABLE_ART).filter(([name]) => !name.endsWith('Broken'))),
};
