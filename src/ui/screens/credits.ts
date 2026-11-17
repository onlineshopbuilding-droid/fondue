// The credits page; its text lives in content.ts. The Options show it in their Credits tab;
// the screen here stays for old links and has only a back button.
import { CREDITS_HTML } from '../content';
import { BACK_BUTTON, navRow } from '../html';
import type { Screen } from './screen';

/** The credits text, shared by the Options tab and this screen. */
export const creditsBody = (): string => CREDITS_HTML;

export const creditsScreen: Screen = {
  id: 'credits',
  render: () => `<div class="panel"><h2>Credits</h2>${creditsBody()}${navRow(BACK_BUTTON)}</div>`,
  onAction(action, _el, ctx) {
    if (action === 'main') ctx.show('main');
  },
};
