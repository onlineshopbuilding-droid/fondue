// The main menu. Normally it is the lobby inside the keep (src/render/lobby, src/ui/lobby): the hall
// takes the taps and this screen only shows stars and campaign progress over it. With `?menu=html`
// it is the plain menu: logo, stars, progress and a button for everything. Both use the same actions.
// Holding the logo of the plain menu opens the developer menu; that long press is wired up in the App.
import { GAME_NAME } from '../../config/game';
import { worldById } from '../../config/worlds';
import { CAMPAIGN, ENDLESS } from '../../modes';
import { esc } from '../html';
import { htmlMenuWanted } from '../lobby/mode';
import type { Screen } from './screen';

declare const __GAME_VERSION__: string;

export const mainScreen: Screen = {
  id: 'main',
  render(ctx) {
    const p = ctx.profile;
    const total = worldById(ctx.world).campaign.length;
    const next = CAMPAIGN.nextLevel(p, ctx.world);
    if (!htmlMenuWanted()) {
      return `<div class="lobby-hud"><div class="lobby-chip progress" id="progress"><span class="star">★</span> <span id="stars">${p.data.stars}</span>`
        + ` <span class="sep">·</span> Level <span id="levelNow">${next}</span>/${total}</div></div>`;
    }
    const pending = ctx.pendingRun();
    const cont = pending
      ? `<button id="continueLevel" data-a="continueLevel">Continue level ${pending.rules.level} (day ${pending.start.day})</button>`
      : '';
    const endless = ENDLESS.isAvailable(p, ctx.world) ? '<button class="alt" data-a="play">Endless</button>' : '';
    return `<div class="panel narrow menu"><div class="logo">${esc(GAME_NAME)}</div>
          <div class="tagline">Grab them. Fling them. Hold the gate.</div>
          <div class="progress" id="progress"><span class="star">★</span> <span id="stars">${p.data.stars}</span> · Level <span id="levelNow">${next}</span>/${total}</div>
          <div class="menu-main">
            ${cont}
            <button ${pending ? 'class="secondary"' : ''} data-a="campaign">Campaign</button>
            ${endless}
            <button class="alt" data-a="coop">Co-op</button>
          </div>
          <div class="menu-more">
            <button class="secondary small" data-a="armoury">Armoury</button>
            <button class="secondary small" data-a="options">Options</button>
            <button class="secondary small" data-a="scores">Scores</button>
            <button class="secondary small" data-a="help">Help</button>
            <button class="secondary small" data-a="credits">Credits</button>
          </div>
          <div class="version">build ${esc(__GAME_VERSION__)}</div></div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'continueLevel': ctx.continueLevel(); break;
      case 'campaign': case 'play': case 'coop': case 'armoury': case 'scores': case 'options': case 'help': case 'credits':
        ctx.show(action);
        break;
    }
  },
};
