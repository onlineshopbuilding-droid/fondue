/**
 * Draws the first minutes of the game on the battlefield: the King with his speech bubble, the
 * frozen gesture lesson of the prelude (a soft dim, a hand that grabs a raider and flings it up),
 * the pointer at the Rolling Wheel after the first throw, and the arrow to the pot when a level wave
 * has a King hint. The timing comes from `tutorialGuide.ts`.
 */
import Phaser from 'phaser';
import { KING_ART } from '../art/king';
import { ENEMIES } from '../config/enemies';
import { WORLD } from '../config/field';
import { SLOTS } from '../config/slots';
import { levelOf } from '../config/worlds';
import { PRELUDE_LINES, TUTORIAL_HINTS } from '../config/worlds/fondue/story';
import { HostSession, type Session } from '../game/session';
import { PRELUDE_WHEEL_SLOT } from '../modes/tutorial';
import type { ViewEnemy, ViewState } from '../net/snapshot';
import type { Meta, SimEvent } from '../sim/types';
import type { CamRect } from './camera';
import { propKey, TEX_SCALE } from './textures';
import { PotHint, PreludeGuide, type GuideEnemy } from './tutorialGuide';
import type { GameView } from './viewport';

const FONT = 'Nunito';
const INK = 0x2b2118;
const PAPER = 0xfff6df;
const HAND_TINT = 0xfff1d0;
const DIM_KEY = 'fx:tutorialDim';
const DIM_ALPHA = 0.58;
/** The dim texture: transparent in the middle, fully dim from DIM_OUTER outward (fractions of its size). */
const DIM_SIZE = 512;
const DIM_INNER = 0.1;
const DIM_OUTER = 0.3;
/** World units of the clear hole around the raider. */
const HOLE = 115;
/** One loop of the gesture animation in seconds. */
const LOOP = 2.1;
/** Where the King stands: in front of the gate, on the road. */
const KING_X = 262;
const KING_FOOT = WORLD.groundY + 50;
const KING_OFF = -110;

const ease = (k: number) => k * k * (3 - 2 * k);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

function dimCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = DIM_SIZE;
  const g = c.getContext('2d')!;
  const h = DIM_SIZE / 2;
  const grad = g.createRadialGradient(h, h, DIM_SIZE * DIM_INNER, h, h, DIM_SIZE * DIM_OUTER);
  grad.addColorStop(0, 'rgba(28,20,16,0)');
  grad.addColorStop(1, `rgba(28,20,16,${DIM_ALPHA})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, DIM_SIZE, DIM_SIZE);
  return c;
}

export class TutorialView {
  private king: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Container;
  private bubbleGfx: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private caption: Phaser.GameObjects.Text;
  private dim: Phaser.GameObjects.Image;
  private dimEdges: Phaser.GameObjects.Graphics;
  private hand: Phaser.GameObjects.Image;
  private gfx: Phaser.GameObjects.Graphics;
  private prelude: PreludeGuide | null = null;
  private pot: PotHint | null = null;
  private runId = '';
  private potWave = -1;
  private dimK = 0;
  private loopT = 0;
  private kingT = 0;
  private shownLine = '';
  /** World units per CSS pixel: texts and the King grow on small screens. */
  private unit = 1;
  private holding = false;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(DIM_KEY)) scene.textures.addCanvas(DIM_KEY, dimCanvas());
    // The art's pivot is at its feet.
    const { king } = KING_ART;
    this.king = scene.add.image(KING_OFF, KING_FOOT, propKey('king')).setOrigin(king.px / king.w, king.py / king.h).setDepth(19.6).setVisible(false);
    this.bubbleGfx = scene.add.graphics();
    this.bubbleText = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontStyle: '800', fontSize: '26px', color: '#2b2118', align: 'left', wordWrap: { width: 300 },
    }).setOrigin(0, 0);
    this.bubble = scene.add.container(0, 0, [this.bubbleGfx, this.bubbleText]).setDepth(96).setVisible(false);
    this.caption = scene.add.text(0, 0, '', {
      fontFamily: 'Lilita One', fontSize: '30px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 7, align: 'center',
    }).setOrigin(0.5, 1).setDepth(102).setVisible(false);
    this.dim = scene.add.image(0, 0, DIM_KEY).setDepth(88).setVisible(false);
    this.dimEdges = scene.add.graphics().setDepth(88).setVisible(false);
    this.gfx = scene.add.graphics().setDepth(100);
    this.hand = scene.add.image(0, 0, propKey('handOpen')).setScale(1 / TEX_SCALE).setDepth(101).setTint(HAND_TINT).setVisible(false);
  }

  reset() {
    this.prelude = null;
    this.pot = null;
    this.runId = '';
    this.potWave = -1;
    this.dimK = 0;
    this.holding = false;
    this.hideAll();
  }

  private hideAll() {
    for (const o of [this.king, this.bubble, this.caption, this.dim, this.dimEdges, this.hand]) o.setVisible(false);
    this.gfx.clear();
  }

  /** Test hook: the stage of the prelude lesson ('intro', 'show', 'try', 'praise', 'wheel', 'wheelDone'), 'pot' for a level hint, or ''. */
  stage(): string {
    if (this.prelude && this.prelude.stage !== 'done') return this.prelude.stage;
    if (this.pot && !this.pot.over) return 'pot';
    return '';
  }

  /** Called every frame by the scene, after the events were handled. */
  update(s: Session, view: ViewState, meta: Meta | null, events: SimEvent[], dt: number, gv: GameView, cam: CamRect) {
    this.unit = 1 / Math.max(0.2, gv.cssPerUnit);
    if (!meta) { this.hideAll(); return; }
    if (meta.rules.runId !== this.runId) {
      this.runId = meta.rules.runId;
      this.prelude = meta.rules.mode === 'tutorial' ? new PreludeGuide(PRELUDE_LINES, TUTORIAL_HINTS.wellDone, TUTORIAL_HINTS, PRELUDE_WHEEL_SLOT) : null;
      this.pot = null;
      this.potWave = -1;
    }
    this.watchPotHint(view, meta);
    const battle = view.phase === 'battle';
    const enemies: GuideEnemy[] = view.enemies;
    // The King already walks in while the (hidden) level banner runs.
    this.prelude?.update({ dt, battle: battle || view.phase === 'banner', enemies, events, me: s.me, fieldW: meta.fieldW });
    if (this.pot && battle) this.pot.update(dt, events);
    this.setHold(s, !!this.prelude?.hold);

    this.loopT = (this.loopT + dt) % LOOP;
    this.gfx.clear();
    this.drawKing(dt, cam);
    this.drawGesture(view, dt, cam);
    this.drawWheelPointer(cam);
    this.drawPotArrow(view, s.me);
  }

  /** A level hint belongs to the wave it names; it shows once per such wave. */
  private watchPotHint(view: ViewState, meta: Meta) {
    if (meta.rules.level === null || view.phase !== 'battle' || this.potWave === view.wave) return;
    const lv = levelOf(meta.rules.world, meta.rules.level);
    const hint = lv?.hints.find((h) => h.wave === view.wave);
    if (!hint) return;
    this.potWave = view.wave;
    this.pot = new PotHint(hint.text);
  }

  private setHold(s: Session, hold: boolean) {
    if (hold === this.holding) return;
    this.holding = hold;
    if (s instanceof HostSession) s.sim.setHold(hold);
  }

  // ---------------------------------------------------------------------------------------------

  private drawKing(dt: number, cam: CamRect) {
    const p = this.prelude && this.prelude.stage !== 'done' ? this.prelude : this.pot && !this.pot.over ? this.pot : null;
    const k = p ? p.kingIn() : 0;
    const line = p ? p.kingLine() : null;
    if (k <= 0) { this.king.setVisible(false); this.bubble.setVisible(false); return; }
    this.kingT += dt;
    const scale = clamp(0.62 * this.unit, 1, 1.35);
    const walking = k < 1;
    const x = KING_OFF + (KING_X + (scale - 1) * 40 - KING_OFF) * ease(k);
    // A waddle while he walks, a gentle bob while he talks.
    const bob = walking ? Math.abs(Math.sin(this.kingT * 9)) * -6 : Math.sin(this.kingT * 3) * 1.5;
    const tilt = walking ? Math.sin(this.kingT * 9) * 0.06 : 0;
    const talking = !!line && Math.sin(this.kingT * 14) > -0.2;
    this.king.setTexture(propKey(talking ? 'kingTalk' : 'king'));
    this.king.setVisible(true).setPosition(x, KING_FOOT + bob).setRotation(tilt).setScale(scale / TEX_SCALE);
    if (!line) { this.bubble.setVisible(false); this.shownLine = ''; return; }
    // During a pot hint the bubble floats above the pot, so that it does not hide it.
    const head = KING_FOOT - 160 * scale;
    this.drawBubble(line, x, p === this.pot ? Math.min(head, WORLD.cauldron.rimY - 60) : head, cam);
  }

  private drawBubble(text: string, kingX: number, headTopY: number, cam: CamRect) {
    const font = clamp(16 * this.unit, 22, 40);
    const pad = font * 0.55;
    if (text !== this.shownLine) {
      this.shownLine = text;
      this.bubbleText.setFontSize(font).setWordWrapWidth(clamp(230 * this.unit, 300, 560)).setText(text);
      this.bubble.setScale(0.6);
    }
    const w = this.bubbleText.width + pad * 2;
    const h = this.bubbleText.height + pad * 2;
    const tail = font * 0.9;
    let left = kingX - 10;
    left = Math.min(left, cam.x + cam.w - w - 12);
    const top = Math.max(cam.y + 12, headTopY - h - tail * 0.6);
    const g = this.bubbleGfx;
    g.clear();
    const tx = kingX + 14 - left;
    const r = font * 0.7;
    g.fillStyle(INK, 1);
    g.fillRoundedRect(-4, -4, w + 8, h + 8, r + 4);
    g.fillTriangle(tx - 14, h - 2, tx + 14, h - 2, tx - 6, h + tail + 4);
    g.fillStyle(PAPER, 1);
    g.fillRoundedRect(0, 0, w, h, r);
    g.fillTriangle(tx - 9, h - 4, tx + 9, h - 4, tx - 4, h + tail - 2);
    this.bubbleText.setPosition(pad, pad);
    // A small pop when a new line starts.
    const sc = this.bubble.scale + (1 - this.bubble.scale) * 0.3;
    this.bubble.setVisible(true).setScale(sc).setPosition(left + (1 - sc) * tx, top + (1 - sc) * h);
  }

  // ---------------------------------------------------------------------------------------------

  /** The frozen lesson: a dim with a clear hole around the raider and a hand that shows the fling. */
  private drawGesture(view: ViewState, dt: number, cam: CamRect) {
    const g = this.prelude;
    const show = !!g && g.stage === 'show';
    const target = show ? view.enemies.find((e) => e.id === g.target) : undefined;
    this.dimK = clamp(this.dimK + (target ? dt : -dt) / 0.3, 0, 1);
    const caption = g?.caption() ?? null;
    if (!target && this.dimK <= 0) {
      this.dim.setVisible(false); this.dimEdges.setVisible(false); this.hand.setVisible(false);
    }
    const anchor = target ?? (g ? view.enemies.find((e) => e.heldBy.length > 0) : undefined);
    if (caption && anchor) {
      const c = centre(anchor);
      const font = clamp(18 * this.unit, 28, 46);
      this.caption.setVisible(true).setFontSize(font).setText(caption)
        .setPosition(clamp(c.x, cam.x + 260 * Math.min(2, this.unit), cam.x + cam.w - 260 * Math.min(2, this.unit)), Math.max(cam.y + font * 2.2, c.y - 250));
    } else {
      this.caption.setVisible(false);
    }
    if (!target) return;
    const c = centre(target);
    this.drawDim(c.x, c.y, cam);

    // One loop: reach in, press, drag up, let go, fade out.
    const p = this.loopT / LOOP;
    const handScale = clamp(0.75 * this.unit, 1, 1.6);
    const up = 210;
    const reach = seg(p, 0, 0.18);
    const drag = ease(seg(p, 0.3, 0.62));
    const fly = seg(p, 0.62, 0.74);
    // The hand grips the raider a little below its middle, so the raider stays in sight.
    let x = c.x + 18 + 70 * (1 - ease(reach));
    let y = c.y + 34 + 70 * (1 - ease(reach));
    x += 55 * drag + 20 * fly;
    y -= up * drag + 45 * fly;
    const closed = p >= 0.18 && p < 0.62;
    const alpha = p < 0.18 ? reach : p > 0.78 ? 1 - seg(p, 0.78, 0.95) : 1;
    this.hand.setVisible(alpha > 0.01).setTexture(propKey(closed ? 'handClosed' : 'handOpen'))
      .setPosition(x, y).setScale(handScale / TEX_SCALE).setAlpha(alpha * this.dimK);

    const gfx = this.gfx;
    // A ring where the finger presses.
    if (p >= 0.16 && p < 0.5) {
      const k = seg(p, 0.16, 0.5);
      gfx.lineStyle(5, PAPER, (1 - k) * this.dimK);
      gfx.strokeCircle(c.x, c.y, 26 + k * 46);
    }
    // The path of the swipe: dots up to an arrow head, always on show.
    const pulse = 0.65 + 0.35 * Math.sin(this.loopT * Math.PI * 2 / LOOP * 2);
    const x0 = c.x + 10, y0 = c.y - 40, x1 = c.x + 70, y1 = c.y - up - 40;
    const mx = c.x + 80, my = c.y - up * 0.45;
    for (let i = 0; i <= 7; i++) {
      const t = i / 8;
      const qx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
      const qy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
      gfx.fillStyle(INK, 0.55 * this.dimK * pulse);
      gfx.fillCircle(qx, qy, 8 * this.dot());
      gfx.fillStyle(PAPER, this.dimK * pulse);
      gfx.fillCircle(qx, qy, 5.5 * this.dot());
    }
    arrowHead(gfx, x1, y1, Math.atan2(y1 - my, x1 - mx), 26 * this.dot(), this.dimK * pulse);
  }

  /** Dots and arrow heads grow on small screens, like the texts. */
  private dot(): number { return clamp(0.75 * this.unit, 1, 1.8); }

  private drawDim(x: number, y: number, cam: CamRect) {
    const size = (HOLE / (DIM_SIZE * DIM_INNER)) * DIM_SIZE;
    const a = this.dimK;
    this.dim.setVisible(true).setPosition(x, y).setDisplaySize(size, size).setAlpha(a);
    // Outside the texture the dim simply goes on, in four plain bands.
    const e = this.dimEdges;
    e.clear().setVisible(true);
    e.fillStyle(0x1c1410, DIM_ALPHA * a);
    const L = cam.x - 50, T = cam.y - 50, R = cam.x + cam.w + 50, B = cam.y + cam.h + 50;
    const l = x - size / 2, t = y - size / 2, r = x + size / 2, b = y + size / 2;
    if (t > T) e.fillRect(L, T, R - L, t - T);
    if (b < B) e.fillRect(L, b, R - L, B - b);
    if (l > L) e.fillRect(L, Math.max(T, t), l - L, Math.min(B, b) - Math.max(T, t));
    if (r < R) e.fillRect(r, Math.max(T, t), R - r, Math.min(B, b) - Math.max(T, t));
  }

  // ---------------------------------------------------------------------------------------------

  /** The wheel lesson: a pulsing ring around the wheel on the wall and an arrow that bobs toward it. */
  private drawWheelPointer(cam: CamRect) {
    if (!this.prelude?.pointWheel) return;
    const slot = SLOTS[PRELUDE_WHEEL_SLOT];
    const t = this.prelude.t;
    const a = Math.min(1, t / 0.4);
    const pulse = (t * 1.6) % 1;
    const gfx = this.gfx;
    const r = 62 * this.dot();
    gfx.lineStyle(7, INK, 0.5 * a);
    gfx.strokeCircle(slot.x, slot.y, r);
    gfx.lineStyle(4, PAPER, a);
    gfx.strokeCircle(slot.x, slot.y, r);
    gfx.lineStyle(4, PAPER, a * (1 - pulse));
    gfx.strokeCircle(slot.x, slot.y, r + pulse * 40 * this.dot());
    // The arrow comes from up right and points down left at the wheel; it stays inside the view.
    const bob = Math.sin(t * 6) * 10 * this.dot();
    const d = r + 18 * this.dot() + bob;
    const ang = Math.PI * 0.75;
    const tipX = Math.max(cam.x + 30, slot.x - Math.cos(ang) * d * 0.7);
    const tipY = slot.y - Math.sin(ang) * d * 0.7;
    const len = 70 * this.dot();
    const tailX = tipX + Math.cos(-Math.PI / 4) * len;
    const tailY = tipY - Math.sin(Math.PI / 4) * len;
    gfx.lineStyle(14 * this.dot(), INK, 0.55 * a);
    gfx.lineBetween(tailX, tailY, tipX + 6, tipY - 6);
    gfx.lineStyle(8 * this.dot(), PAPER, a);
    gfx.lineBetween(tailX, tailY, tipX + 6, tipY - 6);
    arrowHead(gfx, tipX, tipY, Math.atan2(tipY - tailY, tipX - tailX), 30 * this.dot(), a);
  }

  /** A level hint: a dotted arc from the raider in my hand (or the nearest one) into the pot. */
  private drawPotArrow(view: ViewState, me: number) {
    const hint = this.pot;
    if (!hint || !hint.arrow || view.phase !== 'battle') return;
    const held = view.enemies.find((e) => e.heldBy.includes(me));
    const from = held ?? nearestToGate(view.enemies);
    const { x: px, rimY } = WORLD.cauldron;
    const a = Math.min(1, hint.t / 0.4) * (0.75 + 0.25 * Math.sin(hint.t * 5));
    const gfx = this.gfx;
    // A ring over the pot says where.
    gfx.lineStyle(6, INK, 0.5 * a);
    gfx.strokeEllipse(px, rimY - 4, 120, 44);
    gfx.lineStyle(3.5, PAPER, a);
    gfx.strokeEllipse(px, rimY - 4, 120, 44);
    if (!from) return;
    const c = centre(from);
    const x0 = c.x - 20, y0 = c.y - 30, x1 = px + 12, y1 = rimY - 34;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 170;
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = (i + ((hint.t * 1.4) % 1)) / n;
      const qx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
      const qy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
      gfx.fillStyle(INK, 0.6 * a);
      gfx.fillCircle(qx, qy, 8 * this.dot());
      gfx.fillStyle(PAPER, a);
      gfx.fillCircle(qx, qy, 5.5 * this.dot());
    }
    arrowHead(gfx, x1, y1, Math.atan2(y1 - (my + y1) / 2, x1 - (mx + x1) / 2), 26 * this.dot(), a);
  }
}

/** Middle of a raider's body in world units. */
function centre(e: ViewEnemy): { x: number; y: number } {
  return { x: e.x, y: e.y - ENEMIES[e.type].height * 0.55 };
}

function nearestToGate(list: ViewEnemy[]): ViewEnemy | undefined {
  let best: ViewEnemy | undefined;
  for (const e of list) if (!e.hidden && (e.st === 'walk' || e.st === 'attack') && (!best || e.x < best.x)) best = e;
  return best;
}

function arrowHead(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, size: number, alpha: number) {
  const pt = (a: number, r: number) => ({ x: x + Math.cos(ang + a) * r, y: y + Math.sin(ang + a) * r });
  const tip = pt(0, size * 0.6);
  const l = pt(2.5, size);
  const r = pt(-2.5, size);
  g.fillStyle(INK, 0.6 * alpha);
  g.fillTriangle(tip.x + 2, tip.y + 2, l.x + 2, l.y + 2, r.x + 2, r.y + 2);
  g.fillStyle(PAPER, alpha);
  g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
}
