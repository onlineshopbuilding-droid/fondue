// The simple "New enemy" window: a raider's picture, name and how to beat it, the first time this profile meets it.
// One window at a time, gone with a tap (or after a while); the game keeps running underneath.
import type { EnemyType } from '../config/enemies';
import { ENEMY_POPUPS } from '../config/worlds/fondue/story';
import { esc, rigUri } from './html';

/** Seconds a window stays if nobody taps it. */
const SHOW_MS = 9000;

export class EnemyPopup {
  private el: HTMLDivElement | null = null;
  private queue: EnemyType[] = [];
  private timer = 0;
  /**
   * How long a window stays without a tap, in real time. Tests stretch it: on a machine that draws
   * slowly a test step can take longer than a player needs to read.
   */
  showMs = SHOW_MS;

  constructor(private root: HTMLElement) {}

  /** True while a window is on screen (for tests). */
  get open(): boolean { return this.el !== null; }

  show(types: EnemyType[]) {
    this.queue.push(...types.filter((t) => ENEMY_POPUPS[t]));
    if (!this.el) this.next();
  }

  /** Removes the window and everything waiting, e.g. when a run ends. */
  clear() {
    this.queue = [];
    this.close(false);
  }

  private next() {
    const type = this.queue.shift();
    if (!type) return;
    const info = ENEMY_POPUPS[type];
    const el = document.createElement('div');
    el.id = 'enemyPopup';
    el.className = 'enemy-popup';
    el.dataset.enemy = type;
    el.innerHTML = `<img src="${rigUri(type)}" alt="">
      <div class="ep-text"><div class="ep-kicker">New enemy</div><div class="ep-title">${esc(info.title)}</div>
      <p>${esc(info.text)}</p><div class="ep-hint">Tap to close</div></div>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); this.close(true); });
    this.root.appendChild(el);
    this.el = el;
    this.timer = window.setTimeout(() => this.close(true), this.showMs);
  }

  private close(showNext: boolean) {
    clearTimeout(this.timer);
    this.el?.remove();
    this.el = null;
    if (showNext) this.next();
  }
}
