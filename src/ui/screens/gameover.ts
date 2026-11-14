// The end of a lost run. Campaign: the level failed, try again or go back. Endless: the wave the gate fell in and the totals.
// The gold earned is kept either way (E-066). Only the host decides in co-op; the guest is told to wait.
import { levelOf } from '../../config/worlds';
import { esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

const guestWait = '<p class="note-line">The host decides what comes next.</p>';

function kept(ctx: ScreenContext): string {
  const r = ctx.reward;
  if (!r || !r.counted) return '';
  return `<span>Gold kept</span><b id="runGold">${r.gold}</b>${r.crests > 0 ? `<span>Raider Crests</span><b id="runCrests">${r.crests}</b>` : ''}`;
}

function campaign(ctx: ScreenContext): string {
  const rules = ctx.resultRules!;
  const level = levelOf(rules.world, rules.level ?? 0);
  const r = ctx.result!;
  const guest = ctx.session?.role === 'guest';
  const nav = guest
    ? navRow('<button class="alt" data-a="quit">Leave</button>')
    : navRow('<button class="secondary" data-a="back" id="backAfterRun">Back</button>', '<button data-a="restart" id="restart">Try again</button>');
  return `<div class="panel narrow"><h2>Level ${rules.level ?? ''} failed</h2>
      <p class="note-line">${esc(level?.name ?? '')}: the gate fell in wave ${r.wave} of ${rules.lastWave ?? '?'}.</p>
      <div class="stats">
        <span>Raiders defeated</span><b>${r.kills}</b>
        ${kept(ctx)}
        <span>Score</span><b id="finalScore">${r.score}</b>
      </div>
      <p class="note-line">Your gold stays yours. Spend it in the shop, then try again.</p>
      ${guest ? guestWait : ''}${nav}</div>`;
}

function endless(ctx: ScreenContext): string {
  const r = ctx.result!;
  const guest = ctx.session?.role === 'guest';
  const forward = guest ? '' : '<button data-a="restart" id="restart">Play again</button>';
  const back = ctx.session?.role === 'host'
    ? '<button class="secondary" data-a="back" id="backAfterRun">Back to room</button>'
    : '<button class="alt" data-a="quit">Quit to menu</button>';
  return `<div class="panel narrow"><h2>The gate has fallen</h2>
      <div class="stats">
        <span>Fell in wave</span><b id="finalWave">${r.wave}</b>
        <span>Raiders defeated</span><b>${r.kills}</b>
        ${kept(ctx)}
        <span>Final score</span><b id="finalScore">${r.score}</b>
      </div>
      ${r.devRun ? '<p class="note-line" id="devRunNote">Developer run: not added to the scores, nothing is kept.</p>' : ''}
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
