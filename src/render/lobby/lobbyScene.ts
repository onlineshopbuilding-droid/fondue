/**
 * The lobby: the hall inside the keep as its own Phaser scene, drawn above the battlefield scene.
 * It shows the stations (each opens a menu screen), the King with his remarks, the decor that grows
 * with the campaign and the unlocked weapons on their pegs. What to show comes from `hooks.state()`;
 * the lobby controller (src/ui/lobby/lobby.ts) decides when the hall is on screen.
 */
import Phaser from 'phaser';
import { LOBBY_ART, lobbyKey } from '../../art/lobby';
import { GAME_NAME } from '../../config/game';
import { LOBBY_HALL } from '../../config/lobby';
import { TEX_SCALE, weaponKey } from '../textures';
import {
  DECOR, KING_SPOT, NAME_BANNER, ROOM, STATIONS, TORCHES, WEAPON_PEGS, WEAPON_SIZE, decorFor, fitRoom, type StationDef, type StationId,
} from './layout';

export interface LobbyState {
  /** Highest campaign level beaten. */
  levelDone: number;
  /** Unlocked weapons, in the order of the weapon table. */
  weapons: readonly string[];
  /** The interrupted level that can be continued, if any. */
  pending: { level: number; wave: number } | null;
  /** Endless mode is open. */
  endless: boolean;
}

export interface LobbyHooks {
  state(): LobbyState;
  /** True while a tap on the hall should do something (on show, nothing in front of it). */
  canTap(): boolean;
  tap(id: StationId): void;
  tapKing(): void;
  /** Once per frame, with the real seconds since the last frame. */
  step(dt: number): void;
}

/** A spot the player can tap, for tests: centre and radius in CSS pixels. */
export interface LobbySpot { id: StationId; label: string; x: number; y: number; r: number }

interface StationView { def: StationDef; img: Phaser.GameObjects.Image | null; label: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text | null; pill: Phaser.GameObjects.Graphics }

const FONT = 'Lilita One';
const INK = '#2b2118';
const CREAM = '#fff6df';
const MUSTL_HEX = '#f3cb5e';
/** How much closer the hall starts when it fades in, and how long a remark of the King stays up (src/config/lobby.ts). */
const ARRIVE_ZOOM = LOBBY_HALL.arriveZoom;
const LINE_SECONDS = LOBBY_HALL.lineSeconds;

/** Puts an art texture at its pivot and in world size. */
function placeArt(scene: Phaser.Scene, name: string, x: number, y: number): Phaser.GameObjects.Image {
  const a = LOBBY_ART[name];
  return scene.add.image(x, y, lobbyKey(name)).setOrigin(a.px / a.w, a.py / a.h).setScale(1 / TEX_SCALE);
}

export class LobbyScene extends Phaser.Scene {
  hooks!: LobbyHooks;
  /** How visible the hall is, 0 to 1; set by the lobby controller during the camera move. */
  fade = 1;
  private stations = new Map<StationId, StationView>();
  private decor = new Map<string, Phaser.GameObjects.Image>();
  private weapons: Phaser.GameObjects.Image[] = [];
  private flames: Phaser.GameObjects.Image[] = [];
  private king!: Phaser.GameObjects.Image;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleBox!: Phaser.GameObjects.Graphics;
  private bubbleText!: Phaser.GameObjects.Text;
  private bubbleT = 0;
  private doorGlow!: Phaser.GameObjects.Graphics;
  private potFx!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private time0 = 0;
  private stateKey = '';
  private fitKey = '';
  private zoom = 1;

  constructor() { super('lobby'); }

  create() {
    this.add.image(0, 0, lobbyKey('room')).setOrigin(0, 0).setDepth(0);
    for (const d of DECOR) {
      const img = placeArt(this, d.art, d.x, d.y).setDepth(d.depth ?? 2).setFlipX(!!d.flipX).setVisible(false);
      this.decor.set(d.id, img);
    }
    const pegs = this.add.graphics().setDepth(2);
    for (const p of WEAPON_PEGS) {
      pegs.fillStyle(0x2b2118, 1).fillCircle(p.x, p.y - 22, 5);
      pegs.fillStyle(0x777d83, 1).fillCircle(p.x, p.y - 22, 3);
      this.weapons.push(this.add.image(p.x, p.y, '__DEFAULT').setDepth(2).setVisible(false));
    }
    for (const t of TORCHES) this.flames.push(placeArt(this, 'flame', t.x, t.y).setDepth(3));

    const banner = placeArt(this, 'nameBanner', NAME_BANNER.x, NAME_BANNER.y).setDepth(2);
    this.text(NAME_BANNER.x, banner.y + 4, GAME_NAME, 40, MUSTL_HEX).setDepth(2);

    this.king = placeArt(this, 'king', KING_SPOT.x, KING_SPOT.y + 110).setOrigin(0.5, 1).setDepth(4);
    this.doorGlow = this.add.graphics().setDepth(1);
    this.potFx = this.add.graphics().setDepth(5);

    for (const def of STATIONS) {
      const img = def.art ? placeArt(this, def.art, def.x, def.y).setDepth(def.id === 'play' ? 5 : 3) : null;
      const pill = this.add.graphics().setDepth(7);
      const label = this.text(def.lx, def.ly, def.label, def.quiet ? 22 : 30, CREAM).setDepth(8);
      if (def.quiet) label.setAlpha(0.85);
      const sub = def.id === 'continueLevel' ? this.text(def.lx, def.ly + 30, '', 20, CREAM).setDepth(8) : null;
      this.stations.set(def.id, { def, img, label, sub, pill });
    }

    this.bubbleBox = this.add.graphics();
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: INK, align: 'center', wordWrap: { width: 360 },
    }).setOrigin(0.5);
    this.texts.push(this.bubbleText);
    this.bubble = this.add.container(KING_SPOT.x, 214, [this.bubbleBox, this.bubbleText]).setDepth(9).setVisible(false);

    // Plain DOM events: the battle scene's pointer handling cancels the mouse events Phaser would use.
    const canvas = this.game.canvas;
    const onDown = (e: PointerEvent) => this.onDown(e.clientX, e.clientY);
    canvas.addEventListener('pointerdown', onDown);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => canvas.removeEventListener('pointerdown', onDown));
    this.refresh(true);
  }

  private text(x: number, y: number, s: string, size: number, color: string): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, {
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: INK, strokeThickness: Math.round(size / 4.5),
    }).setOrigin(0.5);
    this.texts.push(t);
    return t;
  }

  /** The King says something; it stays up for a few seconds. */
  say(line: string) {
    if (!line) return;
    this.bubbleText.setText(line);
    const w = Math.max(160, this.bubbleText.width + 40);
    const h = this.bubbleText.height + 28;
    const g = this.bubbleBox.clear();
    g.fillStyle(0x2b2118, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 22);
    g.fillTriangle(-20, h / 2, 20, h / 2, 0, h / 2 + 30);
    g.fillStyle(0xfff6df, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.fillTriangle(-14, h / 2 - 2, 14, h / 2 - 2, 0, h / 2 + 22);
    // The tail points at the King's head, so the bubble sits right above it.
    this.bubble.setPosition(KING_SPOT.x, KING_SPOT.y - 112 - h / 2 - 30).setVisible(true).setScale(0.6);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: LOBBY_HALL.bubblePopMs, ease: 'Back.Out' });
    this.bubbleT = LINE_SECONDS;
  }

  get speaking(): boolean { return this.bubbleT > 0; }
  get bubbleLine(): string { return this.bubble.visible ? this.bubbleText.text : ''; }

  /** Room point under a CSS position on the page. */
  private cssToRoom(cx: number, cy: number): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    const z = this.cameras.main.zoom;
    const gw = this.scale.gameSize.width;
    const gh = this.scale.gameSize.height;
    const k = gw / r.width;
    return { x: ROOM.w / 2 - gw / z / 2 + ((cx - r.left) * k) / z, y: ROOM.h / 2 - gh / z / 2 + ((cy - r.top) * k) / z };
  }

  private onDown(cx: number, cy: number) {
    if (!this.hooks.canTap()) return;
    const w = this.cssToRoom(cx, cy);
    const hit = this.hit(w.x, w.y);
    if (hit) { this.pop(hit); this.hooks.tap(hit); return; }
    if (Math.hypot(w.x - KING_SPOT.x, w.y - KING_SPOT.y) <= KING_SPOT.r) {
      this.tweens.add({ targets: this.king, scaleX: this.king.scaleX * 1.05, duration: LOBBY_HALL.kingNodMs, yoyo: true });
      this.hooks.tapKing();
    }
  }

  /** The nearest visible station whose circle holds the room point. */
  private hit(x: number, y: number): StationId | null {
    let best: StationId | null = null;
    let bestD = Infinity;
    for (const v of this.stations.values()) {
      if (!v.label.visible) continue;
      const d = Math.hypot(x - v.def.x, y - v.def.y);
      if (d <= v.def.r && d < bestD) { best = v.def.id; bestD = d; }
    }
    return best;
  }

  /** A small squash on the tapped object, so the tap feels answered. */
  private pop(id: StationId) {
    const v = this.stations.get(id);
    const targets = [v?.img, v?.label].filter(Boolean) as Phaser.GameObjects.Components.Transform[];
    for (const t of targets) {
      const sx = t.scaleX;
      const sy = t.scaleY;
      this.tweens.add({ targets: t, scaleX: sx * 1.08, scaleY: sy * 0.94, duration: LOBBY_HALL.stationBounceMs, yoyo: true, onComplete: () => t.setScale(sx, sy) });
    }
  }

  /** Brings stations, decor and weapons in line with the profile. */
  private refresh(force = false) {
    const s = this.hooks.state();
    const key = `${s.levelDone}|${s.weapons.join(',')}|${s.pending ? `${s.pending.level}:${s.pending.wave}` : '-'}|${s.endless}`;
    if (!force && key === this.stateKey) return;
    this.stateKey = key;
    const shown = new Set(decorFor(s.levelDone).map((d) => d.id));
    for (const [id, img] of this.decor) img.setVisible(shown.has(id));
    this.weapons.forEach((img, i) => {
      const id = s.weapons[i];
      if (!id || !this.textures.exists(weaponKey(id, 1))) { img.setVisible(false); return; }
      img.setTexture(weaponKey(id, 1)).setVisible(true);
      img.setScale(WEAPON_SIZE / Math.max(img.width, img.height));
    });
    for (const v of this.stations.values()) {
      const on = v.def.id === 'continueLevel' ? !!s.pending : true;
      // The pot is always there; while endless is still closed its sign shows a lock and a tap brings the King's hint.
      const closed = v.def.id === 'play' && !s.endless;
      v.label.setVisible(on).setText(closed ? `${v.def.label} 🔒` : v.def.label).setAlpha(closed ? 0.8 : v.def.quiet ? 0.85 : 1);
      v.sub?.setVisible(on);
      if (v.sub && v.def.id === 'continueLevel' && s.pending) v.sub.setText(`Level ${s.pending.level}, wave ${s.pending.wave}`);
      v.pill.clear();
      if (!on) continue;
      const bw = v.label.width + 26;
      const bh = v.label.height + (v.sub?.visible ? v.sub.height : 0) + 4;
      const sw = v.sub?.visible ? v.sub.width + 26 : 0;
      const pw = Math.max(bw, sw);
      v.pill.fillStyle(0x2b2118, v.def.quiet ? 0.35 : 0.55).fillRoundedRect(v.def.lx - pw / 2, v.def.ly - v.label.height / 2 - 2, pw, bh, 16);
    }
  }

  /** Fits the camera to the canvas: the safe middle of the room always shows. */
  private fitCamera() {
    const gw = this.scale.gameSize.width;
    const gh = this.scale.gameSize.height;
    const cam = this.cameras.main;
    const f = fitRoom(gw, gh);
    const key = `${gw}x${gh}`;
    if (key !== this.fitKey) {
      this.fitKey = key;
      cam.setSize(gw, gh);
      this.zoom = f.zoom;
      // Text is drawn into its own texture; as fine as the canvas shows it, or it looks blurred.
      const res = Math.max(1, Math.ceil(f.zoom * 2) / 2);
      for (const t of this.texts) if (t.style.resolution !== res) t.setResolution(res);
    }
    const e = 1 - this.fade;
    cam.setZoom(this.zoom * (1 + ARRIVE_ZOOM * e * e));
    cam.centerOn(ROOM.w / 2, ROOM.h / 2);
    cam.setAlpha(this.fade);
    cam.setVisible(this.fade > 0.001);
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!this.time0) this.time0 = time;
    const t = (time - this.time0) / 1000;
    // The camera move runs on real time, also when frames are slow.
    this.hooks.step(Math.min(0.1, deltaMs / 1000));
    this.fitCamera();
    if (this.fade <= 0.001) return;
    this.refresh();
    this.animate(t, dt);
  }

  /** Flames, the pot, the King breathing, the glow on the door and the speech bubble. */
  private animate(t: number, dt: number) {
    this.flames.forEach((f, i) => f.setScale((1 + 0.08 * Math.sin(t * 13 + i * 2)) / TEX_SCALE, (1 + 0.14 * Math.sin(t * 9 + i)) / TEX_SCALE));
    this.king.setScale(1 / TEX_SCALE, (1 + 0.012 * Math.sin(t * 2.2)) / TEX_SCALE);

    const pot = this.stations.get('play')!.def;
    const g = this.potFx.clear();
    for (let i = 0; i < 6; i++) {
      const phase = (t * 0.8 + i * 0.37) % 1;
      const x = pot.x - 70 + i * 28 + Math.sin(t * 2 + i) * 4;
      const y = pot.y - 44 - phase * 18;
      const r = 3 + 4 * Math.sin(phase * Math.PI);
      g.lineStyle(2.5, 0x2b2118, 1 - phase).fillStyle(0xffe896, 1 - phase).fillCircle(x, y, r).strokeCircle(x, y, r);
    }
    // Steam over the pot.
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.35 + i / 3) % 1;
      g.fillStyle(0xffffff, 0.14 * (1 - phase)).fillCircle(pot.x - 50 + i * 50 + Math.sin(t + i) * 10, pot.y - 60 - phase * 50, 10 + phase * 14);
    }

    const door = this.stations.get('continueLevel')!;
    const dg = this.doorGlow.clear();
    if (door.label.visible) {
      const a = 0.45 + 0.35 * Math.sin(t * 3.4);
      dg.lineStyle(10, 0xffd27a, a).strokeRoundedRect(door.def.x - 92, 314, 184, 282, { tl: 92, tr: 92, bl: 0, br: 0 });
    }

    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble.setVisible(false);
    }
  }

  /** Every visible station as a CSS circle on the page, for tests and the accessibility layer. */
  spots(): LobbySpot[] {
    const r = this.game.canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    const z = cam.zoom;
    const gw = this.scale.gameSize.width;
    const k = r.width / gw;
    const left = ROOM.w / 2 - gw / z / 2;
    const top = ROOM.h / 2 - this.scale.gameSize.height / z / 2;
    const out: LobbySpot[] = [];
    for (const v of this.stations.values()) {
      if (!v.label.visible) continue;
      out.push({ id: v.def.id, label: v.def.label, x: r.left + (v.def.x - left) * z * k, y: r.top + (v.def.y - top) * z * k, r: v.def.r * z * k });
    }
    return out;
  }
}

