// The co-op page: the player's name, then opening a room as host or joining a friend's room.
// The room pages (host, join) take over from there.
import { BACK_BUTTON, esc, navRow } from '../html';
import type { Screen } from './screen';
import { onSettingsInput } from './settingsFields';

export const coopScreen: Screen = {
  id: 'coop',
  render: (ctx) => `<div class="panel narrow"><h2>Co-op</h2>
          <p class="note-line">Play together on two devices. The host picks what you play; the friend joins with the room code.</p>
          <div class="stack">
            <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.profile.data.name)}" placeholder="Player"></label>
            <button class="alt" data-a="openRoom">Host a room</button>
            <button class="alt" data-a="gotoJoin">Join a room</button>
          </div>
          ${navRow(BACK_BUTTON)}</div>`,
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'openRoom': void ctx.coop.openRoom(); break;
      case 'gotoJoin': ctx.coop.clearStatus(); ctx.show('join', ''); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
