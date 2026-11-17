// Pointer input of the field: records every pointer event with its time stamp and works out the release
// velocity of a throw from those raw samples. Free of Phaser; src/render/scene.ts binds it to the canvas (`bindPointer`).
import { WORLD } from '../config/field';

interface Sample { t: number; x: number; y: number; }

const HISTORY = 64;

/**
 * Records the pointer at full event rate. The release velocity comes from these raw samples, not
 * from game frames, so a fast flick is measured the same on any machine or network.
 */
export class PointerTracker {
  x = WORLD.width / 2;
  y = WORLD.height / 2;
  /**
   * The last pointer event came from a finger, which leaves no cursor behind. Decided per event, not
   * per device: a laptop with a touch screen switches back and forth.
   */
  touch = false;
  pressed = false;
  /** Time stamp of the newest sample, in ms on the event clock. */
  lastT = 0;
  private samples: Sample[] = [];

  /** Adds a sample in world coordinates. */
  add(t: number, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.lastT = t;
    this.samples.push({ t, x, y });
    if (this.samples.length > HISTORY) this.samples.shift();
  }

  clear() { this.samples = []; }

  /** The release point. A repeat of the last position would read as a sudden stop, so it is skipped. */
  addRelease(t: number, x: number, y: number) {
    const last = this.samples[this.samples.length - 1];
    if (last && last.x === x && last.y === y) return;
    this.add(t, x, y);
  }

  /** Weighted velocity over the last windowMs, in world px/s. Recent segments count more. */
  velocity(now: number, windowMs: number): { vx: number; vy: number } {
    const s = this.samples.filter((p) => now - p.t <= windowMs);
    if (s.length < 2) return { vx: 0, vy: 0 };
    let sumW = 0;
    let vx = 0;
    let vy = 0;
    for (let i = 1; i < s.length; i++) {
      const dt = (s[i].t - s[i - 1].t) / 1000;
      if (dt <= 0) continue;
      const age = (now - s[i].t) / windowMs;
      const w = (1 - age) * dt + 1e-6;
      vx += ((s[i].x - s[i - 1].x) / dt) * w;
      vy += ((s[i].y - s[i - 1].y) / dt) * w;
      sumW += w;
    }
    if (sumW === 0) return { vx: 0, vy: 0 };
    return { vx: vx / sumW, vy: vy / sumW };
  }
}

/** The minimum of a pointer event the routing needs (a real PointerEvent fits). */
export interface RawPointer {
  pointerId: number;
  pointerType: string;
  /** Button that changed (0 left, 2 right, -1 none). */
  button: number;
  /** Buttons held now, as a bit mask (1 left, 2 right). */
  buttons: number;
}

/** What a pointer event means for the two hands: hand 0 is the first, hand 1 the second (C9). */
export type HandAction = { hand: 0 | 1; act: 'down' | 'move' | 'up' };

/**
 * Decides which hand a pointer event belongs to. Pure, so it is unit tested.
 * - The first finger (or the left mouse button) is the first hand.
 * - A second finger at the same time is the second hand; a third does nothing.
 * - On a laptop with the developer switch (`mouseSecond`), the right mouse button is the second
 *   hand: alone it grabs where the mouse is; pressed while the left button holds, both hands grab
 *   at the mouse and follow it together.
 */
export class PointerRouter {
  private first: number | null = null;
  private second: number | null = null;
  /** The second hand is the right mouse button of the same mouse pointer. */
  private mouseChord = false;

  constructor(private mouseSecond: () => boolean = () => false) {}

  get firstDown() { return this.first !== null; }
  get secondDown() { return this.second !== null || this.mouseChord; }

  down(ev: RawPointer): HandAction[] {
    const mouse = ev.pointerType === 'mouse';
    if (mouse && ev.button === 2) {
      if (!this.mouseSecond() || this.secondDown) return [];
      this.second = ev.pointerId;
      return [{ hand: 1, act: 'down' }];
    }
    if (mouse && ev.button !== 0) return [];
    if (this.first === null && this.second !== ev.pointerId) { this.first = ev.pointerId; return [{ hand: 0, act: 'down' }]; }
    if (!mouse && this.second === null && ev.pointerId !== this.first) { this.second = ev.pointerId; return [{ hand: 1, act: 'down' }]; }
    return [];
  }

  move(ev: RawPointer): HandAction[] {
    const out: HandAction[] = [];
    if (ev.pointerType === 'mouse') {
      // Chorded buttons only send moves: the right button joins or leaves the held left one,
      // or the left one is let go while the right one still holds.
      if (ev.button === 2 && this.first === ev.pointerId && this.mouseSecond()) {
        if ((ev.buttons & 2) && !this.secondDown) { this.mouseChord = true; out.push({ hand: 1, act: 'down' }); }
        else if (!(ev.buttons & 2) && this.mouseChord) { this.mouseChord = false; out.push({ hand: 1, act: 'up' }); }
      }
      if (ev.button === 0 && !(ev.buttons & 1) && this.first === ev.pointerId) {
        this.first = null;
        out.push({ hand: 0, act: 'up' });
        if (this.mouseChord) { this.mouseChord = false; this.second = ev.pointerId; }
      }
    }
    if (this.first === null || this.first === ev.pointerId) {
      // A second finger moving alone does not move the first hand.
      if (!(this.first === null && this.second === ev.pointerId && ev.pointerType !== 'mouse')) out.push({ hand: 0, act: 'move' });
    }
    if (this.second === ev.pointerId || (this.mouseChord && this.first === ev.pointerId)) out.push({ hand: 1, act: 'move' });
    return out;
  }

  up(ev: RawPointer): HandAction[] {
    const out: HandAction[] = [];
    if (this.first === ev.pointerId) {
      this.first = null;
      out.push({ hand: 0, act: 'up' });
      if (this.mouseChord) { this.mouseChord = false; out.push({ hand: 1, act: 'up' }); }
    }
    if (this.second === ev.pointerId) { this.second = null; out.push({ hand: 1, act: 'up' }); }
    return out;
  }
}


export interface PointerHandlers {
  onMove(tracker: PointerTracker): void;
  /** Return true if the press was consumed by a HUD element. */
  onDown(x: number, y: number, tracker: PointerTracker): boolean;
  onUp(x: number, y: number, vx: number, vy: number): void;
  /** The second hand (C9): a second finger, or the right mouse button with the developer switch. Return true if consumed. */
  onDown2?(x: number, y: number): boolean;
  onMove2?(tracker: PointerTracker): void;
  onUp2?(x: number, y: number, vx: number, vy: number): void;
  /** The developer switch: the right mouse button works the second hand. */
  mouseSecond?(): boolean;
  windowMs(): number;
  /** The part of the world the canvas shows. */
  view(): { width: number; height: number; offsetX: number; offsetY: number };
}

const GESTURES = ['gesturestart', 'gesturechange', 'gestureend'];

/**
 * Binds pointer events on the game canvas. Mouse and touch both arrive here. Two fingers at once
 * never zoom or scroll the page: the canvas takes no browser gestures (touch-action none, touch
 * defaults stopped, and the iOS gesture events stopped too).
 */
export function bindPointer(canvas: HTMLCanvasElement, h: PointerHandlers): { tracker: PointerTracker; tracker2: PointerTracker; dispose(): void } {
  const trackers = [new PointerTracker(), new PointerTracker()];
  const [tracker, tracker2] = trackers;
  const hudPress = [false, false];
  const router = new PointerRouter(() => h.mouseSecond?.() ?? false);

  const toWorld = (ev: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    const v = h.view();
    return {
      x: v.offsetX + ((ev.clientX - r.left) / r.width) * v.width,
      y: v.offsetY + ((ev.clientY - r.top) / r.height) * v.height,
    };
  };

  const press = (hand: 0 | 1, ev: PointerEvent) => {
    const t = trackers[hand];
    t.touch = ev.pointerType === 'touch';
    t.pressed = true;
    const p = toWorld(ev);
    t.clear();
    t.add(ev.timeStamp, p.x, p.y);
    if (hand === 0) {
      h.onMove(t);
      hudPress[0] = h.onDown(p.x, p.y, t);
    } else {
      h.onMove2?.(t);
      hudPress[1] = h.onDown2?.(p.x, p.y) ?? true;
    }
  };

  const lift = (hand: 0 | 1, ev: PointerEvent) => {
    const t = trackers[hand];
    t.pressed = false;
    const p = toWorld(ev);
    t.addRelease(ev.timeStamp, p.x, p.y);
    if (hudPress[hand]) { hudPress[hand] = false; return; }
    const v = t.velocity(ev.timeStamp, h.windowMs());
    if (hand === 0) h.onUp(p.x, p.y, v.vx, v.vy);
    else h.onUp2?.(p.x, p.y, v.vx, v.vy);
  };

  const follow = (hand: 0 | 1, ev: PointerEvent) => {
    const t = trackers[hand];
    t.touch = ev.pointerType === 'touch';
    const list = ev.getCoalescedEvents?.() ?? [];
    // Every sample is handed on, not only the newest: when frames are slow the browser bundles
    // several moves into one event, and a shake read from the newest alone loses its turning points.
    for (const c of list.length > 0 ? list : [ev]) {
      const p = toWorld(c);
      t.add(c.timeStamp, p.x, p.y);
      if (hand === 0) h.onMove(t); else h.onMove2?.(t);
    }
  };

  const apply = (acts: HandAction[], ev: PointerEvent) => {
    for (const a of acts) {
      if (a.act === 'down') press(a.hand, ev);
      else if (a.act === 'up') lift(a.hand, ev);
      else follow(a.hand, ev);
    }
  };

  const onMove = (ev: PointerEvent) => apply(router.move(ev), ev);
  const onDown = (ev: PointerEvent) => {
    ev.preventDefault();
    const acts = router.down(ev);
    if (acts.length === 0) return;
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* a synthetic pointer may not be capturable */ }
    apply(acts, ev);
  };
  const onUp = (ev: PointerEvent) => apply(router.up(ev), ev);
  const noGesture = (ev: Event) => ev.preventDefault();
  const noTouchDefault = (ev: TouchEvent) => { if (ev.cancelable) ev.preventDefault(); };

  const opts: AddEventListenerOptions = { passive: false };
  canvas.addEventListener('pointermove', onMove, opts);
  canvas.addEventListener('pointerdown', onDown, opts);
  canvas.addEventListener('pointerup', onUp, opts);
  canvas.addEventListener('pointercancel', onUp, opts);
  canvas.addEventListener('touchstart', noTouchDefault, opts);
  canvas.addEventListener('touchmove', noTouchDefault, opts);
  for (const g of GESTURES) document.addEventListener(g, noGesture, opts);
  canvas.style.touchAction = 'none';

  return {
    tracker,
    tracker2,
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('touchstart', noTouchDefault);
      canvas.removeEventListener('touchmove', noTouchDefault);
      for (const g of GESTURES) document.removeEventListener(g, noGesture);
    },
  };
}
