// The results of the day that just ended, shown at the start of every break between days.
// From here the player goes to the market or declares being ready for the next day.
import { esc } from '../html';
import { nextButtons, onReadyAction, readyLine } from './readyControls';
import type { Screen } from './screen';
import { shopScreen } from './shop';

export const resultsScreen: Screen = {
  id: 'results',
  render(ctx) {
    const meta = ctx.session?.meta();
    if (!meta?.lastDay) return '<div class="panel narrow"><h2>Results</h2></div>';
    const d = meta.lastDay;
    return `<div class="panel narrow"><h2>Day ${d.day} results</h2>
      <div class="stats">
        <span>Raiders defeated</span><b id="kills">${d.kills}</b>
        <span>Gold earned</span><b>${d.goldEarned}</b>
        <span>Offerings</span><b>${d.offeringsEarned}</b>
        <span>Gate left</span><b>${d.gatePct}%</b>
        <span>Score</span><b>${d.score}</b>
      </div>
      <p style="text-align:center;font-style:italic">${esc(ctx.loadingTip)}</p>
      ${readyLine(ctx, meta)}
      <div class="row" style="margin-top:10px"><button id="toShop" data-a="toShop">Market</button>${nextButtons(ctx, meta)}</div></div>`;
  },
  onAction(action, _el, ctx) {
    if (onReadyAction(action, ctx)) return;
    if (action === 'toShop') shopScreen.openAtBestTab(ctx);
  },
};
