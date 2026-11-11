// The campaign list (until the path map exists): every level of the world with its number, name and state.
// Won levels and the next one can be tapped and start at once; the rest are locked.
import { worldById } from '../../config/worlds';
import { CAMPAIGN } from '../../modes';
import { BACK_BUTTON, esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

export const campaignScreen: Screen = {
  id: 'campaign',
  render(ctx) {
    const p = ctx.profile;
    const levels = worldById(ctx.world).campaign;
    const next = CAMPAIGN.nextLevel(p, ctx.world);
    const rows = levels.map((l) => {
      const done = p.isLevelDone(ctx.world, l.id);
      const open = CAMPAIGN.canPlay(p, ctx.world, l.id);
      const state = done ? 'done' : open ? 'next' : 'locked';
      const tag = done ? 'Done' : open ? 'Next' : 'Locked';
      const boss = l.boss ? `<span class="boss-tag">Boss</span>` : '';
      return `<button class="level ${state} ${l.id === next ? 'current' : ''}" data-a="level" data-level="${l.id}" ${open ? '' : 'disabled'}>
          <span class="lv-num">${l.id}</span><span class="lv-name">${esc(l.name)}${boss}</span><span class="lv-tag">${tag}</span></button>`;
    }).join('');
    return `<div class="panel wide"><h2>Campaign</h2>
      <div class="purse"><span class="star">★</span><span id="stars">${p.data.stars}</span></div>
      <div class="items levels" id="levelList">${rows}</div>
      ${navRow(BACK_BUTTON)}</div>`;
  },
  onShow(ctx: ScreenContext) {
    const next = CAMPAIGN.nextLevel(ctx.profile, ctx.world);
    ctx.query<HTMLElement>(`[data-level="${next}"]`)?.scrollIntoView({ block: 'center' });
  },
  onAction(action, el, ctx) {
    switch (action) {
      case 'level': ctx.startCampaign(Number(el.dataset.level)); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
