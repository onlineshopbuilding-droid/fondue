import Phaser from 'phaser';
import { SHOP_ITEMS, WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import { DAY } from '../config/waves';
import { WORLD } from '../config/world';
import type { ViewState } from '../net/snapshot';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';
import { computeView, type GameView } from './viewport';

const FONT = 'Lilita One';
const SLOT_Y = 686;
const SLOT_X0 = 472;
const SLOT_DX = 84;
const SLOT_R = 32;
const PAUSE_X = 1236;
const PAUSE_Y = 34;
const PLATE_BOTTOM = 60;

interface Slot {
  slot: WeaponSlot;
  x: number;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  mask: Phaser.GameObjects.Graphics;
  owned: boolean;
}

const ICONS: Record<WeaponSlot, string> = { wheel: 'iconWheel', stomper: 'iconStomper', comet: 'iconComet', horn: 'iconMortar', bolter: 'iconBolter' };
const HORN_ICONS: Record<string, string> = { mortar: 'iconMortar', frost: 'iconFrost', bellows: 'iconBellows' };

/**
 * Top bar for money and gate, a weapon row at the bottom centre. Each group is laid out in the
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
  private slots: Slot[] = [];
  private tooltip: Phaser.GameObjects.Text;
  private shown = 0;
  private bump = 0;

  private left: Phaser.GameObjects.Container;
  private right: Phaser.GameObjects.Container;
  private centre: Phaser.GameObjects.Container;
  private row: Phaser.GameObjects.Container;
  private view: GameView = computeView(WORLD.width, WORLD.height);
  /** The key numbers under the icons mean nothing on a phone. */
  private touchOnly = window.matchMedia('(pointer: coarse)').matches;

  constructor(scene: Phaser.Scene) {
    const small = { fontFamily: FONT, fontSize: '30px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 6 };
    const box = () => scene.add.container(0, 0).setDepth(90).setScrollFactor(0);
    this.left = box();
    this.right = box();
    this.centre = box();
    this.row = box();

    const leftPlate = scene.add.graphics();
    leftPlate.fillStyle(0x2b2118, 0.55);
    leftPlate.fillRoundedRect(18, 8, 318, 52, 14);
    const coin = scene.add.image(this.goldPos.x, this.goldPos.y, propKey('coin')).setScale(1.2 / TEX_SCALE);
    this.gold = scene.add.text(this.goldPos.x + 24, this.goldPos.y, '0', small).setOrigin(0, 0.5);
    const offering = scene.add.image(this.offeringPos.x, this.offeringPos.y, propKey('offering')).setScale(1.2 / TEX_SCALE);
    this.offerings = scene.add.text(this.offeringPos.x + 24, this.offeringPos.y, '0', small).setOrigin(0, 0.5);
    this.left.add([leftPlate, coin, this.gold, offering, this.offerings]);

    const rightPlate = scene.add.graphics();
    rightPlate.fillStyle(0x2b2118, 0.55);
    rightPlate.fillRoundedRect(960, 8, 302, 52, 14);
    const castle = scene.add.image(986, 34, propKey('iconCastle')).setScale(0.95 / TEX_SCALE);
    this.gateBar = scene.add.graphics();
    this.gateText = scene.add.text(1112, 34, '', { ...small, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5);
    const pause = scene.add.image(PAUSE_X, PAUSE_Y, propKey('iconPause')).setScale(0.62 / TEX_SCALE);
    this.right.add([rightPlate, castle, this.gateBar, this.gateText, pause]);

    this.dayText = scene.add.text(640, 22, '', { ...small, fontSize: '26px' }).setOrigin(0.5);
    this.sun = scene.add.graphics();
    this.centre.add([this.dayText, this.sun]);

    this.tooltip = scene.add.text(0, SLOT_Y - 46, '', { ...small, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5);
    this.row.add(this.tooltip);
    WEAPON_SLOTS.forEach((slot, i) => {
      const x = SLOT_X0 + i * SLOT_DX;
      const icon = scene.add.image(x, SLOT_Y, propKey(ICONS[slot])).setScale(1 / TEX_SCALE);
      const label = scene.add.text(x + 22, SLOT_Y + 22, String(i + 1), { ...small, fontSize: '18px', strokeThickness: 4 }).setOrigin(0.5);
      const mask = scene.add.graphics();
      this.row.add([icon, label, mask]);
      this.slots.push({ slot, x, icon, label, mask, owned: false });
    });
  }

  /** Anchors every group to its edge of the screen. */
  layout(v: GameView) {
    this.view = v;
    const k = v.topScale;
    this.left.setScale(k).setPosition(v.safeLeft, v.safeTop);
    this.right.setScale(k).setPosition(v.width - WORLD.width * k - v.safeRight, v.safeTop);
    this.centre.setScale(k).setPosition(v.width / 2 - (WORLD.width / 2) * k, v.safeTop);
    const r = v.hudScale;
    // Enlarged icons get a little air above the screen edge.
    const lift = r > 1 ? 8 : 0;
    this.row.setScale(r).setPosition(v.width / 2 - (WORLD.width / 2) * r, v.height - WORLD.height * r - v.safeBottom - lift);
  }

  setVisible(v: boolean) {
    this.left.setVisible(v);
    this.right.setVisible(v);
    this.centre.setVisible(v);
    this.row.setVisible(v);
  }

  /** Where coins fly to, in world coordinates. */
  goldTarget() { return this.toWorld(this.left, this.goldPos); }
  offeringTarget() { return this.toWorld(this.left, this.offeringPos); }

  private toWorld(box: Phaser.GameObjects.Container, p: { x: number; y: number }) {
    return { x: box.x + p.x * box.scaleX + this.view.offsetX, y: box.y + p.y * box.scaleY + this.view.offsetY };
  }

  /** Shows the owned item's name while the pointer rests on its icon. Screen coordinates. */
  hover(x: number, y: number, meta: Meta | null) {
    const slot = this.hitSlot(x, y);
    let id: string | null | undefined = null;
    if (slot && meta) {
      id = slot === 'horn' ? meta.hornEquipped : SHOP_ITEMS.filter((i) => i.id.startsWith(slot) && meta.owned.includes(i.id)).pop()?.id;
    }
    const item = SHOP_ITEMS.find((i) => i.id === id);
    this.tooltip.setVisible(!!item);
    if (item && slot) this.tooltip.setText(item.name).setX(this.slots.find((s) => s.slot === slot)!.x);
  }

  /** Hit test for a press in screen coordinates. */
  hitSlot(x: number, y: number): WeaponSlot | null {
    const r = this.row.scaleX;
    const lx = (x - this.row.x) / r;
    const ly = (y - this.row.y) / r;
    for (const s of this.slots) {
      if (s.owned && Math.hypot(lx - s.x, ly - SLOT_Y) <= SLOT_R + 6) return s.slot;
    }
    return null;
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
  slotPos(slot: WeaponSlot) {
    const s = this.slots.find((q) => q.slot === slot)!;
    return { x: this.row.x + s.x * this.row.scaleX, y: this.row.y + SLOT_Y * this.row.scaleY };
  }
  pausePos() { return this.pauseCentre(); }
  slotDiameterCss() { return (SLOT_R + 6) * 2 * this.row.scaleX * this.view.cssPerUnit; }
  pauseDiameterCss() { return this.pauseRadius() * 2 * this.view.cssPerUnit; }
  bottomCss() { return (this.left.y + PLATE_BOTTOM * this.left.scaleY) * this.view.cssPerUnit; }

  update(v: ViewState, meta: Meta | null, activeMode: string, dt: number) {
    if (Math.round(this.shown) !== v.gold) this.bump = 1;
    this.shown += (v.gold - this.shown) * Math.min(1, dt * 12);
    if (Math.abs(this.shown - v.gold) < 1) this.shown = v.gold;
    this.gold.setText(String(Math.round(this.shown)));
    this.bump = Math.max(0, this.bump - dt * 6);
    this.gold.setScale(1 + this.bump * 0.12);
    this.offerings.setText(String(v.offerings));

    const frac = v.gateMax > 0 ? v.gateHp / v.gateMax : 0;
    const g = this.gateBar;
    g.clear();
    g.fillStyle(0x2b2118, 1);
    g.fillRoundedRect(1010, 22, 196, 24, 8);
    const color = frac > 0.5 ? 0x4fb477 : frac > 0.25 ? 0xe9b44c : 0xd1495b;
    g.fillStyle(color, 1);
    g.fillRoundedRect(1013, 25, Math.max(4, 190 * frac), 18, 6);
    this.gateText.setText(`${Math.ceil(v.gateHp)}/${v.gateMax}`);

    this.dayText.setText(`DAY ${v.day}`);
    const u = Math.min(1, v.dayT / DAY.seconds);
    const s = this.sun;
    s.clear();
    s.fillStyle(0x2b2118, 0.65);
    s.fillRoundedRect(540, 44, 200, 8, 4);
    s.fillStyle(0xf2c14e, 1);
    s.fillCircle(540 + 200 * u, 48, 8);

    for (const slot of this.slots) this.updateSlot(slot, v, meta, activeMode);
  }

  private updateSlot(s: Slot, v: ViewState, meta: Meta | null, activeMode: string) {
    const owned = meta ? this.isOwned(s.slot, meta) : false;
    s.owned = owned;
    s.icon.setVisible(owned);
    s.label.setVisible(owned && !this.touchOnly);
    s.mask.clear();
    if (!owned) return;
    if (s.slot === 'horn' && meta?.hornEquipped) s.icon.setTexture(propKey(HORN_ICONS[meta.hornEquipped]));
    const cd = v.cooldowns[s.slot];
    const max = v.cooldownMax[s.slot];
    s.icon.setScale((activeMode === s.slot ? 1.18 : 1) / TEX_SCALE);
    if (cd <= 0) {
      s.mask.lineStyle(3, 0xfff1c0, 1);
      s.mask.strokeCircle(s.x, SLOT_Y, SLOT_R + 1);
    }
    if (cd > 0 && max > 0) {
      // Dark wedge that shrinks clockwise as the weapon recharges.
      const f = cd / max;
      s.mask.fillStyle(0x10161c, 0.7);
      s.mask.slice(s.x, SLOT_Y, SLOT_R, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false);
      s.mask.fillPath();
    }
  }

  private isOwned(slot: WeaponSlot, m: Meta): boolean {
    if (slot === 'horn') return m.hornEquipped !== null;
    return m.owned.some((id) => id.startsWith(slot));
  }
}
