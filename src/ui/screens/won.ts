// The win screen of a campaign level: its name, the five cheese of the level (which are new), the
// gold and crests kept for good, what is unlocked, and one line of story.
// Continue follows the mode's next step; in co-op only the host moves on, the guest waits.
// King Fridolin speaks here too: after the first win of level 1 he explains cheese and gold and leads
// into the shop for the first upgrade (D4), he announces a castle tier that can now be built, and he
// introduces every station the level opened (C2). Slots are introduced in the shop, right after the
// castle tier that opens them is built (src/ui/screens/keep.ts).
// v0.4: a win that lets a new castle tier be built says so in its own banner, with the King's line
// (CASTLE_READY_LINES) and, in a solo run, a button straight into the Keep Shop.
import { CHEESE } from '../../config/currencies';
import { CASTLE_TIERS, STATIONS } from '../../config/keep';
import { weaponById } from '../../config/weapons';
import { levelOf } from '../../config/worlds';
import type { UnlockDef } from '../../config/worlds/types';
import { CAMPAIGN, levelCheese } from '../../modes';
import { markIntroSeen, shopAfterWin, type Intro } from '../../modes/tutorial';
import { slotIntro } from '../../modes/unlocks';
import { CASTLE_READY_LINES, FIRST_WIN_LINES, STATION_INTROS } from '../../config/worlds/fondue/story';
import { esc, navRow, propUri } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

/** One unlock as a line players understand. */
export function unlockName(u: UnlockDef): string {
  switch (u.kind) {
    case 'weapon': return `New weapon in the shop: ${weaponById(u.weapon)?.name ?? u.weapon}`;
    case 'station': return `New in the shop: ${STATIONS[u.station]?.name ?? u.station}`;
    case 'castle': return `Castle tier ${u.tier} can be built: ${CASTLE_TIERS[u.tier - 1]?.name ?? ''}`;
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

/** The King's line for a newly opened slot or station (slots: shown in the shop after a castle tier is built). */
export function introLine(intro: Intro): string {
  return intro.kind === 'slot' ? slotIntro(intro.slot) : STATION_INTROS[intro.station] ?? '';
}

/** What the King says on this win screen: cheese and gold after level 1 (with the way to the shop), new castle tiers and stations. */
function kingLines(ctx: ScreenContext): { lines: string[]; toShop: boolean } {
  const rules = ctx.resultRules!;
  const reward = ctx.reward!;
  const toShop = shopAfterWin(ctx.profile, rules.world, rules.level);
  const lines = toShop ? [...FIRST_WIN_LINES] : [];
  for (const u of reward.unlocks) {
    if (u.kind === 'castle') {
      const line = CASTLE_READY_LINES[u.tier];
      if (line) lines.push(line);
      continue;
    }
    const intro: Intro | null = u.kind === 'station' ? { kind: 'station', station: u.station } : null;
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
    const castle = guest ? undefined : reward.unlocks.find((u) => u.kind === 'castle');
    const others = castle ? reward.unlocks.filter((u) => u !== castle) : reward.unlocks;
    const unlocks = others.length > 0
      ? `<ul class="unlocks" id="unlocks">${others.map((u) => `<li>${esc(unlockName(u))}</li>`).join('')}</ul>`
      : '';
    const castleBanner = castle && castle.kind === 'castle'
      ? `<div class="won-castle" id="wonCastle" data-tier="${castle.tier}"><span class="won-castle-ico" aria-hidden="true">🏰</span><span>${esc(unlockName(castle))}</span></div>`
      : '';
    // Straight into the shop only from a solo run: leaving a co-op run would close the room.
    const shopButton = castle && !guest && ctx.session?.role !== 'host';
    const note = reward.counted ? '' : `<p class="note-line">${ctx.result?.devRun ? 'Developer run: nothing is kept.' : 'Already counted.'}</p>`;
    const cheese = !guest && level
      ? cheeseList(cheeseTexts(level.challenges), levelCheese(ctx.profile, rules.world, level.id), reward.cheeseBits)
      : '';
    const purse = `<div class="stats" id="runPurse"><span>Gold kept</span><b id="runGold">${reward.gold}</b>${reward.crests > 0 ? `<span>Raider Crests</span><b id="runCrests">${reward.crests}</b>` : ''}</div>`;
    const king = guest ? { lines: [], toShop: false } : kingLines(ctx);
    // Every result screen: the way back on the left ("Back", "Back to room" in co-op, "Leave" for the
    // guest), the one main action on the right (the Keep Shop when it has something new, else the next level).
    const host = ctx.session?.role === 'host';
    const nextId = (rules.level ?? 0) + 1;
    const hasNext = !host && rules.mode === CAMPAIGN.id && !!levelOf(rules.world, nextId) && CAMPAIGN.canPlay(ctx.profile, rules.world, nextId);
    let nav: string;
    if (guest) nav = navRow('<button class="alt" data-a="quit">Leave</button>');
    else if (host) nav = navRow('<button class="secondary" data-a="continue" id="continue">Back to room</button>');
    else if (king.toShop) nav = navRow('<button class="secondary" data-a="quit" id="backToHall">Back</button>', '<button data-a="continue" id="continue">To the Keep Shop</button>');
    else if (shopButton) nav = navRow('<button class="secondary" data-a="continue" id="continue">Back</button>', '<button data-a="toShop" id="toShop">To the Keep Shop</button>');
    else if (hasNext) nav = navRow('<button class="secondary" data-a="continue" id="continue">Back</button>', `<button data-a="nextLevel" id="nextLevel" data-level="${nextId}">Next level</button>`);
    else nav = navRow('', '<button data-a="continue" id="continue">Continue</button>');
    // Three blocks: on a laptop they stack in this order; on a phone in landscape the head and the
    // purse share the left column and the King and the cheese the right one, so everything fits and
    // the nav row with Continue stays in sight below (style.css, `.won`).
    return `<div class="panel narrow won"><div class="won-body">
      <div class="won-head"><h2>Level ${rules.level ?? ''} won!</h2>
        <div class="won-name" id="wonLevel">${esc(level?.name ?? '')}</div>
        <div class="won-cheese" id="wonCheese"><span class="cur-icon">🧀</span> +${reward.cheese}</div></div>
      <div class="won-side">${castleBanner}${kingSaysHtml(king.lines)}${note}${cheese}</div>
      <div class="won-foot">${purse}${unlocks}
        ${reward.story ? `<p class="story" id="story">${esc(reward.story)}</p>` : ''}
        ${guest ? '<p class="note-line">The host decides what comes next.</p>' : ''}</div>
      </div>${nav}</div>`;
  },
  onAction(action, el, ctx) {
    switch (action) {
      case 'continue': ctx.afterRun(); break;
      case 'toShop': ctx.leaveToMenu(); ctx.show('armoury'); break;
      case 'nextLevel': {
        const level = Number(el.dataset.level);
        if (!CAMPAIGN.canPlay(ctx.profile, ctx.world, level)) { ctx.afterRun(); break; }
        ctx.leaveToMenu();
        ctx.startCampaign(level);
        break;
      }
      case 'quit': ctx.leaveToMenu(); break;
    }
  },
};
