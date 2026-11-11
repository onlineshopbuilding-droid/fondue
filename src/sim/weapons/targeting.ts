/**
 * How weapons pick their target on their own, since they are only tapped: the raider closest to
 * the gate, the densest group, or the toughest raider. All answers come from the visible field.
 */
import { ENEMIES } from '../../config/enemies';
import { WORLD } from '../../config/field';
import type { SimContext } from '../context';
import type { Enemy } from '../types';

/** A raider a weapon may aim at: alive, on the field, not already in a hand, on the hook or in the pot. */
export function targetable(ctx: SimContext, e: Enemy): boolean {
  if (e.dead || e.hidden) return false;
  if (e.st === 'held' || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') return false;
  return e.x <= ctx.s.meta.fieldW + 10;
}

export function groundTargets(ctx: SimContext): Enemy[] {
  return ctx.s.enemies.filter((e) => targetable(ctx, e) && ctx.enemies.isGrounded(e));
}

export function allTargets(ctx: SimContext): Enemy[] {
  return ctx.s.enemies.filter((e) => targetable(ctx, e));
}

/** Where a raider will be after `lead` seconds if it keeps walking. */
export function leadX(ctx: SimContext, e: Enemy, lead: number): number {
  if (lead <= 0 || (e.st !== 'walk' && e.st !== 'hop')) return e.x;
  return Math.max(WORLD.gateX + ENEMIES[e.type].range, e.x - ctx.speedOf(e) * lead);
}

/** The raider closest to the gate, or null. */
export function frontTarget(ctx: SimContext, withAir: boolean): Enemy | null {
  let best: Enemy | null = null;
  for (const e of withAir ? allTargets(ctx) : groundTargets(ctx)) if (!best || e.x < best.x) best = e;
  return best;
}

/**
 * Middle of the densest group of raiders on the ground, measured with a window of the given half
 * width; null when the road is empty. With several equal groups the one nearest the gate wins.
 */
export function crowdX(ctx: SimContext, halfWidth: number, lead = 0): number | null {
  const xs = groundTargets(ctx).map((e) => leadX(ctx, e, lead)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  let best = xs[0];
  let bestCount = 0;
  let lo = 0;
  // Slide a window of full width over the sorted positions.
  for (let hi = 0; hi < xs.length; hi++) {
    while (xs[hi] - xs[lo] > halfWidth * 2) lo++;
    const count = hi - lo + 1;
    if (count > bestCount) { bestCount = count; best = (xs[lo] + xs[hi]) / 2; }
  }
  return best;
}

/** The raider with the most hit points left, in the air or on the ground. */
export function toughTarget(ctx: SimContext): Enemy | null {
  let best: Enemy | null = null;
  for (const e of allTargets(ctx)) if (!best || e.hp > best.hp) best = e;
  return best;
}

/** Middle of a raider's body, where bolts and lightning hit. */
export const bodyY = (e: Enemy) => e.y - ENEMIES[e.type].height * 0.5;
