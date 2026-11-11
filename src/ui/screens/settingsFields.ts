// Form fields bound to the saved settings, shared by the play, host, join and options screens.
// A field is recognised by its element id, so the same id always edits the same setting.
import { DIFFICULTIES, type Difficulty } from '../../config/waves';
import type { ScreenContext } from './context';

/** The <option> list of a difficulty select, with the saved one chosen. */
export function difficultyOptions(ctx: ScreenContext): string {
  return (Object.keys(DIFFICULTIES) as Difficulty[])
    .map((d) => `<option value="${d}" ${d === ctx.settings.difficulty ? 'selected' : ''}>${DIFFICULTIES[d].label}</option>`).join('');
}

/** Reminds the player that the developer menu set a later start day. */
export function quickNote(ctx: ScreenContext): string {
  return ctx.startDay > 1 ? `<div class="status" id="quickNote">Quick start: day ${ctx.startDay}. Does not count for the scores.</div>` : '';
}

/** Use as a screen's `onInput`: writes a changed field into the settings and saves them. */
export function onSettingsInput(t: HTMLInputElement, ctx: ScreenContext) {
  const s = ctx.settings;
  switch (t.id) {
    case 'name': s.name = t.value; break;
    case 'difficulty': s.difficulty = t.value as Difficulty; break;
    case 'music': s.musicVolume = Number(t.value); break;
    case 'sfx': s.sfxVolume = Number(t.value); break;
    case 'mute': s.muted = t.checked; break;
    case 'relay': s.relayAddress = t.value; break;
    default: return;
  }
  ctx.commitSettings();
}
