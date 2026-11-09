import { AIM, type HornId, type WeaponSlot } from '../config/shop';
import { WORLD } from '../config/world';

export type AimSlot = 'bolter' | 'horn';

/** What letting go right now would do. The renderer draws this, the rules fire this. */
export interface AimShot {
  kind: 'line' | 'arc';
  ok: boolean;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** 0 at the shortest valid pull, 1 at full pull. */
  strength: number;
  /** Line shots: how far the bolt flies before it is spent. */
  range: number;
  /** Multiplies damage. */
  power: number;
  /** Where it comes down. */
  landX: number;
  landY: number;
  /** Seconds in the air for an arc. */
  flight: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const RAD = Math.PI / 180;
export const AIM_LAND_Y = WORLD.groundY + 22;

export const isAimSlot = (slot: WeaponSlot): slot is AimSlot => slot === 'bolter' || slot === 'horn';

/** How long the pull is, from 0 (inside the dead zone) to 1 (full). */
export function pullStrength(dist: number): number {
  return clamp((dist - AIM.deadzone) / (AIM.maxPull - AIM.deadzone), 0, 1);
}

/**
 * The band stretches from the weapon to the hand: the direction of the pull picks the direction of
 * the shot, the length of the pull picks reach and force. A pull that stays inside the dead zone
 * is not a shot, so a player can always change their mind by moving back to the weapon.
 */
export function aimShot(slot: AimSlot, horn: HornId | null, px: number, py: number, fieldW: number, gravity: number): AimShot {
  const { x: x0, y: y0 } = WORLD.slots[slot];
  const dx = px - x0;
  const dy = py - y0;
  const dist = Math.hypot(dx, dy);
  const ok = dist > AIM.deadzone;
  const strength = pullStrength(dist);
  if (slot === 'bolter') {
    const a = AIM.bolter;
    const deg = clamp(Math.atan2(dy, Math.max(1, dx)) / RAD, a.minDownDeg, a.maxDownDeg) * RAD;
    const speed = a.minSpeed + (a.maxSpeed - a.minSpeed) * strength;
    const reach = fieldW - x0 + 60;
    const range = a.minRange + (reach - a.minRange) * strength;
    let landX = x0 + Math.cos(deg) * range;
    let landY = y0 + Math.sin(deg) * range;
    if (landY > AIM_LAND_Y) {
      const k = (AIM_LAND_Y - y0) / (landY - y0);
      landX = x0 + (landX - x0) * k;
      landY = AIM_LAND_Y;
    }
    return {
      kind: 'line', ok, x0, y0, vx: Math.cos(deg) * speed, vy: Math.sin(deg) * speed, strength, range,
      power: a.minPower + (a.maxPower - a.minPower) * strength, landX, landY, flight: range / speed,
    };
  }
  const a = AIM[horn ?? 'mortar'];
  const elev = clamp(Math.atan2(-dy, Math.max(1, dx)) / RAD, a.minDeg, a.maxDeg) * RAD;
  // The reach of a throw grows with the square of its speed; the root makes the pull feel linear.
  const top = Math.sqrt(gravity * Math.max(200, fieldW - x0 + 40) / Math.sin(2 * a.minDeg * RAD));
  const speed = top * Math.sqrt(Math.max(0.015, strength));
  const vx = Math.cos(elev) * speed;
  const vy = -Math.sin(elev) * speed;
  const flight = (-vy + Math.sqrt(vy * vy + 2 * gravity * (AIM_LAND_Y - y0))) / gravity;
  return {
    kind: 'arc', ok, x0, y0, vx, vy, strength, range: 0, power: 1,
    landX: x0 + vx * flight, landY: AIM_LAND_Y, flight,
  };
}

/** Where to hold the hand to land near a target; used by bots, and handy for tests. */
export function pointerFor(slot: AimSlot, horn: HornId | null, targetX: number, fieldW: number, gravity: number): { x: number; y: number } {
  const { x: x0, y: y0 } = WORLD.slots[slot];
  if (slot === 'bolter') {
    // Aim the bolt into the feet of the crowd at full pull.
    const dx = Math.max(60, targetX - x0);
    const dy = WORLD.groundY - 20 - y0;
    const n = Math.hypot(dx, dy) || 1;
    return { x: x0 + (dx / n) * AIM.maxPull, y: y0 + (dy / n) * AIM.maxPull };
  }
  const a = AIM[horn ?? 'mortar'];
  const ang = a.minDeg * RAD;
  const at = (s: number) => ({ x: x0 + Math.cos(ang) * (AIM.deadzone + (AIM.maxPull - AIM.deadzone) * s), y: y0 - Math.sin(ang) * (AIM.deadzone + (AIM.maxPull - AIM.deadzone) * s) });
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const p = at(mid);
    if (aimShot(slot, horn, p.x, p.y, fieldW, gravity).landX < targetX) lo = mid; else hi = mid;
  }
  return at((lo + hi) / 2);
}

/** Which weapon a press lands on. Nearest zone wins; zones never reach the road in front of the gate. */
export function slotAt(x: number, y: number, radius: number, owned: (slot: WeaponSlot) => boolean): WeaponSlot | null {
  if (x > WORLD.slotZoneMaxX) return null;
  let best: WeaponSlot | null = null;
  let bestD = radius;
  for (const slot of Object.keys(WORLD.slots) as WeaponSlot[]) {
    if (!owned(slot)) continue;
    const d = Math.hypot(x - WORLD.slots[slot].x, y - WORLD.slots[slot].y);
    if (d <= bestD) { bestD = d; best = slot; }
  }
  return best;
}
