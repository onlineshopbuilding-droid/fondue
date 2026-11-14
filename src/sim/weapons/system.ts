// Part of the simulation: the weapons in the keep's slots, fired by a tap and reloading afterwards.
import { DT } from '../../config/field';
import { SLOTS, SLOT_COUNT } from '../../config/slots';
import { firesOnItsOwn, weaponById, type WeaponDef } from '../../config/weapons';
import type { SimContext } from '../context';
import type { DelayedShot, Enemy } from '../types';
import type { Shot } from './behaviour';
import { BEHAVIOURS } from './behaviours';

/**
 * The weapons on the keep: one per slot, fired by a tap, reloading afterwards. Passive weapons
 * (`firesOnItsOwn`) fire by themselves as soon as they are reloaded and have a target. What a weapon
 * does when it fires is decided by the behaviour class of its kind; this class only runs the slots.
 * A tap on a slot is a weapon command and never grabs a raider (the hand code keeps them apart).
 */
export class WeaponSystem {
  constructor(private ctx: SimContext) {}

  slotPosition(slot: number) { return SLOTS[slot]; }

  /** The numbers of a weapon at the tier it has in this run. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tierData(def: WeaponDef): any { return def.tiers[Math.max(1, Math.min(def.tiers.length, this.ctx.tierOf(def.id))) - 1]; }

  private shot(slot: number, p: number): Shot { return { slot, p, x: SLOTS[slot].x, y: SLOTS[slot].y }; }

  /** A tap on a slot. */
  fireSlot(p: number, slot: number) {
    const s = this.ctx.s;
    if (!s.hands[p] || s.phase !== 'battle' || s.paused) return;
    const def = this.ctx.weaponIn(slot);
    if (!def || s.cooldowns[slot] > 0) { this.ctx.emit({ e: 'denied', p }); return; }
    if (!this.trigger(def, slot, p)) this.ctx.emit({ e: 'denied', p });
  }

  /** Fires the weapon in a slot if it has something to fire at, and starts its reload. */
  private trigger(def: WeaponDef, slot: number, p: number): boolean {
    const s = this.ctx.s;
    const tier = this.tierData(def);
    if (!BEHAVIOURS[def.kind].fire(this.ctx, tier, this.shot(slot, p))) return false;
    s.cooldowns[slot] = tier.cooldown;
    s.cooldownMax[slot] = tier.cooldown;
    this.ctx.stats.weaponFired(def.id);
    this.ctx.emit({ e: 'fire', slot, weapon: def.id, tier: this.ctx.tierOf(def.id), p });
    return true;
  }

  /** Schedules a later part of the same tap. */
  later(shot: Shot, step: number, seconds: number, x: number) {
    const def = this.ctx.weaponIn(shot.slot);
    if (!def) return;
    this.ctx.s.delayed.push({ t: seconds, slot: shot.slot, weapon: def.id, tier: this.ctx.tierOf(def.id), step, x, p: shot.p });
  }

  private runDelayed(d: DelayedShot) {
    const def = weaponById(d.weapon);
    if (!def) return;
    BEHAVIOURS[def.kind].followUp?.(this.ctx, def.tiers[d.tier - 1], d);
  }

  tick() {
    const s = this.ctx.s;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      if (s.cooldowns[slot] > 0) {
        s.cooldowns[slot] -= DT;
        if (s.cooldowns[slot] <= 0) {
          s.cooldowns[slot] = 0;
          this.ctx.emit({ e: 'weaponReady', slot });
        }
      }
      const def = this.ctx.weaponIn(slot);
      if (!def) continue;
      BEHAVIOURS[def.kind].tick?.(this.ctx, this.tierData(def), this.shot(slot, -1));
      // Passive weapons fire on their own once reloaded; with nothing to aim at they wait, ready.
      if (firesOnItsOwn(def) && s.cooldowns[slot] <= 0 && s.phase === 'battle' && !s.paused && !s.hold) this.trigger(def, slot, -1);
    }
    if (s.delayed.length > 0) {
      for (const d of s.delayed) d.t -= DT;
      const due = s.delayed.filter((d) => d.t <= 0);
      s.delayed = s.delayed.filter((d) => d.t > 0);
      for (const d of due) this.runDelayed(d);
    }
    if (s.goldRushT > 0) s.goldRushT = Math.max(0, s.goldRushT - DT);
    if (s.beaconT > 0) s.beaconT = Math.max(0, s.beaconT - DT);
    if (s.airStopT > 0) s.airStopT = Math.max(0, s.airStopT - DT);
    for (let p = 0; p < s.extraHandT.length; p++) if (s.extraHandT[p] > 0) s.extraHandT[p] = Math.max(0, s.extraHandT[p] - DT);
    if (s.gripT > 0) {
      s.gripT = Math.max(0, s.gripT - DT);
      if (s.gripT === 0) { s.gripStrength = 1; s.gripLethal = 1; }
    }
    if (s.mendT > 0) {
      s.mendT = Math.max(0, s.mendT - DT);
      if (s.gateHp > 0) s.gateHp = Math.min(s.gateMax, s.gateHp + s.gateMax * s.mendRate * DT);
    }
  }

  /** Hand strength factor of the Iron Grip (1 without it). Read by SimContext.strengthOf. */
  gripStrength(): number { return this.ctx.s.gripT > 0 ? this.ctx.s.gripStrength : 1; }

  /** Factor on the lethal impact speed of a throw (below 1 while the Iron Grip holds). Read by Flight. */
  lethalFactor(): number { return this.ctx.s.gripT > 0 ? this.ctx.s.gripLethal : 1; }

  /** Clears everything that must not carry over into the next day. */
  resetForDay() {
    const s = this.ctx.s;
    for (let slot = 0; slot < SLOT_COUNT; slot++) { s.cooldowns[slot] = 0; s.cooldownMax[slot] = 0; }
    s.delayed = [];
    s.goldRushT = 0; s.goldRushFactor = 1; s.beaconT = 0; s.airStopT = 0; s.sentryT = 1; s.sentryBurst = 0;
    s.extraHandT.fill(0); s.extraHandStrength = 0; s.gripT = 0; s.gripStrength = 1; s.gripLethal = 1; s.mendT = 0; s.mendRate = 0;
  }

  private eachBuilt(run: (def: WeaponDef, slot: number) => void) {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const def = this.ctx.weaponIn(slot);
      if (def) run(def, slot);
    }
  }

  onGateStruck(attacker: Enemy) {
    this.eachBuilt((def) => BEHAVIOURS[def.kind].onGateStruck?.(this.ctx, this.tierData(def), attacker));
  }

  onLethalLanding(x: number, y: number, p: number) {
    this.eachBuilt((def) => BEHAVIOURS[def.kind].onLethalLanding?.(this.ctx, this.tierData(def), x, y, p));
  }

  /** How far the cracks of a shattered raider run: set by the Frost Horn on the keep, 0 without it. */
  shatterSpread(): number {
    let spread = 0;
    this.eachBuilt((def) => { if (def.kind === 'shell') spread = Math.max(spread, this.tierData(def).shatterSpread ?? 0); });
    return spread;
  }
}
