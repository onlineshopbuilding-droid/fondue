// The main menu: logo, tagline and the way into every other menu page.
// Holding the logo opens the developer menu; that long press is wired up in the App.
import { GAME_NAME } from '../../config/game';
import { esc } from '../html';
import type { Screen } from './screen';

declare const __GAME_VERSION__: string;

export const mainScreen: Screen = {
  id: 'main',
  render: () => `<div class="panel narrow"><div class="logo">${esc(GAME_NAME)}</div>
          <div class="tagline">Grab them. Fling them. Hold the gate.</div>
          <div class="stack">
            <button data-a="play">Play</button>
            <button class="secondary" data-a="scores">Scores</button>
            <button class="secondary" data-a="options">Options</button>
            <button class="secondary" data-a="help">Help</button>
            <button class="secondary" data-a="credits">Credits</button>
          </div>
          <div class="version">build ${esc(__GAME_VERSION__)}</div></div>`,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'play': case 'scores': case 'options': case 'help': case 'credits': ctx.show(action); break;
    }
  },
};
