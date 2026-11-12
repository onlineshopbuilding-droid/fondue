// The storybook from the shelf in the lobby: a simple window with the pages unlocked so far,
// one page at a time. Previous page on the left, next page on the right, Close below.
import { esc } from '../html';

export interface StoryPage { id: string; title: string; text: string }

export class StorybookWindow {
  private el: HTMLDivElement | null = null;
  private pages: readonly StoryPage[] = [];
  private locked = 0;
  private page = 0;

  constructor(private root: HTMLElement, private onClick: () => void) {}

  get isOpen(): boolean { return this.el !== null; }
  /** The page on show, for tests. */
  get pageId(): string { return this.pages[this.page]?.id ?? ''; }

  /** Opens on the newest page; `locked` pages are still to be found. */
  open(pages: readonly StoryPage[], locked: number) {
    this.pages = pages;
    this.locked = locked;
    this.page = Math.max(0, pages.length - 1);
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'storybook-veil';
      this.el.addEventListener('click', (e) => this.click(e));
      this.root.appendChild(this.el);
    }
    this.render(true);
  }

  close() {
    this.el?.remove();
    this.el = null;
  }

  private click(e: Event) {
    const t = e.target as HTMLElement;
    if (t === this.el) { this.onClick(); this.close(); return; }
    const a = t.closest<HTMLButtonElement>('button')?.dataset.sb;
    if (!a) return;
    this.onClick();
    if (a === 'close') { this.close(); return; }
    this.page = Math.max(0, Math.min(this.pages.length - 1, this.page + (a === 'next' ? 1 : -1)));
    this.render(false);
  }

  private render(enter: boolean) {
    if (!this.el) return;
    const p = this.pages[this.page];
    const body = p ? p.text.split(/\n\n+/).map((para) => `<p>${esc(para)}</p>`).join('') : '<p>The pages are still blank.</p>';
    const more = this.locked > 0 ? `<div class="sb-more">${this.locked} more ${this.locked === 1 ? 'page' : 'pages'} to find</div>` : '';
    this.el.innerHTML = `<div class="panel narrow storybook${enter ? ' enter' : ''}" role="dialog" aria-label="Storybook">
        <h2>Storybook</h2>
        <h3 class="sb-title">${esc(p?.title ?? '')}</h3>
        <div class="sb-text" id="storyText">${body}</div>
        <div class="sb-foot">
          <button class="secondary small" data-sb="prev" aria-label="Previous page" ${this.page <= 0 ? 'disabled' : ''}>‹</button>
          <span class="sb-count">Page ${this.page + 1} of ${Math.max(1, this.pages.length)}</span>
          <button class="small" data-sb="next" aria-label="Next page" ${this.page >= this.pages.length - 1 ? 'disabled' : ''}>›</button>
        </div>
        ${more}
        <button class="secondary small sb-close" data-sb="close">Close</button>
      </div>`;
  }
}
