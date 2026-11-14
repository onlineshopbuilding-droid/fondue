// The landscape behind the field: its layers, the light from day to night, and the parallax as the camera moves.
import Phaser from 'phaser';
import { CLOUDS, LANDSCAPE_ART, type SkyStops } from '../art/landscapes';
import { rng } from '../art/shade';
import type { Landscape } from '../config/waves';
import { WORLD } from '../config/field';
import { CLOUD_SCALE, LAND_SCALE, cloudKey, landscapeKey, landscapeReady, wantLandscape } from './textures';
import type { GameView } from './viewport';

/** How far to the right the widest supported screen can look. */
const EAST_REACH = 2120;
/** World x the landscape covers on the left (behind and beyond the keep), so no edge ever shows. */
const WEST_LEFT = -392;
/** How far left of the field the landscape reaches, with some room for parallax. */
const WEST_REACH = -WEST_LEFT + 60;
/** How far above the world the squarest screen can look. */
const SKY_REACH = 640;

/**
 * The sky gradient lives in world space, so its horizon glow always sits behind the mountains,
 * whatever the screen shows. World y of each stop: zenith, upper sky, horizon, glow.
 */
const SKY_TOP = -SKY_REACH - 60;
const SKY_BOTTOM = WORLD.height + 60;
const SKY_STOPS = [-300, 200, 470, 575];

/** How strongly each layer takes on the colour of the air at dusk and night: distance haze. */
const HAZE = { far: 0.6, mid: 0.38, near: 0.18, ground: 0 } as const;
type Layer = keyof typeof HAZE;

/** A night level is dark from the start: the light as late in the evening as this. */
const NIGHT_LEVEL_U = 0.93;

const hexToRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: number[], b: number[], f: number) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgbInt = (c: number[]) => Phaser.Display.Color.GetColor(Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2]));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const WHITE = [255, 255, 255];

interface Cloud { img: Phaser.GameObjects.Image; v: number; depth: number; }

/** A soft disc with a halo, white so that it can be tinted: the sun. */
function sunCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const halo = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  halo.addColorStop(0, 'rgba(255,255,255,0.6)');
  halo.addColorStop(0.25, 'rgba(255,255,255,0.22)');
  halo.addColorStop(0.6, 'rgba(255,255,255,0.06)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 256, 256);
  const disc = ctx.createRadialGradient(120, 120, 2, 128, 128, 27);
  disc.addColorStop(0, 'rgba(255,255,255,1)');
  disc.addColorStop(0.85, 'rgba(255,250,240,1)');
  disc.addColorStop(1, 'rgba(255,244,225,0.9)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(128, 128, 26, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** A broad, very soft glow, tinted with the colour of the air around the sun or the moon. */
function glowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

/** The moon, lit from the upper left like everything else, with soft grey seas and a few craters. */
function moonCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  const R = rng(5);
  const g = ctx.createRadialGradient(50, 48, 4, 64, 64, 44);
  g.addColorStop(0, '#fffbea');
  g.addColorStop(0.65, '#eee8d2');
  g.addColorStop(1, '#c3bfcc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(160,156,170,0.35)';
  for (const [x, y, rx, ry] of [[52, 52, 13, 9], [74, 70, 11, 8], [62, 82, 8, 5], [80, 48, 6, 5]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = 34 + R() * 60;
    const y = 34 + R() * 60;
    const r = 1.5 + R() * 3;
    ctx.fillStyle = 'rgba(150,146,160,0.35)';
    ctx.beginPath(); ctx.arc(x + 0.6, y + 0.6, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,240,0.4)';
    ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // Shadow side, lower right.
  const s = ctx.createRadialGradient(40, 38, 30, 52, 50, 70);
  s.addColorStop(0, 'rgba(60,64,110,0)');
  s.addColorStop(1, 'rgba(60,64,110,0.45)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, 128, 128);
  ctx.restore();
  return c;
}

/** Sky colour over the day, sun and moon, parallax layers with distance haze, clouds and stars. */
export class Background {
  private skyCanvas: HTMLCanvasElement;
  private skyTex: Phaser.Textures.CanvasTexture;
  private sky: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Image;
  private moon: Phaser.GameObjects.Image;
  private moonGlow: Phaser.GameObjects.Image;
  private eastEdge: number = WORLD.width;
  private farEast: Phaser.GameObjects.Image;
  private midEast: Phaser.GameObjects.Image;
  private nearEast: Phaser.GameObjects.Image;
  private groundEast: Phaser.GameObjects.Image;
  private farWest: Phaser.GameObjects.Image;
  private midWest: Phaser.GameObjects.Image;
  private nearWest: Phaser.GameObjects.Image;
  private groundWest: Phaser.GameObjects.Image;
  private far: Phaser.GameObjects.Image;
  private mid: Phaser.GameObjects.Image;
  private near: Phaser.GameObjects.Image;
  private ground: Phaser.GameObjects.Image;
  private clouds: Cloud[] = [];
  private stars: Phaser.GameObjects.Graphics;
  private twinkleA: Phaser.GameObjects.Graphics;
  private twinkleB: Phaser.GameObjects.Graphics;
  private rand = rng(7);
  private clock = 0;
  private land: Landscape | null = null;
  private lastSkyKey = '';
  /** Current light, so that the keep matches the landscape. */
  tint = 0xffffff;
  night = 0;

  constructor(scene: Phaser.Scene) {
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 512;
    this.skyTex = scene.textures.addCanvas('fx:sky', this.skyCanvas)!;
    this.sky = scene.add.image(0, SKY_TOP, 'fx:sky').setOrigin(0, 0).setDepth(0);
    this.sky.setDisplaySize(WORLD.width + 80, SKY_BOTTOM - SKY_TOP);

    if (!scene.textures.exists('fx:sun')) scene.textures.addCanvas('fx:sun', sunCanvas());
    if (!scene.textures.exists('fx:skyglow')) scene.textures.addCanvas('fx:skyglow', glowCanvas());
    if (!scene.textures.exists('fx:moon')) scene.textures.addCanvas('fx:moon', moonCanvas());
    this.glow = scene.add.image(0, 0, 'fx:skyglow').setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.moonGlow = scene.add.image(0, 0, 'fx:skyglow').setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setTint(0x9fb4e0);
    this.sun = scene.add.image(0, 0, 'fx:sun').setDepth(1.5);
    this.moon = scene.add.image(0, 0, 'fx:moon').setDepth(1.5).setScale(0.62);

    // Stars: many faint ones, fewer bright ones that twinkle in two groups, warm and cool hues.
    const R = rng(3);
    const hues = [0xffffff, 0xffffff, 0xfff0d2, 0xdde7ff];
    this.stars = scene.add.graphics().setDepth(1);
    this.twinkleA = scene.add.graphics().setDepth(1);
    this.twinkleB = scene.add.graphics().setDepth(1);
    for (let i = 0; i < 300; i++) {
      const x = -WEST_REACH + R() * (EAST_REACH + WEST_REACH);
      const y = -SKY_REACH + Math.pow(R(), 1.3) * (SKY_REACH + 500);
      const low = clamp01((y - 200) / 300);
      this.stars.fillStyle(hues[Math.floor(R() * hues.length)], (0.25 + R() * 0.55) * (1 - low * 0.7));
      this.stars.fillCircle(x, y, 0.5 + R() * 0.9);
    }
    for (let i = 0; i < 46; i++) {
      const g = i % 2 ? this.twinkleA : this.twinkleB;
      const x = -WEST_REACH + R() * (EAST_REACH + WEST_REACH);
      const y = -SKY_REACH + Math.pow(R(), 1.2) * (SKY_REACH + 420);
      const r = 1 + R() * 1.1;
      const hue = hues[Math.floor(R() * hues.length)];
      g.fillStyle(hue, 0.25);
      g.fillCircle(x, y, r * 2.4);
      g.fillStyle(hue, 1);
      g.fillCircle(x, y, r);
      if (r > 1.7) {
        g.lineStyle(1, hue, 0.7);
        g.lineBetween(x - r * 3.5, y, x + r * 3.5, y);
        g.lineBetween(x, y - r * 3.5, x, y + r * 3.5);
      }
    }
    for (const g of [this.stars, this.twinkleA, this.twinkleB]) g.setAlpha(0);

    // Clouds at different depths: far ones are smaller, lower, slower and fainter.
    for (let i = 0; i < 12; i++) {
      const d = (i + 0.5) / 12;
      const img = scene.add.image(this.rand() * EAST_REACH, 0, cloudKey(i % CLOUDS.length)).setDepth(2 + d * 0.1);
      img.setScale((0.42 + d * 0.78) / CLOUD_SCALE).setAlpha(0.72 + d * 0.26);
      if (i % 3 === 1) img.setFlipX(true);
      const c = { img, v: 6 + d * 26, depth: d };
      this.placeCloudY(c);
      this.clouds.push(c);
    }

    // Textures are rasterised finer than world pixels (LAND_SCALE); scaling back keeps world sizes.
    const first: Landscape = 'meadow';
    this.far = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'far')).setOrigin(0, 1).setDepth(3).setScale(1 / LAND_SCALE.far);
    this.mid = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'mid')).setOrigin(0, 1).setDepth(4).setScale(1 / LAND_SCALE.mid);
    this.near = scene.add.image(-160, WORLD.groundY, landscapeKey(first, 'near')).setOrigin(0, 1).setDepth(5).setScale(1 / LAND_SCALE.near);
    this.ground = scene.add.image(0, 590, landscapeKey(first, 'ground')).setOrigin(0, 0).setDepth(6).setScale(1 / LAND_SCALE.ground);

    // Mirrored copies continue each layer seamlessly to the right, for fields wider than the strip.
    const east = (of: Phaser.GameObjects.Image, depth: number) =>
      scene.add.image(of.x + of.displayWidth, of.y, of.texture.key).setOrigin(0, of.originY).setScale(of.scaleX, of.scaleY).setFlipX(true).setDepth(depth);
    this.farEast = east(this.far, 3);
    this.midEast = east(this.mid, 4);
    this.nearEast = east(this.near, 5);
    this.groundEast = east(this.ground, 6);
    // And to the left, behind and beyond the keep.
    const west = (of: Phaser.GameObjects.Image, depth: number) =>
      scene.add.image(of.x - of.displayWidth, of.y, of.texture.key).setOrigin(0, of.originY).setScale(of.scaleX, of.scaleY).setFlipX(true).setDepth(depth);
    this.farWest = west(this.far, 3);
    this.midWest = west(this.mid, 4);
    this.nearWest = west(this.near, 5);
    this.groundWest = west(this.ground, 6);
  }

  /** Far clouds hang low near the horizon, near ones high up. */
  private placeCloudY(c: Cloud) {
    c.img.y = 250 - c.depth * 220 - this.rand() * 90;
  }

  /** Stretches the sky over whatever the screen shows. */
  layout(v: GameView) {
    this.eastEdge = v.width;
    const top = Math.min(SKY_TOP, v.offsetY - 40);
    const left = Math.min(v.offsetX, WEST_LEFT) - 40;
    this.sky.setPosition(left, top).setDisplaySize(v.offsetX + v.width + 40 - left, SKY_BOTTOM - top);
    this.lastSkyKey = '';
  }

  /** The landscape on screen; the keep dresses itself for this one. */
  get shown(): Landscape { return this.land ?? 'meadow'; }

  /** Shows a landscape (from `meta.today.landscape`). */
  setLandscape(land: Landscape) {
    if (land === this.land) return;
    // Later landscapes are prepared in the background after boot; until then the old one stays.
    if (!landscapeReady(land)) { wantLandscape(land); return; }
    this.land = land;
    for (const [main, copy, layer] of this.layers()) {
      main.setTexture(landscapeKey(land, layer));
      copy.setTexture(landscapeKey(land, layer));
    }
    this.lastSkyKey = '';
  }

  private layers(): [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Layer][] {
    return [[this.far, this.farEast, 'far'], [this.mid, this.midEast, 'mid'], [this.near, this.nearEast, 'near'], [this.ground, this.groundEast, 'ground'],
      [this.far, this.farWest, 'far'], [this.mid, this.midWest, 'mid'], [this.near, this.nearWest, 'near'], [this.ground, this.groundWest, 'ground']];
  }

  /** The four sky colours at time u (0 dawn of the fight, 1 its end). */
  private skyAt(u: number): number[][] {
    const t = LANDSCAPE_ART[this.land ?? 'meadow'].tint;
    const rows = (s: SkyStops) => s.map(hexToRgb);
    const day = rows(t.day);
    const dusk = rows(t.dusk);
    const night = rows(t.night);
    if (u < 0.5) return day;
    if (u < 0.75) { const f = (u - 0.5) / 0.25; return day.map((c, i) => mix(c, dusk[i], f)); }
    const f = Math.min(1, (u - 0.75) / 0.2);
    return dusk.map((c, i) => mix(c, night[i], f));
  }

  /**
   * skyT of skySeconds: how far the light has gone from day to night (the scene passes the level's waves);
   * `nightLevel` keeps the whole level dark;
   * handX for a small parallax with the pointer.
   */
  update(skyT: number, skySeconds: number, nightLevel: boolean, handX: number, dt: number) {
    this.clock += dt;
    for (const c of this.clouds) {
      c.img.x -= c.v * dt;
      if (c.img.x < -WEST_REACH - 240) { c.img.x = this.eastEdge + 240; this.placeCloudY(c); }
    }
    const offset = Math.max(-1, Math.min(1, (handX - WORLD.width / 2) / (WORLD.width / 2)));
    this.far.x = -160 - offset * 8;
    this.mid.x = -160 - offset * 16;
    this.near.x = -160 - offset * 26;
    this.farEast.x = this.far.x + this.far.displayWidth;
    this.midEast.x = this.mid.x + this.mid.displayWidth;
    this.nearEast.x = this.near.x + this.near.displayWidth;
    this.farWest.x = this.far.x - this.far.displayWidth;
    this.midWest.x = this.mid.x - this.mid.displayWidth;
    this.nearWest.x = this.near.x - this.near.displayWidth;

    const u = nightLevel ? NIGHT_LEVEL_U : skySeconds > 0 ? Math.min(1, skyT / skySeconds) : 0;
    const sky = this.skyAt(u);
    const starA = Math.max(0, (u - 0.72) / 0.2);
    this.stars.setAlpha(starA);
    this.twinkleA.setAlpha(starA * (0.6 + 0.4 * Math.sin(this.clock * 1.7)));
    this.twinkleB.setAlpha(starA * (0.6 + 0.4 * Math.sin(this.clock * 1.3 + 2)));

    const nightness = Math.max(0, (u - 0.55) / 0.45);
    const shade = Math.round(255 - nightness * 120);
    const light = [shade, shade, Math.min(255, shade + 26)];
    this.tint = rgbInt(light);
    this.night = nightness;
    // Distance haze: from late afternoon on, far layers take on the colour of the air.
    const air = mix(sky[2], WHITE, 0.45 - nightness * 0.15);
    const haze = clamp01((u - 0.45) / 0.3);
    for (const [main, copy, layer] of this.layers()) {
      const t = rgbInt(mix(light, air, HAZE[layer] * haze));
      main.setTint(t);
      copy.setTint(t);
    }

    // Clouds: white by day, lit warm from below at dusk, dark and bluish at night.
    const duskCloud = mix(WHITE, sky[3], 0.5);
    let cloud = WHITE;
    if (u > 0.5 && u <= 0.75) cloud = mix(WHITE, duskCloud, (u - 0.5) / 0.2);
    else if (u > 0.75) cloud = mix(mix(WHITE, duskCloud, 1), mix(sky[1], WHITE, 0.22), Math.min(1, (u - 0.75) / 0.15));
    const cloudTint = rgbInt(cloud);
    for (const c of this.clouds) c.img.setTint(cloudTint);

    // The sun sinks from the upper left into the far hills; the moon rises on the right.
    const f = Math.min(1, u / 0.75);
    const sunX = 600 - 170 * f;
    const sunY = 150 + 275 * Math.pow(f, 1.6);
    const warm = clamp01((u - 0.4) / 0.32);
    const sunA = 1 - clamp01((u - 0.74) / 0.06);
    this.sun.setPosition(sunX, sunY).setScale(1 + warm * 0.3).setAlpha(sunA).setTint(rgbInt(mix([255, 246, 220], [255, 170, 96], warm)));
    this.glow.setPosition(sunX, sunY + 20).setScale(3.4 + warm * 2.2).setAlpha(sunA * (0.22 + warm * 0.38)).setTint(rgbInt(mix(sky[3], WHITE, 0.2)));
    const moonA = clamp01((u - 0.6) / 0.28);
    const moonY = 230 - 80 * clamp01((u - 0.6) / 0.4);
    this.moon.setPosition(900, moonY).setAlpha(moonA);
    this.moonGlow.setPosition(900, moonY).setAlpha(moonA * 0.3);

    const key = u.toFixed(3);
    if (key !== this.lastSkyKey) {
      this.lastSkyKey = key;
      this.paintSky(sky);
    }
  }

  private paintSky(sky: number[][]) {
    const ctx = this.skyCanvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    // The sky image spans SKY_TOP..SKY_BOTTOM by default; layout may stretch it higher on square screens.
    const top = this.sky.y;
    const span = this.sky.displayHeight;
    SKY_STOPS.forEach((y, i) => g.addColorStop(clamp01((y - top) / span), css(sky[i])));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
    this.skyTex.refresh();
  }
}
