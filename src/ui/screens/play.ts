// The play page: name, difficulty and the choice between a solo run, hosting and joining.
// It only starts things; the lobby pages and the session take over from there.
import { BACK_BUTTON, esc } from '../html';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput, quickNote } from './settingsFields';

export const playScreen: Screen = {
  id: 'play',
  render: (ctx) => `<div class="panel narrow"><h2>Play</h2>
          <div class="stack">
            <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.settings.name)}" placeholder="Player"></label>
            <label class="field">Difficulty<select id="difficulty">${difficultyOptions(ctx)}</select></label>
            ${quickNote(ctx)}
            <button data-a="solo">Single Player</button>
            <button class="alt" data-a="openRoom">Host Co-op</button>
            <button class="alt" data-a="gotoJoin">Join Co-op</button>
            ${BACK_BUTTON}
          </div></div>`,
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'solo': ctx.startSolo(); break;
      case 'openRoom': void ctx.coop.openRoom(); break;
      case 'gotoJoin': ctx.coop.clearStatus(); ctx.show('join', ''); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
