/**
 * What every kind of weapon must be able to do. One small class per kind implements this;
 * the numbers come from the weapon's tier in src/config/weapons.ts.
 */
import type { SimContext } from '../context';
import type { DelayedShot, Enemy } from '../types';

/** One tap on a weapon: who tapped, which slot, and where the weapon sits on the keep. */
export interface Shot {
  slot: number;
  p: number;
  x: number;
  y: number;
}

export interface WeaponBehaviour<Tier> {
  /** Fires once. Returns false when there was nothing to fire at; then no reload starts. */
  fire(ctx: SimContext, tier: Tier, shot: Shot): boolean;
  /** A later part of the same tap (second slam, next pulse), scheduled with `ctx.weapons.later`. */
  followUp?(ctx: SimContext, tier: Tier, d: DelayedShot): void;
  /** Runs every tick while the weapon stands on the keep, for weapons that act on their own. */
  tick?(ctx: SimContext, tier: Tier, shot: Shot): void;
  /** A raider struck the gate. */
  onGateStruck?(ctx: SimContext, tier: Tier, attacker: Enemy): void;
  /** A raider thrown by a hand landed hard at this spot. */
  onLethalLanding?(ctx: SimContext, tier: Tier, x: number, y: number, p: number): void;
}
