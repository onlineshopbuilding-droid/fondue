// Shown to the host when the friend's connection breaks in the middle of a fight.
// The host can wait for the friend to rejoin with the room code, carry on alone or quit.
import type { HostSession } from '../../game/session';
import { esc } from '../html';
import type { Screen } from './screen';

export const lostHostScreen: Screen = {
  id: 'lostHost',
  render: (ctx) => `<div class="panel narrow"><h2>Connection lost</h2>
          <p style="text-align:center">Your friend dropped out. They can rejoin with code <b>${esc(ctx.coop.code)}</b>.</p>
          <div class="stack"><button data-a="aloneOn">Continue alone</button><button class="alt" data-a="quit">Quit to menu</button></div></div>`,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'aloneOn': (ctx.session as HostSession).continueAlone(); ctx.show('none'); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
