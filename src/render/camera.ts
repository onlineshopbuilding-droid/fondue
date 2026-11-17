/**
 * Where the camera looks in a fight: the keep at the left edge (E-021), the road to the right.
 * Pure numbers, so it can be tested without a browser. The lobby's dive into the keep builds on it
 * (src/render/lobby/dive.ts).
 */
import { WORLD, perchX } from '../config/field';
import type { GameView } from './viewport';

/** A part of the world on screen: left, top, width and height in world units. */
export interface CamRect { x: number; y: number; w: number; h: number }

/** The fight view of a screen shape. */
export const fightRect = (v: GameView): CamRect => ({ x: v.offsetX, y: v.offsetY, w: v.width, h: v.height });

/** Eased in and out, so a camera move starts and stops softly. */
export const ease = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/** The eagle hook hangs over the far end of the field. Returns where it hangs and its top. */
export const hookAt = (fieldW: number): { x: number; top: number } => ({ x: perchX(fieldW), top: WORLD.perch.hookY - 112 });
