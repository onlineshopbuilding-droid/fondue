// The help pages: one slide at a time with a picture, a short text and previous/next buttons.
// The slides live in content.ts. The Options show them in their Help tab (helpSlide); the screen
// here stays for old links and remembers which slide is open.
import { HELP_SLIDES } from '../content';
import { artUri, BACK_BUTTON, esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

/** Number of help slides. */
export const HELP_COUNT = HELP_SLIDES.length;

/** Index after a step of +1 or -1, wrapping around. */
export const helpStep = (index: number, step: number): number => (index + step + HELP_COUNT) % HELP_COUNT;

/** One slide with its title, picture, text and "n / total", without buttons. */
export function helpSlide(index: number, titleTag = 'h2'): string {
  const slide = HELP_SLIDES[index] ?? HELP_SLIDES[0];
  return `<${titleTag} class="help-title">${esc(slide.title)}</${titleTag}>
      <div class="slide"><img src="${artUri(slide.icon)}" alt=""><p>${esc(slide.text)}</p></div>
      <div class="dots">${index + 1} / ${HELP_COUNT}</div>`;
}

class HelpScreen implements Screen {
  readonly id = 'help';
  private index = 0;

  render(): string {
    return `<div class="panel">${helpSlide(this.index)}
      ${navRow(`${BACK_BUTTON}<button class="secondary" data-a="helpPrev">Previous</button>`, '<button data-a="helpNext">Next</button>')}</div>`;
  }

  onAction(action: string, _el: HTMLElement, ctx: ScreenContext) {
    switch (action) {
      case 'helpPrev': this.index = helpStep(this.index, -1); ctx.show('help'); break;
      case 'helpNext': this.index = helpStep(this.index, 1); ctx.show('help'); break;
      // Leaving starts the next visit at the first slide again.
      case 'main': this.index = 0; ctx.show('main'); break;
    }
  }
}

export const helpScreen = new HelpScreen();
