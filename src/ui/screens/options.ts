// The options page with five tabs: Settings (name, endless difficulty, sound, the profile), Scores,
// Help, Credits and Versions (every playable version with a link), plus the way into the developer
// menu. Scores, help and credits are only reachable here (the game-over screen still opens the
// score table). The open tab lives in this screen; switching re-renders the page via ctx.show.
// It opens from the lobby and from the pause screen; its back button returns to whichever applies.
import './options.css';
import { DEFAULT_WORLD } from '../../config/worlds';
import { VERSIONS, VERSIONS_NOTE, versionUrl } from '../../config/versions';
import { syncUnlocks } from '../../modes';
import { cheatBadge } from '../../modes/cheats';
import { BACK_BUTTON, esc, navRow } from '../html';
import { GAME_NAME, GAME_VERSION } from '../../config/game';
import { VERSION_LABEL } from '../version';
import type { ScreenContext } from './context';
import { creditsBody } from './credits';
import { helpSlide, helpStep } from './help';
import type { Screen } from './screen';
import { scoresTable } from './scores';
import { difficultyOptions, onSettingsInput } from './settingsFields';

/** Turn off to hide the developer menu button once the game is released (F1 and the logo stay for us). */
export const DEV_MENU_BUTTON = true;

/** The tabs in their order on screen. */
export const OPTION_TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'scores', label: 'Scores' },
  { id: 'help', label: 'Help' },
  { id: 'credits', label: 'Credits' },
  { id: 'versions', label: 'Versions' },
] as const;

export type OptionTab = (typeof OPTION_TABS)[number]['id'];

const isTab = (v: string | undefined): v is OptionTab => OPTION_TABS.some((t) => t.id === v);

class OptionsScreen implements Screen {
  readonly id = 'options';
  private tab: OptionTab = 'settings';
  private helpIndex = 0;

  render(ctx: ScreenContext): string {
    const returnBtn = ctx.session ? '<button class="secondary" data-a="backPause">Back</button>' : BACK_BUTTON;
    const tabs = OPTION_TABS.map((t) => `<button class="opt-tab${t.id === this.tab ? ' active' : ' secondary'}" role="tab" aria-selected="${t.id === this.tab}"
      data-a="optTab" data-tab="${t.id}" id="optTab-${t.id}">${t.label}</button>`).join('');
    const badge = cheatBadge(ctx.profile);
    return `<div class="panel options">
      <div class="opt-head"><h2>Options</h2><span class="opt-version" id="optVersion">v${esc(GAME_VERSION)}</span></div>
      <div class="opt-tabs" role="tablist">${tabs}</div>
      <div class="opt-body" id="optBody-${this.tab}" role="tabpanel">${this.body(ctx)}</div>
      ${badge ? `<p class="note-line" id="optCheatBadge">${esc(badge)}</p>` : ''}
      ${navRow(returnBtn, DEV_MENU_BUTTON ? '<button class="secondary" data-a="devMenu" id="devMenuButton">Developer menu</button>' : '')}</div>`;
  }

  private body(ctx: ScreenContext): string {
    switch (this.tab) {
      case 'scores': return scoresTable(ctx);
      case 'help': return `${helpSlide(this.helpIndex, 'h3')}
        <div class="row"><button class="secondary" data-a="helpPrev" id="optHelpPrev">Previous</button><button data-a="helpNext" id="optHelpNext">Next</button></div>`;
      case 'credits': return `<div class="opt-credits">${creditsBody()}</div>`;
      case 'versions': return this.versions();
      default: return this.settings(ctx);
    }
  }

  private settings(ctx: ScreenContext): string {
    const s = ctx.settings;
    const temp = ctx.temporaryProfile ? '<p class="note-line" id="tempProfile">Test profile: nothing on this page is saved.</p>' : '';
    return `<div class="stack">
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
      <p class="note-line version-line" id="versionLabel">${esc(GAME_NAME)} ${esc(VERSION_LABEL)}</p>`;
  }

  private versions(): string {
    const rows = VERSIONS.map((v) => `<li class="opt-version-row${v.current ? ' current' : ''}" data-version="${esc(v.version)}">
        <a class="opt-version-link" href="${esc(versionUrl(v))}" target="_blank" rel="noopener" id="optVersionLink-${esc(v.version.replace('.', '-'))}">
          <b>v${esc(v.version)}</b> <span>${esc(v.name)}</span>${v.current ? ' <em>this one</em>' : ''}</a></li>`).join('');
    return `<p class="note-line" id="versionsNote">${esc(VERSIONS_NOTE)}</p><ul class="opt-versions" id="versionList">${rows}</ul>`;
  }

  onInput(t: HTMLInputElement, ctx: ScreenContext) { onSettingsInput(t, ctx); }

  onAction(action: string, el: HTMLElement, ctx: ScreenContext) {
    switch (action) {
      case 'optTab': {
        const tab = el.dataset.tab;
        if (isTab(tab) && tab !== this.tab) { this.tab = tab; this.helpIndex = 0; ctx.show('options'); }
        break;
      }
      case 'helpPrev': this.helpIndex = helpStep(this.helpIndex, -1); ctx.show('options'); break;
      case 'helpNext': this.helpIndex = helpStep(this.helpIndex, 1); ctx.show('options'); break;
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
      // Leaving opens the next visit on the Settings tab again.
      case 'backPause': this.tab = 'settings'; ctx.show(ctx.session?.view()?.paused ? 'pause' : 'none'); break;
      case 'main': this.tab = 'settings'; ctx.show('main'); break;
    }
  }
}

export const optionsScreen = new OptionsScreen();
