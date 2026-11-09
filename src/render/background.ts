import Phaser from 'phaser';
import { CLOUDS, LANDSCAPE_ART } from '../art/landscapes';
import { DAY, DAYS_PER_LANDSCAPE, LANDSCAPES, type Landscape } from '../config/waves';
import { WORLD } from '../config/world';
import { cloudKey, landscapeKey } from './textures';
import type { GameView } from './viewport';

/** How far to the right the widest supported screen can look. */
const EAST_REACH = 2120;
/** How far above the world the squarest screen can look. */
const SKY_REACH = 640;

export function landscapeForDay(day: number): Landscape {
  return LANDSCAPES[Math.floor((Math.max(1, day) - 1) / DAYS_PER_LANDSCAPE) % LANDSCAPES.length];
}

const hexToRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: number[], b: number[], f: number) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

interface Cloud { img: Phaser.GameObjects.Image; v: number; }

/** Sky colour over the day, parallax layers, clouds and stars. */
export class Background {
  private skyCanvas: HTMLCanvasElement;
  private skyTex: Phaser.Textures.CanvasTexture;
  private sky: Phaser.GameObjects.Image;
  private eastEdge: number = WORLD.width;
  private farEast: Phaser.GameObjects.Image;
  private midEast: Phaser.GameObjects.Image;
  private nearEast: Phaser.GameObjects.Image;
  private groundEast: Phaser.GameObjects.Image;
  private far: Phaser.GameObjects.Image;
  private mid: Phaser.GameObjects.Image;
  private near: Phaser.GameObjects.Image;
  private ground: Phaser.GameObjects.Image;
  private clouds: Cloud[] = [];
  private stars: Phaser.GameObjects.Graphics;
  private land: Landscape | null = null;
  private lastSkyKey = '';
  /** Current light, so that the keep matches the landscape. */
  tint = 0xffffff;
  night = 0;

  constructor(scene: Phaser.Scene) {
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTex = scene.textures.addCanvas('fx:sky', this.skyCanvas)!;
    this.sky = scene.add.image(0, 0, 'fx:sky').setOrigin(0, 0).setDepth(0);

    this.stars = scene.add.graphics().setDepth(1);
    for (let i = 0; i < 260; i++) {
      this.stars.fillStyle(0xffffff, 0.5 + Math.random() * 0.5);
      this.stars.fillCircle(Math.random() * EAST_REACH, -SKY_REACH + Math.random() * (SKY_REACH + 400), 0.6 + Math.random() * 1.2);
    }
    this.stars.setAlpha(0);

    for (let i = 0; i < 11; i++) {
      const idx = i % CLOUDS.length;
      const img = scene.add.image(Math.random() * EAST_REACH, 30 + Math.random() * 170, cloudKey(idx)).setDepth(2);
      img.setScale(0.6 + Math.random() * 0.7).setAlpha(0.9);
      this.clouds.push({ img, v: 14 + Math.random() * 26 });
    }

    const first: Landscape = 'meadow';
    this.far = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'far')).setOrigin(0, 1).setDepth(3);
    this.mid = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'mid')).setOrigin(0, 1).setDepth(4);
    this.near = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'near')).setOrigin(0, 1).setDepth(5);
    this.ground = scene.add.image(0, 590, landscapeKey(first, 'ground')).setOrigin(0, 0).setDepth(6);

    // Mirrored copies continue each layer seamlessly to the right, for fields wider than the strip.
    const east = (of: Phaser.GameObjects.Image, depth: number) =>
      scene.add.image(of.x + of.width, of.y, of.texture.key).setOrigin(0, of.originY).setFlipX(true).setDepth(depth);
    this.farEast = east(this.far, 3);
    this.midEast = east(this.mid, 4);
    this.nearEast = east(this.near, 5);
    this.groundEast = east(this.ground, 6);
  }

  /** Stretches the sky over whatever the screen shows. */
  layout(v: GameView) {
    this.eastEdge = v.width;
    this.sky.setPosition(v.offsetX - 40, v.offsetY - 40).setDisplaySize(v.width + 80, v.height + 80);
  }

  setDay(day: number) {
    const land = landscapeForDay(day);
    if (land === this.land) return;
    this.land = land;
    for (const [main, copy, layer] of this.layers()) {
      main.setTexture(landscapeKey(land, layer));
      copy.setTexture(landscapeKey(land, layer));
    }
    this.lastSkyKey = '';
  }

  private layers(): [Phaser.GameObjects.Image, Phaser.GameObjects.Image, 'far' | 'mid' | 'near' | 'ground'][] {
    return [[this.far, this.farEast, 'far'], [this.mid, this.midEast, 'mid'], [this.near, this.nearEast, 'near'], [this.ground, this.groundEast, 'ground']];
  }

  /** dayT in seconds; handX for a small parallax with the pointer. */
  update(dayT: number, handX: number, dt: number) {
    for (const c of this.clouds) {
      c.img.x -= c.v * dt;
      if (c.img.x < -220) { c.img.x = this.eastEdge + 220; c.img.y = 30 + Math.random() * 170; }
    }
    const offset = Math.max(-1, Math.min(1, (handX - WORLD.width / 2) / (WORLD.width / 2)));
    this.far.x = -160 - offset * 8;
    this.mid.x = -160 - offset * 16;
    this.near.x = -160 - offset * 26;
    this.farEast.x = this.far.x + this.far.width;
    this.midEast.x = this.mid.x + this.mid.width;
    this.nearEast.x = this.near.x + this.near.width;

    const u = Math.min(1, dayT / DAY.seconds);
    this.stars.setAlpha(Math.max(0, (u - 0.72) / 0.2));
    const nightness = Math.max(0, (u - 0.55) / 0.45);
    const shade = Math.round(255 - nightness * 120);
    const tint = Phaser.Display.Color.GetColor(shade, shade, Math.min(255, shade + 26));
    this.tint = tint;
    this.night = nightness;
    for (const [main, copy] of this.layers()) {
      main.setTint(tint);
      copy.setTint(tint);
    }

    const key = u.toFixed(3);
    if (key !== this.lastSkyKey) {
      this.lastSkyKey = key;
      this.paintSky(u);
    }
  }

  private paintSky(u: number) {
    const t = LANDSCAPE_ART[this.land ?? 'meadow'].tint;
    const day = t.day.map(hexToRgb);
    const dusk = t.dusk.map(hexToRgb);
    const night = t.night.map(hexToRgb);
    let top: number[];
    let bottom: number[];
    if (u < 0.5) { top = day[0]; bottom = day[1]; }
    else if (u < 0.75) { const f = (u - 0.5) / 0.25; top = mix(day[0], dusk[0], f); bottom = mix(day[1], dusk[1], f); }
    else { const f = Math.min(1, (u - 0.75) / 0.2); top = mix(dusk[0], night[0], f); bottom = mix(dusk[1], night[1], f); }
    const ctx = this.skyCanvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, css(top));
    g.addColorStop(1, css(bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    this.skyTex.refresh();
  }
}
