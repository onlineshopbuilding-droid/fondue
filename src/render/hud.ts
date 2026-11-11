import Phaser from 'phaser';
import { WORLD } from '../config/field';
import type { ViewState } from '../net/snapshot';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';
import { computeView, type GameView } from './viewport';

const FONT = 'Lilita One';
const PAUSE_X = 1236;
const PAUSE_Y = 34;
const PLATE_BOTTOM = 60;

const INK = 0x2b2118;
const CREAM = 0xfff6df;
const WOOD_FACE = 0x5a3a22;
const WOOD_LIGHT = 0x7d5434;
const WOOD_LIP = 0x3a2516;
const WOOD_GRAIN = 0x3f2817;
/** Golden Fondue running: the coin socket gets a pulsing ring that runs down with the time left. */
const RUSH_COLOR = 0xffd34d;
const RUSH_RADIUS = 23;

/** Gate bar colours: fill, its shaded lower half and the gloss tint. */
const BAR = {
  good: [0x4fb477, 0x2f8752, 0xc9f2d4],
  warn: [0xe9b44c, 0xb27a22, 0xfff0bf],
  bad: [0xd1495b, 0x962c3c, 0xffc9cf],
} as const;

/**
 * A painted walnut plank in an ink rim: lit band on top, darker lip at the bottom, faint grain,
 * warm rim light along the top edge. Stays inside x, y, w, h so the HUD keeps its footprint.
 */
function plank(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, alpha: number) {
  const r = 14;
  g.fillStyle(INK, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  g.fillStyle(WOOD_LIP, alpha);
  g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, r - 3);
  g.fillStyle(WOOD_FACE, alpha);
  g.fillRoundedRect(x + 3, y + 3, w - 6, h - 11, r - 3);
  g.fillStyle(WOOD_LIGHT, alpha * 0.6);
  g.fillRoundedRect(x + 6, y + 5, w - 12, 14, { tl: r - 6, tr: r - 6, bl: 5, br: 5 });
  // Grain: long, slightly wavy strokes in a darker wood tone, not ink.
  const rows = [y + 22, y + 30, y + 37];
  rows.forEach((ry, i) => {
    g.lineStyle(1.2, WOOD_GRAIN, 0.55 * alpha);
    g.beginPath();
    const x0 = x + 16 + i * 23;
    const x1 = x + w - 18 - ((i * 37) % 50);
    g.moveTo(x0, ry);
    for (let t = 1; t <= 8; t++) {
      const px = x0 + ((x1 - x0) * t) / 8;
      g.lineTo(px, ry + Math.sin(t * 1.7 + i * 2) * 1.1);
    }
    g.strokePath();
  });
  // A knot near one end.
  g.lineStyle(1.2, WOOD_GRAIN, 0.6 * alpha);
  g.strokeEllipse(x + w * 0.62, y + 32, 9, 4);
  // Warm rim light on the top edge, cool shade line above the lip.
  g.lineStyle(2, CREAM, 0.32);
  g.lineBetween(x + r, y + 4.5, x + w - r, y + 4.5);
  g.lineStyle(1.5, 0x000000, 0.25);
  g.lineBetween(x + r - 4, y + h - 8.5, x + w - r + 4, y + h - 8.5);
}

/** A round recess carved into the plank, for an icon to sit in. */
function socket(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.fillStyle(CREAM, 0.16);
  g.fillCircle(x + 0.8, y + 1.6, r);
  g.fillStyle(WOOD_LIP, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(0x000000, 0.28);
  g.fillCircle(x - 0.6, y - 1.2, r - 1.5);
  g.fillStyle(WOOD_LIP, 1);
  g.fillCircle(x + 0.4, y + 0.9, r - 3);
}

/**
 * Top bar for money and gate. Weapons live on the keep. Each group is laid out in the
 * original 1280x720 coordinates and then anchored and scaled to the screen by layout().
 */
export class Hud {
  private readonly goldPos = { x: 58, y: 34 };
  private readonly offeringPos = { x: 214, y: 34 };
  private gold: Phaser.GameObjects.Text;
  private offerings: Phaser.GameObjects.Text;
  private gateBar: Phaser.GameObjects.Graphics;
  private gateText: Phaser.GameObjects.Text;
  private dayText: Phaser.GameObjects.Text;
  private sun: Phaser.GameObjects.Graphics;
  private rush: Phaser.GameObjects.Graphics;
  /** Longest Golden Fondue time seen since it started, for the countdown ring. */
  private rushMax = 0;
  private dayLine = '';
  private shown = 0;
  private bump = 0;
  private drawnFrac = -1;
  private drawnDay = -1;

  private left: Phaser.GameObjects.Container;
  private right: Phaser.GameObjects.Container;
  private centre: Phaser.GameObjects.Container;
  private view: GameView = computeView(WORLD.width, WORLD.height);

  constructor(scene: Phaser.Scene) {
    const small = { fontFamily: FONT, fontSize: '30px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 6 };
    const box = () => scene.add.container(0, 0).setDepth(90).setScrollFactor(0);
    this.left = box();
    this.right = box();
    this.centre = box();

    const leftPlate = scene.add.graphics();
    this.rush = scene.add.graphics();
    // Nearly solid: the flags on the top of a big keep pass behind this plate.
    plank(leftPlate, 18, 8, 318, 52, 0.94);
    socket(leftPlate, this.goldPos.x, this.goldPos.y - 1, 19);
    socket(leftPlate, this.offeringPos.x, this.offeringPos.y - 1, 19);
    const coin = scene.add.image(this.goldPos.x, this.goldPos.y, propKey('coin')).setScale(1.2 / TEX_SCALE);
    this.gold = scene.add.text(this.goldPos.x + 24, this.goldPos.y, '0', small).setOrigin(0, 0.5);
    const offering = scene.add.image(this.offeringPos.x, this.offeringPos.y, propKey('offering')).setScale(1.2 / TEX_SCALE);
    this.offerings = scene.add.text(this.offeringPos.x + 24, this.offeringPos.y, '0', small).setOrigin(0, 0.5);
    this.left.add([leftPlate, this.rush, coin, this.gold, offering, this.offerings]);

    const rightPlate = scene.add.graphics();
    // Solid: the chain of the eagle hook runs behind this plate.
    plank(rightPlate, 960, 8, 302, 52, 1);
    socket(rightPlate, PAUSE_X, PAUSE_Y - 1, 21);
    const castle = scene.add.image(986, 34, propKey('iconCastle')).setScale(0.95 / TEX_SCALE);
    this.gateBar = scene.add.graphics();
    this.gateText = scene.add.text(1112, 34, '', { ...small, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5);
    const pause = scene.add.image(PAUSE_X, PAUSE_Y, propKey('iconPause')).setScale(0.62 / TEX_SCALE);
    this.right.add([rightPlate, castle, this.gateBar, this.gateText, pause]);

    this.dayText = scene.add.text(640, 22, '', { ...small, fontSize: '26px' }).setOrigin(0.5);
    this.sun = scene.add.graphics();
    this.centre.add([this.dayText, this.sun]);

  }

  /** Anchors every group to its edge of the screen. */
  layout(v: GameView) {
    this.view = v;
    const k = v.topScale;
    this.left.setScale(k).setPosition(v.safeLeft, v.safeTop);
    this.right.setScale(k).setPosition(v.width - WORLD.width * k - v.safeRight, v.safeTop);
    this.centre.setScale(k).setPosition(v.width / 2 - (WORLD.width / 2) * k, v.safeTop);
  }

  setVisible(v: boolean) {
    this.left.setVisible(v);
    this.right.setVisible(v);
    this.centre.setVisible(v);
  }

  /** Where coins fly to, in world coordinates. */
  goldTarget() { return this.toWorld(this.left, this.goldPos); }
  offeringTarget() { return this.toWorld(this.left, this.offeringPos); }

  private toWorld(box: Phaser.GameObjects.Container, p: { x: number; y: number }) {
    return { x: box.x + p.x * box.scaleX + this.view.offsetX, y: box.y + p.y * box.scaleY + this.view.offsetY };
  }

  private pauseCentre() {
    return { x: this.right.x + PAUSE_X * this.right.scaleX, y: this.right.y + PAUSE_Y * this.right.scaleY };
  }

  private pauseRadius() { return Math.max(26 * this.view.topScale, 24 / this.view.cssPerUnit); }

  hitPause(x: number, y: number): boolean {
    const c = this.pauseCentre();
    return Math.hypot(x - c.x, y - c.y) <= this.pauseRadius();
  }

  /** Measurements for the phone tests, in screen coordinates or CSS pixels. */
  pausePos() { return this.pauseCentre(); }
  pauseDiameterCss() { return this.pauseRadius() * 2 * this.view.cssPerUnit; }
  bottomCss() { return (this.left.y + PLATE_BOTTOM * this.left.scaleY) * this.view.cssPerUnit; }

  update(v: ViewState, meta: Meta | null, dt: number) {
    if (Math.round(this.shown) !== v.gold) this.bump = 1;
    this.shown += (v.gold - this.shown) * Math.min(1, dt * 12);
    if (Math.abs(this.shown - v.gold) < 1) this.shown = v.gold;
    this.gold.setText(String(Math.round(this.shown)));
    this.bump = Math.max(0, this.bump - dt * 6);
    this.gold.setScale(1 + this.bump * 0.12);
    this.offerings.setText(String(v.offerings));

    const frac = v.gateMax > 0 ? v.gateHp / v.gateMax : 0;
    // Both bars are redrawn only when what they show has changed.
    if (frac !== this.drawnFrac) { this.drawnFrac = frac; this.drawGateBar(frac); }
    this.gateText.setText(`${Math.ceil(v.gateHp)}/${v.gateMax}`);

    const line = this.dayLabel(v, meta);
    if (line !== this.dayLine) {
      this.dayLine = line;
      this.dayText.setText(line).setFontSize(line.length > 18 ? 22 : 26);
    }
    const seconds = meta?.today.seconds ?? 0;
    const u = seconds > 0 ? Math.min(1, v.dayT / seconds) : 0;
    const key = Math.round(u * 400) + (v.nightfall ? 1000 : 0);
    if (key !== this.drawnDay) { this.drawnDay = key; this.drawDayTrack(u, v.nightfall); }
    this.drawRush(v.goldRushT);
  }

  /** "LEVEL 7 · DAY 2/5" in the campaign, "DAY 12" without an end; the count of raiders left after nightfall. */
  private dayLabel(v: ViewState, meta: Meta | null): string {
    const level = meta?.rules.level ?? null;
    const last = meta?.rules.lastDay ?? null;
    const day = last !== null ? `${v.day}/${last}` : `${v.day}`;
    if (v.nightfall) return level !== null ? `LEVEL ${level} · NIGHT ${day}: ${v.enemies.length} LEFT` : `NIGHT ${v.day}: ${v.enemies.length} LEFT`;
    return level !== null ? `LEVEL ${level} · DAY ${day}` : `DAY ${day}`;
  }

  /** While the Golden Fondue pays extra: a pulsing golden ring round the coin that runs down. */
  private drawRush(t: number) {
    const g = this.rush;
    g.clear();
    if (t <= 0) { this.rushMax = 0; return; }
    if (t > this.rushMax) this.rushMax = t;
    const left = this.rushMax > 0 ? t / this.rushMax : 0;
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.012);
    const { x, y } = this.goldPos;
    g.fillStyle(RUSH_COLOR, 0.18 + pulse * 0.16);
    g.fillCircle(x, y - 1, RUSH_RADIUS + 5);
    g.lineStyle(4, RUSH_COLOR, 1);
    g.beginPath();
    g.arc(x, y - 1, RUSH_RADIUS, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false);
    g.strokePath();
  }

  /** Gate health: a carved trough with a glossy fill that turns amber, then red. */
  private drawGateBar(frac: number) {
    const g = this.gateBar;
    g.clear();
    // Trough: ink rim, dark inside, shade under its top edge, warm catch-light under its bottom edge.
    g.fillStyle(INK, 1);
    g.fillRoundedRect(1010, 22, 196, 24, 8);
    g.fillStyle(0x1e1610, 1);
    g.fillRoundedRect(1012, 24, 192, 20, 6.5);
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(1012, 24, 192, 6, { tl: 6.5, tr: 6.5, bl: 0, br: 0 });
    g.lineStyle(1.5, CREAM, 0.22);
    g.lineBetween(1018, 47.5, 1198, 47.5);

    const [base, dark, gloss] = frac > 0.5 ? BAR.good : frac > 0.25 ? BAR.warn : BAR.bad;
    const w = Math.max(4, 190 * Math.max(0, Math.min(1, frac)));
    const r = Math.min(6, w / 2);
    g.fillStyle(dark, 1);
    g.fillRoundedRect(1013, 25, w, 18, r);
    g.fillStyle(base, 1);
    g.fillRoundedRect(1013, 25, w, 13, r);
    if (w > 12) {
      // Gloss along the top and a bright end cap where the fill stops.
      g.fillStyle(gloss, 0.55);
      g.fillRoundedRect(1017, 27, w - 8, 4, 2);
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(1013 + w - 3, 28, 1.5, 11);
    }
    // Quarter notches along the top so the eye can read the level at a glance.
    g.lineStyle(1.5, INK, 0.4);
    for (let q = 1; q < 4; q++) {
      const x = 1013 + (190 * q) / 4;
      g.lineBetween(x, 26, x, 30);
    }
  }

  /** Day progress: a groove the sun travels along; at nightfall it has set and a moon stands at the end. */
  private drawDayTrack(u: number, night: boolean) {
    const s = this.sun;
    s.clear();
    s.fillStyle(INK, 0.8);
    s.fillRoundedRect(537, 41, 206, 14, 7);
    s.fillStyle(WOOD_LIP, 0.9);
    s.fillRoundedRect(540, 44, 200, 8, 4);
    s.fillStyle(0x000000, 0.3);
    s.fillRoundedRect(540, 44, 200, 3, { tl: 3, tr: 3, bl: 0, br: 0 });
    const x = 540 + 200 * u;
    if (u > 0.02) {
      s.fillStyle(night ? 0x8a7aa8 : 0xe9a83e, 1);
      s.fillRoundedRect(540, 44, Math.max(8, 200 * u), 8, 4);
      s.fillStyle(night ? 0xc9bfe0 : 0xffe7a3, 0.7);
      s.fillRoundedRect(543, 45, Math.max(2, 200 * u - 6), 2.5, 1.2);
    }
    if (night) {
      // Moon: pale disc with a crescent of shade on the lower right.
      s.fillStyle(0xdfe8ff, 0.22);
      s.fillCircle(x, 48, 15);
      s.fillStyle(INK, 1);
      s.fillCircle(x, 48, 11);
      s.fillStyle(0xf3ead2, 1);
      s.fillCircle(x, 48, 9);
      s.fillStyle(0xb9b2c8, 1);
      s.fillCircle(x + 2.5, 50, 6);
      s.fillStyle(0xf3ead2, 1);
      s.fillCircle(x + 0.5, 47, 6);
      s.fillStyle(0xc8bfaa, 0.9);
      s.fillCircle(x - 3, 50.5, 1.4);
      return;
    }
    // Sun: short rays, ink rim, golden disc with a warm highlight on the upper left.
    s.lineStyle(2.5, INK, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      s.lineBetween(x + Math.cos(a) * 10, 48 + Math.sin(a) * 10, x + Math.cos(a) * 14, 48 + Math.sin(a) * 14);
    }
    s.lineStyle(1.2, 0xf2c14e, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      s.lineBetween(x + Math.cos(a) * 10.5, 48 + Math.sin(a) * 10.5, x + Math.cos(a) * 13.3, 48 + Math.sin(a) * 13.3);
    }
    s.fillStyle(INK, 1);
    s.fillCircle(x, 48, 10);
    s.fillStyle(0xd98b2b, 1);
    s.fillCircle(x, 48, 8);
    s.fillStyle(0xf2c14e, 1);
    s.fillCircle(x - 0.8, 47.2, 6.6);
    s.fillStyle(0xfff1b8, 0.9);
    s.fillCircle(x - 3, 45, 2.2);
  }
}
