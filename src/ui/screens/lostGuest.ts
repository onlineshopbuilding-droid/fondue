// Shown to the guest when the link to the host breaks or the host ends the game.
// A broken link offers to rejoin the same room; an ended game only leads back to the menu.
import type { GuestSession } from '../../game/session';
import type { Screen } from './screen';

export const lostGuestScreen: Screen = {
  id: 'lostGuest',
  render(ctx) {
    const hostLeft = (ctx.session as GuestSession | null)?.hostLeft;
    return `<div class="panel narrow"><h2>Connection lost</h2>
          <p style="text-align:center">${hostLeft ? 'The host ended the game.' : 'The link to the host broke.'}</p>
          <div class="stack">${hostLeft ? '' : '<button data-a="rejoin">Rejoin</button>'}<button class="alt" data-a="quit">Quit to menu</button></div></div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'rejoin': ctx.coop.enterRejoin(); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
