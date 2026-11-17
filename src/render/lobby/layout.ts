/**
 * The lobby, the hall inside the keep: small pure functions over the layout in src/config/lobby.ts
 * (where everything stands and how the hall looks at each castle tier). The scene only draws what
 * these return.
 */
import { TIER_MAX as CASTLE_TIER_MAX, TIER_MIN as CASTLE_TIER_MIN } from '../../config/tiers';
import { HALL_LOOK, ROOM, SAFE_W, STATIONS, type DecorDef, type HallLook, type StationDef } from '../../config/lobby';

export {
  ROOM, SAFE_W, STATIONS, HALL_LOOK, HALL_LINES, HALL_PIECES, KING_SPOT, KING_GROUP, NAME_BANNER, WEAPON_PEGS, WEAPON_SIZE,
  type StationId, type StationDef, type DecorDef, type HallLook,
} from '../../config/lobby';

export const SAFE_LEFT = (ROOM.w - SAFE_W) / 2;

/** The castle tier as a valid index 1..7. */
export function hallTier(castleTier: number): number {
  return Math.max(CASTLE_TIER_MIN, Math.min(CASTLE_TIER_MAX, Math.round(castleTier) || CASTLE_TIER_MIN));
}

/** How the hall looks at this castle tier. */
export function hallLook(castleTier: number): HallLook {
  return HALL_LOOK[hallTier(castleTier) - 1];
}

/** The decor pieces the hall shows at this castle tier. */
export function decorFor(castleTier: number): readonly DecorDef[] {
  return hallLook(castleTier).decor;
}

/** Art names the hall at this tier is built from (tier pictures; shared pieces are made at boot). */
export function hallArtNames(castleTier: number): string[] {
  const t = hallTier(castleTier);
  const tables = STATIONS.filter((s) => s.tiered).map((s) => `${s.art}${t}`);
  return [`wall${t}`, `floor${t}`, `ceiling${t}`, `window${t}`, `door${t}`, `cauldron${t}`, ...tables];
}

/** The picture a station shows: its tier version, or the broken one while it is still closed. */
export function stationArt(def: StationDef, castleTier: number, open: boolean): string {
  if (!open && def.brokenArt) return def.brokenArt;
  return def.tiered ? `${def.art}${hallTier(castleTier)}` : def.art;
}

/** The banner text above the King: castle name and tier. */
export function bannerText(castleTier: number): { name: string; tier: string } {
  return { name: hallLook(castleTier).name, tier: `Castle tier ${hallTier(castleTier)}` };
}

/** Lines whose level range contains `levelDone`. */
export function linesFor<T extends { minLevel: number; maxLevel: number }>(lines: readonly T[], levelDone: number): T[] {
  return lines.filter((l) => levelDone >= l.minLevel && levelDone <= l.maxLevel);
}

/** A random remark, never the same as the last one if there is a choice. */
export function pickLine(lines: readonly string[], last: string, rnd: () => number = Math.random): string {
  if (lines.length === 0) return '';
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/** The part of the room a canvas of `gw` x `gh` pixels shows: the safe part always fits, centred. */
export function fitRoom(gw: number, gh: number): { zoom: number; x: number; y: number; w: number; h: number } {
  const zoom = Math.min(gw / SAFE_W, gh / ROOM.h);
  const w = gw / zoom;
  const h = gh / zoom;
  return { zoom, x: ROOM.w / 2 - w / 2, y: ROOM.h / 2 - h / 2, w, h };
}

/** Where a station stands for a view of the room: corner stations follow the view's top right corner. */
export function stationPos(def: StationDef, view: { x: number; y: number; w: number }): { x: number; y: number; lx: number; ly: number } {
  if (!def.corner) return { x: def.x, y: def.y, lx: def.lx, ly: def.ly };
  const right = Math.min(ROOM.w, view.x + view.w);
  const top = Math.max(0, view.y);
  return { x: right - def.x, y: top + def.y, lx: right - def.lx, ly: top + def.ly };
}
