// The pause screen, shown while a player has paused the game.
// The App opens and closes it by watching the session; the P and Escape keys resume as well.
import { esc } from '../html';
import type { Screen } from './screen';

export const pauseScreen: Screen = {
  id: 'pause',
  render: (ctx) => `<div class="panel narrow"><h2>Paused</h2>
          <p style="text-align:center">Paused by ${esc(ctx.session?.meta()?.pausedBy ?? '')}</p>
          <div class="stack"><button data-a="resume">Resume</button>
          <button class="secondary" data-a="options">Options</button>
          <button class="alt" data-a="quit">Quit to menu</button></div></div>`,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'resume': ctx.togglePause(); break;
      case 'options': ctx.show('options'); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
