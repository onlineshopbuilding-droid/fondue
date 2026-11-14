// The main menu. Normally it is the lobby inside the keep (src/render/lobby, src/ui/lobby): the hall
// takes the taps and this screen only shows cheese and campaign progress over it. With `?menu=html`
// it is the plain menu: logo, cheese, progress and a button for everything. Both use the same actions.
// Holding the logo of the plain menu opens the developer menu; that long press is wired up in the App.
import { GAME_NAME } from '../../config/game';
import { worldById } from '../../config/worlds';
import { CAMPAIGN, ENDLESS } from '../../modes';
import { esc } from '../html';
import { htmlMenuWanted } from '../lobby/mode';
import { VERSION_LABEL } from '../version';
import type { PendingRun } from './context';
import type { Screen } from './screen';

/** Why endless is still closed, for the menu and the lobby. */
export const ENDLESS_LOCKED = 'Endless opens with your fifth slot.';

/** The wave an interrupted level continues at. */
export function pendingWave(p: PendingRun): number {
  const s = p.start as unknown as { wave?: unknown };
  return typeof s.wave === 'number' ? s.wave : 1;
}

export const mainScreen: Screen = {
  id: 'main',
  render(ctx) {
    const p = ctx.profile;
    const total = worldById(ctx.world).campaign.length;
    const next = CAMPAIGN.nextLevel(p, ctx.world);
    if (!htmlMenuWanted()) {
      return `<div class="lobby-hud"><div class="lobby-chip progress" id="progress"><span class="cur-icon">🧀</span> <span id="cheeseTotal">${p.data.wallet.cheese}</span>`
        + ` <span class="sep">·</span> 🪙 <span id="lobbyGold">${p.data.wallet.gold.toLocaleString('en-US')}</span>`
        + ` <span class="sep">·</span> Level <span id="levelNow">${next}</span>/${total}</div>`
        + `<div class="lobby-version" id="versionLabel">${esc(VERSION_LABEL)}</div></div>`;
    }
    const pending = ctx.pendingRun();
    const cont = pending
      ? `<button id="continueLevel" data-a="continueLevel">Continue level ${pending.rules.level} (wave ${pendingWave(pending)})</button>`
      : '';
    const endless = ENDLESS.isAvailable(p, ctx.world) ? '<button class="alt" data-a="play">Endless</button>'
      : `<button class="alt" disabled title="${esc(ENDLESS_LOCKED)}">Endless 🔒</button>`;
    return `<div class="panel narrow menu"><div class="logo">${esc(GAME_NAME)}</div>
          <div class="tagline">Grab them. Fling them. Hold the gate.</div>
          <div class="progress" id="progress"><span class="cur-icon">🧀</span> <span id="cheeseTotal">${p.data.wallet.cheese}</span> · Level <span id="levelNow">${next}</span>/${total}</div>
          <div class="menu-main">
            ${cont}
            <button ${pending ? 'class="secondary"' : ''} data-a="campaign">Campaign</button>
            ${endless}
            <button class="alt" data-a="coop">Co-op</button>
          </div>
          <div class="menu-more">
            <button class="secondary small" data-a="armoury">Keep Shop</button>
            <button class="secondary small" data-a="options">Options</button>
            <button class="secondary small" data-a="scores">Scores</button>
            <button class="secondary small" data-a="help">Help</button>
            <button class="secondary small" data-a="credits">Credits</button>
          </div>
          <div class="version" id="versionLabel">${esc(VERSION_LABEL)}</div></div>`;
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
