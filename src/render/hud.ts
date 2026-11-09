import Phaser from 'phaser';
import { SHOP_ITEMS, WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import { DAY } from '../config/waves';
import type { ViewState } from '../net/snapshot';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';

const FONT = 'Lilita One';
const SLOT_Y = 686;
const SLOT_X0 = 472;
const SLOT_DX = 84;
const SLOT_R = 32;

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

/** Top bar for money and gate, a weapon row at the bottom centre. */
export class Hud {
  readonly goldPos = { x: 58, y: 34 };
  readonly offeringPos = { x: 214, y: 34 };
  private gold: Phaser.GameObjects.Text;
  private offerings: Phaser.GameObjects.Text;
  private gateBar: Phaser.GameObjects.Graphics;
  private gateText: Phaser.GameObjects.Text;
  private dayText: Phaser.GameObjects.Text;
  private sun: Phaser.GameObjects.Graphics;
  private slots: Slot[] = [];
  private tooltip!: Phaser.GameObjects.Text;
  private shown = 0;
  private bump = 0;

  private all: { setVisible(v: boolean): unknown }[] = [];

  constructor(scene: Phaser.Scene) {
    const add = <T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T; setDepth(d: number): T; setVisible(v: boolean): T }>(o: T) => {
      this.all.push(o);
      return o.setScrollFactor(0).setDepth(90);
    };
    const small = { fontFamily: FONT, fontSize: '30px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 6 };

    const plate = scene.add.graphics();
    plate.fillStyle(0x2b2118, 0.55);
    plate.fillRoundedRect(18, 8, 318, 52, 14);
    plate.fillRoundedRect(960, 8, 302, 52, 14);
    add(plate);

    add(scene.add.image(this.goldPos.x, this.goldPos.y, propKey('coin')).setScale(1.2 / TEX_SCALE));
    this.gold = add(scene.add.text(this.goldPos.x + 24, this.goldPos.y, '0', small).setOrigin(0, 0.5));
    add(scene.add.image(this.offeringPos.x, this.offeringPos.y, propKey('offering')).setScale(1.2 / TEX_SCALE));
    this.offerings = add(scene.add.text(this.offeringPos.x + 24, this.offeringPos.y, '0', small).setOrigin(0, 0.5));

    add(scene.add.image(986, 34, propKey('iconCastle')).setScale(0.95 / TEX_SCALE));
    this.gateBar = add(scene.add.graphics());
    this.gateText = add(scene.add.text(1112, 34, '', { ...small, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5));
    add(scene.add.image(1236, 34, propKey('iconPause')).setScale(0.62 / TEX_SCALE));

    this.dayText = add(scene.add.text(640, 22, '', { ...small, fontSize: '26px' }).setOrigin(0.5));
    this.sun = add(scene.add.graphics());

    this.tooltip = add(scene.add.text(0, SLOT_Y - 46, '', { ...small, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5));

    WEAPON_SLOTS.forEach((slot, i) => {
      const x = SLOT_X0 + i * SLOT_DX;
      const icon = add(scene.add.image(x, SLOT_Y, propKey(ICONS[slot])).setScale(1 / TEX_SCALE));
      const label = add(scene.add.text(x + 22, SLOT_Y + 22, String(i + 1), { ...small, fontSize: '18px', strokeThickness: 4 }).setOrigin(0.5));
      const mask = add(scene.add.graphics());
      this.slots.push({ slot, x, icon, label, mask, owned: false });
    });
  }

  setVisible(v: boolean) { for (const o of this.all) o.setVisible(v); }

  /** Shows the owned item's name while the pointer rests on its icon. */
  hover(x: number, y: number, meta: Meta | null) {
    const slot = this.hitSlot(x, y);
    let id: string | null | undefined = null;
    if (slot && meta) {
      id = slot === 'horn' ? meta.hornEquipped : SHOP_ITEMS.filter((i) => i.id.startsWith(slot) && meta.owned.includes(i.id)).pop()?.id;
    }
    const item = SHOP_ITEMS.find((i) => i.id === id);
    this.tooltip.setVisible(!!item);
    if (item && slot) this.tooltip.setText(item.name).setX(this.slotPos(slot).x);
  }

  /** Hit test for a press in world coordinates. */
  hitSlot(x: number, y: number): WeaponSlot | null {
    for (const s of this.slots) {
      if (s.owned && Math.hypot(x - s.x, y - SLOT_Y) <= SLOT_R + 6) return s.slot;
    }
    return null;
  }

  hitPause(x: number, y: number): boolean { return Math.hypot(x - 1236, y - 34) <= 26; }

  /** Current on-screen position of a weapon slot (used by tests). */
  slotPos(slot: WeaponSlot) { const s = this.slots.find((q) => q.slot === slot)!; return { x: s.x, y: SLOT_Y }; }

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
    s.label.setVisible(owned);
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

