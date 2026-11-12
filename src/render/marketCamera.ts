/**
 * Where the camera looks: the fight view (the keep at the left edge, E-021) or the market view,
 * which moves a little closer to the keep and also shows its west wing left of x = 0.
 * Pure numbers, so the move can be tested without a browser.
 */
import { WORLD, perchX } from '../config/field';
import type { GameView } from './viewport';

/** How much closer the market comes: the visible width and height shrink by this factor. */
export const MARKET_ZOOM = 1.1;
/** World x of the market view's left edge: just past the end tower of the west wing. */
export const MARKET_LEFT = -392;
/** World y of the market view's bottom edge: the road in front of the gate stays in sight. */
export const MARKET_BOTTOM = 692;
/** Seconds the camera takes from the fight to the market and back. */
export const MARKET_SECONDS = 0.7;
/** In the market the eagle hook hangs this far left of the view's right edge and below its top. */
const HOOK_INSET = { right: 128, top: 74 };

/** A part of the world on screen: left, top, width and height in world units. */
export interface CamRect { x: number; y: number; w: number; h: number }

export const fightRect = (v: GameView): CamRect => ({ x: v.offsetX, y: v.offsetY, w: v.width, h: v.height });

export function marketRect(v: GameView): CamRect {
  const w = v.width / MARKET_ZOOM;
  const h = v.height / MARKET_ZOOM;
  return { x: MARKET_LEFT, y: MARKET_BOTTOM - h, w, h };
}

/** Eased in and out, so the camera starts and stops softly. */
export const ease = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/** The view between fight (k = 0) and market (k = 1). */
export function camAt(v: GameView, k: number): CamRect {
  const a = fightRect(v);
  const b = marketRect(v);
  const e = ease(k);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e };
}

/** Moves the blend towards the market (or back) for one frame. */
export function stepMarket(k: number, inMarket: boolean, dt: number): number {
  const step = dt / MARKET_SECONDS;
  return inMarket ? Math.min(1, k + step) : Math.max(0, k - step);
}

/**
 * The eagle hook: in the fight it hangs over the far end of the field; in the market, where that
 * end is out of sight, it hangs in the top right corner of the view. Returns the hook's top.
 */
export function hookAt(v: GameView, fieldW: number, k: number): { x: number; top: number } {
  const fight = { x: perchX(fieldW), top: WORLD.perch.hookY - 112 };
  const m = marketRect(v);
  const market = { x: m.x + m.w - HOOK_INSET.right, top: m.y + HOOK_INSET.top };
  const e = ease(k);
  return { x: fight.x + (market.x - fight.x) * e, top: fight.top + (market.top - fight.top) * e };
}
