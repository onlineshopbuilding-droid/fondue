// The Phaser scene of the battlefield: draws what the session reports each frame and turns the pointer into commands.
import Phaser from 'phaser';
import type { AudioEngine, SfxName } from '../audio/audio';
import { ENEMIES } from '../config/enemies';
import { WORLD } from '../config/field';
import { SLOTS, SLOT_COUNT } from '../config/slots';
import type { Session } from '../game/session';
import type { ViewEnemy, ViewHand, ViewProjectile, ViewState, ViewZone } from '../net/snapshot';
import type { Meta, SimEvent } from '../sim/types';
import { bindPointer, type PointerTracker } from '../input/pointer';
import { secondHandSimulated } from '../config/flags';
import { ShakeDetector } from '../input/shake';
import { Background } from './background';
import { CastleView } from './castleView';
import { Effects } from './effects';
import { EnemyView } from './enemyView';
import { Hud } from './hud';
import { fightRect, hookAt, type CamRect } from './camera';
import { diveRect } from './lobby/dive';
import { Stations } from './stations';
import { TutorialView } from './tutorialView';
import { computeView, renderScale, type GameView } from './viewport';
import { propKey, TEX_SCALE } from './textures';

const HAND_COLORS = [0xfff1d0, 0x9fe0ff];
const FONT = 'Lilita One';
/** Cheese puddle colours: rim shade, body, light top. */
const CHEESE = { rim: 0xc98a2b, body: 0xf3cb5e, light: 0xffe896, ink: 0x2b2118 };
/** Blue veil while the Cuckoo Clock holds time still, and its strongest opacity. */
const CUCKOO_VEIL = 0x6f8fd9;
const CUCKOO_ALPHA = 0.16;
/** White flash of a lightning strike over the whole screen. */
const LIGHTNING_FLASH = 0.14;

export interface SceneHooks {
  /** Called once per frame with the latest view, after rendering. */
  onFrame(view: ViewState | null): void;
  togglePause(): void;
  isInputBlocked(): boolean;
  onBuyNotice(text: string): void;
}

interface HandView { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; }

const PROJ_KEYS = { bomb: 'bomb', stone: 'stone', bolt: 'bolt', wheel: 'wheel', comet: 'comet', slab: 'slab', roofBolt: 'roofBolt', shell: 'shell', frostShell: 'shell', fireShell: 'shell', snowball: 'snowball', pinecone: 'pinecone', hornet: 'hornet' } as const;

export class GameScene extends Phaser.Scene {
  session: Session | null = null;
  audio!: AudioEngine;
  hooks!: SceneHooks;
  private bg!: Background;
  private fx!: Effects;
  private hud!: Hud;
  private castle!: CastleView;
  private stations!: Stations;
  /** The King, the gesture lesson of the prelude and the pot hint of level 1. */
  tutorial!: TutorialView;
  /** 0 normally; towards 1 the camera dives into the keep's gate, on the way to the lobby (src/ui/lobby). */
  lobbyDive = 0;
  /** The part of the world on screen right now (the fight view, or the lobby's dive into the keep). */
  private cam: CamRect = { x: 0, y: 0, w: WORLD.width, h: WORLD.height };
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerT = -1;
  private veil!: Phaser.GameObjects.Rectangle;
  private veilT = 0;
  private veilMax = 0;
  private flashT = 0;
  private cheeseGfx!: Phaser.GameObjects.Graphics;
  private pool: EnemyView[] = [];
  private active = new Map<number, EnemyView>();
  private projViews = new Map<number, Phaser.GameObjects.Image>();
  private flameViews = new Map<number, Phaser.GameObjects.Image[]>();
  private hands: HandView[] = [];
  private tracker!: PointerTracker;
  /** The second finger, or the right mouse button with the developer switch (C9). */
  private tracker2!: PointerTracker;
  /** The Keg Hauler my hand holds while it still has its keg, and how far the shake has got. */
  private shake = new ShakeDetector();
  private shakeId = -1;
  private hitstopUntil = 0;
  private lastHitstop = 0;
  private shakeAmp = 0;
  private lastView: ViewState | null = null;
  private lastPhase = '';
  private shownWave = 0;
  private lastFrameMs = 16.7;
  /** For the debug overlay and tests. */
  debug = { fps: 60, enemies: 0, frameMs: 16 };
  /** What this screen shows of the world. */
  view: GameView = computeView(WORLD.width, WORLD.height);
  /** Canvas pixels per world unit (see `renderScale`). */
  renderScale = 1;

  constructor() { super('game'); }

  create() {
    this.bg = new Background(this);
    this.castle = new CastleView(this);
    this.stations = new Stations(this);
    this.cheeseGfx = this.add.graphics().setDepth(17);

    this.fx = new Effects(this);
    this.hud = new Hud(this);
    this.tutorial = new TutorialView(this);

    this.veil = this.add.rectangle(0, 0, WORLD.width, WORLD.height, CUCKOO_VEIL, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(89).setAlpha(0).setVisible(false);

    const banner = this.add.image(0, 0, propKey('banner')).setOrigin(0.5, 0).setScale(1 / TEX_SCALE);
    this.bannerText = this.add.text(0, 76, '', {
      fontFamily: FONT, fontSize: '42px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5);
    this.banner = this.add.container(640, -170, [banner, this.bannerText]).setDepth(95).setScrollFactor(0);

    // Two players, each with a first and a second hand (C9): hand p + players is player p's second.
    for (let i = 0; i < 4; i++) {
      const img = this.add.image(0, 0, propKey('handOpen')).setScale(1 / TEX_SCALE).setDepth(100).setVisible(false).setTint(HAND_COLORS[i % 2]);
      const label = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(100).setVisible(false);
      this.hands.push({ img, label });
    }

    this.bindInput();
    this.setView(this.view);
  }

  /** Applies a new screen shape to the camera and everything anchored to the screen edges. */
  setView(v: GameView) {
    this.view = v;
    if (!this.hud) return;
    // The canvas has as many pixels as the device shows; the camera zoom maps world units onto them.
    const rs = renderScale(v, window.devicePixelRatio);
    this.renderScale = rs;
    const w = Math.round(v.width * rs);
    const h = Math.round(v.height * rs);
    if (this.scale.gameSize.width !== w || this.scale.gameSize.height !== h) this.scale.setGameSize(w, h);
    this.cam = fightRect(v);
    this.cameras.main.setSize(w, h).setOrigin(0, 0).setZoom(rs * (v.width / this.cam.w)).setScroll(this.cam.x, this.cam.y);
    this.sharpenText(rs);
    this.bg.layout(v);
    this.hud.layout(v);
    this.castle.layout(v);
    this.stations.layout(v);
    this.veil.setSize(v.width, v.height);
    this.banner.x = v.width / 2;
  }

  /** Text is drawn into its own texture; it must be as fine as the canvas, or it looks blurred. */
  private sharpenText(rs: number) {
    const walk = (list: Phaser.GameObjects.GameObject[]) => {
      for (const o of list) {
        if (o instanceof Phaser.GameObjects.Text) { if (o.style.resolution !== rs) o.setResolution(rs); }
        else if (o instanceof Phaser.GameObjects.Container) walk(o.list);
      }
    };
    walk(this.children.list);
  }

  /** CSS position of a world point, wherever the camera looks. */
  worldToCss(x: number, y: number) {
    const r = this.game.canvas.getBoundingClientRect();
    const c = this.cam;
    return { x: r.left + ((x - c.x) / c.w) * r.width, y: r.top + ((y - c.y) / c.h) * r.height };
  }

  /** CSS position of a point in screen coordinates. */
  screenToCss(x: number, y: number) {
    const r = this.game.canvas.getBoundingClientRect();
    return { x: r.left + (x / this.view.width) * r.width, y: r.top + (y / this.view.height) * r.height };
  }

  private bindInput() {
    const canvas = this.game.canvas;
    const { tracker, tracker2 } = bindPointer(canvas, {
      onMove: (t) => this.feedShake(t),
      windowMs: () => this.session?.meta()?.tuning.velWindowMs ?? 80,
      view: () => ({ width: this.cam.w, height: this.cam.h, offsetX: this.cam.x, offsetY: this.cam.y }),
      onDown: (x, y) => {
        this.audio.resume();
        const s = this.session;
        if (!s || this.hooks.isInputBlocked()) return true;
        const sx = x - this.view.offsetX;
        const sy = y - this.view.offsetY;
        if (this.hud.hitPause(sx, sy)) { this.hooks.togglePause(); return true; }
        s.setHand(x, y);
        // A tap on a weapon fires it and never grabs a raider.
        const slot = this.castle.hitSlot(x, y, s.meta());
        if (slot >= 0) {
          if (s.view()?.phase === 'battle') {
            s.send({ k: 'fireSlot', slot });
            this.audio.play('uiClick');
          }
          return true;
        }
        s.localPress(x, y);
        return false;
      },
      onUp: (_x, _y, vx, vy) => {
        const s = this.session;
        if (!s) return;
        s.localRelease(vx, vy);
      },
      // The second hand: a weapon tap works with any finger; grabbing only with a second hand.
      onDown2: (x, y) => {
        const s = this.session;
        if (!s || this.hooks.isInputBlocked()) return true;
        const slot = this.castle.hitSlot(x, y, s.meta());
        if (slot >= 0) {
          if (s.view()?.phase === 'battle') { s.send({ k: 'fireSlot', slot }); this.audio.play('uiClick'); }
          return true;
        }
        if (!s.secondHandReady()) return true;
        s.setHand(x, y, 1);
        s.localPress(x, y, 1);
        return false;
      },
      onMove2: (t) => { if (t.pressed) this.session?.setHand(t.x, t.y, 1); },
      onUp2: (x, y, vx, vy) => {
        const s = this.session;
        if (!s) return;
        s.setHand(x, y, 1);
        s.localRelease(vx, vy, 1);
      },
      mouseSecond: () => secondHandSimulated(this.session?.meta()?.flags),
    });
    this.tracker = tracker;
    this.tracker2 = tracker2;

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const s = this.session;
      if (!s || this.hooks.isInputBlocked()) return;
      // Number keys fire the slots on a laptop: 1 is the wall foot, 5 the tower roof.
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT && s.view()?.phase === 'battle') s.send({ k: 'fireSlot', slot: n - 1 });
      if (e.key === 'p' || e.key === 'P') this.hooks.togglePause();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** While my hand holds a Keg Hauler with its keg, the pointer's path is watched for a shake. */
  private feedShake(t: PointerTracker) {
    if (this.shakeId < 0 || !t.pressed) return;
    if (this.shake.add(t.lastT, t.x, t.y)) this.session?.send({ k: 'shake' });
  }

  /** Follows which keg my hand holds; a new grab starts the count over. */
  private watchKeg(view: ViewState, me: number) {
    const held = view.enemies.find((e) => e.type === 'bomber' && e.armed && e.heldBy.includes(me));
    const id = held ? held.id : -1;
    if (id !== this.shakeId) { this.shakeId = id; this.shake.reset(); }
  }

  /** Tears down everything visual between games. */
  resetForNewGame() {
    for (const [, v] of this.active) { v.hide(); this.pool.push(v); }
    this.active.clear();
    for (const [, img] of this.projViews) img.destroy();
    this.projViews.clear();
    for (const [, list] of this.flameViews) list.forEach((i) => i.destroy());
    this.flameViews.clear();
    this.cheeseGfx.clear();
    this.lastPhase = '';
    this.shownWave = 0;
    this.lastView = null;
    this.bannerT = -1;
    this.banner.y = -170;
    this.stations.reset();
    this.veilT = 0;
    this.flashT = 0;
    this.veil.setVisible(false);
    this.shakeId = -1;
    this.shake.reset();
    this.tutorial.reset();
  }

  update(_time: number, deltaMs: number) {
    const now = performance.now();
    this.debug.frameMs = deltaMs;
    this.debug.fps += (1000 / Math.max(1, deltaMs) - this.debug.fps) * 0.05;
    const realDt = Math.min(0.05, deltaMs / 1000);
    const s = this.session;
    if (!s) {
      this.cam = diveRect(fightRect(this.view), this.lobbyDive);
      this.hud.setVisible(false);
      this.bg.setLandscape('meadow');
      this.bg.update(8, 50, false, 640, realDt);
      this.applyShake(realDt);
      this.hooks?.onFrame(null);
      return;
    }
    this.cam = diveRect(fightRect(this.view), this.lobbyDive);
    // The bars are screen furniture of the fight.
    // While the camera comes out of the keep (lobby) they would be drawn zoomed, so they wait.
    this.hud.setVisible(this.lobbyDive === 0);
    this.banner.setVisible(this.lobbyDive === 0);

    s.setHand(this.tracker.x, this.tracker.y);
    if (this.tracker2.pressed) s.setHand(this.tracker2.x, this.tracker2.y, 1);
    // Alone, a hitstop can stop the world for real; a shared game must keep running for the other player.
    if (s.role !== 'solo' || now >= this.hitstopUntil) s.update(Math.min(100, deltaMs));
    this.fx.resetFloatBudget();
    const events = s.drainEvents();
    for (const e of events) this.handleEvent(e, s);

    const view = s.view();
    const meta = s.meta();
    const frozen = now < this.hitstopUntil;
    const dt = frozen ? 0 : realDt;
    this.lastFrameMs = deltaMs;

    if (view) {
      this.watchKeg(view, s.me);
      if (!frozen || !this.lastView) {
        this.renderWorld(view, dt);
        this.lastView = view;
      }
      this.renderHands(view, s);
      this.hud.update(view, meta, realDt);
      if (meta) {
        this.bg.setLandscape(meta.wave.landscape);
        // The sky follows the level wave by wave (endless: a cycle of eight waves).
        const last = meta.rules.lastWave;
        const u = last ? (view.wave - 1) / last : ((view.wave - 1) % 8) / 8;
        this.bg.update(u * 100, 100, meta.wave.night, this.tracker.x, realDt);
      }
      this.renderKeep(view, meta, realDt, now);
      this.updatePhase(view, meta);
      this.tutorial.update(s, view, meta, events, realDt, this.view, this.cam);
    }

    this.fx.update(dt);
    this.updateVeil(realDt);
    this.updateBanner(realDt);
    this.applyShake(realDt);
    this.hooks.onFrame(view);
  }

  private applyShake(dt: number) {
    const cam = this.cameras.main;
    this.shakeAmp *= Math.exp(-dt * 14);
    const { x: offsetX, y: offsetY, w } = this.cam;
    cam.setZoom(this.renderScale * (this.view.width / w));
    if (this.shakeAmp < 0.3) { this.shakeAmp = 0; cam.setScroll(offsetX, offsetY); return; }
    cam.setScroll(offsetX + (Math.random() - 0.5) * 2 * this.shakeAmp, offsetY + (Math.random() - 0.5) * 2 * this.shakeAmp);
  }

  private renderWorld(view: ViewState, dt: number) {
    const time = performance.now();
    const seen = new Set<number>();
    let fastest = 0;
    const potProgress = view.potMax > 0 ? 1 - view.potBusy / view.potMax : 0;
    for (const e of view.enemies) {
      seen.add(e.id);
      let v = this.active.get(e.id);
      if (!v) {
        v = this.pool.pop() ?? new EnemyView(this);
        v.bind(e.id);
        this.active.set(e.id, v);
      }
      v.setKegShake(e.id === this.shakeId ? this.shake.progress : 0);
      v.update(e, time, dt, potProgress);
      if (e.st === 'air' && v.speed > fastest) fastest = v.speed;
      if (e.st === 'air' && v.speed > 1300 && dt > 0) this.fx.airStreak(e.x, e.y - 40);
    }
    for (const [id, v] of this.active) {
      if (!seen.has(id)) { v.hide(); this.pool.push(v); this.active.delete(id); }
    }
    this.debug.enemies = view.enemies.length;
    this.audio.whooshLevel(Math.min(1, fastest / 2200));

    this.renderProjectiles(view.projectiles);
    this.renderZones(view.zones, time);
    this.fx.drawZones(view.zones);
  }

  private renderKeep(view: ViewState, meta: Meta | null, dt: number, time: number) {
    if (!meta) return;
    const hook = hookAt(meta.fieldW);
    this.castle.update(view, meta, this.bg.shown, this.bg.tint, this.bg.night, dt, time);
    this.stations.update(view, meta, this.bg.tint, dt, time, hook);
  }

  private renderProjectiles(list: ViewProjectile[]) {
    const seen = new Set<number>();
    for (const q of list) {
      seen.add(q.id);
      let img = this.projViews.get(q.id);
      if (!img) {
        img = this.add.image(q.x, q.y, propKey(PROJ_KEYS[q.kind])).setDepth(32);
        if (q.kind === 'slab') img.setOrigin(0.5, 1);
        if (q.kind === 'frostShell') img.setTint(0x9fe6ff);
        if (q.kind === 'fireShell') img.setTint(0xff7a3a);
        this.projViews.set(q.id, img);
      }
      img.setPosition(q.x, q.y).setRotation(q.rot);
      if (q.kind === 'wheel') img.setScale((q.size / 50) / TEX_SCALE);
      else if (q.kind === 'slab') img.setScale((q.size / 80) / TEX_SCALE);
      else if (q.kind === 'comet') img.setScale((q.size / 80) / TEX_SCALE);
      else img.setScale(1 / TEX_SCALE);
    }
    for (const [id, img] of this.projViews) {
      if (!seen.has(id)) { img.destroy(); this.projViews.delete(id); }
    }
  }

  /** Patches on the road: fire as flickering flames, cheese as a thick yellow puddle that bubbles. */
  private renderZones(zones: ViewZone[], time: number) {
    const seen = new Set<number>();
    this.cheeseGfx.clear();
    for (const z of zones) {
      if (z.kind === 'cheese') { this.drawCheese(z, time); continue; }
      if (z.kind === 'snow' || z.kind === 'hotCheese') continue;
      seen.add(z.id);
      let list = this.flameViews.get(z.id);
      if (!list) {
        const n = Math.max(2, Math.round(z.halfWidth / 24));
        list = [];
        for (let i = 0; i < n; i++) {
          const x = z.x - z.halfWidth + ((i + 0.5) / n) * z.halfWidth * 2;
          list.push(this.add.image(x, WORLD.groundY + 34, propKey('flame1')).setOrigin(0.5, 1).setDepth(28));
        }
        this.flameViews.set(z.id, list);
      }
      const k = Math.min(1, z.t * 2);
      list.forEach((img, i) => {
        const frame = 1 + Math.floor(time * 0.012 + i) % 3;
        img.setTexture(propKey(`flame${frame}`));
        img.setScale((0.8 + Math.sin(time * 0.02 + i) * 0.15) * k / TEX_SCALE);
      });
    }
    for (const [id, list] of this.flameViews) {
      if (!seen.has(id)) { list.forEach((i) => i.destroy()); this.flameViews.delete(id); }
    }
  }

  private drawCheese(z: ViewZone, time: number) {
    const g = this.cheeseGfx;
    const age = z.dur - z.t;
    // It spreads quickly when it lands and dries up in its last half second.
    const k = Math.min(1, age * 5) * Math.min(1, z.t * 2);
    if (k <= 0) return;
    const y = WORLD.groundY + 30;
    const w = z.halfWidth * 2 * (0.6 + 0.4 * k);
    const h = 22 * (0.7 + 0.3 * k);
    g.fillStyle(CHEESE.ink, 0.9 * k);
    g.fillEllipse(z.x, y + 1, w + 6, h + 6);
    g.fillStyle(CHEESE.rim, k);
    g.fillEllipse(z.x, y + 1, w, h);
    g.fillStyle(CHEESE.body, k);
    g.fillEllipse(z.x - 3, y - 1.5, w - 10, h - 7);
    g.fillStyle(CHEESE.light, 0.8 * k);
    g.fillEllipse(z.x - w * 0.14, y - 4, w * 0.45, h * 0.28);
    // Bubbles swell and pop one after another.
    const n = Math.max(2, Math.round(z.halfWidth / 26));
    for (let i = 0; i < n; i++) {
      const phase = (time * 0.0012 + i * 0.37 + z.id * 0.13) % 1;
      const bx = z.x - w * 0.4 + ((i + 0.5) / n) * w * 0.8;
      const by = y - 2 + ((i * 7) % 5) - 2;
      const r = 2 + phase * 4;
      g.lineStyle(1.6, CHEESE.ink, (1 - phase) * k);
      g.fillStyle(CHEESE.light, (1 - phase) * k);
      g.fillCircle(bx, by, r);
      g.strokeCircle(bx, by, r);
    }
  }

  private renderHands(view: ViewState, s: Session) {
    const meta = s.meta();
    const players = Math.max(1, meta?.names.length ?? 1);
    const mine = [s.handSlot(0), s.handSlot(1)];
    this.hands.forEach((hv, i) => { if (i >= view.hands.length) { hv.img.setVisible(false); hv.label.setVisible(false); } });
    view.hands.forEach((h: ViewHand, i: number) => {
      const hv = this.hands[i];
      if (!hv) return;
      const own = mine.indexOf(i);
      const isMe = own >= 0;
      const second = i >= players;
      const t = own === 1 ? this.tracker2 : this.tracker;
      const x = isMe ? t.x : h.x;
      const y = isMe ? t.y : h.y;
      const blocked = isMe && this.hooks.isInputBlocked();
      // A second hand shows only while it is at work.
      const working = !second || (isMe ? t.pressed : h.down || h.holding >= 0 || h.holdingProj >= 0);
      const visible = working && h.connected && !blocked && (view.phase !== 'gameover' && view.phase !== 'runWon');
      // On a touch screen the player sees their own finger; only a mouse needs a hand as pointer.
      // The co-op partner's hand always shows: it is the only sign of where they grab.
      const drawn = visible && !(isMe && t.touch);
      hv.img.setVisible(drawn);
      hv.label.setVisible(drawn && players > 1 && !second);
      if (!drawn) return;
      const closed = h.down || h.holding >= 0 || h.holdingProj >= 0 || (own === 1 && t.pressed);
      hv.img.setTexture(propKey(closed ? 'handClosed' : 'handOpen'));
      hv.img.setTint(HAND_COLORS[(i % players) % HAND_COLORS.length]);
      hv.img.setPosition(x, y);
      if (players > 1 && !second) hv.label.setText(meta?.names[i] ?? '').setPosition(x, y - 40);
    });
  }

  private updatePhase(view: ViewState, meta: Meta | null) {
    // The prelude is no official round: no signboard, it just begins.
    if (view.wave !== this.shownWave) {
      const first = this.shownWave <= 0 || view.phase === 'banner';
      this.shownWave = view.wave;
      if (!this.isPrelude() && !first) {
        const line = this.waveBanner(view.wave, meta);
        if (line) this.showBanner(line, 2);
      }
    }
    if (view.phase === this.lastPhase) return;
    this.lastPhase = view.phase;
    if (this.isPrelude()) return;
    if (view.phase === 'banner') this.showBanner(this.levelBanner(meta), 1.2);
  }

  /** The signboard at the start of a level: its number, a night, or a boss. */
  private levelBanner(meta: Meta | null): string {
    const level = meta?.rules.level ?? null;
    const name = level !== null ? `LEVEL ${level}` : 'ENDLESS';
    if (meta?.wave.night) return `${name} — NIGHT RAID!`;
    return `${name} — HOLD THE GATE!`;
  }

  /** A signboard for a wave that matters: the boss wave and the last wave. Null for ordinary waves. */
  private waveBanner(wave: number, meta: Meta | null): string | null {
    if (meta?.wave.boss) return `${meta.wave.boss.toUpperCase()}!`;
    const last = meta?.rules.lastWave ?? null;
    if (last !== null && wave === last) return 'LAST WAVE!';
    return null;
  }

  private isPrelude(): boolean { return this.session?.meta()?.rules.mode === 'tutorial'; }

  private showBanner(text: string, seconds: number) {
    this.bannerText.setText(text);
    this.bannerText.setFontSize(text.length > 30 ? 28 : text.length > 24 ? 34 : 42);
    this.bannerT = seconds;
  }

  private updateBanner(dt: number) {
    const target = this.bannerT > 0 ? 70 : -170;
    this.bannerT -= dt;
    this.banner.y += (target - this.banner.y) * Math.min(1, dt * 9);
  }

  /** The tinted veil over the field: blue while time stands still, a white flash for lightning. */
  private updateVeil(dt: number) {
    this.veilT = Math.max(0, this.veilT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.flashT > 0) {
      this.veil.setVisible(true).setFillStyle(0xffffff, 1).setAlpha(LIGHTNING_FLASH * (this.flashT / 0.12));
      return;
    }
    if (this.veilT <= 0) { this.veil.setVisible(false); return; }
    // In quickly, steady while the clock holds, out over the last half second.
    const inK = Math.min(1, (this.veilMax - this.veilT) / 0.15);
    const outK = Math.min(1, this.veilT / 0.5);
    this.veil.setVisible(true).setFillStyle(CUCKOO_VEIL, 1).setAlpha(CUCKOO_ALPHA * inK * outK);
  }

  // ---------------------------------------------------------------------------
  // Events: every sound and effect is driven from here.
  // ---------------------------------------------------------------------------

  private sfx(name: SfxName, volume = 1, pitch?: number) { this.audio.play(name, { volume, pitch }); }

  private hitstop(power: number) {
    const now = performance.now();
    const ms = (this.session?.meta()?.tuning.hitstopMs ?? 60) * (0.67 + power * 0.67);
    if (now - this.lastHitstop < 140) return;
    this.lastHitstop = now;
    this.hitstopUntil = now + ms;
  }

  private shakeCam(amount: number) {
    const t = this.session?.meta()?.tuning.shake ?? 1;
    this.shakeAmp = Math.min(26, Math.max(this.shakeAmp, amount * t));
  }

  private viewOf(id: number) { return this.active.get(id); }

  /** World position of the slot that holds a weapon, or the keep's gate if it is not mounted. */
  private slotOf(weapon: string, s: Session): { x: number; y: number } {
    const i = s.meta()?.loadout.slotWeapon.indexOf(weapon) ?? -1;
    return i >= 0 ? SLOTS[i] : { x: WORLD.gateX, y: WORLD.groundY - 80 };
  }

  private handleEvent(ev: SimEvent, s: Session) {
    switch (ev.e) {
      case 'grab':
        this.viewOf(ev.id)?.bump();
        this.sfx('grab');
        this.sfx('scream', 0.8);
        break;
      case 'release':
        if (ev.speed > 900) this.sfx('whoosh', Math.min(1, ev.speed / 2400));
        break;
      case 'impact':
        this.onImpact(ev);
        break;
      case 'death':
        this.onDeath(ev);
        break;
      case 'gateHit':
        this.castle.hit();
        this.sfx('gateHit', 0.5 + Math.min(0.5, ev.amount / 40));
        this.fx.sparks(ev.x, ev.y, 3);
        if (ev.amount >= 25) this.shakeCam(6);
        break;
      case 'explosion':
        this.fx.explosion(ev.x, ev.y, ev.radius);
        this.sfx('explosion');
        this.shakeCam(Math.min(20, ev.radius / 7));
        this.hitstop(0.8);
        break;
      case 'throwKeg':
        this.sfx('tapCart', 0.4);
        break;
      case 'kegLoose':
        this.fx.kegLoose(ev.x, ev.y);
        this.sfx('kegLoose');
        this.shakeCam(4);
        break;
      case 'strike':
        this.fx.dust(ev.x - 30, ev.y, 0);
        break;
      case 'shoot':
        this.sfx('bolter', 0.5);
        break;
      case 'fire':
        this.castle.fired(ev.slot);
        this.shakeCam(2);
        break;
      case 'wheel':
        this.sfx('wheelRoll');
        this.shakeCam(5);
        break;
      case 'slam':
        this.sfx('slam');
        this.fx.fadingProp('slab', ev.x, ev.y + 8, 0.5, ev.halfWidth / 80);
        this.fx.dust(ev.x, ev.y, 1);
        this.fx.dust(ev.x - ev.halfWidth, ev.y, 1);
        this.fx.dust(ev.x + ev.halfWidth, ev.y, 1);
        if (ev.shock > 0) this.fx.shockRing(ev.x, ev.y, ev.shock);
        this.shakeCam(20);
        this.hitstop(1);
        break;
      case 'freeze':
        this.sfx('freeze');
        this.fx.ring(ev.x, ev.y, ev.radius, 0xbfe8ff);
        break;
      case 'shatter':
        this.sfx('shatter');
        this.fx.iceShards(ev.x, ev.y);
        break;
      case 'zone':
        if (ev.kind === 'cheese') {
          this.sfx('squelch');
          this.fx.splash(ev.x, WORLD.groundY + 50);
        } else if (ev.kind === 'fire') {
          this.sfx('fire', 0.7);
        }
        break;
      case 'bellows':
        this.sfx('fire');
        this.shakeCam(6);
        break;
      case 'mortar':
        this.sfx('cannon');
        this.shakeCam(5);
        this.fx.dust(ev.x, ev.y, 0);
        break;
      case 'bolters':
        this.sfx('bolter');
        this.fx.dust(ev.x + 30, ev.y, 0);
        break;
      case 'spikes':
        this.fx.forks(ev.x, ev.halfWidth);
        this.sfx('spikes');
        this.shakeCam(6);
        break;
      case 'hornBlast':
        this.fx.soundWave(WORLD.gateX, WORLD.groundY - 50, WORLD.gateX + ev.reach);
        this.sfx('horn');
        this.shakeCam(8);
        break;
      case 'cuckoo':
        this.sfx('cuckoo');
        this.veilT = ev.seconds;
        this.veilMax = ev.seconds;
        break;
      case 'lightning':
        this.fx.lightning(ev.points);
        this.sfx('thunder');
        this.flashT = 0.12;
        this.shakeCam(8);
        this.hitstop(0.5);
        break;
      case 'goldRush': {
        const p = this.slotOf('midas', s);
        const purse = this.hud.goldTarget();
        for (let i = 0; i < 5; i++) this.fx.coin(p.x + (i - 2) * 10, p.y, purse.x, purse.y);
        this.fx.floatText(p.x + 40, p.y - 40, 'GOLD RUSH!');
        this.sfx('goldRush');
        break;
      }
      case 'beacon': {
        const p = this.slotOf('beacon', s);
        this.fx.sparks(p.x, p.y - 30, 10);
        this.sfx('ignite');
        break;
      }
      case 'thorns':
        this.castle.thorns(ev.reach);
        this.fx.sparks(WORLD.gateX + 10, WORLD.groundY - 40, 8);
        this.sfx('thorns');
        this.shakeCam(4);
        break;
      case 'toll':
        this.fx.toll(ev.x, ev.radius);
        this.sfx('horn', 0.6);
        this.shakeCam(5);
        break;
      case 'snowdrift':
        this.fx.snowPuff(ev.x, ev.y);
        break;
      case 'logSwing':
        this.fx.logSwing(ev.reach);
        this.sfx('slam', 0.7);
        this.shakeCam(8);
        break;
      case 'cascade':
        this.fx.cascade(ev.halfWidth);
        this.sfx('squelch');
        break;
      case 'mend':
        this.fx.mend(ev.amount);
        this.sfx('horn', 0.4);
        break;
      case 'extraHand': {
        const p = this.slotOf('helper', s);
        this.fx.floatText(p.x + 40, p.y - 40, 'SECOND HAND!');
        this.fx.sparks(p.x, p.y - 20, 8);
        break;
      }
      case 'grip': {
        const p = this.slotOf('grip', s);
        this.fx.floatText(p.x + 40, p.y - 40, 'IRON GRIP!');
        this.fx.sparks(p.x, p.y - 20, 8);
        break;
      }
      case 'catapult':
        this.fx.puff(ev.x, ev.y, 0xc89a5a);
        break;
      case 'hive':
        this.fx.puff(ev.x, ev.y, 0xf3cb5e);
        break;
      case 'sentryShot':
        this.fx.streak(ev.x, ev.y, ev.tx, ev.ty);
        this.sfx('sentry', 0.6);
        break;
      case 'eagle':
        this.sfx('eagleScreech');
        this.stations.eagleComes(ev.x, ev.y - 60);
        break;
      case 'splash':
        this.fx.splash(ev.x, ev.y + 30);
        this.stations.potSplash();
        this.sfx('cauldronSplash');
        break;
      case 'cheese':
        this.fx.floatText(ev.x, ev.y - 90, 'Cheese!');
        this.fx.fadingProp('cheese', ev.x, ev.y - 34, 0.5, 1);
        break;
      case 'crest':
        this.fx.floatText(ev.x, ev.y - 90, `+${ev.amount} Crest${ev.amount > 1 ? 's' : ''}`);
        break;
      case 'crow':
        this.sfx('crow');
        this.fx.dust(ev.x, ev.y, 1);
        break;
      case 'shieldUp':
        this.sfx('shield', 0.4);
        break;
      case 'shieldBlock':
        this.sfx('shield');
        this.fx.sparks(ev.x, ev.y, 6);
        break;
      case 'tapCart':
        this.sfx('tapCart');
        this.fx.sparks(ev.x, ev.y, 7);
        this.shakeCam(3);
        break;
      case 'waveStart':
        // The sound of a new wave (its asset still carries the old name).
        if (ev.wave > 1) this.sfx('waveStart', 0.5);
        break;
      case 'runWon':
        if (this.isPrelude()) break;
        this.showBanner('VICTORY! THE KEEP STANDS!', 3.2);
        this.sfx('victory');
        this.sfx('cheer', 0.8);
        this.fx.jubilation(WORLD.gateX + 260, WORLD.groundY - 20);
        this.fx.jubilation(WORLD.gateX + 620, WORLD.groundY - 20);
        this.shakeCam(6);
        break;
      case 'defeat':
        this.showBanner('THE GATE HAS FALLEN!', 3);
        this.sfx('defeat');
        this.shakeCam(24);
        break;
      case 'denied':
        if (ev.p === s.me) this.sfx('uiDenied');
        break;
      case 'weaponReady':
        this.sfx('weaponReady', 0.6);
        this.castle.ready(ev.slot);
        break;
    }
  }

  private onImpact(ev: Extract<SimEvent, { e: 'impact' }>) {
    const power = Math.min(1, ev.speed / 2200);
    if (!ev.lethal) {
      this.viewOf(ev.id)?.bump();
      this.fx.dust(ev.x, ev.y, power * 0.4);
      this.sfx('softBounce', 0.5 + power * 0.5);
      return;
    }
    this.hitstop(power);
    this.shakeCam(5 + power * 13);
    this.fx.splat(ev.x, ev.y, power);
    this.fx.flattened(ev.etype, ev.x, ev.y);
    this.fx.ring(ev.x, ev.y - 14, 50 + power * 60, 0xfff6df);
    this.sfx('impactClang', 0.55 + power * 0.45);
    this.sfx('impactSplat', 0.55 + power * 0.45);
  }

  /** Every death shows its gold; Effects stacks the numbers when a blast kills many at once. */
  private onDeath(ev: Extract<SimEvent, { e: 'death' }>) {
    if (ev.cause !== 'impact' && ev.cause !== 'cauldron' && ev.cause !== 'eagle' && ev.cause !== 'shatter') {
      const big = ENEMIES[ev.etype].height > 100;
      this.fx.splat(ev.x, ev.y, big ? 1 : 0.5);
      this.sfx('impactSplat', 0.6);
    }
    const purse = this.hud.goldTarget();
    this.fx.coin(ev.x, ev.y, purse.x, purse.y);
    if (ev.gold > 0) this.fx.floatText(ev.x, ev.y - 60, `+${ev.gold}`);
    this.sfx('coin', 0.45);
    if (ev.cause === 'eagle') {
      // The crest flies to the counter.
      const crest = this.hud.crestTarget();
      this.fx.crestFly(ev.x, ev.y, crest.x, crest.y);
      this.sfx('crest');
    }
  }

  /** Test hook: where the weapon of a slot (0 to 4) is, in screen coordinates. */
  slotPosition(slot: number) {
    const p = this.castle.slotWorld(slot);
    return { x: p.x - this.view.offsetX, y: p.y - this.view.offsetY };
  }
  /** Test hook: CSS position of a slot, for tapping it in browser tests. */
  slotCss(slot: number) { const p = this.castle.slotWorld(slot); return this.worldToCss(p.x, p.y); }
  pauseCss() { const p = this.hud.pausePos(); return this.screenToCss(p.x, p.y); }
  slotDiameterCss() { return this.castle.diameterCss(); }
  pauseDiameterCss() { return this.hud.pauseDiameterCss(); }
  hudBottomCss() { return this.hud.bottomCss(); }
  viewEnemies(): ViewEnemy[] { return this.lastView?.enemies ?? []; }
  /** Test hook: whether my own hand is drawn (false on a touch screen). */
  ownHandVisible(): boolean { const s = this.session; return !!s && !!this.hands[s.me]?.img.visible; }
  /** Test hook: how far the shake of a held keg has got, 0 to 1. */
  kegShakeProgress(): number { return this.shakeId >= 0 ? this.shake.progress : 0; }
  /** Test hook: where the tutorial is ('intro', 'show', 'try', 'praise', 'pot' or ''). */
  tutorialStage(): string { return this.tutorial?.stage() ?? ''; }
  get frameMs() { return this.lastFrameMs; }
}
