// The campaign map: a path through the landscapes with every level as a station. It opens centred on
// the current level and scrolls sideways with the finger (wheel or drag with a mouse). Tapping a
// station opens a small card with the level's facts, its five cheese, the loadout of the five slots and a
// Play button (two taps from the map to the battle); locked stations say what to win first.
import { CHEESE, cheeseCount } from '../../config/currencies';
import { levelOf, worldById } from '../../config/worlds';
import type { LevelDef } from '../../config/worlds/types';
import { CAMPAIGN, levelCheese, unlocksOfLevel } from '../../modes';
import { MAP_SYMBOLS, STEP, bandsOf, endsHtml, landName, landscapeHtml, mapWidth, pathSvg, stationX, stationY } from '../campaignArt';
import { BACK_BUTTON, esc, navRow } from '../html';
import { walletHtml } from './keep';
import type { ScreenContext } from './context';
import type { Screen } from './screen';
import { loadoutAction, loadoutHtml, resetLoadout } from './prelevel';
import { unlockName } from './won';

/** The station whose card is open, kept so a redraw of the screen keeps the card. */
let selected: number | null = null;
/** The context while the map is shown, for the wheel and drag listeners. */
let active: ScreenContext | null = null;
/** Mouse drag on the map: where it started, and whether it moved far enough to not count as a tap. */
let drag: { x: number; left: number } | null = null;
let dragged = false;

const scroller = (ctx: ScreenContext) => ctx.query<HTMLElement>('#mapScroll');

function stationHtml(ctx: ScreenContext, l: LevelDef, current: number): string {
  const p = ctx.profile;
  const done = p.isLevelDone(ctx.world, l.id);
  const open = CAMPAIGN.canPlay(p, ctx.world, l.id);
  const hasUnlock = unlocksOfLevel(ctx.world, l.id).length > 0;
  const got = cheeseCount(levelCheese(p, ctx.world, l.id));
  const cls = ['cm-st', done ? 'done' : open ? 'open' : 'locked', l.boss ? 'boss' : '', l.id === current ? 'current' : '', hasUnlock ? 'unlock' : '', l.id === selected ? 'sel' : ''].filter(Boolean).join(' ');
  const y = stationY(l.id);
  const badges = [
    l.boss ? '<svg class="cm-helm" viewBox="0 0 44 30" aria-hidden="true"><use href="#cm-pothelm"/></svg>' : '',
    hasUnlock && !done ? '<span class="cm-q" aria-hidden="true">?</span>' : '',
    done ? '<span class="cm-check" aria-hidden="true">✓</span>' : '',
    done || got > 0 ? `<span class="cm-got${got === CHEESE.perLevel ? ' full' : ''}" aria-hidden="true">${got}🧀</span>` : '',
    l.id === current && !done ? '<svg class="cm-mouse" viewBox="0 0 44 40" aria-hidden="true"><use href="#cm-mouse"/></svg>' : '',
  ].join('');
  const state = done ? 'won' : open ? 'open' : 'locked';
  const label = `Level ${l.id}: ${l.name}${l.boss ? ', boss level' : ''}, ${state}, ${got} of ${CHEESE.perLevel} cheese`;
  const bossName = l.boss ? `<span class="cm-boss-name ${y > 56 ? 'up' : ''}" style="left:${stationX(l.id)}px;top:${y.toFixed(1)}%">${esc(l.boss.name)}</span>` : '';
  return `<button class="${cls}" data-a="${open ? 'level' : 'lockedLevel'}" data-level="${l.id}" style="left:${stationX(l.id)}px;top:${y.toFixed(1)}%" aria-label="${esc(label)}"><span class="cm-num">${l.id}</span>${badges}</button>${bossName}`;
}

/** Planned length of a level in words, e.g. "about 2 min". */
function durationText(l: LevelDef): string {
  const secs = (l as { targetSeconds?: unknown }).targetSeconds;
  if (typeof secs !== 'number' || !Number.isFinite(secs) || secs <= 0) return '';
  const min = Math.max(1, Math.round(secs / 60));
  return `about ${min} min`;
}

/** The two challenges of a level, whatever shape the campaign data has. */
function challengeTexts(l: LevelDef): string[] {
  const list = (l as { challenges?: unknown }).challenges;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 2).map((c) => (typeof c === 'string' ? c : typeof c === 'object' && c ? String((c as Record<string, unknown>).text ?? (c as Record<string, unknown>).label ?? '') : '')).filter(Boolean);
}

/** The card of one level: facts, the five cheese, the loadout and Play. */
function cardHtml(ctx: ScreenContext, id: number): string {
  const l = levelOf(ctx.world, id);
  if (!l) return '';
  const p = ctx.profile;
  const done = p.isLevelDone(ctx.world, id);
  const open = CAMPAIGN.canPlay(p, ctx.world, id);
  const facts = [durationText(l), landName(l.landscape), l.twist?.label ?? ''].filter(Boolean).map(esc).join(' · ');
  const mask = levelCheese(p, ctx.world, id);
  const got = cheeseCount(mask);
  const b = CHEESE.bits;
  const has = (bit: number) => (mask & (1 << bit)) !== 0;
  const pip = (bit: number, text: string) => `<li class="${has(bit) ? 'got' : ''}"><span class="cm-ck" aria-hidden="true">${has(bit) ? '🧀' : '○'}</span>${esc(text)}</li>`;
  const ch = challengeTexts(l);
  const cheeseList = `<ul class="cm-card-cheese" id="cardCheese">
      ${pip(b.win, 'Win')}${pip(b.gateHalf, `Gate above ${Math.round(CHEESE.gateHalf * 100)} %`)}${pip(b.gateHigh, `Gate above ${Math.round(CHEESE.gateHigh * 100)} %`)}
      ${ch[0] ? pip(b.challenge1, ch[0]) : ''}${ch[1] ? pip(b.challenge2, ch[1]) : ''}</ul>`;
  const cheeseLine = `<span class="cm-cheese-ico" aria-hidden="true">🧀</span> <b id="cardGot">${got}</b>/${CHEESE.perLevel} cheese${done ? ' · replays pay gold' : ''}`;
  const unlocks = unlocksOfLevel(ctx.world, id);
  let unlockLine = '';
  if (unlocks.length > 0) {
    unlockLine = done
      ? `<ul class="cm-card-unlocks">${unlocks.map((u) => `<li>${esc(unlockName(u))}</li>`).join('')}</ul>`
      : '<div class="cm-card-secret"><span class="cm-q" aria-hidden="true">?</span> Win to unlock something new</div>';
  }
  const lock = open ? '' : `<div class="cm-card-lock" id="lockNote">Locked. Win level ${id - 1} first.${id - 1 > CAMPAIGN.nextLevel(p, ctx.world) ? ` You are at level ${CAMPAIGN.nextLevel(p, ctx.world)}.` : ''}</div>`;
  const play = open ? `<button data-a="playLevel" id="playLevel" data-level="${id}">${done ? 'Play again' : 'Play'}</button>` : '';
  return `<div class="cm-card-title"><span class="cm-card-num">Level ${id}</span> <span class="cm-card-name" id="cardName">${esc(l.name)}</span></div>
    <div class="cm-card-facts" id="cardFacts">${facts}</div>
    ${l.boss ? `<div class="cm-card-boss" id="cardBoss">Boss: ${esc(l.boss.name)}</div>` : ''}
    <div class="cm-card-total" id="cardCheeseTotal">${cheeseLine}</div>
    ${cheeseList}
    ${unlockLine}${lock}
    ${open ? loadoutHtml(ctx) : ''}
    ${navRow('<button class="secondary" data-a="closeCard" id="closeCard">Close</button>', play)}`;
}

/** Opens (or with null closes) the card without redrawing the 100 stations. */
function selectStation(ctx: ScreenContext, id: number | null) {
  if (id !== selected) resetLoadout();
  selected = id;
  const card = ctx.query<HTMLElement>('#levelCard');
  if (!card) return;
  ctx.query('.cm-st.sel')?.classList.remove('sel');
  if (id === null) { card.hidden = true; card.innerHTML = ''; return; }
  ctx.query(`.cm-st[data-level="${id}"]`)?.classList.add('sel');
  card.innerHTML = cardHtml(ctx, id);
  card.hidden = false;
  // Bring the station into the free part of the map, left of the card.
  const sc = scroller(ctx);
  if (sc) {
    const free = sc.clientWidth - card.offsetWidth - 16;
    const x = stationX(id);
    if (x - sc.scrollLeft < 40 || x - sc.scrollLeft > free - 30) sc.scrollTo({ left: x - free / 2, behavior: 'smooth' });
  }
}

function onWheel(e: WheelEvent) {
  const sc = active && scroller(active);
  if (!sc || !(e.target instanceof Node) || !sc.contains(e.target)) return;
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  sc.scrollLeft += e.deltaY;
  e.preventDefault();
}

function onPointerDown(e: PointerEvent) {
  const sc = active && scroller(active);
  dragged = false;
  if (!sc || e.pointerType !== 'mouse' || e.button !== 0 || !(e.target instanceof Node) || !sc.contains(e.target)) return;
  drag = { x: e.clientX, left: sc.scrollLeft };
}

function onPointerMove(e: PointerEvent) {
  const sc = active && scroller(active);
  if (!drag || !sc) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 6) dragged = true;
  if (dragged) sc.scrollLeft = drag.left - dx;
}

function onPointerUp() { drag = null; }

export const campaignScreen: Screen = {
  id: 'campaign',
  render(ctx) {
    const p = ctx.profile;
    const levels = worldById(ctx.world).campaign;
    const current = CAMPAIGN.nextLevel(p, ctx.world);
    const won = levels.filter((l) => p.isLevelDone(ctx.world, l.id)).length;
    const w = mapWidth(levels.length);
    const stations = levels.map((l) => stationHtml(ctx, l, current)).join('');
    const card = selected !== null && levelOf(ctx.world, selected) ? cardHtml(ctx, selected) : '';
    return `<div class="campaign-map" id="campaignMap">${MAP_SYMBOLS}
      <div class="cm-head">
        <div class="cm-head-back">${BACK_BUTTON}</div>
        <h2>Campaign</h2>
        <div class="cm-progress" id="campaignProgress">
          <div class="cm-progress-text"><span id="levelsWon">${won}</span>/${levels.length} won</div>
          <div class="cm-bar"><div class="cm-bar-fill" style="width:${((won / levels.length) * 100).toFixed(1)}%"></div></div>
        </div>
        ${walletHtml(ctx)}
      </div>
      <div class="cm-scroll" id="mapScroll" data-keep-scroll>
        <div class="cm-world" id="levelList" style="width:${w}px">
          <div class="cm-lands">${landscapeHtml(bandsOf(levels.map((l) => l.landscape)), levels.length, levels.filter((l) => l.boss).map((l) => l.id))}</div>
          ${pathSvg(levels.length, Math.min(current, levels.length))}
          ${endsHtml(levels.length)}
          ${stations}
        </div>
      </div>
      <div class="cm-card" id="levelCard" ${card ? '' : 'hidden'}>${card}</div>
    </div>`;
  },
  onShow(ctx: ScreenContext) {
    selected = null;
    active = ctx;
    ctx.query<HTMLElement>('#levelCard')?.setAttribute('hidden', '');
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    const sc = scroller(ctx);
    if (sc) sc.scrollLeft = stationX(CAMPAIGN.nextLevel(ctx.profile, ctx.world)) - sc.clientWidth / 2 + STEP / 4;
  },
  onHide() {
    active = null;
    drag = null;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  },
  onClick(target, ctx) {
    // The end of a mouse drag is no tap.
    if (dragged) { dragged = false; return true; }
    // A tap on the open landscape closes the card.
    if (selected !== null && target.closest('#mapScroll') && !target.closest('button')) { selectStation(ctx, null); return true; }
    return false;
  },
  onAction(action, el, ctx) {
    if (loadoutAction(action, el, ctx)) {
      // Only the card is drawn again, so the map keeps its place.
      if (selected !== null) { const card = ctx.query<HTMLElement>('#levelCard'); if (card) card.innerHTML = cardHtml(ctx, selected); }
      return;
    }
    switch (action) {
      case 'level':
      case 'lockedLevel': selectStation(ctx, Number(el.dataset.level)); break;
      case 'closeCard': selectStation(ctx, null); break;
      case 'playLevel': {
        const id = Number(el.dataset.level);
        if (!CAMPAIGN.canPlay(ctx.profile, ctx.world, id)) return;
        selected = null;
        ctx.startCampaign(id);
        break;
      }
      case 'main': ctx.show('main'); break;
    }
  },
};
