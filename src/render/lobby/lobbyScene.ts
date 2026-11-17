/**
 * The lobby: the hall inside the keep as its own Phaser scene, drawn above the battlefield scene.
 * It shows the stations (each opens a menu screen), King Fridolin with his two guards at the
 * cauldron, the banner with the castle's name and tier, and a hall that looks different at each
 * castle tier (src/config/lobby.ts, HALL_LOOK). What to show comes from `hooks.state()`; the lobby
 * controller (src/ui/lobby/lobby.ts) decides when the hall is on screen.
 */
import Phaser from 'phaser';
import { LOBBY_ART, LOBBY_HALL_ART, LOBBY_WORLD_SIZE, lobbyKey } from '../../art/lobby';
import { LOBBY_HALL } from '../../config/lobby';
import { TEX_SCALE, weaponKey } from '../textures';
import { ensureHall } from './hallTextures';
import {
  HALL_LINES, HALL_PIECES, KING_GROUP, KING_SPOT, NAME_BANNER, ROOM, STATIONS, WEAPON_PEGS, WEAPON_SIZE,
  bannerText, decorFor, fitRoom, hallLook, hallTier, stationArt, stationPos, type StationDef, type StationId,
} from './layout';

export interface LobbyState {
  /** Highest campaign level beaten. */
  levelDone: number;
  /** Castle tier 1..7: how the hall looks. */
  castleTier: number;
  /** Unlocked weapons, in the order of the weapon table. */
  weapons: readonly string[];
  /** The interrupted level that can be continued, if any. */
  pending: { level: number; wave: number } | null;
  /** The co-op table is mended (level 3 won). */
  coop: boolean;
  /** The endless table is mended (level 10 won). */
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
export interface LobbySpot { id: StationId; label: string; x: number; y: number; r: number; open: boolean; lx: number; ly: number }

interface StationView {
  def: StationDef;
  img: Phaser.GameObjects.Image | null;
  label: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text | null;
  pill: Phaser.GameObjects.Graphics;
  /** Where it stands right now (corner stations move with the view). */
  x: number; y: number; lx: number; ly: number;
  open: boolean;
}

const FONT = 'Lilita One';
const INK = '#2b2118';
const CREAM = '#fff6df';
const MUSTL_HEX = '#f3cb5e';
const ARRIVE_ZOOM = LOBBY_HALL.arriveZoom;
const LINE_SECONDS = LOBBY_HALL.lineSeconds;

const artOf = (name: string) => LOBBY_ART[name] ?? LOBBY_HALL_ART[name];

/** Gives an image the picture `name` at its pivot, in world size times `scale`. */
function setArt(img: Phaser.GameObjects.Image, name: string, x: number, y: number, scale = 1, flipX = false): Phaser.GameObjects.Image {
  const a = artOf(name);
  if (!a || !img.scene.textures.exists(lobbyKey(name))) return img.setVisible(false);
  const tex = LOBBY_WORLD_SIZE(name) ? 1 : TEX_SCALE;
  return img.setTexture(lobbyKey(name)).setOrigin(a.px / a.w, a.py / a.h).setScale(scale / tex).setPosition(x, y).setFlipX(flipX).setVisible(true);
}

export class LobbyScene extends Phaser.Scene {
  hooks!: LobbyHooks;
  /** How visible the hall is, 0 to 1; set by the lobby controller during the camera move. */
  fade = 1;
  private stations = new Map<StationId, StationView>();
  private shell: { wall: Phaser.GameObjects.Image[]; floor: Phaser.GameObjects.Image[]; ceiling: Phaser.GameObjects.Image[]; pennants: Phaser.GameObjects.Image[] } = { wall: [], floor: [], ceiling: [], pennants: [] };
  private door!: Phaser.GameObjects.Image;
  private windows: Phaser.GameObjects.Image[] = [];
  private cauldron!: Phaser.GameObjects.Image;
  private throne!: Phaser.GameObjects.Image;
  private guards: Phaser.GameObjects.Image[] = [];
  private decor: Phaser.GameObjects.Image[] = [];
  private weapons: Phaser.GameObjects.Image[] = [];
  private king!: Phaser.GameObjects.Image;
  private bannerName!: Phaser.GameObjects.Text;
  private bannerTier!: Phaser.GameObjects.Text;
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
  private view: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: ROOM.w, h: ROOM.h };
  /** The castle tier whose hall is on show (0 until its pictures exist), and the one being made. */
  private shownTier = 0;
  private loadingTier = 0;

  constructor() { super('lobby'); }

  create() {
    const blank = () => this.add.image(0, 0, '__DEFAULT').setVisible(false);
    const L = HALL_LINES;
    for (let x = 0; x < ROOM.w; x += L.tileW) {
      this.shell.wall.push(blank().setDepth(0));
      this.shell.floor.push(blank().setDepth(0));
      this.shell.ceiling.push(blank().setDepth(1));
      this.shell.pennants.push(blank().setDepth(1.5));
    }
    this.door = blank().setDepth(1);
    this.windows = HALL_PIECES.windows.map(() => blank().setDepth(1));
    this.doorGlow = this.add.graphics().setDepth(1.2);
    const pegs = this.add.graphics().setDepth(1.5);
    for (const p of WEAPON_PEGS) {
      pegs.fillStyle(0x2b2118, 1).fillCircle(p.x, p.y - 17, 4);
      pegs.fillStyle(0x777d83, 1).fillCircle(p.x, p.y - 17, 2.4);
      this.weapons.push(this.add.image(p.x, p.y, '__DEFAULT').setDepth(1.5).setVisible(false));
    }
    this.throne = blank().setDepth(3);
    this.king = setArt(blank(), 'king', KING_GROUP.king.x, KING_GROUP.king.y).setOrigin(0.5, 1).setDepth(3.5);
    this.cauldron = blank().setDepth(5);
    this.potFx = this.add.graphics().setDepth(5.5);
    this.guards = KING_GROUP.guards.map((g) => setArt(blank(), 'knight', g.x, g.y, g.scale, g.flipX).setDepth(6));

    setArt(blank(), 'nameBanner', NAME_BANNER.x, NAME_BANNER.y, NAME_BANNER.scale).setDepth(2);
    this.bannerName = this.text(NAME_BANNER.x, NAME_BANNER.y - 12, '', 30, MUSTL_HEX).setDepth(2.1);
    this.bannerTier = this.text(NAME_BANNER.x, NAME_BANNER.y + 20, '', 19, CREAM).setDepth(2.1);

    for (const def of STATIONS) {
      const img = def.art ? blank().setDepth(def.depth ?? 4) : null;
      const pill = this.add.graphics().setDepth(10);
      const label = this.text(def.lx, def.ly, def.label, def.size ?? 30, CREAM).setDepth(11);
      const sub = def.id === 'continueLevel' ? this.text(def.lx, def.ly + 32, '', 20, CREAM).setDepth(11) : null;
      this.stations.set(def.id, { def, img, label, sub, pill, x: def.x, y: def.y, lx: def.lx, ly: def.ly, open: true });
    }

    this.bubbleBox = this.add.graphics();
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: INK, align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5);
    this.texts.push(this.bubbleText);
    this.bubble = this.add.container(KING_SPOT.x, 214, [this.bubbleBox, this.bubbleText]).setDepth(12).setVisible(false);

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
    // The King sits on the right: the bubble leans left so it stays on screen, its tail at his head.
    const off = Math.min(0, ROOM.w - 170 - (KING_SPOT.x + w / 2)) - 60;
    g.fillStyle(0x2b2118, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 22);
    g.fillTriangle(-off - 20, h / 2, -off + 20, h / 2, -off, h / 2 + 30);
    g.fillStyle(0xfff6df, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.fillTriangle(-off - 14, h / 2 - 2, -off + 14, h / 2 - 2, -off, h / 2 + 22);
    this.bubble.setPosition(KING_SPOT.x + off, KING_SPOT.y - 92 - h / 2 - 30).setVisible(true).setScale(0.6);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: LOBBY_HALL.bubblePopMs, ease: 'Back.Out' });
    this.bubbleT = LINE_SECONDS;
  }

  get speaking(): boolean { return this.bubbleT > 0; }
  get bubbleLine(): string { return this.bubble.visible ? this.bubbleText.text : ''; }
  /** The castle tier whose hall is on show (0 while its pictures are still being made). */
  get hallShown(): number { return this.shownTier; }

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
    if (!this.hooks.canTap() || !this.shownTier) return;
    const w = this.cssToRoom(cx, cy);
    const hit = this.hit(w.x, w.y);
    // The station answers the tap at once (squash and a bright sign); the page follows a moment later.
    if (hit) { this.pop(hit); this.time.delayedCall(LOBBY_HALL.stationBounceMs, () => this.hooks.tap(hit)); return; }
    if (Math.hypot(w.x - KING_SPOT.x, w.y - KING_SPOT.y) <= KING_SPOT.r) {
      this.tweens.add({ targets: this.king, scaleX: this.king.scaleX * 1.05, duration: LOBBY_HALL.kingNodMs, yoyo: true });
      this.hooks.tapKing();
    }
  }

  /** The station whose sign holds the room point, else the nearest visible station whose circle holds it. */
  private hit(x: number, y: number): StationId | null {
    let best: StationId | null = null;
    let bestD = Infinity;
    for (const v of this.stations.values()) {
      if (!v.label.visible) continue;
      // The sign belongs to its station: a tap on it counts, also outside the circle.
      const b = v.label.getBounds();
      if (x >= b.x - 12 && x <= b.right + 12 && y >= b.y - 8 && y <= b.bottom + (v.sub?.visible ? v.sub.height : 0) + 8) return v.def.id;
      const d = Math.hypot(x - v.x, y - v.y);
      if (d <= v.def.r && d < bestD) { best = v.def.id; bestD = d; }
    }
    return best;
  }

  /** A small squash on the tapped object, so the tap feels answered. */
  private pop(id: StationId) {
    const v = this.stations.get(id);
    if (v) {
      v.label.setTint(0xfff1a8);
      this.time.delayedCall(LOBBY_HALL.stationBounceMs * 3, () => v.label.clearTint());
    }
    const targets = [v?.img, v?.label].filter(Boolean) as Phaser.GameObjects.Components.Transform[];
    for (const t of targets) {
      const sx = t.scaleX;
      const sy = t.scaleY;
      this.tweens.add({ targets: t, scaleX: sx * 1.08, scaleY: sy * 0.94, duration: LOBBY_HALL.stationBounceMs, yoyo: true, onComplete: () => t.setScale(sx, sy) });
    }
  }

  /** Builds the hall of one castle tier: walls, floor, ceiling, door, windows, cauldron, throne, decor. */
  private buildHall(tier: number) {
    const L = HALL_LINES;
    const look = hallLook(tier);
    this.shell.wall.forEach((img, i) => setArt(img, `wall${tier}`, i * L.tileW, L.wallTop));
    this.shell.floor.forEach((img, i) => setArt(img, `floor${tier}`, i * L.tileW, L.floorTop));
    this.shell.ceiling.forEach((img, i) => setArt(img, `ceiling${tier}`, i * L.tileW, 0));
    this.shell.pennants.forEach((img, i) => (look.pennants ? setArt(img, 'pennants', i * L.tileW, L.ceilingH - 6) : img.setVisible(false)));
    setArt(this.door, `door${tier}`, HALL_PIECES.door.x, HALL_PIECES.door.y);
    this.windows.forEach((img, i) => setArt(img, `window${tier}`, HALL_PIECES.windows[i].x, HALL_PIECES.windows[i].y));
    setArt(this.cauldron, `cauldron${tier}`, KING_GROUP.cauldron.x, KING_GROUP.cauldron.y, KING_GROUP.cauldron.scale);
    setArt(this.throne, look.throne, KING_GROUP.throne.x, KING_GROUP.throne.y, KING_GROUP.throne.scale);
    for (const d of this.decor) d.destroy();
    this.decor = decorFor(tier).map((d) => setArt(this.add.image(0, 0, '__DEFAULT'), d.art, d.x, d.y, d.scale ?? 1, !!d.flipX).setDepth(d.depth ?? 1.4));
    const banner = bannerText(tier);
    this.bannerName.setText(banner.name);
    this.bannerTier.setText(banner.tier);
    this.shownTier = tier;
  }

  /** Brings the hall, stations and weapons in line with the profile. */
  private refresh(force = false) {
    const s = this.hooks.state();
    const tier = hallTier(s.castleTier);
    if (tier !== this.shownTier && tier !== this.loadingTier) {
      this.loadingTier = tier;
      void ensureHall(this.textures, tier).then(() => {
        if (this.loadingTier !== tier || !this.sys.isActive()) return;
        this.loadingTier = 0;
        this.buildHall(tier);
        this.stateKey = '';
      });
    }
    if (!this.shownTier) return;
    const key = `${this.shownTier}|${s.weapons.join(',')}|${s.pending ? `${s.pending.level}:${s.pending.wave}` : '-'}|${s.coop}|${s.endless}|${this.fitKey}`;
    if (!force && key === this.stateKey) return;
    this.stateKey = key;
    this.weapons.forEach((img, i) => {
      const id = s.weapons[i];
      if (!id || !this.textures.exists(weaponKey(id, 1))) { img.setVisible(false); return; }
      img.setTexture(weaponKey(id, 1)).setVisible(true);
      img.setScale(WEAPON_SIZE / Math.max(img.width, img.height));
    });
    for (const v of this.stations.values()) {
      const pos = stationPos(v.def, this.view);
      Object.assign(v, pos);
      v.open = v.def.id === 'coop' ? s.coop : v.def.id === 'play' ? s.endless : true;
      if (v.img) setArt(v.img, stationArt(v.def, this.shownTier, v.open), v.x, v.y, v.def.scale ?? 1);
      const on = v.def.id === 'continueLevel' ? !!s.pending : true;
      v.label.setVisible(on).setPosition(v.lx, v.ly).setText(v.open ? v.def.label : `${v.def.label} 🔒`).setAlpha(v.open ? 1 : 0.85);
      v.sub?.setVisible(on).setPosition(v.lx, v.ly + 32);
      if (v.sub && s.pending) v.sub.setText(`Level ${s.pending.level}, wave ${s.pending.wave}`);
      v.pill.clear();
      if (!on) continue;
      const pw = Math.max(v.label.width + 26, v.sub?.visible ? v.sub.width + 26 : 0);
      const bh = v.label.height + (v.sub?.visible ? v.sub.height : 0) + 4;
      v.pill.fillStyle(0x2b2118, v.open ? 0.6 : 0.4).fillRoundedRect(v.lx - pw / 2, v.ly - v.label.height / 2 - 2, pw, bh, 16);
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
      this.view = f;
      // Text is drawn into its own texture; as fine as the canvas shows it, or it looks blurred.
      const res = Math.max(1, Math.ceil(f.zoom * 2) / 2);
      for (const t of this.texts) if (t.style.resolution !== res) t.setResolution(res);
    }
    const e = 1 - this.fade;
    cam.setZoom(this.zoom * (1 + ARRIVE_ZOOM * e * e));
    cam.centerOn(ROOM.w / 2, ROOM.h / 2);
    cam.setAlpha(this.fade);
    cam.setVisible(this.fade > 0.001 && this.shownTier > 0);
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!this.time0) this.time0 = time;
    const t = (time - this.time0) / 1000;
    // The camera move runs on real time, also when frames are slow.
    this.hooks.step(Math.min(0.1, deltaMs / 1000));
    this.fitCamera();
    if (this.fade <= 0.001 && this.shownTier) return;
    this.refresh();
    if (this.shownTier) this.animate(t, dt);
  }

  /** The cauldron bubbling and steaming, the King breathing, the glow on the door and the speech bubble. */
  private animate(t: number, dt: number) {
    this.king.setScale(1 / TEX_SCALE, (1 + 0.012 * Math.sin(t * 2.2)) / TEX_SCALE);
    this.guards.forEach((g, i) => { g.y = KING_GROUP.guards[i].y - Math.abs(Math.sin(t * 1.3 + i * 1.7)) * 1.5; });

    const c = KING_GROUP.cauldron;
    const top = c.y - 196 * c.scale;
    const g = this.potFx.clear();
    for (let i = 0; i < 5; i++) {
      const phase = (t * 0.8 + i * 0.37) % 1;
      const x = c.x - 70 + i * 35 + Math.sin(t * 2 + i) * 4;
      const y = top - phase * 16;
      const r = 3 + 4 * Math.sin(phase * Math.PI);
      g.lineStyle(2.5, 0x2b2118, 1 - phase).fillStyle(0xffe896, 1 - phase).fillCircle(x, y, r).strokeCircle(x, y, r);
    }
    for (let i = 0; i < 4; i++) {
      const phase = (t * 0.35 + i / 4) % 1;
      g.fillStyle(0xffffff, 0.2 * (1 - phase)).fillCircle(c.x - 75 + i * 50 + Math.sin(t + i) * 10, top - 20 - phase * 90, 12 + phase * 18);
    }

    const door = this.stations.get('continueLevel')!;
    const dg = this.doorGlow.clear();
    if (door.label.visible) {
      const a = 0.45 + 0.35 * Math.sin(t * 3.4);
      dg.lineStyle(10, 0xffd27a, a).strokeRoundedRect(HALL_PIECES.door.x - 100, HALL_PIECES.door.y - 236, 200, 236, { tl: 90, tr: 90, bl: 0, br: 0 });
    }

    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble.setVisible(false);
    }
  }

  /** Every visible station as a CSS circle on the page, for tests and the accessibility layer. */
  spots(): LobbySpot[] {
    if (!this.shownTier) return [];
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
      out.push({
        id: v.def.id, label: v.def.label, x: r.left + (v.x - left) * z * k, y: r.top + (v.y - top) * z * k, r: v.def.r * z * k, open: v.open,
        lx: r.left + (v.lx - left) * z * k, ly: r.top + (v.ly - top) * z * k,
      });
    }
    return out;
  }
}
