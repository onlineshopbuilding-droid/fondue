// Draws the two stations: the Great Cauldron on its mound and the Eagle Perch with its eagle.
import Phaser from 'phaser';
import { WORLD } from '../config/field';
import { CRESTS } from '../config/crests';
import { PERCH } from '../config/keep';
import type { ViewState } from '../net/snapshot';
import type { Meta } from '../sim/types';
import { propKey, TEX_SCALE } from './textures';
import type { GameView } from './viewport';

const STEAM_PUFFS = 4;
const EAGLE_IN = 0.22;
const EAGLE_OUT = 0.28;
/** The pot's art: its bottom edge lies this far below the middle of its rim. */
const POT_FOOT = 60;
/** The pot on the mound is drawn at this size of the road pot's art; steam and cheese follow. */
const POT_SIZE = 0.75;

interface Puff { img: Phaser.GameObjects.Image; t: number; }

/** Great Cauldron on its mound behind the road, and the eagle's hook with the eagle that comes for it. */
export class Stations {
  private mound: Phaser.GameObjects.Image;
  private potBack: Phaser.GameObjects.Image;
  private potFront: Phaser.GameObjects.Image;
  private cheese: Phaser.GameObjects.Image;
  private puffs: Puff[] = [];
  private busyBar: Phaser.GameObjects.Graphics;
  private ringCheese: Phaser.GameObjects.Image;

  private chain: Phaser.GameObjects.TileSprite;
  private hook: Phaser.GameObjects.Image;
  private eagle: Phaser.GameObjects.Image;
  /** The small target on the hook (C6), shown while a raider is in a hand. */
  private target: Phaser.GameObjects.Graphics;
  private eagleT = -1;
  private eagleX = 0;
  private eagleY = 0;
  private splashT = 0;
  private view!: GameView;

  constructor(scene: Phaser.Scene) {
    const { x, rimY } = WORLD.cauldron;
    // Mound below the pot; a raider melting in it is drawn between the pot's back and its front.
    this.mound = scene.add.image(x, rimY + POT_FOOT - 1, propKey('potMound')).setOrigin(0.5, 22 / 90).setScale(1 / TEX_SCALE).setDepth(8.2).setVisible(false);
    this.potBack = scene.add.image(x, rimY + POT_FOOT, propKey('potRearBack')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(8.4).setVisible(false);
    this.potFront = scene.add.image(x, rimY + POT_FOOT, propKey('potRearFront')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setDepth(8.8).setVisible(false);
    this.cheese = scene.add.image(0, 0, propKey('cheese')).setScale(1 / TEX_SCALE).setDepth(8.9).setVisible(false);
    this.busyBar = scene.add.graphics().setDepth(27);
    this.ringCheese = scene.add.image(0, 0, propKey('cheese')).setDepth(27.1).setVisible(false);
    for (let i = 0; i < STEAM_PUFFS; i++) {
      const img = scene.add.image(0, 0, propKey('steam')).setDepth(8.95).setVisible(false);
      this.puffs.push({ img, t: i / STEAM_PUFFS });
    }

    this.chain = scene.add.tileSprite(0, 0, 34, 1200, propKey('hookChain')).setOrigin(0.5, 1).setDepth(17).setVisible(false);
    this.chain.setTileScale(1 / TEX_SCALE);
    this.hook = scene.add.image(0, 0, propKey('perchHook')).setOrigin(0.5, 0).setScale(1 / TEX_SCALE).setDepth(18).setVisible(false);
    this.target = scene.add.graphics().setDepth(18.5);
    this.eagle = scene.add.image(0, 0, propKey('eagleHeadOpen')).setOrigin(20 / 520, 0.5).setScale(1 / TEX_SCALE).setDepth(40).setVisible(false);
  }

  layout(v: GameView) { this.view = v; }

  eagleComes(x: number, y: number) {
    this.eagleX = x;
    this.eagleY = y;
    this.eagleT = 0;
  }

  /** Something landed in the pot: it jolts for a moment. */
  potSplash() { this.splashT = 0.3; }

  /**
   * `hook` is where the eagle hook hangs (see camera.hookAt). A station not built yet is not drawn.
   */
  update(view: ViewState, meta: Meta, tint: number, dt: number, time: number, hook: { x: number; top: number }) {
    const owned = !!meta.loadout.stations.cauldron;
    for (const img of [this.mound, this.potBack, this.potFront]) img.setVisible(owned).setAlpha(1);
    this.mound.setTint(tint);
    this.potFront.setTint(tint);
    // The molten cheese is the glow of the scene, so the inside of the pot stays lit at night.
    const lit = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(tint), Phaser.Display.Color.ValueToColor(0xffffff), 100, 70);
    this.potBack.setTint(Phaser.Display.Color.GetColor(lit.r, lit.g, lit.b));
    this.updatePot(view, owned, dt, time);
    this.updatePerch(view, meta, tint, dt, time, hook);
  }

  private updatePot(view: ViewState, owned: boolean, dt: number, time: number) {
    const { x: cx, rimY } = WORLD.cauldron;
    const busy = view.potBusy > 0 && view.potMax > 0;
    this.splashT = Math.max(0, this.splashT - dt);
    const jolt = this.splashT > 0 ? Math.sin(this.splashT * 60) * this.splashT * 10 : 0;
    const shake = (busy ? Math.sin(time * 0.05) * 1.6 : 0) + jolt;
    this.potBack.x = this.potFront.x = cx + shake;

    const size = POT_SIZE;
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

    // A ring over the pot that fills up: the plain way of saying "taken, wait".
    const g = this.busyBar;
    g.clear();
    if (owned && busy) {
      const r = 22 * size;
      const y = rimY - 88 * size;
      g.lineStyle(9 * size, 0x2b2118, 0.65);
      g.strokeCircle(cx, y, r);
      g.lineStyle(5 * size, 0xf3cb5e, 1);
      g.beginPath();
      g.arc(cx, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      g.strokePath();
      this.ringCheese.setVisible(true).setPosition(cx, y).setScale((0.42 * size) / TEX_SCALE);
    } else {
      this.ringCheese.setVisible(false);
    }
  }

  private updatePerch(view: ViewState, meta: Meta, tint: number, dt: number, time: number, at: { x: number; top: number }) {
    const owned = !!meta.loadout.stations.perch;
    this.chain.setVisible(owned).setAlpha(1);
    this.hook.setVisible(owned).setAlpha(1);
    const x = at.x;
    const busy = view.perchBusy > 0;
    const hookTop = at.top;
    const sway = busy ? Math.sin(time * 0.014) * 0.09 : Math.sin(time * 0.002) * 0.02;
    this.chain.setPosition(x, hookTop + 6).setTint(tint);
    this.chain.setRotation(sway * 0.25);
    this.hook.setPosition(x, hookTop).setRotation(sway).setTint(busy ? 0xffd9b0 : tint);
    // The catch is small: a ring of its size shows where to aim while a raider is held.
    const g = this.target;
    g.clear();
    if (owned && !busy && view.enemies.some((e) => e.st === 'held' && e.type !== 'siegeCart')) {
      const pulse = 0.55 + Math.sin(time * 0.008) * 0.25;
      g.lineStyle(3, 0x2b2118, 0.5 * pulse);
      g.strokeCircle(x, WORLD.perch.hookY, CRESTS.hookRadius + 1.5);
      g.lineStyle(2, 0xfff1c0, pulse);
      g.strokeCircle(x, WORLD.perch.hookY, CRESTS.hookRadius);
    }

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

  reset() { this.eagleT = -1; this.eagle.setVisible(false); this.splashT = 0; }
}
