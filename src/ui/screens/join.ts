// The guest's lobby: name, room code, relay setting and the connection status.
// The optional argument is the code to show, so a redraw during connecting keeps what was typed.
import { esc } from '../html';
import type { Screen } from './screen';
import { onSettingsInput } from './settingsFields';

export const joinScreen: Screen = {
  id: 'join',
  render: (ctx, arg) => `<div class="panel narrow"><h2>Join Co-op</h2>
      <div class="stack">
        <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.settings.name)}" placeholder="Player"></label>
        <label class="field">Room code<input id="code" type="text" maxlength="8" value="${esc(arg ?? ctx.coop.code)}" style="text-transform:uppercase"></label>
        <label class="field">Relay server (optional)
          <input id="relay" type="text" value="${esc(ctx.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
        <div class="status ${ctx.coop.error ? 'err' : ''}" id="status">${esc(ctx.coop.status)}</div>
        <button data-a="doJoin">Join</button>
        <button class="secondary" data-a="quit">Back</button>
      </div></div>`,
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'doJoin': void ctx.coop.joinRoom(ctx.query<HTMLInputElement>('#code')?.value ?? ''); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
