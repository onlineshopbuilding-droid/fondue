/**
 * The camera move between the battlefield and the lobby inside the keep. Pure numbers, so the move
 * can be tested without a browser.
 *
 * One value `k` describes the whole move: 0 is the battlefield, 1 is the lobby. On the way in the
 * battle camera dives into the keep's gate first and the lobby fades in over the last part; on the
 * way out the same curves run backwards, so the lobby fades first and the camera pulls back out.
 */
import { WORLD } from '../../config/field';
import { LOBBY_MOVE } from '../../config/lobby';
import { ease, type CamRect } from '../camera';

/** Seconds of the whole move, in or out (from src/config/lobby.ts). */
export const LOBBY_SECONDS = LOBBY_MOVE.seconds;
/** The world point the camera dives into: the middle of the keep's gate. */
export const KEEP_GATE = { x: WORLD.gateX - 38, y: WORLD.groundY - 62 };
/** At the end of the dive the view is this fraction of its normal width (from src/config/lobby.ts). */
export const DIVE_END = LOBBY_MOVE.diveEnd;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** How far the battle camera has dived into the gate (0 to 1) at move position `k`. */
export const diveOf = (k: number) => ease(clamp01(k / LOBBY_MOVE.diveShare));
/** How visible the lobby is (0 to 1) at move position `k`. */
export const fadeOf = (k: number) => ease(clamp01((k - LOBBY_MOVE.fadeFrom) / LOBBY_MOVE.fadeShare));

/** Moves `k` one frame towards the lobby (`inLobby`) or towards the battlefield. */
export function stepLobby(k: number, inLobby: boolean, dt: number): number {
  const step = dt / LOBBY_SECONDS;
  return inLobby ? Math.min(1, k + step) : Math.max(0, k - step);
}

/**
 * The battle camera `cam` dived into the gate by `d` (0: unchanged, 1: right at the gate). The
 * zoom grows evenly (geometric), and the gate glides from where it is on screen to the middle.
 */
export function diveRect(cam: CamRect, d: number, target = KEEP_GATE): CamRect {
  if (d <= 0) return cam;
  const e = clamp01(d);
  const s = Math.pow(DIVE_END, e);
  const w = cam.w * s;
  const h = cam.h * s;
  const fx = (target.x - cam.x) / cam.w;
  const fy = (target.y - cam.y) / cam.h;
  const gx = fx + (0.5 - fx) * e;
  const gy = fy + (0.5 - fy) * e;
  return { x: target.x - gx * w, y: target.y - gy * h, w, h };
}
