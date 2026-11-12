// The host's room: room code, invite link, who is in the room, what will be played, relay setting and the start button.
// It is redrawn by the CoopRoom whenever the status changes or a friend joins or leaves.
import type { Difficulty } from '../../config/waves';
import { worldById } from '../../config/worlds';
import { CAMPAIGN, ENDLESS } from '../../modes';
import { esc, navRow } from '../html';
import type { ScreenContext } from './context';
import { roomMembers } from './roomParts';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput, quickNote } from './settingsFields';

function planChoice(ctx: ScreenContext): string {
  const plan = ctx.coop.plan;
  const endlessOpen = ENDLESS.isAvailable(ctx.profile, ctx.world);
  const toggle = `<div class="row plan-toggle">
      ${endlessOpen ? `<button class="small ${plan.mode === 'endless' ? '' : 'secondary'}" data-a="planEndless" id="planEndless">Endless</button>` : ''}
      <button class="small ${plan.mode === 'campaign' ? '' : 'secondary'}" data-a="planCampaign" id="planCampaign">Campaign</button></div>`;
  if (plan.mode === 'campaign') {
    const next = CAMPAIGN.nextLevel(ctx.profile, ctx.world);
    const levels = worldById(ctx.world).campaign.slice(0, next);
    const opts = levels.map((l) => `<option value="${l.id}" ${l.id === plan.level ? 'selected' : ''}>Level ${l.id}: ${esc(l.name)}</option>`).join('');
    return `${toggle}<label class="field">Campaign level (your progress, your friend helps)<select id="coopLevel">${opts}</select></label>`;
  }
  return `${toggle}<label class="field">Difficulty<select id="difficulty">${difficultyOptions(ctx)}</select></label>${quickNote(ctx)}`;
}

export const hostScreen: Screen = {
  id: 'host',
  render(ctx) {
    const ready = ctx.coop.lobbyLink !== null;
    return `<div class="panel room"><h2>Host Co-op</h2>
      <div class="room-grid">
        <div class="room-col">
          <p class="room-label">Room code</p>
          <div class="code" id="roomCode">${esc(ctx.coop.code)}</div>
          <button class="small secondary" data-a="copyInvite">Copy invite link</button>
          ${roomMembers(ctx)}
          <div class="status ${ctx.coop.error ? 'err' : ''}" id="status">${esc(ctx.coop.status)}</div>
        </div>
        <div class="room-col">
          <div class="room-title">What you play</div>
          ${planChoice(ctx)}
          <label class="field">Relay server (optional, only if the direct link fails)
            <input id="relay" type="text" value="${esc(ctx.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
          <button data-a="reopen" class="small secondary">Re-open room with this relay setting</button>
        </div>
      </div>
      ${navRow('<button class="secondary" data-a="quit">Back</button>', `<button id="startCoop" data-a="startCoop" ${ready ? '' : 'disabled'}>Start</button>`)}</div>`;
  },
  onInput(t, ctx) {
    if (t.id === 'coopLevel') { ctx.coop.setPlan({ mode: 'campaign', level: Number(t.value) }); return; }
    onSettingsInput(t, ctx);
    if (t.id === 'difficulty') ctx.coop.setPlan({ mode: 'endless', difficulty: t.value as Difficulty });
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'copyInvite':
        void navigator.clipboard?.writeText(ctx.coop.inviteLink()).catch(() => {});
        ctx.toast('Invite link copied');
        break;
      case 'planEndless': ctx.coop.setPlan({ mode: 'endless', difficulty: ctx.settings.difficulty }); break;
      case 'planCampaign': ctx.coop.setPlan({ mode: 'campaign', level: null }); break;
      case 'reopen': ctx.coop.reopenRoom(); break;
      case 'startCoop': ctx.coop.startCoopAsHost(); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
