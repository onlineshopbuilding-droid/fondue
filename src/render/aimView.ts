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
    for (const [w, c, a] of [[tense + 5, 0x2b2118, alpha * 0.8], [tense, color, alpha]] as [number, number, number][]) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(ox + px, oy + py);
      g.lineTo(x, y);
      g.lineTo(ox - px, oy - py);
      g.strokePath();
    }
  }

  private dashes(points: { x: number; y: number }[], color: number, alpha: number, width: number) {
    const g = this.g;
    for (let i = 0; i + 1 < points.length; i += 2) {
      g.lineStyle(width + 4, 0x2b2118, alpha * 0.55);
      g.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
    for (let i = 0; i + 1 < points.length; i += 2) {
      g.lineStyle(width, color, alpha);
      g.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
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
    g.lineStyle(9, 0x2b2118, alpha * 0.6);
    g.strokeEllipse(x, y, radius * 2, radius * 0.56);
    g.fillStyle(color, alpha * 0.28);
    g.fillEllipse(x, y, radius * 2, radius * 0.56);
    g.lineStyle(4, color, alpha);
    g.strokeEllipse(x, y, radius * 2, radius * 0.56);
    if (shot.strength >= 0.995) {
      g.lineStyle(3, 0xffffff, alpha);
      g.strokeEllipse(x, y, radius * 1.3, radius * 0.36);
    }
  }
}
