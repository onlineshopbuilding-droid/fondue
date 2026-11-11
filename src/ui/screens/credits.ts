// The credits page; its text lives in content.ts.
// It has no state and only a back button.
import { CREDITS_HTML } from '../content';
import { BACK_BUTTON } from '../html';
import type { Screen } from './screen';

export const creditsScreen: Screen = {
  id: 'credits',
  render: () => `<div class="panel"><h2>Credits</h2>${CREDITS_HTML}<div class="row">${BACK_BUTTON}</div></div>`,
  onAction(action, _el, ctx) {
    if (action === 'main') ctx.show('main');
  },
};
