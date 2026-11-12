/**
 * All pictures of the lobby, the hall inside the keep, by name. The asset directory registers them
 * as `lobby:<name>`; the room itself is drawn at world size, the smaller pieces twice as fine.
 */
import type { Art } from '../types';
import { lobbyFlame, lobbyRoom } from './room';
import { armourStand, cogPlaque, feastTable, helpScroll, mapTable, painting, pot, slate, storybook } from './furniture';
import { king } from './king';
import { banner, chandelier, cheeseStack, garland, goldenForks, nameBanner, rug, throneArt, throneGold, trophyShield } from './decor';

export const lobbyKey = (name: string) => `lobby:${name}`;

/** The big room picture: texture scale 1 keeps it light to make at boot. */
export const LOBBY_ROOM = 'room';

export const LOBBY_ART: Record<string, Art> = {
  [LOBBY_ROOM]: lobbyRoom,
  flame: lobbyFlame,
  cogPlaque, storybook, helpScroll, mapTable, pot, painting, slate, feastTable, armourStand,
  king,
  throne: throneArt, throneGold, rug, banner, trophyShield, chandelier, cheeseStack, goldenForks, garland, nameBanner,
};
