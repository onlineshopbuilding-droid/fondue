// The contract every HTML screen fulfils and the manager that shows exactly one of them at a time.
// The manager owns the overlay element, the pop-in animation and the routing of clicks and inputs.
import type { ScreenContext } from './context';

/** Every screen the game knows; `none` means the battlefield is uncovered. Add new screens here. */
export type ScreenId =
  | 'none' | 'main' | 'play' | 'coop' | 'campaign' | 'armoury' | 'host' | 'join' | 'options' | 'help' | 'scores' | 'credits'
  | 'gameover' | 'won' | 'pause' | 'lostHost' | 'lostGuest';

export interface Screen {
  readonly id: Exclude<ScreenId, 'none'>;
  /** The markup of the whole screen. Called again for every redraw, so it must be cheap and pure. */
  render(ctx: ScreenContext, arg?: string): string;
  /** A click on an enabled button; `action` is its `data-a` (empty if it has none). */
  onAction?(action: string, element: HTMLElement, ctx: ScreenContext): void;
  /** A click on anything else. Return true if the screen used it; buttons are then skipped. */
  onClick?(target: HTMLElement, ctx: ScreenContext): boolean;
  /** A form field of the screen changed. */
  onInput?(target: HTMLInputElement, ctx: ScreenContext): void;
  /** The screen replaced another one (not called for a redraw of itself). */
  onShow?(ctx: ScreenContext): void;
  /** The screen is about to be replaced or closed. */
  onHide?(ctx: ScreenContext): void;
}

/** Shows one screen at a time inside a single overlay element above the canvas. */
export class ScreenManager {
  private overlay: HTMLDivElement | null = null;
  private currentId: ScreenId = 'none';
  private readonly byId = new Map<ScreenId, Screen>();
  /** A finger or the mouse button is down on the overlay. */
  private pressed = false;
  /** A redraw asked for during a press; it happens once the press is over. */
  private pending: { arg?: string } | null = null;

  /** The overlay is inserted before `anchor`, so toasts stay on top of it. */
  constructor(private root: HTMLElement, private anchor: HTMLElement, screens: readonly Screen[], private ctx: ScreenContext) {
    for (const s of screens) this.byId.set(s.id, s);
  }

  get current(): ScreenId { return this.currentId; }
  get isOpen(): boolean { return this.overlay !== null; }

  /** Finds an element inside the visible screen. */
  query<T extends Element>(selector: string): T | null {
    return this.overlay?.querySelector<T>(selector) ?? null;
  }

  show(id: ScreenId, arg?: string) {
    const samePage = this.currentId === id;
    // A redraw swaps every element. Between press and release it would take the button away from
    // under the finger and the tap would be lost, so it waits until the tap is through.
    if (samePage && this.pressed && this.overlay) { this.pending = { arg }; return; }
    this.pending = null;
    if (!samePage) this.byId.get(this.currentId)?.onHide?.(this.ctx);
    this.currentId = id;
    const screen = this.byId.get(id);
    if (!screen) {
      this.overlay?.remove();
      this.overlay = null;
      return;
    }
    const html = screen.render(this.ctx, arg);
    const overlay = this.overlay ?? this.createOverlay();
    this.redraw(overlay, html, samePage);
    if (!samePage) screen.onShow?.(this.ctx);
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.addEventListener('click', (e) => this.onClick(e));
    overlay.addEventListener('input', (e) => this.onInput(e));
    overlay.addEventListener('pointerdown', () => { this.pressed = true; });
    const released = () => {
      if (!this.pressed) return;
      this.pressed = false;
      // The click of this tap comes right after the release; the held-back redraw follows it.
      setTimeout(() => {
        const p = this.pending;
        if (p && !this.pressed && this.overlay === overlay) this.show(this.currentId, p.arg);
      }, 0);
    };
    window.addEventListener('pointerup', released);
    window.addEventListener('pointercancel', released);
    this.root.insertBefore(overlay, this.anchor);
    this.overlay = overlay;
    return overlay;
  }

  /** Swaps the markup while keeping the focused field and, on a redraw, every scroll position. */
  private redraw(overlay: HTMLDivElement, html: string, samePage: boolean) {
    const focused = document.activeElement as HTMLInputElement | null;
    const focusId = focused?.id;
    const caret = focused?.selectionStart ?? null;
    // A purchase redraws the market; the player's place in the lists must survive that.
    const list = samePage ? overlay.querySelector('.items') : null;
    const tabs = samePage ? overlay.querySelector('.tabs') : null;
    const panel = samePage ? overlay.querySelector('.panel') : null;
    const listTop = list?.scrollTop ?? 0;
    const tabsLeft = tabs?.scrollLeft ?? 0;
    const panelTop = panel?.scrollTop ?? 0;
    const tabBefore = tabs?.querySelector('.tab.on')?.getAttribute('data-tab');
    // Any element marked data-keep-scroll (with an id) keeps both scroll positions on a redraw.
    const kept = samePage
      ? [...overlay.querySelectorAll<HTMLElement>('[data-keep-scroll][id]')].map((el) => ({ id: el.id, left: el.scrollLeft, top: el.scrollTop }))
      : [];
    overlay.innerHTML = html;
    for (const k of kept) {
      const el = overlay.querySelector<HTMLElement>(`#${k.id}`);
      if (el) { el.scrollLeft = k.left; el.scrollTop = k.top; }
    }
    // Only a new screen pops in; a redraw of the same one must not flicker.
    if (!samePage) overlay.querySelector('.panel')?.classList.add('enter');
    if (samePage) {
      const newTabs = overlay.querySelector('.tabs');
      const tabNow = newTabs?.querySelector('.tab.on')?.getAttribute('data-tab');
      const items = overlay.querySelector('.items');
      // A list keeps its place only while it still shows the same tab.
      if (items && tabBefore === tabNow) items.scrollTop = listTop;
      if (newTabs) newTabs.scrollLeft = tabsLeft;
      const newPanel = overlay.querySelector('.panel');
      if (newPanel) newPanel.scrollTop = panelTop;
    }
    if (focusId) {
      const el = overlay.querySelector<HTMLInputElement>(`#${focusId}`);
      if (el) { el.focus(); if (caret !== null) el.setSelectionRange(caret, caret); }
    }
  }

  private onClick(e: Event) {
    const screen = this.byId.get(this.currentId);
    if (!screen) return;
    const el = e.target as HTMLElement;
    if (screen.onClick?.(el, this.ctx)) return;
    const btn = el.closest<HTMLButtonElement>('button');
    if (!btn || btn.disabled) return;
    this.ctx.audio.resume();
    this.ctx.audio.play('uiClick');
    screen.onAction?.(btn.dataset.a ?? '', btn, this.ctx);
  }

  private onInput(e: Event) {
    this.byId.get(this.currentId)?.onInput?.(e.target as HTMLInputElement, this.ctx);
  }
}
