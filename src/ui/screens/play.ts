// The endless page: name, difficulty and the loadout of the five slots, then an endless run alone.
// Co-op endless is chosen in the co-op room instead.
import { DIFFICULTIES } from '../../config/waves';
import { BACK_BUTTON, esc, navRow } from '../html';
import { loadoutAction, loadoutHtml, resetLoadout } from './prelevel';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput, quickNote } from './settingsFields';

export const playScreen: Screen = {
  id: 'play',
  render: (ctx) => `<div class="panel narrow"><h2>Endless</h2>
          <p class="note-line">Wave after wave, with your own keep. Hold the gate as long as you can: every raider pays gold, no cheese.</p>
          <div class="stack">
            <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.profile.data.name)}" placeholder="Player"></label>
            <label class="field">Difficulty<select id="difficulty">${difficultyOptions(ctx)}</select></label>
          </div>
          ${loadoutHtml(ctx)}
          ${quickNote(ctx)}
          ${navRow(BACK_BUTTON, `<button data-a="solo" id="startEndless">Start ${esc(DIFFICULTIES[ctx.settings.difficulty].label)}</button>`)}
          </div>`,
  onInput(t, ctx) {
    onSettingsInput(t, ctx);
    if (t.id === 'difficulty') ctx.show('play');
  },
  onShow() { resetLoadout(); },
  onAction(action, el, ctx) {
    if (loadoutAction(action, el, ctx)) { ctx.show('play'); return; }
    switch (action) {
      case 'solo': ctx.startEndless(); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
