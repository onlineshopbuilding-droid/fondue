// The score table of finished endless runs stored in the profile.
// It is a tab of the Options (scoresTable) and still opens on its own from the game-over screen,
// whose back button returns there.
import { DIFFICULTIES } from '../../config/waves';
import { BACK_BUTTON, esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

/** The table itself, shared by the Options tab and this screen. */
export function scoresTable(ctx: ScreenContext): string {
  const list = ctx.profile.scores(ctx.world);
  const rows = list.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.names)}</td><td>${e.coop ? 'Co-op' : 'Solo'}</td><td>${DIFFICULTIES[e.difficulty]?.label ?? ''}</td><td>${e.wave}</td><td>${e.score}</td></tr>`).join('');
  return `<table class="scores"><thead><tr><th>#</th><th>Name</th><th>Mode</th><th>Difficulty</th><th>Wave</th><th>Score</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No endless runs yet. Go hold that gate.</td></tr>'}</tbody></table>`;
}

export const scoresScreen: Screen = {
  id: 'scores',
  render(ctx) {
    const back = ctx.session?.view()?.phase === 'gameover' ? '<button class="secondary" data-a="backGameOver">Back</button>' : BACK_BUTTON;
    return `<div class="panel"><h2>Scores</h2>
      ${scoresTable(ctx)}
      ${navRow(back)}</div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'backGameOver': ctx.show('gameover'); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
