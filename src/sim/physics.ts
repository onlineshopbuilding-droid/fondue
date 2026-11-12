/**
 * The throw and hold maths that host and guest must compute identically (handbook, trap 4).
 * Pure functions: `Hands` and `Flight` use them for the real game, `GuestSession` for its prediction.
 */
import { BEHAVIOUR, ENEMIES, type EnemyType } from '../config/enemies';
import { HANDS, HAND_RULES } from '../config/hand';
import type { Tuning } from '../config/tuning';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Weight of a raider as the hand feels it. */
export function massOfType(type: EnemyType, big: boolean, crow: boolean): number {
  if (crow) return BEHAVIOUR.crowMass;
  return ENEMIES[type].mass * (big ? BEHAVIOUR.big.mass : 1);
}

export const handStrength = (tier: number): number => HANDS[clamp(Math.round(tier), 1, HANDS.length) - 1].strength;

/** Share of the swipe speed that reaches a raider of this mass: 1 for light ones, less for heavy ones. */
export function throwFactor(mass: number, strength: number): number {
  return clamp(Math.pow(strength / mass, HAND_RULES.power), HAND_RULES.minThrow, 1);
}

/** Share of the hold spring: heavy raiders follow the hand more sluggishly. */
export function followFactor(mass: number, strength: number): number {
  return clamp(strength / mass, HAND_RULES.minFollow, 1);
}

/** Turns the measured swipe into the launch velocity: tuning, weight, and the speed limit. */
export function launchVelocity(vx: number, vy: number, tuning: Tuning, factor: number): { vx: number; vy: number } {
  let ax = vx * tuning.throwMult * factor;
  let ay = vy * tuning.throwMult * factor;
  const sp = Math.hypot(ax, ay);
  const max = tuning.maxThrow * Math.max(factor, 0.62);
  if (sp > max) { ax *= max / sp; ay *= max / sp; }
  return { vx: ax, vy: ay };
}

/**
 * A sideways fling from road height would land in its first tick; it gets a low arc instead.
 * Returns the new height and vertical speed, or null when the throw stays as it is.
 */
export function liftFlat(y: number, ground: number, vx: number, vy: number): { y: number; vy: number } | null {
  const speed = Math.abs(vx);
  if (ground - y >= 20 || speed <= 250 || vy > speed * 0.5 || vy < -speed * 0.25) return null;
  return { y: ground - 22, vy: -speed * 0.25 };
}

/** One step of the damped spring that pulls a held raider towards the hand. Changes `body` in place. */
export function springStep(body: { x: number; y: number; vx: number; vy: number }, tx: number, ty: number, stiffness: number, dt: number) {
  const c = 2 * Math.sqrt(stiffness) * 0.72;
  body.vx += (stiffness * (tx - body.x) - c * body.vx) * dt;
  body.vy += (stiffness * (ty - body.y) - c * body.vy) * dt;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}
