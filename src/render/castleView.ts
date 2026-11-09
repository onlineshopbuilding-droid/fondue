import Phaser from 'phaser';
import { SHOP_ITEMS, WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import { WORLD } from '../config/world';
import type { ViewState } from '../net/snapshot';
import { slotAt } from '../sim/aim';
import { SLOT_TIERS, buildTier, gateOfTier, ownsSlot } from '../sim/keep';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';
import type { GameView } from './viewport';
import { landscapeForDay } from './background';

const FINGER_CSS = 27;
const RING_RADIUS = 46;
/** Where the ring of a weapon sits, if not around the middle of its art. */
const RING_OFFSET: Partial<Record<WeaponSlot, { x: number; y: number }>> = { wheel: { x: -14, y: 2 } };

/** Art of a mounted weapon when ready and when reloading. */
const MOUNTS: Record<WeaponSlot, (m: Meta) => string> = {
  wheel: () => 'mountWheel',
  stomper: () => 'mountStomper',
  comet: () => 'mountComet',
  bolter: () => 'mountBolter',
  horn: (m) => (m.hornEquipped === 'frost' ? 'mountFrost' : m.hornEquipped === 'bellows' ? 'mountBellows' : 'mountMortar'),
};

interface Mount {
  slot: WeaponSlot;
  img: Phaser.GameObjects.Image;
  pop: number;
}

/** The keep as one thing: body per build stage, gate, shadow, foot dressing and mounted weapons. */
export class CastleView {
  private shadow: Phaser.GameObjects.Image;
  private keep: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private weather: Phaser.GameObjects.Image;
  private gate: Phaser.GameObjects.Image;
  private cracks: Phaser.GameObjects.Image;
  private foot: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private mounts: Mount[] = [];
  private gateFlash = 0;
  private view!: GameView;
  private tierName = '';

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(-40, 668, propKey('keepShadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(7);
    this.keep = scene.add.image(-40, 640, propKey('keep0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10);
    this.glow = scene.add.image(-40, 640, propKey('keepGlow0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.1).setAlpha(0);
    this.weather = scene.add.image(-40, 640, propKey('keepWeather_canyon')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.05).setVisible(false);
    this.gate = scene.add.image(WORLD.gateX - 74, 620, propKey('gate0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(11);
    this.cracks = scene.add.image(WORLD.gateX - 74, 620, propKey('crack1')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(12).setVisible(false);
    this.foot = scene.add.image(-40, 690, propKey('foot_meadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(36);
    this.ring = scene.add.graphics().setDepth(13);
    for (const slot of WEAPON_SLOTS) {
      const { x, y } = WORLD.slots[slot];
      const img = scene.add.image(x, y, propKey('mountWheelReady')).setScale(1 / TEX_SCALE).setDepth(12.5).setVisible(false);
      this.mounts.push({ slot, img, pop: 0 });
    }
  }

  layout(v: GameView) { this.view = v; }

  hit() { this.gateFlash = 1; }

  /** A little jump when a weapon has reloaded. */
  ready(slot: WeaponSlot) {
    const m = this.mounts.find((q) => q.slot === slot);
    if (m) m.pop = 1;
  }

  /** Radius of a grip zone: fat enough for a finger on every screen. */
  hitRadius() { return Math.max(WORLD.slotHitRadius, FINGER_CSS / this.view.cssPerUnit); }
  diameterCss() { return this.hitRadius() * 2 * this.view.cssPerUnit; }

  /** Which owned weapon a press in world coordinates lands on. */
  hitSlot(x: number, y: number, meta: Meta | null): WeaponSlot | null {
    if (!meta) return null;
    return slotAt(x, y, this.hitRadius(), (s) => ownsSlot(s, meta));
  }

  update(view: ViewState, meta: Meta, tint: number, night: number, activeMode: string, dt: number, time: number) {
    const tier = buildTier(meta);
    const name = `${tier}:${landscapeForDay(view.day)}`;
    if (name !== this.tierName) {
      this.tierName = name;
      this.keep.setTexture(propKey(`keep${tier}`));
      this.glow.setTexture(propKey(`keepGlow${tier}`));
      this.foot.setTexture(propKey(`foot_${landscapeForDay(view.day)}`));
      const land = landscapeForDay(view.day);
      const weather = land === 'snowpine' ? `keepWeather_snowpine_${tier}` : land === 'meadow' ? null : `keepWeather_${land}`;
      this.weather.setVisible(weather !== null);
      if (weather) this.weather.setTexture(propKey(weather));
    }
    this.keep.setTint(tint);
    this.weather.setTint(tint);
    this.foot.setTint(tint);
    this.glow.setAlpha(Math.min(1, night * 1.6));
    this.shadow.setAlpha(1 - night * 0.45);

    const gate = gateOfTier(tier);
    this.gate.setTexture(propKey(gate));
    const f = view.gateMax > 0 ? view.gateHp / view.gateMax : 1;
    const stage = f < 0.25 ? 3 : f < 0.5 ? 2 : f < 0.75 ? 1 : 0;
    this.cracks.setVisible(stage > 0);
    if (stage > 0) this.cracks.setTexture(propKey(`crack${stage}`));
    this.gateFlash = Math.max(0, this.gateFlash - 0.12);
    const off = this.gateFlash * 3 * (Math.random() - 0.5);
    this.gate.x = WORLD.gateX - 74 + off;
    this.cracks.x = this.gate.x;
    this.gate.setTint(this.gateFlash > 0.5 ? 0xffb0a0 : tint);

    this.ring.clear();
    for (const m of this.mounts) this.updateMount(m, view, meta, tint, activeMode, dt, time);
  }

  private updateMount(m: Mount, view: ViewState, meta: Meta, tint: number, activeMode: string, dt: number, time: number) {
    const owned = ownsSlot(m.slot, meta);
    m.img.setVisible(owned);
    if (!owned) return;
    const cd = view.cooldowns[m.slot];
    const max = view.cooldownMax[m.slot];
    const isReady = cd <= 0;
    m.img.setTexture(propKey(`${MOUNTS[m.slot](meta)}${isReady ? 'Ready' : 'Empty'}`));
    m.pop = Math.max(0, m.pop - dt * 4);
    const active = activeMode === m.slot;
    m.img.setScale((1 + m.pop * 0.22 + (active ? 0.1 : 0)) / TEX_SCALE);
    // Weapons sit in the same light as the wall; only their own glow is drawn into the art.
    m.img.setTint(tint);
    const off = RING_OFFSET[m.slot];
    const x = WORLD.slots[m.slot].x + (off?.x ?? 0);
    const y = WORLD.slots[m.slot].y + (off?.y ?? 0);
    const g = this.ring;
    if (!isReady && max > 0) {
      const done = 1 - cd / max;
      g.lineStyle(9, 0x2b2118, 0.7);
      g.strokeCircle(x, y, RING_RADIUS);
      g.lineStyle(6, 0xf2c14e, 1);
      g.beginPath();
      g.arc(x, y, RING_RADIUS, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2, false);
      g.strokePath();
    } else {
      // Same solid ring on every ready weapon; only a soft outer glow breathes.
      const glow = 0.16 + Math.sin(time * 0.005 + x) * 0.1;
      g.lineStyle(13, 0xf3cb5e, active ? 0.5 : glow);
      g.strokeCircle(x, y, RING_RADIUS + 4);
      g.lineStyle(8, 0x2b2118, 0.85);
      g.strokeCircle(x, y, RING_RADIUS);
      g.lineStyle(5, active ? 0xfff1c0 : 0xf3cb5e, 1);
      g.strokeCircle(x, y, RING_RADIUS);
    }
    this.drawTier(m, meta, x, y);
  }

  /** Tier pips, so that an upgrade can be seen on the keep. */
  private drawTier(m: Mount, meta: Meta, x: number, y: number) {
    if (m.slot === 'horn') return;
    const n = SLOT_TIERS[m.slot].filter((id) => meta.owned.includes(id)).length;
    const g = this.ring;
    for (let i = 0; i < n; i++) {
      const px = x - ((n - 1) * 11) / 2 + i * 11;
      g.fillStyle(0x2b2118, 1);
      g.fillCircle(px, y + RING_RADIUS + 8, 6);
      g.fillStyle(0xf3cb5e, 1);
      g.fillCircle(px, y + RING_RADIUS + 8, 3.6);
    }
  }

  /** Position for tests and tips, in world coordinates. */
  slotWorld(slot: WeaponSlot) { return WORLD.slots[slot]; }

  /** Name of the item mounted in a slot. */
  nameOf(slot: WeaponSlot, meta: Meta): string {
    if (slot === 'horn') return SHOP_ITEMS.find((i) => i.id === meta.hornEquipped)?.name ?? '';
    const best = SLOT_TIERS[slot].filter((id) => meta.owned.includes(id)).pop();
    return SHOP_ITEMS.find((i) => i.id === best)?.name ?? '';
  }
}
