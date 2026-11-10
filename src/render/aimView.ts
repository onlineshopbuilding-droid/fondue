import Phaser from 'phaser';
import { WEAPONS, type HornId } from '../config/shop';
import { WORLD } from '../config/world';
import type { ViewHand, ViewState } from '../net/snapshot';
import { AIM_LAND_Y, aimShot, type AimShot, type AimSlot } from '../sim/aim';
import type { Meta } from '../sim/types';

const RESERVE_COLOR = 0x8a8f96;
const COLORS: Record<string, number> = { bolter: 0xfff1c0, mortar: 0xf2994a, frost: 0x9fe6ff, bellows: 0xff6a3d };

/** Draws the sling band and where the shot would go, for the player's own hand and the partner's. */
export class AimView {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(60);
  }

  clear() { this.g.clear(); }

  draw(view: ViewState, meta: Meta, hand: ViewHand, x: number, y: number, isMe: boolean) {
    if (hand.mode !== 'horn' && hand.mode !== 'bolter') return;
    const slot: AimSlot = hand.mode;
    const horn = meta.hornEquipped as HornId | null;
    if (slot === 'horn' && !horn) return;
    const shot = aimShot(slot, horn, x, y, meta.fieldW, meta.tuning.gravity);
    const ready = view.cooldowns[slot] <= 0;
    const color = ready ? COLORS[slot === 'bolter' ? 'bolter' : horn!] : RESERVE_COLOR;
    const alpha = (isMe ? 1 : 0.55) * (shot.ok ? 1 : 0.4);
    this.band(slot, x, y, shot, color, alpha);
    if (!shot.ok) return;
    if (shot.kind === 'line') this.line(shot, color, alpha, meta.fieldW);
    else this.arc(shot, color, alpha, meta.tuning.gravity);
    this.landing(slot, horn, shot, color, alpha, meta);
  }

  private band(slot: AimSlot, x: number, y: number, shot: AimShot, color: number, alpha: number) {
    const g = this.g;
    const { x: ox, y: oy } = WORLD.slots[slot];
    const dx = x - ox;
    const dy = y - oy;
    const n = Math.hypot(dx, dy) || 1;
    const px = (-dy / n) * 18;
    const py = (dx / n) * 18;
    const tense = 5 + shot.strength * 3;
    // Ink outline, the band itself, then a thin light streak so it reads as a stretched rubber cord.
    for (const [w, c, a] of [[tense + 5, 0x2b2118, alpha * 0.8], [tense, color, alpha], [Math.max(1.5, tense * 0.28), 0xffffff, alpha * 0.45]] as [number, number, number][]) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(ox + px, oy + py);
      g.lineTo(x, y);
      g.lineTo(ox - px, oy - py);
      g.strokePath();
    }
    // The two pegs the band is tied to.
    for (const s of [1, -1]) {
      g.fillStyle(0x2b2118, alpha * 0.9);
      g.fillCircle(ox + px * s, oy + py * s, 6.5);
      g.fillStyle(color, alpha);
      g.fillCircle(ox + px * s, oy + py * s, 4);
    }
  }

  /** The flight path as a row of beads: ink ring, colour, a small glint. */
  private dashes(points: { x: number; y: number }[], color: number, alpha: number, width: number) {
    const g = this.g;
    const r = width * 0.72;
    g.fillStyle(0x2b2118, alpha * 0.6);
    for (let i = 1; i < points.length; i++) g.fillCircle(points[i].x, points[i].y, r + 2.2);
    g.fillStyle(color, alpha);
    for (let i = 1; i < points.length; i++) g.fillCircle(points[i].x, points[i].y, r);
    g.fillStyle(0xffffff, alpha * 0.55);
    for (let i = 1; i < points.length; i++) g.fillCircle(points[i].x - r * 0.3, points[i].y - r * 0.3, r * 0.35);
  }

  private line(shot: AimShot, color: number, alpha: number, fieldW: number) {
    const endX = Math.min(shot.landX, fieldW + 40);
    const steps = 22;
    const pts = Array.from({ length: steps + 1 }, (_, i) => ({
      x: shot.x0 + ((endX - shot.x0) * i) / steps,
      y: shot.y0 + ((shot.landY - shot.y0) * i) / steps,
    }));
    this.dashes(pts, color, alpha, 5);
  }

  private arc(shot: AimShot, color: number, alpha: number, gravity: number) {
    const steps = 34;
    const pts = Array.from({ length: steps + 1 }, (_, i) => {
      const t = (shot.flight * i) / steps;
      return { x: shot.x0 + shot.vx * t, y: shot.y0 + shot.vy * t + 0.5 * gravity * t * t };
    });
    this.dashes(pts, color, alpha, 5);
  }

  private landing(slot: AimSlot, horn: HornId | null, shot: AimShot, color: number, alpha: number, meta: Meta) {
    const g = this.g;
    const y = shot.kind === 'arc' ? AIM_LAND_Y : shot.landY;
    let radius = 34;
    if (slot === 'horn' && horn) {
      const w = WEAPONS.horn[horn];
      radius = w.kind === 'flame' ? w.halfWidth : w.radius;
    }
    const x = Math.min(shot.landX, meta.fieldW + 40);
    // A bolt that runs out in mid-air ends in a tick; only what reaches the road gets a ring.
    if (shot.kind === 'line' && shot.landY < AIM_LAND_Y - 1) {
      g.lineStyle(8, 0x2b2118, alpha * 0.7);
      g.lineBetween(x - 11, y - 11, x + 11, y + 11);
      g.lineBetween(x - 11, y + 11, x + 11, y - 11);
      g.lineStyle(4, color, alpha);
      g.lineBetween(x - 10, y - 10, x + 10, y + 10);
      g.lineBetween(x - 10, y + 10, x + 10, y - 10);
      return;
    }
    g.lineStyle(9, 0x2b2118, alpha * 0.6);
    g.strokeEllipse(x, y, radius * 2, radius * 0.56);
    g.fillStyle(color, alpha * 0.22);
    g.fillEllipse(x, y, radius * 2, radius * 0.56);
    g.fillStyle(color, alpha * 0.18);
    g.fillEllipse(x, y, radius * 1.1, radius * 0.31);
    g.lineStyle(4, color, alpha);
    g.strokeEllipse(x, y, radius * 2, radius * 0.56);
    g.fillStyle(0x2b2118, alpha * 0.7);
    g.fillEllipse(x, y, 11, 6);
    g.fillStyle(color, alpha);
    g.fillEllipse(x, y, 6, 3);
    if (shot.strength >= 0.995) {
      g.lineStyle(3, 0xffffff, alpha);
      g.strokeEllipse(x, y, radius * 1.3, radius * 0.36);
    }
  }
}
