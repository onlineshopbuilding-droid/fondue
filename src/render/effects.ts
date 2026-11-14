// Short visual effects: particles, decals, floating gold numbers and line effects such as lightning.
import Phaser from 'phaser';
import { partKey, propKey, TEX_SCALE } from './textures';
import { WORLD } from '../config/field';
import type { ViewZone } from '../net/snapshot';

const MAX_PARTICLES = 320;
const MAX_DECALS = 40;
/** Floating gold numbers: enough for a big blast that kills a whole crowd at once. */
const MAX_FLOAT_TEXTS = 64;
/** Numbers of one frame after the first are stacked this far apart, so every one stays readable. */
const FLOAT_STACK_Y = 22;
const FLOAT_STACK_X = 18;
/** How long a number floats, and how much later each stacked one appears. */
const FLOAT_LIFE = 0.9;
const FLOAT_STAGGER = 0.06;

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
  /** Peak opacity. */
  a0: number;
  /** Air drag per second: puffs and smoke slow down instead of sliding on forever. */
  drag: number;
  /** Ease-out growth: the size changes fast at first, then settles. Good for puffs and rings. */
  ease: boolean;
}

interface FloatText { t: Phaser.GameObjects.Text; life: number; vy: number; delay: number; }

/** Something drawn as lines each frame: a lightning bolt, a crossbow streak, a sound wave, forks out of the road. */
type Stroke =
  | { k: 'bolt'; pts: number[]; life: number; max: number }
  | { k: 'streak'; x: number; y: number; tx: number; ty: number; life: number; max: number; color: number }
  | { k: 'wave'; x0: number; y: number; reach: number; life: number; max: number }
  | { k: 'forks'; x: number; halfWidth: number; life: number; max: number };
interface Decal { img: Phaser.GameObjects.Image; life: number; s: number; }
const DECAL_LIFE = 4.5;
const DECAL_SPREAD = 0.12;

/** Lightweight particles and decals. No allocations once the pool is warm. */
export class Effects {
  private free: Phaser.GameObjects.Image[] = [];
  private live: Particle[] = [];
  private texts: FloatText[] = [];
  private freeTexts: Phaser.GameObjects.Text[] = [];
  private decals: Decal[] = [];
  /** Numbers already shown in this frame, for stacking the next one. */
  private floatsThisFrame = 0;
  private lines: Phaser.GameObjects.Graphics;
  private strokes: Stroke[] = [];
  /** Pictures of the snow drifts and hot cheese pools on the road, by zone id. */
  private zoneViews = new Map<number, Phaser.GameObjects.Image[]>();

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.free.push(scene.add.image(0, 0, propKey('spark')).setVisible(false).setDepth(31));
    }
    for (let i = 0; i < MAX_FLOAT_TEXTS; i++) {
      this.freeTexts.push(scene.add.text(0, 0, '', {
        fontFamily: 'Lilita One', fontSize: '26px', color: '#ffd76a', stroke: '#2b2118', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(33).setVisible(false));
    }
    this.lines = scene.add.graphics().setDepth(34.5);
    for (let i = 0; i < MAX_DECALS; i++) {
      const img = scene.add.image(0, 0, propKey('splat1')).setVisible(false).setDepth(16);
      this.decals.push({ img, life: 0, s: 1 });
    }
  }

  private spawn(tex: string, x: number, y: number, o: Partial<Particle> & { life: number }): Particle | null {
    const img = this.free.pop();
    if (!img) return null;
    img.setTexture(tex).setVisible(true).setPosition(x, y).setRotation(0).setTint(0xffffff).setOrigin(0.5, 0.5);
    img.setDepth(31).setBlendMode(Phaser.BlendModes.NORMAL);
    const s0 = o.s0 ?? 1;
    const p: Particle = {
      img, vx: 0, vy: 0, g: 0, rotV: 0, max: o.life, s0, s1: s0, fade: true, bounce: false, squash: 1, ground: WORLD.groundY + 30,
      a0: 1, drag: 0, ease: false, ...o,
    };
    img.setScale(s0 / TEX_SCALE, (s0 / TEX_SCALE) * p.squash).setAlpha(p.a0);
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
        if (p.drag > 0) {
          const f = Math.max(0, 1 - p.drag * dt);
          p.vx *= f;
          p.vy *= f;
        }
        p.vy += p.g * dt;
        p.img.x += p.vx * dt;
        p.img.y += p.vy * dt;
        if (p.bounce && p.img.y > p.ground && p.vy > 0) { p.img.y = p.ground; p.vy *= -0.4; p.vx *= 0.6; p.rotV *= 0.5; }
      }
      p.img.rotation += p.rotV * dt;
      const k = p.life / p.max;
      const e = p.ease ? k * k : k;
      const size = (p.s1 + (p.s0 - p.s1) * e) / TEX_SCALE;
      p.img.setScale(size, size * p.squash);
      if (p.fade) p.img.setAlpha(Math.min(1, k * 1.8) * p.a0);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i];
      if (f.delay > 0) { f.delay -= dt; f.t.setVisible(f.delay <= 0); continue; }
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
      // A fresh stain spreads out over its first moment instead of popping in at full size.
      const spread = (DECAL_LIFE - d.life) / DECAL_SPREAD;
      if (spread < 1.2) d.img.setScale((d.s * (0.55 + 0.45 * Math.min(1, spread))) / TEX_SCALE);
      d.img.setAlpha(Math.min(0.75, d.life / 2));
      if (d.life <= 0) d.img.setVisible(false);
    }
    this.drawStrokes(dt);
  }

  private decal(tex: string, x: number, y: number, scale: number) {
    let best = this.decals[0];
    for (const d of this.decals) if (d.life < best.life) best = d;
    best.life = DECAL_LIFE;
    best.s = scale;
    best.img.setTexture(tex).setPosition(x, y).setVisible(true).setScale((scale * 0.55) / TEX_SCALE).setRotation(Math.random() * 0.2 - 0.1).setAlpha(0.75);
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

  /** Layered puffs that burst out, slow down, swell and fade; a hard hit also skids low along the road. */
  dust(x: number, y: number, power: number) {
    const n = 3 + Math.floor(power * 5);
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const p = this.spawn(propKey('dust'), x + (Math.random() - 0.5) * 30, y - 6 - Math.random() * 8, {
        life: 0.5 + Math.random() * 0.3, vx: side * (50 + Math.random() * 150) * (0.7 + power * 0.6), vy: -25 - Math.random() * 70,
        g: -30, drag: 3.2, ease: true, a0: 0.92, s0: 0.35, s1: 0.9 + power * 0.6 + Math.random() * 0.25, rotV: (Math.random() - 0.5) * 0.8,
      });
      // Two tones of dust give the cloud depth; the warmer one sits behind.
      if (p) {
        p.img.setRotation((Math.random() - 0.5) * 0.5);
        if (i % 3 === 1) p.img.setTint(0xe6d8bd).setDepth(30.9);
      }
    }
    if (power < 0.6) return;
    for (let side = -1; side <= 1; side += 2) {
      this.spawn(propKey('dust'), x + side * 12, y - 2, {
        life: 0.45, vx: side * 300, vy: -8, drag: 5, ease: true, a0: 0.8, s0: 0.4, s1: 1.15, squash: 0.5,
      });
    }
  }

  coin(x: number, y: number, toX: number, toY: number) {
    this.spawn(propKey('coin'), x, y - 20, { life: 0.8, toX, toY, s0: 1, s1: 0.55, fade: false });
    this.twinkle(x, y - 20, 0xffffff);
  }

  offering(x: number, y: number, toX: number, toY: number) {
    this.spawn(propKey('offering'), x, y - 20, { life: 1.0, toX, toY, s0: 1.4, s1: 0.6, fade: false });
    this.twinkle(x, y - 20, 0x9ff5ea);
  }

  /** Two quick spinning glints where a pickup appears. */
  private twinkle(x: number, y: number, tint: number) {
    for (let i = 0; i < 2; i++) {
      const p = this.spawn(propKey('spark'), x + (i ? 14 : -12), y + (i ? -10 : 6), { life: 0.32 + i * 0.1, s0: 1.5 - i * 0.4, s1: 0.1, rotV: i ? -5 : 5 });
      p?.img.setTint(tint).setDepth(33);
    }
  }

  /** Starts a new frame for stacking floating numbers. */
  resetFloatBudget() { this.floatsThisFrame = 0; }

  /**
   * A floating number or word. Every one is shown: when many come in the same frame (a blast that
   * kills a crowd), each next one sits a little higher and to the side and appears a moment later.
   */
  floatText(x: number, y: number, text: string, color = '#ffd76a') {
    let t = this.freeTexts.pop();
    if (!t) {
      // The pool is used up: take the oldest number still floating.
      const oldest = this.texts.shift();
      if (!oldest) return;
      t = oldest.t;
    }
    const k = this.floatsThisFrame++;
    const side = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
    const dx = Math.max(-4, Math.min(4, side)) * FLOAT_STACK_X;
    const dy = -Math.min(k, 8) * FLOAT_STACK_Y * 0.5;
    const delay = Math.min(k, 12) * FLOAT_STAGGER;
    t.setText(text).setColor(color).setPosition(x + dx, y + dy).setVisible(delay <= 0).setAlpha(1);
    // Above fireballs and lightning, so a blast never hides its own gold.
    t.setDepth(35 + k * 0.001);
    this.texts.push({ t, life: FLOAT_LIFE, vy: -80, delay });
  }

  /** A white flash, the fireball, a shock ring, flying embers, rising smoke and a dust skirt on the road. */
  explosion(x: number, y: number, radius: number) {
    const flash = this.spawn('fx:burst', x, y, { life: 0.12, s0: (radius * 0.95 * TEX_SCALE) / 128, s1: (radius * 0.6 * TEX_SCALE) / 128 });
    flash?.img.setDepth(34.1).setBlendMode(Phaser.BlendModes.ADD);
    const p = this.spawn('fx:burst', x, y, { life: 0.36, ease: true, s0: (radius * 0.55 * TEX_SCALE) / 128, s1: (radius * 1.25 * TEX_SCALE) / 128 });
    p?.img.setDepth(34).setRotation(Math.random() * Math.PI * 2);
    this.ring(x, y, radius * 1.15, 0xffd08a);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 200 + Math.random() * 500;
      const s = this.spawn(propKey('spark'), x, y, { life: 0.3 + Math.random() * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 800, drag: 1.2, s0: 1.4, s1: 0.2, rotV: (Math.random() - 0.5) * 12 });
      if (s && i % 2) s.img.setTint(0xffa860);
    }
    for (let i = 0; i < 5; i++) {
      const s = this.spawn(propKey('dust'), x + (Math.random() - 0.5) * radius * 0.6, y - Math.random() * radius * 0.3, {
        life: 0.9 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 80, vy: -70 - Math.random() * 70, drag: 1.4, ease: true, a0: 0.7,
        s0: 0.5, s1: 1.2 + radius / 160, rotV: (Math.random() - 0.5) * 0.6,
      });
      s?.img.setTint(0x80766f).setDepth(33);
    }
    this.dust(x, Math.min(y + 30, WORLD.groundY + 20), 1);
  }

  /** An expanding shock ring that snaps out and then settles while it fades. */
  ring(x: number, y: number, radius: number, tint: number) {
    const p = this.spawn('fx:ring', x, y, { life: 0.45, ease: true, a0: 0.95, s0: (radius * 0.2 * TEX_SCALE) / 128, s1: (radius * TEX_SCALE) / 128 });
    p?.img.setTint(tint);
  }

  sparks(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 140 + Math.random() * 300;
      const p = this.spawn(propKey('spark'), x, y, { life: 0.25 + Math.random() * 0.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, s0: 1, s1: 0.2, rotV: (Math.random() - 0.5) * 14 });
      if (p && i % 3 === 2) p.img.setTint(0xffd27a);
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
      const p = this.spawn(propKey('steam'), x + (Math.random() - 0.5) * 60, y - 30, { life: 0.7, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1900, s0: 0.42, s1: 0.16 });
      p?.img.setTint(0xf3cb5e);
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
  airStreak(x: number, y: number) {
    this.spawn(propKey('dust'), x, y, { life: 0.16, s0: 0.3, s1: 0.05, g: 0 });
  }

  // -------------------------------------------------------------------------------------------
  // Effects of the weapons
  // -------------------------------------------------------------------------------------------

  /** A lightning bolt through the points (x, y pairs), with a flash at every raider it hits. */
  lightning(points: number[]) {
    if (points.length < 4) return;
    // Jagged once, at creation, so the bolt does not crawl while it fades.
    const pts: number[] = [];
    for (let i = 0; i + 3 < points.length; i += 2) {
      const x0 = points[i];
      const y0 = points[i + 1];
      const x1 = points[i + 2];
      const y1 = points[i + 3];
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 36));
      for (let j = 0; j < n; j++) {
        const u = j / n;
        const jitter = j === 0 ? 0 : 18;
        pts.push(x0 + (x1 - x0) * u + (Math.random() - 0.5) * jitter, y0 + (y1 - y0) * u + (Math.random() - 0.5) * jitter);
      }
    }
    pts.push(points[points.length - 2], points[points.length - 1]);
    this.strokes.push({ k: 'bolt', pts, life: 0.32, max: 0.32 });
    for (let i = 0; i + 1 < points.length; i += 2) {
      const fl = this.spawn('fx:burst', points[i], points[i + 1], { life: 0.18, s0: 0.5, s1: 0.2 });
      fl?.img.setTint(0xbfe4ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(34.6);
      this.sparks(points[i], points[i + 1], 4);
    }
  }

  /** A quick crossbow bolt from (x, y) to (tx, ty). */
  streak(x: number, y: number, tx: number, ty: number, color = 0xfff1c0) {
    this.strokes.push({ k: 'streak', x, y, tx, ty, life: 0.14, max: 0.14, color });
  }

  /** A blast of sound from the keep that runs down the road to `reach`. */
  soundWave(x0: number, y: number, reach: number) {
    this.strokes.push({ k: 'wave', x0, y, reach, life: 0.55, max: 0.55 });
  }

  /** Fondue forks spring out of the road over the width and sink back. */
  forks(x: number, halfWidth: number) {
    this.strokes.push({ k: 'forks', x, halfWidth, life: 0.55, max: 0.55 });
    this.dust(x - halfWidth * 0.6, WORLD.groundY + 26, 0.3);
    this.dust(x + halfWidth * 0.6, WORLD.groundY + 26, 0.3);
  }

  /** A ring of dust that runs along the road out to `radius` around a slam. */
  shockRing(x: number, y: number, radius: number) {
    const p = this.spawn('fx:ring', x, y, { life: 0.5, ease: true, a0: 0.8, squash: 0.28, s0: (radius * 0.25 * TEX_SCALE) / 128, s1: (radius * TEX_SCALE) / 128 });
    p?.img.setTint(0xe6d8bd);
    const n = Math.max(4, Math.round(radius / 40));
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const q = this.spawn(propKey('dust'), x + side * 10, y - 4, {
        life: 0.55, vx: side * radius * 1.6 * (0.55 + (i / n) * 0.5), vy: -10 - Math.random() * 20, drag: 3, ease: true, a0: 0.85, s0: 0.35, s1: 0.95, squash: 0.65,
      });
      q?.img.setTint(i % 3 ? 0xffffff : 0xe6d8bd);
    }
  }

  /** Cowbell Toll: golden rings of sound over the group and a puff of dust where it strikes. */
  toll(x: number, radius: number) {
    const y = WORLD.groundY - 40;
    this.ring(x, y, radius, 0xf3cb5e);
    const p = this.spawn('fx:ring', x, y, { life: 0.7, ease: true, a0: 0.7, s0: (radius * 0.1 * TEX_SCALE) / 128, s1: (radius * 0.75 * TEX_SCALE) / 128 });
    p?.img.setTint(0xfff2b0);
    this.dust(x, WORLD.groundY + 20, 0.5);
  }

  /** Snowdrift Cannon: a burst of snow where a snowball lands. */
  snowPuff(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI * (0.1 + Math.random() * 0.8);
      const v = 120 + Math.random() * 260;
      const p = this.spawn(propKey('dust'), x, y - 10, { life: 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 600, drag: 2, ease: true, a0: 0.9, s0: 0.3, s1: 0.8 });
      p?.img.setTint(0xf4fbff);
    }
  }

  /** Battering Log: the trunk swings out of the gate and back, with dust where it sweeps. */
  logSwing(reach: number) {
    const x = WORLD.gateX + reach * 0.5;
    const y = WORLD.groundY - 34;
    const s = Math.max(0.8, reach / 112);
    const p = this.spawn(propKey('swingLog'), x, y, { life: 0.45, s0: s, s1: s, fade: true, rotV: -2.6 });
    p?.img.setRotation(0.6).setDepth(29);
    this.dust(WORLD.gateX + reach * 0.8, WORLD.groundY + 20, 0.8);
  }

  /** Cheese Cascade: a stream of hot cheese from the gate arch to the road, with steam. */
  cascade(halfWidth: number) {
    const x = WORLD.gateX + 26;
    const top = WORLD.groundY - 190;
    const p = this.spawn(propKey('cheeseStream'), x, top, { life: 0.9, s0: 1, s1: 1 });
    p?.img.setOrigin(0.5, 0).setScale(1 / TEX_SCALE, 2 / TEX_SCALE).setDepth(29);
    this.splash(x + halfWidth * 0.4, WORLD.groundY + 40);
  }

  /** Mending Horn: green-gold sparkles rise from the gate and the mended amount floats up. */
  mend(amount: number) {
    for (let i = 0; i < 12; i++) {
      const p = this.spawn(propKey('spark'), WORLD.gateX + (Math.random() - 0.5) * 50, WORLD.groundY - Math.random() * 160, {
        life: 0.9, vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 90, s0: 1.2, s1: 0.3,
      });
      p?.img.setTint(i % 2 ? 0x9be37a : 0xfff2b0);
    }
    if (amount > 0) this.floatText(WORLD.gateX + 30, WORLD.groundY - 180, `+${amount}`, '#9be37a');
  }

  /** A little puff at a weapon on the keep (catapult throw, hornets leaving the hive). */
  puff(x: number, y: number, tint = 0xffffff) {
    for (let i = 0; i < 4; i++) {
      const p = this.spawn(propKey('dust'), x + (Math.random() - 0.5) * 20, y, { life: 0.5, vx: 40 + Math.random() * 60, vy: -40 - Math.random() * 40, drag: 2, ease: true, a0: 0.8, s0: 0.25, s1: 0.6 });
      p?.img.setTint(tint);
    }
  }

  /**
   * Snow drifts (Snowdrift Cannon) and hot cheese pools (Cheese Cascade) on the road: a row of drift
   * or pool pictures over the width of the zone, growing in when laid and fading at the end.
   * Other zone kinds are drawn by the scene.
   */
  drawZones(zones: readonly ViewZone[]) {
    const seen = new Set<number>();
    for (const z of zones) {
      if (z.kind !== 'snow' && z.kind !== 'hotCheese') continue;
      seen.add(z.id);
      const key = z.kind === 'snow' ? 'snowDrift' : 'cheesePool';
      const w = z.kind === 'snow' ? 128 : 80;
      let list = this.zoneViews.get(z.id);
      if (!list) {
        const n = Math.max(1, Math.round((z.halfWidth * 2) / (w * 0.8)));
        list = [];
        for (let i = 0; i < n; i++) {
          const x = z.x - z.halfWidth + ((i + 0.5) / n) * z.halfWidth * 2;
          list.push(this.scene.add.image(x, WORLD.groundY + 36 + (i % 2) * 3, propKey(key)).setOrigin(0.5, 1).setDepth(17));
        }
        this.zoneViews.set(z.id, list);
      }
      const age = z.dur - z.t;
      const k = Math.min(1, age * 4) * Math.min(1, z.t * 2);
      const sx = ((z.halfWidth * 2) / list.length / (w * 0.8)) * 1.1;
      list.forEach((img) => img.setScale((sx * (0.6 + 0.4 * k)) / TEX_SCALE, (0.6 + 0.4 * k) / TEX_SCALE).setAlpha(k));
    }
    for (const [id, list] of this.zoneViews) {
      if (!seen.has(id)) { list.forEach((i) => i.destroy()); this.zoneViews.delete(id); }
    }
  }

  /** Confetti and coins for a won run. */
  jubilation(x: number, y: number) {
    const colours = [0xd1495b, 0xf3cb5e, 0x4fb477, 0x6fb7e9, 0xfff6df];
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const v = 380 + Math.random() * 560;
      const p = this.spawn(propKey('spark'), x + (Math.random() - 0.5) * 200, y, {
        life: 1.4 + Math.random() * 0.8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, drag: 1.2, s0: 1.3, s1: 0.8, rotV: (Math.random() - 0.5) * 16,
      });
      p?.img.setTint(colours[i % colours.length]).setDepth(34.7);
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * (0.25 + Math.random() * 0.5);
      const v = 300 + Math.random() * 380;
      this.spawn(propKey('coin'), x, y, { life: 1.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1100, rotV: (Math.random() - 0.5) * 10, s0: 0.9, s1: 0.8 });
    }
  }

  /** A keg comes loose from its carrier: snapped strap, a splinter, a few sparks. */
  kegLoose(x: number, y: number) {
    this.sparks(x, y, 5);
    const p = this.spawn(propKey('gibStick'), x, y, { life: 0.8, vx: (Math.random() - 0.5) * 240, vy: -320, g: 1700, rotV: 14, bounce: true, ground: WORLD.groundY + 30, s0: 0.8, s1: 0.7 });
    p?.img.setTint(0xc89a5a);
  }

  private drawStrokes(dt: number) {
    const g = this.lines;
    g.clear();
    if (this.strokes.length === 0) return;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i];
      s.life -= dt;
      if (s.life <= 0) { this.strokes[i] = this.strokes[this.strokes.length - 1]; this.strokes.pop(); continue; }
      const k = s.life / s.max;
      if (s.k === 'bolt') this.drawBolt(g, s.pts, k);
      else if (s.k === 'streak') {
        const u = Math.min(1, (1 - k) * 1.6);
        const v = Math.max(0, (1 - k) * 1.6 - 0.45);
        const hx = s.x + (s.tx - s.x) * u;
        const hy = s.y + (s.ty - s.y) * u;
        const tx = s.x + (s.tx - s.x) * v;
        const ty = s.y + (s.ty - s.y) * v;
        g.lineStyle(5, 0x2b2118, 0.8);
        g.lineBetween(tx, ty, hx, hy);
        g.lineStyle(2.4, s.color, 1);
        g.lineBetween(tx, ty, hx, hy);
      } else if (s.k === 'wave') {
        const u = 1 - k;
        for (let j = 0; j < 3; j++) {
          const v = u - j * 0.12;
          if (v <= 0 || v > 1) continue;
          const x = s.x0 + (s.reach - s.x0) * v;
          const r = 90 + j * 10;
          g.lineStyle(9 - j * 2, 0xfff6df, (1 - v) * 0.7);
          g.beginPath();
          g.arc(x - r, s.y, r, -0.55, 0.55, false);
          g.strokePath();
        }
      } else this.drawForks(g, s.x, s.halfWidth, 1 - k);
    }
  }

  private drawBolt(g: Phaser.GameObjects.Graphics, pts: number[], k: number) {
    const path = (w: number, col: number, a: number) => {
      g.lineStyle(w, col, a);
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let j = 2; j + 1 < pts.length; j += 2) g.lineTo(pts[j], pts[j + 1]);
      g.strokePath();
    };
    // A flicker: bright at once, dimmer, a second flash, then it fades.
    const flick = k > 0.7 ? 1 : k > 0.5 ? 0.45 : 0.9 * k * 2;
    path(16, 0x6fb7e9, 0.25 * flick);
    path(7, 0xbfe4ff, 0.8 * flick);
    path(2.5, 0xffffff, Math.min(1, flick));
  }

  /** Forks of three prongs each: up fast, hold, then sink. `u` runs from 0 to 1. */
  private drawForks(g: Phaser.GameObjects.Graphics, x: number, halfWidth: number, u: number) {
    const rise = u < 0.2 ? u / 0.2 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    const h = 58 * rise;
    if (h < 1) return;
    const base = WORLD.groundY + 34;
    const n = Math.max(3, Math.round((halfWidth * 2) / 34));
    const fork = (fx: number, tall: number) => {
      g.lineBetween(fx, base, fx, base - tall * 0.55);
      g.lineBetween(fx - 8, base - tall * 0.55, fx + 8, base - tall * 0.55);
      for (const dx of [-8, 0, 8]) g.lineBetween(fx + dx, base - tall * 0.55, fx + dx, base - tall);
    };
    for (let j = 0; j < n; j++) {
      const fx = x - halfWidth + ((j + 0.5) / n) * halfWidth * 2;
      const tall = h * (j % 2 ? 0.86 : 1);
      g.lineStyle(7, 0x2b2118, 1);
      fork(fx, tall);
      g.lineStyle(3.2, 0xb8bfc6, 1);
      fork(fx, tall);
    }
  }
}
