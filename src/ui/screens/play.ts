// The endless page: name and difficulty, then an endless run alone.
// Co-op endless is chosen in the co-op room instead.
import { DIFFICULTIES } from '../../config/waves';
import { BACK_BUTTON, esc, navRow } from '../html';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput, quickNote } from './settingsFields';

export const playScreen: Screen = {
  id: 'play',
  render: (ctx) => `<div class="panel narrow"><h2>Endless</h2>
          <p class="note-line">No last day. Hold the gate as long as you can and buy everything with gold along the way.</p>
          <div class="stack">
            <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.profile.data.name)}" placeholder="Player"></label>
            <label class="field">Difficulty<select id="difficulty">${difficultyOptions(ctx)}</select></label>
          </div>
          ${quickNote(ctx)}
          ${navRow(BACK_BUTTON, `<button data-a="solo" id="startEndless">Start ${esc(DIFFICULTIES[ctx.settings.difficulty].label)}</button>`)}
          </div>`,
  onInput(t, ctx) {
    onSettingsInput(t, ctx);
    if (t.id === 'difficulty') ctx.show('play');
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'solo': ctx.startEndless(); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
