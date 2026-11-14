// The win screen of a campaign level: its name, the five cheese of the level (which are new), the
// gold and crests kept for good, what is unlocked, and one line of story.
// Continue follows the mode's next step; in co-op only the host moves on, the guest waits.
// King Fridolin speaks here too: after the first win of level 1 he explains cheese and gold and leads
// into the shop for the first upgrade (D4), and he introduces every slot or station the level opened (C2).
import { CHEESE } from '../../config/currencies';
import { STATIONS } from '../../config/keep';
import { SLOTS } from '../../config/slots';
import { weaponById } from '../../config/weapons';
import { levelOf } from '../../config/worlds';
import type { UnlockDef } from '../../config/worlds/types';
import { levelCheese } from '../../modes';
import { markIntroSeen, shopAfterWin, type Intro } from '../../modes/tutorial';
import { slotIntro } from '../../modes/unlocks';
import { FIRST_WIN_LINES, STATION_INTROS } from '../../config/worlds/fondue/story';
import { esc, navRow, propUri } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

/** One unlock as a line players understand. */
export function unlockName(u: UnlockDef): string {
  switch (u.kind) {
    case 'weapon': return `New weapon in the shop: ${weaponById(u.weapon)?.name ?? u.weapon}`;
    case 'slot': return `New slot: ${SLOTS[u.slot]?.name ?? `Slot ${u.slot + 1}`}`;
    case 'station': return `New in the shop: ${STATIONS[u.station]?.name ?? u.station}`;
    case 'gate': return `Castle tier ${u.tier}`;
    case 'hand': return `Hand tier ${u.tier}`;
  }
}

/** The five cheese of a level as a list: done before, new now, or still open. */
export function cheeseList(texts: string[], have: number, fresh: number): string {
  const rows = texts.map((text, bit) => {
    const isNew = (fresh & (1 << bit)) !== 0;
    const got = (have & (1 << bit)) !== 0;
    const cls = isNew ? 'new' : got ? 'got' : 'open';
    return `<li class="cheese-${cls}" data-bit="${bit}"><span class="cur-icon">${got ? '🧀' : '◯'}</span> ${esc(text)}${isNew ? ' <b>New!</b>' : ''}</li>`;
  });
  return `<ul class="cheese-list" id="cheeseList">${rows.join('')}</ul>`;
}

/** Texts of the five cheese of a level, in bit order. */
export function cheeseTexts(challenges: { text: string }[]): string[] {
  const t: string[] = [];
  t[CHEESE.bits.win] = 'Win the level';
  t[CHEESE.bits.gateHalf] = `Gate above ${Math.round(CHEESE.gateHalf * 100)} %`;
  t[CHEESE.bits.gateHigh] = `Gate above ${Math.round(CHEESE.gateHigh * 100)} %`;
  t[CHEESE.bits.challenge1] = challenges[0]?.text ?? 'Challenge 1';
  t[CHEESE.bits.challenge2] = challenges[1]?.text ?? 'Challenge 2';
  return t;
}

/** King Fridolin with a speech bubble, for screens outside the battlefield. */
export function kingSaysHtml(lines: string[], id = 'kingSays'): string {
  if (lines.length === 0) return '';
  // Looks in style.css (`.king-says`), so phones can pack it tighter.
  return `<div class="king-says" id="${id}">
      <img src="${propUri('kingTalk') || propUri('king')}" alt="King Fridolin">
      <div class="king-bubble">${lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    </div>`;
}

/** The King's line for a newly opened slot or station. This screen is the only place it is shown. */
export function introLine(intro: Intro): string {
  return intro.kind === 'slot' ? slotIntro(intro.slot) : STATION_INTROS[intro.station] ?? '';
}

/** What the King says on this win screen: cheese and gold after level 1 (with the way to the shop), and the new slots and stations. */
function kingLines(ctx: ScreenContext): { lines: string[]; toShop: boolean } {
  const rules = ctx.resultRules!;
  const reward = ctx.reward!;
  const toShop = shopAfterWin(ctx.profile, rules.world, rules.level);
  const lines = toShop ? [...FIRST_WIN_LINES] : [];
  for (const u of reward.unlocks) {
    const intro: Intro | null = u.kind === 'slot' ? { kind: 'slot', slot: u.slot } : u.kind === 'station' ? { kind: 'station', station: u.station } : null;
    if (!intro) continue;
    const line = introLine(intro);
    if (line) lines.push(line);
    // Shown here, so the shop and the hall do not repeat it.
    markIntroSeen(ctx.profile, intro);
  }
  return { lines, toShop };
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
    const note = reward.counted ? '' : `<p class="note-line">${ctx.result?.devRun ? 'Developer run: nothing is kept.' : 'Already counted.'}</p>`;
    const cheese = !guest && level
      ? cheeseList(cheeseTexts(level.challenges), levelCheese(ctx.profile, rules.world, level.id), reward.cheeseBits)
      : '';
    const purse = `<div class="stats" id="runPurse"><span>Gold kept</span><b id="runGold">${reward.gold}</b>${reward.crests > 0 ? `<span>Raider Crests</span><b id="runCrests">${reward.crests}</b>` : ''}</div>`;
    const king = guest ? { lines: [], toShop: false } : kingLines(ctx);
    const nav = guest
      ? navRow('<button class="alt" data-a="quit">Leave</button>')
      : navRow('', `<button data-a="continue" id="continue">${king.toShop ? 'To the Keep Shop' : 'Continue'}</button>`);
    // Three blocks: on a laptop they stack in this order; on a phone in landscape the head and the
    // purse share the left column and the King and the cheese the right one, so everything fits and
    // the nav row with Continue stays in sight below (style.css, `.won`).
    return `<div class="panel narrow won"><div class="won-body">
      <div class="won-head"><h2>Level ${rules.level ?? ''} won!</h2>
        <div class="won-name" id="wonLevel">${esc(level?.name ?? '')}</div>
        <div class="won-cheese" id="wonCheese"><span class="cur-icon">🧀</span> +${reward.cheese}</div></div>
      <div class="won-side">${kingSaysHtml(king.lines)}${note}${cheese}</div>
      <div class="won-foot">${purse}${unlocks}
        ${reward.story ? `<p class="story" id="story">${esc(reward.story)}</p>` : ''}
        ${guest ? '<p class="note-line">The host decides what comes next.</p>' : ''}</div>
      </div>${nav}</div>`;
  },
  onAction(action, _el, ctx) {
    switch (action) {
      case 'continue': ctx.afterRun(); break;
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
