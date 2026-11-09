import { WORLD } from '../config/world';

interface Sample { t: number; x: number; y: number; }

const HISTORY = 64;

/**
 * Records the pointer at full event rate. The release velocity comes from these raw samples, not
 * from game frames, so a fast flick is measured the same on any machine or network.
 */
export class PointerTracker {
  x = WORLD.width / 2;
  y = WORLD.height / 2;
  private samples: Sample[] = [];

  /** Adds a sample in world coordinates. */
  add(t: number, x: number, y: number) {
    this.x = x;
    this.y = y;
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
      const w = (1 - age) * (1 - age) * dt + 1e-6;
      vx += ((s[i].x - s[i - 1].x) / dt) * w;
      vy += ((s[i].y - s[i - 1].y) / dt) * w;
      sumW += w;
    }
    if (sumW === 0) return { vx: 0, vy: 0 };
    return { vx: vx / sumW, vy: vy / sumW };
  }
}

export interface PointerHandlers {
  onMove(tracker: PointerTracker): void;
  /** Return true if the press was consumed by a HUD element. */
  onDown(x: number, y: number, tracker: PointerTracker): boolean;
  onUp(x: number, y: number, vx: number, vy: number): void;
  windowMs(): number;
}

/** Binds pointer events on the game canvas. Mouse and touch both arrive here. */
export function bindPointer(canvas: HTMLCanvasElement, h: PointerHandlers): { tracker: PointerTracker; dispose(): void } {
  const tracker = new PointerTracker();
  let hudPress = false;
  let activeId: number | null = null;

  const toWorld = (ev: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * WORLD.width,
      y: ((ev.clientY - r.top) / r.height) * WORLD.height,
    };
  };

  const onMove = (ev: PointerEvent) => {
    if (activeId !== null && ev.pointerId !== activeId) return;
    const list = ev.getCoalescedEvents?.() ?? [];
    for (const c of list.length > 0 ? list : [ev]) {
      const p = toWorld(c);
      tracker.add(c.timeStamp, p.x, p.y);
    }
    h.onMove(tracker);
  };

  const onDown = (ev: PointerEvent) => {
    // Only the primary button plays; the right button is reserved for cancelling.
    if (activeId !== null || ev.button !== 0) return;
    activeId = ev.pointerId;
    canvas.setPointerCapture(ev.pointerId);
    const p = toWorld(ev);
    tracker.clear();
    tracker.add(ev.timeStamp, p.x, p.y);
    h.onMove(tracker);
    hudPress = h.onDown(p.x, p.y, tracker);
    ev.preventDefault();
  };

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== activeId) return;
    activeId = null;
    const p = toWorld(ev);
    tracker.addRelease(ev.timeStamp, p.x, p.y);
    if (hudPress) { hudPress = false; return; }
    const v = tracker.velocity(ev.timeStamp, h.windowMs());
    h.onUp(p.x, p.y, v.vx, v.vy);
  };

  const opts: AddEventListenerOptions = { passive: false };
  canvas.addEventListener('pointermove', onMove, opts);
  canvas.addEventListener('pointerdown', onDown, opts);
  canvas.addEventListener('pointerup', onUp, opts);
  canvas.addEventListener('pointercancel', onUp, opts);
  canvas.style.touchAction = 'none';

  return {
    tracker,
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
