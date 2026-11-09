import Phaser from 'phaser';
import { PERCH } from '../config/shop';
import { WORLD, perchX } from '../config/world';
import type { ViewState } from '../net/snapshot';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';
import type { GameView } from './viewport';

const STEAM_PUFFS = 4;
const EAGLE_IN = 0.22;
const EAGLE_OUT = 0.28;

interface Puff { img: Phaser.GameObjects.Image; t: number; }

/** Great Cauldron in either place, and the eagle's hook with the eagle that comes for it. */
export class Stations {
  private frontBack: Phaser.GameObjects.Image;
  private frontFront: Phaser.GameObjects.Image;
  private ledge: Phaser.GameObjects.Image;
  private rearBack: Phaser.GameObjects.Image;
  private rearFront: Phaser.GameObjects.Image;
  private cheese: Phaser.GameObjects.Image;
  private puffs: Puff[] = [];
  private busyBar: Phaser.GameObjects.Graphics;

  private chain: Phaser.GameObjects.TileSprite;
  private hook: Phaser.GameObjects.Image;
  private eagle: Phaser.GameObjects.Image;
  private eagleT = -1;
  private eagleX = 0;
  private eagleY = 0;
  private view!: GameView;

  constructor(private scene: Phaser.Scene) {
    const f = WORLD.cauldron.x;
    this.frontBack = scene.add.image(f, 650, propKey('cauldronBack')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(19).setVisible(false);
    this.frontFront = scene.add.image(f, 650, propKey('cauldronFront')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(19.8).setVisible(false);
    this.ledge = scene.add.image(195, 560, propKey('potLedge')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(8).setVisible(false);
    this.rearBack = scene.add.image(WORLD.cauldronBack.x, 516, propKey('potRearBack')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(8.4).setVisible(false);
    this.rearFront = scene.add.image(WORLD.cauldronBack.x, 516, propKey('potRearFront')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(8.8).setVisible(false);
    this.cheese = scene.add.image(0, 0, propKey('cheese')).setScale(1 / TEX_SCALE).setDepth(26).setVisible(false);
    this.busyBar = scene.add.graphics().setDepth(27);
    for (let i = 0; i < STEAM_PUFFS; i++) {
      const img = scene.add.image(0, 0, propKey('steam')).setDepth(26).setVisible(false);
      this.puffs.push({ img, t: i / STEAM_PUFFS });
    }

    this.chain = scene.add.tileSprite(0, 0, 34, 1200, propKey('hookChain')).setOrigin(0.5, 1).setDepth(17).setVisible(false);
    this.chain.setTileScale(1 / TEX_SCALE);
    this.hook = scene.add.image(0, 0, propKey('perchHook')).setOrigin(0.5, 0).setScale(1 / TEX_SCALE).setDepth(18).setVisible(false);
    this.eagle = scene.add.image(0, 0, propKey('eagleHeadOpen')).setOrigin(20 / 520, 0.5).setScale(1 / TEX_SCALE).setDepth(40).setVisible(false);
  }

  layout(v: GameView) { this.view = v; }

  eagleComes(x: number, y: number) {
    this.eagleX = x;
    this.eagleY = y;
    this.eagleT = 0;
  }

  update(view: ViewState, meta: Meta, tint: number, dt: number, time: number) {
    const owned = meta.owned.includes('cauldron');
    const rear = meta.flags.cauldron === 'back';
    this.frontBack.setVisible(owned && !rear);
    this.frontFront.setVisible(owned && !rear);
    this.ledge.setVisible(owned && rear);
    this.rearBack.setVisible(owned && rear);
    this.rearFront.setVisible(owned && rear);
    for (const img of [this.frontBack, this.frontFront, this.ledge, this.rearBack, this.rearFront]) img.setTint(tint);
    this.updatePot(view, owned, rear, dt, time);
    this.updatePerch(view, meta, tint, dt, time);
  }

  private updatePot(view: ViewState, owned: boolean, rear: boolean, dt: number, time: number) {
    const cx = rear ? WORLD.cauldronBack.x : WORLD.cauldron.x;
    const rimY = rear ? WORLD.cauldronBack.rimY : 610;
    const busy = view.potBusy > 0 && view.potMax > 0;
    const shake = busy ? Math.sin(time * 0.05) * 1.6 : 0;
    this.frontBack.x = this.frontFront.x = WORLD.cauldron.x + shake;
    this.rearBack.x = this.rearFront.x = WORLD.cauldronBack.x + shake;

    const size = rear ? 0.75 : 1;
    for (const p of this.puffs) {
      p.img.setVisible(owned);
      if (!owned) continue;
      p.t += dt * (busy ? 1.6 : 0.5);
      if (p.t > 1) p.t -= 1;
      const u = p.t;
      p.img.setPosition(cx + Math.sin(u * 7 + cx) * 18 * size + (u - 0.5) * 20, rimY - 6 - u * (busy ? 120 : 70));
      p.img.setScale(((0.45 + u * 0.9) * size * (busy ? 1.4 : 1)) / TEX_SCALE);
      p.img.setAlpha((1 - u) * (busy ? 0.95 : 0.5));
    }

    // Cheese takes shape in the pot in the second half of the melt.
    const progress = busy ? 1 - view.potBusy / view.potMax : 0;
    this.cheese.setVisible(owned && busy && progress > 0.4);
    if (this.cheese.visible) {
      const u = (progress - 0.4) / 0.6;
      this.cheese.setPosition(cx, rimY - 8 - u * 26).setScale(((0.3 + u * 0.8) * size) / TEX_SCALE).setRotation(Math.sin(time * 0.02) * 0.12);
    }

    // A ring over the pot that fills up: the plain way of saying "wait".
    const g = this.busyBar;
    g.clear();
    if (owned && busy) {
      const r = 30 * size;
      const y = rimY - 92 * size;
      g.fillStyle(0x2b2118, 0.75);
      g.fillCircle(cx, y, r + 5);
      g.lineStyle(7 * size, 0xf3cb5e, 1);
      g.beginPath();
      g.arc(cx, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      g.strokePath();
    }
  }

  private updatePerch(view: ViewState, meta: Meta, tint: number, dt: number, time: number) {
    const owned = meta.owned.includes('perch');
    this.chain.setVisible(owned);
    this.hook.setVisible(owned);
    const x = perchX(meta.fieldW);
    const busy = view.perchBusy > 0;
    const hookTop = WORLD.perch.hookY - 112;
    const sway = busy ? Math.sin(time * 0.014) * 0.09 : Math.sin(time * 0.002) * 0.02;
    this.chain.setPosition(x, hookTop + 6).setTint(tint);
    this.chain.setRotation(sway * 0.25);
    this.hook.setPosition(x, hookTop).setRotation(sway).setTint(busy ? 0xffd9b0 : tint);

    if (this.eagleT < 0) { this.eagle.setVisible(false); return; }
    this.eagleT += dt;
    const t = this.eagleT;
    const eat = PERCH.eatSeconds;
    const edge = this.view.width + 40;
    let bx: number;
    if (t < EAGLE_IN) bx = edge + (this.eagleX + 14 - edge) * (t / EAGLE_IN);
    else if (t < eat) bx = this.eagleX + 14 + Math.sin((t - EAGLE_IN) * 40) * 6;
    else bx = this.eagleX + 14 + (edge - this.eagleX) * ((t - eat) / EAGLE_OUT);
    const shut = t >= EAGLE_IN && Math.floor((t - EAGLE_IN) * 12) % 2 === 1;
    this.eagle.setVisible(true).setPosition(bx, this.eagleY - 4).setTexture(propKey(shut ? 'eagleHeadShut' : 'eagleHeadOpen'));
    if (t > eat + EAGLE_OUT) this.eagleT = -1;
  }

  reset() { this.eagleT = -1; this.eagle.setVisible(false); }

  get sceneRef() { return this.scene; }
}
