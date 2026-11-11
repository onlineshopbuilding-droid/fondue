// The host's lobby: room code, invite link, relay setting and the start button.
// It is redrawn by the CoopRoom whenever the status changes or a friend joins or leaves.
import { esc } from '../html';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput, quickNote } from './settingsFields';

export const hostScreen: Screen = {
  id: 'host',
  render(ctx) {
    const ready = ctx.coop.lobbyLink !== null;
    const opts = difficultyOptions(ctx);
    return `<div class="panel narrow"><h2>Host Co-op</h2>
      <p style="text-align:center;margin:0">Room code</p>
      <div class="code" id="roomCode">${esc(ctx.coop.code)}</div>
      <div class="status ${ctx.coop.error ? 'err' : ''}" id="status">${esc(ctx.coop.status)}</div>
      <div class="stack">
        <button class="secondary" data-a="copyInvite">Copy invite link</button>
        <label class="field">Difficulty<select id="difficulty">${opts}</select></label>
        ${quickNote(ctx)}
        <label class="field">Relay server (optional, only if the direct link fails)
          <input id="relay" type="text" value="${esc(ctx.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
        <button data-a="reopen" class="small secondary">Re-open room with this relay setting</button>
        <button id="startCoop" data-a="startCoop" ${ready ? '' : 'disabled'}>Start</button>
        <button class="secondary" data-a="quit">Back</button>
      </div></div>`;
  },
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'copyInvite':
        void navigator.clipboard?.writeText(ctx.coop.inviteLink());
        ctx.toast('Invite link copied');
        break;
      case 'reopen': ctx.coop.reopenRoom(); break;
      case 'startCoop': ctx.coop.startCoopAsHost(); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
