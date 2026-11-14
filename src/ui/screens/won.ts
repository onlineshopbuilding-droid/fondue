// The win screen of a campaign level: its name, the cheese earned, what is unlocked for good, and one line of story.
// Continue follows the mode's next step; in co-op only the host moves on, the guest waits.
import { CASTLE_TIERS, STATIONS } from '../../config/keep';
import { SLOTS } from '../../config/slots';
import { weaponById } from '../../config/weapons';
import { levelOf } from '../../config/worlds';
import type { UnlockDef } from '../../config/worlds/types';
import { esc, navRow } from '../html';
import type { Screen } from './screen';

/** One unlock as a line players understand. */
export function unlockName(u: UnlockDef): string {
  switch (u.kind) {
    case 'weapon': return `New weapon: ${weaponById(u.weapon)?.name ?? u.weapon}`;
    case 'slot': return `New slot: ${SLOTS[u.slot]?.name ?? `Slot ${u.slot + 1}`}`;
    case 'station': return `New offering site: ${STATIONS[u.station]?.name ?? u.station}`;
    case 'gate': return `New gate: ${CASTLE_TIERS[u.tier]?.name ?? `Gate ${u.tier}`}`;
    case 'hand': return `Hand tier ${u.tier} in the armoury`;
  }
}

export const wonScreen: Screen = {
  id: 'won',
  render(ctx) {
    const rules = ctx.resultRules;
    const reward = ctx.reward;
    if (!rules || !reward) return '';
    const level = levelOf(rules.world, rules.level ?? 0);
    const guest = ctx.session?.role === 'guest';
    const unlocks = reward.unlocks.length > 0
      ? `<ul class="unlocks" id="unlocks">${reward.unlocks.map((u) => `<li>${esc(unlockName(u))}</li>`).join('')}</ul>`
      : '';
    const starsNote = reward.counted ? '' : `<p class="note-line">${ctx.result?.devRun ? 'Developer run: no cheese.' : 'No new cheese this time.'}</p>`;
    const nav = guest
      ? navRow('<button class="alt" data-a="quit">Leave</button>')
      : navRow('', '<button data-a="continue" id="continue">Continue</button>');
    return `<div class="panel narrow won"><h2>Level ${rules.level ?? ''} won!</h2>
      <div class="won-name" id="wonLevel">${esc(level?.name ?? '')}</div>
      <div class="won-stars" id="wonStars"><span class="star">🧀</span> ${reward.cheese}</div>
      ${starsNote}${unlocks}
      ${reward.story ? `<p class="story" id="story">${esc(reward.story)}</p>` : ''}
      ${guest ? '<p class="note-line">The host decides what comes next.</p>' : ''}
      ${nav}</div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'continue': ctx.afterRun(); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
