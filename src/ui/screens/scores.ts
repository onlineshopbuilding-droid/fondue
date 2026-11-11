// The score table of finished runs stored on this device.
// It opens from the main menu or from the game-over screen; its back button returns to the right one.
import { DIFFICULTIES } from '../../config/waves';
import { loadScores } from '../../game/storage';
import { BACK_BUTTON, esc } from '../html';
import type { Screen } from './screen';

export const scoresScreen: Screen = {
  id: 'scores',
  render(ctx) {
    const list = loadScores();
    const rows = list.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.names)}</td><td>${e.coop ? 'Co-op' : 'Solo'}</td><td>${DIFFICULTIES[e.difficulty].label}</td><td>${e.day}</td><td>${e.score}</td></tr>`).join('');
    return `<div class="panel"><h2>Scores</h2>
      <table class="scores"><thead><tr><th>#</th><th>Name</th><th>Mode</th><th>Level</th><th>Day</th><th>Score</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No runs yet. Go hold that gate.</td></tr>'}</tbody></table>
      <div class="row" style="margin-top:14px">${ctx.session?.view()?.phase === 'gameover' ? '<button class="secondary" data-a="backGameOver">Back</button>' : BACK_BUTTON}</div></div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'backGameOver': ctx.show('gameover'); break;
      case 'main': ctx.show('main'); break;
    }
  },
};
