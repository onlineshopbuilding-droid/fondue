// The guest's playout buffer: snapshots are placed on the host's own game clock (their tick), not on the
// moment they happened to arrive, and the picture is drawn a short, self-adjusting delay behind the host.
import { TICK_RATE } from '../config/field';
import { interpolateViews, type ViewState } from './snapshot';

/** The picture never runs behind the host by less than this, nor by more than the maximum. */
export const PLAYOUT_MIN_MS = 50;
export const PLAYOUT_MAX_MS = 250;
/** Added on top of the snapshot spacing and the measured jitter. */
const PLAYOUT_MARGIN_MS = 10;
/** When the next snapshot is late, positions are carried forward at most this far, then held. */
export const EXTRAPOLATE_MAX_MS = 100;
/** Arrivals over this window decide how early a snapshot can arrive (the base latency) and the jitter. */
const WINDOW_MS = 1000;
/** A snapshot this much later than the clock expects means the host stood still (pause, freeze): start over. */
const RESYNC_MS = 250;
/** How quickly the drawn time catches up with where it should be (time constant). */
const CATCH_UP_MS = 250;
const MAX_ENTRIES = 60;

const tickMs = 1000 / TICK_RATE;

interface Entry { hostMs: number; view: ViewState }

const quantile = (list: number[], p: number) => {
  if (list.length === 0) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/**
 * Turns snapshots that arrive unevenly (jitter, bunches after a slow host frame, a retransmit holding
 * up the ones behind it) into an even picture: raiders move at their true speed on the guest.
 */
export class PlayoutBuffer {
  private entries: Entry[] = [];
  /** Recent arrivals: local time and how far behind the host clock they came in. */
  private arrivals: { at: number; lag: number }[] = [];
  /** Smallest lag in the window: the host clock as it reads on this machine. */
  private baseLag: number | null = null;
  /** The host time that is drawn now. */
  private renderMs: number | null = null;
  private lastNow = 0;
  /** Current delay behind the host. */
  delayMs = 100;

  reset() {
    this.entries = [];
    this.arrivals = [];
    this.baseLag = null;
    this.renderMs = null;
  }

  /** The newest snapshot heard. */
  newest(): ViewState | null { return this.entries[this.entries.length - 1]?.view ?? null; }

  push(view: ViewState, now: number) {
    const hostMs = view.tick * tickMs;
    const last = this.entries[this.entries.length - 1];
    // A new run starts its clock at zero again.
    if (last && hostMs < last.hostMs) this.reset();
    const lag = now - hostMs;
    if (this.baseLag !== null && lag - this.baseLag > RESYNC_MS + this.delayMs) {
      // The host's clock stood still (pause, hold, a frozen tab): measure the link anew from here.
      this.arrivals = [];
      this.baseLag = null;
    }
    this.arrivals.push({ at: now, lag });
    while (this.arrivals.length > 1 && now - this.arrivals[0].at > WINDOW_MS) this.arrivals.shift();
    const lags = this.arrivals.map((a) => a.lag);
    this.baseLag = Math.min(...lags);
    const jitter = quantile(lags.map((l) => l - this.baseLag!), 0.9);
    const spacing = this.spacing();
    this.delayMs = Math.max(PLAYOUT_MIN_MS, Math.min(PLAYOUT_MAX_MS, spacing + jitter + PLAYOUT_MARGIN_MS));

    // A paused host sends the same tick again: keep its newest content.
    if (last && hostMs === last.hostMs) last.view = view;
    else this.entries.push({ hostMs, view });
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
  }

  /** Typical host time between two snapshots. */
  private spacing(): number {
    const e = this.entries;
    if (e.length < 2) return 2 * tickMs;
    const gaps: number[] = [];
    for (let i = Math.max(1, e.length - 10); i < e.length; i++) gaps.push(e[i].hostMs - e[i - 1].hostMs);
    return quantile(gaps, 0.5);
  }

  /** The picture to draw at this local time. */
  sample(now: number): ViewState | null {
    const e = this.entries;
    if (e.length === 0 || this.baseLag === null) return null;
    const dt = this.renderMs === null ? 0 : Math.max(0, Math.min(250, now - this.lastNow));
    this.lastNow = now;
    const target = now - this.baseLag - this.delayMs;
    if (this.renderMs === null || Math.abs(target - this.renderMs) > RESYNC_MS + PLAYOUT_MAX_MS) {
      this.renderMs = target;
    } else {
      // Runs at real speed and eases toward where it should be; it never runs backwards.
      const ease = (target - this.renderMs) * Math.min(1, dt / CATCH_UP_MS);
      this.renderMs += Math.max(0, dt + ease);
    }
    // Never further ahead of the newest snapshot than extrapolation allows, so it does not race on afterwards.
    const newest = e[e.length - 1];
    if (this.renderMs > newest.hostMs + EXTRAPOLATE_MAX_MS) this.renderMs = newest.hostMs + EXTRAPOLATE_MAX_MS;
    const at = this.renderMs;
    // Drop what is behind the drawn time, keeping one entry before it.
    while (e.length > 2 && e[1].hostMs <= at) e.shift();

    if (at <= e[0].hostMs || e.length === 1) return e[0].view;
    for (let i = 1; i < e.length; i++) {
      if (e[i].hostMs >= at) {
        const a = e[i - 1];
        const b = e[i];
        return interpolateViews(a.view, b.view, (at - a.hostMs) / (b.hostMs - a.hostMs));
      }
    }
    // The next snapshot is late: carry the last movement forward a little.
    const a = e[e.length - 2];
    const b = newest;
    if (b.view.paused || b.view.hold || b.hostMs === a.hostMs) return b.view;
    return interpolateViews(a.view, b.view, 1 + (at - b.hostMs) / (b.hostMs - a.hostMs));
  }
}
