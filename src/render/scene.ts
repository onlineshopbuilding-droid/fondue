import Phaser from 'phaser';
import type { AudioEngine, SfxName } from '../audio/audio';
import { ENEMIES } from '../config/enemies';
import { WEAPONS, WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import { WORLD } from '../config/world';
import type { Session } from '../game/session';
import type { ViewEnemy, ViewHand, ViewProjectile, ViewState } from '../net/snapshot';
import type { SimEvent } from '../sim/types';
import { bindPointer, type PointerTracker } from '../input/pointer';
import { AimView } from './aimView';
import { Background } from './background';
import { CastleView } from './castleView';
import { Effects } from './effects';
import { EnemyView } from './enemyView';
import { Hud } from './hud';
import { Stations } from './stations';
import { computeView, renderScale, type GameView } from './viewport';
import { propKey, TEX_SCALE } from './textures';

const HAND_COLORS = [0xfff1d0, 0x9fe0ff];
const FONT = 'Lilita One';

export interface SceneHooks {
  /** Called once per frame with the latest view, after rendering. */
  onFrame(view: ViewState | null): void;
  togglePause(): void;
  isInputBlocked(): boolean;
  onBuyNotice(text: string): void;
}

interface HandView { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; reticle: Phaser.GameObjects.Image; ghost: Phaser.GameObjects.Image; }

/** Spoken by the keep when a weapon waits for the next tap, or a pull was too short. */
const ARMED_HINT: Record<string, string> = {
  comet: 'Tap where the comet should fall',
  stomper: 'Tap where the slab should land',
};
const PULL_HINT = 'Pull away from it, then let go';

const PROJ_KEYS = { bomb: 'bomb', stone: 'stone', bolt: 'bolt', wheel: 'wheel', comet: 'comet', slab: 'slab', roofBolt: 'roofBolt', shell: 'shell', frostShell: 'shell', fireShell: 'shell' } as const;

export class GameScene extends Phaser.Scene {
  session: Session | null = null;
  audio!: AudioEngine;
  hooks!: SceneHooks;
  private bg!: Background;
  private fx!: Effects;
  private hud!: Hud;
  private castle!: CastleView;
  private stations!: Stations;
  private aim!: AimView;
  private hint!: Phaser.GameObjects.Text;
  private hintT = 0;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerT = -1;
  private bannerLine = '';
  private pool: EnemyView[] = [];
  private active = new Map<number, EnemyView>();
  private projViews = new Map<number, Phaser.GameObjects.Image>();
  private flameViews = new Map<number, Phaser.GameObjects.Image[]>();
  private hands: HandView[] = [];
  private tracker!: PointerTracker;
  private hitstopUntil = 0;
  private lastHitstop = 0;
  private shakeAmp = 0;
  private lastView: ViewState | null = null;
  private lastPhase = '';
  private lastDay = 0;
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
    this.aim = new AimView(this);
    this.hint = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '24px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 6, align: 'left',
    }).setOrigin(0, 0.5).setDepth(92).setVisible(false);

    this.fx = new Effects(this);
    this.hud = new Hud(this);

    const banner = this.add.image(0, 0, propKey('banner')).setOrigin(0.5, 0).setScale(1 / TEX_SCALE);
    this.bannerText = this.add.text(0, 76, '', {
      fontFamily: FONT, fontSize: '42px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5);
    this.banner = this.add.container(640, -170, [banner, this.bannerText]).setDepth(95).setScrollFactor(0);

    for (let i = 0; i < 2; i++) {
      const img = this.add.image(0, 0, propKey('handOpen')).setScale(1 / TEX_SCALE).setDepth(100).setVisible(false).setTint(HAND_COLORS[i]);
      const label = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(100).setVisible(false);
      const reticle = this.add.image(0, 0, propKey('reticle')).setScale(1 / TEX_SCALE).setDepth(101).setVisible(false);
      const ghost = this.add.image(0, 0, propKey('slab')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setAlpha(0.35).setDepth(44).setVisible(false);
      this.hands.push({ img, label, reticle, ghost });
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
    this.cameras.main.setSize(w, h).setOrigin(0, 0).setZoom(rs).setScroll(v.offsetX, v.offsetY);
    this.sharpenText(rs);
    this.bg.layout(v);
    this.hud.layout(v);
    this.castle.layout(v);
    this.stations.layout(v);
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

  /** CSS position of a world point. */
  worldToCss(x: number, y: number) { return this.screenToCss(x - this.view.offsetX, y - this.view.offsetY); }

  /** CSS position of a point in screen coordinates. */
  screenToCss(x: number, y: number) {
    const r = this.game.canvas.getBoundingClientRect();
    return { x: r.left + (x / this.view.width) * r.width, y: r.top + (y / this.view.height) * r.height };
  }

  private bindInput() {
    const canvas = this.game.canvas;
    const { tracker } = bindPointer(canvas, {
      onMove: () => { /* the hand position is read every frame */ },
      windowMs: () => this.session?.meta()?.tuning.velWindowMs ?? 80,
      view: () => this.view,
      onDown: (x, y) => {
        this.audio.resume();
        const s = this.session;
        if (!s || this.hooks.isInputBlocked()) return true;
        const sx = x - this.view.offsetX;
        const sy = y - this.view.offsetY;
        if (this.hud.hitPause(sx, sy)) { this.hooks.togglePause(); return true; }
        s.setHand(x, y);
        const slot = this.castle.hitSlot(x, y, s.meta());
        if (slot && s.view()?.phase === 'battle') {
          s.send({ k: 'pressSlot', slot, x, y });
          this.audio.play('uiClick');
          return false;
        }
        s.localPress(x, y);
        return false;
      },
      onUp: (_x, _y, vx, vy) => {
        const s = this.session;
        if (!s) return;
        s.localRelease(vx, vy);
      },
    });
    this.tracker = tracker;

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const s = this.session;
      if (!s || this.hooks.isInputBlocked()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= WEAPON_SLOTS.length) s.send({ k: 'activate', slot: WEAPON_SLOTS[n - 1] });
      if (e.key === 'Escape') s.send({ k: 'cancelMode' });
      if (e.key === 'p' || e.key === 'P') this.hooks.togglePause();
    });
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.session?.send({ k: 'cancelMode' }); });
  }

  /** Tears down everything visual between games. */
  resetForNewGame() {
    for (const [, v] of this.active) { v.hide(); this.pool.push(v); }
    this.active.clear();
    for (const [, img] of this.projViews) img.destroy();
    this.projViews.clear();
    for (const [, list] of this.flameViews) list.forEach((i) => i.destroy());
    this.flameViews.clear();
    this.lastPhase = '';
    this.lastDay = 0;
    this.lastView = null;
    this.bannerT = -1;
    this.banner.y = -170;
    this.stations.reset();
    this.hintT = 0;
    this.hint.setVisible(false);
  }

  update(_time: number, deltaMs: number) {
    const now = performance.now();
    this.debug.frameMs = deltaMs;
    this.debug.fps += (1000 / Math.max(1, deltaMs) - this.debug.fps) * 0.05;
    const s = this.session;
    if (!s) {
      this.hud.setVisible(false);
      this.bg.setDay(1);
      this.bg.update(8, 640, Math.min(0.05, deltaMs / 1000));
      this.hooks?.onFrame(null);
      return;
    }
    this.hud.setVisible(true);

    s.setHand(this.tracker.x, this.tracker.y);
    // Alone, a hitstop can stop the world for real; a shared game must keep running for the other player.
    if (s.role !== 'solo' || now >= this.hitstopUntil) s.update(Math.min(100, deltaMs));
    this.fx.resetFloatBudget();
    const events = s.drainEvents();
    for (const e of events) this.handleEvent(e, s);

    const view = s.view();
    const frozen = now < this.hitstopUntil;
    const dt = frozen ? 0 : Math.min(0.05, deltaMs / 1000);
    this.lastFrameMs = deltaMs;

    if (view) {
      if (!frozen || !this.lastView) {
        this.renderWorld(view, dt);
        this.lastView = view;
      }
      this.renderHands(view, s);
      this.hud.update(view, Math.min(0.05, deltaMs / 1000));
      this.bg.update(view.dayT, this.tracker.x, Math.min(0.05, deltaMs / 1000));
      this.bg.setDay(view.day);
      this.renderKeep(view, s, Math.min(0.05, deltaMs / 1000), now);
      this.updatePhase(view);
    }

    this.fx.update(dt);
    this.updateBanner(Math.min(0.05, deltaMs / 1000));
    this.applyShake(Math.min(0.05, deltaMs / 1000));
    this.hooks.onFrame(view);
  }

  private applyShake(dt: number) {
    const cam = this.cameras.main;
    this.shakeAmp *= Math.exp(-dt * 14);
    const { offsetX, offsetY } = this.view;
    if (this.shakeAmp < 0.3) { this.shakeAmp = 0; cam.setScroll(offsetX, offsetY); return; }
    cam.setScroll(offsetX + (Math.random() - 0.5) * 2 * this.shakeAmp, offsetY + (Math.random() - 0.5) * 2 * this.shakeAmp);
  }

  private renderWorld(view: ViewState, dt: number) {
    const time = performance.now();
    const seen = new Set<number>();
    let fastest = 0;
    for (const e of view.enemies) {
      seen.add(e.id);
      let v = this.active.get(e.id);
      if (!v) {
        v = this.pool.pop() ?? new EnemyView(this);
        v.bind(e.id);
        this.active.set(e.id, v);
      }
      v.update(e, time, dt, view.potMax > 0 ? 1 - view.potBusy / view.potMax : 0);
      if (e.st === 'air' && v.speed > fastest) fastest = v.speed;
      if (e.st === 'air' && v.speed > 1300 && dt > 0) this.fx.streak(e.x, e.y - 40);
    }
    for (const [id, v] of this.active) {
      if (!seen.has(id)) { v.hide(); this.pool.push(v); this.active.delete(id); }
    }
    this.debug.enemies = view.enemies.length;
    this.audio.whooshLevel(Math.min(1, fastest / 2200));

    this.renderProjectiles(view.projectiles);
    this.renderFlames(view, time);
  }

  private renderKeep(view: ViewState, s: Session, dt: number, time: number) {
    const meta = s.meta();
    if (!meta) return;
    const me = view.hands[s.me];
    this.castle.update(view, meta, this.bg.shown, this.bg.tint, this.bg.night, me?.mode ?? 'none', dt, time);
    this.stations.update(view, meta, this.bg.tint, dt, time);
    this.updateHint(me?.mode ?? 'none', dt);
  }

  /** One line next to the keep while a weapon waits for its target, and after a too short pull. */
  private updateHint(mode: string, dt: number) {
    this.hintT = Math.max(0, this.hintT - dt);
    const armed = ARMED_HINT[mode];
    if (armed) this.hint.setText(armed);
    const show = !!armed || this.hintT > 0;
    this.hint.setVisible(show);
    if (show) this.hint.setPosition(WORLD.gateX + 26, this.view.offsetY + Math.max(120, this.view.height * 0.32));
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

  private renderFlames(view: ViewState, time: number) {
    const seen = new Set<number>();
    for (const f of view.flames) {
      seen.add(f.id);
      let list = this.flameViews.get(f.id);
      if (!list) {
        const n = Math.max(2, Math.round(f.halfWidth / 24));
        list = [];
        for (let i = 0; i < n; i++) {
          const x = f.x - f.halfWidth + ((i + 0.5) / n) * f.halfWidth * 2;
          list.push(this.add.image(x, WORLD.groundY + 34, propKey('flame1')).setOrigin(0.5, 1).setDepth(28));
        }
        this.flameViews.set(f.id, list);
      }
      const k = Math.min(1, f.t * 2);
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

  private renderHands(view: ViewState, s: Session) {
    const meta = s.meta();
    this.aim.clear();
    view.hands.forEach((h: ViewHand, i: number) => {
      const hv = this.hands[i];
      if (!hv) return;
      const isMe = i === s.me;
      const x = isMe ? this.tracker.x : h.x;
      const y = isMe ? this.tracker.y : h.y;
      const blocked = isMe && this.hooks.isInputBlocked();
      const visible = h.connected && !blocked && (view.phase !== 'intermission' && view.phase !== 'gameover');
      // A finger leaves no cursor behind, so the hand only shows while it is touching.
      hv.img.setVisible(visible && !(isMe && this.tracker.touch && !this.tracker.pressed));
      hv.label.setVisible(visible && view.hands.length > 1);
      hv.reticle.setVisible(visible && h.mode === 'comet');
      hv.ghost.setVisible(visible && h.mode === 'stomper');
      if (!visible) return;
      if (meta) this.aim.draw(view, meta, h, x, y, isMe);
      const closed = h.down || h.holding >= 0 || h.holdingProj >= 0;
      hv.img.setTexture(propKey(closed ? 'handClosed' : 'handOpen'));
      hv.img.setTint(HAND_COLORS[i]);
      hv.img.setPosition(x, y);
      if (view.hands.length > 1) hv.label.setText(meta?.names[i] ?? '').setPosition(x, y - 40);
      hv.reticle.setPosition(x, y).setRotation(performance.now() * 0.002);
      if (h.mode === 'stomper') {
        const tier = ['stomper3', 'stomper2', 'stomper1'].find((id) => meta?.owned.includes(id));
        const halfWidth = tier ? WEAPONS.stomper[tier as keyof typeof WEAPONS.stomper].halfWidth : 80;
        hv.ghost.setPosition(x, WORLD.groundY + 34).setScale((halfWidth / 80) / TEX_SCALE);
      }
    });
  }

  private updatePhase(view: ViewState) {
    if (view.day !== this.lastDay) this.lastDay = view.day;
    if (view.phase === this.lastPhase) return;
    this.lastPhase = view.phase;
    if (view.phase === 'banner') this.showBanner(`DAY ${view.day} — HOLD THE GATE!`, 2.4);
  }

  private showBanner(text: string, seconds: number) {
    this.bannerLine = text;
    this.bannerText.setText(text);
    this.bannerText.setFontSize(text.length > 24 ? 34 : 42);
    this.bannerT = seconds;
  }

  private updateBanner(dt: number) {
    const target = this.bannerT > 0 ? 70 : -170;
    this.bannerT -= dt;
    this.banner.y += (target - this.banner.y) * Math.min(1, dt * 9);
    void this.bannerLine;
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

  private shake(amount: number) {
    const t = this.session?.meta()?.tuning.shake ?? 1;
    this.shakeAmp = Math.min(26, Math.max(this.shakeAmp, amount * t));
  }

  private viewOf(id: number) { return this.active.get(id); }

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
        if (ev.amount >= 25) this.shake(6);
        break;
      case 'explosion':
        this.fx.explosion(ev.x, ev.y, ev.radius);
        this.sfx('explosion');
        this.shake(Math.min(20, ev.radius / 7));
        this.hitstop(0.8);
        break;
      case 'throwKeg':
      case 'kegDrop':
        this.sfx('tapCart', 0.4);
        break;
      case 'strike':
        this.fx.dust(ev.x - 30, ev.y, 0);
        break;
      case 'shoot':
        this.sfx('bolter', 0.5);
        break;
      case 'wheel':
        this.sfx('wheelRoll');
        this.shake(5);
        break;
      case 'slam':
        this.sfx('slam');
        this.fx.fadingProp('slab', ev.x, ev.y + 8, 0.5, ev.halfWidth / 80);
        this.fx.dust(ev.x, ev.y, 1);
        this.fx.dust(ev.x - ev.halfWidth, ev.y, 1);
        this.fx.dust(ev.x + ev.halfWidth, ev.y, 1);
        this.shake(20);
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
      case 'flame':
        this.sfx('fire', 0.7);
        break;
      case 'bellows':
        this.sfx('fire');
        this.shake(6);
        break;
      case 'mortar':
        this.sfx('cannon');
        this.shake(5);
        this.fx.dust(ev.x, ev.y, 0);
        break;
      case 'bolters':
        this.sfx('bolter');
        this.fx.dust(ev.x + 30, ev.y, 0);
        break;
      case 'eagle':
        this.sfx('eagleScreech');
        this.stations.eagleComes(ev.x, ev.y - 60);
        break;
      case 'splash':
        this.fx.splash(ev.x, ev.y + 30);
        this.sfx('cauldronSplash');
        break;
      case 'cheese':
        this.fx.floatText(ev.x, ev.y - 90, 'Cheese!');
        this.fx.fadingProp('cheese', ev.x, ev.y - 34, 0.5, 1);
        break;
      case 'nightfall':
        this.showBanner('NIGHT FALLS!', 2.2);
        this.sfx('dayStart', 0.6);
        break;
      case 'aimHint':
        if (ev.p === s.me) { this.hint.setText(PULL_HINT); this.hintT = 1.8; }
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
        this.shake(3);
        break;
      case 'dayStart':
        this.sfx('dayStart');
        break;
      case 'victory':
        this.showBanner('THE GATE HOLDS!', 2.2);
        this.sfx('victory');
        break;
      case 'defeat':
        this.showBanner('THE GATE HAS FALLEN!', 3);
        this.sfx('defeat');
        this.shake(24);
        break;
      case 'buy':
        this.sfx('buy');
        this.hooks.onBuyNotice(`${s.meta()?.names[ev.p] ?? 'Someone'} bought ${ev.name}`);
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
    this.shake(5 + power * 13);
    this.fx.splat(ev.x, ev.y, power);
    this.fx.flattened(ev.etype, ev.x, ev.y);
    this.fx.ring(ev.x, ev.y - 14, 50 + power * 60, 0xfff6df);
    this.sfx('impactClang', 0.55 + power * 0.45);
    this.sfx('impactSplat', 0.55 + power * 0.45);
  }

  private onDeath(ev: Extract<SimEvent, { e: 'death' }>) {
    if (ev.cause !== 'impact' && ev.cause !== 'cauldron' && ev.cause !== 'eagle' && ev.cause !== 'shatter') {
      const big = ENEMIES[ev.etype].height > 100;
      this.fx.splat(ev.x, ev.y, big ? 1 : 0.5);
      this.sfx('impactSplat', 0.6);
    }
    const purse = this.hud.goldTarget();
    this.fx.coin(ev.x, ev.y, purse.x, purse.y);
    this.fx.floatText(ev.x, ev.y - 60, `+${ev.gold}`);
    this.sfx('coin', 0.45);
    if (ev.cause === 'cauldron' || ev.cause === 'eagle') {
      const pot = this.hud.offeringTarget();
      this.fx.offering(ev.x, ev.y, pot.x, pot.y);
      this.sfx('offering');
    }
  }

  /** Test hook: reports where a weapon icon is. */
  slotPosition(slot: WeaponSlot) {
    const p = this.castle.slotWorld(slot);
    return { x: p.x - this.view.offsetX, y: p.y - this.view.offsetY };
  }
  pauseCss() { const p = this.hud.pausePos(); return this.screenToCss(p.x, p.y); }
  slotDiameterCss() { return this.castle.diameterCss(); }
  pauseDiameterCss() { return this.hud.pauseDiameterCss(); }
  hudBottomCss() { return this.hud.bottomCss(); }
  viewEnemies(): ViewEnemy[] { return this.lastView?.enemies ?? []; }
  get frameMs() { return this.lastFrameMs; }
}
