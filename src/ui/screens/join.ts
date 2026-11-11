// The guest's room: name, room code, relay setting, who is in the room and the connection status.
// The optional argument is the code to show, so a redraw during connecting keeps what was typed. Back is left, Join right.
import { esc, navRow } from '../html';
import { roomMembers } from './roomParts';
import type { Screen } from './screen';
import { onSettingsInput } from './settingsFields';

export const joinScreen: Screen = {
  id: 'join',
  render: (ctx, arg) => `<div class="panel room"><h2>Join Co-op</h2>
      <div class="room-grid">
        <div class="room-col">
          <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.profile.data.name)}" placeholder="Player"></label>
          <label class="field">Room code<input id="code" type="text" maxlength="8" value="${esc(arg ?? ctx.coop.code)}" style="text-transform:uppercase"></label>
          <label class="field">Relay server (optional)
            <input id="relay" type="text" value="${esc(ctx.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
        </div>
        <div class="room-col">
          ${roomMembers(ctx)}
          <div class="status ${ctx.coop.error ? 'err' : ''}" id="status">${esc(ctx.coop.status)}</div>
        </div>
      </div>
      ${navRow('<button class="secondary" data-a="quit">Back</button>', `<button data-a="doJoin" id="doJoin" ${ctx.coop.joined ? 'disabled' : ''}>${ctx.coop.joined ? 'Joined' : 'Join'}</button>`)}</div>`,
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'doJoin': void ctx.coop.joinRoom(ctx.query<HTMLInputElement>('#code')?.value ?? ''); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
