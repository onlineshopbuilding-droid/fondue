// The options page: difficulty for new games and the sound settings.
// It opens from the main menu and from the pause screen; its back button returns to whichever applies.
import { BACK_BUTTON } from '../html';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput } from './settingsFields';

export const optionsScreen: Screen = {
  id: 'options',
  render(ctx) {
    const s = ctx.settings;
    const opts = difficultyOptions(ctx);
    const returnBtn = ctx.session ? '<button class="secondary" data-a="backPause">Back</button>' : BACK_BUTTON;
    return `<div class="panel narrow"><h2>Options</h2><div class="stack">
      <label class="field">Difficulty (applies to new games)<select id="difficulty">${opts}</select></label>
      <label class="field">Music volume<input id="music" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}"></label>
      <label class="field">Effects volume<input id="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}"></label>
      <label class="field" style="flex-direction:row;align-items:center"><input id="mute" type="checkbox" ${s.muted ? 'checked' : ''}> Mute everything</label>
      ${returnBtn}</div></div>`;
  },
  onInput: onSettingsInput,
  onAction(action, _el, ctx) {
    switch (action) {
      case 'backPause': ctx.show(ctx.session?.view()?.paused ? 'pause' : 'none'); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
