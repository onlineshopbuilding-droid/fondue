import Phaser from 'phaser';
import { partKey, propKey, TEX_SCALE } from './textures';
import { WORLD } from '../config/world';

const MAX_PARTICLES = 320;
const MAX_DECALS = 40;

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  g: number;
  rotV: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  fade: boolean;
  bounce: boolean;
  /** Extra vertical scale; below 1 flattens the sprite. */
  squash: number;
  toX?: number;
  toY?: number;
  ground: number;
}

interface FloatText { t: Phaser.GameObjects.Text; life: number; vy: number; }
interface Decal { img: Phaser.GameObjects.Image; life: number; }

/** Lightweight particles and decals. No allocations once the pool is warm. */
export class Effects {
  private free: Phaser.GameObjects.Image[] = [];
  private live: Particle[] = [];
  private texts: FloatText[] = [];
  private freeTexts: Phaser.GameObjects.Text[] = [];
  private decals: Decal[] = [];
  private floatBudget = 3;

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.free.push(scene.add.image(0, 0, propKey('spark')).setVisible(false).setDepth(31));
    }
    for (let i = 0; i < 16; i++) {
      this.freeTexts.push(scene.add.text(0, 0, '', {
        fontFamily: 'Lilita One', fontSize: '26px', color: '#ffd76a', stroke: '#2b2118', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(33).setVisible(false));
    }
    for (let i = 0; i < MAX_DECALS; i++) {
      const img = scene.add.image(0, 0, propKey('splat1')).setVisible(false).setDepth(16);
      this.decals.push({ img, life: 0 });
    }
  }

  private spawn(tex: string, x: number, y: number, o: Partial<Particle> & { life: number }): Particle | null {
    const img = this.free.pop();
    if (!img) return null;
    img.setTexture(tex).setVisible(true).setPosition(x, y).setAlpha(1).setRotation(0).setTint(0xffffff).setOrigin(0.5, 0.5);
    img.setDepth(31);
    const s0 = o.s0 ?? 1;
    img.setScale(s0 / TEX_SCALE);
    const p: Particle = { img, vx: 0, vy: 0, g: 0, rotV: 0, max: o.life, s0, s1: s0, fade: true, bounce: false, squash: 1, ground: WORLD.groundY + 30, ...o };
    this.live.push(p);
    return p;
  }

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.img.setVisible(false);
        this.free.push(p.img);
        this.live[i] = this.live[this.live.length - 1];
        this.live.pop();
        continue;
      }
      if (p.toX !== undefined && p.toY !== undefined) {
        const f = Math.min(1, dt * (5 + (1 - p.life / p.max) * 14));
        p.img.x += (p.toX - p.img.x) * f;
        p.img.y += (p.toY - p.img.y) * f;
      } else {
        p.vy += p.g * dt;
        p.img.x += p.vx * dt;
        p.img.y += p.vy * dt;
        if (p.bounce && p.img.y > p.ground && p.vy > 0) { p.img.y = p.ground; p.vy *= -0.4; p.vx *= 0.6; p.rotV *= 0.5; }
      }
      p.img.rotation += p.rotV * dt;
      const k = p.life / p.max;
      const size = (p.s1 + (p.s0 - p.s1) * k) / TEX_SCALE;
      p.img.setScale(size, size * p.squash);
      if (p.fade) p.img.setAlpha(Math.min(1, k * 1.8));
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i];
      f.life -= dt;
      f.t.y += f.vy * dt;
      f.t.setAlpha(Math.min(1, f.life * 2.5));
      if (f.life <= 0) {
        f.t.setVisible(false);
        this.freeTexts.push(f.t);
        this.texts.splice(i, 1);
      }
    }
    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.img.setAlpha(Math.min(0.75, d.life / 2));
      if (d.life <= 0) d.img.setVisible(false);
    }
  }

  private decal(tex: string, x: number, y: number, scale: number) {
    let best = this.decals[0];
    for (const d of this.decals) if (d.life < best.life) best = d;
    best.life = 4.5;
    best.img.setTexture(tex).setPosition(x, y).setVisible(true).setScale(scale / TEX_SCALE).setRotation(Math.random() * 0.2 - 0.1).setAlpha(0.75);
    best.img.setDepth(16 + (y - WORLD.groundY) / 1000);
  }

  /** The main meaty hit: splat, droplets, armour bits, dust. `power` is 0..1. */
  splat(x: number, y: number, power: number) {
    const key = propKey(`splat${1 + Math.floor(Math.random() * 3)}`);
    // Only something on the road leaves a stain; mid-air kills just spray.
    if (y >= WORLD.groundY - 20) this.decal(key, x, y + 3, 0.7 + power * 0.8);
    const drops = 6 + Math.floor(power * 12);
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI * (0.1 + Math.random() * 0.8);
      const v = 160 + Math.random() * (260 + power * 420);
      this.spawn(propKey('drop1'), x, y - 12, {
        life: 0.45 + Math.random() * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1700, s0: 1, s1: 0.4, bounce: false, rotV: 0,
      });
    }
    const gibs = ['gibHelmet', 'gibPlate', 'gibBoot', 'gibStick'];
    const n = 2 + Math.floor(power * 3);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const v = 220 + Math.random() * 380;
      this.spawn(propKey(gibs[i % gibs.length]), x, y - 18, {
        life: 1.1 + Math.random() * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1800,
        rotV: (Math.random() - 0.5) * 24, bounce: true, ground: y + 4, s0: 1, s1: 0.9,
      });
    }
    this.dust(x, y, power);
  }

  dust(x: number, y: number, power: number) {
    const n = 3 + Math.floor(power * 5);
    for (let i = 0; i < n; i++) {
      this.spawn(propKey('dust'), x + (Math.random() - 0.5) * 30, y - 6, {
        life: 0.4 + Math.random() * 0.2, vx: (Math.random() - 0.5) * 200, vy: -30 - Math.random() * 50, g: 0, s0: 0.4, s1: 0.95 + power * 0.6,
      });
    }
  }

  coin(x: number, y: number, toX: number, toY: number) {
    this.spawn(propKey('coin'), x, y - 20, { life: 0.8, toX, toY, s0: 1, s1: 0.55, fade: false });
  }

  offering(x: number, y: number, toX: number, toY: number) {
    this.spawn(propKey('offering'), x, y - 20, { life: 1.0, toX, toY, s0: 1.4, s1: 0.6, fade: false });
  }

  /** Allows a few floating numbers per frame; an area kill would otherwise pile up an unreadable stack. */
  resetFloatBudget() { this.floatBudget = 3; }

  floatText(x: number, y: number, text: string, color = '#ffd76a') {
    if (this.floatBudget <= 0) return;
    const t = this.freeTexts.pop();
    if (!t) return;
    this.floatBudget--;
    t.setText(text).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1);
    this.texts.push({ t, life: 0.9, vy: -80 });
  }

  explosion(x: number, y: number, radius: number) {
    const p = this.spawn('fx:burst', x, y, { life: 0.33, s0: (radius * 0.6 * TEX_SCALE) / 128, s1: (radius * 1.25 * TEX_SCALE) / 128 });
    p?.img.setDepth(34);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 200 + Math.random() * 500;
      this.spawn(propKey('spark'), x, y, { life: 0.3 + Math.random() * 0.25, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 800, s0: 1.4, s1: 0.2 });
    }
    this.dust(x, Math.min(y + 30, WORLD.groundY + 20), 1);
  }

  ring(x: number, y: number, radius: number, tint: number) {
    const p = this.spawn('fx:ring', x, y, { life: 0.45, s0: (radius * 0.2 * TEX_SCALE) / 128, s1: (radius * TEX_SCALE) / 128 });
    p?.img.setTint(tint);
  }

  sparks(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 140 + Math.random() * 300;
      this.spawn(propKey('spark'), x, y, { life: 0.25 + Math.random() * 0.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, s0: 1, s1: 0.2 });
    }
  }

  iceShards(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * Math.random();
      const v = 180 + Math.random() * 420;
      const p = this.spawn(propKey('gibPlate'), x, y, { life: 0.7, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1600, rotV: (Math.random() - 0.5) * 30, s0: 0.8, s1: 0.5 });
      p?.img.setTint(0xbfe8ff);
    }
  }

  splash(x: number, y: number) {
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI * (0.2 + Math.random() * 0.6);
      const v = 240 + Math.random() * 460;
      const p = this.spawn(propKey('drop1'), x + (Math.random() - 0.5) * 60, y - 30, { life: 0.7, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1900, s0: 1.4, s1: 0.6 });
      p?.img.setTint(0xffd166);
    }
  }

  fadingProp(key: string, x: number, y: number, life: number, scale = 1, originY = 1) {
    const p = this.spawn(propKey(key), x, y, { life, s0: scale, s1: scale });
    p?.img.setOrigin(0.5, originY);
  }

  /** The flattened body that stays for a moment after a hard landing. */
  flattened(rig: string, x: number, y: number) {
    const key = partKey(rig, 'body');
    if (!this.scene.textures.exists(key)) return;
    const p = this.spawn(key, x, y + 4, { life: 0.32, s0: 1.5, s1: 1.15, squash: 0.32 });
    p?.img.setOrigin(0.5, 1).setDepth(21);
  }

  /** Air streaks behind a fast-flying enemy. */
  streak(x: number, y: number) {
    this.spawn(propKey('dust'), x, y, { life: 0.16, s0: 0.3, s1: 0.05, g: 0 });
  }
}
