// The end of a lost run. Campaign: the level failed, try again or go back. Endless: the day the gate fell and the totals.
// Only the host decides in co-op; the guest is told to wait.
import { levelOf } from '../../config/worlds';
import { esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

const guestWait = '<p class="note-line">The host decides what comes next.</p>';

function campaign(ctx: ScreenContext): string {
  const rules = ctx.resultRules!;
  const level = levelOf(rules.world, rules.level ?? 0);
  const r = ctx.result!;
  const guest = ctx.session?.role === 'guest';
  const nav = guest
    ? navRow('<button class="alt" data-a="quit">Leave</button>')
    : navRow('<button class="secondary" data-a="back" id="backAfterRun">Back</button>', '<button data-a="restart" id="restart">Try again</button>');
  return `<div class="panel narrow"><h2>Level ${rules.level ?? ''} failed</h2>
      <p class="note-line">${esc(level?.name ?? '')}: the gate fell on day ${r.day} of ${rules.lastDay ?? '?'}.</p>
      <div class="stats">
        <span>Raiders defeated</span><b>${r.kills}</b>
        <span>Score</span><b id="finalScore">${r.score}</b>
      </div>
      <p class="note-line">Every try starts again on day 1.</p>
      ${guest ? guestWait : ''}${nav}</div>`;
}

function endless(ctx: ScreenContext): string {
  const r = ctx.result!;
  const guest = ctx.session?.role === 'guest';
  const forward = guest ? '' : '<button data-a="restart" id="restart">Play again</button>';
  const back = ctx.session?.role === 'host'
    ? '<button class="secondary" data-a="back" id="backAfterRun">Back to room</button>'
    : '<button class="alt" data-a="quit">Quit to menu</button>';
  const stars = ctx.reward && ctx.reward.stars > 0 ? `<span>Stars earned</span><b id="runStars">★ ${ctx.reward.stars}</b>` : '';
  return `<div class="panel narrow"><h2>The gate has fallen</h2>
      <div class="stats">
        <span>Fell on day</span><b>${r.day}</b>
        <span>Raiders defeated</span><b>${r.kills}</b>
        <span>Final score</span><b id="finalScore">${r.score}</b>
        ${stars}
      </div>
      ${r.devRun ? '<p class="note-line" id="devRunNote">Developer run: not added to the scores.</p>' : ''}
      ${guest ? guestWait : ''}
      ${navRow(`${back}<button class="secondary" data-a="scores2">Scores</button>`, forward)}</div>`;
}

export const gameoverScreen: Screen = {
  id: 'gameover',
  render(ctx) {
    if (!ctx.result || !ctx.resultRules) return '';
    return ctx.resultRules.mode === 'campaign' ? campaign(ctx) : endless(ctx);
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'restart': ctx.restartRun(); break;
      case 'back': ctx.backAfterRun(); break;
      case 'scores2': ctx.show('scores'); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
