// The main menu. Normally it is the lobby inside the keep (src/render/lobby, src/ui/lobby): the hall
// takes the taps and this screen only shows cheese and campaign progress over it. With `?menu=html`
// it is the plain menu: logo, cheese, progress and a button for everything. Both use the same actions.
// Holding the logo of the plain menu opens the developer menu; that long press is wired up in the App.
import { GAME_NAME } from '../../config/game';
import { worldById } from '../../config/worlds';
import { TABLE_UNLOCK_LEVEL } from '../../config/slotTiers';
import { CAMPAIGN, coopTableOpen, endlessOpen } from '../../modes';
import { bannerText } from '../../render/lobby/layout';
import { esc } from '../html';
import { htmlMenuWanted } from '../lobby/mode';
import { VERSION_LABEL } from '../version';
import type { PendingRun } from './context';
import type { Screen } from './screen';

/** Why endless is still closed, for the menu and the lobby. */
export const ENDLESS_LOCKED = `Endless opens once you win level ${TABLE_UNLOCK_LEVEL.endless}.`;
/** Why co-op is still closed. */
export const COOP_LOCKED = `Co-op opens once you win level ${TABLE_UNLOCK_LEVEL.coop}.`;

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
    const endless = endlessOpen(p, ctx.world) ? '<button class="alt" data-a="play">Endless</button>'
      : `<button class="alt" disabled title="${esc(ENDLESS_LOCKED)}">Endless 🔒</button>`;
    const coop = coopTableOpen(p, ctx.world) ? '<button class="alt" data-a="coop">Co-op</button>'
      : `<button class="alt" disabled title="${esc(COOP_LOCKED)}">Co-op 🔒</button>`;
    const castle = bannerText(p.data.keep.castleTier);
    return `<div class="panel narrow menu"><div class="logo">${esc(GAME_NAME)}</div>
          <div class="tagline">Grab them. Fling them. Hold the gate.</div>
          <div class="progress" id="progress"><span class="cur-icon">🧀</span> <span id="cheeseTotal">${p.data.wallet.cheese}</span> · Level <span id="levelNow">${next}</span>/${total}</div>
          <div class="progress" id="castleTier">${esc(castle.name)} · ${esc(castle.tier)}</div>
          <div class="menu-main">
            ${cont}
            <button ${pending ? 'class="secondary"' : ''} data-a="campaign">Campaign</button>
            <button class="secondary" data-a="armoury">Shop</button>
            ${coop}
            ${endless}
          </div>
          <div class="menu-more">
            <button class="secondary small" data-a="options">Options</button>
          </div>
          <div class="version" id="versionLabel">${esc(VERSION_LABEL)}</div></div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'continueLevel': ctx.continueLevel(); break;
      case 'campaign': case 'play': case 'coop': case 'armoury': case 'options':
        ctx.show(action);
        break;
    }
  },
};
