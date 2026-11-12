/**
 * How weapons pick their target on their own, since they are only tapped: the raider closest to
 * the gate, the densest group, or the toughest raider. All answers come from the visible field.
 */
import { ENEMIES, TARGETING } from '../../config/enemies';
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

/** A tough raider draws fire like a small group: a Yeti or a cart must not be ignored for three Pothelms. */
const crowdWeight = (e: Enemy) => (e.big ? TARGETING.bigWeight : TARGETING.crowdWeight[e.type] ?? 1);

/**
 * Middle of the densest group of raiders on the ground, tough raiders counted several times, measured with a window of the given half
 * width; null when the road is empty. With several equal groups the one nearest the gate wins.
 */
export function crowdX(ctx: SimContext, halfWidth: number, lead = 0): number | null {
  const list = groundTargets(ctx).map((e) => ({ x: leadX(ctx, e, lead), w: crowdWeight(e) })).sort((a, b) => a.x - b.x);
  if (list.length === 0) return null;
  let best = list[0].x;
  let bestWeight = 0;
  let lo = 0;
  let sum = 0;
  // Slide a window of full width over the sorted positions.
  for (let hi = 0; hi < list.length; hi++) {
    sum += list[hi].w;
    while (list[hi].x - list[lo].x > halfWidth * 2) { sum -= list[lo].w; lo++; }
    if (sum > bestWeight) { bestWeight = sum; best = (list[lo].x + list[hi].x) / 2; }
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
