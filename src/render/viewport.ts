import { WORLD, fieldForAspect } from '../config/world';

export interface SafeArea { left: number; right: number; top: number; bottom: number; }

/**
 * What the player's screen shows of the world. The keep is always at the left edge and the road
 * at the bottom. The field fills the width; what is left over is sky above, or trimmed sky when a
 * screen is wider than the field the host decided on.
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
  /** Width of the field this view shows. */
  fieldW: number;
  /** Size of the top bars, so that fingers can hit them on small screens. */
  hudScale: number;
  topScale: number;
  /** Notch and home-bar margins in world units. */
  safeLeft: number;
  safeRight: number;
  safeTop: number;
  safeBottom: number;
}

/** Keep at least this much of the world's height; a wider screen shows scenery beyond the field instead. */
export const MIN_VIEW_HEIGHT = 600;
/** Wider than this would run out of landscape art. Phones with browser bars reach about 2.7. */
export const MAX_ASPECT = 2.8;
/** Squarer than this would run out of sky. */
const MIN_ASPECT = 4 / 3;
/** Art diameter of a weapon icon at scale 1, and the size it should have under a finger. */
const SLOT_DIAMETER = 64;
const FINGER_CSS = 52;
const MAX_HUD_SCALE = 1.7;
const MAX_TOP_SCALE = 1.3;

export function computeView(cssWidth: number, cssHeight: number, safe: SafeArea = { left: 0, right: 0, top: 0, bottom: 0 }, field?: number): GameView {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, w / h));
  const fieldW = field ?? fieldForAspect(aspect);
  let width = fieldW;
  let height = Math.round(fieldW / aspect);
  if (height < MIN_VIEW_HEIGHT) {
    height = MIN_VIEW_HEIGHT;
    width = Math.round(height * aspect);
  }
  const cssPerUnit = Math.min(w / width, h / height);
  const hudScale = Math.min(MAX_HUD_SCALE, Math.max(1, FINGER_CSS / (SLOT_DIAMETER * cssPerUnit)));
  return {
    width,
    height,
    offsetX: 0,
    offsetY: WORLD.height - height,
    cssPerUnit,
    fieldW,
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
  return a.width === b.width && a.height === b.height && a.fieldW === b.fieldW && Math.abs(a.cssPerUnit - b.cssPerUnit) < 1e-4
    && a.safeLeft === b.safeLeft && a.safeRight === b.safeRight && a.safeTop === b.safeTop && a.safeBottom === b.safeBottom;
}
