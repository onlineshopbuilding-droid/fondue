// Form fields bound to the settings in the profile, shared by the play, host, join and options screens.
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

/** Use as a screen's `onInput`: writes a changed field into the profile, which saves itself. */
export function onSettingsInput(t: HTMLInputElement, ctx: ScreenContext) {
  const p = ctx.profile;
  switch (t.id) {
    case 'name': p.setName(t.value); return;
    case 'difficulty': p.updateSettings({ difficulty: t.value as Difficulty }); break;
    case 'music': p.updateSettings({ musicVolume: Number(t.value) }); break;
    case 'sfx': p.updateSettings({ sfxVolume: Number(t.value) }); break;
    case 'mute': p.updateSettings({ muted: t.checked }); break;
    case 'relay': p.updateSettings({ relayAddress: t.value }); break;
    default: return;
  }
  ctx.commitSettings();
}
