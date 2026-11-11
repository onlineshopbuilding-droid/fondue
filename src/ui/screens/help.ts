// The help pages: one slide at a time with a picture, a short text and previous/next buttons.
// The slides themselves live in content.ts; this screen only remembers which one is open.
import { HELP_SLIDES } from '../content';
import { artUri, BACK_BUTTON, esc } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

class HelpScreen implements Screen {
  readonly id = 'help';
  private index = 0;

  render(): string {
    const slide = HELP_SLIDES[this.index];
    return `<div class="panel"><h2>${esc(slide.title)}</h2>
      <div class="slide"><img src="${artUri(slide.icon)}" alt=""><p>${esc(slide.text)}</p></div>
      <div class="dots">${this.index + 1} / ${HELP_SLIDES.length}</div>
      <div class="row" style="margin-top:12px">
        <button class="secondary" data-a="helpPrev">Previous</button><button data-a="helpNext">Next</button>${BACK_BUTTON}
      </div></div>`;
  }

  onAction(action: string, _el: HTMLElement, ctx: ScreenContext) {
    switch (action) {
      case 'helpPrev': this.index = (this.index + HELP_SLIDES.length - 1) % HELP_SLIDES.length; ctx.show('help'); break;
      case 'helpNext': this.index = (this.index + 1) % HELP_SLIDES.length; ctx.show('help'); break;
      // Leaving starts the next visit at the first slide again.
      case 'main': this.index = 0; ctx.show('main'); break;
    }
  }
}

export const helpScreen = new HelpScreen();
