// The end of a run: the day the gate fell, the totals and the way into a new run.
// Only the host may restart a co-op game; the guest is told to wait.
import type { Screen } from './screen';

export const gameoverScreen: Screen = {
  id: 'gameover',
  render(ctx) {
    const meta = ctx.session?.meta();
    const v = ctx.session?.view();
    if (!meta || !v) return '';
    const restart = ctx.session?.role === 'guest' ? '<p style="text-align:center">The host can start a new run.</p>' : '<button data-a="restart" id="restart">Play again</button>';
    return `<div class="panel narrow"><h2>The gate has fallen</h2>
      <div class="stats">
        <span>Fell on day</span><b>${v.day}</b>
        <span>Raiders defeated</span><b>${meta.totalKills}</b>
        <span>Final score</span><b id="finalScore">${meta.totalScore}</b>
      </div>
      ${meta.quickStart > 0 ? '<p style="text-align:center;margin:4px 0">Quick start: not added to the scores.</p>' : ''}
      <div class="stack">${restart}<button class="secondary" data-a="scores2">Scores</button><button class="alt" data-a="quit">Quit to menu</button></div></div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'restart':
        if (ctx.session?.role === 'host') ctx.coop.restartCoop();
        else ctx.startSolo();
        break;
      case 'scores2': ctx.show('scores'); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
