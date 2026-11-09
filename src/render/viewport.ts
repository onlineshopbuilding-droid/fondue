import { WORLD } from '../config/world';

export interface SafeArea { left: number; right: number; top: number; bottom: number; }

/**
 * What the player's screen shows of the world. The world itself is always 1280x720, so rules and
 * co-op are the same for everyone. A wider screen sees more land on the left, a squarer one more
 * sky above; the right and bottom edges stay put, so enemies still enter from out of sight.
 */
export interface GameView {
  /** Visible size in world units. */
  width: number;
  height: number;
  /** World coordinate of the screen's top-left corner; zero or negative. */
  offsetX: number;
  offsetY: number;
  /** CSS pixels per world unit. */
  cssPerUnit: number;
  /** Size of the weapon row and of the top bars, so that fingers can hit them on small screens. */
  hudScale: number;
  topScale: number;
  /** Notch and home-bar margins in world units. */
  safeLeft: number;
  safeRight: number;
  safeTop: number;
  safeBottom: number;
}

/** Wider than this would run out of landscape art. Phones with browser bars reach about 2.7. */
export const MAX_ASPECT = 2.8;
/** Squarer than this would run out of sky. */
const MIN_ASPECT = 4 / 3;
/** Art diameter of a weapon icon at scale 1, and the size it should have under a finger. */
const SLOT_DIAMETER = 64;
const FINGER_CSS = 52;
const MAX_HUD_SCALE = 1.7;
const MAX_TOP_SCALE = 1.3;

export function computeView(cssWidth: number, cssHeight: number, safe: SafeArea = { left: 0, right: 0, top: 0, bottom: 0 }): GameView {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const aspect = w / h;
  const base = WORLD.width / WORLD.height;
  let width: number = WORLD.width;
  let height: number = WORLD.height;
  if (aspect > base) width = Math.round(WORLD.height * Math.min(aspect, MAX_ASPECT));
  else if (aspect < base) height = Math.round(WORLD.width / Math.max(aspect, MIN_ASPECT));
  const cssPerUnit = Math.min(w / width, h / height);
  const hudScale = Math.min(MAX_HUD_SCALE, Math.max(1, FINGER_CSS / (SLOT_DIAMETER * cssPerUnit)));
  return {
    width,
    height,
    offsetX: WORLD.width - width,
    offsetY: WORLD.height - height,
    cssPerUnit,
    hudScale,
    topScale: Math.min(MAX_TOP_SCALE, hudScale),
    safeLeft: safe.left / cssPerUnit,
    safeRight: safe.right / cssPerUnit,
    safeTop: safe.top / cssPerUnit,
    safeBottom: safe.bottom / cssPerUnit,
  };
}

/** Reads the notch and home-bar margins the browser reports. */
export function readSafeArea(): SafeArea {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const c = getComputedStyle(probe);
  const safe = { left: parseFloat(c.paddingLeft) || 0, right: parseFloat(c.paddingRight) || 0, top: parseFloat(c.paddingTop) || 0, bottom: parseFloat(c.paddingBottom) || 0 };
  probe.remove();
  return safe;
}

export function sameView(a: GameView, b: GameView): boolean {
  return a.width === b.width && a.height === b.height && Math.abs(a.cssPerUnit - b.cssPerUnit) < 1e-4
    && a.safeLeft === b.safeLeft && a.safeRight === b.safeRight && a.safeTop === b.safeTop && a.safeBottom === b.safeBottom;
}
