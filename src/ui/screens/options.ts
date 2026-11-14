// The options page: name, endless difficulty, sound, the profile (export and import) and the way into the developer menu.
// It opens from the main menu and from the pause screen; its back button returns to whichever applies.
import { DEFAULT_WORLD } from '../../config/worlds';
import { syncUnlocks } from '../../modes';
import { cheatBadge } from '../../modes/cheats';
import { BACK_BUTTON, esc, navRow } from '../html';
import { GAME_NAME } from '../../config/game';
import { VERSION_LABEL } from '../version';
import type { ScreenContext } from './context';
import type { Screen } from './screen';
import { difficultyOptions, onSettingsInput } from './settingsFields';

/** Turn off to hide the developer menu button once the game is released (F1 and the logo stay for us). */
export const DEV_MENU_BUTTON = true;

class OptionsScreen implements Screen {
  readonly id = 'options';

  render(ctx: ScreenContext): string {
    const s = ctx.settings;
    const returnBtn = ctx.session ? '<button class="secondary" data-a="backPause">Back</button>' : BACK_BUTTON;
    const temp = ctx.temporaryProfile ? '<p class="note-line" id="tempProfile">Test profile: nothing on this page is saved.</p>' : '';
    return `<div class="panel options"><h2>Options</h2>
      <div class="stack">
        <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(ctx.profile.data.name)}" placeholder="Player"></label>
        <label class="field">Endless difficulty<select id="difficulty">${difficultyOptions(ctx)}</select></label>
        <label class="field">Music volume<input id="music" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}"></label>
        <label class="field">Effects volume<input id="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}"></label>
        <label class="field check"><input id="mute" type="checkbox" ${s.muted ? 'checked' : ''}> Mute everything</label>
      </div>
      <h3>Profile</h3>${temp}
      <p class="note-line" id="homeScreenHint">Always open the game from the same home screen icon. The home screen app and a browser tab keep separate saves.</p>
      <div class="profile-box">
        <label class="field">Your profile code (a backup, or for another device)
          <textarea id="profileCode" readonly rows="2">${esc(ctx.profile.exportCode())}</textarea></label>
        <div class="row"><button class="small secondary" data-a="copyProfile">Copy code</button></div>
        <label class="field">Load a profile code (replaces this profile)
          <textarea id="profileImport" rows="2" placeholder="Paste a profile code here"></textarea></label>
        <div class="status err" id="profileError"></div>
        <div class="row"><button class="small alt" data-a="importProfile">Load profile</button></div>
      </div>
      <p class="note-line version-line" id="versionLabel">${esc(GAME_NAME)} ${esc(VERSION_LABEL)}</p>
      ${cheatBadge(ctx.profile) ? `<p class="note-line" id="optCheatBadge">${esc(cheatBadge(ctx.profile) ?? '')}</p>` : ''}
      ${navRow(returnBtn, DEV_MENU_BUTTON ? '<button class="secondary" data-a="devMenu" id="devMenuButton">Developer menu</button>' : '')}</div>`;
  }

  onInput(t: HTMLInputElement, ctx: ScreenContext) { onSettingsInput(t, ctx); }

  onAction(action: string, _el: HTMLElement, ctx: ScreenContext) {
    switch (action) {
      case 'copyProfile': {
        const code = ctx.query<HTMLTextAreaElement>('#profileCode');
        code?.select();
        void navigator.clipboard?.writeText(ctx.profile.exportCode()).catch(() => {});
        ctx.toast('Profile code copied');
        break;
      }
      case 'importProfile': {
        const text = ctx.query<HTMLTextAreaElement>('#profileImport')?.value.trim() ?? '';
        const err = ctx.query<HTMLElement>('#profileError');
        if (!text) { if (err) err.textContent = 'Paste a profile code first.'; return; }
        try {
          ctx.profile.importCode(text);
        } catch {
          if (err) err.textContent = 'That code is broken or incomplete. Nothing was changed.';
          return;
        }
        syncUnlocks(ctx.profile, DEFAULT_WORLD);
        ctx.commitSettings();
        ctx.toast('Profile loaded');
        ctx.show('options');
        break;
      }
      case 'devMenu': ctx.openDevMenu(); break;
      case 'backPause': ctx.show(ctx.session?.view()?.paused ? 'pause' : 'none'); break;
      case 'main': ctx.show('main'); break;
    }
  }
}

export const optionsScreen = new OptionsScreen();
